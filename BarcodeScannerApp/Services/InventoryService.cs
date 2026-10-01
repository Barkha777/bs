using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BarcodeScannerApp.Models;
using BarcodeScannerCore;
using Microsoft.Extensions.Logging;

namespace BarcodeScannerApp.Services;

public interface IInventoryService
{
    Task<IReadOnlyList<SavedProduct>> GetAllAsync();
    Task<SavedProduct?> GetByBarcodeAsync(string barcode);
    Task<AvailabilityResponse> CheckAvailabilityAsync(string barcode);
    Task<SavedProduct> SaveOrUpdateAsync(SavedProduct product);
    Task<SavedProduct?> RecordScanAsync(BarcodeScanResponse scanResult, bool autoSaveIfNew = false);
    Task<SavedProduct?> UpdateStockAsync(string barcode, int delta, int? exactQuantity = null);
    Task<bool> DeleteAsync(string barcode);
}

public class FileInventoryService : IInventoryService
{
    private readonly string _storageFilePath;
    private readonly ILogger<FileInventoryService> _logger;
    private readonly ConcurrentDictionary<string, SavedProduct> _products = new(StringComparer.OrdinalIgnoreCase);
    private readonly SemaphoreSlim _fileLock = new(1, 1);
    private static readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };

    public FileInventoryService(ILogger<FileInventoryService> logger)
    {
        _logger = logger;
        _storageFilePath = Path.Combine(AppContext.BaseDirectory, "saved_products.json");
        LoadFromDisk();
    }

    private void LoadFromDisk()
    {
        try
        {
            if (File.Exists(_storageFilePath))
            {
                var json = File.ReadAllText(_storageFilePath);
                var items = JsonSerializer.Deserialize<List<SavedProduct>>(json);
                if (items != null)
                {
                    foreach (var item in items)
                    {
                        if (!string.IsNullOrWhiteSpace(item.Barcode))
                        {
                            _products[item.Barcode.Trim()] = item;
                        }
                    }
                }
                _logger.LogInformation("Loaded {Count} saved products from {Path}", _products.Count, _storageFilePath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load saved products from disk");
        }
    }

    private async Task PersistToDiskAsync()
    {
        await _fileLock.WaitAsync();
        try
        {
            var list = _products.Values.OrderByDescending(p => p.LastScannedAtUtc).ToList();
            var json = JsonSerializer.Serialize(list, _jsonOptions);
            await File.WriteAllTextAsync(_storageFilePath, json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist saved products to disk");
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public Task<IReadOnlyList<SavedProduct>> GetAllAsync()
    {
        var list = _products.Values.OrderByDescending(p => p.LastScannedAtUtc).ToList();
        return Task.FromResult<IReadOnlyList<SavedProduct>>(list);
    }

    public Task<SavedProduct?> GetByBarcodeAsync(string barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode)) return Task.FromResult<SavedProduct?>(null);
        _products.TryGetValue(barcode.Trim(), out var product);
        return Task.FromResult(product);
    }

    public Task<AvailabilityResponse> CheckAvailabilityAsync(string barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode))
        {
            return Task.FromResult(new AvailabilityResponse
            {
                IsAvailable = false,
                Message = "Barcode cannot be empty."
            });
        }

        if (_products.TryGetValue(barcode.Trim(), out var product))
        {
            bool inStock = product.Quantity > 0;
            return Task.FromResult(new AvailabilityResponse
            {
                IsAvailable = inStock,
                Message = inStock 
                    ? $"Product is available in inventory ({product.Quantity} in stock)."
                    : "Product is registered in inventory but currently out of stock (0 quantity).",
                SavedProduct = product
            });
        }

        return Task.FromResult(new AvailabilityResponse
        {
            IsAvailable = false,
            Message = "Product is not available in saved inventory.",
            SavedProduct = null
        });
    }

    public async Task<SavedProduct> SaveOrUpdateAsync(SavedProduct product)
    {
        if (string.IsNullOrWhiteSpace(product.Barcode))
            throw new ArgumentException("Barcode cannot be empty", nameof(product));

        string key = product.Barcode.Trim();
        var now = DateTime.UtcNow;

        if (_products.TryGetValue(key, out var existing))
        {
            // Update existing
            existing.Title = !string.IsNullOrWhiteSpace(product.Title) ? product.Title : existing.Title;
            existing.BrandOrManufacturer = !string.IsNullOrWhiteSpace(product.BrandOrManufacturer) ? product.BrandOrManufacturer : existing.BrandOrManufacturer;
            existing.Category = !string.IsNullOrWhiteSpace(product.Category) ? product.Category : existing.Category;
            existing.Description = !string.IsNullOrWhiteSpace(product.Description) ? product.Description : existing.Description;
            existing.ImageUrl = !string.IsNullOrWhiteSpace(product.ImageUrl) ? product.ImageUrl : existing.ImageUrl;
            existing.PayloadType = !string.IsNullOrWhiteSpace(product.PayloadType) ? product.PayloadType : existing.PayloadType;
            existing.SymbologyFormat = !string.IsNullOrWhiteSpace(product.SymbologyFormat) && product.SymbologyFormat != "UNKNOWN" ? product.SymbologyFormat : existing.SymbologyFormat;
            existing.Quantity = product.Quantity;
            existing.Price = product.Price ?? existing.Price;
            existing.Notes = product.Notes ?? existing.Notes;
            existing.Status = product.Quantity <= 0 ? "Out of Stock" : (product.Status ?? "Available");
            existing.LastScannedAtUtc = now;
            if (product.Attributes != null && product.Attributes.Count > 0)
            {
                foreach (var (k, v) in product.Attributes)
                {
                    existing.Attributes[k] = v;
                }
            }

            await PersistToDiskAsync();
            return existing;
        }

        // New product
        product.Barcode = key;
        product.FirstScannedAtUtc = now;
        product.LastScannedAtUtc = now;
        product.ScanCount = 1;
        product.Status = product.Quantity <= 0 ? "Out of Stock" : (string.IsNullOrWhiteSpace(product.Status) ? "Available" : product.Status);

        _products[key] = product;
        await PersistToDiskAsync();
        return product;
    }

    public async Task<SavedProduct?> RecordScanAsync(BarcodeScanResponse scanResult, bool autoSaveIfNew = false)
    {
        if (scanResult?.Barcode?.Success != true || string.IsNullOrWhiteSpace(scanResult.Barcode.RawValue))
        {
            return null;
        }

        string key = scanResult.Barcode.RawValue.Trim();
        var now = DateTime.UtcNow;

        if (_products.TryGetValue(key, out var existing))
        {
            // Already scanned first! Increment scan count and update last scanned time
            existing.ScanCount++;
            existing.LastScannedAtUtc = now;

            // Update format if better known
            if (existing.SymbologyFormat == "UNKNOWN" && !string.IsNullOrWhiteSpace(scanResult.Barcode.SymbologyFormat))
            {
                existing.SymbologyFormat = scanResult.Barcode.SymbologyFormat;
            }

            await PersistToDiskAsync();
            return existing;
        }

        if (autoSaveIfNew)
        {
            // Brand new product scan, auto-save with extracted details
            var newProd = new SavedProduct
            {
                Barcode = key,
                SymbologyFormat = scanResult.Barcode.SymbologyFormat,
                PayloadType = scanResult.Barcode.PayloadType,
                Title = !string.IsNullOrWhiteSpace(scanResult.Product?.Title) 
                    ? scanResult.Product.Title 
                    : $"Product {key}",
                BrandOrManufacturer = scanResult.Product?.BrandOrManufacturer ?? "General",
                Category = scanResult.Product?.Category ?? scanResult.Barcode.PayloadType,
                Description = scanResult.Product?.Description ?? "Auto-registered on first physical barcode scan.",
                ImageUrl = scanResult.Product?.ImageUrl,
                Quantity = 1,
                Status = "Available",
                FirstScannedAtUtc = now,
                LastScannedAtUtc = now,
                ScanCount = 1,
                Attributes = new Dictionary<string, string>(scanResult.Barcode.Attributes ?? new Dictionary<string, string>())
            };

            _products[key] = newProd;
            await PersistToDiskAsync();
            return newProd;
        }

        return null;
    }

    public async Task<SavedProduct?> UpdateStockAsync(string barcode, int delta, int? exactQuantity = null)
    {
        if (string.IsNullOrWhiteSpace(barcode)) return null;
        string key = barcode.Trim();

        if (_products.TryGetValue(key, out var existing))
        {
            if (exactQuantity.HasValue)
            {
                existing.Quantity = Math.Max(0, exactQuantity.Value);
            }
            else
            {
                existing.Quantity = Math.Max(0, existing.Quantity + delta);
            }

            existing.Status = existing.Quantity <= 0 ? "Out of Stock" : (existing.Quantity <= 2 ? "Low Stock" : "Available");
            existing.LastScannedAtUtc = DateTime.UtcNow;

            await PersistToDiskAsync();
            return existing;
        }

        return null;
    }

    public async Task<bool> DeleteAsync(string barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode)) return false;
        string key = barcode.Trim();

        if (_products.TryRemove(key, out _))
        {
            await PersistToDiskAsync();
            return true;
        }

        return false;
    }
}
