"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Mail, Shield, RefreshCw, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client"; // adjust to your actual path

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "sent">("email");
  const [error, setError] = useState<string | null>(null);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const supabase = createClient();

  async function sendResetEmail() {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Supabase intentionally doesn't reveal whether the email exists,
      // to avoid leaking which addresses have accounts. Only show an
      // error for real failures (rate limits, network issues, etc).
      if (error) {
        setError(error.message);
        return;
      }
      setStep("sent");
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    sendResetEmail();
  }

  function handleResend() {
    sendResetEmail();
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827] flex flex-col">
      <header className="border-b border-[#E5E5E2] bg-[#F7F7F5]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="text-[17px] font-bold tracking-tight text-[#111827]">
            Apex Capital
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-[420px]">
          {step === "email" && (
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-8 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0F0ED]">
                <Lock className="h-5 w-5 text-[#111827]" strokeWidth={1.75} />
              </div>

              <h1 className="text-[22px] font-extrabold tracking-tight text-[#111827]">
                Forgot password?
              </h1>
              <p className="mt-2 mb-7 text-[13px] leading-relaxed text-[#6B7280]">
                Enter the email linked to your account. We'll send a secure
                reset link right away.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[#374151]">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] py-2.5 pl-10 pr-4 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#111827] focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="w-full rounded-lg bg-[#1a6b3c] px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending reset link…" : "Send reset link"}
                </button>
              </form>

              <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-[#F0F7F2] px-4 py-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#1a6b3c]" />
                <p className="text-[12px] text-[#374151]">
                  Reset links expire in 30 minutes and can only be used once.
                </p>
              </div>

              <div className="my-5 h-px bg-[#F3F4F6]" />

              <p className="text-center text-[13px] text-[#6B7280]">
                Remember your password?{" "}
                <Link href="/login" className="font-semibold text-[#111827] hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          )}

          {step === "sent" && (
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-8 shadow-sm text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#F0F7F2]">
                <Mail className="h-7 w-7 text-[#1a6b3c]" strokeWidth={1.75} />
              </div>

              <h1 className="text-[22px] font-extrabold tracking-tight text-[#111827]">
                Check your inbox
              </h1>
              <p className="mt-2.5 text-[13px] leading-relaxed text-[#6B7280]">
                If an account exists for{" "}
                <span className="font-semibold text-[#111827]">{email}</span>,
                we've sent a password reset link. It expires in 30 minutes.
              </p>

              <div className="mt-6 rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] px-5 py-4 text-left space-y-3">
                {[
                  "Open the email from Apex Capital",
                  "Click the Reset Password button",
                  "Choose a new secure password",
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-[#374151]">{text}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-left text-[13px] text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleResend}
                disabled={loading}
                className="mt-5 flex w-full items-center justify-center gap-2 text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors py-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Resending…" : "Didn't get it? Resend email"}
              </button>

              <button
                onClick={() => setStep("email")}
                className="mt-2 w-full rounded-lg border border-[#E5E5E2] px-4 py-2.5 text-[13px] font-medium text-[#111827] hover:bg-[#F7F7F5] transition-colors"
              >
                Back to login
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[#E5E5E2] bg-white px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-[12px] text-[#9CA3AF]">
            © {new Date().getFullYear()} Apex Capital. All rights reserved.
          </p>
          <div className="flex gap-5">
            {["Privacy Policy", "Terms of Service", "Help Center"].map((l) => (
              <Link key={l} href="#" className="text-[12px] text-[#9CA3AF] hover:text-[#111827]">
                {l}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}