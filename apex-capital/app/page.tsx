"use client";

import { useEffect, useState } from "react";
import { useAuthUser } from "../lib/supabase/use-auth-user";
import Link from "next/link";
import {
  Globe2,
  PieChart,
  Sparkles,
  Zap,
  LineChart as LineChartIcon,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Landmark,
  Mail,
  ArrowUpRight,
  KeyRound,
  Eye,
  Lock,
  Check,
  Loader2,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { AssetLogo } from "../components/Assetslogo";
import { getMockAsset } from "../lib/mockMarketData";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Quote = {
  symbol: string;
  price: number | null;
  changePercent: number | null;
  error?: string;
};

type NewsItem = {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  category: string;
  datetime: number;
  image?: string;
};

/* ------------------------------------------------------------------ */
/*  Static content                                                      */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Globe2,
    title: "Global Investing",
    description:
      "Access stock exchanges in US, Europe, and Asia from a single terminal.",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-700",
  },
  {
    icon: PieChart,
    title: "Fractional Shares",
    description:
      "Invest in expensive assets like Berkshire or Gold with as little as $1.",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-700",
  },
  {
    icon: Sparkles,
    title: "Smart Insights",
    description:
      "AI-powered analysis of your portfolio risk and sector exposure.",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-700",
  },
  {
    icon: Zap,
    title: "Real-time Data",
    description:
      "Zero-latency price updates and trade execution for precision timing.",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
  },
  {
    icon: LineChartIcon,
    title: "Portfolio Tracking",
    description:
      "Consolidated view of all assets, taxes, and dividend projections.",
    iconBg: "bg-sky-50",
    iconColor: "text-sky-700",
  },
  {
    icon: ShieldCheck,
    title: "Secure Infrastructure",
    description: "Military-grade encryption and SIPC insurance up to $500k.",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-700",
  },
];

const steps = [
  {
    number: "01",
    title: "Create account",
    description: "Register in minutes with just your email and basic details.",
    side: "left" as const,
    active: false,
  },
  {
    number: "02",
    title: "Verify identity",
    description:
      "Secure KYC process to protect your account and comply with global regs.",
    side: "right" as const,
    active: false,
  },
  {
    number: "03",
    title: "Deposit funds",
    description:
      "Transfer capital instantly via bank transfer, card, or direct deposit.",
    side: "left" as const,
    active: false,
  },
  {
    number: "04",
    title: "Start investing",
    description: "Place your first trade and watch your global portfolio grow.",
    side: "right" as const,
    active: true,
  },
];

const allocationBreakdown = [
  { label: "Technology", value: "42.5%", color: "#111827" },
  { label: "Healthcare", value: "18.2%", color: "#1a6b3c" },
  { label: "Finance", value: "15.3%", color: "#d1d5db" },
];

const faqs = [
  {
    question: "Is my money safe with Apex Capital?",
    answer:
      "Yes. Client funds are held in segregated accounts, protected by SIPC insurance up to $500,000, and secured with military-grade encryption across our entire infrastructure.",
  },
  {
    question: "What are the trading fees?",
    answer:
      "Apex Capital offers commission-free trading on US stocks and ETFs. International trades and select asset classes carry transparent, low fixed fees shown before you confirm any order.",
  },
  {
    question: "How long does it take to withdraw?",
    answer:
      "Most withdrawals to a linked bank account are processed within 1-2 business days. Instant withdrawal options are available for eligible accounts.",
  },
];

const productLinks = [
  { label: "Markets", href: "/markets" },
  { label: "Security", href: "/security" },
];

const companyLinks = [
  { label: "About Us", href: "/about-us" },
  { label: "Contact",  href: "/contact"  },
];

const legalLinks = [
  { label: "Privacy Policy",   href: "/privacy" },
  { label: "Terms of Service", href: "/terms"   },
];

