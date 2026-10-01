using System;
using System.Collections.Generic;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using ZXing;
using ZXing.Common;
using ZXing.ImageSharp;

class Program
{
    static void Main()
    {
        string path = @"C:\Users\LOKESH\.gemini\antigravity-ide\brain\ae125e3e-7ad1-4cd9-8858-1c0f5e147cf3\.user_uploaded\media_1790749446520.png";
        using var img = Image.Load<Rgba32>(path);
        Console.WriteLine($"Image size: {img.Width}x{img.Height}");

        // Find the bounding box of the white barcode area
        int minX = img.Width, maxX = 0;
        int minY = img.Height, maxY = 0;

        for (int y = 0; y < img.Height; y++)
        {
            for (int x = 0; x < img.Width; x++)
            {
                var p = img[x, y];
                // Check if this pixel is the white background of the barcode
                if (p.R > 200 && p.G > 200 && p.B > 200)
                {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        Console.WriteLine($"White Barcode Bounding Box: X=[{minX}..{maxX}] (width: {maxX - minX + 1}), Y=[{minY}..{maxY}] (height: {maxY - minY + 1})");

        int cropW = maxX - minX + 1;
        int cropH = maxY - minY + 1;

        using var cropped = img.Clone(ctx => ctx.Crop(new Rectangle(minX, minY, cropW, cropH)));

        // Add proper white quiet zone (margin) on left, right, top, bottom
        int padX = 60;
        int padY = 30;
        using var cleanBarcode = new Image<Rgba32>(cropW + padX * 2, cropH + padY * 2, Color.White);
        cleanBarcode.Mutate(ctx => ctx.DrawImage(cropped, new Point(padX, padY), 1f));

        cleanBarcode.SaveAsPng("clean_user_barcode.png");
        Console.WriteLine("Saved clean_user_barcode.png");

        var reader = new ZXing.ImageSharp.BarcodeReader<Rgba32>
        {
            AutoRotate = true,
            Options = new DecodingOptions
            {
                TryHarder = true,
                PossibleFormats = new List<BarcodeFormat>
                {
                    BarcodeFormat.CODE_128,
                    BarcodeFormat.CODE_39,
                    BarcodeFormat.CODE_93,
                    BarcodeFormat.EAN_13,
                    BarcodeFormat.EAN_8,
                    BarcodeFormat.UPC_A,
                    BarcodeFormat.UPC_E,
                    BarcodeFormat.ITF,
                    BarcodeFormat.CODABAR,
                    BarcodeFormat.DATA_MATRIX,
                    BarcodeFormat.QR_CODE
                }
            }
        };

        var result = reader.Decode(cleanBarcode);
        if (result != null)
        {
            Console.WriteLine($"SUCCESSFULLY DECODED!");
            Console.WriteLine($"Barcode Value:  '{result.Text}'");
            Console.WriteLine($"Barcode Format: {result.BarcodeFormat}");
        }
        else
        {
            Console.WriteLine("Still could not decode with default settings, testing binarization...");
            
            // Try binarizing to pure black and white
            using var binarized = cleanBarcode.Clone(ctx => ctx.BinaryThreshold(0.5f));
            binarized.SaveAsPng("binarized.png");
            var resBin = reader.Decode(binarized);
            if (resBin != null)
            {
                Console.WriteLine($"SUCCESS AFTER BINARIZATION!");
                Console.WriteLine($"Barcode Value:  '{resBin.Text}'");
                Console.WriteLine($"Barcode Format: {resBin.BarcodeFormat}");
            }
            else
            {
                Console.WriteLine("Decoding failed.");
            }
        }
    }
}
