import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MIN_WITHDRAWAL = 10;
const MAX_WITHDRAWAL = 50000;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: "Failed to load withdrawals" }, { status: 500 });

  return NextResponse.json({ withdrawals: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);

  if (!amount || Number.isNaN(amount) || amount < MIN_WITHDRAWAL || amount > MAX_WITHDRAWAL) {
    return NextResponse.json(
      { error: `Enter an amount between $${MIN_WITHDRAWAL} and $${MAX_WITHDRAWAL.toLocaleString()}.` },
      { status: 400 }
    );
  }

  // Check the user has enough cash before inserting
  const { data: profile } = await supabase
    .from("profiles")
    .select("cash_balance")
    .eq("id", user.id)
    .single();

  if (!profile || Number(profile.cash_balance) < amount) {
    return NextResponse.json({ error: "Insufficient cash balance." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("withdrawals")
    .insert({ user_id: user.id, amount, status: "pending" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to submit withdrawal" }, { status: 500 });

  return NextResponse.json({ withdrawal: data });
}