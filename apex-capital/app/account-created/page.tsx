"use client";

import Link from "next/link";
import { CheckCircle2, ShieldCheck, LayoutDashboard, ArrowRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AccountCreatedPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7F5] font-sans text-[#111827]">
      {/* Minimal header, consistent with the marketing site */}
      <header className="border-b border-[#E5E5E2] bg-[#F7F7F5]">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-6 py-4 lg:px-10">
          <Link href="/" className="text-[17px] font-bold tracking-tight text-[#111827]">
            Apex Capital
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16 lg:px-10">
        <div className="w-full max-w-[480px]">
          {/* Success card */}
          <div className="rounded-2xl border border-[#E5E5E2] bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F0F7F2]">
              <CheckCircle2 className="h-7 w-7 text-[#1a6b3c]" strokeWidth={1.75} />
            </div>

            <h1 className="mt-6 text-[26px] font-extrabold tracking-tight text-[#111827] sm:text-[28px]">
              Your account is ready
            </h1>
            <p className="mx-auto mt-2.5 max-w-sm text-[14px] leading-relaxed text-[#6B7280]">
              Email verified and account created. You can explore the dashboard
              now, or finish identity verification to unlock deposits and
              trading right away.
            </p>

            {/* Two paths */}
            <div className="mt-8 space-y-3 text-left">
              <Link
                href="/kyc-flow"
                className="group flex items-center gap-4 rounded-xl border border-[#111827] bg-[#111827] p-4 transition-opacity hover:opacity-90"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <ShieldCheck className="h-5 w-5 text-white" strokeWidth={1.75} />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-white">
                    Complete identity verification
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-white/70">
                    Takes about 3 minutes. Required before you can deposit or trade.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                href="/dashboard"
                className="group flex items-center gap-4 rounded-xl border border-[#E5E5E2] bg-white p-4 transition-colors hover:bg-[#F7F7F5]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6]">
                  <LayoutDashboard className="h-5 w-5 text-[#111827]" strokeWidth={1.75} />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#111827]">
                    Continue to dashboard
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-[#9CA3AF]">
                    Browse markets now. You can verify later from your profile.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-[12px] text-[#9CA3AF]">
            Verification status is always visible from{" "}
            <Link href="/profile" className="font-medium text-[#6B7280] hover:text-[#111827]">
              your profile
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}