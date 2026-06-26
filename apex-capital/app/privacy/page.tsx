"use client";

import Link from "next/link";
import Navbar from "../../components/Navbar";

const sections = [
  {
    title: "Information We Collect",
    content: [
      "Account details you provide during registration — name, email address, and identity verification documents required for KYC compliance.",
      "Financial data including deposit history, trade activity, portfolio holdings, and transaction records generated through your use of the platform.",
      "Device and usage data such as IP address, browser type, pages visited, and session duration collected automatically when you access Apex Capital.",
    ],
  },
  {
    title: "How We Use Your Information",
    content: [
      "To operate and maintain your account, process transactions, and deliver the core investing features of the platform.",
      "To comply with financial regulations, anti-money laundering laws, and KYC requirements imposed on licensed investment platforms.",
      "To send you account alerts, security notifications, and — where you've opted in — market updates and product announcements.",
    ],
  },
  {
    title: "Data Sharing",
    content: [
      "We do not sell your personal data to third parties. Ever.",
      "We share data only with regulated partners required to execute your trades (clearing houses, custodians), and with authorities when legally obligated.",
      "Any third-party service provider we engage is bound by strict data processing agreements and may only use your data to perform services on our behalf.",
    ],
  },
  {
    title: "Data Security",
    content: [
      "All data is encrypted in transit using TLS 1.3 and at rest using AES-256 — the same standard used by major financial institutions.",
      "Access to your account data within our systems is role-restricted and logged. We conduct regular security audits and penetration tests.",
      "In the unlikely event of a breach affecting your data, we will notify you within 72 hours as required by applicable law.",
    ],
  },
  {
    title: "Your Rights",
    content: [
      "You may request a full export of your personal data at any time from your account settings.",
      "You may request deletion of your account and associated data, subject to our legal obligation to retain certain financial records.",
      "To exercise any of these rights or raise a privacy concern, contact us at privacy@apexcapital.com.",
    ],
  },
  {
    title: "Cookies",
    content: [
      "We use strictly necessary cookies to keep you logged in and secure your session. These cannot be disabled.",
      "We use optional analytics cookies to understand how the platform is used and improve it. You can opt out of these at any time via your browser settings.",
      "We do not use advertising or tracking cookies.",
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      <Navbar variant="public" />

      <main className="px-6 py-16 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-3xl">

          {/* Header */}
          <div className="mb-12">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
              Legal
            </p>
            <h1 className="mt-2 text-[36px] font-extrabold tracking-[-0.02em] text-[#111827] sm:text-[44px]">
              Privacy Policy
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-[#6B7280]">
              Apex Capital is committed to protecting your personal data. This
              policy explains what we collect, why we collect it, and how we
              keep it safe. Last updated{" "}
              <span className="font-medium text-[#111827]">June 2025</span>.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section, i) => (
              <div
                key={section.title}
                className="rounded-xl border border-[#E5E5E2] bg-white p-6"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6] text-[12px] font-bold text-[#6B7280]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="text-[16px] font-semibold text-[#111827]">
                      {section.title}
                    </h2>
                    <ul className="mt-3 space-y-2">
                      {section.content.map((point, j) => (
                        <li key={j} className="flex items-start gap-2.5">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D1D5DB]" />
                          <p className="text-[13px] leading-relaxed text-[#6B7280]">
                            {point}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-8 rounded-xl border border-[#E5E5E2] bg-[#F0F0ED] px-6 py-5">
            <p className="text-[13px] leading-relaxed text-[#6B7280]">
              Questions about this policy? Reach us at{" "}
              <a
                href="mailto:privacy@apexcapital.com"
                className="font-medium text-[#111827] hover:underline"
              >
                privacy@apexcapital.com
              </a>{" "}
              or visit our{" "}
              <Link href="/contact" className="font-medium text-[#111827] hover:underline">
                Contact page
              </Link>
              .
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}