/* ------------------------------------------------------------------ */
/*  NewsCard - extracted so it can render in both the default grid     */
/*  and the "view more" expanded grid without duplicating markup       */
/* ------------------------------------------------------------------ */

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className="relative h-44 w-full overflow-hidden rounded-xl bg-[#1F2937]">
        <img
          src={item.image}
          alt={item.headline}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = "0";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute left-3 top-3 rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#111827]">
          {item.category || "News"}
        </span>
        <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <h3 className="mt-3 text-[15px] font-semibold leading-snug text-[#111827] group-hover:text-[#1a6b3c]">
        {item.headline}
      </h3>

      {item.summary && (
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[#6B7280]">
          {item.summary}
        </p>
      )}

      <p className="mt-1.5 text-[11px] text-[#9CA3AF]">{item.source}</p>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [quotesError, setQuotesError] = useState<string | null>(null);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [showAllNews, setShowAllNews] = useState(false);

  const { isLoggedIn } = useAuthUser();
const [subEmail, setSubEmail] = useState("");
const [subState, setSubState] = useState<"idle" | "loading" | "success" | "error" | "duplicate">("idle");

async function handleSubscribe() {
  if (!subEmail || subState === "loading") return;
  setSubState("loading");
  const res = await fetch("/api/subscribers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: subEmail }),
  });
  if (res.ok) { setSubState("success"); setSubEmail(""); }
  else if (res.status === 409) setSubState("duplicate");
  else setSubState("error");
}
  useEffect(() => {
    let cancelled = false;
    async function fetchQuotes() {
      try {
        const res = await fetch("/api/markets");
        const data = await res.json();
        if (cancelled) return;
        if (data.error && (!data.results || data.results.length === 0)) {
          setQuotesError(data.error);
        } else {
          setQuotesError(null);
        }
        setQuotes(data.results ?? []);
      } catch {
        if (!cancelled) setQuotesError("Could not reach the markets API.");
      } finally {
        if (!cancelled) setQuotesLoading(false);
      }
    }
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchNews() {
      try {
        const res = await fetch("/api/news");
        const data = await res.json();
        if (cancelled) return;
        if (data.error && (!data.results || data.results.length === 0)) {
          setNewsError(data.error);
        } else {
          setNewsError(null);
        }
        setNews(data.results ?? []);
      } catch {
        if (!cancelled) setNewsError("Could not reach the news API.");
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    }
    fetchNews();
  }, []);

  const portfolioValue = quotes.reduce((sum, q) => sum + (q.price ?? 0), 0);
  const validChangeCount = quotes.filter(
    (q) => q.changePercent !== null,
  ).length;
  const avgChangePercent =
    validChangeCount > 0
      ? quotes.reduce((sum, q) => sum + (q.changePercent ?? 0), 0) /
        validChangeCount
      : 0;
  const portfolioGain = portfolioValue * (avgChangePercent / 100);

  // Quotes ranked by today's % change, best performer first.
const rankedQuotes = [...quotes]
  .sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity))
  .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      {/* ---------------------------------------------------------- */}
      {/* Navbar                                                      */}
      {/* ---------------------------------------------------------- */}
      <Navbar variant="public" />

      <main>
        {/* -------------------------------------------------------- */}
        {/* Hero                                                      */}
        {/* -------------------------------------------------------- */}
        <section className="px-6 py-16 lg:px-10 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            {/* Left copy */}
            <div>
              <h1 className="text-[44px] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#111827] sm:text-[56px]">
                Invest Beyond
                <br />
                Borders
              </h1>
              <p className="mt-5 max-w-[420px] text-[15px] leading-relaxed text-[#6B7280]">
                Build long-term wealth through simple, global investing. Access
                major markets with professional tools designed for clarity and
                speed.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={isLoggedIn ? "/dashboard" : "/create-account"}
                  className="rounded-lg bg-[#1a6b3c] px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  {isLoggedIn ? "Go to Dashboard" : "Start Investing"}
                </Link>
                <Link
                  href="/markets"
                  className="rounded-lg border border-[#E5E5E2] bg-white px-5 py-2.5 text-[14px] font-medium text-[#111827] transition-colors hover:bg-[#F7F7F5]"
                >
                  Explore Markets
                </Link>
              </div>
            </div>

            {/* Right portfolio card — Today's Movers leaderboard */}
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Today's Movers
                  </p>
                  <p className="mt-1 text-[20px] font-bold text-[#111827]">
                    Ranked by % Change
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-medium uppercase tracking-wider text-[#9CA3AF]">
                    Avg Change
                  </p>
                  <p
                    className={`mt-1 text-[16px] font-semibold ${
                      avgChangePercent >= 0 ? "text-[#1a6b3c]" : "text-red-600"
                    }`}
                  >
                    {quotesLoading
                      ? "—"
                      : `${avgChangePercent >= 0 ? "+" : ""}${avgChangePercent.toFixed(2)}%`}
                  </p>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="mt-5 space-y-1">
                {quotesLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex animate-pulse items-center justify-between rounded-lg px-2 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-6 rounded-full bg-[#F3F4F6]" />
                          <div className="h-3.5 w-12 rounded bg-[#F3F4F6]" />
                        </div>
                        <div className="text-right">
                          <div className="h-3.5 w-14 rounded bg-[#F3F4F6]" />
                        </div>
                      </div>
                    ))
                  : rankedQuotes.map((q, i) => {
                      const up = (q.changePercent ?? 0) >= 0;
                      const isLeader = i === 0 && q.changePercent !== null;
                      return (
                        <div
                          key={q.symbol}
                          className={`flex items-center justify-between rounded-lg px-2 py-2.5 ${
                            isLeader ? "bg-[#F0F7F2]" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                isLeader
                                  ? "bg-[#1a6b3c] text-white"
                                  : "bg-[#F3F4F6] text-[#6B7280]"
                              }`}
                            >
                              {i + 1}
                            </span>
                            <AssetLogo
                              symbol={q.symbol}
                              logo={getMockAsset(q.symbol)?.logo ?? ""}
                              size={22}
                            />
                            <span className="text-[14px] font-semibold text-[#111827]">
                              {q.symbol}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-[14px] font-bold text-[#111827]">
                              {q.price !== null
                                ? `$${q.price.toFixed(2)}`
                                : "—"}
                            </p>
                            <p
                              className={`text-[12px] font-medium ${
                                up ? "text-[#1a6b3c]" : "text-red-500"
                              }`}
                            >
                              {q.changePercent !== null
                                ? `${up ? "+" : ""}${q.changePercent.toFixed(2)}%`
                                : "—"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
              </div>

              {quotesError && (
                <p className="mt-3 text-xs text-red-500">{quotesError}</p>
              )}

              {/* Allocation summary */}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* Live ticker strip                                         */}
        {/* -------------------------------------------------------- */}
        <section className="border-y border-[#E5E5E2] bg-white">
          <div className="mx-auto max-w-7xl overflow-x-auto px-6 py-0 lg:px-10">
            <div className="flex min-w-[700px] divide-x divide-[#F3F4F6]">
              {quotesLoading ? (
  <div className="flex divide-x divide-[#F3F4F6]">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="animate-pulse px-5 py-4">
        <div className="h-3 w-10 rounded bg-[#F3F4F6]" />
        <div className="mt-2 h-5 w-16 rounded bg-[#F3F4F6]" />
      </div>
    ))}
  </div>
) : (
  <div className="overflow-hidden">
    <div className="flex w-max animate-[marquee_30s_linear_infinite] gap-0">
      {[...quotes, ...quotes].map((q, i) => {
        const up = (q.changePercent ?? 0) >= 0;
        return (
          <div key={`${q.symbol}-${i}`} className="flex-shrink-0 border-r border-[#F3F4F6] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#111827]">
                <AssetLogo symbol={q.symbol} logo={getMockAsset(q.symbol)?.logo ?? ""} size={18} />
                {q.symbol}
              </span>
              <span className={`text-[12px] font-medium ${up ? "text-[#1a6b3c]" : "text-red-500"}`}>
                {q.changePercent !== null ? `${up ? "+" : ""}${q.changePercent.toFixed(1)}%` : "—"}
              </span>
            </div>
            <p className="mt-0.5 text-[15px] font-bold text-[#111827]">
              {q.price !== null ? `$${q.price.toFixed(2)}` : "N/A"}
            </p>
          </div>
        );
      })}
    </div>
  </div>
)}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* Stats                                                     */}
        {/* -------------------------------------------------------- */}
        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-10 text-center sm:grid-cols-3">
            {[
              { value: "2M+", label: "ACTIVE USERS" },
              { value: "$14B+", label: "ASSETS TRACKED" },
              { value: "120+", label: "GLOBAL MARKETS" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-[48px] font-extrabold tracking-tight text-[#111827] sm:text-[52px]">
                  {stat.value}
                </p>
                <p className="mt-2 text-[11px] font-semibold tracking-[0.12em] text-[#9CA3AF]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* Features                                                  */}
        {/* -------------------------------------------------------- */}
        <section className="bg-[#F0F0ED] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-[30px] font-extrabold tracking-tight text-[#111827] sm:text-[36px]">
                Surgical Tools for Strategic Growth
              </h2>
              <p className="mt-3 text-[14px] text-[#6B7280]">
                Built on institutional-grade infrastructure with the simplicity
                of bamboo design.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-[#E5E5E2] bg-white p-6"
                >
                  <div
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${feature.iconBg}`}
                  >
                    <feature.icon
                      className={`h-5 w-5 ${feature.iconColor}`}
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

       

        {/* -------------------------------------------------------- */}
        {/* Journey timeline                                          */}
        {/* -------------------------------------------------------- */}
        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-[30px] font-extrabold tracking-tight text-[#111827] sm:text-[36px]">
              Your Journey to Wealth
            </h2>

            <div className="relative mt-16">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#E5E5E2]" />

              <div className="flex flex-col gap-12">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className="grid grid-cols-[1fr_72px_1fr] items-center gap-4"
                  >
                    {step.side === "left" ? (
                      <>
                        <div className="text-right">
                          <h3 className="text-[16px] font-semibold text-[#111827]">
                            {step.title}
                          </h3>
                          <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
                            {step.description}
                          </p>
                        </div>
                        <div className="flex justify-center">
                          <div
                            className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-[13px] font-bold ${
                              step.active
                                ? "border-[#111827] bg-[#111827] text-white"
                                : "border-[#E5E5E2] bg-white text-[#111827]"
                            }`}
                          >
                            {step.number}
                          </div>
                        </div>
                        <div />
                      </>
                    ) : (
                      <>
                        <div />
                        <div className="flex justify-center">
                          <div
                            className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-[13px] font-bold ${
                              step.active
                                ? "border-[#111827] bg-[#111827] text-white"
                                : "border-[#E5E5E2] bg-white text-[#111827]"
                            }`}
                          >
                            {step.number}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-[16px] font-semibold text-[#111827]">
                            {step.title}
                          </h3>
                          <p className="mt-1 text-[13px] leading-relaxed text-[#6B7280]">
                            {step.description}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

         {/* ---------------------------------------------------------- */}
{/* Security teaser */}
{/* ---------------------------------------------------------- */}
<section className="px-6 py-20 lg:px-10">
  <div className="mx-auto max-w-6xl">
    <div className="overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white p-8 sm:p-10 lg:p-12">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#F0F7F2]">
            <ShieldCheck className="h-5 w-5 text-[#1a6b3c]" strokeWidth={1.75} />
          </div>
          <h2 className="mt-4 text-[26px] font-bold tracking-tight text-[#111827] sm:text-[30px]">
            Security you can verify, not just trust
          </h2>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[#6B7280]">
            256-bit encryption, continuous fraud monitoring, and full KYC/AML
            compliance protect every account on Apex Capital.
          </p>
          <Link
            href="/security"
            className="mt-5 inline-flex items-center gap-1 text-[14px] font-medium text-[#111827] hover:opacity-70"
          >
            See how we protect you
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex gap-3 sm:gap-4">
          {[
            { icon: Lock, label: "256-bit\nencryption" },
            { icon: KeyRound, label: "Multi-factor\nauth" },
            { icon: Eye, label: "24/7\nmonitoring" },
          ].map((badge) => (
            <div
              key={badge.label}
              className="flex w-24 flex-col items-center gap-2 rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-4 text-center sm:w-28"
            >
              <badge.icon className="h-5 w-5 text-[#1a6b3c]" strokeWidth={1.75} />
              <p className="whitespace-pre-line text-[11px] font-medium leading-tight text-[#374151]">
                {badge.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
</section>

        {/* -------------------------------------------------------- */}
        {/* Diversification                                           */}
        {/* -------------------------------------------------------- */}
        <section className="bg-[#F0F0ED] px-6 py-20 lg:px-10">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            {/* Cards */}
            <div className="space-y-4">
              <div className="rounded-xl border border-[#E5E5E2] bg-white p-5">
                <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-3">
                  <h3 className="text-[14px] font-semibold text-[#111827]">
                    Asset Allocation
                  </h3>
                  <SlidersHorizontal className="h-4 w-4 text-[#9CA3AF]" />
                </div>
                <div className="mt-4 space-y-3">
                  {allocationBreakdown.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[14px] text-[#374151]">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[14px] font-bold text-[#111827]">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-xl border border-[#E5E5E2] bg-white p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                  <TrendingUp className="h-5 w-5 text-[#1a6b3c]" />
                </div>
                <div>
                  <p className="text-[13px] text-[#6B7280]">
                    Projected Dividends
                  </p>
                  <p className="text-[15px] font-bold text-[#111827]">
                    $2,450.00 / year
                  </p>
                </div>
              </div>
            </div>

            {/* Copy */}
            <div>
              <h2 className="text-[28px] font-bold tracking-tight text-[#111827] sm:text-[34px]">
                Master Your Diversification
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-[#6B7280]">
                Our advanced visualization engine helps you spot overlap in your
                portfolio and rebalance with a single click. Maintain your
                target risk profile with zero effort.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-block rounded-lg bg-[#111827] px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Try the Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* Live market news                                          */}
        {/* -------------------------------------------------------- */}
        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[26px] font-bold tracking-tight text-[#111827] sm:text-[30px]">
                  Market Insights
                </h2>
                <p className="mt-1.5 text-[14px] text-[#6B7280]">
                  Stay ahead of the curve with direct feeds from the
                  world&apos;s trading floors.
                </p>
              </div>
              {!newsLoading && news.length > 3 && (
                <button
                  onClick={() => setShowAllNews((prev) => !prev)}
                  className="flex items-center gap-1 text-[14px] font-medium text-[#111827] hover:opacity-70"
                >
                  {showAllNews ? "Show less" : "View all News"}
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      showAllNews ? "-rotate-90" : ""
                    }`}
                  />
                </button>
              )}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {newsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-44 w-full rounded-xl bg-[#E5E5E2]" />
                      <div className="mt-3 h-4 w-3/4 rounded bg-[#E5E5E2]" />
                      <div className="mt-2 h-3 w-full rounded bg-[#F3F4F6]" />
                    </div>
                  ))
                : news
                    .slice(0, 3)
                    .map((item) => <NewsCard key={item.id} item={item} />)}
            </div>

            {/* Remaining articles (4–10), revealed on "View all News" */}
            {!newsLoading && showAllNews && news.length > 3 && (
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                {news.slice(3, 10).map((item) => (
                  <NewsCard key={item.id} item={item} />
                ))}
              </div>
            )}

            {!newsLoading && news.length === 0 && !newsError && (
              <p className="mt-4 text-[13px] text-[#9CA3AF]">
                No news available right now.
              </p>
            )}

            {newsError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                {newsError}
              </div>
            )}
          </div>
        </section>

        {/* -------------------------------------------------------- */}
        {/* FAQ                                                       */}
        {/* -------------------------------------------------------- */}
        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-[30px] font-extrabold tracking-tight text-[#111827] sm:text-[36px]">
              Frequently Asked Questions
            </h2>

            <div className="mt-10 divide-y divide-[#E5E5E2] rounded-xl border border-[#E5E5E2] bg-white overflow-hidden">
              {faqs.map((faq, index) => {
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

        {/* -------------------------------------------------------- */}
        {/* Final CTA                                                 */}
        {/* -------------------------------------------------------- */}
        <section className="px-6 pb-20 lg:px-10">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-[#E5E5E2] bg-[#F0F0ED] px-6 py-20 text-center">
            <h2 className="text-[36px] font-extrabold tracking-tight text-[#111827] sm:text-[46px]">
              Start Investing Smarter Today
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-[#6B7280]">
              Join over 2 million investors building the future of global wealth
              on Apex Capital.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href={isLoggedIn ? "/dashboard" : "/create-account"}
                className="rounded-lg bg-[#111827] px-6 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                {isLoggedIn ? "Go to Dashboard" : "Get Started Now"}
              </Link>
              <Link
                href="/about-us"
                className="rounded-lg border border-[#D1D5DB] bg-white px-6 py-3 text-[14px] font-medium text-[#111827] transition-colors hover:bg-[#F9FAFB]"
              >
                About Us
              </Link>
            </div>

            <TrendingUp
              className="pointer-events-none absolute bottom-6 right-6 h-24 w-24 text-[#111827]/8 sm:h-32 sm:w-32"
              strokeWidth={1.5}
            />
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------- */}
      {/* Footer                                                      */}
      {/* ---------------------------------------------------------- */}
      <footer className="border-t border-[#E5E5E2] bg-white px-6 py-14 lg:px-10">
  <div className="mx-auto max-w-6xl">
    <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

      {/* Brand */}
      <div>
        <p className="text-[17px] font-bold text-[#111827]">Apex Capital</p>
        <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-[#6B7280]">
          Architecting clarity for the modern investor. Built on precision,
          speed, and global access.
        </p>
      </div>

      {/* Product */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.1em] text-[#111827]">PRODUCT</p>
        <ul className="mt-3 space-y-2.5">
          {productLinks.map((link) => (
            <li key={link.label}>
              <Link href={link.href} className="text-[13px] text-[#6B7280] hover:text-[#111827]">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Company */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.1em] text-[#111827]">COMPANY</p>
        <ul className="mt-3 space-y-2.5">
          {companyLinks.map((link) => (
            <li key={link.label}>
              <Link href={link.href} className="text-[13px] text-[#6B7280] hover:text-[#111827]">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Stay Updated — untouched */}
      <div>
  <p className="text-[11px] font-semibold tracking-[0.1em] text-[#111827]">STAY UPDATED</p>
  <p className="mt-3 text-[13px] leading-relaxed text-[#6B7280]">
    Weekly market analysis and product updates delivered to your inbox.
  </p>

  {subState === "success" ? (
    <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-[#F0F7F2] px-3 py-2.5 text-[13px] text-[#1a6b3c]">
      <Check className="h-4 w-4 shrink-0" /> You're subscribed!
    </div>
  ) : (
    <>
      <div className="mt-4 flex gap-2">
        <input
          type="email"
          value={subEmail}
          onChange={(e) => { setSubEmail(e.target.value); setSubState("idle"); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubscribe(); }}
          placeholder="Email address"
          className="w-full rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3 py-2 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-[#111827]"
        />
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={subState === "loading"}
          className="shrink-0 rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {subState === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
        </button>
      </div>
      {subState === "duplicate" && (
        <p className="mt-1.5 text-[12px] text-amber-600">Already subscribed with that email.</p>
      )}
      {subState === "error" && (
        <p className="mt-1.5 text-[12px] text-red-500">Something went wrong — try again.</p>
      )}
    </>
  )}
</div>

    </div>

    {/* Bottom bar */}
    <div className="mt-12 flex flex-col-reverse items-center justify-between gap-4 border-t border-[#F3F4F6] pt-7 sm:flex-row">
      <p className="text-[12px] text-[#9CA3AF]">
        © {new Date().getFullYear()} Apex Capital. All rights reserved.
      </p>
      <div className="flex flex-wrap justify-center gap-5">
        {legalLinks.map((link) => (
          <Link key={link.label} href={link.href} className="text-[12px] text-[#9CA3AF] hover:text-[#111827]">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  </div>
</footer>
    </div>
  );
}