import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, type IChartApi } from "lightweight-charts";

type Kline = [number, string, string, string, string, string, ...unknown[]];

// Decide how many decimals the price axis should show, based on price magnitude
function priceDecimals(p: number): number {
  if (p >= 1000) return 2;
  if (p >= 1) return 4;
  if (p >= 0.01) return 5;
  if (p >= 0.0001) return 6;
  return 8;
}

export function Chart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart: IChartApi = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
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

        // Set price-axis precision based on this coin's price magnitude
        if (candles.length > 0) {
          const decimals = priceDecimals(candles[candles.length - 1].close);
          series.applyOptions({
            priceFormat: {
              type: "price",
              precision: decimals,
              minMove: Math.pow(10, -decimals), // smallest tick the axis recognizes
            },
          });
        }

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
        {symbol.replace("USDT", "")}{" "}
        <span className="text-gray-500 text-sm font-normal">· 1m</span>
      </h3>
      <div ref={containerRef} />
      <p className="text-xs text-gray-600 mt-2">
        Charts by TradingView Lightweight Charts™
      </p>
    </div>
  );
}