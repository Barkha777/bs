export default function handler(req, res) {
  res.status(200).json([
    { 
      barcode: "https://github.com/Barkha777", 
      name: "GitHub User Profile URL", 
      category: "Web Address / Digital Link", 
      format: "CODE_128", 
      type: "Alphanumeric Web URL" 
    },
    { 
      barcode: "9780132350884", 
      name: "Clean Code (Book by Robert C. Martin)", 
      category: "Books & Literature", 
      format: "EAN_13", 
      type: "ISBN-13 Book Code" 
    },
    { 
      barcode: "888462062908", 
      name: "Apple Lightning to USB Cable", 
      category: "Consumer Electronics", 
      format: "UPC_A", 
      type: "Retail UPC Hardware" 
    },
    { 
      barcode: "0088381851912", 
      name: "Makita 18V Cordless Power Drill", 
      category: "Hardware & Power Tools", 
      format: "EAN_13", 
      type: "GTIN-13 Retail Hardware" 
    },
    { 
      barcode: "(01)00883818519125(10)LOT459A(17)281231(21)SN987654", 
      name: "GS1 Composite Tag (GTIN + Lot + Expiry + Serial)", 
      category: "Industrial / Manufacturing", 
      format: "GS1_128", 
      type: "GS1 Multi-Segment Code" 
    },
    { 
      barcode: "PKG-US-99482-Z7", 
      name: "Logistics Shipment Parcel SKU", 
      category: "Industrial / Warehousing", 
      format: "CODE_128", 
      type: "Inventory Serial Code" 
    }
  ]);
}
