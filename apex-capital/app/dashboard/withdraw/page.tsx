"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Wallet, ArrowUp, Clock, Check, X, AlertCircle, Loader2,
  RefreshCw, ShieldCheck, ArrowLeft,
} from "lucide-react";
import Navbar from "../../../components/Navbar";
import { createClient } from "../../../lib/supabase/client";

type WithdrawalStatus = "pending" | "approved" | "rejected";

type Withdrawal = {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

const MIN_WITHDRAWAL = 10;
const SLIDER_MAX = 10000;
const QUICK_AMOUNTS = [100, 500, 1000, 5000];
const POLL_INTERVAL_MS = 30000;

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: WithdrawalStatus }) {
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
      <Clock className="h-3 w-3" /> Pending review
    </span>
  );
}

export default function WithdrawPage() {
  const supabase = createClient();
  const [cashBalance, setCashBalance] = useState<number | null>(null);

  const [amount, setAmount] = useState<number>(100);
  const [amountInput, setAmountInput] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("cash_balance").eq("id", user.id).single();
      if (data) setCashBalance(Number(data.cash_balance ?? 0));
    }
    loadProfile();
  }, []);

  async function fetchWithdrawals(opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoadingWithdrawals(true);
    try {
      const res = await fetch("/api/withdrawals");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setWithdrawals(data.withdrawals ?? []);
    } catch {
      // keep last known state on failed poll
    } finally {
      setLoadingWithdrawals(false);
    }
  }

  useEffect(() => { fetchWithdrawals(); }, []);

  useEffect(() => {
    const hasPending = withdrawals.some((w) => w.status === "pending");
    if (pollRef.current) clearInterval(pollRef.current);
    if (hasPending) {
      pollRef.current = setInterval(async () => {
        await fetchWithdrawals({ silent: true });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from("profiles").select("cash_balance").eq("id", user.id).single();
          if (data) setCashBalance(Number(data.cash_balance ?? 0));
        }
      }, POLL_INTERVAL_MS);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withdrawals.length, withdrawals.map((w) => w.status).join(",")]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchWithdrawals({ silent: true });
    setRefreshing(false);
  }

  function syncAmount(value: number) {
    const clamped = Math.max(0, Math.min(value, cashBalance ?? 1_000_000));
    setAmount(clamped);
    setAmountInput(String(clamped));
  }

  function handleSliderChange(value: number) {
    setAmount(value);
    setAmountInput(String(value));
  }

  function handleInputChange(raw: string) {
    setAmountInput(raw);
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) setAmount(parsed);
  }

  const pendingTotal = useMemo(
    () => withdrawals.filter((w) => w.status === "pending").reduce((sum, w) => sum + Number(w.amount), 0),
    [withdrawals]
  );

  async function handleSubmit() {
    setFormError(null);
    setSuccessMsg(null);

    const value = Number(amountInput);
    if (!value || Number.isNaN(value) || value < MIN_WITHDRAWAL) {
      setFormError(`Enter an amount of at least $${MIN_WITHDRAWAL}.`);
      return;
    }
    if (cashBalance !== null && value > cashBalance) {
      setFormError("Amount exceeds your available cash balance.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit withdrawal");

      setWithdrawals((prev) => [data.withdrawal, ...prev]);
      setSuccessMsg(`Withdrawal request for $${formatCurrency(value)} submitted — pending review.`);
      syncAmount(100);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const sliderMax = Math.min(SLIDER_MAX, cashBalance ?? SLIDER_MAX);
  const sliderPercent = Math.min(100, (Math.min(amount, sliderMax) / sliderMax) * 100);

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      <Navbar variant="auth" />

      <main className="mx-auto max-w-3xl px-6 py-8 lg:px-10">
        <Link href="/dashboard" className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B7280] hover:text-[#111827]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111827]">
            <ArrowUp className="h-4 w-4 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-[#111827]">Withdraw funds</h1>
            <p className="text-[13px] text-[#6B7280]">Request a withdrawal from your cash balance.</p>
          </div>
        </div>

        {cashBalance !== null && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-[#E5E5E2] bg-white px-5 py-3.5">
            <p className="flex items-center gap-2 text-[13px] text-[#6B7280]">
              <Wallet className="h-3.5 w-3.5 text-[#9CA3AF]" /> Available to withdraw
            </p>
            <p className="text-[14px] font-semibold text-[#111827]">${formatCurrency(cashBalance)}</p>
          </div>
        )}

        {/* Amount selection */}
        <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
          <p className="text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">Amount to withdraw</p>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-[28px] font-bold text-[#9CA3AF]">$</span>
            <input
              type="number"
              min={0}
              value={amountInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={() => syncAmount(Number(amountInput) || 0)}
              className="w-full border-none bg-transparent text-[34px] font-extrabold tracking-tight text-[#111827] outline-none"
              placeholder="0.00"
            />
          </div>

          <input
            type="range"
            min={MIN_WITHDRAWAL}
            max={sliderMax}
            step={10}
            value={Math.min(amount, sliderMax)}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="mt-5 h-1.5 w-full cursor-pointer appearance-none rounded-full"
            style={{ background: `linear-gradient(to right, #111827 ${sliderPercent}%, #F3F4F6 ${sliderPercent}%)` }}
          />
          <div className="mt-1.5 flex justify-between text-[11px] text-[#9CA3AF]">
            <span>${MIN_WITHDRAWAL}</span>
            <span>${sliderMax.toLocaleString()}</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.filter((qa) => cashBalance === null || qa <= cashBalance).map((qa) => (
              <button
                key={qa}
                type="button"
                onClick={() => syncAmount(qa)}
                className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  amount === qa
                    ? "border-[#111827] bg-[#111827] text-white"
                    : "border-[#E5E5E2] text-[#6B7280] hover:border-[#111827] hover:text-[#111827]"
                }`}
              >
                ${qa.toLocaleString()}
              </button>
            ))}
            {cashBalance !== null && cashBalance >= MIN_WITHDRAWAL && (
              <button
                type="button"
                onClick={() => syncAmount(cashBalance)}
                className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  amount === cashBalance
                    ? "border-[#111827] bg-[#111827] text-white"
                    : "border-[#E5E5E2] text-[#6B7280] hover:border-[#111827] hover:text-[#111827]"
                }`}
              >
                Max
              </button>
            )}
          </div>

          {formError && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
            </div>
          )}
          {successMsg && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-[#F0F7F2] px-3.5 py-2.5 text-[13px] text-[#1a6b3c]">
              <Check className="h-4 w-4 shrink-0" /> {successMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#111827] py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            Submit withdrawal request
          </button>
          <p className="mt-2.5 text-center text-[12px] text-[#9CA3AF]">
            All withdrawal requests undergo review before account balances are updated.
          </p>
        </div>

        {/* Withdrawal tracker */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-[#111827]">Withdrawal history</h2>
              {pendingTotal > 0 && (
                <p className="mt-0.5 text-[12.5px] text-amber-700">${formatCurrency(pendingTotal)} awaiting approval</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5E2] bg-white text-[#6B7280] hover:text-[#111827] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white shadow-sm">
            {loadingWithdrawals ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" />
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
                <Wallet className="h-5 w-5 text-[#D1D5DB]" />
                <p className="text-[13px] text-[#9CA3AF]">No withdrawals yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="text-[14px] font-semibold text-[#111827]">${formatCurrency(Number(w.amount))}</p>
                      <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                        Submitted {new Date(w.submitted_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      {w.status === "rejected" && w.rejection_reason && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-red-600">
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {w.rejection_reason}
                        </p>
                      )}
                      {w.status === "approved" && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#1a6b3c]">
                          <ShieldCheck className="h-3 w-3" /> Debited from cash balance
                        </p>
                      )}
                    </div>
                    <StatusBadge status={w.status} />
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