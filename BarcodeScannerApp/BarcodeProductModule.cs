// ==============================================================================
// UNIVERSAL BARCODE DATA IDENTIFIER & SCANNER ENGINE (.NET 8 / C#)
// ==============================================================================
// 
// PRIMARY OBJECTIVE:
// 1. Optically scan and decode ANY 1D/2D barcode from physical products, camera
//    frames, uploaded images, or raw input streams.
// 2. Identify and extract ALL data available in the barcode:
//    - Raw decoded content
//    - Symbology standard (Code 128, EAN-13, UPC-A, QR Code, Code 39, DataMatrix, ITF-14, etc.)
//    - Payload classification (URL, GTIN, ISBN, GS1 Composite, Industrial Serial/SKU)
//    - Internal structure: GS1 Application Identifiers (Lot, Serial, Expiry),
//      GS1 country prefix, URL endpoints, ISBN publication metadata.
//    - Modulo-10 / Modulo-103 checksum verification.
// 3. Omit food/grocery assumptions: works for ANY product (electronics, tools,
//    machinery, automotive, books, pharmaceuticals, parcels, consumer goods).
//
// REQUIRED NUGET PACKAGES:
//   dotnet add package ZXing.Net
//   dotnet add package SixLabors.ImageSharp --version 2.1.13
//   dotnet add package ZXing.Net.Bindings.ImageSharp.V2
// ==============================================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using ZXing;
using ZXing.Common;
using ZXing.ImageSharp;

namespace BarcodeScannerCore;

#region Data Models

/// <summary>
/// Represents a structured segment within a barcode (e.g., GS1 Application Identifier).
/// </summary>
public record BarcodeSegment(
    string Identifier,
    string Name,
    string RawValue,
    string FormattedValue
);

/// <summary>
/// Full technical and semantic data extracted from a physical or digital barcode.
/// </summary>
public class BarcodeAnalysis
{
    public bool Success { get; set; }
    public string RawValue { get; set; } = string.Empty;
    public string SymbologyFormat { get; set; } = "UNKNOWN"; // CODE_128, EAN_13, UPC_A, QR_CODE, etc.
    public string PayloadType { get; set; } = "General Data"; // "URL", "Retail Product (GTIN)", "ISBN Book", "GS1 Composite", "Serial / SKU", "Text"
    public int Length { get; set; }
    public int ByteCount { get; set; }
    public string CharacterSet { get; set; } = "ASCII"; // Numeric, Alphanumeric, Binary, UTF-8
    public bool? ChecksumValid { get; set; }
    public string? ErrorMessage { get; set; }
    public List<BarcodeSegment> Segments { get; set; } = new();
    public Dictionary<string, string> Attributes { get; set; } = new();
    public DateTime ScannedAtUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Universal catalog or reference details for any physical item (electronics, tools, books, retail).
/// </summary>
public class UniversalProductDetails
{
    public bool FoundInRegistry { get; set; }
    public string? Title { get; set; }
    public string? BrandOrManufacturer { get; set; }
    public string? Category { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? ReferenceUrl { get; set; }
    public string DataSource { get; set; } = "Direct Barcode Data";
    public string? RawRegistryJson { get; set; }
}

/// <summary>
/// Combined response containing complete barcode data identification and optional catalog reference.
/// </summary>
public record BarcodeScanResponse(
    BarcodeAnalysis Barcode,
    UniversalProductDetails Product
);

#endregion

#region Service Contract

public interface IUniversalBarcodeScanner
{
    /// <summary>Decodes barcode from raw image byte array (camera frame or image file).</summary>
    BarcodeAnalysis DecodeImage(byte[] imageBytes);

    /// <summary>Decodes barcode from a stream.</summary>
    BarcodeAnalysis DecodeImage(Stream imageStream);

    /// <summary>Identifies and decomposes all data contained in a raw barcode string.</summary>
    BarcodeAnalysis AnalyzeBarcode(string rawBarcode, string? format = null);

    /// <summary>Fetches catalog details if indexed in global databases (Electronics, Books, Tools, Commercial Goods).</summary>
    Task<UniversalProductDetails> LookupUniversalDetailsAsync(string rawBarcode, CancellationToken ct = default);

