import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { MOCK_ASSETS, AssetOverride, applyOverride } from "../../../../lib/mockMarketData";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> } // Next.js 15+: params is async
) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();

  const asset = MOCK_ASSETS.find((a) => a.symbol === symbol);
  if (!asset) return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });

  try {
    const supabase = createAdminClient();
    const { data: override, error } = await supabase
      .from("asset_overrides")
      .select("*")
      .eq("symbol", symbol)
      .maybeSingle();

    if (error) {
      console.error("asset_overrides query failed:", error);
      // Fall back to the un-overridden asset rather than 500ing the page.
      return NextResponse.json({ asset });
    }

    const merged = applyOverride(asset, (override as AssetOverride) ?? null);
    return NextResponse.json({ asset: merged });
  } catch (err) {
    console.error("GET /api/markets/[symbol] crashed:", err);
    return NextResponse.json({ asset });
  }
}