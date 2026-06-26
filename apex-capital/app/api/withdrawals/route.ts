import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MIN_WITHDRAWAL = 10;
const MAX_WITHDRAWAL = 50000;

const CRYPTO_ASSETS = ["BTC", "USDT", "ETH", "SOL", "USDC"];

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
  const method = body?.method === "crypto" ? "crypto" : "bank";

  if (!amount || Number.isNaN(amount) || amount < MIN_WITHDRAWAL || amount > MAX_WITHDRAWAL) {
    return NextResponse.json(
      { error: `Enter an amount between $${MIN_WITHDRAWAL} and $${MAX_WITHDRAWAL.toLocaleString()}.` },
      { status: 400 }
    );
  }

  const rpcArgs: Record<string, unknown> = {
    p_user_id: user.id,
    p_amount: amount,
    p_method: method,
  };

  if (method === "crypto") {
    const asset = String(body?.cryptoAsset ?? "").toUpperCase();
    const network = String(body?.cryptoNetwork ?? "").trim();
    const address = String(body?.cryptoUserAddress ?? "").trim();

    if (!CRYPTO_ASSETS.includes(asset)) {
      return NextResponse.json({ error: "Select a valid crypto asset." }, { status: 400 });
    }
    if (!network) {
      return NextResponse.json({ error: "Select a network." }, { status: 400 });
    }
    if (!address) {
      return NextResponse.json({ error: "Enter the wallet address you want to receive funds at." }, { status: 400 });
    }

    rpcArgs.p_crypto_asset = asset;
    rpcArgs.p_crypto_network = network;
    rpcArgs.p_crypto_user_address = address;
  } else {
    const bankName = String(body?.bankName ?? "").trim();
    const accountNumber = String(body?.accountNumber ?? "").trim();
    const accountHolderName = String(body?.accountHolderName ?? "").trim();
    const branchOrSwift = String(body?.bankBranchOrSwift ?? "").trim();

    if (!bankName || !accountNumber || !accountHolderName || !branchOrSwift) {
      return NextResponse.json(
        { error: "Fill in bank name, account number, account holder name, and branch/SWIFT." },
        { status: 400 }
      );
    }

    rpcArgs.p_bank_name = bankName;
    rpcArgs.p_account_number = accountNumber;
    rpcArgs.p_account_holder_name = accountHolderName;
    rpcArgs.p_bank_branch_or_swift = branchOrSwift;
  }

  const { data, error } = await supabase.rpc("reserve_withdrawal", rpcArgs).single();

  if (error) {
    // Surface the "Insufficient cash balance" message cleanly; otherwise generic error.
    const message = error.message?.includes("Insufficient cash balance")
      ? "Insufficient cash balance."
      : "Failed to submit withdrawal.";
    return NextResponse.json({ error: message }, { status: message.startsWith("Insufficient") ? 400 : 500 });
  }

  return NextResponse.json({ withdrawal: data });
}