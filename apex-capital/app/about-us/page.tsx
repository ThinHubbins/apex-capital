"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Globe2, ShieldCheck, Zap, Eye, Users, TrendingUp,
  Landmark, Mail, ArrowUpRight, Star, CheckCircle2,
  Lock, BadgeCheck, Server, ScanFace, ChevronRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";

// ─── Types ─────────────────────────────────────────────────────────

type Milestone = {
  year: string;
  title: string;
  description: string;
  isFuture?: boolean;
};

// ─── Data ──────────────────────────────────────────────────────────

const stats = [
  { value: "2M+", label: "Active Investors" },
  { value: "$14B+", label: "Assets Tracked" },
  { value: "48", label: "Countries Served" },
  { value: "120+", label: "Global Markets" },
];

const bigNumbers = [
  { value: "2M+", label: "Investors worldwide" },
  { value: "$14B+", label: "Assets tracked" },
  { value: "120+", label: "Markets accessible" },
  { value: "99.99%", label: "Platform uptime" },
];

const values = [
  {
    icon: Eye,
    title: "Transparency",
    description: "No hidden fees, no fine print surprises. Every cost is shown before you confirm any action.",
    iconBg: "bg-sky-50",
    iconColor: "text-sky-700",
  },
  {
    icon: Globe2,
    title: "Accessibility",
    description: "Global markets shouldn't be reserved for the wealthy. We open them to anyone with an internet connection.",
    iconBg: "bg-emerald-50",
    iconColor: "text-[#1a6b3c]",
  },
  {
    icon: ShieldCheck,
    title: "Security",
    description: "Your funds and data are protected by SIPC insurance, military-grade encryption, and continuous monitoring.",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-700",
  },
  {
    icon: Zap,
    title: "Innovation",
    description: "We ship improvements every week. The platform you use today will be meaningfully better next month.",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
  },
];

const milestones: Milestone[] = [
  {
    year: "2019",
    title: "Company founded",
    description: "Three engineers left traditional finance frustrated by fragmented, expensive global trading tools. Apex Capital was incorporated in Delaware.",
  },
  {
    year: "2020",
    title: "First investors joined",
    description: "Beta launched to 500 early users. Feedback shaped the core dashboard, portfolio tracker, and order execution engine.",
  },
  {
    year: "2021",
    title: "Platform launch",
    description: "Public launch with US and European markets. 50,000 accounts opened in the first 90 days. Commission-free trading introduced.",
  },
  {
    year: "2022",
    title: "Global expansion",
    description: "Added Asian markets and fractional shares. Crossed $1B in assets tracked. Secured Series B funding.",
  },
  {
    year: "2025 →",
    title: "What's next",
    description: "AI-powered portfolio analysis, tax optimization tools, and direct indexing for high-net-worth accounts.",
    isFuture: true,
  },
];

const trustFeatures = [
  {
    icon: Lock,
    title: "Advanced security",
    description: "256-bit AES encryption on all data in transit and at rest.",
  },
  {
    icon: BadgeCheck,
    title: "Regulated infrastructure",
    description: "Registered with FINRA and compliant with SEC regulations.",
  },
  {
    icon: Globe2,
    title: "Global market access",
    description: "Direct connections to 120+ exchanges across 48 countries.",
  },
  {
    icon: TrendingUp,
    title: "Fast withdrawals",
    description: "Most withdrawals processed within 1–2 business days.",
  },
  {
    icon: Server,
    title: "Institutional technology",
    description: "99.99% uptime SLA backed by multi-region redundancy.",
  },
  {
    icon: ShieldCheck,
    title: "Portfolio protection",
    description: "SIPC coverage up to $500,000 on all eligible accounts.",
  },
];

