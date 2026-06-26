import { memo, useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Chart } from "./Chart";

type Ticker = {
  symbol: string;
  price: number;
  changePercent: number;
  volume: number;
};

const API_URL = import.meta.env.VITE_API_URL;

const Row = memo(function Row({
  ticker,
  top,
  onSelect,
}: {
  ticker: Ticker;
  top: number;
  onSelect: (symbol: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(ticker.symbol)}
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
        cursor: "pointer",
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
  const [selected, setSelected] = useState<string | null>(null);

  //     A "staging area" that survives re-renders but does NOT trigger them.
  //     Incoming data is written here first, instead of into state directly.
  const pendingRef = useRef<Map<string, Ticker>>(new Map());

  useEffect(() => {
    const pending = pendingRef.current;
    let running = true;
    let rafId = 0;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hub/tickers`)
      .withAutomaticReconnect()
      .build();

    connection.on("tickers", (data: Ticker[]) => {
      for (const t of data) pending.set(t.symbol, t);
    });

    const tick = () => {
      if (!running) return;
      if (pending.size > 0) {
        setTickers((prev) => {
          const map = new Map<string, Ticker>();
          for (const t of prev) map.set(t.symbol, t);
          for (const [sym, t] of pending) map.set(sym, t);
          pending.clear();
          return Array.from(map.values());
        });
      }
      rafId = requestAnimationFrame(tick);
    };

    // Delay start slightly so StrictMode's immediate mount→unmount→mount
    // settles first; only the surviving run actually connects.
    const timer = setTimeout(() => {
      connection
        .start()
        .then(() => {
          if (!running) {
            connection.stop();
            return;
          }
          setConnected(true);
          rafId = requestAnimationFrame(tick);
        })
        .catch(() => {
          /* ignore the noisy "stopped during negotiation" */
        });
    }, 0);

    return () => {
      running = false;
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
      pending.clear();
      connection.stop();
    };
  }, []);

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

      <div style={{ display: "flex", fontWeight: "bold", borderBottom: "2px solid #ccc", padding: "8px 0" }}>
        <div style={cell}>Symbol</div>
        <div style={cell}>Price</div>
        <div style={cell}>24h Change</div>
        <div style={cell}>Volume</div>
      </div>

      <div ref={parentRef} style={{ height: 600, overflow: "auto" }}>
        <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const t = rows[virtualRow.index];
          return (
            <Row
              key={t.symbol}
              ticker={t}
              top={virtualRow.start}
              onSelect={setSelected}
            />
          );
        })}
        </div>
      </div>
      {selected && (
        <div style={{ marginTop: 24 }}>
          <Chart symbol={selected} />
        </div>
      )}
    </div>
  );
}

const cell: React.CSSProperties = { flex: 1, padding: "0 8px" };

export default App;