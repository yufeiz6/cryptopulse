# ---------- Stage 1: build ----------
# Use the .NET SDK image (has everything needed to compile)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy the project file first and restore dependencies.
# (Doing this before copying all code lets Docker cache the restore step.)
COPY *.csproj ./
RUN dotnet restore

# Copy the rest of the source and publish a release build
COPY . ./
RUN dotnet publish -c Release -o /app

# ---------- Stage 2: runtime ----------
# Use the smaller ASP.NET runtime image (no SDK, just what's needed to run)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Copy the published output from the build stage
COPY --from=build /app ./

# The app will listen on port 8080 inside the container
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Command to run when the container starts
ENTRYPOINT ["dotnet", "server.dll"]