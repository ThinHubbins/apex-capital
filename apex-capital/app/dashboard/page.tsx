"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert, Clock, ArrowUpRight, ArrowDownRight, Plus, Minus,
  Wallet, TrendingUp, TrendingDown, ChevronRight, X, Loader2,
  ShoppingCart, DollarSign, RefreshCw,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import { AssetLogo } from "../../components/Assetslogo"; // adjust path if needed
import { createClient } from "../../lib/supabase/client";


// ─── Types ────────────────────────────────────────────────────────────────────

type KycStatus = "unverified" | "pending" | "verified" | "rejected";

type RawOrder = {
  id: string;
  symbol: string;
  asset_name: string;
  asset_type: "stock" | "etf";
  side: "buy" | "sell";
  quantity: number;
  price_at_execution: number;
  total_value: number;
  status: string;
  filled_at: string | null;
  created_at: string;
};

type RawDeposit = {
  id: string;
  amount: number;
  status: string;
  submitted_at: string;
};

type Holding = {
  symbol: string;
  name: string;
  type: "stock" | "etf";
  logo: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  changePercent: number;
};

type ActivityItem = {
  id: string;
  kind: "buy" | "sell" | "deposit" | "withdrawal";
  label: string;
  detail: string;
  amount: number;
  date: string;
};

// ─── Logo helper ──────────────────────────────────────────────────────────────

const TICKER_DOMAIN: Record<string, string> = {
  AAPL: "apple.com", MSFT: "microsoft.com", GOOGL: "google.com",
  AMZN: "amazon.com", TSLA: "tesla.com", NVDA: "nvidia.com",
  META: "meta.com", NFLX: "netflix.com", DIS: "disney.com",
  V: "visa.com", JPM: "jpmorganchase.com", KO: "coca-cola.com",
  SPY: "ssga.com", QQQ: "invesco.com", VTI: "vanguard.com",
  VXUS: "vanguard.com", VEA: "vanguard.com", EEM: "ishares.com",
  GLD: "ssga.com",
};

function getAssetLogo(symbol: string, type: "stock" | "etf" | "crypto"): string {
  if (type === "crypto") {
    return `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/64/color/${symbol.toLowerCase()}.png`;
  }
  const domain = TICKER_DOMAIN[symbol.toUpperCase()] ?? `${symbol.toLowerCase()}.com`;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Growth Chart ─────────────────────────────────────────────────────────────

function GrowthChart({ data }: { data: number[] }) {
  if (data.length < 2) return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[#E5E5E2]">
      <p className="text-[13px] text-[#9CA3AF]">No chart data yet</p>
    </div>
  );

  const width = 600;
  const height = 160;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - ((v - min) / range) * height,
  ]);
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const isUp = data[data.length - 1] >= data[0];
  const stroke = isUp ? "#1a6b3c" : "#dc2626";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-40 w-full">
      <defs>
        <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.12" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#growthFill)" />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={2} />
    </svg>
  );
}

// ─── Activity icon ─────────────────────────────────────────────────────────────

