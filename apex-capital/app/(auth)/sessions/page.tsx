"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, ArrowLeft, Laptop, Smartphone, Globe, LogOut, Info,
} from "lucide-react";
import Navbar from "../../../components/Navbar";
import { createClient } from "../../../lib/supabase/client";

type SessionInfo = {
  deviceLabel: string;
  deviceType: "desktop" | "mobile" | "unknown";
  location: string | null;
  lastSeen: string;
  isCurrent: boolean;
};

function parseUA(ua: string): { label: string; type: "desktop" | "mobile" | "unknown" } {
  const mobile = /iphone|ipad|android|mobile/i.test(ua);
  const type = mobile ? "mobile" : "desktop";

  let browser = "Unknown browser";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua)) browser = "Opera";
  else if (/chrome/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/firefox/i.test(ua)) browser = "Firefox";

  let os = "";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/iphone/i.test(ua)) os = "iOS";
  else if (/ipad/i.test(ua)) os = "iPadOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/linux/i.test(ua)) os = "Linux";

  return { label: os ? `${browser} on ${os}` : browser, type };
}

function DeviceIcon({ type, className }: { type: SessionInfo["deviceType"]; className?: string }) {
  if (type === "mobile") return <Smartphone className={className} strokeWidth={1.75} />;
  if (type === "desktop") return <Laptop className={className} strokeWidth={1.75} />;
  return <Globe className={className} strokeWidth={1.75} />;
}

export default function SessionsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { router.replace("/login"); return; }

      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const { label, type } = parseUA(ua);

      const lastSignIn = user.last_sign_in_at
        ? new Date(user.last_sign_in_at).toLocaleString("en-US", {
            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
          })
        : "Unknown";

      setSession({
        deviceLabel: label,
        deviceType: type,
        location: null, // Supabase doesn't expose IP geolocation on the client
        lastSeen: lastSignIn,
        isCurrent: true,
      });
      setLoading(false);
    }
    load();
  }, []);

  async function handleSignOutAll() {
    if (!confirmed) { setConfirmed(true); return; }
    setSigningOut(true);
    await supabase.auth.signOut({ scope: "global" });
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5]">
        <Navbar variant="auth" />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      <Navbar variant="auth" />

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-5 flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Back to profile
        </button>

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-[20px] font-extrabold tracking-tight sm:text-[24px]">
            Active sessions
          </h1>
          <p className="mt-1 text-[13px] text-[#6B7280]">
            Devices currently signed in to your account.
          </p>
        </div>

        {/* Session card */}
        <div className="rounded-2xl border border-[#E5E5E2] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#F3F4F6] px-4 py-3.5 sm:px-6">
            <p className="text-[13px] font-semibold text-[#111827]">Signed-in devices</p>
          </div>

          {session && (
            <div className="flex items-center gap-3.5 px-4 py-4 sm:px-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF]">
                <DeviceIcon type={session.deviceType} className="h-5 w-5 text-[#4F46E5]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-[#111827]">{session.deviceLabel}</p>
                <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                  Last active {session.lastSeen}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#F0F7F2] px-2.5 py-1 text-[11px] font-semibold text-[#1a6b3c]">
                This device
              </span>
            </div>
          )}
        </div>

        {/* Info note */}
        <div className="mt-3 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" strokeWidth={1.75} />
          <p className="text-[12.5px] leading-relaxed text-amber-800">
            For security reasons, individual sessions can't be revoked one at a time.
            Use the button below to sign out of all devices at once.
          </p>
        </div>

        {/* Sign out all */}
        <div className="mt-4 rounded-2xl border border-[#E5E5E2] bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={handleSignOutAll}
            disabled={signingOut}
            className="flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors hover:bg-red-50/60 disabled:opacity-60 sm:px-6"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
              {signingOut
                ? <Loader2 className="h-5 w-5 animate-spin text-red-600" />
                : <LogOut className="h-5 w-5 text-red-600" strokeWidth={1.75} />}
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-red-600">
                {confirmed ? "Tap again to confirm" : "Sign out all devices"}
              </p>
              <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                Ends every active session, including this one
              </p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}