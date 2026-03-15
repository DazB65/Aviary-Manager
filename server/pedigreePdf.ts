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
type SpeciesMap  = Record<number, { commonName: string }>;

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  primary:  "#0d9488",
  priLight: "#ccfbf1",
  secondary:"#f59e0b",
  male:     "#3b82f6",
  maleBg:   "#dbeafe",
  female:   "#f43f5e",
  femBg:    "#ffe4e6",
  unknown:  "#94a3b8",
  cardBg:   "#f8fafc",
  border:   "#e2e8f0",
  text:     "#1e293b",
  muted:    "#64748b",
  white:    "#ffffff",
  light:    "#f1f5f9",
};

// ── Page dimensions (A4 landscape) ───────────────────────────────────────────
const PW = 841.89;
const PH = 595.28;

// ── Layout zones ─────────────────────────────────────────────────────────────
const HDR_H = 50;                         // header bar height
const FTR_H = 26;                         // footer bar height
const M     = 22;                         // outer margin
const LP_W  = 178;                        // left (profile) panel width
const DIV_X = M + LP_W + 8;              // 208 – vertical divider x
const TP_X  = DIV_X + 7;                 // 215 – tree panel left edge
const TP_W  = PW - TP_X - M;             // ~605 – tree panel width
const CT    = HDR_H + 3;                  // 53  – content area top y
const CB    = PH - FTR_H;                 // ~569 – content area bottom y

