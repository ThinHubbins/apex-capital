"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { useState, useEffect } from "react";
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

function VerificationBadge({ status }: { status: KycStatus }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F7F2] px-3 py-1 text-[12px] font-medium text-[#1a6b3c]">
        <ShieldCheck className="h-3.5 w-3.5" />
        Verified
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[12px] font-medium text-amber-700">
        <Clock className="h-3.5 w-3.5" />
        Pending review
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[12px] font-medium text-red-600">
        <ShieldAlert className="h-3.5 w-3.5" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-3 py-1 text-[12px] font-medium text-[#6B7280]">
      <ShieldAlert className="h-3.5 w-3.5" />
      Unverified
    </span>
  );
}

function UserAvatar({ avatarUrl, userInitials }: { avatarUrl: string | null; userInitials: string }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-[12px] font-semibold text-white shrink-0">
      {avatarUrl ? (
        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
      ) : (
        userInitials
      )}
    </span>
  );
}

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

  // Internal state — navbar fetches its own profile data
  const [avatarUrl, setAvatarUrl] = useState<string | null>(avatarUrlProp ?? null);
  const [kycStatus, setKycStatus] = useState<KycStatus>(kycStatusProp ?? "unverified");
  const [userInitials, setUserInitials] = useState<string>(userInitialsProp ?? "?");

  useEffect(() => {
    // If all props were passed in explicitly, skip the fetch
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

        const name: string = data.full_name ?? "";
        const initials = name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        setUserInitials(initials || "?");
      }
    }

    fetchProfile();
  }, [variant, avatarUrlProp, kycStatusProp, userInitialsProp]);

  // Keep in sync if parent passes updated avatarUrl (e.g. after upload on profile page)
  useEffect(() => {
    if (avatarUrlProp !== undefined) setAvatarUrl(avatarUrlProp);
  }, [avatarUrlProp]);

  const links = variant === "auth" ? AUTH_LINKS : PUBLIC_LINKS;
  const isActive = (href: string) => pathname === href;

  const ctaHref = variant === "public" && isLoggedIn ? "/dashboard" : "/create-account";
  const ctaLabel = variant === "public" && isLoggedIn ? "Go to Dashboard" : "Start Investing";

  return (
    <header className="border-b border-[#E5E5E2] bg-[#F7F7F5]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        {/* Logo */}
        <div className="flex items-center">
          <Link
            href={variant === "auth" ? "/dashboard" : "/"}
            className="text-[17px] font-bold tracking-tight text-[#111827]"
          >
            Apex Capital
          </Link>
        </div>

        {variant === "auth" ? (
          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-6 lg:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[14px] transition-colors hover:text-[#111827] ${
                    isActive(link.href) ? "font-medium text-[#111827]" : "text-[#6B7280]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden sm:flex">
              <NotificationBell />
            </div>

            <Link href="/profile" className="hidden items-center gap-2 sm:flex">
              <VerificationBadge status={kycStatus} />
              <UserAvatar avatarUrl={avatarUrl} userInitials={userInitials} />
            </Link>

            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E2] bg-white text-[#111827] lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-5">
            {!isLoggedIn && (
              <nav className="hidden items-center gap-6 lg:flex">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-[14px] transition-colors hover:text-[#111827] ${
                      isActive(link.href) ? "font-medium text-[#111827]" : "text-[#6B7280]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
            {!isLoggedIn && (
              <Link
                href="/login"
                className="hidden text-[14px] text-[#6B7280] transition-colors hover:text-[#111827] sm:block"
              >
                Login
              </Link>
            )}
            <Link
              href={ctaHref}
              className="rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            >
              {ctaLabel}
            </Link>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E2] bg-white text-[#111827] sm:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-[#E5E5E2] bg-white px-6 py-3 lg:hidden">
          {variant === "auth" && (
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar avatarUrl={avatarUrl} userInitials={userInitials} />
                <VerificationBadge status={kycStatus} />
              </div>
              <NotificationBell />
            </div>
          )}
          <nav className="flex flex-col gap-1">
            {(variant === "auth" ? [...links, { href: "/profile", label: "Profile" }] : links).map(
              (link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-2 py-2 text-[14px] text-[#374151] hover:bg-[#F7F7F5]"
                >
                  {link.label}
                </Link>
              )
            )}
            {variant === "public" && !isLoggedIn && (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-2 py-2 text-[14px] text-[#374151] hover:bg-[#F7F7F5]"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}