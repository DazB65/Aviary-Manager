import PDFDocument from "pdfkit";
import { PedigreeService } from "./services/pedigreeService";

type PedigreeBird = {
  id: number;
  name: string | null;
  ringId: string | null;
  gender: string;
  colorMutation: string | null;
  photoUrl: string | null;
  speciesId: number;
  fatherId: number | null;
  motherId: number | null;
};

export type FullBird = {
  id: number;
  name: string | null;
  ringId: string | null;
  gender: string;
  colorMutation: string | null;
  speciesId: number | null;
  dateOfBirth: Date | string | null;
  fledgedDate: Date | string | null;
  cageNumber: string | null;
  status: string | null;
  notes: string | null;
};

type Doc = InstanceType<typeof PDFDocument>;
type PedigreeMap = Record<number, PedigreeBird>;
type SpeciesMap = Record<number, { commonName: string }>;

// ── Colour palette ──────────────────────────────────────────────────────────
const C = {
  primary:      "#0d9488", // teal-600
  primaryDark:  "#0f766e", // teal-700
  primaryLight: "#ccfbf1", // teal-100
  secondary:    "#f59e0b", // amber-500
  male:         "#3b82f6", // blue-500
  maleBg:       "#dbeafe", // blue-100
  female:       "#f43f5e", // rose-500
  femaleBg:     "#ffe4e6", // rose-100
  unknown:      "#94a3b8", // slate-400
  unknownBg:    "#f1f5f9", // slate-100
  cardBg:       "#f8fafc", // slate-50
  border:       "#e2e8f0", // slate-200
  text:         "#1e293b", // slate-900
  muted:        "#64748b", // slate-500
  white:        "#ffffff",
  light:        "#f1f5f9", // slate-100
};

// A4 portrait: 595.28 × 841.89  |  A4 landscape: 841.89 × 595.28
const A4_W  = 595.28;
const A4_H  = 841.89;
const A4L_W = 841.89;
const A4L_H = 595.28;

function gc(gender: string)   { return gender === "male" ? C.male   : gender === "female" ? C.female   : C.unknown;    }
function gcBg(gender: string) { return gender === "male" ? C.maleBg : gender === "female" ? C.femaleBg : C.unknownBg; }

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtStatus(s: string | null | undefined): string {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function birdLines(b: PedigreeBird | null | undefined, species?: string): string[] {
  if (!b) return ["Unknown"];
  const ls: string[] = [];
  if (b.name)         ls.push(b.name);
  if (b.ringId)       ls.push(`Ring: ${b.ringId}`);
  if (species)        ls.push(species);
  if (b.colorMutation) ls.push(b.colorMutation);
  return ls.length ? ls : [`#${b.id}`];
}

// ── Main export ─────────────────────────────────────────────────────────────
export async function generatePedigreePdf(
  birdId: number,
  userId: number,
  speciesMap: SpeciesMap,
  fullBird?: FullBird
): Promise<Buffer> {
  const pedigreeMap = await PedigreeService.getPedigree(birdId, 5) as PedigreeMap;
  const subject = pedigreeMap[birdId];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "portrait",
      margin: 0,
      info: {
        Title: `Pedigree — ${subject?.name || subject?.ringId || `Bird #${birdId}`}`,
        Author: "Aviary Manager",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawProfilePage(doc, birdId, fullBird, subject, speciesMap, pedigreeMap);

    doc.addPage({ size: "A4", layout: "landscape" });
    drawPedigreePage(doc, birdId, pedigreeMap, subject, speciesMap);

    doc.end();
  });
}

