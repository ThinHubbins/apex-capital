import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MIN_DEPOSIT = 10;
const MAX_DEPOSIT = 50000;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("deposits")
    .select("*")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Failed to load deposits" }, { status: 500 });
  }

  return NextResponse.json({ deposits: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);

  if (!amount || Number.isNaN(amount) || amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
    return NextResponse.json(
      { error: `Enter an amount between $${MIN_DEPOSIT} and $${MAX_DEPOSIT.toLocaleString()}.` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("deposits")
    .insert({ user_id: user.id, amount, status: "pending" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit deposit" }, { status: 500 });
  }

  return NextResponse.json({ deposit: data });
}