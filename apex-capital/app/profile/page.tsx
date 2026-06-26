"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, ShieldAlert, Clock, Camera, Pencil, Check, X,
  Lock, Smartphone, Globe2, LogOut, ChevronRight, Mail, Loader2,
  Bell, TrendingUp, Megaphone, AlertTriangle,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import { createClient } from "../../lib/supabase/client";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────

type KycStatus = "unverified" | "pending" | "verified" | "rejected";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  kyc_status: KycStatus;
  created_at: string;
};

type NotifPrefs = {
  account_alerts: boolean;
  price_alerts: boolean;
  marketing: boolean;
};

// ─── KYC status config ─────────────────────────────────────────────

const KYC_CONFIG = {
  verified: {
    icon: ShieldCheck, iconBg: "bg-[#F0F7F2]", iconColor: "text-[#1a6b3c]",
    title: "Identity verified",
    desc: "You have full access to deposits, withdrawals, and trading.",
    cta: null,
  },
  pending: {
    icon: Clock, iconBg: "bg-amber-50", iconColor: "text-amber-600",
    title: "Verification under review",
    desc: "This usually takes less than 10 minutes. We'll email you when it's done.",
    cta: null,
  },
  rejected: {
    icon: ShieldAlert, iconBg: "bg-red-50", iconColor: "text-red-600",
    title: "Verification rejected",
    desc: "Your identity check was unsuccessful. Please try again with a clearer document.",
    cta: "Retry verification",
  },
  unverified: {
    icon: ShieldAlert, iconBg: "bg-[#F3F4F6]", iconColor: "text-[#6B7280]",
    title: "Identity not verified",
    desc: "Complete a quick 3-minute check to unlock deposits and trading.",
    cta: "Complete verification",
  },
} as const;

// ─── Building blocks ───────────────────────────────────────────────

