// app/wallet/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine, ArrowUpFromLine, Check, Clock, X,
  Loader2, AlertCircle, ShieldCheck, Wallet as WalletIcon,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import { createClient } from "../../lib/supabase/client";

type KycStatus = "unverified" | "pending" | "verified" | "rejected";
type RequestStatus = "pending" | "approved" | "rejected";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  kyc_status: KycStatus;
  cash_balance: number;
};

type Deposit = {
  id: string;
  amount: number;
  status: RequestStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type Withdrawal = {
  id: string;
  amount: number;
  status: RequestStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type WalletItem = {
  id: string;
  kind: "deposit" | "withdrawal";
  amount: number;
  status: RequestStatus;
  rejection_reason: string | null;
  submitted_at: string;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "deposit", label: "Deposits" },
  { key: "withdrawal", label: "Withdrawals" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

// ─── Helpers ───────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Building blocks ───────────────────────────────────────────────

function StatCard({
  label,
  value,
  sublabel,
  sublabelColor,
  children,
}: {
  label: string;
  value: string;
  sublabel?: string;
  sublabelColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E5E2] bg-white p-4 shadow-sm sm:p-5 min-w-0 overflow-hidden">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] truncate">
        {label}
      </p>
      {/* Fluid font: shrinks through breakpoints so 9-digit values never overflow */}
      <p
        className="mt-2 font-extrabold tracking-tight text-[#111827] leading-none break-all
                   text-[18px] xs:text-[20px] sm:text-[22px] md:text-[20px] lg:text-[22px] xl:text-[24px]"
      >
        {value}
      </p>
      {sublabel && (
        <p className={`mt-1.5 text-[12px] font-medium leading-snug ${sublabelColor ?? "text-[#9CA3AF]"}`}>
          {sublabel}
        </p>
      )}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F7F2] px-2.5 py-1 text-[12px] font-medium text-[#1a6b3c]">
        <Check className="h-3 w-3" /> Approved
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-medium text-red-600">
        <X className="h-3 w-3" /> Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-700">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

function WalletItemRow({ item }: { item: WalletItem }) {
  const isDeposit = item.kind === "deposit";
  const Icon = isDeposit ? ArrowDownToLine : ArrowUpFromLine;

  return (
    <div className="flex items-start justify-between gap-3 py-3.5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isDeposit ? "bg-[#F0F7F2]" : "bg-amber-50"
          }`}
        >
          <Icon className={`h-4 w-4 ${isDeposit ? "text-[#1a6b3c]" : "text-amber-600"}`} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium text-[#111827]">
            {isDeposit ? "Deposit" : "Withdrawal"}
          </p>
          <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{formatDate(item.submitted_at)}</p>
          {item.status === "rejected" && item.rejection_reason && (
            <p className="mt-1 flex items-start gap-1 text-[11.5px] text-red-600">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {item.rejection_reason}
            </p>
          )}
          {item.status === "approved" && (
            <p className="mt-1 flex items-center gap-1 text-[11.5px] text-[#1a6b3c]">
              <ShieldCheck className="h-3 w-3" /> {isDeposit ? "Added to" : "Debited from"} cash balance
            </p>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {/* Amount in history rows: also clamp for large values */}
        <p className={`font-semibold tabular-nums ${isDeposit ? "text-[#1a6b3c]" : "text-[#111827]"}
                       text-[13px] sm:text-[13.5px]`}>
          {isDeposit ? "+" : "-"}${formatCurrency(item.amount)}
        </p>
        <div className="mt-1 flex justify-end">
          <StatusBadge status={item.status} />
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export default function WalletPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, depositsRes, withdrawalsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, kyc_status, cash_balance")
          .eq("id", user.id)
          .single(),
        fetch("/api/deposits").then((r) => (r.ok ? r.json() : { deposits: [] })),
        fetch("/api/withdrawals").then((r) => (r.ok ? r.json() : { withdrawals: [] })),
      ]);

      if (profileRes.data) {
        setProfile({
          ...profileRes.data,
          kyc_status: profileRes.data.kyc_status as KycStatus,
          cash_balance: Number(profileRes.data.cash_balance ?? 0),
        });
      }
      setDeposits((depositsRes.deposits ?? []).map((d: Deposit) => ({ ...d, amount: Number(d.amount) })));
      setWithdrawals((withdrawalsRes.withdrawals ?? []).map((w: Withdrawal) => ({ ...w, amount: Number(w.amount) })));

      setLoading(false);
    }
    load();
  }, []);

  const allItems: WalletItem[] = useMemo(() => {
    const depositItems: WalletItem[] = deposits.map((d) => ({
      id: d.id, kind: "deposit", amount: d.amount, status: d.status,
      rejection_reason: d.rejection_reason, submitted_at: d.submitted_at,
    }));
    const withdrawalItems: WalletItem[] = withdrawals.map((w) => ({
      id: w.id, kind: "withdrawal", amount: w.amount, status: w.status,
      rejection_reason: w.rejection_reason, submitted_at: w.submitted_at,
    }));
    return [...depositItems, ...withdrawalItems].sort(
      (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );
  }, [deposits, withdrawals]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return allItems;
    return allItems.filter((i) => i.kind === activeFilter);
  }, [allItems, activeFilter]);

  const stats = useMemo(() => {
    const pendingDeposits = deposits.filter((d) => d.status === "pending");
    const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending");
    const approvedDeposits = deposits.filter((d) => d.status === "approved");
    const approvedWithdrawals = withdrawals.filter((w) => w.status === "approved");

    return {
      pendingAmount:
        pendingDeposits.reduce((s, d) => s + d.amount, 0) +
        pendingWithdrawals.reduce((s, w) => s + w.amount, 0),
      pendingCount: pendingDeposits.length + pendingWithdrawals.length,
      totalDeposited: approvedDeposits.reduce((s, d) => s + d.amount, 0),
      totalWithdrawn: approvedWithdrawals.reduce((s, w) => s + w.amount, 0),
    };
  }, [deposits, withdrawals]);

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

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7F7F5] font-sans text-[#111827]">
      <Navbar
        variant="auth"
        kycStatus={profile?.kyc_status ?? "unverified"}
        userInitials={initials(profile?.full_name ?? null)}
        avatarUrl={profile?.avatar_url ?? null}
      />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ── Page header ── */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111827]">
            <WalletIcon className="h-5 w-5 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight text-[#111827] sm:text-[26px]">
              Wallet
            </h1>
            <p className="text-[13px] text-[#6B7280] sm:text-[13.5px]">
              Manage your cash balance and request history.
            </p>
          </div>
        </div>

        {/* ── Balance overview ──
              Mobile:  2-col grid (2×2)
              Desktop: 4-col grid (1×4)
              Each card has overflow-hidden + break-all so 9-digit values wrap
              rather than stretching the grid column.
        ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

          {/* Available cash — spans full width on mobile so the CTA buttons fit */}
          <div className="col-span-2 lg:col-span-1">
            <StatCard
              label="Available cash"
              value={`$${formatCurrency(profile?.cash_balance ?? 0)}`}
              sublabel="Ready to invest"
            >
            </StatCard>
          </div>

          <StatCard
            label="Pending"
            value={`$${formatCurrency(stats.pendingAmount)}`}
            sublabel={
              stats.pendingCount > 0
                ? `${stats.pendingCount} request${stats.pendingCount === 1 ? "" : "s"} awaiting review`
                : "Nothing in review"
            }
            sublabelColor={stats.pendingCount > 0 ? "text-amber-600" : "text-[#9CA3AF]"}
          />

          <StatCard
            label="Total deposited"
            value={`$${formatCurrency(stats.totalDeposited)}`}
            sublabel="Approved, all time"
          />

          <StatCard
            label="Total withdrawn"
            value={`$${formatCurrency(stats.totalWithdrawn)}`}
            sublabel="Approved, all time"
          />
        </div>

        {/* ── Request history ── */}
        <div className="mt-4 rounded-2xl border border-[#E5E5E2] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#F3F4F6] px-4 py-4 sm:px-6">
            <h2 className="text-[15px] font-semibold text-[#111827]">Request history</h2>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActiveFilter(f.key)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                    activeFilter === f.key
                      ? "bg-[#111827] text-white"
                      : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E5E2]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 sm:px-6">
            {filteredItems.length === 0 ? (
              <p className="py-10 text-center text-[12.5px] text-[#9CA3AF]">
                No {activeFilter === "all" ? "requests" : activeFilter + "s"} yet.
              </p>
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {filteredItems.map((item) => (
                  <WalletItemRow key={`${item.kind}-${item.id}`} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}