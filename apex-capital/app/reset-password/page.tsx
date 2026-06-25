"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ViewState = "checking" | "ready" | "invalid" | "success";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [view, setView] = useState<ViewState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase fires PASSWORD_RECOVERY once it's parsed the token from the
  // URL fragment and exchanged it for a session. If that never fires and
  // there's also no existing session, the link is invalid/expired.
  useEffect(() => {
    let resolved = false;

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        resolved = true;
        setView("ready");
      }
    });

    // Fallback check in case the event already fired before this mounted,
    // or the user has a valid session for another reason.
    supabase.auth.getSession().then(({ data }) => {
      if (!resolved && data.session) {
        resolved = true;
        setView("ready");
      } else if (!resolved) {
        // Give the auth-state event a brief window before giving up.
        setTimeout(() => {
          if (!resolved) setView("invalid");
        }, 2500);
      }
    });

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValid =
    password.length >= 8 && password === confirmPassword && password.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      setView("success");
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827] flex flex-col">
      {/* ── Navbar ── */}
      <header className="border-b border-[#E5E5E2] bg-[#F7F7F5]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="text-[17px] font-bold tracking-tight text-[#111827]">
            Apex Capital
          </Link>
          <Link
            href="/login"
            className="text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            Back to login
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-[420px]">
          {/* ── Checking link validity ── */}
          {view === "checking" && (
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-8 shadow-sm text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#9CA3AF]" />
              <p className="mt-4 text-[13px] text-[#6B7280]">Verifying your reset link…</p>
            </div>
          )}

          {/* ── Invalid / expired link ── */}
          {view === "invalid" && (
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-8 shadow-sm text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <AlertCircle className="h-7 w-7 text-red-500" strokeWidth={1.75} />
              </div>
              <h1 className="text-[22px] font-extrabold tracking-tight text-[#111827]">
                Link expired or invalid
              </h1>
              <p className="mt-2.5 text-[13px] leading-relaxed text-[#6B7280]">
                This password reset link is no longer valid. Reset links expire after
                30 minutes or once they've been used.
              </p>
              <Link
                href="/forgot-password"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#1a6b3c] px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Request a new link
              </Link>
            </div>
          )}

          {/* ── Set new password ── */}
          {view === "ready" && (
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-8 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0F0ED]">
                <Lock className="h-5 w-5 text-[#111827]" strokeWidth={1.75} />
              </div>

              <h1 className="text-[22px] font-extrabold tracking-tight text-[#111827]">
                Set a new password
              </h1>
              <p className="mt-2 mb-7 text-[13px] leading-relaxed text-[#6B7280]">
                Choose a strong password you haven&apos;t used before.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[#374151]">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] py-2.5 pl-10 pr-10 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#111827] focus:bg-white focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[#374151]">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] py-2.5 pl-10 pr-4 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#111827] focus:bg-white focus:outline-none transition-colors"
                    />
                  </div>
                  {confirmPassword.length > 0 && password !== confirmPassword && (
                    <p className="mt-1.5 text-[12px] text-red-600">Passwords don&apos;t match.</p>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isValid || submitting}
                  className="w-full rounded-lg bg-[#1a6b3c] px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Updating password…" : "Update password"}
                </button>
              </form>

              <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-[#F0F7F2] px-4 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1a6b3c]" />
                <p className="text-[12px] text-[#374151]">
                  You&apos;ll be signed out of other devices after changing your password.
                </p>
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {view === "success" && (
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-8 shadow-sm text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#F0F7F2]">
                <CheckCircle2 className="h-7 w-7 text-[#1a6b3c]" strokeWidth={1.75} />
              </div>
              <h1 className="text-[22px] font-extrabold tracking-tight text-[#111827]">
                Password updated
              </h1>
              <p className="mt-2.5 text-[13px] leading-relaxed text-[#6B7280]">
                Your password has been changed successfully. You can now log in with
                your new password.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="mt-6 w-full rounded-lg bg-[#111827] px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                Continue to login
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}