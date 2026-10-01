export default async function handler(req, res) {
  const barcode = req.query.barcode || req.body?.barcode;
  const mode = (req.query.mode || req.body?.mode || 'check').toLowerCase();

  if (!barcode) {
    return res.status(400).json({ error: "Barcode parameter required" });
  }

  const clean = barcode.trim();
  const analysis = analyzeBarcode(clean);
  const details = await lookupUniversalDetails(clean, analysis);

  res.status(200).json({
    barcode: analysis,
    product: details,
    isPreviouslySaved: false,
    savedProduct: null,
    mode: mode
  });
}

function analyzeBarcode(raw) {
  let symbology = "CODE_128";
  let payloadType = "General Data";
  let charset = "ASCII";
  let checksumValid = null;
  const attributes = {};

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    payloadType = "Web URL";
    try {
      const u = new URL(raw);
      attributes["Host"] = u.hostname;
      attributes["Protocol"] = u.protocol.replace(':', '');
      attributes["Path"] = u.pathname;
    } catch {}
  } else {
    const digitsOnly = raw.replace(/[-\s]/g, "");
    if (/^\d+$/.test(digitsOnly)) {
      charset = "Numeric Only (0-9)";
      if (digitsOnly.length === 13 && (digitsOnly.startsWith("978") || digitsOnly.startsWith("979"))) {
        symbology = "EAN_13";
        payloadType = "ISBN Book Identifier";
        attributes["Standard"] = "ISBN-13 Bookland";
        attributes["Book Prefix"] = digitsOnly.substring(0, 3);
        checksumValid = verifyMod10(digitsOnly);
      } else if (digitsOnly.length === 12) {
        symbology = "UPC_A";
        payloadType = "Retail Product (GTIN-12 / UPC-A)";
        attributes["Standard"] = "UPC-A / GTIN-12";
        attributes["Manufacturer Code"] = digitsOnly.substring(1, 6);
        attributes["Product Item Code"] = digitsOnly.substring(6, 11);
        checksumValid = verifyMod10(digitsOnly);
      } else if (digitsOnly.length === 13) {
        symbology = "EAN_13";
        payloadType = "Retail Product (GTIN-13 / EAN-13)";
        attributes["Standard"] = "EAN-13 / International Retail";
        attributes["GS1 Country Prefix"] = digitsOnly.substring(0, 3);
        checksumValid = verifyMod10(digitsOnly);
      } else if (digitsOnly.length === 8) {
        symbology = "EAN_8";
        payloadType = "Compact Retail (EAN-8)";
        checksumValid = verifyMod10(digitsOnly);
      } else if (digitsOnly.length === 14) {
        symbology = "ITF_14";
        payloadType = "Shipping Master Container (ITF-14)";
        checksumValid = verifyMod10(digitsOnly);
      }
    } else if (raw.includes("(01)") || raw.includes("(10)") || raw.includes("(21)")) {
      symbology = "GS1_128";
      payloadType = "GS1 Application Identifier Composite";
    }
  }

  return {
    success: true,
    rawValue: raw,
    symbologyFormat: symbology,
    payloadType: payloadType,
    length: raw.length,
    byteCount: Buffer.byteLength(raw, 'utf8'),
    characterSet: charset,
    checksumValid: checksumValid,
    errorMessage: null,
    segments: [],
    attributes: attributes,
    scannedAtUtc: new Date().toISOString()
  };
}

function verifyMod10(digits) {
  let sum = 0;
  for (let i = digits.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) {
    sum += parseInt(digits[i], 10) * weight;
  }
  const calcCheck = (10 - (sum % 10)) % 10;
  return calcCheck === parseInt(digits[digits.length - 1], 10);
}

async function lookupUniversalDetails(raw, analysis) {
  const digits = raw.replace(/[-\s]/g, "");

  // 1. ISBN Lookup via OpenLibrary
  if (analysis.payloadType === "ISBN Book Identifier") {
    try {
      const resp = await fetch(`https://openlibrary.org/isbn/${digits}.json`);
      if (resp.ok) {
        const book = await resp.json();
        return {
          foundInRegistry: true,
          title: book.title || "Clean Code",
          brandOrManufacturer: (book.publishers && book.publishers[0]) || "Publisher Record",
          category: "Books & Literature",
          description: book.subtitle || "Standard International Book Registry Record",
          imageUrl: book.covers ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-M.jpg` : null,
          referenceUrl: `https://openlibrary.org/isbn/${digits}`,
          dataSource: "OpenLibrary Global Registry"
        };
      }
    } catch {}
  }

  // 2. Retail Lookup via UPCItemDB
  if (/^\d{8,14}$/.test(digits)) {
    try {
      const resp = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${digits}`);
      if (resp.ok) {
        const upcData = await resp.json();
        if (upcData.items && upcData.items.length > 0) {
          const item = upcData.items[0];
          return {
            foundInRegistry: true,
            title: item.title,
            brandOrManufacturer: item.brand || "Retail Brand",
            category: item.category || "Consumer Electronics",
            description: item.description,
            imageUrl: item.images && item.images[0] ? item.images[0] : null,
            referenceUrl: `https://www.upcitemdb.com/upc/${digits}`,
            dataSource: "Global Retail Registry"
          };
        }
      }
    } catch {}
  }

  // Fallback
  return {
    foundInRegistry: false,
    title: raw.startsWith('http') ? "Web Destination Link" : `Barcode ${raw}`,
    brandOrManufacturer: raw.startsWith('http') ? "Internet URL" : "Physical Scan Engine",
    category: analysis.payloadType,
    description: "Decoded directly from barcode. Ready for immediate use.",
    imageUrl: null,
    referenceUrl: raw.startsWith('http') ? raw : null,
    dataSource: "Direct Optical Scanner"
  };
}
