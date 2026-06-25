"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, ShieldAlert, Clock, Eye, Check, X,
  Loader2, ChevronDown, ChevronUp, User, FileText,
  Camera, AlertCircle, Search, RefreshCw, Send,
  Users, MessageSquare, LayoutDashboard, Wallet, ArrowUp,
  TrendingUp, RotateCcw, Save,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type KycStatus = "pending" | "verified" | "rejected";
type DepositStatus = "pending" | "approved" | "rejected";
type WithdrawalStatus = "pending" | "approved" | "rejected";
type AdminSection = "kyc" | "deposits" | "withdrawals" | "messages" | "prices";

type Submission = {
  id: string;
  user_id: string;
  full_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  residential_address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  doc_type: string | null;
  has_front_image: boolean;
  has_back_image: boolean;
  has_selfie: boolean;
  front_image_url: string | null;
  back_image_url: string | null;
  selfie_url: string | null;
  status: KycStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type Deposit = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  amount: number;
  status: DepositStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type Withdrawal = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  amount: number;
  status: WithdrawalStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type AssetRow = {
  symbol: string;
  name: string;
  assetType: "stock" | "etf" | "crypto";
  floor: number;
  ceiling: number;
  startPrice: number;
  volatility: number | null;
  reversion: number | null;
  drift: number | null;
  defaults: {
    floor: number;
    ceiling: number;
    startPrice: number;
    volatility: null;
    reversion: null;
    drift: null;
  };
  hasOverride: boolean;
};

type AssetDraft = {
  floor: string;
  ceiling: string;
  startPrice: string;
  volatility: string;
  reversion: string;
  drift: string;
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: KycStatus }) {
  if (status === "verified")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F7F2] px-2.5 py-1 text-[12px] font-medium text-[#1a6b3c]">
        <ShieldCheck className="h-3 w-3" /> Verified
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-700">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-medium text-red-600">
      <ShieldAlert className="h-3 w-3" /> Rejected
    </span>
  );
}

function DepositStatusBadge({ status }: { status: DepositStatus }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F7F2] px-2.5 py-1 text-[12px] font-medium text-[#1a6b3c]">
        <Check className="h-3 w-3" /> Approved
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-700">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-medium text-red-600">
      <X className="h-3 w-3" /> Rejected
    </span>
  );
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] text-[#9CA3AF]">{label}</p>
      <p className="mt-0.5 text-[13px] font-medium text-[#111827]">{value || "—"}</p>
    </div>
  );
}

function ImageBox({ url, alt, className }: { url: string | null; alt: string; className: string }) {
  if (!url)
    return (
      <div className={"flex items-center justify-center border border-dashed border-[#E5E5E2] bg-[#F7F7F5] " + className}>
        <p className="text-[12px] text-[#9CA3AF]">Not uploaded</p>
      </div>
    );
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <img src={url} alt={alt} className={"object-cover transition-opacity hover:opacity-90 " + className} />
    </a>
  );
}

function SelfieBox({ url }: { url: string | null }) {
  if (!url) return <p className="text-[13px] text-[#9CA3AF]">No selfie submitted</p>;
  return (
    <div className="flex items-center gap-4">
      <a href={url} target="_blank" rel="noopener noreferrer" className="block shrink-0">
        <img src={url} alt="Selfie" className="h-24 w-24 rounded-full border-2 border-[#E5E5E2] object-cover transition-opacity hover:opacity-90" />
      </a>
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#1a6b3c]">
        <Check className="h-4 w-4" /> Liveness check completed
      </p>
    </div>
  );
}

// ─── KYC: Submission Row ──────────────────────────────────────────────────────

