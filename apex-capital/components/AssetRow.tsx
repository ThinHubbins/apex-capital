// Example of how to use AssetLogo inside an asset list/card.
// Swap this into wherever you currently map over quotes.
import { AssetLogo } from "./Assetslogo";

type Quote = {
  symbol: string;
  name: string;
  logo: string;
  price: number;
  changePercent: number;
};

export function AssetRow({ quote }: { quote: Quote }) {
  const isUp = quote.changePercent >= 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
      <AssetLogo symbol={quote.symbol} logo={quote.logo} size={32} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{quote.symbol}</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>{quote.name}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div>${quote.price.toFixed(2)}</div>
        <div style={{ fontSize: 12, color: isUp ? "#16a34a" : "#dc2626" }}>
          {isUp ? "+" : ""}{quote.changePercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}