function ActivityIcon({ kind }: { kind: ActivityItem["kind"] }) {
  const map: Record<ActivityItem["kind"], { icon: React.ElementType; bg: string; color: string }> = {
    buy:        { icon: ShoppingCart,   bg: "bg-[#EEF2FF]", color: "text-indigo-600" },
    sell:       { icon: ArrowUpRight,   bg: "bg-[#F0F7F2]", color: "text-[#1a6b3c]" },
    deposit:    { icon: ArrowDownRight, bg: "bg-[#F0F7F2]", color: "text-[#1a6b3c]" },
    withdrawal: { icon: Minus,          bg: "bg-red-50",    color: "text-red-600" },
  };
  const { icon: Icon, bg, color } = map[kind];
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>
      <Icon className={`h-4 w-4 ${color}`} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [kycStatus, setKycStatus] = useState<KycStatus>("unverified");
  const [userInitials, setUserInitials] = useState("--");
  const [cashBalance, setCashBalance] = useState(0);
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [deposits, setDeposits] = useState<RawDeposit[]>([]);
  const [liveMarket, setLiveMarket] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // ── Auth guard ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
    });
  }, []);

  // ── Fetch all real data ──
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, ordersRes, depositsRes, marketsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("kyc_status, full_name, cash_balance")
        .eq("id", user.id)
        .single(),
      supabase
        .from("orders")
        .select("id, symbol, asset_name, asset_type, side, quantity, price_at_execution, total_value, status, filled_at, created_at")
        .eq("user_id", user.id)
        .eq("status", "filled")
        .order("filled_at", { ascending: false }),
      supabase
        .from("deposits")
        .select("id, amount, status, submitted_at")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(10),
      fetch("/api/markets").then((r) => r.json()).catch(() => ({ results: [] })),
    ]);

    if (profileRes.data) {
      setKycStatus(profileRes.data.kyc_status as KycStatus);
      setCashBalance(Number(profileRes.data.cash_balance ?? 0));
      if (profileRes.data.full_name) {
        setUserInitials(
          profileRes.data.full_name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        );
      }
    }

    if (ordersRes.data) setOrders(ordersRes.data as RawOrder[]);
    if (depositsRes.data) setDeposits(depositsRes.data as RawDeposit[]);

    const priceMap: Record<string, number> = {};
    for (const asset of marketsRes.results ?? []) {
      if (asset.price != null) priceMap[asset.symbol] = asset.price;
    }
    setLiveMarket(priceMap);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derive holdings from filled orders ──
  const holdings: Holding[] = useMemo(() => {
    const map: Record<string, {
      name: string;
      type: "stock" | "etf";
      totalQty: number;
      totalCost: number;
    }> = {};

    for (const o of orders) {
      if (!map[o.symbol]) {
        map[o.symbol] = { name: o.asset_name, type: o.asset_type, totalQty: 0, totalCost: 0 };
      }
      const qty = Number(o.quantity);
      const price = Number(o.price_at_execution);
      if (o.side === "buy") {
        map[o.symbol].totalQty += qty;
        map[o.symbol].totalCost += qty * price;
      } else {
        map[o.symbol].totalQty -= qty;
        map[o.symbol].totalCost -= qty * price;
      }
    }

    return Object.entries(map)
      .filter(([, v]) => v.totalQty > 0.0001)
      .map(([symbol, v]) => {
        const avgCost = v.totalQty > 0 ? v.totalCost / v.totalQty : 0;
        const currentPrice = liveMarket[symbol] ?? avgCost;
        const changePercent = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0;
        return {
          symbol,
          name: v.name,
          type: v.type,
          logo: getAssetLogo(symbol, v.type),
          shares: v.totalQty,
          avgCost,
          currentPrice,
          changePercent,
        };
      })
      .sort((a, b) => b.shares * b.currentPrice - a.shares * a.currentPrice);
  }, [orders, liveMarket]);

  // ── Portfolio totals ──
  const totals = useMemo(() => {
    const marketValue      = holdings.reduce((s, h) => s + h.shares * h.currentPrice, 0);
    const costBasis        = holdings.reduce((s, h) => s + h.shares * h.avgCost, 0);
    const totalGainValue   = marketValue - costBasis;
    const totalGainPercent = costBasis > 0 ? (totalGainValue / costBasis) * 100 : 0;
    const dayChangeValue   = holdings.reduce((s, h) => s + h.shares * h.currentPrice * (h.changePercent / 100), 0);
    const dayChangePercent = marketValue > 0 ? (dayChangeValue / (marketValue - dayChangeValue || 1)) * 100 : 0;
    return {
      portfolioValue: marketValue + cashBalance,
      marketValue,
      dayChangeValue,
      dayChangePercent,
      totalGainValue,
      totalGainPercent,
    };
  }, [holdings, cashBalance]);

  // ── Build chart series ──
  const growthSeries: number[] = useMemo(() => {
    const filled = [...orders]
      .filter((o) => o.filled_at)
      .sort((a, b) => new Date(a.filled_at!).getTime() - new Date(b.filled_at!).getTime());

    if (filled.length === 0) return [];

    let running = 0;
    const series: number[] = [];
    for (const o of filled) {
      running += o.side === "buy" ? o.total_value : -o.total_value;
      series.push(Math.max(0, running));
    }
    series.push(totals.portfolioValue);
    return series;
  }, [orders, cashBalance, totals.portfolioValue]);

  // ── Recent activity ──
  const activity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    for (const o of orders.slice(0, 8)) {
      items.push({
        id: o.id,
        kind: o.side,
        label: `${o.side === "buy" ? "Bought" : "Sold"} ${o.symbol}`,
        detail: `${Number(o.quantity)} share${Number(o.quantity) !== 1 ? "s" : ""}`,
        amount: o.side === "buy" ? -Number(o.total_value) : Number(o.total_value),
        date: new Date(o.filled_at ?? o.created_at).toLocaleDateString("en-US", {
          day: "numeric", month: "short",
        }),
      });
    }

    for (const d of deposits.slice(0, 5)) {
      if (d.status === "approved" || d.status === "pending") {
        items.push({
          id: d.id,
          kind: "deposit",
          label: d.status === "approved" ? "Deposit approved" : "Deposit pending",
          detail: "Bank transfer",
          amount: Number(d.amount),
          date: new Date(d.submitted_at).toLocaleDateString("en-US", {
            day: "numeric", month: "short",
          }),
        });
      }
    }

    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [orders, deposits]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] font-sans">
        <Navbar variant="auth" />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
        </div>
      </div>
    );
  }

  const isVerified = kycStatus === "verified";

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      <Navbar variant="auth" kycStatus={kycStatus} userInitials={userInitials} />

      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">

        {/* ── Header ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-[#111827]">Dashboard</h1>
            <p className="mt-0.5 text-[13px] text-[#9CA3AF]">
              Updated {new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-[#E5E5E2] bg-white px-3.5 py-2 text-[13px] font-medium text-[#6B7280] shadow-sm hover:text-[#111827] disabled:opacity-50"
          >
            {refreshing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>

        {/* ── KYC banner ── */}
        {!isVerified && !bannerDismissed && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#E5E5E2] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${kycStatus === "pending" ? "bg-amber-50" : "bg-[#F3F4F6]"}`}>
                {kycStatus === "pending"
                  ? <Clock className="h-4 w-4 text-amber-600" strokeWidth={1.75} />
                  : <ShieldAlert className="h-4 w-4 text-[#6B7280]" strokeWidth={1.75} />}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#111827]">
                  {kycStatus === "pending"
                    ? "Your verification is under review"
                    : "Verify your identity to unlock deposits and trading"}
                </p>
                <p className="mt-0.5 text-[13px] text-[#6B7280]">
                  {kycStatus === "pending"
                    ? "This usually takes less than 10 minutes. We'll email you once it's done."
                    : "Takes about 3 minutes. You can browse markets in the meantime."}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              {kycStatus !== "pending" && (
                <Link href="/kyc-flow"
                  className="rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90">
                  Complete verification
                </Link>
              )}
              <button type="button" aria-label="Dismiss" onClick={() => setBannerDismissed(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#F7F7F5] hover:text-[#111827]">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Portfolio summary + chart ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">Total portfolio value</p>
                <p className="mt-1.5 text-[34px] font-extrabold tracking-tight text-[#111827]">
                  ${fmt(totals.portfolioValue)}
                </p>
                <div className={`mt-2 inline-flex items-center gap-1 text-[13px] font-medium ${totals.totalGainValue >= 0 ? "text-[#1a6b3c]" : "text-red-600"}`}>
                  {totals.totalGainValue >= 0
                    ? <TrendingUp className="h-3.5 w-3.5" />
                    : <TrendingDown className="h-3.5 w-3.5" />}
                  {totals.totalGainValue >= 0 ? "+" : "-"}${fmt(Math.abs(totals.totalGainValue))} ({totals.totalGainValue >= 0 ? "+" : ""}{totals.totalGainPercent.toFixed(2)}%) all time
                </div>
              </div>
              <Link href="/portfolio"
                className="rounded-lg border border-[#E5E5E2] px-3 py-1.5 text-[12px] font-medium text-[#6B7280] hover:text-[#111827]">
                Full analysis →
              </Link>
            </div>
            <div className="mt-6">
              <GrowthChart data={growthSeries} />
            </div>
          </div>

          {/* Side cards */}
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
              <p className="text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">Available cash</p>
              <p className="mt-1.5 text-[24px] font-bold text-[#111827]">${fmt(cashBalance)}</p>
              <div className="mt-3 flex gap-2">
                <Link href="/dashboard/deposit"
                  className="flex-1 rounded-lg bg-[#111827] py-1.5 text-center text-[12px] font-medium text-white hover:opacity-90">
                  Deposit
                </Link>
                <Link href="/dashboard/withdraw"
                  className="flex-1 rounded-lg border border-[#E5E5E2] py-1.5 text-center text-[12px] font-medium text-[#6B7280] hover:text-[#111827]">
                  Withdraw
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
              <p className="text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">Total gain / loss</p>
              <p className={`mt-1.5 text-[24px] font-bold ${totals.totalGainValue >= 0 ? "text-[#1a6b3c]" : "text-red-600"}`}>
                {totals.totalGainValue >= 0 ? "+" : "-"}${fmt(Math.abs(totals.totalGainValue))}
              </p>
              <p className={`mt-1 text-[12.5px] font-medium ${totals.totalGainPercent >= 0 ? "text-[#1a6b3c]" : "text-red-600"}`}>
                {totals.totalGainPercent >= 0 ? "+" : ""}{totals.totalGainPercent.toFixed(2)}% all time
              </p>
            </div>
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div className="mt-5 grid grid-cols-3 gap-3 sm:flex sm:flex-wrap">
          <Link href="/markets"
            className="group flex items-center justify-center gap-2.5 rounded-xl bg-[#111827] px-6 py-3.5 text-white shadow-sm transition-all hover:bg-[#1f2937] hover:shadow-md active:scale-[0.98]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-colors group-hover:bg-white/20">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <span className="text-[14px] font-semibold">Buy</span>
          </Link>
          <Link href="/portfolio"
            className="group flex items-center justify-center gap-2.5 rounded-xl border border-[#E5E5E2] bg-white px-6 py-3.5 text-[#111827] shadow-sm transition-all hover:border-[#D1D5DB] hover:shadow-md active:scale-[0.98]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F3F4F6] transition-colors group-hover:bg-[#E5E7EB]">
              <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <span className="text-[14px] font-semibold">Sell</span>
          </Link>
        </div>

        {/* ── Holdings + activity ── */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* Holdings */}
          <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#111827]">Your holdings</h2>
              <Link href="/portfolio" className="flex items-center gap-1 text-[13px] font-medium text-[#6B7280] hover:text-[#111827]">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {holdings.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
                <p className="text-[14px] font-medium text-[#6B7280]">No holdings yet</p>
                <p className="mt-1 text-[13px] text-[#9CA3AF]">Start by browsing the markets</p>
                <Link href="/markets"
                  className="mt-4 rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90">
                  Browse markets
                </Link>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-[#F3F4F6]">
                {holdings.slice(0, 5).map((h) => {
                  const value = h.shares * h.currentPrice;
                  const up = h.changePercent >= 0;
                  return (
                    <Link
                      key={h.symbol}
                      href={`/trade/${h.symbol}?name=${encodeURIComponent(h.name)}&type=${h.type}&price=${h.currentPrice}`}
                      className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3.5 transition-colors hover:bg-[#F7F7F5]">
                      <div className="flex items-center gap-3">
                        <AssetLogo symbol={h.symbol} logo={h.logo} size={36} />
                        <div>
                          <p className="text-[14px] font-semibold text-[#111827]">{h.symbol}</p>
                          <p className="text-[12px] text-[#9CA3AF]">
                            {Number(h.shares).toFixed(h.shares % 1 === 0 ? 0 : 4)} shares · ${fmt(h.currentPrice)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-bold text-[#111827]">${fmt(value)}</p>
                        <p className={`flex items-center justify-end gap-0.5 text-[12px] font-medium ${up ? "text-[#1a6b3c]" : "text-red-500"}`}>
                          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {up ? "+" : ""}{h.changePercent.toFixed(2)}%
                        </p>
                      </div>
                    </Link>
                  );
                })}
                {holdings.length > 5 && (
                  <div className="pt-3 text-center">
                    <Link href="/portfolio" className="text-[13px] font-medium text-[#6B7280] hover:text-[#111827]">
                      +{holdings.length - 5} more positions →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#111827]">Recent activity</h2>
              <Link href="/wallet" className="text-[13px] font-medium text-[#6B7280] hover:text-[#111827]">
                View all
              </Link>
            </div>

            {activity.length === 0 ? (
              <div className="mt-6 flex flex-col items-center py-8 text-center">
                <p className="text-[13px] text-[#9CA3AF]">No activity yet</p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-[#F3F4F6]">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 py-3.5">
                    <div className="flex items-center gap-3">
                      <ActivityIcon kind={a.kind} />
                      <div>
                        <p className="text-[13.5px] font-medium text-[#111827]">{a.label}</p>
                        <p className="text-[12px] text-[#9CA3AF]">{a.detail} · {a.date}</p>
                      </div>
                    </div>
                    <p className={`shrink-0 text-[13.5px] font-semibold ${a.amount >= 0 ? "text-[#1a6b3c]" : "text-[#111827]"}`}>
                      {a.amount >= 0 ? "+" : "-"}${fmt(Math.abs(a.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}