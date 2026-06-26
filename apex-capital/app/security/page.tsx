"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import {
  ShieldCheck,
  Lock,
  Server,
  Fingerprint,
  Eye,
  KeyRound,
  ChevronDown,
  ArrowUpRight,
  CheckCircle2,
  UserCheck,
  ScanFace,
  Activity,
  ShieldAlert,
  FileCheck2,
  Landmark,
  Database,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Static content                                                     */
/* ------------------------------------------------------------------ */

const trustMetrics = [
  {
    icon: Lock,
    value: "256-bit",
    label: "AES encryption on all stored and transmitted data",
  },
  {
    icon: Activity,
    value: "99.99%",
    label: "Platform availability, measured over trailing 12 months",
  },
  {
    icon: Eye,
    value: "24/7",
    label: "Automated monitoring backed by a human security team",
  },
  {
    icon: ShieldAlert,
    value: "Multi-layer",
    label: "Fraud detection across login, device, and transaction signals",
  },
];

const securityFeatures = [
  {
    icon: Lock,
    title: "Bank-level encryption",
    description:
      "Customer data is encrypted at rest and in transit using AES-256, the same standard used by major financial institutions.",
  },
  {
    icon: KeyRound,
    title: "Multi-factor authentication",
    description:
      "Sign in with an authenticator app, SMS code, or biometric login, on top of your password.",
  },
  {
    icon: Activity,
    title: "Continuous threat monitoring",
    description:
      "Automated systems watch for unusual logins, device changes, and transaction patterns around the clock.",
  },
  {
    icon: Server,
    title: "Secure infrastructure",
    description:
      "Apex Capital runs on redundant, enterprise-grade cloud infrastructure with automatic failover.",
  },
  {
    icon: UserCheck,
    title: "Identity verification",
    description:
      "Every account is verified against industry-standard KYC and AML checks before funds can move.",
  },
  {
    icon: ShieldCheck,
    title: "Secure transactions",
    description:
      "Deposits, withdrawals, and trades are encrypted and screened before they're processed.",
  },
];

const journeySteps = [
  { title: "Create account", icon: UserCheck },
  { title: "Verify identity", icon: ScanFace },
  { title: "Enable 2FA", icon: KeyRound },
  { title: "Fund securely", icon: Lock },
  { title: "Invest, protected", icon: ShieldCheck },
];

const protectionLayers = [
  "AES-256 encryption, end to end",
  "Device and location verification",
  "Real-time fraud detection",
  "Behavioral anomaly analytics",
  "Secure, time-limited sessions",
  "Automatic threat blocking",
];

const complianceCards = [
  {
    icon: FileCheck2,
    title: "KYC compliance",
    description:
      "Every customer is identity-checked before they can deposit or trade, in line with global standards.",
  },
  {
    icon: ShieldAlert,
    title: "AML monitoring",
    description:
      "Transactions are continuously screened for patterns associated with money laundering or fraud.",
  },
  {
    icon: Database,
    title: "Data privacy",
    description:
      "Personal data is never sold. Access inside Apex Capital is limited strictly on a need-to-know basis.",
  },
  {
    icon: Landmark,
    title: "Segregated funds",
    description:
      "Client funds are held in segregated accounts, separate from corporate operating funds.",
  },
];

const securityFaqs = [
  {
    question: "Is my money secure?",
    answer:
      "Yes. Client funds are held in segregated accounts and protected with the same encryption and monitoring standards used across the rest of the platform. No single point of failure controls access to customer assets.",
  },
  {
    question: "How is my personal information protected?",
    answer:
      "All personal data is encrypted at rest and in transit, access is restricted on a need-to-know basis internally, and we never sell customer data to third parties.",
  },
  {
    question: "What happens if suspicious activity is detected?",
    answer:
      "Affected accounts are automatically restricted from further transactions while our security team investigates, and you'll be notified immediately through your registered email and in-app alerts.",
  },
  {
    question: "Do you support two-factor authentication?",
    answer:
      "Yes. You can secure your account with an authenticator app or SMS-based verification codes in addition to your password.",
  },
  {
    question: "How is my identity verified?",
    answer:
      "We use industry-standard KYC checks, matching a government-issued ID against a live selfie, to confirm you are who you say you are before enabling deposits or withdrawals.",
  },
];

/* ------------------------------------------------------------------ */
/*  Hero illustration — layered security cards                        */
/* ------------------------------------------------------------------ */

