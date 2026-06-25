import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "../../../../lib/notifications";
import { isAdminId } from "../../../../lib/supabase/admin-auth";
import { createClient } from "../../../../lib/supabase/server";

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminId(user?.id);
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const admin = createAdminClient();

  const { data: deposits, error } = await admin
    .from("deposits")
    .select("*")
    .eq("status", status)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load deposits" }, { status: 500 });
  }

  const userIds = [...new Set((deposits ?? []).map((d) => d.user_id))];
  let profilesById: Record<string, { full_name: string | null; email: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    profilesById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  }

  const enriched = (deposits ?? []).map((d) => ({
    ...d,
    full_name: profilesById[d.user_id]?.full_name ?? null,
    email: profilesById[d.user_id]?.email ?? null,
  }));

  return NextResponse.json({ deposits: enriched });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { depositId, userId, action, rejectionReason } = await req.json();

  if (!depositId || !userId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (action === "reject" && !rejectionReason?.trim()) {
    return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: deposit, error: fetchError } = await admin
    .from("deposits")
    .select("*")
    .eq("id", depositId)
    .single();

  if (fetchError || !deposit) {
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }
  if (deposit.status !== "pending") {
    return NextResponse.json({ error: "This deposit has already been reviewed" }, { status: 409 });
  }

  const formattedAmount = Number(deposit.amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (action === "approve") {
    const { error: creditError } = await admin.rpc("credit_cash_balance", {
      p_user_id: userId,
      p_amount: deposit.amount,
    });
    if (creditError) {
      console.error("credit_cash_balance RPC failed:", creditError);
      return NextResponse.json({ error: creditError.message ?? "Failed to credit balance" }, { status: 500 });
    }

    const { error: updateError } = await admin
      .from("deposits")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), rejection_reason: null })
      .eq("id", depositId);
    if (updateError) {
      console.error("Deposit status update failed:", updateError);
      return NextResponse.json({ error: updateError.message ?? "Failed to update deposit" }, { status: 500 });
    }

    await createNotification({
      userId,
      type: "general",
      title: "Deposit approved",
      message: `Your deposit of $${formattedAmount} has been approved and added to your available cash.`,
      link: "/wallet",
    });
  } else {
    const reason = rejectionReason.trim();

    const { error: updateError } = await admin
      .from("deposits")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), rejection_reason: reason })
      .eq("id", depositId);
    if (updateError) {
      return NextResponse.json({ error: "Failed to update deposit" }, { status: 500 });
    }

    await createNotification({
      userId,
      type: "general",
      title: "Deposit rejected",
      message: `Your deposit of $${formattedAmount} was rejected. Reason: ${reason}`,
      link: "/wallet/deposit",
    });
  }

  return NextResponse.json({ success: true });
}