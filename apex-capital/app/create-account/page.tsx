"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client"; // adjust if your client lives elsewhere

export default function CreateAccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fullName = `${firstName} ${lastName}`.trim();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // shows up in raw_user_meta_data -> your handle_new_user() trigger
        // reads this to populate profiles.full_name
        data: { full_name: fullName },
      },
    });

    if (signUpError) {
      setLoading(false);
      if (signUpError.message.toLowerCase().includes("already registered")) {
        setError("DUPLICATE_EMAIL");
      } else {
        setError(signUpError.message);
      }
      return;
    }

    setLoading(false);
    router.push("/account-created");
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

  return (
    <div className="h-screen overflow-y-auto bg-[#F0F0ED] font-sans lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-full flex-col lg:h-screen lg:flex-row">
        {/* ---------------------------------------------------------- */}
        {/* Left panel                                                  */}
        {/* ---------------------------------------------------------- */}
        <div className="flex w-full flex-col lg:h-screen lg:w-1/2 lg:overflow-y-auto">
          {/* Top bar */}
          <div className="flex shrink-0 items-center justify-between px-6 py-5 lg:px-12 lg:py-6">
            <Link href="/" className="text-[16px] font-bold tracking-tight text-[#111827]">
              Apex Capital
            </Link>
            <Link
              href="/login"
              className="text-[12px] text-[#6B7280] transition-colors hover:text-[#111827]"
            >
              Sign In
            </Link>
          </div>

          {/* Form area */}
          <div className="flex flex-1 flex-col justify-center px-6 py-2 lg:px-12">
            <div className="mx-auto w-full max-w-[380px]">
              <h1 className="text-[24px] font-bold tracking-tight text-[#111827]">
                Create Account
              </h1>
              <p className="mt-1.5 text-[12.5px] leading-snug text-[#6B7280]">
                Experience architectural clarity in your global portfolio
                management.
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
                {/* First / Last name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      required
                      className="w-full rounded-lg border border-[#E5E5E2] bg-[#F9F9F8] px-3.5 py-2.5 text-[13px] text-[#111827] placeholder:text-[#C4C4BE] focus:border-[#111827] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-[#6B7280]">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      required
                      className="w-full rounded-lg border border-[#E5E5E2] bg-[#F9F9F8] px-3.5 py-2.5 text-[13px] text-[#111827] placeholder:text-[#C4C4BE] focus:border-[#111827] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john.doe@apex.com"
                    required
                    className="w-full rounded-lg border border-[#E5E5E2] bg-[#F9F9F8] px-3.5 py-2.5 text-[13px] text-[#111827] placeholder:text-[#C4C4BE] focus:border-[#111827] focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-[#6B7280]">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="w-full rounded-lg border border-[#E5E5E2] bg-[#F9F9F8] px-3.5 py-2.5 pr-10 text-[13px] text-[#111827] placeholder:text-[#C4C4BE] focus:border-[#111827] focus:bg-white focus:outline-none"
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

                {/* Terms */}
                <p className="text-[11px] leading-snug text-[#9CA3AF]">
                  By clicking &quot;Create Account&quot;, you agree to our{" "}
                  <Link href="#terms" className="font-medium text-[#111827] underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="#privacy" className="font-medium text-[#111827] underline">
                    Privacy Policy
                  </Link>
                  .
                </p>

                {error === "DUPLICATE_EMAIL" ? (
                  <p className="text-[12.5px] text-red-600">
                    An account with this email already exists.{" "}
                    <Link href="/login" className="font-medium underline">
                      Sign in instead
                    </Link>
                    .
                  </p>
                ) : (
                  error && <p className="text-[12.5px] text-red-600">{error}</p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a6b3c] py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Account
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#E5E5E2]" />
                <span className="text-[10.5px] font-medium tracking-wider text-[#9CA3AF]">
                  OR
                </span>
                <div className="h-px flex-1 bg-[#E5E5E2]" />
              </div>

              {/* Google SSO */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[#E5E5E2] bg-white py-2.5 text-[13px] font-medium text-[#374151] transition-colors hover:bg-[#F9F9F8]"
              >
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
                Continue with Google
              </button>

              {/* Institutional security card - mobile/tablet only */}
              <div className="mt-5 rounded-xl border border-[#E5E5E2] bg-white p-4 lg:hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                  <ShieldCheck className="h-4 w-4 text-[#1a6b3c]" />
                </div>
                <h3 className="mt-2.5 text-[14px] font-semibold text-[#111827]">
                  Institutional Security
                </h3>
                <p className="mt-1 text-[11.5px] leading-snug text-[#6B7280]">
                  Your assets are protected with military-grade encryption and
                  multi-sig cold storage.
                </p>
                <div className="mt-3 flex gap-8 border-t border-[#F3F4F6] pt-3">
                  <div>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                      Active Users
                    </p>
                    <p className="mt-0.5 text-[14px] font-bold text-[#111827]">
                      124k+
                    </p>
                  </div>
                  <div>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                      AUM
                    </p>
                    <p className="mt-0.5 text-[14px] font-bold text-[#111827]">
                      $2.4B
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - mobile/tablet only */}
          <div className="shrink-0 px-6 py-5 lg:hidden">
            <p className="text-[11px] text-[#9CA3AF]">
              © {new Date().getFullYear()} Apex Capital. Global Portfolio Management.
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Right panel - desktop only                                  */}
        {/* ---------------------------------------------------------- */}
        <div className="relative hidden w-1/2 flex-col bg-white lg:flex lg:h-screen">
          {/* Top bar spacer to align with left */}
          <div className="shrink-0 px-12 py-6">
            <span className="invisible text-[12px]">spacer</span>
          </div>

          <div className="relative flex flex-1 flex-col justify-center overflow-hidden px-16">
            {/* Watermark chevron graphic */}
            <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 opacity-[0.06]">
              <svg
                viewBox="0 0 400 400"
                className="h-[420px] w-[420px] text-[#111827]"
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

            <div className="relative max-w-[380px]">
              <div className="mb-5 h-0.5 w-8 bg-[#1a6b3c]" />
              <h2 className="text-[36px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#111827]">
                The Architecture<br />of Performance.
              </h2>
              <p className="mt-5 text-[13.5px] leading-relaxed text-[#6B7280]">
                Apex Precision ensures your data remains at the forefront.
                Every pixel is calculated to provide surgical clarity for your
                investment decisions.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[#F3F4F6] px-12 py-4 text-center">
            <p className="text-[11px] text-[#9CA3AF]">
              © {new Date().getFullYear()} Apex Capital. Global Portfolio Management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}