/**
 * products.js – Sample Products Data Store
 *
 * Contains a hardcoded sample product catalogue for testing.
 * Realistic items for a hardware and tiles shop with HSN codes and GST rates.
 *
 * Project: Sree Vel Murugan Hardware and Tiles – Billing System
 */

const SampleProducts = [

  /* ── Tiles ───────────────────────────────────────────────────── */
  { id:  1, name: 'Ceramic Floor Tile 2×2 ft',         hsn: '6907', unit: 'Box',   rate:   850, gst: 18 },
  { id:  2, name: 'Vitrified Floor Tile 2×2 ft',       hsn: '6907', unit: 'Box',   rate:  1250, gst: 18 },
  { id:  3, name: 'Porcelain Tile 60×60 cm',            hsn: '6907', unit: 'Box',   rate:  1580, gst: 18 },
  { id:  4, name: 'Wall Tile 12×18 inch',               hsn: '6908', unit: 'Box',   rate:   620, gst: 18 },
  { id:  5, name: 'Bathroom Wall Tile 12×24 inch',      hsn: '6908', unit: 'Box',   rate:   780, gst: 18 },
  { id:  6, name: 'Granite Tile 60×60 cm',              hsn: '6802', unit: 'Sqft',  rate:    95, gst: 18 },
  { id:  7, name: 'Marble Tile 60×60 cm',               hsn: '6802', unit: 'Sqft',  rate:   145, gst: 18 },
  { id:  8, name: 'Anti-Skid Outdoor Tile',             hsn: '6907', unit: 'Box',   rate:   920, gst: 18 },
  { id:  9, name: 'Mosaic Tile Sheet',                  hsn: '6908', unit: 'Piece', rate:   350, gst: 18 },
  { id: 10, name: 'Step Riser Tile 6×12 inch',          hsn: '6908', unit: 'Box',   rate:   480, gst: 18 },
  { id: 11, name: 'Designer Wall Tile (Digital Print)', hsn: '6908', unit: 'Box',   rate:  1100, gst: 18 },
  { id: 12, name: 'Swimming Pool Tile',                 hsn: '6907', unit: 'Sqft',  rate:   210, gst: 18 },

  /* ── Pipes & Fittings ───────────────────────────────────────── */
  { id: 13, name: 'PVC Pipe 1/2 inch (per metre)',      hsn: '3917', unit: 'Metre', rate:    22, gst: 18 },
  { id: 14, name: 'PVC Pipe 1 inch (per metre)',        hsn: '3917', unit: 'Metre', rate:    38, gst: 18 },
  { id: 15, name: 'CPVC Pipe 3/4 inch',                 hsn: '3917', unit: 'Metre', rate:    55, gst: 18 },
  { id: 16, name: 'GI Pipe 1 inch (per metre)',         hsn: '7306', unit: 'Metre', rate:   120, gst: 18 },
  { id: 17, name: 'PVC Elbow 1/2 inch',                 hsn: '3917', unit: 'Piece', rate:    15, gst: 18 },
  { id: 18, name: 'PVC T-Joint 1/2 inch',               hsn: '3917', unit: 'Piece', rate:    18, gst: 18 },
  { id: 19, name: 'PVC Reducer 1 to 1/2 inch',          hsn: '3917', unit: 'Piece', rate:    25, gst: 18 },
  { id: 20, name: 'Ball Valve 1/2 inch',                hsn: '8481', unit: 'Piece', rate:    95, gst: 18 },
  { id: 21, name: 'Gate Valve 3/4 inch',                hsn: '8481', unit: 'Piece', rate:   145, gst: 18 },

  /* ── Construction Materials ─────────────────────────────────── */
  { id: 22, name: 'Cement 53 Grade (50 kg bag)',        hsn: '2523', unit: 'Bag',   rate:   420, gst: 28 },
  { id: 23, name: 'White Cement (1 kg)',                 hsn: '2523', unit: 'Kg',    rate:    45, gst: 28 },
  { id: 24, name: 'River Sand (per unit)',               hsn: '2505', unit: 'Unit',  rate:  1200, gst:  5 },
  { id: 25, name: 'M-Sand (per unit)',                   hsn: '2505', unit: 'Unit',  rate:   900, gst:  5 },
  { id: 26, name: 'Tile Adhesive (20 kg)',               hsn: '3214', unit: 'Bag',   rate:   480, gst: 18 },
  { id: 27, name: 'Tile Grout White (1 kg)',             hsn: '3214', unit: 'Kg',    rate:    95, gst: 18 },
  { id: 28, name: 'Wall Putty (20 kg)',                  hsn: '3214', unit: 'Bag',   rate:   560, gst: 18 },
  { id: 29, name: 'Waterproofing Compound (5 kg)',       hsn: '3824', unit: 'Kg',    rate:   680, gst: 18 },
  { id: 30, name: 'Primer (1 litre)',                    hsn: '3210', unit: 'Litre', rate:   220, gst: 18 },
  { id: 31, name: 'Steel Wire Mesh (1×2 m)',             hsn: '7314', unit: 'Roll',  rate:   850, gst: 18 },
  { id: 32, name: 'Binding Wire (1 kg)',                 hsn: '7217', unit: 'Kg',    rate:    65, gst: 18 },
  { id: 33, name: 'Anchor Bolt M6 (pack of 50)',         hsn: '7318', unit: 'Pack',  rate:   180, gst: 18 },
  { id: 34, name: 'Epoxy Grout (1 kg)',                  hsn: '3214', unit: 'Kg',    rate:   320, gst: 18 },
  { id: 35, name: 'Silicone Sealant (300 ml)',           hsn: '3910', unit: 'Piece', rate:   195, gst: 18 },

];
