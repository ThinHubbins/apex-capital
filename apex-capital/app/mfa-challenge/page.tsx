"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

export default function MfaChallengePage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  // Get the verified TOTP factor id on mount
  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = data?.totp.find((f) => f.status === "verified");
      if (!totp) {
        // No MFA factor — shouldn't be here, send them in
        router.replace(redirectTo);
        return;
      }
      setFactorId(totp.id);
    }
    load();
  }, []);

  async function verify() {
    if (!factorId || code.length !== 6) return;
    setWorking(true);
    setError(null);

    const { data: challenge, error: challengeErr } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeErr || !challenge) {
      setError("Something went wrong. Try again.");
      setWorking(false);
      return;
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyErr) {
      setError("Incorrect code. Check your app and try again.");
      setCode("");
      setWorking(false);
      return;
    }

    // Session is now AAL2 — send them where they were going
    router.replace(redirectTo);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F5] px-4 font-sans">
      <div className="w-full max-w-sm">

        {/* Icon + heading */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F7F2]">
            <ShieldCheck className="h-7 w-7 text-[#1a6b3c]" strokeWidth={1.75} />
          </div>
          <h1 className="text-[20px] font-extrabold tracking-tight text-[#111827]">
            Two-factor authentication
          </h1>
          <p className="mt-1.5 text-[13px] text-[#6B7280]">
            Enter the 6-digit code from your authenticator app to continue.
          </p>
        </div>

        {/* Code input */}
        <div className="rounded-2xl border border-[#E5E5E2] bg-white p-5 shadow-sm">
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
            onKeyDown={(e) => { if (e.key === "Enter") verify(); }}
            className="w-full rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] px-4 py-3.5 text-center font-mono text-[24px] tracking-[0.4em] text-[#111827] outline-none focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10 transition-all"
          />

          {error && (
            <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-red-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={verify}
            disabled={working || code.length !== 6 || !factorId}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#111827] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {working && <Loader2 className="h-4 w-4 animate-spin" />}
            Verify
          </button>
        </div>

        {/* Escape hatch */}
        <p className="mt-4 text-center text-[12.5px] text-[#9CA3AF]">
          Lost access to your app?{" "}
          <a href="mailto:support@apexcapital.com" className="text-[#6B7280] underline hover:text-[#111827] transition-colors">
            Contact support
          </a>
        </p>

      </div>
    </div>
  );
}