// ── Page 1: Bird Profile (Portrait) ─────────────────────────────────────────
function drawProfilePage(
  doc: Doc,
  birdId: number,
  bird: FullBird | undefined,
  subject: PedigreeBird | undefined,
  sMap: SpeciesMap,
  pMap: PedigreeMap
) {
  const M  = 40;
  const CW = A4_W - M * 2;

  const gender  = bird?.gender || subject?.gender || "unknown";
  const name    = bird?.name   || subject?.name   || subject?.ringId || `Bird #${birdId}`;
  const speciesId = bird?.speciesId ?? subject?.speciesId;
  const species   = speciesId ? sMap[speciesId]?.commonName : undefined;
  const ringId    = bird?.ringId    || subject?.ringId;
  const mutation  = bird?.colorMutation || subject?.colorMutation;
  const gColor    = gc(gender);

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.rect(0, 0, A4_W, 90).fill(C.primary);

  // Subtle diagonal stripes decoration
  doc.save();
  doc.rect(0, 0, A4_W, 90).clip();
  for (let i = 0; i < 12; i++) {
    doc.moveTo(A4_W - 260 + i * 28, 0)
       .lineTo(A4_W - 200 + i * 28, 90)
       .strokeColor(C.primaryDark).lineWidth(8).stroke();
  }
  doc.restore();

  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(22)
     .text("Aviary Manager", M, 20, { width: CW });
  doc.fillColor(C.white).font("Helvetica").fontSize(11)
     .text("Pedigree Certificate", M, 46, { width: CW });
  const today = new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" });
  doc.fillColor(C.white).font("Helvetica").fontSize(8)
     .text(today, M, 70, { width: CW, align: "right" });

  // ── Bird identity section ─────────────────────────────────────────────────
  let y = 110;

  // Gender badge
  const gSym = gender === "male" ? "♂ Male" : gender === "female" ? "♀ Female" : "? Unknown";
  doc.roundedRect(M, y, 76, 22, 11).fill(gcBg(gender));
  doc.fillColor(gColor).font("Helvetica-Bold").fontSize(9)
     .text(gSym, M, y + 6, { width: 76, align: "center" });
  y += 30;

  // Name
  doc.fillColor(C.text).font("Helvetica-Bold").fontSize(28)
     .text(name, M, y, { width: CW });
  y += 36;

  // Ring · Species · Mutation subtitle
  const parts = [
    ringId   ? `Ring: ${ringId}` : null,
    species  || null,
    mutation || null,
  ].filter(Boolean) as string[];
  if (parts.length) {
    doc.fillColor(C.muted).font("Helvetica").fontSize(12)
       .text(parts.join("  ·  "), M, y, { width: CW });
    y += 22;
  }
  y += 8;

  // ── Divider ───────────────────────────────────────────────────────────────
  doc.rect(M, y, CW, 1).fill(C.border);
  y += 16;

  // ── Details grid (2-col × 3-row) ─────────────────────────────────────────
  doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(8)
     .text("BIRD DETAILS", M, y);
  y += 14;

  const fields: [string, string][] = [
    ["Date of Birth",   fmtDate(bird?.dateOfBirth)],
    ["Fledge Date",     fmtDate(bird?.fledgedDate)],
    ["Cage / Location", bird?.cageNumber || "—"],
    ["Status",          fmtStatus(bird?.status)],
    ["Species",         species || "—"],
    ["Colour Mutation", mutation || "—"],
  ];

  const CellW = CW / 2;
  const CellH = 54;

  fields.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const fx  = M + col * CellW;
    const fy  = y + row * CellH;

    // Alternating row tint
    if (row % 2 === 0) doc.rect(fx, fy, CellW, CellH).fill(C.light);

    // Left accent on first column
    if (col === 0) doc.rect(fx, fy, 3, CellH).fill(C.primary);

    doc.fillColor(C.muted).font("Helvetica").fontSize(8)
       .text(label, fx + 14, fy + 10, { width: CellW - 20 });
    doc.fillColor(C.text).font("Helvetica-Bold").fontSize(14)
       .text(value, fx + 14, fy + 24, { width: CellW - 20 });
  });

  y += Math.ceil(fields.length / 2) * CellH + 16;

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (bird?.notes) {
    doc.rect(M, y, CW, 1).fill(C.border);
    y += 14;
    doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(8)
       .text("NOTES", M, y);
    y += 12;
    const noteH = Math.min(100, Math.max(44, bird.notes.length / 3));
    doc.roundedRect(M, y, CW, noteH, 4).fill(C.light);
    doc.rect(M, y, 3, noteH).fill(C.secondary);
    doc.fillColor(C.text).font("Helvetica").fontSize(10)
       .text(bird.notes, M + 14, y + 10, { width: CW - 24, height: noteH - 16 });
    y += noteH + 14;
  }

  // ── Ancestry info box ─────────────────────────────────────────────────────
  doc.rect(M, y, CW, 1).fill(C.border);
  y += 14;
  const ancestorCount = Math.max(0, Object.keys(pMap).length - 1);
  doc.roundedRect(M, y, CW, 48, 5).fill(C.primaryLight);
  doc.rect(M, y, 4, 48).fill(C.primary);
  doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(11)
     .text("Pedigree tree on next page", M + 16, y + 9, { width: CW - 24 });
  doc.fillColor(C.primary).font("Helvetica").fontSize(9)
     .text(
       ancestorCount > 0
         ? `${ancestorCount} ancestor${ancestorCount !== 1 ? "s" : ""} recorded across up to 5 generations`
         : "No ancestors recorded",
       M + 16, y + 27, { width: CW - 24 }
     );

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.rect(0, A4_H - 32, A4_W, 32).fill(C.light);
  doc.fillColor(C.muted).font("Helvetica").fontSize(7.5)
     .text("aviarymanager.app", M, A4_H - 18, { width: CW, align: "center" });
}

