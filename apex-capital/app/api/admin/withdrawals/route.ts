import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "../../../../lib/notifications";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const admin = createAdminClient();

  const { data: withdrawals, error } = await admin
    .from("withdrawals")
    .select("*")
    .eq("status", status)
    .order("submitted_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load withdrawals" }, { status: 500 });

  const userIds = [...new Set((withdrawals ?? []).map((w) => w.user_id))];
  let profilesById: Record<string, { full_name: string | null; email: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    profilesById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  }

  const enriched = (withdrawals ?? []).map((w) => ({
    ...w,
    full_name: profilesById[w.user_id]?.full_name ?? null,
    email: profilesById[w.user_id]?.email ?? null,
  }));

  return NextResponse.json({ withdrawals: enriched });
}

export async function PATCH(req: NextRequest) {
  const { withdrawalId, userId, action, rejectionReason } = await req.json();

  if (!withdrawalId || !userId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (action === "reject" && !rejectionReason?.trim()) {
    return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: withdrawal, error: fetchError } = await admin
    .from("withdrawals")
    .select("*")
    .eq("id", withdrawalId)
    .single();

  if (fetchError || !withdrawal) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }
  if (withdrawal.status !== "pending") {
    return NextResponse.json({ error: "This withdrawal has already been reviewed" }, { status: 409 });
  }

  const formattedAmount = Number(withdrawal.amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (action === "approve") {
    const { error: debitError } = await admin.rpc("debit_cash_balance", {
      p_user_id: userId,
      p_amount: withdrawal.amount,
    });
    if (debitError) {
      return NextResponse.json({ error: debitError.message ?? "Failed to debit balance" }, { status: 500 });
    }

    await admin
      .from("withdrawals")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), rejection_reason: null })
      .eq("id", withdrawalId);

    await createNotification({
      userId,
      type: "general",
      title: "Withdrawal approved",
      message: `Your withdrawal of $${formattedAmount} has been approved and is being processed.`,
      link: "/wallet",
    });
  } else {
    await admin
      .from("withdrawals")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), rejection_reason: rejectionReason.trim() })
      .eq("id", withdrawalId);

    await createNotification({
      userId,
      type: "general",
      title: "Withdrawal rejected",
      message: `Your withdrawal of $${formattedAmount} was rejected. Reason: ${rejectionReason.trim()}`,
      link: "/wallet/withdraw",
    });
  }

  return NextResponse.json({ success: true });
}