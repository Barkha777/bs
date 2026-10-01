# ==============================================================================
# Dockerfile for Universal Barcode Scanner & Data Extraction Engine (.NET 8)
# Deployable to Render, Railway, Fly.io, Azure, or any Docker host
# ==============================================================================

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["BarcodeScannerApp.csproj", "./"]
RUN dotnet restore "BarcodeScannerApp.csproj"

COPY . .
RUN dotnet publish "BarcodeScannerApp.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Port configuration
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "BarcodeScannerApp.dll"]
