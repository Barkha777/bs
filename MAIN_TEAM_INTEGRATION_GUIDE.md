# Universal Physical Barcode Scanner & Data Extraction Engine (.NET 8 / C#)

> **Enterprise C# / .NET Solution** designed to scan physical barcodes from **any product or item** (electronics, books, warehouse parcels, hardware, tools, web URLs, retail goods) and extract the complete data contained in the barcode.

---

## 1. What This Engine Does (The Core Objective)

1. **Optical Barcode Decoding**:
   - Optically reads physical 1D & 2D barcodes (**Code-128, Code-39, Code-93, EAN-13, UPC-A, EAN-8, ITF-14, QR Code, Data Matrix**) from image files, camera frames, or byte streams.
   - Built-in **Auto-Quiet-Zone Preprocessor**: Automatically identifies barcode bounding boxes in screenshots or tight crops and injects clean white margins for a 100% optical scan rate.
2. **Barcode Data Extraction & Technical Analysis**:
   - **Decoded Content**: Extracts the exact raw text or number encoded in the barcode.
   - **Symbology Format**: Identifies the exact barcode format standard (`CODE_128`, `EAN_13`, `UPC_A`, `QR_CODE`, etc.).
   - **Payload Classification**: Identifies if the content is a **Web URL**, **ISBN Book Code**, **Standard Retail GTIN**, or an **Industrial Inventory SKU/Serial**.
   - **Checksum Verification**: Validates Modulo-10 check digits for standard retail codes.
3. **Universal Catalog Lookup (Across Any Category)**:
   - Queries global registries for title, manufacturer/brand, category, and specifications (covers electronics, books, retail packaging, tools, and consumer goods).
   - If the barcode is custom, internal, or newly made (e.g. `https://github.com/Barkha777`), it immediately provides the decoded data without requiring any pre-existing database record.

---

## 2. Quick Integration for Your Project Team

### Step 1: Install Required NuGet Packages
```bash
dotnet add package ZXing.Net
dotnet add package SixLabors.ImageSharp --version 2.1.13
dotnet add package ZXing.Net.Bindings.ImageSharp.V2
```

### Step 2: Add `BarcodeProductModule.cs` to Your Project
Copy [BarcodeProductModule.cs](file:///C:/Users/LOKESH/Downloads/bs/BarcodeProductModule.cs) into your project.

### Step 3: Register in Dependency Injection (`Program.cs`)
```csharp
using BarcodeScannerCore;

var builder = WebApplication.CreateBuilder(args); // Or MauiProgram.CreateMauiApp()

builder.Services.AddUniversalBarcodeScanner();
```

### Step 4: Use in Your Code

#### Option A: Scanning from Physical Camera / Image Bytes (.NET MAUI / WebCam)
```csharp
public class BarcodeController(IUniversalBarcodeScanner scanner)
{
    public async Task ProcessBarcodeImage(byte[] imageBytes)
    {
        // Optically decodes and extracts all data
        BarcodeScanResponse result = await scanner.ScanAndIdentifyAsync(imageBytes);

        if (result.Barcode.Success)
        {
            Console.WriteLine($"Decoded Value:    {result.Barcode.RawValue}");
            Console.WriteLine($"Symbology:        {result.Barcode.SymbologyFormat}");
            Console.WriteLine($"Payload Type:     {result.Barcode.PayloadType}");
            Console.WriteLine($"Character Length: {result.Barcode.Length}");
            
            if (result.Product.FoundInRegistry)
            {
                Console.WriteLine($"Entity Name:  {result.Product.Title}");
                Console.WriteLine($"Brand/Origin: {result.Product.BrandOrManufacturer}");
                Console.WriteLine($"Category:     {result.Product.Category}");
            }
        }
    }
}
```

#### Option B: Scanning with Physical Hardware Handheld Scanners (Zebra / Honeywell)
```csharp
public async Task OnHardwareBarcodeScanned(string barcodeString)
{
    // Scanners return string via HID Keyboard Wedge:
    BarcodeAnalysis analysis = scanner.AnalyzeBarcode(barcodeString);
    UniversalProductDetails details = await scanner.LookupUniversalDetailsAsync(barcodeString);

    Console.WriteLine($"Scanned: {analysis.RawValue} ({analysis.SymbologyFormat})");
}
```

---

## 3. Test Cases (Proving Universal Recognition)

| Test Barcode | Type / Category | Decoded Content | Data Identified |
| :--- | :--- | :--- | :--- |
| `https://github.com/Barkha777` | Custom Web URL | `https://github.com/Barkha777` | Code-128, Web URL, Host: `github.com` |
| `9780132350884` | Books & Publications | `9780132350884` | EAN-13, ISBN-13, Title: *Clean Code*, Prentice Hall |
| `888462062908` | Consumer Electronics | `888462062908` | UPC-A, Retail GTIN-12, Apple Lightning Cable |
| `PKG-US-99482-Z7` | Industrial / Logistics | `PKG-US-99482-Z7` | Code-128, Alphanumeric Inventory Asset SKU |
| `737628064502` | Packaged Retail Item | `737628064502` | UPC-A, Retail GTIN-12, Checksum: Valid |

---

## 4. Running the Web Demonstration
```powershell
cd C:\Users\LOKESH\Downloads\bs\BarcodeScannerApp
dotnet run
```
Open **`http://localhost:5000`** in your browser to test live camera scanning, image upload, direct input, and barcode generation.
