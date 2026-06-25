"use client"
import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  BarChart2, ArrowRight, ShoppingCart, DollarSign, Minus,
  Sparkles, ChevronRight, RefreshCw, Loader2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type Holding = {
  symbol: string;
  name: string;
  type: "stock" | "etf";
  quantity: number;
  avgCost: number;
  currentPrice: number;
};

type RankedHolding = Holding & {
  marketValue: number;
  gain: number;
  returnPct: number;
};

type ActivityItem = {
  id: string;
  kind: "buy" | "sell" | "deposit" | "withdrawal";
  description: string;
  amount: number;
  date: string;
};

type ChartPoint = { date: string; value: number };

type RawDeposit = {
  id: string;
  amount: number;
  status: string;
  submitted_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOCATION_COLORS = ["#111827", "#4B5563", "#9CA3AF"];

const FILTERS = ["1W", "1M", "3M", "1Y", "ALL"] as const;
type Filter = (typeof FILTERS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(n: number) {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}
function gainColor(n: number) { return n >= 0 ? "text-[#1a6b3c]" : "text-red-600"; }
function gainBg(n: number) { return n >= 0 ? "bg-[#F0F7F2]" : "bg-red-50"; }

function filterCutoff(f: Filter): Date {
  const now = new Date();
  if (f === "1W") return new Date(now.getTime() - 7 * 86400_000);
  if (f === "1M") return new Date(now.getTime() - 30 * 86400_000);
  if (f === "3M") return new Date(now.getTime() - 90 * 86400_000);
  if (f === "1Y") return new Date(now.getTime() - 365 * 86400_000);
  return new Date(0); // ALL
}

/**
 * Build cumulative portfolio value chart from filled buy/sell orders.
 * Strategy: sort orders by date, keep a running "cost basis cash spent"
 * so the chart shows invested capital growing/shrinking over time.
 * Each point = sum of (qty × price_at_execution) for each still-held lot
 * at that moment in time, using each order's own execution price as a
 * proxy for "value at that date" (since we have no external price history).
 */
function buildChartData(orders: RawOrder[], filter: Filter, cashBalance: number): ChartPoint[] {
  const filled = orders
    .filter((o) => o.status === "filled" && o.filled_at)
    .sort((a, b) => new Date(a.filled_at!).getTime() - new Date(b.filled_at!).getTime());

  if (filled.length === 0) return [];

  const cutoff = filterCutoff(filter);

  // Build a timeline: for every unique date with an order, compute cumulative
  // invested equity (sum of buy total_values minus sell total_values so far).
  type Snapshot = { date: string; equity: number };
  const snapshots: Snapshot[] = [];
  let runningEquity = 0;

  for (const o of filled) {
    const d = new Date(o.filled_at!);
    runningEquity += o.side === "buy" ? o.total_value : -o.total_value;
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    snapshots.push({ date: label, equity: Math.max(0, runningEquity) });
  }

  // Always append a "now" point that adds current cash balance
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const lastEquity = snapshots[snapshots.length - 1]?.equity ?? 0;
  snapshots.push({ date: today, value: lastEquity + cashBalance } as unknown as Snapshot);

  // Filter to the chosen time window (keep all if window precedes first order)
  const visible = snapshots.filter((_, i) => {
    const o = filled[i];
    if (!o) return true; // the "now" point always shows
    return new Date(o.filled_at!).getTime() >= cutoff.getTime();
  });

  // Deduplicate same-date entries by taking the last value for that date
  const deduped = new Map<string, number>();
  for (const s of visible) {
    deduped.set(s.date, (s as unknown as ChartPoint).value ?? (s as Snapshot).equity);
  }

  return Array.from(deduped.entries()).map(([date, value]) => ({ date, value }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, subColor, icon: Icon,
}: {
  label: string; value: string; sub?: string; subColor?: string; icon?: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E5E2] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">{label}</p>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3F4F6]">
            <Icon className="h-3.5 w-3.5 text-[#6B7280]" />
          </div>
        )}
      </div>
      <p className="mt-2 text-[22px] font-extrabold tracking-tight text-[#111827]">{value}</p>
      {sub && <p className={`mt-0.5 text-[12.5px] font-medium ${subColor ?? "text-[#6B7280]"}`}>{sub}</p>}
    </div>
  );
}

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

