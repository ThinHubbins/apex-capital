"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck, ShieldAlert, Clock, Eye, Check, X,
  Loader2, ChevronDown, ChevronUp, User, FileText,
  Camera, AlertCircle, Search, RefreshCw,
} from "lucide-react";

type KycStatus = "pending" | "verified" | "rejected";

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

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] text-[#9CA3AF]">{label}</p>
      <p className="mt-0.5 text-[13px] font-medium text-[#111827]">{value || "—"}</p>
    </div>
  );
}

function ImageBox({ url, alt, className }: { url: string | null; alt: string; className: string }) {
  if (!url) {
    return (
      <div className={"flex items-center justify-center border border-dashed border-[#E5E5E2] bg-[#F7F7F5] " + className}>
        <p className="text-[12px] text-[#9CA3AF]">Not uploaded</p>
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <img src={url} alt={alt} className={"object-cover transition-opacity hover:opacity-90 " + className} />
    </a>
  );
}

function SelfieBox({ url }: { url: string | null }) {
  if (!url) {
    return <p className="text-[13px] text-[#9CA3AF]">No selfie submitted</p>;
  }
  return (
    <div className="flex items-center gap-4">
      <a href={url} target="_blank" rel="noopener noreferrer" className="block shrink-0">
        <img
          src={url}
          alt="Selfie"
          className="h-24 w-24 rounded-full border-2 border-[#E5E5E2] object-cover transition-opacity hover:opacity-90"
        />
      </a>
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#1a6b3c]">
        <Check className="h-4 w-4" /> Liveness check completed
      </p>
    </div>
  );
}

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
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleAction(action: "approve" | "reject") {
    setActing(true);
    setActionError(null);
    const ok = await onAction(sub.user_id, action, action === "reject" ? rejectionReason : undefined);
    setActing(false);
    if (ok) {
      setRejectMode(false);
      setRejectionReason("");
    } else {
      setActionError("Something went wrong — please try again.");
    }
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
              {new Date(sub.submitted_at).toLocaleDateString("en-US", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={sub.status} />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] text-[#6B7280] hover:bg-[#EEEEEC]"
          >
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
              Reviewed on{" "}
              {new Date(sub.reviewed_at).toLocaleDateString("en-US", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          )}

          {sub.rejection_reason && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="font-medium">Rejection reason: </span>
                {sub.rejection_reason}
              </span>
            </div>
          )}

          <div className="border-t border-[#F3F4F6] pt-4">
            {actionError && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {actionError}
              </div>
            )}
            {!rejectMode ? (
              <div className="flex flex-wrap items-center gap-3">
                {sub.status !== "verified" && (
                  <button
                    type="button"
                    onClick={() => handleAction("approve")}
                    disabled={acting}
                    className="flex items-center gap-2 rounded-lg bg-[#1a6b3c] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {sub.status === "rejected" ? "Override to Verified" : "Approve"}
                  </button>
                )}
                {sub.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => setRejectMode(true)}
                    disabled={acting}
                    className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    {sub.status === "verified" ? "Revoke verification" : "Reject"}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection (will be shown to user)..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5 text-[13px] text-[#111827] outline-none focus:border-[#111827]"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAction("reject")}
                    disabled={acting || !rejectionReason.trim()}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRejectMode(false); setRejectionReason(""); setActionError(null); }}
                    className="text-[13px] text-[#6B7280] hover:text-[#111827]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminKycPage() {
  const [tab, setTab] = useState<KycStatus>("pending");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ pending: 0, verified: 0, rejected: 0 });
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchSubmissions(status: KycStatus, opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/kyc?status=${status}`);
      if (!res.ok) throw new Error("Failed to load submissions");
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
          fetch(`/api/admin/kyc?status=${s}`)
            .then((r) => r.json())
            .then((d) => ({ status: s, count: (d.submissions ?? []).length }))
        )
      );
      const c = { pending: 0, verified: 0, rejected: 0 };
      results.forEach(({ status, count }) => { c[status] = count; });
      setCounts(c);
    } catch {
      // Counts are non-critical — leave previous values on screen.
    }
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
      if (!res.ok) throw new Error("Action failed");
      await fetchSubmissions(tab, { silent: true });
      await fetchCounts();
      showToast(
        action === "approve" ? "Submission approved — user notified" : "Submission rejected — user notified"
      );
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

  const filteredSubmissions = search.trim()
    ? submissions.filter((s) => {
        const q = search.trim().toLowerCase();
        return (
          s.full_name?.toLowerCase().includes(q) ||
          s.country?.toLowerCase().includes(q) ||
          s.doc_type?.toLowerCase().includes(q)
        );
      })
    : submissions;

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      <header className="border-b border-[#E5E5E2] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4 lg:px-10">
          <div>
            <h1 className="text-[18px] font-extrabold tracking-tight text-[#111827]">KYC Admin</h1>
            <p className="text-[12px] text-[#9CA3AF]">Apex Capital · Identity review</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-[#1a6b3c]" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 lg:px-10">
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
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={"rounded-lg px-4 py-2 text-[13px] font-medium transition-colors " + (tab === t.key ? "bg-[#111827] text-white" : "text-[#6B7280] hover:text-[#111827]")}
              >
                {t.label}
                <span className={"ml-1.5 text-[11px] " + (tab === t.key ? "text-white/60" : "text-[#9CA3AF]")}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, country, document..."
                className="w-64 rounded-lg border border-[#E5E5E2] bg-white py-2 pl-9 pr-3 text-[13px] text-[#111827] outline-none focus:border-[#111827]"
              />
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E2] bg-white text-[#6B7280] hover:text-[#111827] disabled:opacity-50"
            >
              <RefreshCw className={"h-3.5 w-3.5 " + (refreshing ? "animate-spin" : "")} />
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> {loadError}
            </span>
            <button
              type="button"
              onClick={() => fetchSubmissions(tab)}
              className="font-medium underline underline-offset-2 hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E2] text-center">
            <Eye className="h-5 w-5 text-[#D1D5DB]" />
            <p className="text-[13px] text-[#9CA3AF]">
              {search.trim() ? `No ${tab} submissions match "${search.trim()}"` : `No ${tab} submissions`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubmissions.map((sub) => (
              <SubmissionRow key={sub.id} sub={sub} onAction={handleAction} />
            ))}
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-[#E5E5E2] bg-white px-4 py-3 text-[13px] font-medium text-[#111827] shadow-lg">
          <Check className="h-4 w-4 text-[#1a6b3c]" />
          {toast}
        </div>
      )}
    </div>
  );
}