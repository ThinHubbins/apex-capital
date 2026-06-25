"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, TrendingDown, Wallet,
  Loader2, Check, AlertCircle, ChevronDown, Info, Clock, ShieldAlert, ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import MockCryptoChart from "@/components/MockCryptoChart";
import { getMockDailySeries, type AssetType, type MockAsset } from "@/lib/mockMarketData";
import { AssetLogo } from "@/components/Assetslogo";

// ─── Types ─────────────────────────────────────────────────────────

type Side = "buy" | "sell";
type OrderType = "market" | "limit";
type OrderStatus = "filled" | "pending" | "cancelled";

type Holding = {
  quantity: number;
  avg_cost: number;
};

type PendingOrder = {
  id: string;
  side: Side;
  quantity: number;
  limit_price: number;
  created_at: string;
};

// ─── Helpers ───────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── KYC Banner ────────────────────────────────────────────────────

function KycBanner({ status }: { status: string }) {
  const isPending = status === "pending";
  const isRejected = status === "rejected";

  return (
    <div className={`overflow-hidden rounded-xl border ${
      isPending
        ? "border-amber-200 bg-amber-50"
        : isRejected
        ? "border-red-200 bg-red-50"
        : "border-amber-200 bg-amber-50"
    }`}>
      <div className={`h-1 w-full ${isPending ? "bg-amber-400" : isRejected ? "bg-red-500" : "bg-amber-400"}`} />
      <div className="flex flex-col items-center px-6 py-6 text-center">
        <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
          isPending ? "bg-amber-100" : isRejected ? "bg-red-100" : "bg-amber-100"
        }`}>
          {isRejected
            ? <ShieldAlert className="h-6 w-6 text-red-500" />
            : <ShieldAlert className="h-6 w-6 text-amber-500" />}
        </div>

        <p className={`text-[14px] font-bold ${
          isPending ? "text-amber-800" : isRejected ? "text-red-800" : "text-amber-800"
        }`}>
          {isPending
            ? "Verification in review"
            : isRejected
            ? "Verification rejected"
            : "Verification required"}
        </p>

        <p className={`mt-1.5 text-[12.5px] leading-snug ${
          isPending ? "text-amber-700" : isRejected ? "text-red-700" : "text-amber-700"
        }`}>
          {isPending
            ? "Your identity documents are being reviewed. Trading will be unlocked once approved — usually within 1–2 business days."
            : isRejected
            ? "Your verification was not approved. Please resubmit your documents to start trading."
            : "You need to verify your identity before placing trades. This only takes a few minutes."}
        </p>

        {!isPending && (
          <Link
            href="/kyc"
            className={`mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 ${
              isRejected ? "bg-red-600" : "bg-amber-500"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            {isRejected ? "Resubmit documents" : "Complete verification"}
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Confirmation Modal ─────────────────────────────────────────────

function ConfirmModal({
  side,
  symbol,
  name,
  quantity,
  unitLabel,
  orderType,
  price,
  limitPrice,
  total,
  cashBalance,
  conditionMet,
  onConfirm,
  onCancel,
  submitting,
}: {
  side: Side;
  symbol: string;
  name: string;
  quantity: number;
  unitLabel: string;
  orderType: OrderType;
  price: number;
  limitPrice: string;
  total: number;
  cashBalance: number;
  conditionMet: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const execPrice = orderType === "limit" ? Number(limitPrice) : price;
  const willPend = orderType === "limit" && !conditionMet;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-t-2xl border border-[#E5E5E2] bg-white shadow-2xl sm:rounded-2xl">
        <div className={`h-1.5 w-full ${willPend ? "bg-amber-400" : side === "buy" ? "bg-[#111827]" : "bg-red-500"}`} />
        <div className="px-6 pb-7 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
            Confirm order
          </p>
          <h2 className="mt-1 text-[20px] font-extrabold tracking-tight text-[#111827]">
            {side === "buy" ? "Buy" : "Sell"} {symbol}
          </h2>
          <p className="mt-0.5 text-[13px] text-[#6B7280]">{name}</p>

          {willPend && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-[12.5px] text-amber-700">
                {side === "buy"
                  ? `Market price ($${fmt(price)}) is above your limit. This order will sit pending until the price drops to $${fmt(Number(limitPrice))} or below.`
                  : `Market price ($${fmt(price)}) is below your limit. This order will sit pending until the price rises to $${fmt(Number(limitPrice))} or above.`}
              </p>
            </div>
          )}

          <div className="mt-5 space-y-2.5 rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] px-4 py-4">
            {[
              ["Order type", orderType === "market" ? "Market order" : "Limit order"],
              ["Status", willPend ? "Will queue as pending" : "Fills immediately"],
              ["Quantity", `${quantity} ${unitLabel}`],
              ["Est. price", `$${fmt(execPrice)}`],
              ...(willPend ? [] : [["Est. total", `$${fmt(total)}`]]),
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[13px] text-[#6B7280]">{label}</span>
                <span className={`text-[13px] font-semibold ${label === "Status" && willPend ? "text-amber-600" : "text-[#111827]"}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {side === "buy" && !willPend && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-[#E5E5E2] bg-white px-3.5 py-2.5">
              <span className="text-[12px] text-[#9CA3AF]">Cash after order</span>
              <span className={`text-[13px] font-semibold ${cashBalance - total < 0 ? "text-red-600" : "text-[#111827]"}`}>
                ${fmt(Math.max(0, cashBalance - total))}
              </span>
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-[#E5E5E2] bg-white py-3 text-[14px] font-medium text-[#6B7280] hover:text-[#111827]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white transition-opacity disabled:opacity-60 ${
                willPend
                  ? "bg-amber-500 hover:opacity-90"
                  : side === "buy"
                  ? "bg-[#111827] hover:opacity-90"
                  : "bg-red-600 hover:opacity-90"
              }`}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting
                ? "Placing…"
                : willPend
                ? "Place Limit Order"
                : `Confirm ${side === "buy" ? "Buy" : "Sell"}`}
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-[#9CA3AF]">
            {willPend
              ? "Pending orders can be cancelled from your portfolio at any time."
              : "Market orders execute at the next available price. Prices may vary slightly."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Success Modal ──────────────────────────────────────────────────

function SuccessModal({
  side,
  symbol,
  quantity,
  total,
  isPending,
  limitPrice,
  onClose,
}: {
  side: Side;
  symbol: string;
  quantity: number;
  total: number;
  isPending: boolean;
  limitPrice?: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white shadow-2xl">
        <div className={`h-1.5 w-full ${isPending ? "bg-amber-400" : "bg-[#1a6b3c]"}`} />
        <div className="flex flex-col items-center px-8 pb-8 pt-6 text-center">
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isPending ? "bg-amber-50" : "bg-[#F0F7F2]"}`}>
            {isPending
              ? <Clock className="h-7 w-7 text-amber-500" />
              : <Check className="h-7 w-7 text-[#1a6b3c]" />}
          </div>
          <h2 className="text-[20px] font-extrabold tracking-tight text-[#111827]">
            {isPending ? "Order queued!" : "Order placed!"}
          </h2>
          <p className="mt-1.5 text-[13.5px] text-[#6B7280]">
            {isPending
              ? <>Your limit {side} for <span className="font-semibold text-[#111827]">{quantity} {symbol}</span> is pending at <span className="font-semibold text-[#111827]">${fmt(limitPrice ?? 0)}</span>. It will fill automatically when the price is reached.</>
              : <>Your {side} order for <span className="font-semibold text-[#111827]">{quantity} {symbol}</span> has been submitted.</>}
          </p>
          {!isPending && (
            <p className="mt-1 text-[13px] font-semibold text-[#111827]">${fmt(total)}</p>
          )}
          <div className="mt-6 flex w-full flex-col gap-2.5">
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-[#111827] py-3 text-[14px] font-semibold text-white hover:opacity-90"
            >
              Back to markets
            </button>
            <Link
              href="/portfolio"
              className="w-full rounded-xl border border-[#E5E5E2] py-3 text-center text-[14px] font-medium text-[#6B7280] hover:text-[#111827]"
            >
              {isPending ? "View open orders" : "View portfolio"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function TradePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const symbol = (params.symbol as string).toUpperCase();
  const name = searchParams.get("name") ?? symbol;

  const [mockAsset, setMockAsset] = useState<MockAsset | null>(null);
  const [assetLoading, setAssetLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadAsset() {
      try {
        const res = await fetch(`/api/markets/${symbol}`);
        const data = await res.json();
        if (!cancelled && data.asset) setMockAsset(data.asset);
      } catch {
        // keep null; UI below handles it
      } finally {
        if (!cancelled) setAssetLoading(false);
      }
    }
    loadAsset();
    return () => { cancelled = true; };
  }, [symbol]);

  const assetType: AssetType =
    mockAsset?.assetType ?? ((searchParams.get("type") as AssetType) || "stock");

  const series = useMemo(() => (mockAsset ? getMockDailySeries(mockAsset) : []), [mockAsset]);

  const unitLabel = assetType === "crypto" ? "coins" : "shares";
  const qtyStep = assetType === "crypto" ? 0.01 : 1;
  const qtyMin = assetType === "crypto" ? 0.0001 : 1;
  const qtyDecimals = assetType === "crypto" ? 4 : 0;
  const quantityChips = assetType === "crypto" ? [0.01, 0.1, 0.5, 1] : [1, 5, 10, 25];

  // Auth guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
    });
  }, []);

  // ── State ──
  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [quantityInput, setQuantityInput] = useState(assetType === "crypto" ? "0.01" : "1");
  const [limitPriceInput, setLimitPriceInput] = useState(
    Number(searchParams.get("price") ?? 0).toFixed(qtyDecimals === 4 ? 4 : 2)
  );
  const [livePrice, setLivePrice] = useState(Number(searchParams.get("price") ?? 0));

  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [holding, setHolding] = useState<Holding | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderWasPending, setLastOrderWasPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // ── Seed price fields from the override-merged asset once it loads ──
  useEffect(() => {
    if (!mockAsset) return;
    setLivePrice(mockAsset.startPrice);
    setLimitPriceInput(mockAsset.startPrice.toFixed(qtyDecimals === 4 ? 4 : 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockAsset]);

  // ── Load profile + holding + pending orders ──
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, filledRes, pendingRes] = await Promise.all([
        supabase.from("profiles").select("cash_balance, kyc_status").eq("id", user.id).single(),
        supabase.from("orders")
          .select("quantity, price_at_execution, side")
          .eq("user_id", user.id)
          .eq("symbol", symbol)
          .eq("status", "filled"),
        supabase.from("orders")
          .select("id, side, quantity, limit_price, created_at")
          .eq("user_id", user.id)
          .eq("symbol", symbol)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);

      if (profileRes.data) {
        setCashBalance(Number(profileRes.data.cash_balance ?? 0));
        setKycStatus(profileRes.data.kyc_status ?? "none");
      }

      if (filledRes.data && filledRes.data.length > 0) {
        let netQty = 0;
        let totalCost = 0;
        for (const o of filledRes.data) {
          const q = Number(o.quantity);
          const p = Number(o.price_at_execution ?? 0);
          if (o.side === "buy") { netQty += q; totalCost += q * p; }
          else { netQty -= q; totalCost -= q * p; }
        }
        if (netQty > 0) setHolding({ quantity: netQty, avg_cost: totalCost / netQty });
      }

      if (pendingRes.data) {
        setPendingOrders(pendingRes.data.map((o) => ({
          id: o.id,
          side: o.side as Side,
          quantity: Number(o.quantity),
          limit_price: Number(o.limit_price),
          created_at: o.created_at,
        })));
      }

      setLoadingProfile(false);
    }
    load();
  }, [symbol]);

  // ── Refresh live price every 15s + auto-fill pending limit orders ──
  useEffect(() => {
    async function refreshPrice() {
      try {
        const res = await fetch("/api/markets");
        const data = await res.json();
        const found = (data.results ?? []).find(
          (a: { symbol: string; price: number | null; changePercent: number | null }) => a.symbol === symbol
        );
        if (found?.price) {
          const newPrice: number = found.price;
          setPriceChange(found.changePercent ?? null);
          setLivePrice(newPrice);
          await autoFillPendingOrders(newPrice);
        }
      } catch { /* keep last known */ }
    }
    refreshPrice();
    const iv = setInterval(refreshPrice, 15000);
    return () => clearInterval(iv);
  }, [symbol, pendingOrders]);

  // ── Auto-fill logic ──
  async function autoFillPendingOrders(currentPrice: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: pending } = await supabase
      .from("orders")
      .select("id, side, quantity, limit_price")
      .eq("user_id", user.id)
      .eq("symbol", symbol)
      .eq("status", "pending");

    if (!pending || pending.length === 0) return;

    for (const order of pending) {
      const limitPrice = Number(order.limit_price);
      const qty = Number(order.quantity);
      const conditionMet =
        order.side === "buy" ? currentPrice <= limitPrice : currentPrice >= limitPrice;

      if (!conditionMet) continue;

      const total = qty * currentPrice;

      const { error } = await supabase
        .from("orders")
        .update({
          status: "filled",
          price_at_execution: currentPrice,
          total_value: total,
          filled_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (error) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("cash_balance")
        .eq("id", user.id)
        .single();

      if (profile) {
        const currentBalance = Number(profile.cash_balance);
        const newBalance =
          order.side === "buy"
            ? currentBalance - total
            : currentBalance + total;

        await supabase
          .from("profiles")
          .update({ cash_balance: newBalance })
          .eq("id", user.id);

        setCashBalance(newBalance);
      }

      setPendingOrders((prev) => prev.filter((p) => p.id !== order.id));
    }
  }

  // ── Cancel a pending order ──
  async function handleCancelOrder(orderId: string) {
    setCancellingId(orderId);
    try {
      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
    } finally {
      setCancellingId(null);
    }
  }

  // ── Derived ──
  const quantity = Math.max(0, Number(quantityInput) || 0);
  const limitPriceNum = Number(limitPriceInput) || 0;
  const execPrice = orderType === "market" ? livePrice : limitPriceNum;
  const estimatedTotal = quantity * execPrice;
  const priceUp = (priceChange ?? 0) >= 0;
  const kycApproved = ["approved", "verified"].includes(kycStatus ?? "");

  const limitConditionMet =
    orderType === "limit"
      ? side === "buy"
        ? livePrice <= limitPriceNum
        : livePrice >= limitPriceNum
      : true;

  const willBePending = orderType === "limit" && !limitConditionMet;

  // ── Validation ──
  function validate(): string | null {
    if (!quantity || quantity <= 0) return "Enter a valid quantity.";
    if (orderType === "limit") {
      if (!limitPriceNum || limitPriceNum <= 0) return "Enter a valid limit price.";
    }
    if (side === "buy" && cashBalance !== null) {
      const checkTotal = quantity * (orderType === "limit" ? limitPriceNum : livePrice);
      if (checkTotal > cashBalance)
        return `Insufficient funds. You need $${fmt(checkTotal)} but have $${fmt(cashBalance)}.`;
    }
    if (side === "sell") {
      const owned = holding?.quantity ?? 0;
      const pendingSellQty = pendingOrders
        .filter((o) => o.side === "sell")
        .reduce((acc, o) => acc + o.quantity, 0);
      const available = owned - pendingSellQty;
      if (quantity > available)
        return `You only have ${available} ${unitLabel} available (${owned} owned, ${pendingSellQty} in pending orders).`;
    }
    return null;
  }

  function handleReview() {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError(null);
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // ── KYC gate (server-side double-check) ───────────────────────
      const { data: freshProfile } = await supabase
        .from("profiles")
        .select("kyc_status")
        .eq("id", user.id)
        .single();

      if (freshProfile?.kyc_status !== "approved") {
        setKycStatus(freshProfile?.kyc_status ?? "none");
        throw new Error("KYC_REQUIRED");
      }
      // ─────────────────────────────────────────────────────────────

      const status: OrderStatus = willBePending ? "pending" : "filled";
      const fillPrice = willBePending ? null : livePrice;
      const fillTotal = willBePending ? null : quantity * livePrice;

      const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        symbol,
        asset_name: name,
        asset_type: assetType,
        side,
        order_type: orderType,
        quantity,
        limit_price: orderType === "limit" ? limitPriceNum : null,
        price_at_execution: fillPrice,
        total_value: fillTotal,
        status,
        filled_at: status === "filled" ? new Date().toISOString() : null,
      });

      if (error) throw new Error(error.message);

      if (status === "filled" && cashBalance !== null) {
        const newBalance =
          side === "buy"
            ? cashBalance - (fillTotal ?? 0)
            : cashBalance + (fillTotal ?? 0);
        await supabase
          .from("profiles")
          .update({ cash_balance: newBalance })
          .eq("id", user.id);
        setCashBalance(newBalance);
      }

      if (status === "pending") {
        const { data: newOrder } = await supabase
          .from("orders")
          .select("id, created_at")
          .eq("user_id", user.id)
          .eq("symbol", symbol)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (newOrder) {
          setPendingOrders((prev) => [{
            id: newOrder.id,
            side,
            quantity,
            limit_price: limitPriceNum,
            created_at: newOrder.created_at,
          }, ...prev]);
        }
      }

      setLastOrderWasPending(status === "pending");
      setShowConfirm(false);
      setShowSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setFormError(msg);
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {showConfirm && cashBalance !== null && (
        <ConfirmModal
          side={side}
          symbol={symbol}
          name={name}
          quantity={quantity}
          unitLabel={unitLabel}
          orderType={orderType}
          price={livePrice}
          limitPrice={limitPriceInput}
          total={estimatedTotal}
          cashBalance={cashBalance}
          conditionMet={limitConditionMet}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
        />
      )}

      {showSuccess && (
        <SuccessModal
          side={side}
          symbol={symbol}
          quantity={quantity}
          total={estimatedTotal}
          isPending={lastOrderWasPending}
          limitPrice={limitPriceNum}
          onClose={() => { setShowSuccess(false); router.push("/markets"); }}
        />
      )}

      <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
        <Navbar variant="auth" />

        <main className="mx-auto max-w-2xl px-6 py-8 lg:px-10">
          <Link
            href="/markets"
            className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B7280] hover:text-[#111827]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to markets
          </Link>

          {/* Asset header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <AssetLogo symbol={symbol} logo={mockAsset?.logo ?? ""} size={44} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[20px] font-extrabold tracking-tight text-[#111827]">{symbol}</h1>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    assetType === "etf" ? "bg-indigo-50 text-indigo-600"
                    : assetType === "crypto" ? "bg-orange-50 text-orange-600"
                    : "bg-[#F3F4F6] text-[#6B7280]"
                  }`}>
                    {assetType}
                  </span>
                </div>
                <p className="text-[13px] text-[#6B7280]">{name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[22px] font-extrabold tracking-tight text-[#111827]">
                ${fmt(livePrice)}
              </p>
              {priceChange !== null && (
                <p className={`flex items-center justify-end gap-1 text-[13px] font-medium ${priceUp ? "text-[#1a6b3c]" : "text-red-500"}`}>
                  {priceUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {priceUp ? "+" : ""}{priceChange.toFixed(2)}% today
                </p>
              )}
            </div>
          </div>

          {/* Mock price chart */}
          {!assetLoading && mockAsset && series.length > 0 && (
            <MockCryptoChart series={series} floor={mockAsset.floor} ceiling={mockAsset.ceiling} />
          )}

          {/* Current holding */}
          {holding && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-[#E5E5E2] bg-white px-5 py-3.5 shadow-sm">
              <p className="text-[13px] text-[#6B7280]">
                You own <span className="font-semibold text-[#111827]">{holding.quantity} {unitLabel}</span>
              </p>
              <div className="text-right">
                <p className="text-[13px] font-semibold text-[#111827]">
                  ${fmt(holding.quantity * livePrice)}
                </p>
                <p className="text-[11px] text-[#9CA3AF]">
                  avg ${fmt(holding.avg_cost)}
                </p>
              </div>
            </div>
          )}

          {/* Cash balance */}
          {cashBalance !== null && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-[#E5E5E2] bg-white px-5 py-3.5 shadow-sm">
              <p className="flex items-center gap-2 text-[13px] text-[#6B7280]">
                <Wallet className="h-3.5 w-3.5 text-[#9CA3AF]" /> Available cash
              </p>
              <p className="text-[14px] font-semibold text-[#111827]">${fmt(cashBalance)}</p>
            </div>
          )}

          {/* Pending limit orders for this symbol */}
          {pendingOrders.length > 0 && (
            <div className="mb-5 overflow-hidden rounded-xl border border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2 border-b border-amber-200 px-4 py-2.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-[12px] font-semibold text-amber-700">
                  {pendingOrders.length} pending order{pendingOrders.length !== 1 ? "s" : ""} for {symbol}
                </p>
              </div>
              <div className="divide-y divide-amber-100">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-[13px] font-semibold text-[#111827]">
                        {order.side === "buy" ? "Buy" : "Sell"} {order.quantity} @ ${fmt(order.limit_price)}
                      </p>
                      <p className="text-[11px] text-[#9CA3AF]">
                        Fills when price hits ${fmt(order.limit_price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingId === order.id}
                      className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-[12px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {cancellingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cancel"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── KYC banner — shown when not approved ── */}
          {kycStatus !== null && !kycApproved && (
            <div className="mb-5">
              <KycBanner status={kycStatus} />
            </div>
          )}

          {/* Trade card — always visible but form disabled when KYC not approved */}
          <div className={`overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white shadow-sm ${!kycApproved && kycStatus !== null ? "opacity-50 pointer-events-none select-none" : ""}`}>
            <div className="flex border-b border-[#E5E5E2]">
              {(["buy", "sell"] as Side[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSide(s); setFormError(null); }}
                  className={`flex-1 py-3.5 text-[14px] font-semibold capitalize transition-colors ${
                    side === s
                      ? s === "buy"
                        ? "border-b-2 border-[#111827] text-[#111827]"
                        : "border-b-2 border-red-500 text-red-600"
                      : "text-[#9CA3AF] hover:text-[#6B7280]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  Order type
                </label>
                <div className="relative">
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as OrderType)}
                    className="w-full appearance-none rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] px-4 py-3 text-[13px] font-medium text-[#111827] outline-none focus:border-[#111827] focus:bg-white"
                  >
                    <option value="market">Market order — execute at current price</option>
                    <option value="limit">Limit order — set your own price</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                </div>
                {orderType === "market" && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[#9CA3AF]">
                    <Info className="h-3 w-3" />
                    Executes immediately at the best available price.
                  </p>
                )}
                {orderType === "limit" && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[#9CA3AF]">
                    <Info className="h-3 w-3" />
                    Order fills only when the price reaches your target.
                  </p>
                )}
              </div>

              {orderType === "limit" && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    Limit price
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] px-4 py-3 focus-within:border-[#111827] focus-within:bg-white">
                    <span className="text-[16px] font-semibold text-[#9CA3AF]">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={limitPriceInput}
                      onChange={(e) => setLimitPriceInput(e.target.value)}
                      className="flex-1 bg-transparent text-[16px] font-semibold text-[#111827] outline-none"
                      placeholder={livePrice.toFixed(2)}
                    />
                  </div>
                  {limitPriceNum > 0 && (
                    <div className={`mt-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium ${
                      limitConditionMet
                        ? "bg-[#F0F7F2] text-[#1a6b3c]"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {limitConditionMet
                        ? <><Check className="h-3.5 w-3.5" /> Condition met — order will fill immediately at market price (${fmt(livePrice)})</>
                        : <><Clock className="h-3.5 w-3.5" /> Will queue as pending until price {side === "buy" ? "drops to" : "rises to"} ${fmt(limitPriceNum)}</>}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                  {assetType === "crypto" ? "Coins" : "Shares"}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantityInput((q) => Math.max(qtyMin, Number(q || qtyMin) - qtyStep).toFixed(qtyDecimals))
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] text-[18px] font-medium text-[#374151] hover:bg-[#EEEEEC]"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={qtyMin}
                    step={qtyStep}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    className="flex-1 rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] py-2.5 text-center text-[18px] font-extrabold text-[#111827] outline-none focus:border-[#111827] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQuantityInput((q) => (Number(q || 0) + qtyStep).toFixed(qtyDecimals))
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] text-[18px] font-medium text-[#374151] hover:bg-[#EEEEEC]"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {quantityChips.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantityInput(String(q))}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      Number(quantityInput) === q
                        ? "border-[#111827] bg-[#111827] text-white"
                        : "border-[#E5E5E2] text-[#6B7280] hover:border-[#111827] hover:text-[#111827]"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] px-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#6B7280]">
                    {quantity} × ${fmt(execPrice)}
                    {willBePending && (
                      <span className="ml-1 text-[11px] text-[#9CA3AF]">(limit)</span>
                    )}
                  </span>
                  <span className="text-[17px] font-extrabold text-[#111827]">
                    ${fmt(estimatedTotal)}
                  </span>
                </div>
                {willBePending && (
                  <p className="mt-1.5 text-[11.5px] text-amber-600">
                    Cash reserved when the order fills, not now.
                  </p>
                )}
                {!willBePending && side === "buy" && cashBalance !== null && (
                  <div className="mt-2 flex items-center justify-between border-t border-[#E5E5E2] pt-2">
                    <span className="text-[12px] text-[#9CA3AF]">Cash after</span>
                    <span className={`text-[13px] font-semibold ${cashBalance - estimatedTotal < 0 ? "text-red-600" : "text-[#6B7280]"}`}>
                      ${fmt(Math.max(0, cashBalance - estimatedTotal))}
                    </span>
                  </div>
                )}
              </div>

              {formError && (
                formError === "KYC_REQUIRED" ? (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    Trading requires identity verification.{" "}
                    <Link href="/kyc" className="font-medium underline">Complete KYC →</Link>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
                  </div>
                )
              )}

              <button
                type="button"
                onClick={handleReview}
                disabled={loadingProfile || quantity <= 0}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-50 ${
                  willBePending
                    ? "bg-amber-500 hover:opacity-90"
                    : side === "buy"
                    ? "bg-[#111827] hover:opacity-90"
                    : "bg-red-600 hover:opacity-90"
                }`}
              >
                {loadingProfile
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : willBePending
                  ? "Place Limit Order"
                  : `Review ${side === "buy" ? "Buy" : "Sell"} Order`}
              </button>

              <p className="text-center text-[11.5px] text-[#9CA3AF]">
                {willBePending
                  ? "Pending orders can be cancelled at any time."
                  : "Orders are processed during market hours. Prices may vary at execution."}
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}