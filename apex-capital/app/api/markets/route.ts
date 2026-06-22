import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Asset universe — US-listed stocks and ETFs only.                   */
/*  No NGX / Nigerian-listed instruments by design.                    */
/* ------------------------------------------------------------------ */

const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "META", name: "Meta Platforms, Inc." },
  { symbol: "NFLX", name: "Netflix, Inc." },
  { symbol: "DIS", name: "The Walt Disney Company" },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "KO", name: "The Coca-Cola Company" },
];

const ETFS = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF" },
  { symbol: "VXUS", name: "Vanguard Total International Stock ETF" },
  { symbol: "VEA", name: "Vanguard Developed Markets ETF" },
  { symbol: "EEM", name: "iShares MSCI Emerging Markets ETF" },
  { symbol: "GLD", name: "SPDR Gold Shares" },
];

const BASE = "https://finnhub.io/api/v1";

export async function GET() {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Missing FINNHUB_API_KEY", results: [] });
  }

  const universe = [
    ...STOCKS.map((a) => ({ ...a, assetType: "stock" as const })),
    ...ETFS.map((a) => ({ ...a, assetType: "etf" as const })),
  ];

  const results = await Promise.all(
    universe.map(async (asset) => {
      try {
        const res = await fetch(`${BASE}/quote?symbol=${asset.symbol}&token=${key}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          return {
            ...asset,
            price: null,
            changePercent: null,
            error: `HTTP ${res.status}`,
          };
        }

        const data = await res.json();
        if (!data || data.c === 0) {
          return { ...asset, price: null, changePercent: null, error: "No data" };
        }

        return {
          ...asset,
          price: data.c ?? null,
          changePercent: data.dp ?? null,
        };
      } catch {
        return { ...asset, price: null, changePercent: null, error: "Fetch failed" };
      }
    })
  );

  const anyOk = results.some((r) => r.price !== null);
  return NextResponse.json({
    results,
    error: anyOk ? undefined : "All quote requests failed",
  });
}