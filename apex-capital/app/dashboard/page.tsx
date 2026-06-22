"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert, Clock, ArrowUpRight, ArrowDownRight, Plus, Minus,
  ArrowDown, ArrowUp, Wallet, TrendingUp, TrendingDown, ChevronRight, X, Loader2,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import { createClient } from "../../lib/supabase/client";

type KycStatus = "unverified" | "pending" | "verified" | "rejected";

/* ------------------------------------------------------------------ */
/*  Mock data — replace with real API calls when tables are ready      */
/* ------------------------------------------------------------------ */

type Holding = { symbol: string; name: string; shares: number; avgCost: number; price: number; changePercent: number };

const holdings: Holding[] = [
  { symbol: "AAPL", name: "Apple Inc.", shares: 12, avgCost: 178.2, price: 196.45, changePercent: 1.34 },
  { symbol: "MSFT", name: "Microsoft Corp.", shares: 5, avgCost: 392.1, price: 421.08, changePercent: 0.62 },
  { symbol: "NVDA", name: "NVIDIA Corp.", shares: 8, avgCost: 101.4, price: 124.86, changePercent: -2.18 },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", shares: 6, avgCost: 478.3, price: 512.77, changePercent: 0.41 },
  { symbol: "AMZN", name: "Amazon.com Inc.", shares: 10, avgCost: 168.5, price: 186.92, changePercent: 0.88 },
];

const activity = [
  { id: 1, type: "buy", label: "Bought AAPL", detail: "2 shares", amount: -392.9, date: "Jun 18" },
  { id: 2, type: "deposit", label: "Deposit", detail: "Bank transfer", amount: 1000, date: "Jun 16" },
  { id: 3, type: "sell", label: "Sold TSLA", detail: "3 shares", amount: 742.5, date: "Jun 12" },
  { id: 4, type: "dividend", label: "Dividend", detail: "VOO", amount: 14.62, date: "Jun 9" },
];

const growthSeries = [
  24100, 24350, 24200, 24600, 24580, 24910, 25040, 24890, 25210, 25430,
  25380, 25600, 25750, 25690, 26010, 26240, 26180, 26430, 26390, 26710,
  26850, 26790, 27040, 27260, 27190, 27430, 27610, 27580, 27840, 28012,
];

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

function GrowthChart({ data }: { data: number[] }) {
  const width = 600;
  const height = 160;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => [(i / (data.length - 1)) * width, height - ((v - min) / range) * height]);
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

