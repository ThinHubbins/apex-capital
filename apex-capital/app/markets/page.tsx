"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Asset = {
  symbol: string;
  name: string;
  assetType: "stock" | "etf";
  price: number | null;
  changePercent: number | null;
  error?: string;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Markets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAssets() {
      try {
        const res = await fetch("/api/markets");
        const data = await res.json();
        if (cancelled) return;
        if (data.error && (!data.results || data.results.length === 0)) {
          setError(data.error);
        } else {
          setError(null);
        }
        setAssets(data.results ?? []);
      } catch {
        if (!cancelled) setError("Could not reach the markets API.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAssets();
    const interval = setInterval(fetchAssets, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Stub: real auth isn't wired up yet, so Buy/Sell sends users to login for now.
  function handleTradeClick(e: React.MouseEvent) {
    e.preventDefault();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      {/* ---------------------------------------------------------- */}
      {/* Navbar                                                      */}
      {/* ---------------------------------------------------------- */}
      <Navbar variant="public"/>

      <main className="px-6 py-10 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827] sm:text-[30px]">
            Markets
          </h1>
          <p className="mt-1.5 text-[14px] text-[#6B7280]">
            US stocks and ETFs available to invest in.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}

          {/* Scrollable list of assets */}
          <div className="mt-6 divide-y divide-[#E5E5E2] rounded-xl border border-[#E5E5E2] bg-white">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse items-center justify-between px-5 py-4">
                    <div>
                      <div className="h-3.5 w-14 rounded bg-[#F3F4F6]" />
                      <div className="mt-2 h-3 w-28 rounded bg-[#F3F4F6]" />
                    </div>
                    <div className="text-right">
                      <div className="h-3.5 w-16 rounded bg-[#F3F4F6]" />
                      <div className="mt-2 h-3 w-10 rounded bg-[#F3F4F6]" />
                    </div>
                  </div>
                ))
              : assets.map((asset) => {
                  const up = (asset.changePercent ?? 0) >= 0;
                  return (
                    <div
                      key={asset.symbol}
                      className="flex items-center justify-between px-5 py-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-[#111827]">
                            {asset.symbol}
                          </span>
                          <span className="rounded bg-[#F3F4F6] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                            {asset.assetType}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] text-[#6B7280]">{asset.name}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[14px] font-bold text-[#111827]">
                            {asset.price !== null ? `$${asset.price.toFixed(2)}` : "—"}
                          </p>
                          <p
                            className={`text-[12px] font-medium ${
                              up ? "text-[#1a6b3c]" : "text-red-500"
                            }`}
                          >
                            {asset.changePercent !== null
                              ? `${up ? "+" : ""}${asset.changePercent.toFixed(2)}%`
                              : "—"}
                          </p>
                        </div>

                        <button
                          onClick={handleTradeClick}
                          className="shrink-0 rounded-lg border border-[#E5E5E2] bg-white px-3 py-1.5 text-[12px] font-medium text-[#111827] transition-colors hover:bg-[#F7F7F5]"
                        >
                          Trade
                        </button>

                        <ArrowUpRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                      </div>
                    </div>
                  );
                })}
          </div>

          {!loading && assets.length === 0 && !error && (
            <p className="mt-4 text-[13px] text-[#9CA3AF]">
              No assets available right now.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}