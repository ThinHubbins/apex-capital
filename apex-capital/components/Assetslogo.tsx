"use client";
import { useState } from "react";

type AssetLogoProps = {
  symbol: string;
  logo: string;
  size?: number;
};

/**
 * Renders an asset's logo image. If the image fails to load (404,
 * blocked, bad domain, etc.) it falls back to a colored circle with
 * the symbol's initials instead of a broken image icon.
 */
export function AssetLogo({ symbol, logo, size = 32 }: AssetLogoProps) {
  console.log("AssetLogo", symbol, JSON.stringify(logo)); // ← temp debug
  const [failed, setFailed] = useState(false);

  if (failed || !logo) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "#e5e7eb",
          color: "#374151",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.4,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {symbol.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      style={{ borderRadius: "50%", flexShrink: 0, objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  );
}