const team = [
  {
    name: "Marcus Reid",
    role: "Co-founder & CEO",
    bio: "Former Goldman Sachs VP. Led global equities trading for 8 years before founding Apex.",
    initials: "MR",
    accent: "#111827",
  },
  {
    name: "Priya Nair",
    role: "Co-founder & CTO",
    bio: "Ex-Stripe engineering lead. Built payment infrastructure processing $2B/day before joining Apex.",
    initials: "PN",
    accent: "#1a6b3c",
  },
  {
    name: "James Okafor",
    role: "Co-founder & COO",
    bio: "Former BlackRock portfolio manager. Managed $4B in emerging market assets over a decade.",
    initials: "JO",
    accent: "#374151",
  },
  {
    name: "Sofia Chen",
    role: "Chief Compliance Officer",
    bio: "15 years in fintech regulation. Previously Head of Compliance at Robinhood and Coinbase.",
    initials: "SC",
    accent: "#1a6b3c",
  },
];

const testimonials = [
  {
    name: "David Mensah",
    role: "Software Engineer",
    country: "Ghana",
    quote: "I'd been locked out of US markets for years. Apex Capital changed that completely — I was trading Apple shares within an hour of signing up.",
    rating: 5,
  },
  {
    name: "Camille Dubois",
    role: "Freelance Designer",
    country: "France",
    quote: "The portfolio dashboard is genuinely better than what my bank offers. Clear, fast, and no confusing fees hidden in the fine print.",
    rating: 5,
  },
  {
    name: "Arun Sharma",
    role: "Product Manager",
    country: "India",
    quote: "I've tried four different platforms. Apex is the only one that feels like it was built by people who actually invest their own money.",
    rating: 5,
  },
];

const securityItems = [
  { icon: Lock, label: "256-bit AES encryption", sub: "All data in transit and at rest" },
  { icon: ScanFace, label: "Biometric verification", sub: "KYC-compliant identity checks" },
  { icon: ShieldCheck, label: "SIPC insured", sub: "Up to $500,000 per account" },
  { icon: Server, label: "Multi-region hosting", sub: "99.99% uptime guarantee" },
];

const regions = [
  { name: "North America", markets: "NYSE, NASDAQ, TSX", count: "12 exchanges" },
  { name: "Europe", markets: "LSE, Euronext, XETRA", count: "28 exchanges" },
  { name: "Asia Pacific", markets: "TSE, SSE, ASX", count: "42 exchanges" },
  { name: "Emerging Markets", markets: "NSE, B3, JSE", count: "38 exchanges" },
];

const productLinks = ["Markets", "Wealth Management", "Security"];
const companyLinks = ["About Us", "Careers", "Media Kit", "Contact"];
const legalLinks = ["Privacy Policy", "Terms of Service", "Security", "Help Center"];

