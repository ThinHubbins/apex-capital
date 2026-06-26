"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client"; // adjust if your client lives elsewhere
import { useAuthUser } from "@/lib/supabase/use-auth-user"; // adjust if your hook lives elsewhere

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { isLoggedIn, loading: authLoading } = useAuthUser();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in — bounce straight to the dashboard, no need to log in again.
  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      router.replace("/dashboard");
    }
  }, [authLoading, isLoggedIn, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
  }

  async function handleGoogleSignIn() {
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) setError(oauthError.message);
  }

  // While we check the session, or once we know they're logged in and are
  // about to redirect, show a lightweight placeholder instead of the form.
  if (authLoading || isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F0ED] font-sans">
        <Loader2 className="h-5 w-5 animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F0F0ED] font-sans">
      {/* ---------------------------------------------------------- */}
      {/* Left panel                                                  */}
      {/* ---------------------------------------------------------- */}
      <div className="relative flex w-full flex-col lg:w-1/2">
        {/* Logo */}
        <div className="px-8 py-7">
          <Link
            href="/"
            className="text-[17px] font-bold tracking-tight text-[#111827]"
          >
            Apex Capital
          </Link>
        </div>

        {/* Centered card */}
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-[380px] rounded-2xl border border-[#E5E5E2] bg-white p-8 shadow-sm">
            {/* Heading */}
            <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">
              Welcome Back
            </h1>
            <p className="mt-1 text-[13px] text-[#6B7280]">
              Enter your credentials to access your portfolio
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Email */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full rounded-lg border border-[#E5E5E2] bg-[#F9F9F8] py-2.5 pl-9 pr-4 text-[13px] text-[#111827] placeholder:text-[#C4C4BE] focus:border-[#111827] focus:bg-white focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    Password
                  </label>
                  <Link
                    href="/login/forgot-password"
                    className="text-[12px] font-medium text-[#1a6b3c] hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-lg border border-[#E5E5E2] bg-[#F9F9F8] py-2.5 pl-9 pr-10 text-[13px] text-[#111827] placeholder:text-[#C4C4BE] focus:border-[#111827] focus:bg-white focus:outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#D1D5DB] accent-[#1a6b3c]"
                />
                <label
                  htmlFor="remember"
                  className="text-[13px] text-[#6B7280] select-none cursor-pointer"
                >
                  Remember Me
                </label>
              </div>

              {error && <p className="text-[12.5px] text-red-600">{error}</p>}

              {/* Sign in button */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing In
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E5E5E2]" />
              <span className="text-[11px] font-medium tracking-wider text-[#9CA3AF]">
                OR CONTINUE WITH
              </span>
              <div className="h-px flex-1 bg-[#E5E5E2]" />
            </div>

            {/* Google SSO */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[#E5E5E2] bg-white py-2.5 text-[13px] font-medium text-[#374151] transition-colors hover:bg-[#F9F9F8]"
            >
              {/* Google icon */}
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>

            {/* Footer links */}
            <p className="mt-6 text-center text-[12px] text-[#9CA3AF]">
              Don&apos;t have an account?{" "}
              <Link
                href="/create-account"
                className="font-medium text-[#1a6b3c] hover:underline"
              >
                Apply for Access
              </Link>
            </p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <Link
                href="#terms"
                className="text-[11px] text-[#C4C4BE] hover:text-[#6B7280]"
              >
                Terms of Service
              </Link>
              <span className="text-[#E5E5E2]">·</span>
              <Link
                href="#privacy"
                className="text-[11px] text-[#C4C4BE] hover:text-[#6B7280]"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Right panel                                                 */}
      {/* ---------------------------------------------------------- */}
      <div className="relative hidden flex-col justify-center overflow-hidden bg-white px-16 lg:flex lg:w-1/2">
        {/* Watermark chevron graphic */}
        <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-[0.06]">
          <svg
            viewBox="0 0 400 400"
            className="h-[520px] w-[520px] text-[#111827]"
            fill="none"
            stroke="currentColor"
            strokeWidth="28"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="80,80 200,200 80,320" />
            <polyline points="180,80 300,200 180,320" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative max-w-[440px]">
          {/* Green accent line */}
          <div className="mb-5 h-0.5 w-8 bg-[#1a6b3c]" />
          <h2 className="text-[44px] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#111827]">
            The Architecture
            <br />
            of Performance.
          </h2>

          <p className="mt-6 text-[14px] leading-relaxed text-[#6B7280]">
            Apex Precision ensures your data remains at the forefront. Every
            pixel is calculated to provide surgical clarity for your investment
            decisions.
          </p>
        </div>
      </div>
    </div>
  );
}