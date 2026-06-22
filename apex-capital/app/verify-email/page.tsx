"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Mail, ArrowLeft, Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

type Mode = "signup" | "login";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode: Mode = searchParams.get("mode") === "login" ? "login" : "signup";
  const email = searchParams.get("email") || "your email";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [status, setStatus] = useState<"idle" | "verifying" | "error" | "success">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Focus first box on mount
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // Resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const code = digits.join("");

  function handleChange(index: number, value: string) {
    const clean = value.replace(/[^0-9]/g, "");
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    // Support pasting a full code into any single box
    if (clean.length > 1) {
      const chars = clean.slice(0, CODE_LENGTH).split("");
      const next = Array(CODE_LENGTH).fill("");
      chars.forEach((c, i) => (next[i] = c));
      setDigits(next);
      const lastFilled = Math.min(chars.length, CODE_LENGTH) - 1;
      inputsRef.current[lastFilled]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean;
    setDigits(next);

    if (index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!pasted) return;
    e.preventDefault();
    const chars = pasted.slice(0, CODE_LENGTH).split("");
    const next = Array(CODE_LENGTH).fill("");
    chars.forEach((c, i) => (next[i] = c));
    setDigits(next);
    const lastFilled = Math.min(chars.length, CODE_LENGTH) - 1;
    inputsRef.current[lastFilled]?.focus();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== CODE_LENGTH) {
      setStatus("error");
      setErrorMessage(`Enter the full ${CODE_LENGTH}-digit code.`);
      return;
    }

    setStatus("verifying");
    setErrorMessage(null);

    // Custom OTP flow — checks the code against our own otp_codes
    // table and flips profiles.email_verified, independent of
    // Supabase's built-in confirmation system.
    const res = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, purpose: mode }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      setStatus("error");
      setErrorMessage(data.error || "That code didn't work. Check it and try again.");
      setDigits(Array(CODE_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
      return;
    }

    setStatus("success");
    if (mode === "signup") {
      router.push("/account-created");
    } else {
      router.push("/dashboard");
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setErrorMessage(null);
    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: mode }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorMessage(data.error || "Couldn't resend the code. Try again in a moment.");
      return;
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  const isComplete = code.length === CODE_LENGTH;

  const heading = mode === "login" ? "Confirm your email" : "Verify your email";
  const subheading =
    mode === "login"
      ? "For your security, enter the 6-digit code we sent to keep your account safe."
      : "We sent a 6-digit code to your inbox. Enter it below to activate your account.";

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7F5] font-sans text-[#111827]">
      {/* Minimal header, consistent with the marketing site */}
      <header className="border-b border-[#E5E5E2] bg-[#F7F7F5]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="text-[17px] font-bold tracking-tight text-[#111827]">
            Apex Capital
          </Link>
          <Link
            href={mode === "login" ? "/login" : "/create-account"}
            className="flex items-center gap-1.5 text-[13px] text-[#6B7280] transition-colors hover:text-[#111827]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16 lg:px-10">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-[#E5E5E2] bg-white p-8 shadow-sm">
            {/* Icon */}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0F7F2]">
              {mode === "login" ? (
                <ShieldCheck className="h-5 w-5 text-[#1a6b3c]" strokeWidth={1.75} />
              ) : (
                <Mail className="h-5 w-5 text-[#1a6b3c]" strokeWidth={1.75} />
              )}
            </div>

            <h1 className="mt-5 text-[24px] font-extrabold tracking-tight text-[#111827]">
              {heading}
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280]">
              {subheading}
            </p>
            <p className="mt-1 text-[14px] font-semibold text-[#111827]">{email}</p>

            {/* Code entry */}
            <form onSubmit={handleVerify} className="mt-7">
              <div className="flex justify-between gap-2" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={CODE_LENGTH}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    aria-label={`Digit ${i + 1} of verification code`}
                    className={`h-14 w-12 rounded-lg border text-center text-[20px] font-bold text-[#111827] outline-none transition-colors focus:border-[#111827] focus:ring-1 focus:ring-[#111827] ${
                      status === "error"
                        ? "border-red-300 bg-red-50"
                        : "border-[#E5E5E2] bg-[#F7F7F5]"
                    }`}
                  />
                ))}
              </div>

              {status === "error" && errorMessage && (
                <p className="mt-3 text-[13px] text-red-600">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={!isComplete || status === "verifying"}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#111827] px-5 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status === "verifying" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying
                  </>
                ) : (
                  "Verify and continue"
                )}
              </button>
            </form>

            {/* Resend */}
            <p className="mt-5 text-center text-[13px] text-[#6B7280]">
              Didn&apos;t get a code?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="font-medium text-[#111827] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-[#9CA3AF] disabled:no-underline"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </p>
          </div>

          <p className="mt-6 text-center text-[12px] text-[#9CA3AF]">
            Having trouble?{" "}
            <Link href="/support" className="font-medium text-[#6B7280] hover:text-[#111827]">
              Contact support
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}