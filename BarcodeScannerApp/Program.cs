using BarcodeScannerApp.Models;
using BarcodeScannerApp.Services;
using BarcodeScannerCore;
using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5000);
});

// Register Universal Barcode Scanner Service & Inventory Persistence
builder.Services.AddUniversalBarcodeScanner();
builder.Services.AddSingleton<IInventoryService, FileInventoryService>();
builder.Services.AddAntiforgery();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseCors("AllowAll");
app.UseAntiforgery();
app.UseDefaultFiles();
app.UseStaticFiles();

// Diverse real-world sample barcodes across Electronics, Hardware Tools, Books, Packaging, Web links, and Industrial
var sampleBarcodes = new[]
{
    new { 
        Barcode = "https://github.com/Barkha777", 
        Name = "GitHub User Profile URL", 
        Category = "Web Address / Digital Link", 
        Format = "CODE_128", 
        Type = "Alphanumeric Web URL" 
    },
    new { 
        Barcode = "9780132350884", 
        Name = "Clean Code (Book by Robert C. Martin)", 
        Category = "Books & Literature", 
        Format = "EAN_13", 
        Type = "ISBN-13 Book Code" 
    },
    new { 
        Barcode = "888462062908", 
        Name = "Apple Lightning to USB Cable", 
        Category = "Consumer Electronics", 
        Format = "UPC_A", 
        Type = "Retail UPC Hardware" 
    },
    new { 
        Barcode = "0088381851912", 
        Name = "Makita 18V Cordless Power Drill", 
        Category = "Hardware & Power Tools", 
        Format = "EAN_13", 
        Type = "GTIN-13 Retail Hardware" 
    },
    new { 
        Barcode = "(01)00883818519125(10)LOT459A(17)281231(21)SN987654", 
        Name = "GS1 Composite Tag (GTIN + Lot + Expiry + Serial)", 
        Category = "Industrial / Manufacturing", 
        Format = "GS1_128", 
        Type = "GS1 Multi-Segment Code" 
    },
    new { 
        Barcode = "PKG-US-99482-Z7", 
        Name = "Logistics Shipment Parcel SKU", 
        Category = "Industrial / Warehousing", 
        Format = "CODE_128", 
        Type = "Inventory Serial Code" 
    }
};

// 1. Health
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "Active",
    engine = "ZXing.Net Universal Optical Decoder",
    runtime = ".NET 8.0 (C# 12)",
    scope = "Any Physical Product / 1D & 2D Barcodes",
    timestampUtc = DateTime.UtcNow
}));

// 2. Samples
app.MapGet("/api/samples", () => Results.Ok(sampleBarcodes));

// 3. Scan Image
app.MapPost("/api/barcode/scan", (IFormFile file, IUniversalBarcodeScanner scanner) =>
{
    if (file == null || file.Length == 0)
    {
        return Results.BadRequest(new BarcodeAnalysis { Success = false, ErrorMessage = "No image file uploaded." });
    }

    using var stream = file.OpenReadStream();
    var result = scanner.DecodeImage(stream);
    return Results.Ok(result);
}).DisableAntiforgery();

// 4. Scan Base64
app.MapPost("/api/barcode/scan-base64", ([FromBody] Base64ScanRequest request, IUniversalBarcodeScanner scanner) =>
{
    if (string.IsNullOrWhiteSpace(request?.ImageBase64))
    {
        return Results.BadRequest(new BarcodeAnalysis { Success = false, ErrorMessage = "Base64 payload empty." });
    }

    try
    {
        string raw = request.ImageBase64;
        int commaIdx = raw.IndexOf(',');
        string clean = commaIdx >= 0 ? raw[(commaIdx + 1)..] : raw;
        byte[] bytes = Convert.FromBase64String(clean.Trim());
        var result = scanner.DecodeImage(bytes);
        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new BarcodeAnalysis { Success = false, ErrorMessage = ex.Message });
    }
});

