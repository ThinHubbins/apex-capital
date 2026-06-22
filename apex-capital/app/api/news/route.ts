import { NextResponse } from "next/server";

const BASE = "https://finnhub.io/api/v1";

const GENERIC_IMAGE_PATTERNS = [
  "reuters.com/resizer",
  "static.reuters.com/resources/r/",
  "/brand/",
  "logo",
];

function isGenericImage(url: string | undefined | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return GENERIC_IMAGE_PATTERNS.some((pattern) => lower.includes(pattern));
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[-–—|.,:;'"!?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isRedundantSummary(headline: string, summary: string): boolean {
  if (!summary) return true;

  const normHeadline = normalize(headline);
  const normSummary = normalize(summary);

  if (normHeadline === normSummary) return true;

  const longer = normHeadline.length > normSummary.length ? normHeadline : normSummary;
  const shorter = normHeadline.length > normSummary.length ? normSummary : normHeadline;

  if (longer.includes(shorter) && shorter.length / longer.length > 0.85) {
    return true;
  }

  return false;
}

// In-memory cache, keyed by UTC date string (e.g. "2026-06-19"). This
// pins the day's top-10 list so it doesn't reshuffle on every request —
// it only changes once a new UTC day begins. Resets if the server
// restarts/redeploys, which is fine for this use case.
let cache: { dateKey: string; results: any[] } | null = null;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" in UTC
}

export async function GET() {
  const dateKey = todayKey();

  // Serve from cache if we already built today's list
  if (cache && cache.dateKey === dateKey) {
    return NextResponse.json({ results: cache.results });
  }

  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Missing FINNHUB_API_KEY", results: [] });
  }

  try {
    const res = await fetch(`${BASE}/news?category=general&token=${key}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Finnhub /news failed:", res.status, body);
      // If we have a stale cache from a previous day, prefer that over
      // showing nothing.
      if (cache) {
        return NextResponse.json({ results: cache.results });
      }
      return NextResponse.json({
        error: `Finnhub returned ${res.status}: ${body.slice(0, 200)}`,
        results: [],
      });
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("Finnhub /news unexpected payload:", data);
      if (cache) return NextResponse.json({ results: cache.results });
      return NextResponse.json({
        error: "Unexpected response shape from Finnhub",
        results: [],
      });
    }

    const results = data
      .filter((item: any) => item.headline && item.url)
      .filter((item: any) => !isGenericImage(item.image))
      .filter(
        (item: any, index: number, arr: any[]) =>
          arr.findIndex(
            (other) => normalize(other.headline) === normalize(item.headline)
          ) === index
      )
      .slice(0, 30)
      .map((item: any) => {
        const headline = (item.headline ?? "").trim();
        const rawSummary = (item.summary ?? "").trim();
        const summary = isRedundantSummary(headline, rawSummary) ? "" : rawSummary;

        return {
          id: item.id,
          headline,
          summary,
          source: item.source,
          url: item.url,
          category: item.category,
          datetime: item.datetime,
          image: item.image,
        };
      })
      .sort((a: any, b: any) => (b.summary ? 1 : 0) - (a.summary ? 1 : 0))
      .slice(0, 10); // <-- top 10 for the day

    cache = { dateKey, results };

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Finnhub /news threw:", err);
    if (cache) {
      return NextResponse.json({ results: cache.results });
    }
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Failed to fetch news",
      results: [],
    });
  }
}