function QuickAction({ href, icon: Icon, label, variant = "default" }: { href: string; icon: typeof Plus; label: string; variant?: "default" | "primary" }) {
  return (
    <Link href={href} className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border px-4 py-4 transition-colors ${
      variant === "primary" ? "border-[#111827] bg-[#111827] text-white hover:opacity-90" : "border-[#E5E5E2] bg-white text-[#111827] hover:bg-[#F7F7F5]"
    }`}>
      <Icon className={`h-5 w-5 ${variant === "primary" ? "text-white" : "text-[#111827]"}`} strokeWidth={1.75} />
      <span className="text-[13px] font-medium">{label}</span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const supabase = createClient();
  const [kycStatus, setKycStatus] = useState<KycStatus>("unverified");
  const [userInitials, setUserInitials] = useState("JD");
  const [loading, setLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("kyc_status, full_name")
        .eq("id", user.id)
        .single();

      if (data) {
        setKycStatus(data.kyc_status as KycStatus);
        if (data.full_name) {
          setUserInitials(
            data.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
          );
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const totals = useMemo(() => {
    const marketValue = holdings.reduce((sum, h) => sum + h.shares * h.price, 0);
    const costBasis = holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);
    const cashBalance = 1842.31;
    const dayChangeValue = holdings.reduce((sum, h) => sum + h.shares * h.price * (h.changePercent / 100), 0);
    const dayChangePercent = marketValue > 0 ? (dayChangeValue / (marketValue - dayChangeValue)) * 100 : 0;
    const totalGainValue = marketValue - costBasis;
    const totalGainPercent = costBasis > 0 ? (totalGainValue / costBasis) * 100 : 0;
    return { portfolioValue: marketValue + cashBalance, marketValue, cashBalance, dayChangeValue, dayChangePercent, totalGainValue, totalGainPercent };
  }, []);

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
        {/* KYC banner */}
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
                  {kycStatus === "pending" ? "Your verification is under review" : "Verify your identity to unlock deposits and trading"}
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
                <Link href="/kyc-flow" className="rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90">
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

        {/* Portfolio summary + chart */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">Total portfolio value</p>
                <p className="mt-1.5 text-[34px] font-extrabold tracking-tight text-[#111827]">
                  ${totals.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className={`mt-2 inline-flex items-center gap-1 text-[13px] font-medium ${totals.dayChangeValue >= 0 ? "text-[#1a6b3c]" : "text-red-600"}`}>
                  {totals.dayChangeValue >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  ${Math.abs(totals.dayChangeValue).toFixed(2)} ({totals.dayChangePercent >= 0 ? "+" : ""}{totals.dayChangePercent.toFixed(2)}%) today
                </div>
              </div>
              <div className="flex gap-1 rounded-lg bg-[#F3F4F6] p-1 text-[12px] font-medium text-[#6B7280]">
                {["1W", "1M", "3M", "1Y", "All"].map((range) => (
                  <button key={range} type="button"
                    className={`rounded-md px-2.5 py-1 transition-colors ${range === "1M" ? "bg-white text-[#111827] shadow-sm" : "hover:text-[#111827]"}`}>
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6"><GrowthChart data={growthSeries} /></div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
              <p className="text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">Available cash</p>
              <p className="mt-1.5 text-[24px] font-bold text-[#111827]">
                ${totals.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-[12.5px] text-[#9CA3AF]">Ready to invest</p>
            </div>
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
              <p className="text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">Total gain / loss</p>
              <p className={`mt-1.5 text-[24px] font-bold ${totals.totalGainValue >= 0 ? "text-[#1a6b3c]" : "text-red-600"}`}>
                {totals.totalGainValue >= 0 ? "+" : "-"}${Math.abs(totals.totalGainValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className={`mt-1 text-[12.5px] font-medium ${totals.totalGainPercent >= 0 ? "text-[#1a6b3c]" : "text-red-600"}`}>
                {totals.totalGainPercent >= 0 ? "+" : ""}{totals.totalGainPercent.toFixed(2)}% all time
              </p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-5 flex flex-wrap gap-3">
          <QuickAction href="/markets" icon={Plus} label="Buy" variant="primary" />
          <QuickAction href="/portfolio" icon={Minus} label="Sell" />
          <QuickAction href="/wallet?action=deposit" icon={ArrowDown} label="Deposit" />
          <QuickAction href="/wallet?action=withdraw" icon={ArrowUp} label="Withdraw" />
        </div>

        {/* Holdings + activity */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#111827]">Your holdings</h2>
              <Link href="/portfolio" className="flex items-center gap-1 text-[13px] font-medium text-[#6B7280] hover:text-[#111827]">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-4 divide-y divide-[#F3F4F6]">
              {holdings.map((h) => {
                const value = h.shares * h.price;
                const up = h.changePercent >= 0;
                return (
                  <Link key={h.symbol} href={`/markets/${h.symbol.toLowerCase()}`}
                    className="flex items-center justify-between py-3.5 transition-colors hover:bg-[#F7F7F5] -mx-2 px-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[11px] font-bold text-[#111827]">
                        {h.symbol}
                      </span>
                      <div>
                        <p className="text-[14px] font-semibold text-[#111827]">{h.symbol}</p>
                        <p className="text-[12px] text-[#9CA3AF]">{h.shares} shares</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-bold text-[#111827]">
                        ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className={`flex items-center justify-end gap-0.5 text-[12px] font-medium ${up ? "text-[#1a6b3c]" : "text-red-500"}`}>
                        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {up ? "+" : ""}{h.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#111827]">Recent activity</h2>
              <Link href="/wallet" className="flex items-center gap-1 text-[13px] font-medium text-[#6B7280] hover:text-[#111827]">
                <Wallet className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-4 divide-y divide-[#F3F4F6]">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-[13.5px] font-medium text-[#111827]">{a.label}</p>
                    <p className="text-[12px] text-[#9CA3AF]">{a.detail} · {a.date}</p>
                  </div>
                  <p className={`text-[13.5px] font-semibold ${a.amount >= 0 ? "text-[#1a6b3c]" : "text-[#111827]"}`}>
                    {a.amount >= 0 ? "+" : "-"}${Math.abs(a.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}