// 5. Barcode Lookup / Content Identification with Dual-Mode Support ("check" or "save")
app.MapGet("/api/product/{*barcode}", async (
    string barcode, 
    [FromQuery] string? mode, 
    IUniversalBarcodeScanner scanner, 
    IInventoryService inventory,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(barcode))
    {
        return Results.BadRequest(new { error = "Barcode cannot be empty." });
    }

    string operationMode = string.Equals(mode, "save", StringComparison.OrdinalIgnoreCase) ? "save" : "check";
    string key = barcode.Trim();

    var existing = await inventory.GetByBarcodeAsync(key);
    bool isPreviouslySaved = existing != null;

    var analysis = scanner.AnalyzeBarcode(key);
    var details = await scanner.LookupUniversalDetailsAsync(key, ct);
    var scanBundle = new BarcodeScanResponse(analysis, details);

    SavedProduct? activeSavedProduct = null;

    if (operationMode == "save")
    {
        // Save mode: record scan and auto-save if new or increment scan count if existing
        activeSavedProduct = await inventory.RecordScanAsync(scanBundle, autoSaveIfNew: true);
    }
    else
    {
        // Check mode: if previously saved, record that it was scanned again (increment count)
        if (isPreviouslySaved)
        {
            activeSavedProduct = await inventory.RecordScanAsync(scanBundle, autoSaveIfNew: false);
        }
    }

    return Results.Ok(new ExtendedScanResponse(
        analysis,
        details,
        isPreviouslySaved,
        activeSavedProduct ?? existing,
        operationMode
    ));
});

// 6. Scan & Identify (All-In-One from camera or uploaded file) with Dual-Mode Support
app.MapPost("/api/barcode/scan-and-fetch", async (
    IFormFile? file,
    [FromForm] string? imageBase64,
    [FromForm] string? mode,
    IUniversalBarcodeScanner scanner,
    IInventoryService inventory,
    CancellationToken ct) =>
{
    string operationMode = string.Equals(mode, "save", StringComparison.OrdinalIgnoreCase) ? "save" : "check";
    BarcodeAnalysis analysis;

    if (file != null && file.Length > 0)
    {
        using var stream = file.OpenReadStream();
        analysis = scanner.DecodeImage(stream);
    }
    else if (!string.IsNullOrWhiteSpace(imageBase64))
    {
        int commaIdx = imageBase64.IndexOf(',');
        string clean = commaIdx >= 0 ? imageBase64[(commaIdx + 1)..] : imageBase64;
        byte[] bytes = Convert.FromBase64String(clean.Trim());
        analysis = scanner.DecodeImage(bytes);
    }
    else
    {
        return Results.BadRequest(new { error = "No image provided." });
    }

    if (!analysis.Success || string.IsNullOrEmpty(analysis.RawValue))
    {
        return Results.Ok(new ExtendedScanResponse(
            analysis, 
            new UniversalProductDetails { FoundInRegistry = false, Title = "No barcode detected." },
            false,
            null,
            operationMode
        ));
    }

    string key = analysis.RawValue.Trim();
    var existing = await inventory.GetByBarcodeAsync(key);
    bool isPreviouslySaved = existing != null;

    var details = await scanner.LookupUniversalDetailsAsync(key, ct);
    var scanBundle = new BarcodeScanResponse(analysis, details);

    SavedProduct? activeSavedProduct = null;

    if (operationMode == "save")
    {
        // Scan & Save mode: Automatically save product if new, or update scan count if existing
        activeSavedProduct = await inventory.RecordScanAsync(scanBundle, autoSaveIfNew: true);
    }
    else
    {
        // Check mode: If already in inventory, update scan history without altering product status
        if (isPreviouslySaved)
        {
            activeSavedProduct = await inventory.RecordScanAsync(scanBundle, autoSaveIfNew: false);
        }
    }

    return Results.Ok(new ExtendedScanResponse(
        analysis,
        details,
        isPreviouslySaved,
        activeSavedProduct ?? existing,
        operationMode
    ));
}).DisableAntiforgery();

// 7. Inventory Endpoints
app.MapGet("/api/inventory", async (IInventoryService inventory) =>
{
    var list = await inventory.GetAllAsync();
    return Results.Ok(list);
});

app.MapGet("/api/inventory/check/{*barcode}", async (string barcode, IInventoryService inventory) =>
{
    var result = await inventory.CheckAvailabilityAsync(barcode);
    return Results.Ok(result);
});