// ─── Component ─────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      <Navbar variant="public" />

      <main>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="px-6 py-16 lg:px-10 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">

            {/* Left */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E2] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#6B7280]">
                <Globe2 className="h-3.5 w-3.5 text-[#1a6b3c]" />
                Global Investing Platform
              </span>
              <h1 className="mt-5 text-[44px] font-extrabold leading-[1.06] tracking-[-0.02em] text-[#111827] sm:text-[54px]">
                Building a Better
                <br />
                Way to Invest
                <br />
                <span className="text-[#1a6b3c]">Globally</span>
              </h1>
              <p className="mt-5 max-w-[440px] text-[15px] leading-relaxed text-[#6B7280]">
                Apex Capital was built to make international investing accessible, transparent, and simple — for anyone, anywhere. No gatekeepers. No opacity. Just markets.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/create-account"
                  className="rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  Open Account
                </Link>
                <Link
                  href="/markets"
                  className="rounded-lg border border-[#E5E5E2] bg-white px-5 py-2.5 text-[14px] font-medium text-[#111827] transition-colors hover:bg-[#F0F0ED]"
                >
                  Explore Markets
                </Link>
              </div>
            </div>

            {/* Right — stats card */}
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Platform at a glance
              </p>
              <div className="mt-5 grid grid-cols-2 gap-4">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] px-4 py-4">
                    <p className="text-[28px] font-extrabold tracking-tight text-[#111827]">{s.value}</p>
                    <p className="mt-0.5 text-[12px] text-[#6B7280]">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-[#E5E5E2] bg-[#F0F7F2] px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1a6b3c]" />
                <p className="text-[12.5px] font-medium text-[#1a6b3c]">
                  SIPC insured · SEC regulated · 99.99% uptime
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Our Story ────────────────────────────────────────── */}
        <section className="bg-[#F0F0ED] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-[280px_1fr] lg:gap-20">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Our story</p>
                <h2 className="mt-3 text-[36px] font-extrabold leading-tight tracking-tight text-[#111827]">
                  Why we
                  <br />
                  built this
                </h2>
              </div>
              <div className="space-y-5 text-[15px] leading-relaxed text-[#6B7280]">
                <p>
                  In 2019, three people who'd spent years inside traditional finance grew tired of watching the same problem repeat itself: global markets were accessible in theory, but practically out of reach for most individuals. High minimums, convoluted account setups, and fee structures designed to obscure rather than inform.
                </p>
                <p>
                  We built Apex Capital because the infrastructure for global investing already existed — it just wasn't pointed at ordinary people. Institutional desks had real-time execution across 120 exchanges. Retail investors had slow platforms, high spreads, and customer service that treated them as afterthoughts.
                </p>
                <p>
                  Our goal was never to disrupt finance for its own sake. It was to close the gap between what sophisticated investors had access to and what everyone else was offered. Clean tools. Honest pricing. No friction between you and the markets you want to participate in.
                </p>
                <p className="font-medium text-[#111827]">
                  That's still the only thing we're working on.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Mission & Vision ─────────────────────────────────── */}
        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#E5E5E2] bg-white p-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F7F2]">
                  <TrendingUp className="h-5 w-5 text-[#1a6b3c]" />
                </div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Mission</p>
                <h3 className="mt-2 text-[22px] font-extrabold tracking-tight text-[#111827]">
                  Open every market to every investor
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-[#6B7280]">
                  We exist to remove every unnecessary barrier between an investor and a global opportunity. That means simple onboarding, honest fees, and tools that don't require a finance degree to use.
                </p>
              </div>
              <div className="rounded-2xl border border-[#E5E5E2] bg-[#111827] p-8 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <Globe2 className="h-5 w-5 text-white" />
                </div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Vision</p>
                <h3 className="mt-2 text-[22px] font-extrabold tracking-tight text-white">
                  A world without borders in investing
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-white/60">
                  We're building toward a future where your nationality and net worth don't determine which markets you can access. Capital should flow freely to where opportunity exists — for everyone.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Core Values ──────────────────────────────────────── */}
        <section className="bg-[#F0F0ED] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Core values</p>
              <h2 className="mt-3 text-[30px] font-extrabold tracking-tight text-[#111827] sm:text-[36px]">
                What guides every decision
              </h2>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((v) => (
                <div key={v.title} className="rounded-xl border border-[#E5E5E2] bg-white p-6">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${v.iconBg}`}>
                    <v.icon className={`h-5 w-5 ${v.iconColor}`} strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold text-[#111827]">{v.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7280]">{v.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Timeline ─────────────────────────────────────────── */}
        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Our journey</p>
              <h2 className="mt-3 text-[30px] font-extrabold tracking-tight text-[#111827] sm:text-[36px]">
                Five years, one direction
              </h2>
            </div>

            <div className="relative mt-16">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#E5E5E2]" />

              <div className="flex flex-col gap-12">
                {milestones.map((m, i) => {
                  const isLeft = i % 2 === 0;
                  return (
                    <div key={m.year} className="grid grid-cols-[1fr_72px_1fr] items-center gap-4">
                      {isLeft ? (
                        <>
                          <div className="text-right">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">{m.year}</p>
                            <h3 className="mt-1 text-[15px] font-semibold text-[#111827]">{m.title}</h3>
                            <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">{m.description}</p>
                          </div>
                          <div className="flex justify-center">
                            <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold ${
                              m.isFuture
                                ? "border-dashed border-[#9CA3AF] bg-[#F7F7F5] text-[#9CA3AF]"
                                : "border-[#111827] bg-[#111827] text-white"
                            }`}>
                              {m.year.replace("→", "").replace(" ", "").slice(-2)}
                            </div>
                          </div>
                          <div />
                        </>
                      ) : (
                        <>
                          <div />
                          <div className="flex justify-center">
                            <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold ${
                              m.isFuture
                                ? "border-dashed border-[#9CA3AF] bg-[#F7F7F5] text-[#9CA3AF]"
                                : "border-[#111827] bg-[#111827] text-white"
                            }`}>
                              {m.year.replace("→", "").replace(" ", "").slice(-2)}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">{m.year}</p>
                            <h3 className="mt-1 text-[15px] font-semibold text-[#111827]">{m.title}</h3>
                            <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">{m.description}</p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── By the Numbers ───────────────────────────────────── */}
        <section className="border-y border-[#E5E5E2] bg-white px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-5xl">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
              By the numbers
            </p>
            <div className="mt-10 grid grid-cols-2 gap-8 lg:grid-cols-4">
              {bigNumbers.map((n) => (
                <div key={n.label} className="text-center">
                  <p className="text-[44px] font-extrabold tracking-tight text-[#111827] sm:text-[52px]">{n.value}</p>
                  <p className="mt-2 text-[12px] font-medium text-[#9CA3AF]">{n.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Investors Trust Us ───────────────────────────── */}
        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Trust</p>
              <h2 className="mt-3 text-[30px] font-extrabold tracking-tight text-[#111827] sm:text-[36px]">
                Why investors trust us
              </h2>
              <p className="mt-3 text-[14px] text-[#6B7280]">
                We've built every layer of the platform with one question in mind: would we trust this with our own money?
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trustFeatures.map((f) => (
                <div key={f.title} className="flex items-start gap-4 rounded-xl border border-[#E5E5E2] bg-white p-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0F7F2]">
                    <f.icon className="h-4.5 w-4.5 text-[#1a6b3c]" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#111827]">{f.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Leadership ───────────────────────────────────────── */}
        <section className="bg-[#F0F0ED] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Leadership</p>
              <h2 className="mt-3 text-[30px] font-extrabold tracking-tight text-[#111827] sm:text-[36px]">
                Built by people who've been on both sides
              </h2>
              <p className="mt-3 text-[14px] text-[#6B7280]">
                Our founders came from Goldman, Stripe, BlackRock, and Robinhood — and left because they knew it could be better.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((member) => (
                <div key={member.name} className="rounded-xl border border-[#E5E5E2] bg-white p-6">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-xl text-[15px] font-extrabold text-white"
                    style={{ backgroundColor: member.accent }}
                  >
                    {member.initials}
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold text-[#111827]">{member.name}</h3>
                  <p className="mt-0.5 text-[12px] font-medium text-[#1a6b3c]">{member.role}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#6B7280]">{member.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security & Compliance ────────────────────────────── */}
        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white">
              <div className="grid lg:grid-cols-2">
                {/* Left */}
                <div className="border-b border-[#E5E5E2] p-10 lg:border-b-0 lg:border-r">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Security</p>
                  <h2 className="mt-3 text-[28px] font-extrabold tracking-tight text-[#111827]">
                    Your money is protected at every layer
                  </h2>
                  <p className="mt-3 text-[14px] leading-relaxed text-[#6B7280]">
                    We treat security as infrastructure, not a feature. Every component — from how we store your password to how we execute your trades — was designed with the assumption that someone is trying to compromise it.
                  </p>
                  <Link
                    href="/security"
                    className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-[#111827] hover:opacity-70"
                  >
                    Read our security overview <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Right */}
                <div className="grid grid-cols-2 divide-x divide-y divide-[#E5E5E2]">
                  {securityItems.map((item) => (
                    <div key={item.label} className="p-6">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0F7F2]">
                        <item.icon className="h-4.5 w-4.5 text-[#1a6b3c]" strokeWidth={1.75} />
                      </div>
                      <p className="mt-3 text-[13px] font-semibold text-[#111827]">{item.label}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#9CA3AF]">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Global Presence ──────────────────────────────────── */}
        <section className="bg-[#F0F0ED] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Global presence</p>
              <h2 className="mt-3 text-[30px] font-extrabold tracking-tight text-[#111827] sm:text-[36px]">
                120+ markets across 48 countries
              </h2>
              <p className="mt-3 text-[14px] text-[#6B7280]">
                Direct exchange connections — no intermediaries marking up your fills.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {regions.map((r) => (
                <div key={r.name} className="rounded-xl border border-[#E5E5E2] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-semibold text-[#111827]">{r.name}</h3>
                    <span className="rounded-full bg-[#F0F7F2] px-2 py-0.5 text-[11px] font-semibold text-[#1a6b3c]">
                      {r.count}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] text-[#9CA3AF]">{r.markets}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────────────────── */}
        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Investors</p>
              <h2 className="mt-3 text-[30px] font-extrabold tracking-tight text-[#111827] sm:text-[36px]">
                What our users say
              </h2>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.name} className="rounded-xl border border-[#E5E5E2] bg-white p-6">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-[#1a6b3c] text-[#1a6b3c]" />
                    ))}
                  </div>
                  <p className="mt-4 text-[14px] leading-relaxed text-[#374151]">"{t.quote}"</p>
                  <div className="mt-5 flex items-center gap-3 border-t border-[#F3F4F6] pt-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[12px] font-bold text-white">
                      {t.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#111827]">{t.name}</p>
                      <p className="text-[11px] text-[#9CA3AF]">{t.role} · {t.country}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────── */}
        <section className="px-6 pb-20 lg:px-10">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[#E5E5E2] bg-[#111827] px-6 py-20 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
              Get started
            </p>
            <h2 className="mx-auto mt-4 max-w-xl text-[36px] font-extrabold tracking-tight text-white sm:text-[46px]">
              Join the future of global investing
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-white/60">
              Create an account in minutes. Access 120+ markets. Start with any amount.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/create-account"
                className="rounded-lg bg-[#1a6b3c] px-6 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Get started
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-white/15"
              >
                Contact us
              </Link>
            </div>

            {/* Decorative */}
            <Globe2
              className="pointer-events-none absolute -right-6 -top-6 h-48 w-48 text-white/5"
              strokeWidth={1}
            />
            <TrendingUp
              className="pointer-events-none absolute bottom-6 left-6 h-24 w-24 text-white/5"
              strokeWidth={1.5}
            />
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-[#E5E5E2] bg-white px-6 py-14 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[17px] font-bold text-[#111827]">Apex Capital</p>
              <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-[#6B7280]">
                Architecting clarity for the modern investor. Built on precision, speed, and global access.
              </p>
              <div className="mt-4 flex gap-2.5">
                {[Globe2, Landmark, Mail].map((Icon, i) => (
                  <span key={i} className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E5E2] bg-[#F7F7F5]">
                    <Icon className="h-3.5 w-3.5 text-[#6B7280]" />
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.1em] text-[#111827]">PRODUCT</p>
              <ul className="mt-3 space-y-2.5">
                {productLinks.map((link) => (
                  <li key={link}>
                    <Link href="/" className="text-[13px] text-[#6B7280] hover:text-[#111827]">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.1em] text-[#111827]">COMPANY</p>
              <ul className="mt-3 space-y-2.5">
                {companyLinks.map((link) => (
                  <li key={link}>
                    <Link href="/" className="text-[13px] text-[#6B7280] hover:text-[#111827]">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.1em] text-[#111827]">STAY UPDATED</p>
              <p className="mt-3 text-[13px] leading-relaxed text-[#6B7280]">
                Weekly market analysis and product updates delivered to your inbox.
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3 py-2 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#111827]"
                />
                <button
                  type="button"
                  className="shrink-0 rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col-reverse items-center justify-between gap-4 border-t border-[#F3F4F6] pt-7 sm:flex-row">
            <p className="text-[12px] text-[#9CA3AF]">
              © {new Date().getFullYear()} Apex Capital. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-5">
              {legalLinks.map((link) => (
                <Link key={link} href="/" className="text-[12px] text-[#9CA3AF] hover:text-[#111827]">
                  {link}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}