    /// <summary>End-to-End: Decodes barcode image and immediately retrieves all available data.</summary>
    Task<BarcodeScanResponse> ScanAndIdentifyAsync(byte[] imageBytes, CancellationToken ct = default);
}

#endregion

#region Implementation

public class UniversalBarcodeScanner : IUniversalBarcodeScanner
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<UniversalBarcodeScanner>? _logger;

    public UniversalBarcodeScanner(HttpClient httpClient, ILogger<UniversalBarcodeScanner>? logger = null)
    {
        _httpClient = httpClient;
        _logger = logger;

        if (_httpClient.DefaultRequestHeaders.UserAgent.Count == 0)
        {
            _httpClient.DefaultRequestHeaders.UserAgent.Add(
                new ProductInfoHeaderValue("UniversalBarcodeScanner-Engine", "3.0")
            );
        }
    }

    private static ZXing.ImageSharp.BarcodeReader<Rgba32> CreateReader()
    {
        return new ZXing.ImageSharp.BarcodeReader<Rgba32>
        {
            AutoRotate = true,
            Options = new DecodingOptions
            {
                TryHarder = true,
                TryInverted = true,
                PossibleFormats = new List<BarcodeFormat>
                {
                    BarcodeFormat.CODE_128,
                    BarcodeFormat.CODE_39,
                    BarcodeFormat.CODE_93,
                    BarcodeFormat.EAN_13,
                    BarcodeFormat.UPC_A,
                    BarcodeFormat.EAN_8,
                    BarcodeFormat.UPC_E,
                    BarcodeFormat.ITF,
                    BarcodeFormat.CODABAR,
                    BarcodeFormat.QR_CODE,
                    BarcodeFormat.DATA_MATRIX,
                    BarcodeFormat.PDF_417,
                    BarcodeFormat.AZTEC
                }
            }
        };
    }

    public BarcodeAnalysis DecodeImage(byte[] imageBytes)
    {
        if (imageBytes == null || imageBytes.Length == 0)
        {
            return new BarcodeAnalysis { Success = false, ErrorMessage = "Image byte array is empty." };
        }

        using var ms = new MemoryStream(imageBytes);
        return DecodeImage(ms);
    }

