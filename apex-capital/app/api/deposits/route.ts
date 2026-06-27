import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MIN_DEPOSIT = 10;
const MAX_DEPOSIT = 500000;

const CRYPTO_OPTIONS = [
  { asset: "BTC", network: "BTC NETWORK", address: "bc1qzd67jzq0n7sm82jt0nyxh4egwyg0dtzvvdkuee" },
  { asset: "USDT", network: "ERC20", address: "0x31D91d829A98e886809f382BD5E77446a17a458E" },
  { asset: "ETH", network: "ETH", address: "0x31d91d829a98e886809f382bd5e77446a17a458e" },
  { asset: "SOL", network: "SOLANA", address: "3N4dgunmJhwFd58DUS2ea2J9Aj4Z14EBSBUWUya2KcPz" },
  { asset: "USDC", network: "ERC20", address: "0x31d91d829a98e886809f382bd5e77446a17a458e" },
];

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
  const method = body?.method === "crypto" ? "crypto" : "wire";

  if (!amount || Number.isNaN(amount) || amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
    return NextResponse.json(
      { error: `Enter an amount between $${MIN_DEPOSIT} and $${MAX_DEPOSIT.toLocaleString()}.` },
      { status: 400 }
    );
  }

  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    amount,
    status: "pending",
    method,
  };

  if (method === "crypto") {
    const assetKey = String(body?.cryptoAsset ?? "");
    const match = CRYPTO_OPTIONS.find(
      (c) => `${c.asset}-${c.network}` === assetKey
    );
    if (!match) {
      return NextResponse.json({ error: "Select a valid crypto deposit address." }, { status: 400 });
    }
    insertPayload.crypto_asset = match.asset;
    insertPayload.crypto_network = match.network;
    insertPayload.crypto_address = match.address;
  } else {
    const senderBankName = String(body?.senderBankName ?? "").trim();
    const senderAccountNumber = String(body?.senderAccountNumber ?? "").trim();
    const senderBranch = String(body?.senderBranch ?? "").trim();

    if (!senderBankName || !senderAccountNumber || !senderBranch) {
      return NextResponse.json(
        { error: "Sender bank name, account number, and branch are all required." },
        { status: 400 }
      );
    }

    insertPayload.sender_bank_name = senderBankName;
    insertPayload.sender_account_number = senderAccountNumber;
    insertPayload.sender_branch = senderBranch;
  }

  const { data, error } = await supabase
    .from("deposits")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("Deposit insert failed:", error);
    return NextResponse.json({ error: "Failed to submit deposit" }, { status: 500 });
  }

  return NextResponse.json({ deposit: data });
}