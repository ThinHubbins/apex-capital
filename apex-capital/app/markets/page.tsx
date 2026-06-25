"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuthUser } from "@/lib/supabase/use-auth-user";
import { AssetLogo } from "../../components/Assetslogo";

type AssetType = "stock" | "etf" | "crypto";

type Asset = {
  symbol: string;
  name: string;
   logo: string; 
  assetType: AssetType;
  price: number | null;
  changePercent: number | null;
  error?: string;
};

const TYPE_FILTERS: { key: "all" | AssetType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "stock", label: "Stocks" },
  { key: "etf", label: "ETFs" },
  { key: "crypto", label: "Crypto" },
];

const TYPE_BADGE_STYLES: Record<AssetType, string> = {
  stock: "bg-[#F3F4F6] text-[#6B7280]",
  etf: "bg-indigo-50 text-indigo-600",
  crypto: "bg-orange-50 text-orange-600",
};

export default function Markets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | AssetType>("all");
  const { isLoggedIn } = useAuthUser();
  const router = useRouter();

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

  const filteredAssets = useMemo(() => {
    if (activeFilter === "all") return assets;
    return assets.filter((a) => a.assetType === activeFilter);
  }, [assets, activeFilter]);

  function handleTradeClick(asset: Asset) {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    router.push(
      `/trade/${asset.symbol}?name=${encodeURIComponent(asset.name)}&type=${asset.assetType}&price=${asset.price ?? 0}`
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] font-sans text-[#111827]">
      <Navbar variant={isLoggedIn ? "auth" : "public"} />

      <main className="px-6 py-10 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827] sm:text-[30px]">
            Markets
          </h1>
          <p className="mt-1.5 text-[14px] text-[#6B7280]">
            US stocks, ETFs, and crypto available to invest in.
          </p>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                  activeFilter === f.key
                    ? "bg-[#111827] text-white"
                    : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E5E2]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}

          <div className="mt-4 divide-y divide-[#E5E5E2] rounded-xl border border-[#E5E5E2] bg-white">
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
              : filteredAssets.map((asset) => {
                  const up = (asset.changePercent ?? 0) >= 0;
                  return (
                    <div
                      key={asset.symbol}
                      className="flex items-center justify-between px-5 py-4"
                    >
                      <div className="flex items-center gap-3">
  <AssetLogo symbol={asset.symbol} logo={asset.logo} size={36} />
  <div>
    <div className="flex items-center gap-2">
      <span className="text-[14px] font-bold text-[#111827]">
        {asset.symbol}
      </span>
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${TYPE_BADGE_STYLES[asset.assetType]}`}>
        {asset.assetType}
      </span>
    </div>
    <p className="mt-0.5 text-[13px] text-[#6B7280]">{asset.name}</p>
  </div>
</div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[14px] font-bold text-[#111827]">
                            {asset.price !== null
                              ? `$${asset.price < 1 ? asset.price.toFixed(4) : asset.price.toFixed(2)}`
                              : "—"}
                          </p>
                          <p className={`text-[12px] font-medium ${up ? "text-[#1a6b3c]" : "text-red-500"}`}>
                            {asset.changePercent !== null
                              ? `${up ? "+" : ""}${asset.changePercent.toFixed(2)}%`
                              : "—"}
                          </p>
                        </div>

                        <button
                          onClick={() => handleTradeClick(asset)}
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

          {!loading && filteredAssets.length === 0 && !error && (
            <p className="mt-4 text-[13px] text-[#9CA3AF]">
              No assets available right now.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}