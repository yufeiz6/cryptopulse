import { memo, useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { useVirtualizer } from "@tanstack/react-virtual";

type Ticker = {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
};

const API_URL = import.meta.env.VITE_API_URL;

// One row, wrapped in memo: it only re-renders when its OWN props change.
const Row = memo(function Row({
  ticker,
  top,
}: {
  ticker: Ticker;
  top: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: 36,
        transform: `translateY(${top}px)`,
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid #eee",
      }}
    >
      <div style={cell}>{ticker.symbol}</div>
      <div style={cell}>{ticker.price}</div>
      <div style={{ ...cell, color: ticker.changePercent >= 0 ? "green" : "red" }}>
        {ticker.changePercent}%
      </div>
      <div style={cell}>{ticker.volume}</div>
    </div>
  );
});

function App() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hub/tickers`)
      .withAutomaticReconnect()
      .build();

    connection.on("tickers", (data: Ticker[]) => {
      setTickers((prev) => {
        const map = new Map<string, Ticker>();
        for (const t of prev) map.set(t.symbol, t);
        for (const t of data) map.set(t.symbol, t);
        return Array.from(map.values());
      });
    });

    connection.start()
      .then(() => setConnected(true))
      .catch((err) => console.error("Connection failed:", err));

    return () => {
      connection.stop();
    };
  }, []);

  // Sorted full list (still hundreds of rows)
  const rows = [...tickers].sort((a, b) => b.volume - a.volume);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>CryptoPulse</h1>
      <p style={{ color: connected ? "green" : "orange" }}>
        {connected ? "● Live" : "○ Connecting…"} · {tickers.length} pairs
      </p>

      {/* Header row (outside the scroll area so it stays fixed) */}
      <div style={{ display: "flex", fontWeight: "bold", borderBottom: "2px solid #ccc", padding: "8px 0" }}>
        <div style={cell}>Symbol</div>
        <div style={cell}>Price</div>
        <div style={cell}>24h Change</div>
        <div style={cell}>Volume</div>
      </div>

      {/* Scroll container */}
      <div ref={parentRef} style={{ height: 600, overflow: "auto" }}>
        <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const t = rows[virtualRow.index];
            return (
              <Row key={t.symbol} ticker={t} top={virtualRow.start} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

const cell: React.CSSProperties = { flex: 1, padding: "0 8px" };

export default App;