app.MapPost("/api/inventory/save", async ([FromBody] SaveProductRequest req, IInventoryService inventory) =>
{
    if (string.IsNullOrWhiteSpace(req.Barcode))
    {
        return Results.BadRequest(new { error = "Barcode is required." });
    }

    var saved = await inventory.SaveOrUpdateAsync(new SavedProduct
    {
        Barcode = req.Barcode.Trim(),
        SymbologyFormat = req.SymbologyFormat ?? "UNKNOWN",
        Title = string.IsNullOrWhiteSpace(req.Title) ? $"Product {req.Barcode.Trim()}" : req.Title.Trim(),
        BrandOrManufacturer = req.BrandOrManufacturer ?? "General",
        Category = req.Category ?? "General",
        Description = req.Description ?? string.Empty,
        ImageUrl = req.ImageUrl,
        PayloadType = req.PayloadType ?? "General Data",
        Quantity = req.Quantity,
        Price = req.Price,
        Status = req.Status ?? (req.Quantity <= 0 ? "Out of Stock" : "Available"),
        Notes = req.Notes,
        Attributes = req.Attributes ?? new Dictionary<string, string>()
    });

    return Results.Ok(saved);
});

app.MapPost("/api/inventory/stock/{*barcode}", async (string barcode, [FromBody] UpdateStockRequest req, IInventoryService inventory) =>
{
    var updated = await inventory.UpdateStockAsync(barcode, req.Delta, req.ExactQuantity);
    if (updated == null)
    {
        return Results.NotFound(new { error = "Product not found in inventory." });
    }
    return Results.Ok(updated);
});

app.MapDelete("/api/inventory/{*barcode}", async (string barcode, IInventoryService inventory) =>
{
    bool deleted = await inventory.DeleteAsync(barcode);
    return Results.Ok(new { success = deleted });
});

// 8. Generate Barcode PNG
app.MapGet("/api/barcode/generate/{barcode}", (
    string barcode,
    [FromQuery] string? format,
    [FromQuery] int? width,
    [FromQuery] int? height) =>
{
    string fmtName = string.IsNullOrWhiteSpace(format) ? "CODE_128" : format;
    if (!Enum.TryParse<ZXing.BarcodeFormat>(fmtName, true, out var barcodeFmt))
    {
        barcodeFmt = ZXing.BarcodeFormat.CODE_128;
    }

    int w = width ?? 380;
    int h = height ?? 130;

    var writer = new ZXing.ImageSharp.BarcodeWriter<Rgba32>
    {
        Format = barcodeFmt,
        Options = new ZXing.Common.EncodingOptions
        {
            Width = w,
            Height = h,
            Margin = 12
        }
    };

    using var image = writer.Write(barcode);
    using var ms = new MemoryStream();
    image.SaveAsPng(ms);
    return Results.File(ms.ToArray(), "image/png", $"barcode_{barcode}.png");
});

// 9. Code snippet for team
app.MapGet("/api/code-snippet", () =>
{
    string path = Path.Combine(AppContext.BaseDirectory, "BarcodeProductModule.cs");
    if (!File.Exists(path)) path = Path.Combine(Directory.GetCurrentDirectory(), "BarcodeProductModule.cs");
    if (!File.Exists(path)) path = Path.Combine(Directory.GetCurrentDirectory(), "..", "BarcodeProductModule.cs");

    if (File.Exists(path))
    {
        return Results.Text(File.ReadAllText(path), "text/plain");
    }

    return Results.Text("// BarcodeProductModule.cs is available in the root workspace.", "text/plain");
});

Console.WriteLine("=================================================");
Console.WriteLine("   UNIVERSAL BARCODE SCANNER & METADATA (.NET 8)");
Console.WriteLine("   Website: http://localhost:5000");
Console.WriteLine("=================================================");

app.Run();

public record Base64ScanRequest(string ImageBase64);

public record ExtendedScanResponse(
    BarcodeAnalysis Barcode,
    UniversalProductDetails Product,
    bool IsPreviouslySaved,
    SavedProduct? SavedProduct,
    string Mode
);
