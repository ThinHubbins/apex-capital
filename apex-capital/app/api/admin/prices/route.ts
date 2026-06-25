// app/api/admin/prices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { MOCK_ASSETS, AssetOverride, applyOverride } from "../../../../lib/mockMarketData";

const ADMIN_IDS = ["05d8eb0d-3aa7-404f-ade1-27fe6af3e1bc"];

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && ADMIN_IDS.includes(user.id);
}

// ─── GET /api/admin/prices ─────────────────────────────────────────

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createAdminClient();
  const { data: overrides, error } = await supabase
    .from("asset_overrides")
    .select("*");

  if (error) {
    console.error("[prices] DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const overrideMap = new Map<string, AssetOverride>(
    (overrides ?? []).map((o: AssetOverride) => [o.symbol, o])
  );

  const assets = MOCK_ASSETS.map((asset) => {
    const override = overrideMap.get(asset.symbol) ?? null;
    const merged = applyOverride(asset, override);
    return {
      symbol:     merged.symbol,
      name:       merged.name,
      assetType:  merged.assetType,
      floor:      merged.floor,
      ceiling:    merged.ceiling,
      startPrice: merged.startPrice,
      volatility: merged.volatility ?? null,
      reversion:  merged.reversion  ?? null,
      drift:      merged.drift      ?? null,
      defaults: {
        floor:      asset.floor,
        ceiling:    asset.ceiling,
        startPrice: asset.startPrice,
        volatility: null,
        reversion:  null,
        drift:      null,
      },
      hasOverride: override !== null,
    };
  });

  return NextResponse.json({ assets });
}

// ─── PATCH /api/admin/prices ───────────────────────────────────────

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { symbol, floor, ceiling, startPrice, volatility, reversion, drift } = body;

  if (!symbol || typeof symbol !== "string")
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });

  const asset = MOCK_ASSETS.find((a) => a.symbol === symbol.toUpperCase());
  if (!asset)
    return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });

  const effectiveFloor   = floor   ?? asset.floor;
  const effectiveCeiling = ceiling ?? asset.ceiling;
  if (effectiveFloor >= effectiveCeiling)
    return NextResponse.json({ error: "floor must be less than ceiling" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("asset_overrides")
    .upsert(
      {
        symbol:      symbol.toUpperCase(),
        floor:       floor       ?? null,
        ceiling:     ceiling     ?? null,
        start_price: startPrice  ?? null,
        volatility:  volatility  ?? null,
        reversion:   reversion   ?? null,
        drift:       drift       ?? null,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: "symbol" }
    );

  if (error) {
    console.error("[prices] PATCH DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ─── DELETE /api/admin/prices ──────────────────────────────────────

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { symbol } = await req.json();
  if (!symbol)
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("asset_overrides")
    .delete()
    .eq("symbol", symbol.toUpperCase());

  if (error) {
    console.error("[prices] DELETE DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}