import { NextResponse } from "next/server";

const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA"];
const BASE = "https://finnhub.io/api/v1";

export async function GET() {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Missing FINNHUB_API_KEY", results: [] });
  }

  const results = await Promise.all(
    SYMBOLS.map(async (symbol) => {
      try {
        const res = await fetch(`${BASE}/quote?symbol=${symbol}&token=${key}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          // e.g. 429 Too Many Requests from Finnhub
          return { symbol, price: null, changePercent: null, error: `HTTP ${res.status}` };
        }

        const data = await res.json();
        // Finnhub quote: c = current price, dp = % change. c === 0 usually means "no data"/bad symbol.
        if (!data || data.c === 0) {
          return { symbol, price: null, changePercent: null, error: "No data" };
        }

        return { symbol, price: data.c ?? null, changePercent: data.dp ?? null };
      } catch {
        // Network failure for this one symbol only — doesn't take down the others
        return { symbol, price: null, changePercent: null, error: "Fetch failed" };
      }
    })
  );

  const anyOk = results.some((r) => r.price !== null);
  return NextResponse.json({
    results,
    error: anyOk ? undefined : "All quote requests failed",
  });
}