// ── Tree sub-layout ───────────────────────────────────────────────────────────
const GEN_HDR = 16;                       // column header row height
const TR_TOP  = CT + GEN_HDR;             // 69  – tree rows start y
const TR_H    = CB - TR_TOP;              // ~500 – tree rows height
const GENS    = 5;
const COL_W   = TP_W / GENS;             // ~121
const CARD_W  = COL_W - 10;              // ~111
const CARD_H  = 26;                       // compact card height (fits 16 slots)
const CARD_R  = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────
function gc(g: string)   { return g === "male" ? C.male   : g === "female" ? C.female   : C.unknown; }
function gcBg(g: string) { return g === "male" ? C.maleBg : g === "female" ? C.femBg    : C.light;   }

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
  if (b.name)          ls.push(b.name);
  if (b.ringId)        ls.push(`Ring: ${b.ringId}`);
  if (b.colorMutation) ls.push(b.colorMutation);
  if (species)         ls.push(species);
  return ls.length ? ls : ["Unknown"];
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generatePedigreePdf(
  birdId: number,
  userId: number,
  speciesMap: SpeciesMap,
  fullBird?: FullBird
): Promise<Buffer> {
  const pedigreeMap = await PedigreeService.getPedigree(birdId, userId, 5) as PedigreeMap;
  const subject = pedigreeMap[birdId];

  return new Promise((resolve, reject) => {
    const displayName = fullBird?.name || subject?.name || fullBird?.ringId || subject?.ringId || "Unknown Bird";
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
      autoFirstPage: true,
      info: {
        Title: `Pedigree — ${displayName}`,
        Author: "Aviary Manager",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawHeader(doc, displayName, subject, speciesMap);
    drawProfile(doc, birdId, fullBird, subject, speciesMap);
    drawTree(doc, birdId, pedigreeMap, speciesMap);
    drawFooter(doc);

    doc.end();
  });
}

// ── Header bar ────────────────────────────────────────────────────────────────
function drawHeader(
  doc: Doc,
  displayName: string,
  subject: PedigreeBird | undefined,
  sMap: SpeciesMap
) {
  doc.rect(0, 0, PW, HDR_H).fill(C.primary);

  const species = subject?.speciesId ? sMap[subject.speciesId]?.commonName : undefined;

  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(15)
     .text("Aviary Manager", M, 10, { lineBreak: false });
  doc.fillColor(C.white).font("Helvetica").fontSize(9)
     .text("Pedigree Certificate", M, 30, { lineBreak: false });

  const title = `${displayName}${species ? `  ·  ${species}` : ""}`;
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(12)
     .text(title, M, 10, { width: PW - M * 2, align: "right", lineBreak: false });
  const today = new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" });
  doc.fillColor(C.white).font("Helvetica").fontSize(8)
     .text(today, M, 30, { width: PW - M * 2, align: "right", lineBreak: false });
}

// ── Left profile panel ────────────────────────────────────────────────────────
function drawProfile(
  doc: Doc,
  birdId: number,
  bird: FullBird | undefined,
  subject: PedigreeBird | undefined,
  sMap: SpeciesMap
) {
  const lx      = M;
  const gender  = bird?.gender || subject?.gender || "unknown";
  // Use ring ID as display name if no bird name is set — never fall back to internal DB id
  const name    = bird?.name || subject?.name || bird?.ringId || subject?.ringId || "Unknown Bird";
  const specId  = bird?.speciesId ?? subject?.speciesId;
  const species = specId ? sMap[specId]?.commonName : undefined;
  const ringId  = bird?.ringId || subject?.ringId;
  const mutation = bird?.colorMutation || subject?.colorMutation;
  const gColor   = gc(gender);

  // Panel background
  doc.rect(lx - 4, CT, LP_W + 8, CB - CT).fill(C.light);

  let y = CT + 6;

  // Bird name — allow wrapping, capped height so pdfkit can't paginate
  doc.fillColor(C.text).font("Helvetica-Bold").fontSize(14)
     .text(name, lx, y, { width: LP_W, height: 28 });
  y += 32;

  // Ring / species / mutation
  if (ringId) {
    doc.fillColor(C.muted).font("Helvetica").fontSize(9.5)
       .text(`Ring: ${ringId}`, lx, y, { width: LP_W, lineBreak: false });
    y += 14;
  }
  if (species) {
    doc.fillColor(C.muted).font("Helvetica").fontSize(9.5)
       .text(species, lx, y, { width: LP_W, lineBreak: false });
    y += 14;
  }
  if (mutation) {
    doc.fillColor(C.muted).font("Helvetica").fontSize(9.5)
       .text(mutation, lx, y, { width: LP_W, lineBreak: false });
    y += 14;
  }
  y += 4;

  // Gender badge — use plain ASCII text (no Unicode symbols, Helvetica doesn't support them)
  const genderLabel = gender === "male" ? "Male" : gender === "female" ? "Female" : "Unknown";
  doc.roundedRect(lx, y, 72, 18, 9).fill(gcBg(gender));
  doc.fillColor(gColor).font("Helvetica-Bold").fontSize(9)
     .text(genderLabel, lx, y + 4, { width: 72, align: "center", lineBreak: false });
  y += 25;

  // Divider
  doc.rect(lx, y, LP_W, 0.5).fill(C.border);
  y += 9;

  // Section label
  doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(7.5)
     .text("BIRD DETAILS", lx, y, { lineBreak: false });
  y += 13;

  // Field rows: 26 px each (label 7.5pt + value 11pt bold)
  const fields: [string, string][] = [
    ["Date of Birth",   fmtDate(bird?.dateOfBirth)],
    ["Fledge Date",     fmtDate(bird?.fledgedDate)],
    ["Cage / Location", bird?.cageNumber || "—"],
    ["Status",          fmtStatus(bird?.status)],
  ];

  for (const [label, value] of fields) {
    doc.fillColor(C.muted).font("Helvetica").fontSize(7.5)
       .text(label, lx, y, { lineBreak: false });
    doc.fillColor(C.text).font("Helvetica-Bold").fontSize(11)
       .text(value, lx, y + 10, { width: LP_W, lineBreak: false });
    y += 26;
  }

  // Notes (capped to remaining space — will NOT paginate due to height cap)
  if (bird?.notes && y < CB - 30) {
    y += 4;
    doc.rect(lx, y, LP_W, 0.5).fill(C.border);
    y += 9;
    doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(7.5)
       .text("NOTES", lx, y, { lineBreak: false });
    y += 13;
    const maxH = CB - y - 6;
    if (maxH > 10) {
      doc.fillColor(C.text).font("Helvetica").fontSize(9.5)
         .text(bird.notes, lx, y, { width: LP_W, height: maxH });
    }
  }

  // Vertical divider between panels
  doc.rect(DIV_X, CT, 0.5, CB - CT).fill(C.border);
}

// ── Pedigree tree ─────────────────────────────────────────────────────────────
function drawTree(
  doc: Doc,
  birdId: number,
  pMap: PedigreeMap,
  sMap: SpeciesMap
) {
  const genLabels = ["Subject", "Parents", "Grandparents", "Gt-grandparents", "Ggt-grandparents"];

  // Generation column headers
  for (let g = 0; g < GENS; g++) {
    const hx = TP_X + g * COL_W;
    doc.rect(hx, CT, COL_W - 1, GEN_HDR - 1)
       .fill(g === 0 ? C.primary : C.light);
    doc.fillColor(g === 0 ? C.white : C.muted)
       .font("Helvetica-Bold").fontSize(5.8)
       .text(genLabels[g], hx, CT + 4, { width: COL_W - 1, align: "center", lineBreak: false });
  }

  // ── Card helper — all text uses lineBreak:false + explicit width so pdfkit NEVER paginates
  function card(b: PedigreeBird | null | undefined, x: number, y: number, species?: string) {
    // Safety guard: skip cards that land outside the content zone
    if (y + CARD_H < CT || y > CB) return;

    if (!b) {
      doc.roundedRect(x, y, CARD_W, CARD_H, CARD_R)
         .strokeColor(C.border).lineWidth(0.4).stroke();
      doc.fillColor(C.border).font("Helvetica").fontSize(6)
         .text("—", x, y + CARD_H / 2 - 3, { width: CARD_W, align: "center", lineBreak: false });
      return;
    }

    const g = gc(b.gender);

    doc.roundedRect(x, y, CARD_W, CARD_H, CARD_R).fill(C.cardBg);
    doc.rect(x, y + CARD_R, 3, CARD_H - CARD_R * 2).fill(g);
    doc.roundedRect(x, y, CARD_W, CARD_H, CARD_R)
       .strokeColor(g).lineWidth(0.6).stroke();

    const sym = b.gender === "male" ? "M" : b.gender === "female" ? "F" : "?";
    doc.fillColor(g).font("Helvetica-Bold").fontSize(7)
       .text(sym, x + 4, y + 5, { lineBreak: false });

    const ls = birdLines(b, species);
    const tx = x + 13;
    const tw = CARD_W - 16;
    doc.fillColor(C.text).font("Helvetica-Bold").fontSize(7)
       .text(ls[0] ?? "", tx, y + 4, { width: tw, lineBreak: false });
    if (ls[1]) {
      doc.fillColor(C.muted).font("Helvetica").fontSize(5.5)
         .text(ls[1], tx, y + 14, { width: tw, lineBreak: false });
    }
  }

  // ── Recursive binary-tree layout ──────────────────────────────────────────
  function draw(bid: number | null | undefined, gen: number, slot: number) {
    if (gen >= GENS) return;

    const slots = Math.pow(2, gen);
    const slotH = TR_H / slots;
    const x     = TP_X + gen * COL_W + 5;
    const y     = TR_TOP + slot * slotH + (slotH - CARD_H) / 2;
    const b     = bid ? pMap[bid] : null;
    const sp    = b ? sMap[b.speciesId]?.commonName : undefined;

    card(b, x, y, sp);

    // Connector lines to next generation
    if (gen < GENS - 1 && b) {
      const nslotH = TR_H / (slots * 2);
      const fY  = TR_TOP + slot * 2       * nslotH + (nslotH - CARD_H) / 2 + CARD_H / 2;
      const mY  = TR_TOP + (slot * 2 + 1) * nslotH + (nslotH - CARD_H) / 2 + CARD_H / 2;
      const rx  = x + CARD_W;
      const nx  = TP_X + (gen + 1) * COL_W + 5;
      const cy  = y + CARD_H / 2;
      const bx  = (rx + nx) / 2;

      doc.moveTo(rx, cy).lineTo(bx, cy).lineTo(bx, fY).lineTo(nx, fY)
         .strokeColor(C.border).lineWidth(0.5).stroke();
      doc.moveTo(bx, cy).lineTo(bx, mY).lineTo(nx, mY)
         .strokeColor(C.border).lineWidth(0.5).stroke();
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
}

// ── Footer bar ────────────────────────────────────────────────────────────────
function drawFooter(doc: Doc) {
  doc.rect(0, CB, PW, FTR_H).fill(C.light);
  const date = new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" });
  doc.fillColor(C.muted).font("Helvetica").fontSize(7)
     .text(
       `Generated by Aviary Manager · ${date} · aviarymanager.app`,
       M, CB + 9, { width: PW - M * 2, align: "center", lineBreak: false }
     );
}
