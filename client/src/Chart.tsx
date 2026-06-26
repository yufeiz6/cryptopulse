import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, type IChartApi } from "lightweight-charts";

// Binance kline REST endpoint shape: each kline is an array
// [openTime, open, high, low, close, volume, ...]
type Kline = [number, string, string, string, string, string, ...unknown[]];

export function Chart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Create the chart inside our container div
    const chart: IChartApi = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 300,
    });

    // 2. Add a candlestick series
    const series = chart.addSeries(CandlestickSeries);

    // 3. Fetch recent 1-minute klines from Binance and draw them
    fetch(
      `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=1m&limit=100`
    )
      .then((res) => res.json())
      .then((data: Kline[]) => {
        const candles = data.map((k) => ({
          time: (k[0] / 1000) as never, // Binance gives ms; lightweight-charts wants seconds
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
        }));
        series.setData(candles);
        chart.timeScale().fitContent();
      })
      .catch((err) => console.error("Failed to load klines:", err));

    // 4. Clean up the chart when symbol changes or component unmounts
    return () => {
      chart.remove();
    };
  }, [symbol]); // re-run whenever the selected symbol changes

  return (
    <div>
      <h3>{symbol} · 1m</h3>
      <div ref={containerRef} />
      <p style={{ fontSize: 12, color: "#888" }}>
        Charts by TradingView Lightweight Charts™
      </p>
    </div>
  );
}