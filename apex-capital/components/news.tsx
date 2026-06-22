/* ------------------------------------------------------------------ */
/*  NewsCard - extracted so it can render in both the default grid     */
/*  and the "view more" expanded grid without duplicating markup       */
/* ------------------------------------------------------------------ */

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Link
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
    </Link>
  );
}