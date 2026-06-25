using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;

namespace CryptoPulse;

// A background service that keeps a WebSocket connection to Binance,
// reads live ticker data, and broadcasts it to all connected browsers via SignalR.
public class BinanceService : BackgroundService
{
    private readonly IHubContext<TickerHub> _hub;

    public BinanceService(IHubContext<TickerHub> hub)
    {
        _hub = hub;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var ws = new ClientWebSocket();

        // Binance "all market mini tickers" stream: pushes an array of
        // every symbol's stats about once per second.
        var url = new Uri("wss://data-stream.binance.vision/ws/!miniTicker@arr");

        await ws.ConnectAsync(url, stoppingToken);

        var buffer = new byte[1 << 20]; // 1 MB buffer (the array is big)

        while (!stoppingToken.IsCancellationRequested && ws.State == WebSocketState.Open)
        {
            // Read one full message from Binance
            var sb = new StringBuilder();
            WebSocketReceiveResult result;
            do
            {
                result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), stoppingToken);
                sb.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));
            } while (!result.EndOfMessage);

            // Parse the JSON and reshape it into our own simpler format
            var tickers = ParseTickers(sb.ToString());

            // Push to every connected browser, on a method named "tickers"
            await _hub.Clients.All.SendAsync("tickers", tickers, stoppingToken);
        }
    }

    // Binance sends fields with short names (s = symbol, c = last price, etc.).
    // We convert into clean objects matching the frontend's Ticker type.
    private static List<object> ParseTickers(string json)
    {
        var list = new List<object>();
        using var doc = JsonDocument.Parse(json);

        foreach (var item in doc.RootElement.EnumerateArray())
        {
            var symbol = item.GetProperty("s").GetString() ?? "";

            // Only keep USDT pairs to keep the list focused
            if (!symbol.EndsWith("USDT")) continue;

            double open = double.Parse(item.GetProperty("o").GetString() ?? "0");
            double close = double.Parse(item.GetProperty("c").GetString() ?? "0");
            double volume = double.Parse(item.GetProperty("v").GetString() ?? "0");

            double changePercent = open == 0 ? 0 : Math.Round((close - open) / open * 100, 2);

            list.Add(new
            {
                symbol,
                price = close,
                changePercent,
                volume = Math.Round(volume, 0)
            });
        }

        return list;
    }
}