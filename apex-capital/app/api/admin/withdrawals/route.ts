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
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    // Funds were already reserved (debited) when the user submitted the request.
    // Approval here just confirms the external transfer/payout happened — no balance change.
    const { error: updateError } = await admin
      .from("withdrawals")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), rejection_reason: null })
      .eq("id", withdrawalId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message ?? "Failed to update withdrawal" }, { status: 500 });
    }

    await createNotification({
      userId,
      type: "general",
      title: "Withdrawal approved",
      message: `Your withdrawal of $${formattedAmount} has been approved and is being processed.`,
      link: "/wallet",
    });
  } else {
    const reason = rejectionReason.trim();

    // Refund the reserved amount back to the user's cash balance.
    const { error: refundError } = await admin.rpc("refund_withdrawal", {
      p_user_id: userId,
      p_amount: withdrawal.amount,
    });
    if (refundError) {
      console.error("refund_withdrawal RPC failed:", refundError);
      return NextResponse.json({ error: refundError.message ?? "Failed to refund balance" }, { status: 500 });
    }

    const { error: updateError } = await admin
      .from("withdrawals")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), rejection_reason: reason })
      .eq("id", withdrawalId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update withdrawal" }, { status: 500 });
    }

    await createNotification({
      userId,
      type: "general",
      title: "Withdrawal rejected",
      message: `Your withdrawal of $${formattedAmount} was rejected and the funds have been returned to your available cash. Reason: ${reason}`,
      link: "/wallet/withdraw",
    });
  }

  return NextResponse.json({ success: true });
}