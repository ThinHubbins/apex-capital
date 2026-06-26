// app/wallet/deposit/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Wallet, ArrowDown, Clock, Check, X, AlertCircle, Loader2,
  RefreshCw, ShieldCheck, ArrowLeft, Mail, MailOpen, Copy,
  Bitcoin, Landmark, CheckCircle2,
} from "lucide-react";
import Navbar from "../../../components/Navbar";
import { createClient } from "../../../lib/supabase/client";

type DepositStatus = "pending" | "approved" | "rejected";
type DepositMethod = "crypto" | "wire";

type Deposit = {
  id: string;
  amount: number;
  status: DepositStatus;
  method?: DepositMethod;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type CryptoOption = {
  asset: string;
  network: string;
  address: string;
};

const MIN_DEPOSIT = 10;
const SLIDER_MAX = 10000;
const QUICK_AMOUNTS = [100, 500, 1000, 5000];
const POLL_INTERVAL_MS = 30000;

const CRYPTO_OPTIONS: CryptoOption[] = [
  { asset: "BTC", network: "BTC NETWORK", address: "bc1qzd67jzq0n7sm82jt0nyxh4egwyg0dtzvvdkuee" },
  { asset: "USDT", network: "ERC20", address: "0x31D91d829A98e886809f382BD5E77446a17a458E" },
  { asset: "ETH", network: "ETH", address: "0x31d91d829a98e886809f382bd5e77446a17a458e" },
  { asset: "SOL", network: "SOLANA", address: "3N4dgunmJhwFd58DUS2ea2J9Aj4Z14EBSBUWUya2KcPz" },
  { asset: "USDC", network: "ERC20", address: "0x31d91d829a98e886809f382bd5e77446a17a458e" },
];

function cryptoKey(c: CryptoOption) {
  return `${c.asset}-${c.network}`;
}

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: DepositStatus }) {
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

// ─── Wire Transfer Submitted Modal (the original modal) ──────────────────────

function WireSubmittedModal({
  amount,
  onClose,
}: {
  amount: number;
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
              <MailOpen className="h-7 w-7 text-[#1a6b3c]" />
            </div>
            <h2 className="text-[20px] font-extrabold tracking-tight text-[#111827]">
              Check your email
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#6B7280]">
              Your deposit request of{" "}
              <span className="font-semibold text-[#111827]">${formatCurrency(amount)}</span>{" "}
              has been submitted and is pending review.
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
                We'll send you an email with our bank / payment details so you know exactly where to transfer the funds.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[10px] font-bold text-white">
                2
              </div>
              <p className="text-[13px] text-[#374151]">
                Make your transfer using the details provided in that email.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[10px] font-bold text-white">
                3
              </div>
              <p className="text-[13px] text-[#374151]">
                Once confirmed, your balance will be updated and you'll be notified here.
              </p>
            </div>
          </div>

          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[12.5px] leading-relaxed text-amber-800">
              <span className="font-semibold">Please be patient</span> — the email may not arrive instantly. If you haven't received it within a few hours, please contact support.
            </p>
          </div>

          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[#E5E5E2] bg-white px-4 py-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" />
            <p className="text-[12px] leading-relaxed text-[#6B7280]">
              Don't forget to check your <span className="font-medium text-[#111827]">spam or junk folder</span> in case the email lands there.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111827] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Check className="h-4 w-4" /> Got it, I'll check my email
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Crypto Submitted Modal (new) ─────────────────────────────────────────────

function CryptoSubmittedModal({
  amount,
  crypto,
  onClose,
}: {
  amount: number;
  crypto: CryptoOption;
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
              <Bitcoin className="h-7 w-7 text-[#1a6b3c]" />
            </div>
            <h2 className="text-[20px] font-extrabold tracking-tight text-[#111827]">
              Request submitted
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#6B7280]">
              Your deposit request of{" "}
              <span className="font-semibold text-[#111827]">${formatCurrency(amount)}</span>{" "}
              via {crypto.asset} is pending review.
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
                Send your funds to the {crypto.asset} ({crypto.network}) address you were shown, if you haven't already.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[10px] font-bold text-white">
                2
              </div>
              <p className="text-[13px] text-[#374151]">
                Our team confirms the transaction on the blockchain.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[10px] font-bold text-white">
                3
              </div>
              <p className="text-[13px] text-[#374151]">
                Once confirmed, your balance will be updated and you'll be notified here.
              </p>
            </div>
          </div>

          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[12.5px] leading-relaxed text-amber-800">
              <span className="font-semibold">Network confirmations can take time</span> — larger or congested networks may take longer to confirm. If your balance hasn't updated after a while, contact support.
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
  method: DepositMethod;
  onChange: (m: DepositMethod) => void;
}) {
  const options: { key: DepositMethod; icon: React.ElementType; label: string; description: string }[] = [
    { key: "crypto", icon: Bitcoin, label: "Crypto", description: "BTC, ETH, USDT, USDC, SOL" },
    { key: "wire", icon: Landmark, label: "Wire transfer", description: "Bank transfer" },
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

// ─── Crypto Address Picker ────────────────────────────────────────────────────

function CryptoAddressPicker({
  selected,
  onSelect,
}: {
  selected: CryptoOption | null;
  onSelect: (c: CryptoOption) => void;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function handleCopy(c: CryptoOption) {
    try {
      await navigator.clipboard.writeText(c.address);
      setCopiedKey(cryptoKey(c));
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // clipboard may be unavailable — silently ignore
    }
  }

  return (
    <div className="space-y-2.5">
      {CRYPTO_OPTIONS.map((c) => {
        const isSelected = selected ? cryptoKey(selected) === cryptoKey(c) : false;
        return (
          <div
            key={cryptoKey(c)}
            onClick={() => onSelect(c)}
            className={`cursor-pointer rounded-xl border px-4 py-3.5 transition-colors ${
              isSelected ? "border-[#111827] bg-[#F7F7F5]" : "border-[#E5E5E2] bg-white hover:border-[#9CA3AF]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-[#111827]">
                  {c.asset}{" "}
                  <span className="font-normal text-[#9CA3AF]">({c.network})</span>
                </p>
              </div>
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? "border-[#111827] bg-[#111827]" : "border-[#D1D5DB]"
                }`}
              >
                {isSelected && <CheckCircle2 className="h-5 w-5 text-[#111827]" fill="white" />}
              </div>
            </div>

            {isSelected && (
              <div
                className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[#E5E5E2] bg-white px-3 py-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="truncate text-[12px] font-mono text-[#374151]">{c.address}</p>
                <button
                  type="button"
                  onClick={() => handleCopy(c)}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-[#E5E5E2] px-2 py-1 text-[11px] font-medium text-[#6B7280] hover:border-[#111827] hover:text-[#111827]"
                >
                  {copiedKey === cryptoKey(c) ? (
                    <>
                      <Check className="h-3 w-3 text-[#1a6b3c]" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DepositPage() {
  const supabase = createClient();
  const [cashBalance, setCashBalance] = useState<number | null>(null);

  const [method, setMethod] = useState<DepositMethod>("crypto");

  const [amount, setAmount] = useState<number>(100);
  const [amountInput, setAmountInput] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Crypto-specific state
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoOption | null>(null);

  // Wire-specific state
  const [senderBankName, setSenderBankName] = useState("");
  const [senderAccountNumber, setSenderAccountNumber] = useState("");
  const [senderBranch, setSenderBranch] = useState("");

  // Modal state
  const [wireModalAmount, setWireModalAmount] = useState<number | null>(null);
  const [cryptoModalState, setCryptoModalState] = useState<{ amount: number; crypto: CryptoOption } | null>(null);

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(true);
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

  async function fetchDeposits(opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoadingDeposits(true);
    try {
      const res = await fetch("/api/deposits");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDeposits(data.deposits ?? []);
    } catch {
      // keep last known state on a failed poll
    } finally {
      setLoadingDeposits(false);
    }
  }

  useEffect(() => { fetchDeposits(); }, []);

  // Poll while any deposit is pending
  useEffect(() => {
    const hasPending = deposits.some((d) => d.status === "pending");
    if (pollRef.current) clearInterval(pollRef.current);
    if (hasPending) {
      pollRef.current = setInterval(async () => {
        await fetchDeposits({ silent: true });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from("profiles").select("cash_balance").eq("id", user.id).single();
          if (data) setCashBalance(Number(data.cash_balance ?? 0));
        }
      }, POLL_INTERVAL_MS);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deposits.length, deposits.map((d) => d.status).join(",")]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchDeposits({ silent: true });
    setRefreshing(false);
  }

  function syncAmount(value: number) {
    const clamped = Math.max(0, Math.min(value, 1_000_000));
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
    () => deposits.filter((d) => d.status === "pending").reduce((sum, d) => sum + Number(d.amount), 0),
    [deposits]
  );

  function resetForm() {
    syncAmount(100);
    setSelectedCrypto(null);
    setSenderBankName("");
    setSenderAccountNumber("");
    setSenderBranch("");
  }

  async function handleSubmit() {
    setFormError(null);

    const value = Number(amountInput);
    if (!value || Number.isNaN(value) || value < MIN_DEPOSIT) {
      setFormError(`Enter an amount of at least $${MIN_DEPOSIT}.`);
      return;
    }

    if (method === "crypto" && !selectedCrypto) {
      setFormError("Select a crypto asset and address to deposit to.");
      return;
    }

    if (method === "wire") {
      if (!senderBankName.trim() || !senderAccountNumber.trim() || !senderBranch.trim()) {
        setFormError("Fill in your sender bank name, account number, and branch.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { amount: value, method };
      if (method === "crypto" && selectedCrypto) {
        payload.cryptoAsset = cryptoKey(selectedCrypto);
      } else if (method === "wire") {
        payload.senderBankName = senderBankName.trim();
        payload.senderAccountNumber = senderAccountNumber.trim();
        payload.senderBranch = senderBranch.trim();
      }

      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit deposit");

      setDeposits((prev) => [data.deposit, ...prev]);

      if (method === "wire") {
        setWireModalAmount(value);
      } else if (selectedCrypto) {
        setCryptoModalState({ amount: value, crypto: selectedCrypto });
      }
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
      {/* Modals — rendered above everything else */}
      {wireModalAmount !== null && (
        <WireSubmittedModal
          amount={wireModalAmount}
          onClose={() => setWireModalAmount(null)}
        />
      )}
      {cryptoModalState !== null && (
        <CryptoSubmittedModal
          amount={cryptoModalState.amount}
          crypto={cryptoModalState.crypto}
          onClose={() => setCryptoModalState(null)}
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
              <ArrowDown className="h-4 w-4 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-[22px] font-extrabold tracking-tight text-[#111827]">Deposit funds</h1>
              <p className="text-[13px] text-[#6B7280]">Add money to your available cash balance.</p>
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
            <p className="mb-2.5 text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">Deposit method</p>
            <MethodToggle method={method} onChange={setMethod} />
          </div>

          {/* Amount selection */}
          <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
            <p className="text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">
              {method === "crypto" ? "USD value you sent" : "Amount to deposit"}
            </p>

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
              min={MIN_DEPOSIT}
              max={SLIDER_MAX}
              step={10}
              value={Math.min(amount, SLIDER_MAX)}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="mt-5 h-1.5 w-full cursor-pointer appearance-none rounded-full"
              style={{ background: `linear-gradient(to right, #111827 ${sliderPercent}%, #F3F4F6 ${sliderPercent}%)` }}
            />
            <div className="mt-1.5 flex justify-between text-[11px] text-[#9CA3AF]">
              <span>${MIN_DEPOSIT}</span>
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
            </div>

            {/* Crypto-specific section */}
            {method === "crypto" && (
              <div className="mt-6 border-t border-[#F3F4F6] pt-5">
                <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Select a deposit address
                </p>
                <CryptoAddressPicker selected={selectedCrypto} onSelect={setSelectedCrypto} />
                {selectedCrypto && (
                  <p className="mt-3 flex items-start gap-1.5 text-[12px] text-amber-700">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    Only send {selectedCrypto.asset} on the {selectedCrypto.network} network to this address. Sending any other asset or using the wrong network may result in permanent loss of funds.
                  </p>
                )}
              </div>
            )}

            {/* Wire-specific section */}
            {method === "wire" && (
              <div className="mt-6 border-t border-[#F3F4F6] pt-5">
                <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Sender bank information
                </p>
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-[#6B7280]">Sender bank name</label>
                    <input
                      type="text"
                      value={senderBankName}
                      onChange={(e) => setSenderBankName(e.target.value)}
                      placeholder="e.g. Chase Bank"
                      className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 text-[13px] text-[#111827] outline-none focus:border-[#111827] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-[#6B7280]">Sender account number</label>
                    <input
                      type="text"
                      value={senderAccountNumber}
                      onChange={(e) => setSenderAccountNumber(e.target.value)}
                      placeholder="Account number"
                      className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 text-[13px] text-[#111827] outline-none focus:border-[#111827] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-[#6B7280]">Branch name / code</label>
                    <input
                      type="text"
                      value={senderBranch}
                      onChange={(e) => setSenderBranch(e.target.value)}
                      placeholder="Branch name or code"
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
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDown className="h-4 w-4" />}
              Submit deposit request
            </button>
            <p className="mt-2.5 text-center text-[12px] text-[#9CA3AF]">
              Requests are reviewed before funds are added to your balance.
            </p>
          </div>

          {/* Deposit tracker */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827]">Deposit history</h2>
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
              {loadingDeposits ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" />
                </div>
              ) : deposits.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
                  <Wallet className="h-5 w-5 text-[#D1D5DB]" />
                  <p className="text-[13px] text-[#9CA3AF]">No deposits yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F3F4F6]">
                  {deposits.map((d) => (
                    <div key={d.id} className="flex items-start justify-between gap-4 px-5 py-4">
                      <div>
                        <p className="text-[14px] font-semibold text-[#111827]">${formatCurrency(Number(d.amount))}</p>
                        <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                          Submitted {new Date(d.submitted_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                          {d.method && <span className="capitalize"> · {d.method}</span>}
                        </p>
                        {d.status === "rejected" && d.rejection_reason && (
                          <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-red-600">
                            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {d.rejection_reason}
                          </p>
                        )}
                        {d.status === "approved" && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#1a6b3c]">
                            <ShieldCheck className="h-3 w-3" /> Added to available cash
                          </p>
                        )}
                      </div>
                      <StatusBadge status={d.status} />
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