// Fully simulated market data for ALL asset types — stocks, ETFs, and
// crypto each get their own bounded floor/ceiling band. No external API
// calls, no live quotes — everything starts and ends as mock data.
// Same symbol + calendar day always produces the same path, so price
// (live quote) and chart (full series) never disagree.
//
// Admin overrides are stored in Supabase (asset_overrides table) and
// merged at runtime — any field left null falls back to the static default.
//
// ── Scripted demo mode ──────────────────────────────────────────────
// Set `endPrice` (override: end_price) to pin the day's close to an
// exact value — the walk still wanders organically all day but always
// lands there. Set `intensity` (override: intensity, 0..1) to control
// how wild that wandering looks: 0 = calm/flat, 1 = chaotic swings.
// Both are optional — assets without them behave exactly as before.
//
// ── Logos ────────────────────────────────────────────────────────────
// `logo` is a static, deterministic URL derived from the symbol — no API
// key required. Stocks/ETFs use logo.dev's ticker endpoint; crypto uses
// a public crypto-icon CDN keyed by lowercase symbol. If a logo fails to
// load client-side, fall back to rendering the symbol/initials instead.

export type PricePoint = { time: number; price: number };
export type AssetType = "stock" | "etf" | "crypto";

export type MockAsset = {
  symbol: string;
  name: string;
  assetType: AssetType;
  floor: number;
  ceiling: number;
  startPrice: number;
  logo: string;          // URL to the asset's logo/icon
  endPrice?: number;     // exact price to land on by end of day (scripted demo mode)
  intensity?: number;    // 0 (calm) .. 1 (wild) — overrides volatility/reversion when set
  volatility?: number;
  reversion?: number;
  drift?: number;
};

// Shape returned by the asset_overrides Supabase table.
// All numeric fields are nullable — null means "use static default".
export type AssetOverride = {
  symbol: string;
  floor: number | null;
  ceiling: number | null;
  start_price: number | null;
  end_price: number | null;
  intensity: number | null;
  volatility: number | null;
  reversion: number | null;
  drift: number | null;
};

const DEFAULT_VOLATILITY: Record<AssetType, number> = {
  crypto: 0.012,
  stock: 0.006,
  etf: 0.004,
};

const DEFAULT_REVERSION: Record<AssetType, number> = {
  crypto: 0.04,
  stock: 0.05,
  etf: 0.06,
};

// ─── Logo helpers ──────────────────────────────────────────────────
// No API key needed for either source.

// Maps a ticker to the company's primary domain, then fetches that
// domain's favicon via Google's public favicon service — no API key,
// no signup, works directly in an <img src>.
const TICKER_DOMAIN: Record<string, string> = {
  AAPL:  "apple.com",
  MSFT:  "microsoft.com",
  GOOGL: "google.com",
  AMZN:  "amazon.com",
  TSLA:  "tesla.com",
  NVDA:  "nvidia.com",
  META:  "meta.com",
  NFLX:  "netflix.com",
  DIS:   "disney.com",
  V:     "visa.com",
  JPM:   "jpmorganchase.com",
  KO:    "coca-cola.com",
  SPY:   "ssga.com",
  QQQ:   "invesco.com",
  VTI:   "vanguard.com",
  VXUS:  "vanguard.com",
  VEA:   "vanguard.com",
  EEM:   "ishares.com",
  GLD:   "ssga.com",
  // SpaceX + international tech
  SPCE:  "spacex.com",
  SMSN:  "samsung.com",
  LGCL:  "lg.com",
  SONY:  "sony.com",
  TM:    "toyota.com",
  NSANY: "nissan.com",
  BABA:  "alibaba.com",
  TSM:   "tsmc.com",
  SAP:   "sap.com",
  ASML:  "asml.com",
  // Social media
  SNAP:  "snap.com",
  PINS:  "pinterest.com",
  TWTR:  "x.com",
  RDDT:  "reddit.com",
  TTDV:  "tiktok.com",
  YT:    "youtube.com",
  // Vehicle companies
  F:     "ford.com",
  GM:    "gm.com",
  STLA:  "stellantis.com",
  RIVN:  "rivian.com",
  LCID:  "lucidmotors.com",
  NIO:   "nio.com",
  BMWYY: "bmw.com",
  MBGYY: "mercedes-benz.com",
  VWAGY: "vw.com",
  HMC:   "honda.com",
  HYMTF: "hyundai.com",
};

