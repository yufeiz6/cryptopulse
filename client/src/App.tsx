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

const API_URL = import.meta.env.VITE_API_URL || "https://cryptopulse-backend-orn1.onrender.com";

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return "$" + (v / 1_000_000_000).toFixed(2) + "B";
  if (v >= 1_000_000) return "$" + (v / 1_000_000).toFixed(2) + "M";
  if (v >= 1_000) return "$" + (v / 1_000).toFixed(2) + "K";
  return "$" + v.toFixed(0);
}

function formatPrice(p: number): string {
  let decimals: number;
  if (p >= 1000) decimals = 2;       // 59,648.50
  else if (p >= 1) decimals = 4;     // 1.1401
  else if (p >= 0.01) decimals = 5;  // 0.07528
  else if (p >= 0.0001) decimals = 6;// 0.000522
  else decimals = 8;                 // 0.00000238

  return (
    "$" +
    p.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

const Row = memo(function Row({
  ticker,
  top,
  selected,
  onSelect,
}: {
  ticker: Ticker;
  top: number;
  selected: boolean;
  onSelect: (symbol: string) => void;
}) {
  const up = ticker.changePercent >= 0;
  return (
    <div
      onClick={() => onSelect(ticker.symbol)}
      style={{ transform: `translateY(${top}px)`, height: 36 }}
      className={`absolute top-0 left-0 w-full flex items-center px-2 cursor-pointer border-b border-gray-800 text-sm transition-colors ${
        selected ? "bg-blue-500/20" : "hover:bg-gray-800/60"
      }`}
    >
      <div className="flex-1 flex items-center gap-2 font-medium text-gray-100">
        <img
          src={`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/${ticker.symbol
            .replace("USDT", "")
            .toLowerCase()}.png`}
          alt=""
          width={20}
          height={20}
          className="rounded-full"
          onError={(e) => {
            // Hide the image if this coin has no icon in the set
            (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
          }}
        />
        {ticker.symbol.replace("USDT", "")}
      </div>
      <div className="flex-1 text-right font-mono text-gray-200 tabular-nums">
        {formatPrice(ticker.price)}
      </div>
      <div
        className={`flex-1 text-right font-mono tabular-nums ${
          up ? "text-green-400" : "text-red-400"
        }`}
      >
        {up ? "+" : ""}
        {ticker.changePercent}%
      </div>
      <div className="flex-1 text-right font-mono text-gray-400 tabular-nums">
        {formatVolume(ticker.volume * ticker.price)}
      </div>
    </div>
  );
});

function App() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [connected, setConnected] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"all" | "movers" | "popular">("all");

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

// A small whitelist of well-known coins for the "Popular" view
  const POPULAR = new Set([
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT",
  ]);

  let rows = [...tickers];
  if (view === "popular") {
    rows = rows.filter((t) => POPULAR.has(t.symbol));
    rows.sort((a, b) => b.volume * b.price - a.volume * a.price);
  } else if (view === "movers") {
    rows.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  } else {
    rows.sort((a, b) => b.volume * b.price - a.volume * a.price);
  }

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Crypto<span className="text-blue-400">Pulse</span>
          </h1>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                connected ? "bg-green-400 animate-pulse" : "bg-orange-400"
              }`}
            />
            <span className="text-gray-400">
              {connected ? "Live" : "Connecting…"} · {tickers.length} pairs
            </span>
          </div>
        </div>
        
        {/* View tabs */}
        <div className="flex gap-2 mb-3">
          {([
            ["all", "All"],
            ["movers", "Top Movers"],
            ["popular", "Popular"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === key
                  ? "bg-blue-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Click any row to view its live chart ↓
        </p>
        {/* Table card */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
          {/* Header row */}
          <div className="flex items-center px-2 py-3 border-b border-gray-800 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <div className="flex-1">Symbol</div>
            <div className="flex-1 text-right">Price</div>
            <div className="flex-1 text-right">24h Change</div>
            <div className="flex-1 text-right">Volume</div>
          </div>

          {/* Scroll container */}
          <div ref={parentRef} className="h-[600px] overflow-auto">
            <div
              style={{ height: rowVirtualizer.getTotalSize() }}
              className="relative"
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const t = rows[virtualRow.index];
                return (
                  <Row
                    key={t.symbol}
                    ticker={t}
                    top={virtualRow.start}
                    selected={t.symbol === selected}
                    onSelect={setSelected}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart */}
        {selected && (
          <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">Selected market</span>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-gray-300 text-sm"
              >
                ✕ Close
              </button>
            </div>
            <Chart symbol={selected} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;