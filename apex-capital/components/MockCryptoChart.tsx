"use client";

import { PricePoint } from "@/lib/mockMarketData";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine,
} from "recharts";


export default function MockCryptoChart({
  series,
  floor,
  ceiling,
}: {
  series: PricePoint[];
  floor: number;
  ceiling: number;
}) {
  const open = series[0]?.price ?? floor;
  const latest = series[series.length - 1]?.price ?? open;
  const isUp = latest >= open;
  const fmtPrice = (n: number) => n.toFixed(n < 1 ? 4 : 2);

  return (
    <div className="mb-4 rounded-2xl border border-[#E5E5E2] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Today's Price Range
        </p>
        <p className="text-[11px] text-[#9CA3AF]">
          ${fmtPrice(floor)} – ${fmtPrice(ceiling)}
        </p>
      </div>
      <div className="mt-3 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <defs>
              <linearGradient id="cryptoFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isUp ? "#1a6b3c" : "#dc2626"} stopOpacity={0.22} />
                <stop offset="100%" stopColor={isUp ? "#1a6b3c" : "#dc2626"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={[floor, ceiling]} hide />
            <XAxis dataKey="time" hide />
            <ReferenceLine y={ceiling} stroke="#E5E5E2" strokeDasharray="4 4" />
            <ReferenceLine y={floor} stroke="#E5E5E2" strokeDasharray="4 4" />
            <Tooltip
             formatter={(value) => [`$${fmtPrice(value as number)}`, "Price"]}
              labelFormatter={(t) =>
                new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }
              contentStyle={{ borderRadius: 12, border: "1px solid #E5E5E2", fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isUp ? "#1a6b3c" : "#dc2626"}
              strokeWidth={2}
              fill="url(#cryptoFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-[11px] text-[#9CA3AF]">
        Real-time market data and trading activity.
      </p>
    </div>
  );
}