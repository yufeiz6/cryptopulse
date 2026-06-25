using Microsoft.AspNetCore.SignalR;

namespace CryptoPulse;

// A SignalR hub is the "channel" the frontend connects to.
// We don't need methods here yet — the server pushes data TO clients
// from the background service (see BinanceService).
public class TickerHub : Hub
{
}