function SecurityIllustration() {
  return (
    <div className="relative mx-auto h-[320px] w-full max-w-[420px] sm:h-[380px]">
      {/* Back card */}
      <div className="absolute right-2 top-6 h-44 w-56 -rotate-6 rounded-2xl border border-[#E5E5E2] bg-white p-4 shadow-sm sm:h-52 sm:w-64">
        <Server className="h-5 w-5 text-[#9CA3AF]" strokeWidth={1.75} />
        <p className="mt-3 text-[12px] font-semibold text-[#111827]">
          Secure infrastructure
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#9CA3AF]">
          Redundant cloud hosting with automatic failover.
        </p>
      </div>

      {/* Middle card */}
      <div className="absolute left-1 top-20 h-44 w-56 rotate-3 rounded-2xl border border-[#E5E5E2] bg-white p-4 shadow-sm sm:h-52 sm:w-64">
        <Fingerprint className="h-5 w-5 text-[#1a6b3c]" strokeWidth={1.75} />
        <p className="mt-3 text-[12px] font-semibold text-[#111827]">
          Identity verification
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#9CA3AF]">
          KYC-verified accounts, checked before funding.
        </p>
      </div>

      {/* Front card */}
      <div className="absolute left-1/2 top-36 h-44 w-60 -translate-x-1/2 rounded-2xl border border-[#E5E5E2] bg-white p-5 shadow-md sm:h-52 sm:w-72">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0F7F2]">
          <ShieldCheck className="h-5 w-5 text-[#1a6b3c]" strokeWidth={1.75} />
        </div>
        <p className="mt-3 text-[13px] font-semibold text-[#111827]">
          Account protected
        </p>
        <div className="mt-3 space-y-1.5">
          {["256-bit encryption", "2FA enabled", "Device verified"].map(
            (item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#1a6b3c]" />
                <span className="text-[11px] text-[#6B7280]">{item}</span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function SecurityPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      <Navbar variant="public" />

      <main>
        {/* ---------------------------------------------------- */}
        {/* Hero */}
        {/* ---------------------------------------------------- */}
        <section className="px-6 py-16 lg:px-10 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
                Security
              </p>
              <h1 className="mt-3 text-[40px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#111827] sm:text-[52px]">
                Security Built for
                <br />
                Institutional Confidence
              </h1>
              <p className="mt-5 max-w-[460px] text-[15px] leading-relaxed text-[#6B7280]">
                Your investments deserve enterprise-grade protection. Apex
                Capital combines advanced encryption, intelligent fraud
                detection, secure infrastructure, and rigorous compliance to
                safeguard every account and every transaction.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#features"
                  className="rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  Learn About Our Security
                </a>
                <Link
                  href="/create-account"
                  className="rounded-lg border border-[#E5E5E2] bg-white px-5 py-2.5 text-[14px] font-medium text-[#111827] transition-colors hover:bg-[#F7F7F5]"
                >
                  Create Account
                </Link>
              </div>
            </div>

            <SecurityIllustration />
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* Trust metrics */}
        {/* ---------------------------------------------------- */}
        <section className="border-y border-[#E5E5E2] bg-white px-6 py-16 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trustMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-5 transition-shadow hover:shadow-sm"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#F0F7F2]">
                    <metric.icon
                      className="h-5 w-5 text-[#1a6b3c]"
                      strokeWidth={1.75}
                    />
                  </div>
                  <p className="mt-4 text-[24px] font-extrabold tracking-tight text-[#111827]">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#6B7280]">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* Enterprise security features */}
        {/* ---------------------------------------------------- */}
        <section id="features" className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-[30px] font-extrabold tracking-tight text-[#111827] sm:text-[36px]">
                Enterprise Security Features
              </h2>
              <p className="mt-3 text-[14px] text-[#6B7280]">
                Every layer of Apex Capital is designed around a simple
                premise: your capital and your data stay yours.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {securityFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-[#E5E5E2] bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#F0F7F2] transition-transform group-hover:scale-105">
                    <feature.icon
                      className="h-5 w-5 text-[#1a6b3c]"
                      strokeWidth={1.75}
                    />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold text-[#111827]">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7280]">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* Security journey timeline */}
        {/* ---------------------------------------------------- */}
        <section className="bg-[#F0F0ED] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-[30px] font-extrabold tracking-tight text-[#111827] sm:text-[36px]">
              From Sign-Up to Secure Investing
            </h2>

            <div className="mt-14">
              {/* Mobile: vertical list */}
              <div className="flex flex-col gap-6 sm:hidden">
                {journeySteps.map((step, i) => (
                  <div key={step.title} className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E5E5E2] bg-white">
                      <step.icon
                        className="h-5 w-5 text-[#1a6b3c]"
                        strokeWidth={1.75}
                      />
                    </div>
                    <p className="text-[14px] font-medium text-[#111827]">
                      {step.title}
                    </p>
                    {i < journeySteps.length - 1 && (
                      <span className="ml-auto text-[#D1D5DB]">
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop: horizontal timeline */}
              <div className="relative hidden sm:block">
                <div className="absolute left-0 right-0 top-[22px] h-px bg-[#E5E5E2]" />
                <div className="relative flex justify-between">
                  {journeySteps.map((step) => (
                    <div
                      key={step.title}
                      className="flex w-[140px] flex-col items-center text-center"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E5E2] bg-white">
                        <step.icon
                          className="h-5 w-5 text-[#1a6b3c]"
                          strokeWidth={1.75}
                        />
                      </div>
                      <p className="mt-3 text-[13px] font-medium text-[#111827]">
                        {step.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* Protection layers */}
        {/* ---------------------------------------------------- */}
        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <div className="relative mx-auto flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
                <div className="absolute inset-0 rounded-full bg-[#F0F7F2]" />
                <ShieldCheck
                  className="relative h-28 w-28 text-[#1a6b3c] sm:h-32 sm:w-32"
                  strokeWidth={1.25}
                />
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="text-[28px] font-bold tracking-tight text-[#111827] sm:text-[34px]">
                Multiple Layers of Protection
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-[#6B7280]">
                No single safeguard is enough on its own. Apex Capital stacks
                independent layers of protection so that if one signal misses
                something, another catches it.
              </p>
              <ul className="mt-6 space-y-3">
                {protectionLayers.map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1a6b3c]" />
                    <span className="text-[14px] text-[#374151]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* Compliance */}
        {/* ---------------------------------------------------- */}
        <section className="bg-[#F0F0ED] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-[30px] font-extrabold tracking-tight text-[#111827] sm:text-[36px]">
                Compliance You Can Verify
              </h2>
              <p className="mt-3 text-[14px] text-[#6B7280]">
                Apex Capital operates within established regulatory
                frameworks, not around them.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {complianceCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl border border-[#E5E5E2] bg-white p-6"
                >
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#F0F7F2]">
                    <card.icon
                      className="h-5 w-5 text-[#1a6b3c]"
                      strokeWidth={1.75}
                    />
                  </div>
                  <h3 className="mt-4 text-[14px] font-semibold text-[#111827]">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7280]">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* FAQ */}
        {/* ---------------------------------------------------- */}
        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-[30px] font-extrabold tracking-tight text-[#111827] sm:text-[36px]">
              Frequently Asked Security Questions
            </h2>

            <div className="mt-10 divide-y divide-[#E5E5E2] rounded-xl border border-[#E5E5E2] bg-white overflow-hidden">
              {securityFaqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={faq.question}>
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between px-6 py-5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="text-[15px] font-medium text-[#111827]">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`ml-4 h-4 w-4 shrink-0 text-[#6B7280] transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="px-6 pb-5 text-[13px] leading-relaxed text-[#6B7280]">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- */}
        {/* Final CTA */}
        {/* ---------------------------------------------------- */}
        <section className="px-6 pb-20 lg:px-10">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[#E5E5E2] bg-[#F0F0ED] px-6 py-20 text-center">
            <h2 className="text-[36px] font-extrabold tracking-tight text-[#111827] sm:text-[46px]">
              Invest With Confidence
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-[#6B7280]">
              Security isn&apos;t just a feature, it&apos;s the foundation of
              everything we build.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/create-account"
                className="rounded-lg bg-[#111827] px-6 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Create Free Account
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-[#D1D5DB] bg-white px-6 py-3 text-[14px] font-medium text-[#111827] transition-colors hover:bg-[#F9FAFB]"
              >
                Contact Security Team
              </Link>
            </div>

            <ShieldCheck
              className="pointer-events-none absolute bottom-6 right-6 h-24 w-24 text-[#111827]/8 sm:h-32 sm:w-32"
              strokeWidth={1.5}
            />
            <Lock
              className="pointer-events-none absolute -left-6 top-6 h-20 w-20 text-[#111827]/5 sm:h-28 sm:w-28"
              strokeWidth={1.5}
            />
          </div>
        </section>
      </main>
    </div>
  );
}