"use client";

import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  return (
    <div className="relative" ref={containerRef}>
      <button
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

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[#E5E5E2] bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-[#F3F4F6] px-4 py-3">
            <p className="text-[13px] font-semibold text-[#111827]">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[12px] text-[#6B7280] hover:text-[#111827]"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
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
      )}
    </div>
  );
}