function InsightRow({ label, value, level }: {
  label: string; value: string; level: "ok" | "warning" | "info";
}) {
  const dot = level === "ok" ? "bg-[#1a6b3c]" : level === "warning" ? "bg-amber-500" : "bg-[#9CA3AF]";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#F3F4F6] bg-[#F7F7F5] px-4 py-3">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <div>
        <p className="text-[12px] font-semibold text-[#374151]">{label}</p>
        <p className="mt-0.5 text-[12px] text-[#6B7280]">{value}</p>
      </div>
    </div>
  );
}

function PerformersCard({
  title, items, positive,
}: {
  title: string; items: RankedHolding[]; positive: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white shadow-sm">
      <div className="border-b border-[#F3F4F6] px-5 py-4">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-[#111827]">
          {positive
            ? <TrendingUp className="h-4 w-4 text-[#1a6b3c]" />
            : <TrendingDown className="h-4 w-4 text-red-500" />}
          {title}
        </p>
      </div>
      <div className="divide-y divide-[#F3F4F6]">
        {items.map((h, i) => (
          <div key={h.symbol} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="w-4 text-[11px] font-semibold text-[#9CA3AF]">{i + 1}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3F4F6] text-[10px] font-bold text-[#374151]">
                {h.symbol.slice(0, 2)}
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#111827]">{h.symbol}</p>
                <p className="text-[11px] text-[#9CA3AF]">
                  ${fmt(Math.abs(h.gain))} {h.gain >= 0 ? "gain" : "loss"}
                </p>
              </div>
            </div>
            <span className={`text-[13px] font-semibold ${h.returnPct >= 0 ? "text-[#1a6b3c]" : "text-red-600"}`}>
              {pct(h.returnPct)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#F3F4F6] ${className}`} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [deposits, setDeposits] = useState<RawDeposit[]>([]);
  const [cashBalance, setCashBalance] = useState(0);
  const [liveMarket, setLiveMarket] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>("1M");
  const [hoveredHolding, setHoveredHolding] = useState<string | null>(null);

  // ── Auth guard ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
    });
  }, []);

  // ── Fetch everything ──
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, ordersRes, depositsRes, marketsRes] = await Promise.all([
      supabase.from("profiles").select("cash_balance").eq("id", user.id).single(),
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
        .limit(20),
      fetch("/api/markets").then((r) => r.json()).catch(() => ({ results: [] })),
    ]);

    if (profileRes.data) setCashBalance(Number(profileRes.data.cash_balance ?? 0));
    if (ordersRes.data) setOrders(ordersRes.data as RawOrder[]);
    if (depositsRes.data) setDeposits(depositsRes.data as RawDeposit[]);

    // Build symbol → current price lookup
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
      name: string; type: "stock" | "etf";
      totalQty: number; totalCost: number;
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
      .map(([symbol, v]) => ({
        symbol,
        name: v.name,
        type: v.type,
        quantity: v.totalQty,
        avgCost: v.totalQty > 0 ? v.totalCost / v.totalQty : 0,
        currentPrice: liveMarket[symbol] ?? v.totalCost / v.totalQty, // fallback to avg cost if no live price
      }));
  }, [orders, liveMarket]);

  // ── Ranked holdings ──
  const ranked: RankedHolding[] = useMemo(
    () =>
      [...holdings]
        .map((h) => ({
          ...h,
          marketValue: h.currentPrice * h.quantity,
          gain: (h.currentPrice - h.avgCost) * h.quantity,
          returnPct: h.avgCost > 0 ? ((h.currentPrice - h.avgCost) / h.avgCost) * 100 : 0,
        }))
        .sort((a, b) => b.returnPct - a.returnPct),
    [holdings]
  );

  // ── Portfolio totals ──
  const totalMarketValue = useMemo(() => ranked.reduce((s, h) => s + h.marketValue, 0), [ranked]);
  const totalInvested    = useMemo(() => ranked.reduce((s, h) => s + h.avgCost * h.quantity, 0), [ranked]);
  const totalGain        = totalMarketValue - totalInvested;
  const totalReturn      = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const totalPortfolio   = totalMarketValue + cashBalance;

  // ── Allocation ──
  const stockValue = useMemo(
    () => ranked.filter((h) => h.type === "stock").reduce((s, h) => s + h.marketValue, 0),
    [ranked]
  );
  const etfValue = useMemo(
    () => ranked.filter((h) => h.type === "etf").reduce((s, h) => s + h.marketValue, 0),
    [ranked]
  );
  const allocData = totalPortfolio > 0
    ? [
        { name: "Stocks", value: stockValue, pct: (stockValue / totalPortfolio) * 100 },
        { name: "ETFs",   value: etfValue,   pct: (etfValue   / totalPortfolio) * 100 },
        { name: "Cash",   value: cashBalance, pct: (cashBalance / totalPortfolio) * 100 },
      ]
    : [];

  // ── Chart ──
  const chartData: ChartPoint[] = useMemo(
    () => buildChartData(orders, filter, cashBalance),
    [orders, filter, cashBalance]
  );
  const chartStart   = chartData[0]?.value ?? 0;
  const chartEnd     = chartData[chartData.length - 1]?.value ?? 0;
  const chartChange  = chartEnd - chartStart;
  const chartChangePct = chartStart > 0 ? (chartChange / chartStart) * 100 : 0;

  // ── Activity — merge orders + deposits ──
  const activity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    for (const o of orders.slice(0, 10)) {
      items.push({
        id: o.id,
        kind: o.side,
        description: `${o.side === "buy" ? "Bought" : "Sold"} ${o.quantity} share${Number(o.quantity) !== 1 ? "s" : ""} of ${o.symbol}`,
        amount: o.side === "buy" ? -o.total_value : o.total_value,
        date: new Date(o.filled_at ?? o.created_at).toLocaleDateString("en-US", {
          day: "numeric", month: "short", year: "numeric",
        }),
      });
    }

    for (const d of deposits.slice(0, 5)) {
      if (d.status === "approved" || d.status === "pending") {
        items.push({
          id: d.id,
          kind: "deposit",
          description: d.status === "approved" ? "Deposit approved" : "Deposit pending",
          amount: Number(d.amount),
          date: new Date(d.submitted_at).toLocaleDateString("en-US", {
            day: "numeric", month: "short", year: "numeric",
          }),
        });
      }
    }

    // Sort by date descending and take most recent 8
    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [orders, deposits]);

  // ── Insights ──
  const largestPosition = ranked[0];
  const largestPct      = largestPosition && totalPortfolio > 0
    ? ((largestPosition.marketValue / totalPortfolio) * 100).toFixed(1)
    : "0";
  const stockPct         = totalPortfolio > 0 ? ((stockValue / totalPortfolio) * 100).toFixed(0) : "0";
  const diversification  = Math.min(10, Math.round(holdings.length * 1.5));

  const isEmpty = !loading && holdings.length === 0;

  // ── Empty state ──
  if (isEmpty) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
        <Navbar variant="auth" />
        <main className="mx-auto max-w-5xl px-6 py-20 lg:px-10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#E5E5E2] bg-white shadow-sm">
              <BarChart2 className="h-9 w-9 text-[#D1D5DB]" />
            </div>
            <h1 className="text-[26px] font-extrabold tracking-tight text-[#111827]">Your portfolio is empty</h1>
            <p className="mt-2 max-w-sm text-[14px] text-[#6B7280]">
              Start investing to build your portfolio. Browse markets or add funds to get started.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/markets"
                className="flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-3 text-[14px] font-semibold text-white hover:opacity-90">
                Explore Markets <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard/deposit"
                className="flex items-center gap-2 rounded-xl border border-[#E5E5E2] bg-white px-5 py-3 text-[14px] font-semibold text-[#111827] hover:border-[#111827]">
                Deposit Funds
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      <Navbar variant="auth" />

      <main className="mx-auto max-w-5xl px-6 py-8 lg:px-10">

        {/* ── Header ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-[#111827]">Portfolio</h1>
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

        {/* ── Summary Cards ── */}
        {loading ? (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Skeleton className="col-span-2 h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 rounded-2xl border border-[#E5E5E2] bg-[#111827] p-5 shadow-sm">
              <p className="text-[12px] font-medium uppercase tracking-wider text-white/50">Total portfolio value</p>
              <p className="mt-2 text-[28px] font-extrabold tracking-tight text-white">${fmt(totalPortfolio)}</p>
              <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${totalGain >= 0 ? "bg-[#1a6b3c]/20 text-[#4ade80]" : "bg-red-900/20 text-red-400"}`}>
                {totalGain >= 0
                  ? <TrendingUp className="h-3.5 w-3.5" />
                  : <TrendingDown className="h-3.5 w-3.5" />}
                {pct(totalReturn)} all time
              </div>
            </div>
            <MetricCard
              label="Total gain / loss"
              value={`${totalGain >= 0 ? "+" : "-"}$${fmt(Math.abs(totalGain))}`}
              sub={pct(totalReturn)}
              subColor={gainColor(totalGain)}
              icon={totalGain >= 0 ? TrendingUp : TrendingDown}
            />
            <MetricCard
              label="Available cash"
              value={`$${fmt(cashBalance)}`}
              sub="Ready to invest"
              icon={Wallet}
            />
          </div>
        )}

        {/* ── Performance Chart ── */}
        <div className="mb-6 rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="mt-4 h-52 w-full" />
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">Portfolio performance</p>
                  <p className="mt-1.5 text-[22px] font-extrabold tracking-tight text-[#111827]">
                    ${fmt(chartEnd || totalPortfolio)}
                  </p>
                  {chartData.length > 1 && (
                    <p className={`mt-0.5 flex items-center gap-1 text-[13px] font-medium ${gainColor(chartChange)}`}>
                      {chartChange >= 0
                        ? <TrendingUp className="h-3.5 w-3.5" />
                        : <TrendingDown className="h-3.5 w-3.5" />}
                      {chartChange >= 0 ? "+" : "-"}${fmt(Math.abs(chartChange))} ({pct(chartChangePct)})
                    </p>
                  )}
                </div>
                <div className="flex gap-1 rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-1">
                  {FILTERS.map((f) => (
                    <button key={f} type="button" onClick={() => setFilter(f)}
                      className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${filter === f ? "bg-white text-[#111827] shadow-sm" : "text-[#9CA3AF] hover:text-[#6B7280]"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {chartData.length < 2 ? (
                <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#E5E5E2]">
                  <BarChart2 className="h-5 w-5 text-[#D1D5DB]" />
                  <p className="text-[13px] text-[#9CA3AF]">Not enough activity for this period</p>
                </div>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#111827" stopOpacity={0.08} />
                          <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <YAxis hide domain={["auto", "auto"]} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #E5E5E2", borderRadius: 10, fontSize: 12, color: "#111827" }}
                        formatter={(v: number) => [`$${fmt(v)}`, "Value"]}
                      />
                      <Area type="monotone" dataKey="value" stroke="#111827" strokeWidth={1.75}
                        fill="url(#portfolioGrad)" dot={false} activeDot={{ r: 4, fill: "#111827" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Allocation + Insights ── */}
        {!loading && (
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* Allocation */}
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm lg:col-span-2">
              <p className="mb-4 text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">Allocation</p>
              {allocData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <PieChart width={90} height={90}>
                    <Pie data={allocData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={44} strokeWidth={0}>
                      {allocData.map((_, i) => <Cell key={i} fill={ALLOCATION_COLORS[i]} />)}
                    </Pie>
                  </PieChart>
                  <div className="flex-1 space-y-2.5">
                    {allocData.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ALLOCATION_COLORS[i] }} />
                          <span className="text-[13px] text-[#374151]">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[13px] font-semibold text-[#111827]">{item.pct.toFixed(1)}%</span>
                          <p className="text-[11px] text-[#9CA3AF]">${fmt(item.value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-[#9CA3AF]">No data yet.</p>
              )}
            </div>

            {/* Insights */}
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm lg:col-span-3">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#9CA3AF]" />
                <p className="text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">Portfolio insights</p>
              </div>
              <div className="space-y-3">
                {largestPosition ? (
                  <InsightRow
                    label="Largest position"
                    value={`${largestPosition.symbol} — ${largestPct}% of portfolio`}
                    level={Number(largestPct) > 40 ? "warning" : "ok"}
                  />
                ) : null}
                <InsightRow
                  label="Equity concentration"
                  value={`${stockPct}% in equities${Number(stockPct) > 80 ? " — consider broadening with ETFs or cash" : " — good mix"}`}
                  level={Number(stockPct) > 80 ? "warning" : "ok"}
                />
                <InsightRow
                  label="Diversification score"
                  value={`${diversification}/10 — ${diversification >= 7 ? "well diversified" : "consider adding more positions"}`}
                  level={diversification >= 7 ? "ok" : "info"}
                />
                <InsightRow
                  label="Active positions"
                  value={`${holdings.length} holding${holdings.length !== 1 ? "s" : ""} across ${[...new Set(holdings.map((h) => h.type))].length} asset class${[...new Set(holdings.map((h) => h.type))].length !== 1 ? "es" : ""}`}
                  level="info"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Holdings Table ── */}
        {!loading && ranked.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F3F4F6] px-6 py-4">
              <p className="text-[15px] font-semibold text-[#111827]">Holdings</p>
              <span className="text-[12px] text-[#9CA3AF]">{ranked.length} position{ranked.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    {["Asset", "Qty", "Avg Cost", "Price", "Market Value", "Gain / Loss", "Return"].map((col) => (
                      <th key={col} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">{col}</th>
                    ))}
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((h) => (
                    <tr key={h.symbol}
                      onMouseEnter={() => setHoveredHolding(h.symbol)}
                      onMouseLeave={() => setHoveredHolding(null)}
                      onClick={() => router.push(`/trade/${h.symbol}?name=${encodeURIComponent(h.name)}&type=${h.type}&price=${h.currentPrice}`)}
                      className={`cursor-pointer border-b border-[#F3F4F6] transition-colors last:border-0 ${hoveredHolding === h.symbol ? "bg-[#F7F7F5]" : ""}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[11px] font-bold text-[#374151]">
                            {h.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-[#111827]">{h.name}</p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-medium text-[#9CA3AF]">{h.symbol}</span>
                              <span className={`rounded px-1 py-0.5 text-[10px] font-medium ${h.type === "etf" ? "bg-indigo-50 text-indigo-600" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
                                {h.type.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-[#374151]">{Number(h.quantity).toFixed(h.quantity % 1 === 0 ? 0 : 4)}</td>
                      <td className="px-5 py-4 text-[13px] text-[#374151]">${fmt(h.avgCost)}</td>
                      <td className="px-5 py-4 text-[13px] font-medium text-[#111827]">${fmt(h.currentPrice)}</td>
                      <td className="px-5 py-4 text-[13px] font-semibold text-[#111827]">${fmt(h.marketValue)}</td>
                      <td className={`px-5 py-4 text-[13px] font-medium ${gainColor(h.gain)}`}>
                        {h.gain >= 0 ? "+" : "-"}${fmt(Math.abs(h.gain))}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium ${gainBg(h.returnPct)} ${gainColor(h.returnPct)}`}>
                          {pct(h.returnPct)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <ChevronRight className="h-4 w-4 text-[#D1D5DB]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-[#F3F4F6] md:hidden">
              {ranked.map((h) => (
                <div key={h.symbol}
                  onClick={() => router.push(`/trade/${h.symbol}?name=${encodeURIComponent(h.name)}&type=${h.type}&price=${h.currentPrice}`)}
                  className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 active:bg-[#F7F7F5]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F4F6] text-[11px] font-bold text-[#374151]">
                      {h.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#111827]">{h.symbol}</p>
                      <p className="text-[11px] text-[#9CA3AF]">{h.quantity} shares · ${fmt(h.currentPrice)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-[#111827]">${fmt(h.marketValue)}</p>
                    <p className={`text-[12px] font-medium ${gainColor(h.returnPct)}`}>{pct(h.returnPct)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Top & Worst Performers ── */}
        {!loading && ranked.length > 1 && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PerformersCard title="Top performers"  items={ranked.slice(0, 3)}                     positive />
            <PerformersCard title="Largest losses"  items={[...ranked].reverse().slice(0, 3)}      positive={false} />
          </div>
        )}

        {/* ── Recent Activity ── */}
        <div className="overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F3F4F6] px-6 py-4">
            <p className="text-[15px] font-semibold text-[#111827]">Recent activity</p>
            <Link href="/wallet" className="flex items-center gap-1 text-[12.5px] font-medium text-[#6B7280] hover:text-[#111827]">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : activity.length === 0 ? (
            <div className="flex h-28 items-center justify-center">
              <p className="text-[13px] text-[#9CA3AF]">No activity yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {activity.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <ActivityIcon kind={item.kind} />
                    <div>
                      <p className="text-[13px] font-medium text-[#111827]">{item.description}</p>
                      <p className="text-[11px] text-[#9CA3AF]">{item.date}</p>
                    </div>
                  </div>
                  <p className={`text-[13px] font-semibold ${item.amount >= 0 ? "text-[#1a6b3c]" : "text-[#111827]"}`}>
                    {item.amount >= 0 ? "+" : "-"}${fmt(Math.abs(item.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}