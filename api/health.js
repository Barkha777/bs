export default function handler(req, res) {
  res.status(200).json({
    status: "Active",
    engine: "Universal Barcode Scanner (Vercel Serverless / Edge)",
    runtime: "Vercel / Node.js 20+",
    scope: "Any Physical Product / 1D & 2D Barcodes",
    timestampUtc: new Date().toISOString()
  });
}