function stockLogo(ticker: string): string {
  const domain = TICKER_DOMAIN[ticker.toUpperCase()] ?? `${ticker.toLowerCase()}.com`;
  // Google's favicon service — public, no key, no rate-limit signup.
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

function cryptoLogo(symbol: string): string {
  // Public crypto icon CDN, keyed by lowercase symbol (color, 64px).
  return `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/64/color/${symbol.toLowerCase()}.png`;
}

// ─── Asset universe ────────────────────────────────────────────────

export const MOCK_STOCKS: MockAsset[] = [
  // ── Original stocks ──
  { symbol: "AAPL",  name: "Apple Inc.",                  assetType: "stock", floor: 195, ceiling: 230, startPrice: 212, logo: stockLogo("AAPL")  },
  { symbol: "MSFT",  name: "Microsoft Corporation",       assetType: "stock", floor: 380, ceiling: 430, startPrice: 405, logo: stockLogo("MSFT")  },
  { symbol: "GOOGL", name: "Alphabet Inc.",               assetType: "stock", floor: 150, ceiling: 185, startPrice: 168, logo: stockLogo("GOOGL") },
  { symbol: "AMZN",  name: "Amazon.com, Inc.",            assetType: "stock", floor: 170, ceiling: 200, startPrice: 185, logo: stockLogo("AMZN")  },
  { symbol: "TSLA",  name: "Tesla, Inc.",                 assetType: "stock", floor: 220, ceiling: 280, startPrice: 250, logo: stockLogo("TSLA")  },
  { symbol: "NVDA",  name: "NVIDIA Corporation",          assetType: "stock", floor: 110, ceiling: 145, startPrice: 128, logo: stockLogo("NVDA")  },
  { symbol: "META",  name: "Meta Platforms, Inc.",        assetType: "stock", floor: 480, ceiling: 560, startPrice: 520, logo: stockLogo("META")  },
  { symbol: "NFLX",  name: "Netflix, Inc.",               assetType: "stock", floor: 600, ceiling: 700, startPrice: 650, logo: stockLogo("NFLX")  },
  { symbol: "DIS",   name: "The Walt Disney Company",     assetType: "stock", floor: 90,  ceiling: 115, startPrice: 102, logo: stockLogo("DIS")   },
  { symbol: "V",     name: "Visa Inc.",                   assetType: "stock", floor: 260, ceiling: 300, startPrice: 280, logo: stockLogo("V")     },
  { symbol: "JPM",   name: "JPMorgan Chase & Co.",        assetType: "stock", floor: 190, ceiling: 230, startPrice: 210, logo: stockLogo("JPM")   },
  { symbol: "KO",    name: "The Coca-Cola Company",       assetType: "stock", floor: 60,  ceiling: 70,  startPrice: 65,  logo: stockLogo("KO")    },

  // ── SpaceX ──
  { symbol: "SPCE",  name: "SpaceX",                      assetType: "stock", floor: 160, ceiling: 220, startPrice: 185, logo: stockLogo("SPCE")  },

  // ── International & major tech ──
  { symbol: "SMSN",  name: "Samsung Electronics Co.",     assetType: "stock", floor: 52,  ceiling: 72,  startPrice: 62,  logo: stockLogo("SMSN")  },
  { symbol: "LGCL",  name: "LG Electronics Inc.",         assetType: "stock", floor: 68,  ceiling: 95,  startPrice: 80,  logo: stockLogo("LGCL")  },
  { symbol: "SONY",  name: "Sony Group Corporation",      assetType: "stock", floor: 78,  ceiling: 105, startPrice: 90,  logo: stockLogo("SONY")  },
  { symbol: "TM",    name: "Toyota Motor Corporation",    assetType: "stock", floor: 175, ceiling: 215, startPrice: 195, logo: stockLogo("TM")    },
  { symbol: "NSANY", name: "Nissan Motor Co., Ltd.",      assetType: "stock", floor: 6,   ceiling: 11,  startPrice: 8,   logo: stockLogo("NSANY") },
  { symbol: "BABA",  name: "Alibaba Group Holding Ltd.",  assetType: "stock", floor: 72,  ceiling: 105, startPrice: 88,  logo: stockLogo("BABA")  },
  { symbol: "TSM",   name: "Taiwan Semiconductor Mfg.",   assetType: "stock", floor: 145, ceiling: 185, startPrice: 165, logo: stockLogo("TSM")   },
  { symbol: "SAP",   name: "SAP SE",                      assetType: "stock", floor: 190, ceiling: 230, startPrice: 210, logo: stockLogo("SAP")   },
  { symbol: "ASML",  name: "ASML Holding N.V.",           assetType: "stock", floor: 780, ceiling: 950, startPrice: 860, logo: stockLogo("ASML")  },

  // ── Social media ──
  { symbol: "SNAP",  name: "Snap Inc.",                   assetType: "stock", floor: 9,   ceiling: 16,  startPrice: 12,  logo: stockLogo("SNAP")  },
  { symbol: "PINS",  name: "Pinterest, Inc.",             assetType: "stock", floor: 28,  ceiling: 42,  startPrice: 35,  logo: stockLogo("PINS")  },
  { symbol: "TWTR",  name: "X (formerly Twitter)",        assetType: "stock", floor: 38,  ceiling: 58,  startPrice: 48,  logo: stockLogo("TWTR")  },
  { symbol: "RDDT",  name: "Reddit, Inc.",                assetType: "stock", floor: 55,  ceiling: 85,  startPrice: 68,  logo: stockLogo("RDDT")  },
  { symbol: "TTDV",  name: "TikTok / ByteDance Ltd.",     assetType: "stock", floor: 120, ceiling: 165, startPrice: 140, logo: stockLogo("TTDV")  },
  { symbol: "YT",    name: "YouTube (Alphabet)",          assetType: "stock", floor: 175, ceiling: 230, startPrice: 200, logo: stockLogo("YT")    },

  // ── Vehicle companies ──
  { symbol: "F",     name: "Ford Motor Company",          assetType: "stock", floor: 10,  ceiling: 18,  startPrice: 14,  logo: stockLogo("F")     },
  { symbol: "GM",    name: "General Motors Company",      assetType: "stock", floor: 42,  ceiling: 62,  startPrice: 52,  logo: stockLogo("GM")    },
  { symbol: "STLA",  name: "Stellantis N.V.",             assetType: "stock", floor: 14,  ceiling: 24,  startPrice: 18,  logo: stockLogo("STLA")  },
  { symbol: "RIVN",  name: "Rivian Automotive, Inc.",     assetType: "stock", floor: 8,   ceiling: 18,  startPrice: 12,  logo: stockLogo("RIVN")  },
  { symbol: "LCID",  name: "Lucid Group, Inc.",           assetType: "stock", floor: 2,   ceiling: 5,   startPrice: 3,   logo: stockLogo("LCID")  },
  { symbol: "NIO",   name: "NIO Inc.",                    assetType: "stock", floor: 4,   ceiling: 9,   startPrice: 6,   logo: stockLogo("NIO")   },
  { symbol: "BMWYY", name: "BMW AG",                      assetType: "stock", floor: 28,  ceiling: 42,  startPrice: 35,  logo: stockLogo("BMWYY") },
  { symbol: "MBGYY", name: "Mercedes-Benz Group AG",      assetType: "stock", floor: 52,  ceiling: 72,  startPrice: 62,  logo: stockLogo("MBGYY") },
  { symbol: "VWAGY", name: "Volkswagen AG",               assetType: "stock", floor: 10,  ceiling: 18,  startPrice: 14,  logo: stockLogo("VWAGY") },
  { symbol: "HMC",   name: "Honda Motor Co., Ltd.",       assetType: "stock", floor: 28,  ceiling: 40,  startPrice: 34,  logo: stockLogo("HMC")   },
  { symbol: "HYMTF", name: "Hyundai Motor Company",       assetType: "stock", floor: 42,  ceiling: 62,  startPrice: 52,  logo: stockLogo("HYMTF") },
];

export const MOCK_ETFS: MockAsset[] = [
  { symbol: "SPY",  name: "SPDR S&P 500 ETF Trust",                 assetType: "etf", floor: 540, ceiling: 600, startPrice: 570, logo: stockLogo("SPY")  },
  { symbol: "QQQ",  name: "Invesco QQQ Trust",                      assetType: "etf", floor: 460, ceiling: 520, startPrice: 490, logo: stockLogo("QQQ")  },
  { symbol: "VTI",  name: "Vanguard Total Stock Market ETF",        assetType: "etf", floor: 260, ceiling: 300, startPrice: 280, logo: stockLogo("VTI")  },
  { symbol: "VXUS", name: "Vanguard Total International Stock ETF", assetType: "etf", floor: 55,  ceiling: 65,  startPrice: 60,  logo: stockLogo("VXUS") },
  { symbol: "VEA",  name: "Vanguard Developed Markets ETF",         assetType: "etf", floor: 48,  ceiling: 56,  startPrice: 52,  logo: stockLogo("VEA")  },
  { symbol: "EEM",  name: "iShares MSCI Emerging Markets ETF",      assetType: "etf", floor: 38,  ceiling: 46,  startPrice: 42,  logo: stockLogo("EEM")  },
  { symbol: "GLD",  name: "SPDR Gold Shares",                       assetType: "etf", floor: 230, ceiling: 270, startPrice: 250, logo: stockLogo("GLD")  },
];

export const MOCK_CRYPTO: MockAsset[] = [
  { symbol: "BTC",  name: "Bitcoin",  assetType: "crypto", floor: 58000, ceiling: 65000, startPrice: 61500, logo: cryptoLogo("btc")  },
  { symbol: "ETH",  name: "Ethereum", assetType: "crypto", floor: 2800,  ceiling: 3400,  startPrice: 3100,  logo: cryptoLogo("eth")  },
  { symbol: "SOL",  name: "Solana",   assetType: "crypto", floor: 120,   ceiling: 165,   startPrice: 142,   logo: cryptoLogo("sol")  },
  { symbol: "XRP",  name: "XRP",      assetType: "crypto", floor: 0.45,  ceiling: 0.62,  startPrice: 0.53,  logo: cryptoLogo("xrp")  },
  { symbol: "ADA",  name: "Cardano",  assetType: "crypto", floor: 0.32,  ceiling: 0.45,  startPrice: 0.38,  logo: cryptoLogo("ada")  },
  { symbol: "DOGE", name: "Dogecoin", assetType: "crypto", floor: 0.08,  ceiling: 0.12,  startPrice: 0.1,   logo: cryptoLogo("doge") },
];

export const MOCK_ASSETS: MockAsset[] = [...MOCK_STOCKS, ...MOCK_ETFS, ...MOCK_CRYPTO];

// ─── Override merging ──────────────────────────────────────────────
// Given a static asset and an optional DB override row, return the
// effective asset with any non-null override fields applied.

export function applyOverride(asset: MockAsset, override: AssetOverride | null): MockAsset {
  if (!override) return asset;
  return {
    ...asset,
    floor:      override.floor        ?? asset.floor,
    ceiling:    override.ceiling      ?? asset.ceiling,
    startPrice: override.start_price  ?? asset.startPrice,
    endPrice:   override.end_price    ?? asset.endPrice,
    intensity:  override.intensity    ?? asset.intensity,
    volatility: override.volatility   ?? asset.volatility,
    reversion:  override.reversion    ?? asset.reversion,
    drift:      override.drift        ?? asset.drift,
  };
}

// ─── Deterministic PRNG ────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

function todayDayStart() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

// ─── Core generator ────────────────────────────────────────────────

function generateMockPriceSeries({
  startPrice,
  endPrice,
  floor,
  ceiling,
  points = 144,
  volatility,
  reversion,
  drift,
  decimals,
  seed,
  dayStart,
}: {
  startPrice: number;
  endPrice?: number;
  floor: number;
  ceiling: number;
  points?: number;
  volatility: number;
  reversion: number;
  drift: number;
  decimals: number;
  seed: number;
  dayStart: number;
}): PricePoint[] {
  const rand = mulberry32(seed);
  const range = ceiling - floor;
  const mid = floor + range / 2;

  const series: PricePoint[] = [];
  let price = Math.min(Math.max(startPrice, floor), ceiling);
  const stepMs = (24 * 60 * 60 * 1000) / points;

  // If an endPrice is given, clamp it into [floor, ceiling] so a bad
  // override value can never push the walk outside its own bounds.
  const clampedEndPrice =
    endPrice !== undefined ? Math.min(Math.max(endPrice, floor), ceiling) : undefined;

  for (let i = 0; i < points; i++) {
    const randomStep = (rand() - 0.5) * 2 * volatility * range;
    const pull = (mid - price) * reversion;
    const trend = drift * range;

    const distanceToCeiling = ceiling - price;
    const resistanceZone = range * 0.15;
    const resistance =
      distanceToCeiling < resistanceZone
        ? -(resistanceZone - distanceToCeiling) * 0.6
        : 0;

    const distanceToFloor = price - floor;
    const supportZone = range * 0.15;
    const support =
      distanceToFloor < supportZone
        ? (supportZone - distanceToFloor) * 0.6
        : 0;

    price = price + randomStep + pull + trend + resistance + support;

    // ── Brownian-bridge pin toward endPrice ──
    // Only engages if endPrice is explicitly set. Correction is
    // back-loaded (cubic) so the walk still wanders freely for most
    // of the day and only "locks on" in the final stretch — this
    // keeps intensity/volatility visible instead of flattening the
    // whole path into a straight line toward the target.
    if (clampedEndPrice !== undefined && i > 0) {
      const stepsLeft = points - i;
      const progress = i / points;
      const tighten = Math.pow(progress, 3);
      const gapToTarget = clampedEndPrice - price;
      const bridgeStrength = Math.max(
        1 / stepsLeft,
        (tighten / stepsLeft) * points * 0.02
      );
      price += gapToTarget * Math.min(bridgeStrength, 1);
    }

    if (price > ceiling) price = ceiling - (price - ceiling);
    if (price < floor)   price = floor   + (floor   - price);
    price = Math.min(Math.max(price, floor), ceiling);

    series.push({ time: dayStart + i * stepMs, price });
  }

  // Force the very last point to be exactly the target, since floating
  // point drift from the clamp/reflect logic above can leave it a hair off.
  if (clampedEndPrice !== undefined && series.length > 0) {
    series[series.length - 1].price = clampedEndPrice;
  }

  // Old tail-dampening hack — only runs when there's no explicit
  // endPrice. The bridge correction above already handles landing
  // precisely, so running both would fight each other.
  if (clampedEndPrice === undefined) {
    const tailLen = 6;
    const tailStart = Math.max(0, points - tailLen);
    for (let i = tailStart; i < series.length; i++) {
      const stepsFromEnd = series.length - i;
      const cap = ceiling - range * 0.08 * (1 - stepsFromEnd / tailLen);
      if (series[i].price > cap) series[i].price = cap - rand() * range * 0.02;
    }
  }

  return series.map((p) => ({
    ...p,
    price: Math.round(p.price * 10 ** decimals) / 10 ** decimals,
  }));
}

// ─── Public API ────────────────────────────────────────────────────
// These are the "pure" versions that take an already-resolved asset
// (after overrides have been applied server-side). Import and call
// these from your API routes after merging overrides from Supabase.

export function getMockDailySeries(asset: MockAsset): PricePoint[] {
  const dayStart = todayDayStart();
  const seed = hashSeed(`${asset.symbol}-${dayStart}`);
  const decimals = asset.ceiling < 1 ? 4 : 2;

  // If intensity is set, derive volatility/reversion from it directly,
  // taking priority over individually-set volatility/reversion fields.
  // 0 = calm/flat, 1 = chaotic swings.
  let volatility = asset.volatility ?? DEFAULT_VOLATILITY[asset.assetType];
  let reversion  = asset.reversion  ?? DEFAULT_REVERSION[asset.assetType];

  if (asset.intensity !== undefined) {
    const t = Math.min(Math.max(asset.intensity, 0), 1);
    volatility = 0.003 + t * 0.02;   // calm ~0.003 -> wild ~0.023
    reversion  = 0.10 - t * 0.08;    // calm snaps back hard -> wild barely pulls
  }

  return generateMockPriceSeries({
    startPrice: asset.startPrice,
    endPrice:   asset.endPrice,
    floor:      asset.floor,
    ceiling:    asset.ceiling,
    volatility,
    reversion,
    drift:      asset.drift ?? 0,
    decimals,
    seed,
    dayStart,
  });
}

export function getMockQuote(asset: MockAsset) {
  const series = getMockDailySeries(asset);
  const now = Date.now();

  let current = series[0];
  for (const point of series) {
    if (point.time <= now) current = point;
    else break;
  }

  const open = series[0].price;
  const changePercent = open ? ((current.price - open) / open) * 100 : 0;

  return {
    symbol:        asset.symbol,
    name:          asset.name,
    assetType:     asset.assetType,
    logo:          asset.logo,
    price:         current.price,
    changePercent: Math.round(changePercent * 100) / 100,
  };
}

export function getMockAsset(symbol: string): MockAsset | undefined {
  return MOCK_ASSETS.find((a) => a.symbol === symbol.toUpperCase());
}

export function getAllMockQuotes() {
  return MOCK_ASSETS.map(getMockQuote);
}