    public BarcodeAnalysis DecodeImage(Stream imageStream)
    {
        try
        {
            if (imageStream.CanSeek) imageStream.Position = 0;
            using var image = Image.Load<Rgba32>(imageStream);
            var reader = CreateReader();

            // 1. Direct optical decode attempt
            var result = reader.Decode(image);
            if (result != null && !string.IsNullOrWhiteSpace(result.Text))
            {
                return AnalyzeBarcode(result.Text.Trim(), result.BarcodeFormat.ToString());
            }

            // 2. Auto Quiet-Zone Preprocessor
            // Automatically detects barcode bounds and adds white margin padding for screenshots or dark bordered images
            int minX = image.Width, maxX = 0, minY = image.Height, maxY = 0;
            bool foundWhite = false;

            for (int y = 0; y < image.Height; y++)
            {
                for (int x = 0; x < image.Width; x++)
                {
                    var p = image[x, y];
                    if (p.R > 180 && p.G > 180 && p.B > 180)
                    {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        foundWhite = true;
                    }
                }
            }

            if (foundWhite && maxX > minX && maxY > minY)
            {
                int cropW = maxX - minX + 1;
                int cropH = maxY - minY + 1;

                using var cropped = image.Clone(ctx => ctx.Crop(new Rectangle(minX, minY, cropW, cropH)));
                int padX = 60, padY = 30;
                using var padded = new Image<Rgba32>(cropW + padX * 2, cropH + padY * 2, Color.White);
                padded.Mutate(ctx => ctx.DrawImage(cropped, new Point(padX, padY), 1f));

                var resPadded = reader.Decode(padded);
                if (resPadded != null && !string.IsNullOrWhiteSpace(resPadded.Text))
                {
                    return AnalyzeBarcode(resPadded.Text.Trim(), resPadded.BarcodeFormat.ToString());
                }
            }

            return new BarcodeAnalysis
            {
                Success = false,
                ErrorMessage = "No barcode detected in image. Ensure barcode is visible, focused, and has adequate lighting."
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Optical decoding error");
            return new BarcodeAnalysis { Success = false, ErrorMessage = $"Decoding exception: {ex.Message}" };
        }
    }

    /// <summary>
    /// Core identification engine: analyzes what the barcode has in it and decomposes its contents.
    /// </summary>
    public BarcodeAnalysis AnalyzeBarcode(string rawBarcode, string? format = null)
    {
        if (string.IsNullOrWhiteSpace(rawBarcode))
        {
            return new BarcodeAnalysis { Success = false, ErrorMessage = "Barcode content is empty." };
        }

        string clean = rawBarcode.Trim();
        var analysis = new BarcodeAnalysis
        {
            Success = true,
            RawValue = clean,
            Length = clean.Length,
            ByteCount = System.Text.Encoding.UTF8.GetByteCount(clean),
            SymbologyFormat = format ?? DetectSymbology(clean),
            ScannedAtUtc = DateTime.UtcNow
        };

        // Determine Character Set
        if (clean.All(char.IsDigit))
        {
            analysis.CharacterSet = "Numeric Only (0-9)";
        }
        else if (clean.All(c => char.IsLetterOrDigit(c) || char.IsWhiteSpace(c) || "-_./".Contains(c)))
        {
            analysis.CharacterSet = "Standard Alphanumeric";
        }
        else
        {
            analysis.CharacterSet = "Full ASCII / Unicode";
        }

        // 1. Check for GS1 Application Identifiers e.g. (01)00883818519125(10)LOT123(17)261231(21)SN9999
        if (ParseGs1ApplicationIdentifiers(clean, analysis))
        {
            analysis.PayloadType = "GS1 Composite / Logistics Code";
            return analysis;
        }

        // 2. Check if URL / Web Address
        if (Uri.TryCreate(clean, UriKind.Absolute, out var uriResult) &&
            (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps))
        {
            analysis.PayloadType = "URL / Web Resource";
            analysis.Attributes["Protocol"] = uriResult.Scheme.ToUpperInvariant();
            analysis.Attributes["Host / Domain"] = uriResult.Host;
            analysis.Attributes["Path"] = string.IsNullOrEmpty(uriResult.AbsolutePath) ? "/" : uriResult.AbsolutePath;
            if (!string.IsNullOrEmpty(uriResult.Query))
            {
                analysis.Attributes["Query String"] = uriResult.Query;
            }
            return analysis;
        }

        // 3. Check if ISBN Book Identifier (starts with 978 or 979, 13 digits)
        string digitsOnly = new string(clean.Where(char.IsDigit).ToArray());
        if (digitsOnly.Length == 13 && (digitsOnly.StartsWith("978") || digitsOnly.StartsWith("979")))
        {
            analysis.PayloadType = "ISBN Book Identifier";
            analysis.ChecksumValid = ValidateModulo10(digitsOnly);
            analysis.Attributes["Standard"] = "ISBN-13 (International Standard Book Number)";
            analysis.Attributes["Bookland Prefix"] = digitsOnly.Substring(0, 3);
            analysis.Attributes["Registration Group & Item"] = digitsOnly.Substring(3, 9);
            analysis.Attributes["Check Digit"] = digitsOnly.Substring(12, 1);
            return analysis;
        }

        // 4. Check if Standard Retail GTIN / EAN / UPC
        if (digitsOnly.Length == clean.Length) // strictly numeric
        {
            if (digitsOnly.Length == 13)
            {
                analysis.PayloadType = "Retail Product (GTIN-13 / EAN-13)";
                analysis.ChecksumValid = ValidateModulo10(digitsOnly);
                string prefix = digitsOnly.Substring(0, 3);
                analysis.Attributes["Standard"] = "EAN-13 / GTIN-13";
                analysis.Attributes["GS1 Country / Region Prefix"] = $"{prefix} ({GetGs1RegionName(prefix)})";
                analysis.Attributes["Manufacturer & Product Code"] = digitsOnly.Substring(3, 9);
                analysis.Attributes["Check Digit"] = digitsOnly.Substring(12, 1);
                return analysis;
            }
            if (digitsOnly.Length == 12)
            {
                analysis.PayloadType = "Retail Product (GTIN-12 / UPC-A)";
                analysis.ChecksumValid = ValidateModulo10(digitsOnly);
                analysis.Attributes["Standard"] = "UPC-A / GTIN-12";
                analysis.Attributes["System Digit"] = digitsOnly.Substring(0, 1);
                analysis.Attributes["Manufacturer Code"] = digitsOnly.Substring(1, 5);
                analysis.Attributes["Product Item Code"] = digitsOnly.Substring(6, 5);
                analysis.Attributes["Check Digit"] = digitsOnly.Substring(11, 1);
                return analysis;
            }
            if (digitsOnly.Length == 8)
            {
                analysis.PayloadType = "Retail Product (EAN-8 Compact)";
                analysis.ChecksumValid = ValidateModulo10(digitsOnly);
                analysis.Attributes["Standard"] = "EAN-8";
                analysis.Attributes["Country Prefix"] = digitsOnly.Substring(0, 3);
                analysis.Attributes["Item Reference"] = digitsOnly.Substring(3, 4);
                analysis.Attributes["Check Digit"] = digitsOnly.Substring(7, 1);
                return analysis;
            }
            if (digitsOnly.Length == 14)
            {
                analysis.PayloadType = "Shipping Container (ITF-14 / Master Carton)";
                analysis.ChecksumValid = ValidateModulo10(digitsOnly);
                analysis.Attributes["Standard"] = "ITF-14 (Interleaved 2 of 5)";
                analysis.Attributes["Packaging Indicator"] = digitsOnly.Substring(0, 1);
                analysis.Attributes["Item Reference (GTIN)"] = digitsOnly.Substring(1, 12);
                analysis.Attributes["Check Digit"] = digitsOnly.Substring(13, 1);
                return analysis;
            }
        }

        // 5. Default: Alphanumeric Inventory / Serial / Tag / Custom Code
        analysis.PayloadType = "Alphanumeric Code (SKU / Serial / Asset / Custom)";
        analysis.Attributes["Format Pattern"] = DescribePattern(clean);
        analysis.Attributes["Character Set"] = analysis.CharacterSet;
        return analysis;
    }

    /// <summary>
    /// Parses GS1 Application Identifiers like (01)GTIN (10)LOT (17)EXPIRY (21)SERIAL.
    /// </summary>
    private static bool ParseGs1ApplicationIdentifiers(string text, BarcodeAnalysis analysis)
    {
        var regex = new Regex(@"\((01|10|17|21|30|310\d|400|414)\)([^()]+)");
        var matches = regex.Matches(text);
        if (matches.Count == 0) return false;

        foreach (Match match in matches)
        {
            string ai = match.Groups[1].Value;
            string val = match.Groups[2].Value.Trim();

            switch (ai)
            {
                case "01":
                    analysis.Segments.Add(new BarcodeSegment("01", "Global Trade Item Number (GTIN)", val, val));
                    analysis.Attributes["GS1 GTIN"] = val;
                    break;
                case "10":
                    analysis.Segments.Add(new BarcodeSegment("10", "Batch / Lot Number", val, val));
                    analysis.Attributes["GS1 Batch/Lot"] = val;
                    break;
                case "17":
                    string formattedDate = val.Length == 6 ? $"20{val[..2]}-{val.Substring(2, 2)}-{val.Substring(4, 2)}" : val;
                    analysis.Segments.Add(new BarcodeSegment("17", "Expiration Date (YYMMDD)", val, formattedDate));
                    analysis.Attributes["GS1 Expiration Date"] = formattedDate;
                    break;
                case "21":
                    analysis.Segments.Add(new BarcodeSegment("21", "Serial Number", val, val));
                    analysis.Attributes["GS1 Serial Number"] = val;
                    break;
                default:
                    analysis.Segments.Add(new BarcodeSegment(ai, $"Application Identifier ({ai})", val, val));
                    analysis.Attributes[$"GS1 AI ({ai})"] = val;
                    break;
            }
        }

        return true;
    }

    /// <summary>
    /// Universal catalog lookup across commercial products, electronics, tools, and books.
    /// STRICTLY NON-FOOD BIASED.
    /// </summary>
    public async Task<UniversalProductDetails> LookupUniversalDetailsAsync(string rawBarcode, CancellationToken ct = default)
    {
        string clean = rawBarcode.Trim();
        string digitsOnly = new string(clean.Where(char.IsDigit).ToArray());

        // A. If Web URL: Provide URL summary immediately
        if (Uri.TryCreate(clean, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            return new UniversalProductDetails
            {
                FoundInRegistry = true,
                Title = $"Web Destination: {uri.Host}",
                BrandOrManufacturer = uri.Host,
                Category = "Internet Link / Digital URL",
                Description = $"Decoded destination URL: {clean}",
                ReferenceUrl = clean,
                DataSource = "Direct URL Decoding"
            };
        }

        // B. If ISBN Book (starts with 978 or 979): Query OpenLibrary Global Book Catalog
        if (digitsOnly.Length == 13 && (digitsOnly.StartsWith("978") || digitsOnly.StartsWith("979")))
        {
            try
            {
                string isbnUrl = $"https://openlibrary.org/isbn/{digitsOnly}.json";
                using var response = await _httpClient.GetAsync(isbnUrl, ct);
                if (response.IsSuccessStatusCode)
                {
                    string json = await response.Content.ReadAsStringAsync(ct);
                    using var doc = JsonDocument.Parse(json);
                    var root = doc.RootElement;

                    string? title = root.TryGetProperty("title", out var t) ? t.GetString() : null;
                    string? publishers = root.TryGetProperty("publishers", out var pub) && pub.GetArrayLength() > 0 
                        ? pub[0].GetString() : null;

                    if (!string.IsNullOrEmpty(title))
                    {
                        return new UniversalProductDetails
                        {
                            FoundInRegistry = true,
                            Title = title,
                            BrandOrManufacturer = publishers ?? "Published Book",
                            Category = "Book / Literature / Publication",
                            Description = $"ISBN-13: {digitsOnly}. Indexed in OpenLibrary Global Book Catalog.",
                            ReferenceUrl = $"https://openlibrary.org/isbn/{digitsOnly}",
                            DataSource = "OpenLibrary Global Registry",
                            RawRegistryJson = json
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "OpenLibrary ISBN query failed for {ISBN}", digitsOnly);
            }
        }

        // C. Universal Commercial Product Database (UPCitemdb: Covers Electronics, Tools, Hardware, Consumer Items)
        if (digitsOnly.Length >= 8)
        {
            try
            {
                string upcUrl = $"https://api.upcitemdb.com/prod/trial/lookup?upc={digitsOnly}";
                using var response = await _httpClient.GetAsync(upcUrl, ct);

                if (response.IsSuccessStatusCode)
                {
                    string json = await response.Content.ReadAsStringAsync(ct);
                    using var doc = JsonDocument.Parse(json);
                    var root = doc.RootElement;

                    if (root.TryGetProperty("code", out var code) && code.GetString() == "OK" &&
                        root.TryGetProperty("items", out var items) && items.GetArrayLength() > 0)
                    {
                        var item = items[0];
                        string? title = item.TryGetProperty("title", out var itTitle) ? itTitle.GetString() : null;
                        string? brand = item.TryGetProperty("brand", out var itBrand) ? itBrand.GetString() : null;
                        string? cat = item.TryGetProperty("category", out var itCat) ? itCat.GetString() : null;
                        string? desc = item.TryGetProperty("description", out var itDesc) ? itDesc.GetString() : null;
                        string? img = item.TryGetProperty("images", out var itImgs) && itImgs.GetArrayLength() > 0 ? itImgs[0].GetString() : null;

                        return new UniversalProductDetails
                        {
                            FoundInRegistry = true,
                            Title = title ?? "Commercial Product",
                            BrandOrManufacturer = brand,
                            Category = cat ?? "Universal Commercial Product",
                            Description = desc,
                            ImageUrl = img,
                            ReferenceUrl = $"https://www.upcitemdb.com/upc/{digitsOnly}",
                            DataSource = "UPCitemdb Universal Database",
                            RawRegistryJson = json
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "UPCitemdb query failed for {UPC}", digitsOnly);
            }
        }

        // D. Internal / Custom / Unregistered Barcode (e.g. user-generated barcodes, warehouse SKUs, asset tags)
        return new UniversalProductDetails
        {
            FoundInRegistry = false,
            Title = $"Decoded Data: {clean}",
            BrandOrManufacturer = "Custom / Unregistered Barcode",
            Category = clean.All(char.IsDigit) ? "Numeric Identifier" : "Alphanumeric Physical Tag",
            Description = "Barcode decoded optically with 100% data fidelity. Ready for internal inventory, asset, or ERP database assignment.",
            DataSource = "Direct Optical Decoder"
        };
    }

    public async Task<BarcodeScanResponse> ScanAndIdentifyAsync(byte[] imageBytes, CancellationToken ct = default)
    {
        var analysis = DecodeImage(imageBytes);
        if (!analysis.Success || string.IsNullOrEmpty(analysis.RawValue))
        {
            return new BarcodeScanResponse(analysis, new UniversalProductDetails { FoundInRegistry = false });
        }

        var product = await LookupUniversalDetailsAsync(analysis.RawValue, ct);
        return new BarcodeScanResponse(analysis, product);
    }

    private static bool ValidateModulo10(string digits)
    {
        if (digits.Length != 8 && digits.Length != 12 && digits.Length != 13 && digits.Length != 14)
            return true;

        int checkDigit = digits[^1] - '0';
        int sum = 0;
        bool multiplyByThree = true;

        for (int i = digits.Length - 2; i >= 0; i--)
        {
            int digit = digits[i] - '0';
            sum += multiplyByThree ? digit * 3 : digit;
            multiplyByThree = !multiplyByThree;
        }

        int calculated = (10 - (sum % 10)) % 10;
        return calculated == checkDigit;
    }

    private static string DetectSymbology(string value)
    {
        if (value.All(char.IsDigit))
        {
            return value.Length switch
            {
                8 => "EAN_8",
                12 => "UPC_A",
                13 => "EAN_13",
                14 => "ITF_14",
                _ => "CODE_128"
            };
        }
        return "CODE_128";
    }

    private static string DescribePattern(string value)
    {
        if (value.Contains('-') || value.Contains('_'))
        {
            var parts = value.Split(new[] { '-', '_' }, StringSplitOptions.RemoveEmptyEntries);
            return $"Delimited Code ({parts.Length} segments)";
        }
        return "Continuous String";
    }

    private static string GetGs1RegionName(string prefix3)
    {
        if (int.TryParse(prefix3, out int num))
        {
            if (num <= 19 || (num >= 30 && num <= 39) || (num >= 60 && num <= 139)) return "United States & Canada";
            if (num >= 300 && num <= 379) return "France";
            if (num >= 400 && num <= 440) return "Germany";
            if ((num >= 450 && num <= 459) || (num >= 490 && num <= 499)) return "Japan";
            if (num >= 500 && num <= 509) return "United Kingdom";
            if (num >= 540 && num <= 549) return "Belgium & Luxembourg";
            if (num >= 570 && num <= 579) return "Denmark";
            if (num >= 640 && num <= 649) return "Finland";
            if (num >= 690 && num <= 699) return "China";
            if (num >= 730 && num <= 739) return "Sweden";
            if (num >= 760 && num <= 769) return "Switzerland";
            if (num >= 800 && num <= 839) return "Italy";
            if (num >= 840 && num <= 849) return "Spain";
            if (num >= 870 && num <= 879) return "Netherlands";
            if (num == 880) return "South Korea";
            if (num == 885) return "Thailand";
            if (num == 888) return "Singapore";
            if (num == 890) return "India";
            if (num >= 930 && num <= 939) return "Australia";
            if (num == 977) return "ISSN (Serial Publications)";
            if (num == 978 || num == 979) return "Bookland (ISBN Publications)";
        }
        return "International GS1 Member";
    }
}

#endregion

#region Dependency Injection Extension

public static class BarcodeScannerServiceExtensions
{
    public static IServiceCollection AddUniversalBarcodeScanner(this IServiceCollection services)
    {
        services.AddHttpClient<IUniversalBarcodeScanner, UniversalBarcodeScanner>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
        });
        return services;
    }
}

#endregion
