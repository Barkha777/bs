using System;
using System.Collections.Generic;

namespace BarcodeScannerApp.Models;

/// <summary>
/// Represents a product saved in the persistent inventory catalog.
/// </summary>
public class SavedProduct
{
    public string Barcode { get; set; } = string.Empty;
    public string SymbologyFormat { get; set; } = "UNKNOWN";
    public string Title { get; set; } = string.Empty;
    public string BrandOrManufacturer { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string PayloadType { get; set; } = "General Data";
    public int Quantity { get; set; } = 1;
    public decimal? Price { get; set; }
    public string Status { get; set; } = "Available"; // "Available", "Low Stock", "Out of Stock"
    public string? Notes { get; set; }
    public DateTime FirstScannedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime LastScannedAtUtc { get; set; } = DateTime.UtcNow;
    public int ScanCount { get; set; } = 1;
    public Dictionary<string, string> Attributes { get; set; } = new();
}

public class AvailabilityResponse
{
    public bool IsAvailable { get; set; }
    public string Message { get; set; } = string.Empty;
    public SavedProduct? SavedProduct { get; set; }
}

public class SaveProductRequest
{
    public string Barcode { get; set; } = string.Empty;
    public string? SymbologyFormat { get; set; }
    public string? Title { get; set; }
    public string? BrandOrManufacturer { get; set; }
    public string? Category { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? PayloadType { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal? Price { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
    public Dictionary<string, string>? Attributes { get; set; }
}

public class UpdateStockRequest
{
    public int Delta { get; set; } = 1;
    public int? ExactQuantity { get; set; }
}
