"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShieldCheck, ShieldAlert, Clock, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuthUser } from "../lib/supabase/use-auth-user";
import { createClient } from "../lib/supabase/client";
import NotificationBell from "./NotificationBell";

type KycStatus = "unverified" | "pending" | "verified" | "rejected";

type NavbarProps = {
  variant?: "public" | "auth";
  kycStatus?: KycStatus;
  userInitials?: string;
  avatarUrl?: string | null;
};

const PUBLIC_LINKS = [{ href: "/markets", label: "Markets" }];

const AUTH_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/markets", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/wallet", label: "Wallet" },
];

// ── KYC badge ────────────────────────────────────────────────────────

const KYC_CONFIG = {
  verified:   { icon: ShieldCheck, label: "Verified",       bg: "bg-[#F0F7F2]", text: "text-[#1a6b3c]" },
  pending:    { icon: Clock,       label: "Pending review", bg: "bg-amber-50",   text: "text-amber-700" },
  rejected:   { icon: ShieldAlert, label: "Rejected",       bg: "bg-red-50",     text: "text-red-600"   },
  unverified: { icon: ShieldAlert, label: "Unverified",     bg: "bg-[#F3F4F6]",  text: "text-[#6B7280]" },
} as const;

function VerificationBadge({ status, compact = false }: { status: KycStatus; compact?: boolean }) {
  const { icon: Icon, label, bg, text } = KYC_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${bg} ${text}`}>
      <Icon className="h-3 w-3 shrink-0" />
      {!compact && label}
    </span>
  );
}

function UserAvatar({ avatarUrl, userInitials }: { avatarUrl: string | null; userInitials: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-[11px] font-semibold text-white">
      {avatarUrl
        ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        : userInitials}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function Navbar({
  variant = "public",
  kycStatus: kycStatusProp,
  userInitials: userInitialsProp,
  avatarUrl: avatarUrlProp,
}: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoggedIn } = useAuthUser();
  const supabase = createClient();
  const menuRef = useRef<HTMLDivElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(avatarUrlProp ?? null);
  const [kycStatus, setKycStatus] = useState<KycStatus>(kycStatusProp ?? "unverified");
  const [userInitials, setUserInitials] = useState<string>(userInitialsProp ?? "?");

  // Fetch profile data
  useEffect(() => {
    if (avatarUrlProp !== undefined && kycStatusProp && userInitialsProp) {
      setAvatarUrl(avatarUrlProp);
      setKycStatus(kycStatusProp);
      setUserInitials(userInitialsProp);
      return;
    }
    if (variant !== "auth") return;

    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, kyc_status")
        .eq("id", user.id)
        .single();
      if (data) {
        setAvatarUrl(data.avatar_url ?? null);
        setKycStatus((data.kyc_status as KycStatus) ?? "unverified");
        const initials = (data.full_name ?? "")
          .split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
        setUserInitials(initials || "?");
      }
    }
    fetchProfile();
  }, [variant, avatarUrlProp, kycStatusProp, userInitialsProp]);

  useEffect(() => {
    if (avatarUrlProp !== undefined) setAvatarUrl(avatarUrlProp);
  }, [avatarUrlProp]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileOpen]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const links = variant === "auth" ? AUTH_LINKS : PUBLIC_LINKS;
  const isActive = (href: string) => pathname === href;
  const ctaHref = variant === "public" && isLoggedIn ? "/dashboard" : "/create-account";
  const ctaLabel = variant === "public" && isLoggedIn ? "Dashboard" : "Start Investing";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#E5E5E2] bg-[#F7F7F5]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-10">

          {/* Logo */}
          <Link
            href={variant === "auth" ? "/dashboard" : "/"}
            className="shrink-0 text-[16px] font-bold tracking-tight text-[#111827]"
          >
            Apex Capital
          </Link>

          {/* ── Auth variant desktop ── */}
          {variant === "auth" && (
            <>
              {/* Desktop nav */}
              <nav className="hidden items-center gap-1 lg:flex">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-lg px-3.5 py-2 text-[13.5px] transition-colors hover:bg-[#EBEBEA] hover:text-[#111827] ${
                      isActive(link.href)
                        ? "bg-[#EBEBEA] font-semibold text-[#111827]"
                        : "font-medium text-[#6B7280]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Desktop right cluster */}
              <div className="hidden items-center gap-3 lg:flex">
                <NotificationBell />
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 rounded-xl border border-[#E5E5E2] bg-white px-3 py-1.5 transition-colors hover:border-[#D1D5DB] hover:bg-[#F9F9F8]"
                >
                  <VerificationBadge status={kycStatus} />
                  <UserAvatar avatarUrl={avatarUrl} userInitials={userInitials} />
                </Link>
              </div>

              {/* Mobile right cluster */}
              <div className="flex items-center gap-2 lg:hidden">
                <NotificationBell />
                <button
                  type="button"
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileOpen}
                  onClick={() => setMobileOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E2] bg-white text-[#111827]"
                >
                  {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              </div>
            </>
          )}

          {/* ── Public variant desktop ── */}
          {variant === "public" && (
            <>
              {/* Desktop nav — always visible on md+ */}
              {!isLoggedIn && (
                <nav className="hidden items-center gap-1 md:flex">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`rounded-lg px-3.5 py-2 text-[13.5px] transition-colors hover:bg-[#EBEBEA] hover:text-[#111827] ${
                        isActive(link.href)
                          ? "bg-[#EBEBEA] font-semibold text-[#111827]"
                          : "font-medium text-[#6B7280]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              )}

              <div className="flex items-center gap-2.5">
                {!isLoggedIn && (
                  <Link
                    href="/login"
                    className="hidden text-[13.5px] font-medium text-[#6B7280] transition-colors hover:text-[#111827] sm:block"
                  >
                    Log in
                  </Link>
                )}
                <Link
                  href={ctaHref}
                  className="rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {ctaLabel}
                </Link>
                {/* Mobile hamburger for public — only if logged out (logged-in public users see CTA only) */}
                {!isLoggedIn && (
                  <button
                    type="button"
                    aria-label={mobileOpen ? "Close menu" : "Open menu"}
                    aria-expanded={mobileOpen}
                    onClick={() => setMobileOpen((v) => !v)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E2] bg-white text-[#111827] sm:hidden"
                  >
                    {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Mobile overlay ────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] lg:hidden" aria-hidden="true" />
      )}

      {/* ── Mobile slide-down panel ───────────────────────────────────── */}
      <div
        ref={menuRef}
        className={`fixed left-0 right-0 top-[57px] z-40 lg:hidden transition-all duration-200 ease-out ${
          mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0 pointer-events-none"
        }`}
      >
        <div className="mx-3 mt-1.5 overflow-hidden rounded-2xl border border-[#E5E5E2] bg-white shadow-xl">

          {/* Auth — profile row */}
          {variant === "auth" && (
            <Link
              href="/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between border-b border-[#F3F4F6] px-5 py-4 hover:bg-[#F7F7F5]"
            >
              <div className="flex items-center gap-3">
                <UserAvatar avatarUrl={avatarUrl} userInitials={userInitials} />
                <div>
                  <p className="text-[13px] font-semibold text-[#111827]">My Profile</p>
                  <VerificationBadge status={kycStatus} />
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
            </Link>
          )}

          {/* Nav links */}
          <nav className="px-3 py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3 py-3 text-[14px] transition-colors ${
                  isActive(link.href)
                    ? "bg-[#F7F7F5] font-semibold text-[#111827]"
                    : "font-medium text-[#374151] hover:bg-[#F7F7F5]"
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1a6b3c]" />
                )}
              </Link>
            ))}

            {/* Public — login link on mobile */}
            {variant === "public" && !isLoggedIn && (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center rounded-xl px-3 py-3 text-[14px] font-medium text-[#374151] hover:bg-[#F7F7F5]"
              >
                Log in
              </Link>
            )}
          </nav>

          {/* Auth — sign out row */}
          {variant === "auth" && (
            <div className="border-t border-[#F3F4F6] px-3 py-2">
              <button
                type="button"
                onClick={async () => {
                  setMobileOpen(false);
                  await createClient().auth.signOut();
                  window.location.href = "/";
                }}
                className="flex w-full items-center rounded-xl px-3 py-3 text-[14px] font-medium text-red-600 hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}