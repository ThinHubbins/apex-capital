"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Loader2, ArrowLeft, ShieldCheck, ShieldOff, Smartphone, AlertTriangle,
} from "lucide-react";
import Navbar from "../../../components/Navbar";
import { createClient } from "../../../lib/supabase/client";

type Step = "loading" | "status" | "enrolling" | "verifying" | "unenrolling";

type EnrollData = {
  factorId: string;
  qrCode: string;   // SVG data URI
  secret: string;   // manual entry fallback
};

export default function TwoFactorPage() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState<Step>("loading");
  const [isEnabled, setIsEnabled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  // ── Check current MFA status ──
  useEffect(() => {
    async function checkStatus() {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) { router.replace("/login"); return; }

      const totp = data.totp.find((f) => f.status === "verified");
      if (totp) {
        setIsEnabled(true);
        setFactorId(totp.id);
      }
      setStep("status");
    }
    checkStatus();
  }, []);

  // ── Start enrollment ──
  async function startEnroll() {
    setWorking(true);
    setError(null);

    // Clean up any unverified (stale) factor first
    const { data: list } = await supabase.auth.mfa.listFactors();
    const stale = list?.totp.find((f) => (f.status as string) === "unverified");
    if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id });

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator app",
    });

    if (error || !data) {
      setError("Couldn't start setup. Try again.");
      setWorking(false);
      return;
    }

    setEnrollData({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setStep("enrolling");
    setWorking(false);
  }

  // ── Verify the code ──
  async function verifyCode() {
    if (!enrollData || code.length !== 6) return;
    setWorking(true);
    setError(null);

    // Create a challenge first, then verify against it
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
      factorId: enrollData.factorId,
    });

    if (challengeErr || !challenge) {
      setError("Challenge failed. Try again.");
      setWorking(false);
      return;
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: enrollData.factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyErr) {
      setError("Incorrect code. Check your app and try again.");
      setWorking(false);
      return;
    }

    setIsEnabled(true);
    setFactorId(enrollData.factorId);
    setEnrollData(null);
    setCode("");
    setStep("status");
    setWorking(false);
  }

  // ── Unenroll ──
  async function unenroll() {
    if (!factorId) return;
    setWorking(true);
    setError(null);

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      setError("Couldn't remove 2FA. Try again.");
      setWorking(false);
      return;
    }

    setIsEnabled(false);
    setFactorId(null);
    setStep("status");
    setWorking(false);
  }

  // ── Shared layout shell ──
  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
        <Navbar variant="auth" />
        <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-5 flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Back to profile
          </button>
          <div className="mb-5">
            <h1 className="text-[20px] font-extrabold tracking-tight sm:text-[24px]">
              Two-factor authentication
            </h1>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              Adds a second layer of security to your account.
            </p>
          </div>
          {children}
        </main>
      </div>
    );
  }

  // ── Loading ──
  if (step === "loading") {
    return (
      <Shell>
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
        </div>
      </Shell>
    );
  }

  // ── Status view ──
  if (step === "status") {
    return (
      <Shell>
        <div className="rounded-2xl border border-[#E5E5E2] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3.5 px-4 py-5 sm:px-6">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isEnabled ? "bg-[#F0F7F2]" : "bg-[#F3F4F6]"}`}>
              {isEnabled
                ? <ShieldCheck className="h-5 w-5 text-[#1a6b3c]" strokeWidth={1.75} />
                : <ShieldOff className="h-5 w-5 text-[#6B7280]" strokeWidth={1.75} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#111827]">
                {isEnabled ? "Two-factor authentication is on" : "Two-factor authentication is off"}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[#6B7280]">
                {isEnabled
                  ? "Your account requires a code from your authenticator app at sign-in."
                  : "Set up an authenticator app to protect your account."}
              </p>
            </div>
          </div>

          <div className="border-t border-[#F3F4F6] px-4 py-3.5 sm:px-6">
            {isEnabled ? (
              <button
                type="button"
                onClick={() => { setStep("unenrolling"); setError(null); }}
                className="text-[13px] font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                Remove authenticator app
              </button>
            ) : (
              <button
                type="button"
                onClick={startEnroll}
                disabled={working}
                className="flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {working && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Set up authenticator app
              </button>
            )}
          </div>
        </div>

        {!isEnabled && (
          <div className="mt-4 rounded-xl border border-[#E5E5E2] bg-white px-4 py-4 sm:px-6">
            <p className="text-[13px] font-semibold text-[#111827] mb-2">How it works</p>
            <ol className="space-y-1.5 text-[12.5px] text-[#6B7280] list-decimal list-inside">
              <li>Install an authenticator app — Google Authenticator, Authy, or 1Password.</li>
              <li>Scan the QR code we show you to link your account.</li>
              <li>Enter the 6-digit code from the app to confirm setup.</li>
              <li>From now on, sign-in requires both your password and the app.</li>
            </ol>
          </div>
        )}
      </Shell>
    );
  }

  // ── Enroll: show QR ──
  if (step === "enrolling" && enrollData) {
    return (
      <Shell>
        <div className="rounded-2xl border border-[#E5E5E2] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#F3F4F6] px-4 py-4 sm:px-6">
            <p className="text-[14px] font-semibold text-[#111827]">Scan this QR code</p>
            <p className="mt-0.5 text-[12.5px] text-[#6B7280]">
              Open your authenticator app and scan the code below.
            </p>
          </div>

          {/* QR code */}
          <div className="flex flex-col items-center gap-4 px-4 py-6 sm:px-6">
            <div className="rounded-xl border border-[#E5E5E2] bg-white p-3">
              {/* Supabase returns an SVG data URI */}
              <img
                src={enrollData.qrCode}
                alt="QR code for authenticator setup"
                width={180}
                height={180}
                className="block"
              />
            </div>

            {/* Manual entry fallback */}
            <details className="w-full">
              <summary className="cursor-pointer text-[12.5px] text-[#6B7280] hover:text-[#111827] transition-colors select-none">
                Can't scan? Enter code manually
              </summary>
              <div className="mt-2 rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3 py-2.5">
                <p className="text-[11px] text-[#9CA3AF] mb-1">Secret key</p>
                <p className="font-mono text-[13px] text-[#111827] break-all select-all">
                  {enrollData.secret}
                </p>
              </div>
            </details>
          </div>

          <div className="border-t border-[#F3F4F6] px-4 py-4 sm:px-6 flex gap-2">
            <button
              type="button"
              onClick={() => { setStep("status"); setEnrollData(null); }}
              className="rounded-lg border border-[#E5E5E2] bg-white px-4 py-2 text-[13px] font-medium text-[#6B7280] hover:bg-[#F7F7F5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { setCode(""); setError(null); setStep("verifying"); }}
              className="flex-1 rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
            >
              I've scanned it — continue
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Verify: enter code ──
  if (step === "verifying") {
    return (
      <Shell>
        <div className="rounded-2xl border border-[#E5E5E2] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#F3F4F6] px-4 py-4 sm:px-6">
            <p className="text-[14px] font-semibold text-[#111827]">Enter the 6-digit code</p>
            <p className="mt-0.5 text-[12.5px] text-[#6B7280]">
              Open your authenticator app and enter the code shown for this account.
            </p>
          </div>

          <div className="px-4 py-5 sm:px-6">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              placeholder="000000"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") verifyCode(); }}
              className="w-full rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] px-4 py-3 text-center font-mono text-[20px] tracking-[0.3em] text-[#111827] outline-none focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10 transition-all"
            />

            {error && (
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-red-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="border-t border-[#F3F4F6] px-4 py-4 sm:px-6 flex gap-2">
            <button
              type="button"
              onClick={() => { setStep("enrolling"); setError(null); }}
              className="rounded-lg border border-[#E5E5E2] bg-white px-4 py-2 text-[13px] font-medium text-[#6B7280] hover:bg-[#F7F7F5] transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={verifyCode}
              disabled={working || code.length !== 6}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {working && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Verify and activate
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Unenroll confirm ──
  if (step === "unenrolling") {
    return (
      <Shell>
        <div className="rounded-2xl border border-red-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#F3F4F6] px-4 py-4 sm:px-6">
            <p className="text-[14px] font-semibold text-[#111827]">Remove two-factor authentication?</p>
            <p className="mt-0.5 text-[12.5px] text-[#6B7280]">
              Your account will only be protected by your password. You can re-enable this at any time.
            </p>
          </div>

          {error && (
            <div className="mx-4 mt-4 sm:mx-6 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="px-4 py-4 sm:px-6 flex gap-2">
            <button
              type="button"
              onClick={() => { setStep("status"); setError(null); }}
              className="rounded-lg border border-[#E5E5E2] bg-white px-4 py-2 text-[13px] font-medium text-[#6B7280] hover:bg-[#F7F7F5] transition-colors"
            >
              Keep it on
            </button>
            <button
              type="button"
              onClick={unenroll}
              disabled={working}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {working && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Yes, remove 2FA
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return null;
}