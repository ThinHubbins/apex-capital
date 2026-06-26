// app/dashboard/withdraw/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Wallet, ArrowUp, Clock, Check, X, AlertCircle, Loader2,
  RefreshCw, ShieldCheck, ArrowLeft, Bitcoin, Landmark, CheckCircle2,
} from "lucide-react";
import Navbar from "../../../components/Navbar";
import { createClient } from "../../../lib/supabase/client";

type WithdrawalStatus = "pending" | "approved" | "rejected";
type WithdrawalMethod = "crypto" | "bank";

type Withdrawal = {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  method?: WithdrawalMethod;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type CryptoNetworkOption = {
  asset: string;
  network: string;
};

const MIN_WITHDRAWAL = 10;
const MAX_WITHDRAWAL = 50000;
const SLIDER_MAX = 10000;
const QUICK_AMOUNTS = [100, 500, 1000, 5000];
const POLL_INTERVAL_MS = 30000;

// Networks the user can choose to receive funds on. Unlike deposits, there's no
// fixed address here — the user supplies their own wallet address per request.
const CRYPTO_NETWORK_OPTIONS: CryptoNetworkOption[] = [
  { asset: "BTC", network: "BTC NETWORK" },
  { asset: "USDT", network: "ERC20" },
  { asset: "ETH", network: "ETH" },
  { asset: "SOL", network: "SOLANA" },
  { asset: "USDC", network: "ERC20" },
];

function networkKey(c: CryptoNetworkOption) {
  return `${c.asset}-${c.network}`;
}

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

// ─── Submitted Modal ───────────────────────────────────────────────────────────

function WithdrawalSubmittedModal({
  amount,
  method,
  onClose,
}: {
  amount: number;
  method: WithdrawalMethod;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white shadow-2xl">
        <div className="h-1.5 w-full bg-[#111827]" />

        <div className="px-7 pb-7 pt-6">
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F7F2]">
              {method === "crypto" ? (
                <Bitcoin className="h-7 w-7 text-[#1a6b3c]" />
              ) : (
                <Landmark className="h-7 w-7 text-[#1a6b3c]" />
              )}
            </div>
            <h2 className="text-[20px] font-extrabold tracking-tight text-[#111827]">
              Withdrawal requested
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#6B7280]">
              <span className="font-semibold text-[#111827]">${formatCurrency(amount)}</span>{" "}
              has been deducted from your available cash and is pending review.
            </p>
          </div>

          <div className="mb-6 space-y-3 rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              What happens next
            </p>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[10px] font-bold text-white">
                1
              </div>
              <p className="text-[13px] text-[#374151]">
                Our team reviews your request and verifies the {method === "crypto" ? "wallet address" : "bank details"} you provided.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[10px] font-bold text-white">
                2
              </div>
              <p className="text-[13px] text-[#374151]">
                We send your funds via {method === "crypto" ? "the network you selected" : "bank transfer"}.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[10px] font-bold text-white">
                3
              </div>
              <p className="text-[13px] text-[#374151]">
                You'll be notified here once it's marked as approved.
              </p>
            </div>
          </div>

          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[12.5px] leading-relaxed text-amber-800">
              <span className="font-semibold">Please be patient</span> — withdrawals are reviewed manually and may take some time. If rejected, the funds are returned to your available cash automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111827] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Check className="h-4 w-4" /> Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Method Toggle ────────────────────────────────────────────────────────────

function MethodToggle({
  method,
  onChange,
}: {
  method: WithdrawalMethod;
  onChange: (m: WithdrawalMethod) => void;
}) {
  const options: { key: WithdrawalMethod; icon: React.ElementType; label: string; description: string }[] = [
    { key: "crypto", icon: Bitcoin, label: "Crypto", description: "BTC, ETH, USDT, USDC, SOL" },
    { key: "bank", icon: Landmark, label: "Bank transfer", description: "Withdraw to your bank account" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map(({ key, icon: Icon, label, description }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
            method === key
              ? "border-[#111827] bg-[#111827] text-white"
              : "border-[#E5E5E2] bg-white text-[#6B7280] hover:border-[#111827] hover:text-[#111827]"
          }`}
        >
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${method === key ? "text-white" : ""}`} />
          <div>
            <p className={`text-[13px] font-semibold ${method === key ? "text-white" : "text-[#111827]"}`}>{label}</p>
            <p className={`mt-0.5 text-[12px] ${method === key ? "text-white/60" : "text-[#9CA3AF]"}`}>{description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Crypto Network Picker ─────────────────────────────────────────────────────

function CryptoNetworkPicker({
  selected,
  onSelect,
}: {
  selected: CryptoNetworkOption | null;
  onSelect: (c: CryptoNetworkOption) => void;
}) {
  return (
    <div className="space-y-2.5">
      {CRYPTO_NETWORK_OPTIONS.map((c) => {
        const isSelected = selected ? networkKey(selected) === networkKey(c) : false;
        return (
          <div
            key={networkKey(c)}
            onClick={() => onSelect(c)}
            className={`cursor-pointer rounded-xl border px-4 py-3.5 transition-colors ${
              isSelected ? "border-[#111827] bg-[#F7F7F5]" : "border-[#E5E5E2] bg-white hover:border-[#9CA3AF]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13.5px] font-semibold text-[#111827]">
                {c.asset}{" "}
                <span className="font-normal text-[#9CA3AF]">({c.network})</span>
              </p>
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? "border-[#111827] bg-[#111827]" : "border-[#D1D5DB]"
                }`}
              >
                {isSelected && <CheckCircle2 className="h-5 w-5 text-[#111827]" fill="white" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WithdrawPage() {
  const supabase = createClient();
  const [cashBalance, setCashBalance] = useState<number | null>(null);

  const [method, setMethod] = useState<WithdrawalMethod>("bank");

  const [amount, setAmount] = useState<number>(100);
  const [amountInput, setAmountInput] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Crypto-specific state
  const [selectedNetwork, setSelectedNetwork] = useState<CryptoNetworkOption | null>(null);
  const [cryptoUserAddress, setCryptoUserAddress] = useState("");

  // Bank-specific state
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankBranchOrSwift, setBankBranchOrSwift] = useState("");

  // Modal state
  const [modalState, setModalState] = useState<{ amount: number; method: WithdrawalMethod } | null>(null);

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadCashBalance() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("cash_balance").eq("id", user.id).single();
    if (data) setCashBalance(Number(data.cash_balance ?? 0));
  }

  useEffect(() => { loadCashBalance(); }, []);

  async function fetchWithdrawals(opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoadingWithdrawals(true);
    try {
      const res = await fetch("/api/withdrawals");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setWithdrawals(data.withdrawals ?? []);
    } catch {
      // keep last known state on a failed poll
    } finally {
      setLoadingWithdrawals(false);
    }
  }

  useEffect(() => { fetchWithdrawals(); }, []);

  // Poll while any withdrawal is pending — balance can change on approval/rejection
  useEffect(() => {
    const hasPending = withdrawals.some((w) => w.status === "pending");
    if (pollRef.current) clearInterval(pollRef.current);
    if (hasPending) {
      pollRef.current = setInterval(async () => {
        await fetchWithdrawals({ silent: true });
        await loadCashBalance();
      }, POLL_INTERVAL_MS);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withdrawals.length, withdrawals.map((w) => w.status).join(",")]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchWithdrawals({ silent: true }), loadCashBalance()]);
    setRefreshing(false);
  }

  function syncAmount(value: number) {
    const clamped = Math.max(0, Math.min(value, MAX_WITHDRAWAL));
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

  function resetForm() {
    syncAmount(100);
    setSelectedNetwork(null);
    setCryptoUserAddress("");
    setBankName("");
    setAccountNumber("");
    setAccountHolderName("");
    setBankBranchOrSwift("");
  }

  async function handleSubmit() {
    setFormError(null);

    const value = Number(amountInput);
    if (!value || Number.isNaN(value) || value < MIN_WITHDRAWAL || value > MAX_WITHDRAWAL) {
      setFormError(`Enter an amount between $${MIN_WITHDRAWAL} and $${MAX_WITHDRAWAL.toLocaleString()}.`);
      return;
    }

    if (cashBalance !== null && value > cashBalance) {
      setFormError("Insufficient cash balance.");
      return;
    }

    if (method === "crypto") {
      if (!selectedNetwork) {
        setFormError("Select a crypto asset and network.");
        return;
      }
      if (!cryptoUserAddress.trim()) {
        setFormError("Enter the wallet address you want to receive funds at.");
        return;
      }
    } else {
      if (!bankName.trim() || !accountNumber.trim() || !accountHolderName.trim() || !bankBranchOrSwift.trim()) {
        setFormError("Fill in bank name, account number, account holder name, and branch/SWIFT.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { amount: value, method };
      if (method === "crypto" && selectedNetwork) {
        payload.cryptoAsset = selectedNetwork.asset;
        payload.cryptoNetwork = selectedNetwork.network;
        payload.cryptoUserAddress = cryptoUserAddress.trim();
      } else {
        payload.bankName = bankName.trim();
        payload.accountNumber = accountNumber.trim();
        payload.accountHolderName = accountHolderName.trim();
        payload.bankBranchOrSwift = bankBranchOrSwift.trim();
      }

      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit withdrawal");

      setWithdrawals((prev) => [data.withdrawal, ...prev]);
      setCashBalance((prev) => (prev !== null ? prev - value : prev));

      setModalState({ amount: value, method });
      resetForm();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const sliderPercent = Math.min(100, (Math.min(amount, SLIDER_MAX) / SLIDER_MAX) * 100);

  return (
    <>
      {modalState !== null && (
        <WithdrawalSubmittedModal
          amount={modalState.amount}
          method={modalState.method}
          onClose={() => setModalState(null)}
        />
      )}

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
              <p className="text-[13px] text-[#6B7280]">Move money out of your available cash balance.</p>
            </div>
          </div>

          {cashBalance !== null && (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-[#E5E5E2] bg-white px-5 py-3.5">
              <p className="flex items-center gap-2 text-[13px] text-[#6B7280]">
                <Wallet className="h-3.5 w-3.5 text-[#9CA3AF]" /> Current available cash
              </p>
              <p className="text-[14px] font-semibold text-[#111827]">${formatCurrency(cashBalance)}</p>
            </div>
          )}

          {/* Method selection */}
          <div className="mb-5">
            <p className="mb-2.5 text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">Withdrawal method</p>
            <MethodToggle method={method} onChange={setMethod} />
          </div>

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
              max={SLIDER_MAX}
              step={10}
              value={Math.min(amount, SLIDER_MAX)}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="mt-5 h-1.5 w-full cursor-pointer appearance-none rounded-full"
              style={{ background: `linear-gradient(to right, #111827 ${sliderPercent}%, #F3F4F6 ${sliderPercent}%)` }}
            />
            <div className="mt-1.5 flex justify-between text-[11px] text-[#9CA3AF]">
              <span>${MIN_WITHDRAWAL}</span>
              <span>${SLIDER_MAX.toLocaleString()}+</span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((qa) => (
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
              {cashBalance !== null && cashBalance > 0 && (
                <button
                  type="button"
                  onClick={() => syncAmount(Math.floor(cashBalance))}
                  className="rounded-lg border border-[#E5E5E2] px-3.5 py-1.5 text-[13px] font-medium text-[#6B7280] transition-colors hover:border-[#111827] hover:text-[#111827]"
                >
                  Max
                </button>
              )}
            </div>

            {/* Crypto-specific section */}
            {method === "crypto" && (
              <div className="mt-6 border-t border-[#F3F4F6] pt-5">
                <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Select asset & network
                </p>
                <CryptoNetworkPicker selected={selectedNetwork} onSelect={setSelectedNetwork} />

                {selectedNetwork && (
                  <div className="mt-4 space-y-1.5">
                    <label className="text-[12px] font-medium text-[#6B7280]">
                      Your {selectedNetwork.asset} wallet address ({selectedNetwork.network})
                    </label>
                    <input
                      type="text"
                      value={cryptoUserAddress}
                      onChange={(e) => setCryptoUserAddress(e.target.value)}
                      placeholder="Paste your wallet address"
                      className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 font-mono text-[13px] text-[#111827] outline-none focus:border-[#111827] focus:bg-white"
                    />
                    <p className="flex items-start gap-1.5 text-[12px] text-amber-700">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      Double-check this address. Funds sent to an incorrect or unsupported address cannot be recovered.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Bank-specific section */}
            {method === "bank" && (
              <div className="mt-6 border-t border-[#F3F4F6] pt-5">
                <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Your bank information
                </p>
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-[#6B7280]">Bank name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Chase Bank"
                      className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 text-[13px] text-[#111827] outline-none focus:border-[#111827] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-[#6B7280]">Account holder name</label>
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="Full name on the account"
                      className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 text-[13px] text-[#111827] outline-none focus:border-[#111827] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-[#6B7280]">Account number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Account number"
                      className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 text-[13px] text-[#111827] outline-none focus:border-[#111827] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-[#6B7280]">Branch / Routing / SWIFT code</label>
                    <input
                      type="text"
                      value={bankBranchOrSwift}
                      onChange={(e) => setBankBranchOrSwift(e.target.value)}
                      placeholder="Branch code, routing number, or SWIFT/BIC"
                      className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 text-[13px] text-[#111827] outline-none focus:border-[#111827] focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
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
              The amount is deducted from your available cash immediately and held until review.
            </p>
          </div>

          {/* Withdrawal tracker */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827]">Withdrawal history</h2>
                {pendingTotal > 0 && (
                  <p className="mt-0.5 text-[12.5px] text-amber-700">${formatCurrency(pendingTotal)} pending review</p>
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
                          {w.method && <span className="capitalize"> · {w.method}</span>}
                        </p>
                        {w.status === "rejected" && w.rejection_reason && (
                          <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-red-600">
                            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {w.rejection_reason}
                          </p>
                        )}
                        {w.status === "approved" && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#1a6b3c]">
                            <ShieldCheck className="h-3 w-3" /> Processed
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
    </>
  );
}