// ── Page 2: Pedigree Tree (Landscape) ────────────────────────────────────────
function drawPedigreePage(
  doc: Doc,
  birdId: number,
  pMap: PedigreeMap,
  subject: PedigreeBird | undefined,
  sMap: SpeciesMap
) {
  const M = 30;
  const subName    = subject?.name || subject?.ringId || `Bird #${birdId}`;
  const subSpecies = subject?.speciesId ? sMap[subject.speciesId]?.commonName : undefined;

  // ── Header ────────────────────────────────────────────────────────────────
  doc.rect(0, 0, A4L_W, 56).fill(C.primary);

  // Stripe decoration
  doc.save();
  doc.rect(0, 0, A4L_W, 56).clip();
  for (let i = 0; i < 10; i++) {
    doc.moveTo(A4L_W - 200 + i * 28, 0)
       .lineTo(A4L_W - 144 + i * 28, 56)
       .strokeColor(C.primaryDark).lineWidth(8).stroke();
  }
  doc.restore();

  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(17)
     .text("Pedigree Tree", M, 13, { width: A4L_W - M * 2 });
  doc.fillColor(C.white).font("Helvetica").fontSize(10)
     .text(`${subName}${subSpecies ? `  ·  ${subSpecies}` : ""}`, M, 35, { width: A4L_W - M * 2 });

  // ── Generation column headers ─────────────────────────────────────────────
  const CTOP = 70;
  const CH   = A4L_H - CTOP - 36;
  const GENS = 5;
  const COL_W = (A4L_W - M * 2) / GENS;

  const genLabels = ["Subject", "Parents", "Grandparents", "Great-grandparents", "Gg-grandparents"];
  for (let g = 0; g < GENS; g++) {
    const hx = M + g * COL_W + 2;
    doc.rect(hx, CTOP - 17, COL_W - 4, 13)
       .fill(g === 0 ? C.primary : C.light);
    doc.fillColor(g === 0 ? C.white : C.muted)
       .font("Helvetica-Bold").fontSize(6.5)
       .text(genLabels[g], hx, CTOP - 16, { width: COL_W - 4, align: "center" });
  }

  // ── Card helper ───────────────────────────────────────────────────────────
  const CARD_W = COL_W - 12;
  const CARD_H = 48;
  const CARD_R = 4;

  function card(b: PedigreeBird | null | undefined, x: number, y: number, species?: string) {
    if (!b) {
      doc.roundedRect(x, y, CARD_W, CARD_H, CARD_R)
         .strokeColor(C.border).lineWidth(0.5).stroke();
      doc.fillColor(C.border).font("Helvetica").fontSize(7)
         .text("—", x, y + CARD_H / 2 - 4, { width: CARD_W, align: "center" });
      return;
    }

    const g = gc(b.gender);

    // Background + left accent + border
    doc.roundedRect(x, y, CARD_W, CARD_H, CARD_R).fill(C.cardBg);
    doc.rect(x, y + CARD_R, 3.5, CARD_H - CARD_R * 2).fill(g);
    doc.roundedRect(x, y, CARD_W, CARD_H, CARD_R)
       .strokeColor(g).lineWidth(0.8).stroke();

    // Gender symbol
    const sym = b.gender === "male" ? "♂" : b.gender === "female" ? "♀" : "?";
    doc.fillColor(g).font("Helvetica-Bold").fontSize(9).text(sym, x + 7, y + 5);

    // Text lines
    const ls = birdLines(b, species);
    const tx = x + 18;
    const tw = CARD_W - 22;
    doc.fillColor(C.text).font("Helvetica-Bold").fontSize(7.5)
       .text(ls[0] ?? "", tx, y + 5, { width: tw, lineBreak: false });
    if (ls[1]) doc.fillColor(C.muted).font("Helvetica").fontSize(6.5)
       .text(ls[1], tx, y + 16, { width: tw, lineBreak: false });
    if (ls[2]) doc.fillColor(C.muted).font("Helvetica").fontSize(6)
       .text(ls[2], tx, y + 26, { width: tw, lineBreak: false });
    if (ls[3]) doc.fillColor(C.secondary).font("Helvetica").fontSize(6)
       .text(ls[3], tx, y + 35, { width: tw, lineBreak: false });
  }

  // ── Recursive tree ────────────────────────────────────────────────────────
  function draw(bid: number | null | undefined, gen: number, slot: number) {
    if (gen >= GENS) return;

    const slots  = Math.pow(2, gen);
    const slotH  = CH / slots;
    const x      = M + gen * COL_W + 6;
    const y      = CTOP + slot * slotH + (slotH - CARD_H) / 2;
    const b      = bid ? pMap[bid] : null;
    const sp     = b ? sMap[b.speciesId]?.commonName : undefined;

    card(b, x, y, sp);

    // Connector lines to next generation
    if (gen < GENS - 1 && b) {
      const nextSlotH = CH / (slots * 2);
      const fY  = CTOP + slot * 2       * nextSlotH + (nextSlotH - CARD_H) / 2 + CARD_H / 2;
      const mY  = CTOP + (slot * 2 + 1) * nextSlotH + (nextSlotH - CARD_H) / 2 + CARD_H / 2;
      const rx  = x + CARD_W;
      const nx  = M + (gen + 1) * COL_W + 6;
      const cy  = y + CARD_H / 2;
      const bx  = (rx + nx) / 2;   // branch midpoint

      doc.moveTo(rx, cy).lineTo(bx, cy).lineTo(bx, fY).lineTo(nx, fY)
         .strokeColor(C.border).lineWidth(0.6).stroke();
      doc.moveTo(bx, cy).lineTo(bx, mY).lineTo(nx, mY)
         .strokeColor(C.border).lineWidth(0.6).stroke();
    }

    if (b) {
      draw(b.fatherId, gen + 1, slot * 2);
      draw(b.motherId, gen + 1, slot * 2 + 1);
    } else {
      draw(null, gen + 1, slot * 2);
      draw(null, gen + 1, slot * 2 + 1);
    }
  }

  draw(birdId, 0, 0);

  // ── Legend ────────────────────────────────────────────────────────────────
  const lx = M;
  const ly = A4L_H - 26;
  doc.fillColor(C.male).font("Helvetica-Bold").fontSize(7).text("♂", lx, ly);
  doc.fillColor(C.muted).font("Helvetica").fontSize(7).text(" Male  ", lx + 8, ly);
  doc.fillColor(C.female).font("Helvetica-Bold").fontSize(7).text("♀", lx + 45, ly);
  doc.fillColor(C.muted).font("Helvetica").fontSize(7).text(" Female", lx + 53, ly);

  // ── Footer ────────────────────────────────────────────────────────────────
  const fy = A4L_H - 28;
  doc.rect(0, fy, A4L_W, 28).fill(C.light);
  doc.fillColor(C.muted).font("Helvetica").fontSize(7)
     .text(
       `Generated by Aviary Manager · ${new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" })} · aviarymanager.app`,
       M, fy + 10, { width: A4L_W - M * 2, align: "center" }
     );
}
