using CryptoPulse;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(
                  "http://localhost:5173",
                  "https://cryptopulse-frontend-gy4g.onrender.com"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddSignalR();                 // (2) register SignalR
builder.Services.AddHostedService<BinanceService>(); // (3) start the background service

var app = builder.Build();
app.UseCors();

app.MapGet("/", () => "CryptoPulse backend is running!");

app.MapHub<TickerHub>("/hub/tickers");         // (4) expose the hub at this URL

app.Run();