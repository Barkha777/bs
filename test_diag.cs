using System;
using System.IO;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using ZXing;
using ZXing.Common;
using ZXing.ImageSharp;

class Program {
    static void Main() {
        string path = @"C:\Users\LOKESH\.gemini\antigravity-ide\brain\ae125e3e-7ad1-4cd9-8858-1c0f5e147cf3\.user_uploaded\media_1790749446520.png";
        using var img = Image.Load<Rgba32>(path);
        Console.WriteLine($"Image size: {img.Width}x{img.Height}");
        
        var reader = new ZXing.ImageSharp.BarcodeReader<Rgba32> {
            AutoRotate = true,
            Options = new DecodingOptions {
                TryHarder = true,
                TryInverted = true
            }
        };
        
        var res1 = reader.Decode(img);
        Console.WriteLine("Direct decode: " + (res1 != null ? $"{res1.Text} ({res1.BarcodeFormat})" : "FAILED"));

        // Test with added white quiet zone padding around image
        int pad = 40;
        using var padded = new Image<Rgba32>(img.Width + pad * 2, img.Height + pad * 2, Color.White);
        padded.Mutate(ctx => ctx.DrawImage(img, new Point(pad, pad), 1f));
        
        var res2 = reader.Decode(padded);
        Console.WriteLine("Padded decode: " + (res2 != null ? $"{res2.Text} ({res2.BarcodeFormat})" : "FAILED"));

        // Test cropping out the dark top/left border
        // Let's inspect top-left pixels
        Console.WriteLine($"Pixel(0,0): {img[0,0]}");
        Console.WriteLine($"Pixel(5,5): {img[5,5]}");
        Console.WriteLine($"Pixel({img.Width/2}, {img.Height/2}): {img[img.Width/2, img.Height/2]}");
        Console.WriteLine($"Pixel({img.Width-1}, {img.Height-1}): {img[img.Width-1, img.Height-1]}");
    }
}
