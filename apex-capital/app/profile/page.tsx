"use client";

import { useRef, useState, useEffect } from "react";
import {
  ShieldCheck, ShieldAlert, Clock, Camera, Pencil, Check, X,
  Lock, Smartphone, Globe2, LogOut, ChevronRight, Mail, Loader2,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import { createClient } from "../../lib/supabase/client";

type KycStatus = "unverified" | "pending" | "verified" | "rejected";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  kyc_status: KycStatus;
  created_at: string;
};

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

function VerificationStatusCard({ status }: { status: KycStatus }) {
  const config = {
    verified: {
      icon: ShieldCheck, iconBg: "bg-[#F0F7F2]", iconColor: "text-[#1a6b3c]",
      title: "Identity verified",
      desc: "You have full access to deposits, withdrawals, and trading.",
      cta: null,
    },
    pending: {
      icon: Clock, iconBg: "bg-amber-50", iconColor: "text-amber-600",
      title: "Verification under review",
      desc: "This usually takes less than 10 minutes. We'll email you once it's done.",
      cta: null,
    },
    rejected: {
      icon: ShieldAlert, iconBg: "bg-red-50", iconColor: "text-red-600",
      title: "Verification rejected",
      desc: "Your identity check was unsuccessful. Please try again.",
      cta: "Retry verification",
    },
    unverified: {
      icon: ShieldAlert, iconBg: "bg-[#F3F4F6]", iconColor: "text-[#6B7280]",
      title: "Identity not verified",
      desc: "Complete a quick 3-minute check to unlock deposits and trading.",
      cta: "Complete verification",
    },
  }[status];

  const Icon = config.icon;
  return (
    <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}>
            <Icon className={`h-5 w-5 ${config.iconColor}`} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#111827]">{config.title}</p>
            <p className="mt-0.5 max-w-sm text-[13px] leading-relaxed text-[#6B7280]">{config.desc}</p>
          </div>
        </div>
        {config.cta && (
          <a href="/kyc-flow" className="shrink-0 rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90">
            {config.cta}
          </a>
        )}
      </div>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
      <h2 className="text-[16px] font-semibold text-[#111827]">{title}</h2>
      {description && <p className="mt-1 text-[13px] text-[#6B7280]">{description}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div>
        <p className="text-[13.5px] font-medium text-[#111827]">{label}</p>
        <p className="mt-0.5 text-[12.5px] text-[#9CA3AF]">{description}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-[#1a6b3c]" : "bg-[#E5E5E2]"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function LinkRow({ icon: Icon, label, sublabel, danger, onClick }: {
  icon: typeof Lock; label: string; sublabel?: string; danger?: boolean; onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-xl px-2 py-3.5 text-left transition-colors hover:bg-[#F7F7F5]">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${danger ? "bg-red-50" : "bg-[#F3F4F6]"}`}>
          <Icon className={`h-4 w-4 ${danger ? "text-red-600" : "text-[#6B7280]"}`} strokeWidth={1.75} />
        </span>
        <div>
          <p className={`text-[13.5px] font-medium ${danger ? "text-red-600" : "text-[#111827]"}`}>{label}</p>
          {sublabel && <p className="mt-0.5 text-[12.5px] text-[#9CA3AF]">{sublabel}</p>}
        </div>
      </div>
      {!danger && <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // All hooks at the top — no exceptions
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setAuthEmail(user.email ?? null);

      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, kyc_status, created_at")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile({ ...data, kyc_status: data.kyc_status as KycStatus });
        setAvatarPreview(data.avatar_url);
        setUsernameDraft(data.username ?? "");
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  function initials(name: string | null) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  }

  function flashSavedToast() {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2200);
  }

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

    if (uploadError) {
      console.error("Upload error:", uploadError.message);
      setAvatarUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Profile update error:", updateError.message);
      setAvatarUploading(false);
      return;
    }

    setAvatarPreview(publicUrl);
    setProfile((p) => p ? { ...p, avatar_url: publicUrl } : p);
    flashSavedToast();
  } catch (err) {
    console.error("Unexpected upload error:", err);
  } finally {
    setAvatarUploading(false);
  }
}

  async function handleRemoveAvatar() {
    if (!profile) return;
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    setAvatarPreview(null);
    setProfile((p) => p ? { ...p, avatar_url: null } : p);
    flashSavedToast();
  }

  async function saveUsername() {
    const trimmed = usernameDraft.trim();
    if (trimmed.length < 3) { setUsernameError("Username must be at least 3 characters."); return; }
    if (!/^[a-z0-9_]+$/i.test(trimmed)) { setUsernameError("Only letters, numbers, and underscores allowed."); return; }
    if (!profile) return;

    setSavingUsername(true);
    setUsernameError(null);

    const { error } = await supabase
      .from("profiles")
      .update({ username: trimmed })
      .eq("id", profile.id);

    if (error) {
      setUsernameError(error.message.includes("unique") ? "That username is already taken." : "Couldn't save. Try again.");
    } else {
      setProfile((p) => p ? { ...p, username: trimmed } : p);
      setIsEditingUsername(false);
      flashSavedToast();
    }
    setSavingUsername(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

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
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      <Navbar variant="auth" kycStatus={profile?.kyc_status ?? "unverified"} userInitials={initials(profile?.full_name ?? null)} />

      <main className="mx-auto max-w-4xl px-6 py-8 lg:px-10">
        <div className="mb-6">
          <h1 className="text-[24px] font-extrabold tracking-tight text-[#111827] sm:text-[28px]">Profile</h1>
          <p className="mt-1 text-[14px] text-[#6B7280]">Manage your personal details, security, and preferences.</p>
        </div>

        {/* Identity card */}
        <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-[22px] font-semibold text-white">
                {avatarUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white/70" />
                ) : avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  initials(profile?.full_name ?? null)
                )}
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Change profile photo"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#111827] text-white transition-opacity hover:opacity-90">
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarSelect} className="hidden" />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="text-[18px] font-bold text-[#111827]">{profile?.full_name ?? "—"}</p>
              <p className="mt-0.5 text-[13px] text-[#9CA3AF]">
                {profile?.username ? `@${profile.username}` : "No username set"} · Member since{" "}
                {new Date(profile?.created_at ?? Date.now()).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[13px] text-[#6B7280] sm:justify-start">
                <Mail className="h-3.5 w-3.5" />
                {authEmail ?? "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="mt-5">
          <VerificationStatusCard status={profile?.kyc_status ?? "unverified"} />
        </div>

        {/* Profile settings */}
        <div className="mt-5">
          <SectionCard title="Profile settings" description="Update how your account appears across Apex Capital.">
            <div className="space-y-5">
              <div>
                <label className="text-[13px] font-medium text-[#111827]">Username</label>
                {!isEditingUsername ? (
                  <div className="mt-1.5 flex items-center justify-between rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3.5 py-2.5">
                    <span className="text-[14px] text-[#111827]">
                      {profile?.username ? `@${profile.username}` : <span className="text-[#9CA3AF]">Not set</span>}
                    </span>
                    <button type="button" onClick={() => { setUsernameDraft(profile?.username ?? ""); setIsEditingUsername(true); }}
                      className="flex items-center gap-1 text-[12.5px] font-medium text-[#6B7280] hover:text-[#111827]">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                  </div>
                ) : (
                  <div className="mt-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1 items-center rounded-lg border border-[#111827] bg-white px-3.5 py-2.5">
                        <span className="text-[14px] text-[#9CA3AF]">@</span>
                        <input autoFocus type="text" value={usernameDraft} onChange={(e) => setUsernameDraft(e.target.value)}
                          className="ml-0.5 w-full bg-transparent text-[14px] text-[#111827] outline-none" />
                      </div>
                      <button type="button" onClick={saveUsername} disabled={savingUsername} aria-label="Save username"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#111827] text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                        {savingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => { setIsEditingUsername(false); setUsernameError(null); }} aria-label="Cancel"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E5E2] bg-white text-[#6B7280] hover:bg-[#F7F7F5]">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {usernameError && <p className="mt-1.5 text-[12px] text-red-600">{usernameError}</p>}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[13px] font-medium text-[#111827]">Profile photo</label>
                <div className="mt-1.5 flex items-center gap-3">
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-[#E5E5E2] bg-white px-3.5 py-2 text-[13px] font-medium text-[#111827] transition-colors hover:bg-[#F7F7F5]">
                    Upload new photo
                  </button>
                  {avatarPreview && (
                    <button type="button" onClick={handleRemoveAvatar}
                      className="text-[13px] font-medium text-[#9CA3AF] hover:text-red-600">
                      Remove
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-[12px] text-[#9CA3AF]">JPG, PNG, or WEBP — up to 5MB.</p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Security */}
        <div className="mt-5">
          <SectionCard title="Security" description="Keep your account protected.">
            <div className="divide-y divide-[#F3F4F6]">
              <LinkRow icon={Lock} label="Change password" sublabel="Update your password" />
              <LinkRow icon={Smartphone} label="Two-factor authentication" sublabel="Not enabled" />
              <LinkRow icon={Globe2} label="Active sessions" sublabel="Manage signed-in devices" />
            </div>
          </SectionCard>
        </div>

        {/* Notifications */}
        <div className="mt-5">
          <SectionCard title="Notifications" description="Choose what we email you about.">
            <div className="divide-y divide-[#F3F4F6]">
              <ToggleRow label="Account alerts" description="Deposits, withdrawals, and security notices"
                checked={emailAlerts} onChange={(v) => { setEmailAlerts(v); flashSavedToast(); }} />
              <ToggleRow label="Price alerts" description="Significant moves on assets you hold or watch"
                checked={priceAlerts} onChange={(v) => { setPriceAlerts(v); flashSavedToast(); }} />
              <ToggleRow label="Product updates" description="News, tips, and occasional marketing emails"
                checked={marketingEmails} onChange={(v) => { setMarketingEmails(v); flashSavedToast(); }} />
            </div>
          </SectionCard>
        </div>

        {/* Account */}
        <div className="mt-5 mb-10">
          <SectionCard title="Account">
            <div className="divide-y divide-[#F3F4F6]">
              <LinkRow icon={LogOut} label="Log out" danger onClick={handleLogout} />
            </div>
          </SectionCard>
        </div>
      </main>

      {savedToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#111827] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
          <span className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-[#1a6b3c]" /> Saved
          </span>
        </div>
      )}
    </div>
  );
}