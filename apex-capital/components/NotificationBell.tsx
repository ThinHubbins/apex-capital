"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, Check, ShieldCheck } from "lucide-react";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

const POLL_INTERVAL_MS = 30000;
const PANEL_WIDTH = 320; // px, matches old w-80
const VIEWPORT_MARGIN = 16; // px, min gap to screen edges on mobile

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "kyc_status") return <ShieldCheck className="h-4 w-4 text-[#1a6b3c]" />;
  return <Bell className="h-4 w-4 text-[#9CA3AF]" />;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Portals need a browser document, which isn't there during SSR.
  useEffect(() => setMounted(true), []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch {
      // Silent fail — bell just keeps last known state until the next poll.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Click-outside has to check both the bell AND the portaled panel, since
  // the panel is no longer a DOM descendant of containerRef once portaled.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute the panel's fixed position from the bell button's actual
  // viewport location. Combined with portaling to document.body, this
  // guarantees correct placement even if the navbar (or any ancestor) has
  // a transform/filter/backdrop-blur that would otherwise hijack `fixed`
  // positioning to a non-viewport containing block.
  useEffect(() => {
    if (!open) return;

    function reposition() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
      let right = window.innerWidth - rect.right;
      const maxRight = window.innerWidth - width - VIEWPORT_MARGIN;
      right = Math.min(Math.max(right, VIEWPORT_MARGIN), Math.max(maxRight, VIEWPORT_MARGIN));

      setPanelStyle({
        position: "fixed",
        top: rect.bottom + 8,
        right,
        width,
      });
    }

    reposition();
    window.addEventListener("resize", reposition);
    // `true` = capture phase, so scrolling inside any nested scroll
    // container (not just window) also triggers a reposition.
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  async function markAsRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
  }

  const panel = (
    <div
      ref={panelRef}
      style={panelStyle}
      className="z-[60] overflow-hidden rounded-xl border border-[#E5E5E2] bg-white shadow-lg"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#F3F4F6] px-4 py-3">
        <p className="shrink-0 text-[13px] font-semibold text-[#111827]">Notifications</p>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="flex shrink-0 items-center gap-1 text-[12px] text-[#6B7280] hover:text-[#111827]"
          >
            <Check className="h-3 w-3" /> Mark all read
          </button>
        )}
      </div>

      <div
        className="apex-notif-scroll max-h-[min(20rem,60vh)] overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#D1D5DB transparent" }}
      >
        {loading ? (
          <p className="px-4 py-6 text-center text-[12px] text-[#9CA3AF]">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12px] text-[#9CA3AF]">
            No notifications yet
          </p>
        ) : (
          notifications.map((n) => {
            const row = (
              <div
                className={
                  "flex gap-3 border-b border-[#F3F4F6] px-4 py-3 transition-colors last:border-0 hover:bg-[#F7F7F5] " +
                  (!n.read ? "bg-[#F7FAF8]" : "")
                }
              >
                <div className="mt-0.5 shrink-0">
                  <NotificationIcon type={n.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[#111827]">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-[#6B7280]">{n.message}</p>
                  <p className="mt-1 text-[11px] text-[#9CA3AF]">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#1a6b3c]" />}
              </div>
            );

            return n.link ? (
              <Link
                key={n.id}
                href={n.link}
                onClick={() => {
                  if (!n.read) markAsRead(n.id);
                  setOpen(false);
                }}
              >
                {row}
              </Link>
            ) : (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.read && markAsRead(n.id)}
                className="block w-full text-left"
              >
                {row}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E2] bg-white text-[#6B7280] transition-colors hover:text-[#111827]"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && mounted && createPortal(panel, document.body)}

      <style jsx global>{`
        .apex-notif-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .apex-notif-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .apex-notif-scroll::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
          border-radius: 9999px;
        }
      `}</style>
    </div>
  );
}