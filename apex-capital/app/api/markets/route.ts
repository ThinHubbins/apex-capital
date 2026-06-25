import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { MOCK_ASSETS, AssetOverride, applyOverride, getMockQuote } from "../../../lib/mockMarketData";

export async function GET() {
  const supabase = createAdminClient();
  const { data: overrides, error } = await supabase
    .from("asset_overrides")
    .select("*");

  if (error) {
    console.error("[markets] DB error:", error);
    // fall back to defaults rather than failing the whole page
  }

  const overrideMap = new Map<string, AssetOverride>(
    (overrides ?? []).map((o: AssetOverride) => [o.symbol, o])
  );

  const results = MOCK_ASSETS.map((asset) => {
    const merged = applyOverride(asset, overrideMap.get(asset.symbol) ?? null);
    return getMockQuote(merged);
  });

  return NextResponse.json({ results });
}