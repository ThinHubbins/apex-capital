"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "../lib/supabase/client";

export type AdminNotifSection = "kyc" | "deposits" | "withdrawals";

type SectionConfig = {
  table: string;
  dateColumn: string;
  label: string;
};

// Adjust table/column names if yours differ
const SECTIONS: Record<AdminNotifSection, SectionConfig> = {
  kyc:         { table: "kyc_submissions", dateColumn: "submitted_at", label: "KYC submission" },
  deposits:    { table: "deposits",        dateColumn: "submitted_at", label: "Deposit request" },
  withdrawals: { table: "withdrawals",     dateColumn: "submitted_at", label: "Withdrawal request" },
};

const STORAGE_KEY = "apex_admin_last_seen";

type LastSeenMap = Record<AdminNotifSection, string>;

function loadLastSeen(): LastSeenMap {
  const now = new Date().toISOString();
  if (typeof window === "undefined") return { kyc: now, deposits: now, withdrawals: now };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { kyc: now, deposits: now, withdrawals: now };
    const parsed = JSON.parse(raw);
    return {
      kyc: parsed.kyc ?? now,
      deposits: parsed.deposits ?? now,
      withdrawals: parsed.withdrawals ?? now,
    };
  } catch {
    return { kyc: now, deposits: now, withdrawals: now };
  }
}

function persistLastSeen(map: LastSeenMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * Tracks unread counts per section ("new since last visit") and subscribes
 * to Supabase Realtime so counts/toasts update live with no polling.
 *
 * @param activeSection the section currently being viewed (or null) — new
 *   inserts for this section won't bump its badge, since it's on-screen.
 * @param onNewRequest called every time a new row arrives, even for the
 *   active section (used to show a toast and trigger a silent list refresh).
 */
export function useAdminNotifications(
  activeSection: AdminNotifSection | null,
  onNewRequest: (section: AdminNotifSection, label: string) => void
) {
  const [unreadCounts, setUnreadCounts] = useState<Record<AdminNotifSection, number>>({
    kyc: 0,
    deposits: 0,
    withdrawals: 0,
  });

  // One client instance for the lifetime of this hook — created once, not
  // on every render and not inside the effects below.
  const supabaseRef = useRef(createClient());

  const lastSeenRef = useRef<LastSeenMap>(loadLastSeen());
  const activeRef = useRef<AdminNotifSection | null>(activeSection);
  useEffect(() => {
    activeRef.current = activeSection;
  }, [activeSection]);

  // Initial unread counts: rows inserted after this section's last-seen timestamp
  useEffect(() => {
    let cancelled = false;
    const supabase = supabaseRef.current;
    (async () => {
      const entries = Object.entries(SECTIONS) as [AdminNotifSection, SectionConfig][];
      const results = await Promise.all(
        entries.map(async ([key, cfg]) => {
          const { count, error } = await supabase
            .from(cfg.table)
            .select("id", { count: "exact", head: true })
            .gt(cfg.dateColumn, lastSeenRef.current[key]);
          return { key, count: error ? 0 : count ?? 0 };
        })
      );
      if (cancelled) return;
      setUnreadCounts((prev) => {
        const next = { ...prev };
        results.forEach(({ key, count }) => {
          next[key] = count;
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live updates
  useEffect(() => {
    const supabase = supabaseRef.current;
    const entries = Object.entries(SECTIONS) as [AdminNotifSection, SectionConfig][];
    const channels = entries.map(([key, cfg]) =>
      supabase
        .channel(`admin-notif-${cfg.table}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: cfg.table },
          () => {
            if (activeRef.current !== key) {
              setUnreadCounts((prev) => ({ ...prev, [key]: prev[key] + 1 }));
            }
            onNewRequest(key, cfg.label);
          }
        )
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markSeen = useCallback((section: AdminNotifSection) => {
    const now = new Date().toISOString();
    lastSeenRef.current = { ...lastSeenRef.current, [section]: now };
    persistLastSeen(lastSeenRef.current);
    setUnreadCounts((prev) => ({ ...prev, [section]: 0 }));
  }, []);

  return { unreadCounts, markSeen };
}