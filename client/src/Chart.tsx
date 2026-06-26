import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, type IChartApi } from "lightweight-charts";

type Kline = [number, string, string, string, string, string, ...unknown[]];

export function Chart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart: IChartApi = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 300,
      // Dark theme to match the rest of the UI
      layout: {
        background: { color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#4ade80",
      downColor: "#f87171",
      borderVisible: false,
      wickUpColor: "#4ade80",
      wickDownColor: "#f87171",
    });

    fetch(
      `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=1m&limit=100`
    )
      .then((res) => res.json())
      .then((data: Kline[]) => {
        const candles = data.map((k) => ({
          time: (k[0] / 1000) as never,
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
        }));
        series.setData(candles);
        chart.timeScale().fitContent();
      })
      .catch((err) => console.error("Failed to load klines:", err));

    return () => {
      chart.remove();
    };
  }, [symbol]);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-gray-100">
          {symbol.replace("USDT", "")}{" "} <span className="text-gray-500 text-sm font-normal">· 1m</span>
      </h3>
      <div ref={containerRef} />
      <p className="text-xs text-gray-600 mt-2">
        Charts by TradingView Lightweight Charts™
      </p>
    </div>
  );
}