function SubmissionRow({
  sub,
  onAction,
}: {
  sub: Submission;
  onAction: (userId: string, action: "approve" | "reject", reason?: string) => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const initials = (sub.full_name ?? "?")
    .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  async function handleAction(action: "approve" | "reject") {
    setActing(true);
    setActionError(null);
    const ok = await onAction(sub.user_id, action, action === "reject" ? rejectionReason : undefined);
    setActing(false);
    if (ok) { setRejectMode(false); setRejectionReason(""); }
    else setActionError("Something went wrong — please try again.");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[12px] font-bold text-white">
            {initials}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">{sub.full_name ?? "Unknown"}</p>
            <p className="text-[12px] text-[#9CA3AF]">
              {sub.doc_type?.replace(/_/g, " ") ?? "No document"} ·{" "}
              {new Date(sub.submitted_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={sub.status} />
          <button type="button" onClick={() => setExpanded((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] text-[#6B7280] hover:bg-[#EEEEEC]">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-6 border-t border-[#F3F4F6] px-5 pb-6 pt-5">
          <div>
            <div className="mb-3 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[#9CA3AF]" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Personal information</p>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              <InfoField label="Full name" value={sub.full_name} />
              <InfoField label="Date of birth" value={sub.date_of_birth} />
              <InfoField label="Nationality" value={sub.nationality} />
              <InfoField label="Address" value={sub.residential_address} />
              <InfoField label="City" value={sub.city} />
              <InfoField label="Country" value={sub.country} />
              <InfoField label="Postal code" value={sub.postal_code} />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-[#9CA3AF]" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Identity document</p>
            </div>
            <p className="mb-4 text-[13px] font-medium capitalize text-[#111827]">
              {sub.doc_type?.replace(/_/g, " ") ?? "—"}
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-[#9CA3AF]">Front</p>
                <ImageBox url={sub.front_image_url} alt="Document front" className="h-36 w-52 rounded-xl border border-[#E5E5E2]" />
              </div>
              {sub.doc_type !== "passport" && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-[#9CA3AF]">Back</p>
                  <ImageBox url={sub.back_image_url} alt="Document back" className="h-36 w-52 rounded-xl border border-[#E5E5E2]" />
                </div>
              )}
            </div>
            <p className="mt-2 text-[11px] text-[#9CA3AF]">Click image to open full size</p>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-[#9CA3AF]" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Face verification</p>
            </div>
            <SelfieBox url={sub.selfie_url} />
          </div>

          {sub.reviewed_at && (
            <p className="text-[12px] text-[#9CA3AF]">
              Reviewed on {new Date(sub.reviewed_at).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}

          {sub.rejection_reason && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span><span className="font-medium">Rejection reason: </span>{sub.rejection_reason}</span>
            </div>
          )}

          <div className="border-t border-[#F3F4F6] pt-4">
            {actionError && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {actionError}
              </div>
            )}
            {!rejectMode ? (
              <div className="flex flex-wrap items-center gap-3">
                {sub.status !== "verified" && (
                  <button type="button" onClick={() => handleAction("approve")} disabled={acting}
                    className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50">
                    {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {sub.status === "rejected" ? "Override to Verified" : "Approve"}
                  </button>
                )}
                {sub.status !== "rejected" && (
                  <button type="button" onClick={() => setRejectMode(true)} disabled={acting}
                    className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">
                    <X className="h-3.5 w-3.5" />
                    {sub.status === "verified" ? "Revoke verification" : "Reject"}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection (will be shown to user)..." rows={2}
                  className="w-full resize-none rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 text-[13px] text-[#111827] outline-none focus:border-[#111827]" />
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => handleAction("reject")} disabled={acting || !rejectionReason.trim()}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50">
                    {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Confirm rejection
                  </button>
                  <button type="button" onClick={() => { setRejectMode(false); setRejectionReason(""); setActionError(null); }}
                    className="text-[13px] text-[#6B7280] hover:text-[#111827]">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KYC Section ─────────────────────────────────────────────────────────────

function KycSection({ showToast }: { showToast: (msg: string) => void }) {
  const [tab, setTab] = useState<KycStatus>("pending");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ pending: 0, verified: 0, rejected: 0 });
  const [search, setSearch] = useState("");

  async function fetchSubmissions(status: KycStatus, opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/kyc?status=${status}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSubmissions(data.submissions ?? []);
    } catch {
      setLoadError("Couldn't load submissions. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCounts() {
    try {
      const statuses: KycStatus[] = ["pending", "verified", "rejected"];
      const results = await Promise.all(
        statuses.map((s) =>
          fetch(`/api/admin/kyc?status=${s}`).then((r) => r.json()).then((d) => ({ status: s, count: (d.submissions ?? []).length }))
        )
      );
      const c = { pending: 0, verified: 0, rejected: 0 };
      results.forEach(({ status, count }) => { c[status] = count; });
      setCounts(c);
    } catch { /* non-critical */ }
  }

  useEffect(() => { fetchCounts(); }, []);
  useEffect(() => { fetchSubmissions(tab); }, [tab]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchSubmissions(tab, { silent: true }), fetchCounts()]);
    setRefreshing(false);
  }

  async function handleAction(userId: string, action: "approve" | "reject", reason?: string) {
    try {
      const res = await fetch("/api/admin/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, rejectionReason: reason }),
      });
      if (!res.ok) throw new Error();
      await fetchSubmissions(tab, { silent: true });
      await fetchCounts();
      showToast(action === "approve" ? "Approved — user notified" : "Rejected — user notified");
      return true;
    } catch {
      return false;
    }
  }

  const tabs: { key: KycStatus; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "verified", label: "Verified" },
    { key: "rejected", label: "Rejected" },
  ];

  const filtered = search.trim()
    ? submissions.filter((s) => {
        const q = search.toLowerCase();
        return s.full_name?.toLowerCase().includes(q) || s.country?.toLowerCase().includes(q) || s.doc_type?.toLowerCase().includes(q);
      })
    : submissions;

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Pending review", count: counts.pending, color: "text-amber-600" },
          { label: "Verified", count: counts.verified, color: "text-[#1a6b3c]" },
          { label: "Rejected", count: counts.rejected, color: "text-red-600" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#E5E5E2] bg-white p-4 shadow-sm">
            <p className={"text-[24px] font-extrabold " + card.color}>{card.count}</p>
            <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit gap-1 rounded-xl border border-[#E5E5E2] bg-white p-1">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={"rounded-lg px-4 py-2 text-[13px] font-medium transition-colors " + (tab === t.key ? "bg-[#111827] text-white" : "text-[#6B7280] hover:text-[#111827]")}>
              {t.label}
              <span className={"ml-1.5 text-[11px] " + (tab === t.key ? "text-white/60" : "text-[#9CA3AF]")}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, country, document..."
              className="w-56 rounded-lg border border-[#E5E5E2] bg-white py-2 pl-9 pr-3 text-[13px] text-[#111827] outline-none focus:border-[#111827]" />
          </div>
          <button type="button" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E2] bg-white text-[#6B7280] hover:text-[#111827] disabled:opacity-50">
            <RefreshCw className={"h-3.5 w-3.5 " + (refreshing ? "animate-spin" : "")} />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" /> {loadError}</span>
          <button type="button" onClick={() => fetchSubmissions(tab)} className="font-medium underline underline-offset-2 hover:text-red-800">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E2] text-center">
          <Eye className="h-5 w-5 text-[#D1D5DB]" />
          <p className="text-[13px] text-[#9CA3AF]">
            {search.trim() ? `No ${tab} submissions match "${search}"` : `No ${tab} submissions`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => <SubmissionRow key={sub.id} sub={sub} onAction={handleAction} />)}
        </div>
      )}
    </div>
  );
}

// ─── Deposits: Row ────────────────────────────────────────────────────────────

function DepositRow({
  dep,
  onAction,
}: {
  dep: Deposit;
  onAction: (depositId: string, userId: string, action: "approve" | "reject", reason?: string) => Promise<true | string>;
}) {
  const [acting, setActing] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const initials = (dep.full_name ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  async function handleAction(action: "approve" | "reject") {
    setActing(true);
    setActionError(null);
    const result = await onAction(dep.id, dep.user_id, action, action === "reject" ? rejectionReason : undefined);
    setActing(false);
    if (result === true) { setRejectMode(false); setRejectionReason(""); }
    else setActionError(result);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[12px] font-bold text-white">
            {initials}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">{dep.full_name ?? "Unknown user"}</p>
            <p className="text-[12px] text-[#9CA3AF]">{dep.email ?? dep.user_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[15px] font-bold text-[#111827]">
              ${Number(dep.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-[#9CA3AF]">
              {new Date(dep.submitted_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <DepositStatusBadge status={dep.status} />
        </div>
      </div>

      {dep.status === "rejected" && dep.rejection_reason && (
        <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><span className="font-medium">Reason: </span>{dep.rejection_reason}</span>
        </div>
      )}

      {dep.status === "pending" && (
        <div className="border-t border-[#F3F4F6] px-5 py-4">
          {actionError && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {actionError}
            </div>
          )}
          {!rejectMode ? (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => handleAction("approve")} disabled={acting}
                className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50">
                {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Approve
              </button>
              <button type="button" onClick={() => setRejectMode(true)} disabled={acting}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (will be shown to user)..." rows={2}
                className="w-full resize-none rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 text-[13px] text-[#111827] outline-none focus:border-[#111827]" />
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => handleAction("reject")} disabled={acting || !rejectionReason.trim()}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50">
                  {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  Confirm rejection
                </button>
                <button type="button" onClick={() => { setRejectMode(false); setRejectionReason(""); setActionError(null); }}
                  className="text-[13px] text-[#6B7280] hover:text-[#111827]">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Deposits Section ─────────────────────────────────────────────────────────

function DepositsSection({ showToast }: { showToast: (msg: string) => void }) {
  const [tab, setTab] = useState<DepositStatus>("pending");
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });

  async function fetchDeposits(status: DepositStatus, opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/deposits?status=${status}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDeposits(data.deposits ?? []);
    } catch {
      setLoadError("Couldn't load deposits. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCounts() {
    try {
      const statuses: DepositStatus[] = ["pending", "approved", "rejected"];
      const results = await Promise.all(
        statuses.map((s) =>
          fetch(`/api/admin/deposits?status=${s}`).then((r) => r.json()).then((d) => ({ status: s, count: (d.deposits ?? []).length }))
        )
      );
      const c = { pending: 0, approved: 0, rejected: 0 };
      results.forEach(({ status, count }) => { c[status] = count; });
      setCounts(c);
    } catch { /* non-critical */ }
  }

  useEffect(() => { fetchCounts(); }, []);
  useEffect(() => { fetchDeposits(tab); }, [tab]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchDeposits(tab, { silent: true }), fetchCounts()]);
    setRefreshing(false);
  }

  async function handleAction(depositId: string, userId: string, action: "approve" | "reject", reason?: string): Promise<true | string> {
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId, userId, action, rejectionReason: reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong — please try again.");
      await fetchDeposits(tab, { silent: true });
      await fetchCounts();
      showToast(action === "approve" ? "Deposit approved — balance updated" : "Deposit rejected — user notified");
      return true;
    } catch (err) {
      return err instanceof Error ? err.message : "Something went wrong — please try again.";
    }
  }

  const tabs: { key: DepositStatus; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Pending review", count: counts.pending, color: "text-amber-600" },
          { label: "Approved", count: counts.approved, color: "text-[#1a6b3c]" },
          { label: "Rejected", count: counts.rejected, color: "text-red-600" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#E5E5E2] bg-white p-4 shadow-sm">
            <p className={"text-[24px] font-extrabold " + card.color}>{card.count}</p>
            <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit gap-1 rounded-xl border border-[#E5E5E2] bg-white p-1">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={"rounded-lg px-4 py-2 text-[13px] font-medium transition-colors " + (tab === t.key ? "bg-[#111827] text-white" : "text-[#6B7280] hover:text-[#111827]")}>
              {t.label}
              <span className={"ml-1.5 text-[11px] " + (tab === t.key ? "text-white/60" : "text-[#9CA3AF]")}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E2] bg-white text-[#6B7280] hover:text-[#111827] disabled:opacity-50">
          <RefreshCw className={"h-3.5 w-3.5 " + (refreshing ? "animate-spin" : "")} />
        </button>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" /> {loadError}</span>
          <button type="button" onClick={() => fetchDeposits(tab)} className="font-medium underline underline-offset-2 hover:text-red-800">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" /></div>
      ) : deposits.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E2] text-center">
          <Wallet className="h-5 w-5 text-[#D1D5DB]" />
          <p className="text-[13px] text-[#9CA3AF]">No {tab} deposits</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deposits.map((d) => <DepositRow key={d.id} dep={d} onAction={handleAction} />)}
        </div>
      )}
    </div>
  );
}

// ─── Withdrawals ──────────────────────────────────────────────────────────────

function WithdrawalRow({
  w,
  onAction,
}: {
  w: Withdrawal;
  onAction: (id: string, userId: string, action: "approve" | "reject", reason?: string) => Promise<true | string>;
}) {
  const [acting, setActing] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const initials = (w.full_name ?? "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  async function handleAction(action: "approve" | "reject") {
    setActing(true);
    setActionError(null);
    const result = await onAction(w.id, w.user_id, action, action === "reject" ? rejectionReason : undefined);
    setActing(false);
    if (result === true) { setRejectMode(false); setRejectionReason(""); }
    else setActionError(result);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[12px] font-bold text-white">
            {initials}
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">{w.full_name ?? "Unknown user"}</p>
            <p className="text-[12px] text-[#9CA3AF]">{w.email ?? w.user_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[15px] font-bold text-[#111827]">
              ${Number(w.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-[#9CA3AF]">
              {new Date(w.submitted_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <DepositStatusBadge status={w.status} />
        </div>
      </div>

      {w.status === "rejected" && w.rejection_reason && (
        <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><span className="font-medium">Reason: </span>{w.rejection_reason}</span>
        </div>
      )}

      {w.status === "pending" && (
        <div className="border-t border-[#F3F4F6] px-5 py-4">
          {actionError && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {actionError}
            </div>
          )}
          {!rejectMode ? (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => handleAction("approve")} disabled={acting}
                className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50">
                {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Approve
              </button>
              <button type="button" onClick={() => setRejectMode(true)} disabled={acting}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (will be shown to user)..." rows={2}
                className="w-full resize-none rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 text-[13px] text-[#111827] outline-none focus:border-[#111827]" />
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => handleAction("reject")} disabled={acting || !rejectionReason.trim()}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50">
                  {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  Confirm rejection
                </button>
                <button type="button" onClick={() => { setRejectMode(false); setRejectionReason(""); setActionError(null); }}
                  className="text-[13px] text-[#6B7280] hover:text-[#111827]">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WithdrawalsSection({ showToast }: { showToast: (msg: string) => void }) {
  const [tab, setTab] = useState<WithdrawalStatus>("pending");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });

  async function fetchWithdrawals(status: WithdrawalStatus, opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/withdrawals?status=${status}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setWithdrawals(data.withdrawals ?? []);
    } catch {
      setLoadError("Couldn't load withdrawals. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCounts() {
    try {
      const statuses: WithdrawalStatus[] = ["pending", "approved", "rejected"];
      const results = await Promise.all(
        statuses.map((s) =>
          fetch(`/api/admin/withdrawals?status=${s}`).then((r) => r.json()).then((d) => ({ status: s, count: (d.withdrawals ?? []).length }))
        )
      );
      const c = { pending: 0, approved: 0, rejected: 0 };
      results.forEach(({ status, count }) => { c[status] = count; });
      setCounts(c);
    } catch { /* non-critical */ }
  }

  useEffect(() => { fetchCounts(); }, []);
  useEffect(() => { fetchWithdrawals(tab); }, [tab]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchWithdrawals(tab, { silent: true }), fetchCounts()]);
    setRefreshing(false);
  }

  async function handleAction(withdrawalId: string, userId: string, action: "approve" | "reject", reason?: string): Promise<true | string> {
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, userId, action, rejectionReason: reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      await fetchWithdrawals(tab, { silent: true });
      await fetchCounts();
      showToast(action === "approve" ? "Withdrawal approved — balance debited" : "Withdrawal rejected — user notified");
      return true;
    } catch (err) {
      return err instanceof Error ? err.message : "Something went wrong.";
    }
  }

  const tabs: { key: WithdrawalStatus; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Pending review", count: counts.pending, color: "text-amber-600" },
          { label: "Approved", count: counts.approved, color: "text-[#1a6b3c]" },
          { label: "Rejected", count: counts.rejected, color: "text-red-600" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#E5E5E2] bg-white p-4 shadow-sm">
            <p className={"text-[24px] font-extrabold " + card.color}>{card.count}</p>
            <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit gap-1 rounded-xl border border-[#E5E5E2] bg-white p-1">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={"rounded-lg px-4 py-2 text-[13px] font-medium transition-colors " + (tab === t.key ? "bg-[#111827] text-white" : "text-[#6B7280] hover:text-[#111827]")}>
              {t.label}
              <span className={"ml-1.5 text-[11px] " + (tab === t.key ? "text-white/60" : "text-[#9CA3AF]")}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E2] bg-white text-[#6B7280] hover:text-[#111827] disabled:opacity-50">
          <RefreshCw className={"h-3.5 w-3.5 " + (refreshing ? "animate-spin" : "")} />
        </button>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" /> {loadError}</span>
          <button type="button" onClick={() => fetchWithdrawals(tab)} className="font-medium underline underline-offset-2 hover:text-red-800">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" /></div>
      ) : withdrawals.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E2] text-center">
          <Wallet className="h-5 w-5 text-[#D1D5DB]" />
          <p className="text-[13px] text-[#9CA3AF]">No {tab} withdrawals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w) => <WithdrawalRow key={w.id} w={w} onAction={handleAction} />)}
        </div>
      )}
    </div>
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────

function UserPicker({ users, selected, onSelect }: { users: UserProfile[]; selected: UserProfile | null; onSelect: (u: UserProfile) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = query.trim()
    ? users.filter((u) => u.full_name?.toLowerCase().includes(query.toLowerCase()) || u.email?.toLowerCase().includes(query.toLowerCase()))
    : users;

  function pick(u: UserProfile) { onSelect(u); setQuery(""); setOpen(false); }

  return (
    <div className="relative">
      <div onClick={() => setOpen((v) => !v)}
        className={"flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3.5 py-2.5 " + (open ? "border-[#111827]" : "border-[#E5E5E2] hover:border-[#9CA3AF]")}>
        {selected ? (
          <div className="flex flex-1 items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[10px] font-bold text-white">
              {(selected.full_name ?? "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[#111827]">{selected.full_name ?? "Unknown"}</p>
              <p className="truncate text-[11px] text-[#9CA3AF]">{selected.email ?? ""}</p>
            </div>
          </div>
        ) : (
          <p className="flex-1 text-[13px] text-[#9CA3AF]">Select a user…</p>
        )}
        <ChevronDown className={"h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform " + (open ? "rotate-180" : "")} />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-[#E5E5E2] bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-[#F3F4F6] px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#9CA3AF]" />
            <input autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="flex-1 bg-transparent text-[13px] text-[#111827] outline-none placeholder:text-[#9CA3AF]" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-center text-[12px] text-[#9CA3AF]">No users found</p>
            ) : filtered.map((u) => (
              <button key={u.id} type="button" onClick={() => pick(u)}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-[#F7F7F5]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[11px] font-bold text-white">
                  {(u.full_name ?? "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[#111827]">{u.full_name ?? "Unknown"}</p>
                  <p className="truncate text-[11px] text-[#9CA3AF]">{u.email ?? u.id}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MessagesSection({ showToast }: { showToast: (msg: string) => void }) {
  type MsgTab = "single" | "broadcast";
  const [msgTab, setMsgTab] = useState<MsgTab>("single");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/messages")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .finally(() => setLoadingUsers(false));
  }, []);

  function reset() { setTitle(""); setMessage(""); setSelectedUser(null); setResult(null); }

  async function handleSend() {
    if (!title.trim() || !message.trim()) return;
    if (msgTab === "single" && !selectedUser) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: msgTab === "single" ? "user" : "all",
          userId: msgTab === "single" ? selectedUser?.id : undefined,
          title: title.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      const successText = msgTab === "single"
        ? `Message sent to ${selectedUser?.full_name ?? "user"}.`
        : `Broadcast sent to ${data.sent} user${data.sent !== 1 ? "s" : ""}.`;
      setResult({ ok: true, text: successText });
      showToast(successText);
      setTitle(""); setMessage(""); setSelectedUser(null);
    } catch (err: unknown) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSending(false);
    }
  }

  const canSend = title.trim().length > 0 && message.trim().length > 0 && (msgTab === "broadcast" || selectedUser !== null);

  return (
    <div>
      <div className="mb-6 flex gap-3">
        {([
          { key: "single" as MsgTab, icon: User, label: "Single user", description: "Send to one specific user" },
          { key: "broadcast" as MsgTab, icon: Users, label: "Broadcast", description: "Send to all users at once" },
        ]).map(({ key, icon: Icon, label, description }) => (
          <button key={key} type="button" onClick={() => { setMsgTab(key); reset(); }}
            className={"flex flex-1 items-start gap-3 rounded-xl border p-4 text-left transition-all " + (msgTab === key ? "border-[#111827] bg-[#111827] text-white" : "border-[#E5E5E2] bg-white text-[#6B7280] hover:border-[#111827] hover:text-[#111827]")}>
            <Icon className={"mt-0.5 h-4 w-4 shrink-0 " + (msgTab === key ? "text-white" : "")} />
            <div>
              <p className={"text-[13px] font-semibold " + (msgTab === key ? "text-white" : "text-[#111827]")}>{label}</p>
              <p className={"mt-0.5 text-[12px] " + (msgTab === key ? "text-white/60" : "text-[#9CA3AF]")}>{description}</p>
            </div>
          </button>
        ))}
      </div>

      {!loadingUsers && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#E5E5E2] bg-white px-4 py-3">
          <Users className="h-4 w-4 text-[#9CA3AF]" />
          <p className="text-[13px] text-[#6B7280]">
            <span className="font-semibold text-[#111827]">{users.length}</span> total users
            {msgTab === "broadcast" && <span className="ml-1 text-[#9CA3AF]">— broadcast reaches all of them</span>}
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white shadow-sm">
        <div className="border-b border-[#F3F4F6] px-5 py-4">
          <p className="text-[13px] font-semibold text-[#111827]">
            {msgTab === "single" ? "Compose message" : "Compose broadcast"}
          </p>
        </div>
        <div className="space-y-4 p-5">
          {msgTab === "single" && (
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#6B7280]">Recipient</label>
              {loadingUsers
                ? <div className="flex h-10 items-center gap-2 text-[13px] text-[#9CA3AF]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading users…</div>
                : <UserPicker users={users} selected={selectedUser} onSelect={setSelectedUser} />
              }
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[#6B7280]">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={msgTab === "single" ? "e.g. Action required on your account" : "e.g. Platform maintenance scheduled"}
              className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 text-[13px] text-[#111827] outline-none focus:border-[#111827] focus:bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[#6B7280]">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
              placeholder={msgTab === "single" ? "Write your message to this user…" : "Write your announcement to all users…"}
              className="w-full resize-none rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 text-[13px] text-[#111827] outline-none focus:border-[#111827] focus:bg-white" />
            <p className="text-right text-[11px] text-[#9CA3AF]">{message.length} characters</p>
          </div>

          {result && (
            <div className={"flex items-start gap-2 rounded-lg border px-3.5 py-3 text-[13px] " + (result.ok ? "border-green-200 bg-[#F0F7F2] text-[#1a6b3c]" : "border-red-200 bg-red-50 text-red-700")}>
              {result.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              {result.text}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {msgTab === "broadcast" && <p className="text-[12px] text-[#9CA3AF]">⚠️ This will notify every user immediately.</p>}
            <button type="button" onClick={handleSend} disabled={!canSend || sending}
              className={"ml-auto flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-medium text-white transition-opacity disabled:opacity-40 " + (msgTab === "broadcast" ? "bg-[#111827]" : "bg-[#1a6b3c]")}>
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {msgTab === "single" ? "Send message" : `Broadcast to ${users.length} users`}
            </button>
          </div>
        </div>
      </div>

      {(title || message) && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-dashed border-[#E5E5E2] bg-white p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Preview — how it appears in the user's bell</p>
          <div className="flex gap-3">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" />
            <div>
              <p className="text-[13px] font-medium text-[#111827]">{title || <span className="text-[#9CA3AF]">Title…</span>}</p>
              <p className="mt-0.5 text-[12px] text-[#6B7280]">{message || <span className="text-[#9CA3AF]">Your message…</span>}</p>
              <p className="mt-1 text-[11px] text-[#9CA3AF]">Just now</p>
            </div>
            <span className="ml-auto mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#1a6b3c]" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Prices: Asset Row ────────────────────────────────────────────────────────

function assetTypeBadge(type: AssetRow["assetType"]) {
  const styles: Record<AssetRow["assetType"], string> = {
    stock:  "bg-blue-50 text-blue-700",
    etf:    "bg-purple-50 text-purple-700",
    crypto: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={"inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide " + styles[type]}>
      {type}
    </span>
  );
}

function numField(
  label: string,
  value: string,
  placeholder: string,
  onChange: (v: string) => void,
  hint?: string,
) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-[#9CA3AF]">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step="any"
        className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3 py-2 text-[13px] text-[#111827] outline-none focus:border-[#111827] focus:bg-white"
      />
      {hint && <p className="text-[11px] text-[#9CA3AF]">{hint}</p>}
    </div>
  );
}

function PriceAssetRow({
  asset,
  onSave,
  onReset,
}: {
  asset: AssetRow;
  onSave: (symbol: string, draft: AssetDraft) => Promise<string | null>;
  onReset: (symbol: string) => Promise<string | null>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [draft, setDraft] = useState<AssetDraft>({
    floor:      String(asset.floor),
    ceiling:    String(asset.ceiling),
    startPrice: String(asset.startPrice),
    volatility: asset.volatility != null ? String(asset.volatility) : "",
    reversion:  asset.reversion  != null ? String(asset.reversion)  : "",
    drift:      asset.drift      != null ? String(asset.drift)      : "",
  });

  function set(key: keyof AssetDraft) {
    return (v: string) => setDraft((d) => ({ ...d, [key]: v }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const err = await onSave(asset.symbol, draft);
    setSaving(false);
    if (err) setError(err);
    else { setSuccess(true); setTimeout(() => setSuccess(false), 2500); }
  }

  async function handleReset() {
    setResetting(true);
    setError(null);
    const err = await onReset(asset.symbol);
    setResetting(false);
    if (err) { setError(err); return; }
    setDraft({
      floor:      String(asset.defaults.floor),
      ceiling:    String(asset.defaults.ceiling),
      startPrice: String(asset.defaults.startPrice),
      volatility: "",
      reversion:  "",
      drift:      "",
    });
  }

  // Drift display: show signed percentage-ish label
  const driftLabel = (() => {
    const v = parseFloat(draft.drift);
    if (!draft.drift || isNaN(v) || v === 0) return null;
    return v > 0
      ? <span className="text-[11px] font-medium text-[#1a6b3c]">↑ bullish</span>
      : <span className="text-[11px] font-medium text-red-500">↓ bearish</span>;
  })();

  return (
    <div className={"overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors " + (asset.hasOverride ? "border-[#1a6b3c]/30" : "border-[#E5E5E2]")}>
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#111827] text-[11px] font-bold text-white">
            {asset.symbol.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-[#111827]">{asset.symbol}</p>
              {assetTypeBadge(asset.assetType)}
              {asset.hasOverride && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F7F2] px-2 py-0.5 text-[11px] font-medium text-[#1a6b3c]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1a6b3c]" /> overridden
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#9CA3AF]">
  Min ${asset.floor} – Max ${asset.ceiling} · starts at ${asset.startPrice}
</p>
          </div>
        </div>
        <button type="button" onClick={() => setExpanded((v) => !v)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] text-[#6B7280] hover:bg-[#EEEEEC]">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#F3F4F6] px-4 pb-5 pt-4 space-y-5">
         
          {/* Price band */}
<div>
  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Price Range</p>
  <div className="grid grid-cols-3 gap-3">
    {numField("Minimum Price ($)", draft.floor, String(asset.defaults.floor), set("floor"),
      "Price will never drop below this")}
    {numField("Maximum Price ($)", draft.ceiling, String(asset.defaults.ceiling), set("ceiling"),
      "Price will never rise above this")}
    {numField("Starting Price ($)", draft.startPrice, String(asset.defaults.startPrice), set("startPrice"),
      "Price at the start of each trading day")}
  </div>
</div>

{/* Simulation params */}
<div>
  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Price Behavior</p>
  <div className="grid grid-cols-3 gap-3">
    {numField("Price Swings", draft.volatility, "auto", set("volatility"),
      "How much the price fluctuates — leave blank for default (stocks: low, crypto: high)")}
    {numField("Stability", draft.reversion, "auto", set("reversion"),
      "How strongly the price pulls back toward the middle — leave blank for default")}
    <div className="space-y-1">
      {numField("Trend Bias", draft.drift, "0 (neutral)", set("drift"),
        "Positive = upward trend · Negative = downward trend · 0 = no bias")}
      {driftLabel}
    </div>
  </div>
</div>

          {/* Error / success */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-[#F0F7F2] px-3.5 py-2.5 text-[13px] text-[#1a6b3c]">
              <Check className="h-4 w-4 shrink-0" /> Saved — takes effect on the next price poll.
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 border-t border-[#F3F4F6] pt-4">
  <button type="button" onClick={handleSave} disabled={saving || resetting}
    className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50">
    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
    Apply Changes
  </button>
  {asset.hasOverride && (
    <button type="button" onClick={handleReset} disabled={saving || resetting}
      className="flex items-center gap-2 rounded-lg border border-[#E5E5E2] bg-white px-4 py-2 text-[13px] font-medium text-[#6B7280] hover:border-red-200 hover:text-red-600 disabled:opacity-50">
      {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
      Restore Defaults
    </button>
  )}
</div>
        </div>
      )}
    </div>
  );
}

// ─── Prices Section ───────────────────────────────────────────────────────────

function PricesSection({ showToast }: { showToast: (msg: string) => void }) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "stock" | "etf" | "crypto">("all");
  const [search, setSearch] = useState("");

  const fetchAssets = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/prices");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAssets(data.assets ?? []);
    } catch {
      setLoadError("Couldn't load assets. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchAssets({ silent: true });
    setRefreshing(false);
  }

  async function handleSave(symbol: string, draft: AssetDraft): Promise<string | null> {
    const parse = (v: string) => v.trim() === "" ? null : parseFloat(v);
    try {
      const res = await fetch("/api/admin/prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          floor:      parse(draft.floor),
          ceiling:    parse(draft.ceiling),
          startPrice: parse(draft.startPrice),
          volatility: parse(draft.volatility),
          reversion:  parse(draft.reversion),
          drift:      parse(draft.drift),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "Something went wrong.";
      await fetchAssets({ silent: true });
      showToast(`${symbol} price controls saved`);
      return null;
    } catch {
      return "Something went wrong.";
    }
  }

  async function handleReset(symbol: string): Promise<string | null> {
    try {
      const res = await fetch("/api/admin/prices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "Something went wrong.";
      await fetchAssets({ silent: true });
      showToast(`${symbol} reset to defaults`);
      return null;
    } catch {
      return "Something went wrong.";
    }
  }

  const overrideCount = assets.filter((a) => a.hasOverride).length;

  const filtered = assets.filter((a) => {
    if (filterType !== "all" && a.assetType !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Total assets", count: assets.length, color: "text-[#111827]" },
          { label: "With overrides", count: overrideCount, color: "text-[#1a6b3c]" },
          { label: "Using defaults", count: assets.length - overrideCount, color: "text-[#9CA3AF]" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#E5E5E2] bg-white p-4 shadow-sm">
            <p className={"text-[24px] font-extrabold " + card.color}>{card.count}</p>
            <p className="mt-0.5 text-[12px] text-[#9CA3AF]">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit gap-1 rounded-xl border border-[#E5E5E2] bg-white p-1">
          {(["all", "stock", "etf", "crypto"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setFilterType(t)}
              className={"rounded-lg px-4 py-2 text-[13px] font-medium capitalize transition-colors " + (filterType === t ? "bg-[#111827] text-white" : "text-[#6B7280] hover:text-[#111827]")}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or name…"
              className="w-48 rounded-lg border border-[#E5E5E2] bg-white py-2 pl-9 pr-3 text-[13px] text-[#111827] outline-none focus:border-[#111827]" />
          </div>
          <button type="button" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E2] bg-white text-[#6B7280] hover:text-[#111827] disabled:opacity-50">
            <RefreshCw className={"h-3.5 w-3.5 " + (refreshing ? "animate-spin" : "")} />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" /> {loadError}</span>
          <button type="button" onClick={() => fetchAssets()} className="font-medium underline underline-offset-2 hover:text-red-800">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E2] text-center">
          <TrendingUp className="h-5 w-5 text-[#D1D5DB]" />
          <p className="text-[13px] text-[#9CA3AF]">No assets match your filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <PriceAssetRow key={a.symbol} asset={a} onSave={handleSave} onReset={handleReset} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const [section, setSection] = useState<AdminSection>("kyc");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const nav: { key: AdminSection; icon: React.ElementType; label: string }[] = [
    { key: "kyc",         icon: ShieldCheck,    label: "KYC Review"  },
    { key: "deposits",    icon: Wallet,          label: "Deposits"    },
    { key: "withdrawals", icon: ArrowUp,         label: "Withdrawals" },
    { key: "messages",    icon: MessageSquare,   label: "Messages"    },
    { key: "prices",      icon: TrendingUp,      label: "Prices"      },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      <header className="border-b border-[#E5E5E2] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-5 w-5 text-[#1a6b3c]" />
            <div>
              <h1 className="text-[18px] font-extrabold tracking-tight text-[#111827]">Admin Panel</h1>
              <p className="text-[12px] text-[#9CA3AF]">Apex Capital</p>
            </div>
          </div>
          <div className="flex gap-1 rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-1">
            {nav.map(({ key, icon: Icon, label }) => (
              <button key={key} type="button" onClick={() => setSection(key)}
                className={"flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors " + (section === key ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]")}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
        {section === "kyc"         && <KycSection         showToast={showToast} />}
        {section === "deposits"    && <DepositsSection    showToast={showToast} />}
        {section === "withdrawals" && <WithdrawalsSection showToast={showToast} />}
        {section === "messages"    && <MessagesSection    showToast={showToast} />}
        {section === "prices"      && <PricesSection      showToast={showToast} />}
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-[#E5E5E2] bg-white px-4 py-3 text-[13px] font-medium text-[#111827] shadow-lg">
          <Check className="h-4 w-4 text-[#1a6b3c]" /> {toast}
        </div>
      )}
    </div>
  );
}