function VerificationStatusCard({ status }: { status: KycStatus }) {
  const config = KYC_CONFIG[status];
  const Icon = config.icon;
  return (
    <div className="rounded-2xl border border-[#E5E5E2] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}>
            <Icon className={`h-5 w-5 ${config.iconColor}`} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold text-[#111827]">{config.title}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[#6B7280]">{config.desc}</p>
          </div>
        </div>
        {config.cta && (
          <a href="/kyc-flow" className="shrink-0 self-start rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90">
            {config.cta}
          </a>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E5E2] bg-white shadow-sm">
      <div className="border-b border-[#F3F4F6] px-4 py-4 sm:px-6">
        <h2 className="text-[15px] font-semibold text-[#111827]">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[13px] text-[#6B7280]">{description}</p>
        )}
      </div>
      <div className="px-4 py-4 sm:px-6">{children}</div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  description,
  checked,
  saving,
  onChange,
}: {
  icon: typeof Bell;
  iconBg: string;
  iconColor: string;
  label: string;
  description: string;
  checked: boolean;
  saving: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-4 sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-3.5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium text-[#111827]">{label}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-[#9CA3AF]">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9CA3AF]" />}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          disabled={saving}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            checked ? "bg-[#1a6b3c]" : "bg-[#D1D5DB]"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function LinkRow({
  icon: Icon,
  label,
  sublabel,
  danger,
  onClick,
}: {
  icon: typeof Lock;
  label: string;
  sublabel?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-3.5 text-left transition-colors hover:bg-[#F7F7F5] sm:gap-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            danger ? "bg-red-50" : "bg-[#F3F4F6]"
          }`}
        >
          <Icon
            className={`h-4 w-4 ${danger ? "text-red-600" : "text-[#6B7280]"}`}
            strokeWidth={1.75}
          />
        </span>
        <div className="min-w-0">
          <p
            className={`truncate text-[13.5px] font-medium ${
              danger ? "text-red-600" : "text-[#111827]"
            }`}
          >
            {label}
          </p>
          {sublabel && (
            <p className="mt-0.5 truncate text-[12px] text-[#9CA3AF]">{sublabel}</p>
          )}
        </div>
      </div>
      {!danger && <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" />}
    </button>
  );
}

function SavedToast({ visible }: { visible: boolean }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[280px] -translate-x-1/2 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
        <Check className="h-3.5 w-3.5 text-[#1a6b3c]" />
        Saved
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────

export default function ProfilePage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Core state ──
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Avatar ──
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // ── Username ──
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  // ── Notification prefs ──
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    account_alerts: true,
    price_alerts: true,
    marketing: false,
  });
  // Tracks which keys are currently in-flight — a Set instead of a single
  // value so toggling two switches back-to-back doesn't stomp each other's
  // saving/disabled state.
  const [savingPrefs, setSavingPrefs] = useState<Set<keyof NotifPrefs>>(new Set());

  // ── Toast ──
  const [savedToast, setSavedToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashToast() {
    setSavedToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSavedToast(false), 2200);
  }

  // ── Load profile + prefs ──
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setAuthEmail(user.email ?? null);

      const [profileRes, prefRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, kyc_status, created_at")
          .eq("id", user.id)
          .single(),
        supabase
          .from("notification_preferences")
          .select("account_alerts, price_alerts, marketing")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (profileRes.data) {
        setProfile({ ...profileRes.data, kyc_status: profileRes.data.kyc_status as KycStatus });
        setAvatarPreview(profileRes.data.avatar_url);
        setUsernameDraft(profileRes.data.username ?? "");
      }

      if (prefRes.data) {
        setNotifPrefs(prefRes.data);
      } else if (profileRes.data) {
        // Row doesn't exist yet — create it with defaults
        await supabase.from("notification_preferences").insert({ user_id: user.id });
      }

      setLoading(false);
    }
    load();
  }, []);

  // ── Helpers ──
  function initials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  }

  // ── Avatar upload ──
  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return;

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) { console.error(uploadError.message); return; }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
      setAvatarPreview(publicUrl);
      setProfile((p) => p ? { ...p, avatar_url: publicUrl } : p);
      flashToast();
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!profile) return;
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    setAvatarPreview(null);
    setProfile((p) => p ? { ...p, avatar_url: null } : p);
    flashToast();
  }

  // ── Username ──
  async function saveUsername() {
    const trimmed = usernameDraft.trim();
    if (trimmed.length < 3) { setUsernameError("Must be at least 3 characters."); return; }
    if (!/^[a-z0-9_]+$/i.test(trimmed)) { setUsernameError("Only letters, numbers, and underscores."); return; }
    if (!profile) return;

    setSavingUsername(true);
    setUsernameError(null);
    const { error } = await supabase.from("profiles").update({ username: trimmed }).eq("id", profile.id);
    if (error) {
      setUsernameError(error.message.includes("unique") ? "That username is taken." : "Couldn't save. Try again.");
    } else {
      setProfile((p) => p ? { ...p, username: trimmed } : p);
      setIsEditingUsername(false);
      flashToast();
    }
    setSavingUsername(false);
  }

  // ── Notification toggle ──
  async function handleNotifToggle(key: keyof NotifPrefs, value: boolean) {
    if (!profile) return;
    if (savingPrefs.has(key)) return; // guard against double-fire while in flight

    setSavingPrefs((prev) => new Set(prev).add(key));

    // Optimistic update
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));

    // .select().maybeSingle() matters here: a bare .update() returns no error
    // even when RLS blocks the write or no row matches — it just silently
    // updates 0 rows. Selecting the row back lets us confirm the write
    // actually happened instead of showing "Saved" on a no-op.
    const { data, error } = await supabase
      .from("notification_preferences")
      .update({ [key]: value })
      .eq("user_id", profile.id)
      .select()
      .maybeSingle();

    if (error || !data) {
      // Revert on failure
      setNotifPrefs((prev) => ({ ...prev, [key]: !value }));
      if (error) console.error("Failed to save preference:", error.message);
      else console.error("Failed to save preference: no matching row updated");
    } else {
      flashToast();
    }

    setSavingPrefs((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  // ── Logout ──
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // ── Loading ──
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

  const memberSince = new Date(profile?.created_at ?? Date.now()).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F7F7F5] font-sans text-[#111827]">
      <Navbar
        variant="auth"
        kycStatus={profile?.kyc_status ?? "unverified"}
        userInitials={initials(profile?.full_name ?? null)}
        avatarUrl={avatarPreview}
      />

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ── Page header ── */}
        <div className="mb-6">
          <h1 className="text-[20px] font-extrabold tracking-tight text-[#111827] sm:text-[26px]">
            Profile
          </h1>
          <p className="mt-1 text-[13px] text-[#6B7280] sm:text-[13.5px]">
            Manage your personal details, security, and preferences.
          </p>
        </div>

        {/* ── Identity card ── */}
        <div className="rounded-2xl border border-[#E5E5E2] bg-white shadow-sm">
          {/* Avatar + name row */}
          <div className="flex items-center gap-3 border-b border-[#F3F4F6] px-4 py-5 sm:gap-4 sm:px-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-[16px] font-semibold text-white sm:h-[72px] sm:w-[72px] sm:text-[18px]">
                {avatarUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white/70" />
                ) : avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  initials(profile?.full_name ?? null)
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change photo"
                className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#111827] text-white hover:opacity-90"
              >
                <Camera className="h-3 w-3" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>

            {/* Name + meta */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-[#111827] sm:text-[17px]">
                {profile?.full_name ?? "—"}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-[#9CA3AF] sm:text-[12.5px]">
                {profile?.username ? `@${profile.username}` : "No username"} · Since {memberSince}
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[#6B7280] sm:text-[12.5px]">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="min-w-0 truncate">{authEmail ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* Photo actions */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:px-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-[#E5E5E2] bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#111827] transition-colors hover:bg-[#F7F7F5]"
            >
              Upload photo
            </button>
            {avatarPreview && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-[12.5px] font-medium text-[#9CA3AF] transition-colors hover:text-red-600"
              >
                Remove
              </button>
            )}
            <span className="w-full text-[11.5px] text-[#9CA3AF] sm:ml-auto sm:w-auto">
              JPG, PNG, WEBP · max 5MB
            </span>
          </div>
        </div>

        {/* ── Verification ── */}
        <div className="mt-4">
          <VerificationStatusCard status={profile?.kyc_status ?? "unverified"} />
        </div>

        {/* ── Profile settings ── */}
        <div className="mt-4">
          <SectionCard
            title="Profile settings"
            description="Update how your account appears across Apex Capital."
          >
            <div>
              <label className="text-[12.5px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Username
              </label>

              {!isEditingUsername ? (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] px-4 py-3">
                  <span className="min-w-0 truncate text-[14px] text-[#111827]">
                    {profile?.username
                      ? `@${profile.username}`
                      : <span className="text-[#9CA3AF]">Not set</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setUsernameDraft(profile?.username ?? ""); setIsEditingUsername(true); }}
                    className="flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-[#6B7280] hover:text-[#111827]"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center rounded-xl border border-[#111827] bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-[#111827]/10">
                      <span className="text-[14px] text-[#9CA3AF]">@</span>
                      <input
                        autoFocus
                        type="text"
                        value={usernameDraft}
                        onChange={(e) => setUsernameDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveUsername(); if (e.key === "Escape") setIsEditingUsername(false); }}
                        className="ml-0.5 w-full min-w-0 bg-transparent text-[14px] text-[#111827] outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={saveUsername}
                      disabled={savingUsername}
                      aria-label="Save"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {savingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsEditingUsername(false); setUsernameError(null); }}
                      aria-label="Cancel"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E5E5E2] bg-white text-[#6B7280] hover:bg-[#F7F7F5]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {usernameError && (
                    <p className="mt-1.5 flex items-center gap-1 text-[12px] text-red-600">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {usernameError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── Security ── */}
        <div className="mt-4">
          <SectionCard title="Security" description="Keep your account protected.">
            <div className="divide-y divide-[#F3F4F6]">
              <Link href="/login/forgot-password">
              <LinkRow icon={Lock} label="Change password" sublabel="Update your login password" /></Link>
              <Link href="/two-factor">
  <LinkRow
    icon={Smartphone}
    label="Two-factor authentication"
    sublabel="Not enabled — adds a second layer of security"
  />
</Link>
              
<Link href="/sessions">
  <LinkRow
    icon={Globe2}
    label="Active sessions"
    sublabel="View and revoke signed-in devices"
  />
</Link>
            </div>
          </SectionCard>
        </div>

        {/* ── Notifications ── */}
        <div className="mt-4">
          <SectionCard
            title="Notifications"
            description="Choose what we send you. Changes save instantly."
          >
            <div className="divide-y divide-[#F3F4F6]">
              <ToggleRow
                icon={Bell}
                iconBg="bg-[#F0F7F2]"
                iconColor="text-[#1a6b3c]"
                label="Account alerts"
                description="Deposits, withdrawals, and security notices"
                checked={notifPrefs.account_alerts}
                saving={savingPrefs.has("account_alerts")}
                onChange={(v) => handleNotifToggle("account_alerts", v)}
              />
              <ToggleRow
                icon={TrendingUp}
                iconBg="bg-sky-50"
                iconColor="text-sky-600"
                label="Price alerts"
                description="Significant moves on assets you hold or watch"
                checked={notifPrefs.price_alerts}
                saving={savingPrefs.has("price_alerts")}
                onChange={(v) => handleNotifToggle("price_alerts", v)}
              />
              <ToggleRow
                icon={Megaphone}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                label="Product updates"
                description="News, platform improvements, and occasional offers"
                checked={notifPrefs.marketing}
                saving={savingPrefs.has("marketing")}
                onChange={(v) => handleNotifToggle("marketing", v)}
              />
            </div>
          </SectionCard>
        </div>

        {/* ── Account / danger zone ── */}
        <div className="mb-12 mt-4">
          <SectionCard title="Account">
            <div className="divide-y divide-[#F3F4F6]">
              <LinkRow icon={LogOut} label="Log out" danger onClick={handleLogout} />
            </div>
          </SectionCard>
        </div>
      </main>

      <SavedToast visible={savedToast} />
    </div>
  );
}