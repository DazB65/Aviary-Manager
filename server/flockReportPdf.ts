import PDFDocument from "pdfkit";
import {
  type Doc, PW, PH, M, CW, C, HEADER_H,
  fmtInt, card, stackedBar, drawSectionHeader, drawReportFooter,
} from "./pdfTheme";
import { drawScorecardPage, type SeasonStats, type ScorecardMeta } from "./seasonReportPdf";
import type { ShowResultSummary } from "../shared/showResult";

/**
 * The premium multi-page "Flock Report":
 *   1. Cover            — branding, aviary name, season, headline numbers
 *   2. Flock at a glance — current flock state (composition, species, what's coming up)
 *   3. Season scorecard  — breeding performance (reuses drawScorecardPage)
 *
 * Future pages (roster with photos, pedigrees) slot in here as more drawXPage calls.
 */

export type FlockSummary = {
  totalBirds: number;
  totalMales: number;
  totalFemales: number;
  activePairs: number;
  eggsIncubating: number;
  upcomingHatches: number;
  upcomingEvents: number;
};

export type FlockComposition = {
  males: number;
  females: number;
  unknown: number;
  topSpecies: { name: string; count: number }[];
  totalSpecies: number;
};

export type FlockReportData = {
  meta: ScorecardMeta;
  summary: FlockSummary;
  composition: FlockComposition;
  seasonStats: SeasonStats;
  /** Season show/exhibition rollup — omitted when the user has no show records. */
  shows?: ShowResultSummary;
};

const TOTAL_PAGES = 3;

export async function generateFlockReportPdf(data: FlockReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const name = data.meta.aviaryName?.trim() || "Aviary Manager";
    const doc = new PDFDocument({
      size: "A4", layout: "portrait", margin: 0, autoFirstPage: true,
      info: { Title: `Flock Report — ${name} (${data.meta.year})`, Author: "Aviary Manager" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawCoverPage(doc, data);
    doc.addPage();
    drawFlockAtAGlancePage(doc, data, `2 / ${TOTAL_PAGES}`);
    doc.addPage();
    drawScorecardPage(doc, data.seasonStats, data.meta, { page: `3 / ${TOTAL_PAGES}` });

    doc.end();
  });
}

// ── Page 1: Cover ────────────────────────────────────────────────────────────
export function drawCoverPage(doc: Doc, data: FlockReportData) {
  const { meta, summary, composition, seasonStats } = data;

  // Top gradient band
  const bandH = 300;
  const grad = doc.linearGradient(0, 0, PW, bandH);
  grad.stop(0, C.primaryDk).stop(1, C.primary);
  doc.rect(0, 0, PW, bandH).fill(grad);

  doc.fillColor(C.priLight).font("Helvetica-Bold").fontSize(11)
     .text("AVIARY MANAGER", M, 72, { width: CW, align: "center", characterSpacing: 3, lineBreak: false });
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(44)
     .text("Flock Report", M, 104, { width: CW, align: "center", lineBreak: false });

  // Short divider
  doc.rect(PW / 2 - 30, 168, 60, 2).fillOpacity(0.5).fill(C.white).fillOpacity(1);

  const aviary = meta.aviaryName?.trim() || "Your Aviary";
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(18)
     .text(aviary, M, 190, { width: CW, align: "center", lineBreak: false });
  doc.fillColor(C.priLight).font("Helvetica").fontSize(13)
     .text(`${meta.year} Season`, M, 220, { width: CW, align: "center", lineBreak: false });

  // Headline stat band (full-width card, 4 cells) centred in the lower half
  const cardTop = 410, cardH = 104;
  card(doc, M, cardTop, CW, cardH);
  const cells: { label: string; value: string }[] = [
    { label: "Birds", value: fmtInt(summary.totalBirds) },
    { label: "Breeding Pairs", value: fmtInt(summary.activePairs) },
    { label: "Species", value: fmtInt(composition.totalSpecies) },
    { label: "Hatch Rate", value: `${Math.round(seasonStats.hatchRate)}%` },
  ];
  const cellW = CW / cells.length;
  cells.forEach((c, i) => {
    const x = M + i * cellW;
    if (i > 0) doc.rect(x, cardTop + 22, 1, cardH - 44).fill(C.border);
    doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(30)
       .text(c.value, x, cardTop + 28, { width: cellW, align: "center", lineBreak: false });
    doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(9)
       .text(c.label.toUpperCase(), x, cardTop + 68, { width: cellW, align: "center", characterSpacing: 0.5, lineBreak: false });
  });

  // Prepared-for / generated
  const generated = (meta.generatedAt ?? new Date()).toLocaleDateString("en-AU", {
    day: "2-digit", month: "long", year: "numeric",
  });
  // The aviary name is already the cover hero, so the "prepared for" line shows
  // the account email (skipped entirely if there's no email).
  const contact = meta.preparedFor?.trim();
  let py = cardTop + cardH + 48;
  if (contact) {
    doc.fillColor(C.faint).font("Helvetica-Bold").fontSize(9)
       .text("PREPARED FOR", M, py, { width: CW, align: "center", characterSpacing: 1.5, lineBreak: false });
    doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(13)
       .text(contact, M, py + 14, { width: CW, align: "center", lineBreak: false });
    py += 38;
  }
  doc.fillColor(C.faint).font("Helvetica").fontSize(10)
     .text(`Generated ${generated}`, M, py, { width: CW, align: "center", lineBreak: false });

  drawReportFooter(doc, { page: `1 / ${TOTAL_PAGES}` });
}

// ── Page 2: Flock at a glance ────────────────────────────────────────────────
export function drawFlockAtAGlancePage(doc: Doc, data: FlockReportData, pageLabel: string) {
  const { meta, summary, composition } = data;
  drawSectionHeader(doc, { title: "Flock at a Glance", badgeLabel: "BIRDS", badgeValue: fmtInt(summary.totalBirds) });

  // Hero strip
  const top = HEADER_H + 22;
  doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(26)
     .text("Flock Overview", M, top, { lineBreak: false });
  doc.fillColor(C.muted).font("Helvetica").fontSize(11)
     .text("Where your aviary stands today.", M, top + 34, { width: CW * 0.62, lineBreak: false });

  const generated = (meta.generatedAt ?? new Date()).toLocaleDateString("en-AU", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const identity = meta.aviaryName?.trim() || meta.preparedFor?.trim();
  if (identity) {
    doc.fillColor(C.faint).font("Helvetica").fontSize(9)
       .text("PREPARED FOR", M, top + 2, { width: CW, align: "right", characterSpacing: 1, lineBreak: false });
    doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(11)
       .text(identity, M, top + 14, { width: CW, align: "right", lineBreak: false });
  }
  doc.fillColor(C.faint).font("Helvetica").fontSize(9)
     .text(`As of ${generated}`, M, top + 32, { width: CW, align: "right", lineBreak: false });

  const ruleY = top + 56;
  doc.rect(M, ruleY, CW, 1).fill(C.border);

  // KPI row
  const kpis: { label: string; value: string; sub?: string; accent: string }[] = [
    { label: "Total Birds", value: fmtInt(summary.totalBirds),
      sub: `${fmtInt(summary.totalMales)} males · ${fmtInt(summary.totalFemales)} females`, accent: C.primary },
    { label: "Breeding Pairs", value: fmtInt(summary.activePairs), accent: C.primary },
    { label: "Species Kept", value: fmtInt(composition.totalSpecies), accent: C.secondary },
    { label: "Eggs Incubating", value: fmtInt(summary.eggsIncubating), accent: C.male },
  ];
  const kTop = ruleY + 16, kGap = 14, kW = (CW - kGap * 3) / 4, kH = 86;
  kpis.forEach((k, i) => {
    const x = M + i * (kW + kGap);
    card(doc, x, kTop, kW, kH);
    doc.roundedRect(x, kTop, kW, 4, 2).fill(k.accent);
    doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(8.5)
       .text(k.label.toUpperCase(), x + 12, kTop + 16, { width: kW - 24, characterSpacing: 0.5, lineBreak: false });
    doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(26)
       .text(k.value, x + 12, kTop + 34, { width: kW - 24, lineBreak: false });
    if (k.sub) {
      doc.fillColor(C.muted).font("Helvetica").fontSize(7.5)
         .text(k.sub, x + 12, kTop + 66, { width: kW - 20, lineBreak: false });
    }
  });

  // Panels: composition + top species
  const pTop = kTop + kH + 18, pH = 250, pGap = 16;
  const leftW = 226, rightW = CW - leftW - pGap;
  const lx = M, rx = M + leftW + pGap;

  drawComposition(doc, composition, lx, pTop, leftW, pH);
  drawTopSpecies(doc, composition, rx, pTop, rightW, pH);

  // Coming up strip
  const cTop = pTop + pH + 18, cH = 86;
  card(doc, M, cTop, CW, cH);
  doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(12)
     .text("Coming Up", M + 16, cTop + 14, { lineBreak: false });
  const comingCells: { label: string; value: string }[] = [
    { label: "Hatches due (14 days)", value: fmtInt(summary.upcomingHatches) },
    { label: "Upcoming tasks", value: fmtInt(summary.upcomingEvents) },
    { label: "Unsexed birds", value: fmtInt(composition.unknown) },
  ];
  const ccW = (CW - 32) / comingCells.length;
  const ccTop = cTop + 38;
  comingCells.forEach((c, i) => {
    const x = M + 16 + i * ccW;
    if (i > 0) doc.rect(x, ccTop, 1, 32).fill(C.border);
    doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(22)
       .text(c.value, x + 12, ccTop, { width: ccW - 16, lineBreak: false });
    doc.fillColor(C.muted).font("Helvetica").fontSize(9)
       .text(c.label, x + 12, ccTop + 27, { width: ccW - 16, lineBreak: false });
  });

  // Show ring strip — only when the user actually shows their birds
  if (data.shows && data.shows.totalShows > 0) {
    drawShowRing(doc, data.shows, cTop + cH + 16);
  }

  drawReportFooter(doc, { page: pageLabel });
}

function drawShowRing(doc: Doc, shows: ShowResultSummary, top: number) {
  const h = 86;
  card(doc, M, top, CW, h);
  doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(12)
     .text("Show Ring", M + 16, top + 14, { lineBreak: false });
  const cells: { label: string; value: string }[] = [
    { label: "Shows this season", value: fmtInt(shows.totalShows) },
    { label: "Wins (1st / Champion)", value: fmtInt(shows.wins) },
    { label: "Best result", value: shows.bestResult ?? "—" },
  ];
  const cw = (CW - 32) / cells.length;
  const cy = top + 38;
  cells.forEach((c, i) => {
    const x = M + 16 + i * cw;
    if (i > 0) doc.rect(x, cy, 1, 32).fill(C.border);
    doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(22)
       .text(c.value, x + 12, cy, { width: cw - 16, lineBreak: false, ellipsis: true });
    doc.fillColor(C.muted).font("Helvetica").fontSize(9)
       .text(c.label, x + 12, cy + 27, { width: cw - 16, lineBreak: false });
  });
}

function drawComposition(doc: Doc, comp: FlockComposition, x: number, y: number, w: number, h: number) {
  card(doc, x, y, w, h);
  doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(12)
     .text("Flock Composition", x + 16, y + 16, { lineBreak: false });
  doc.fillColor(C.muted).font("Helvetica").fontSize(8.5)
     .text("By sex", x + 16, y + 33, { lineBreak: false });

  const total = comp.males + comp.females + comp.unknown;
  const barX = x + 16, barY = y + 58, barW = w - 32, barH = 22;
  if (total > 0) {
    stackedBar(doc, barX, barY, barW, barH, total, [
      { value: comp.males, color: C.male },
      { value: comp.females, color: C.female },
      { value: comp.unknown, color: C.unknown },
    ]);
  } else {
    doc.roundedRect(barX, barY, barW, barH, 5).fill(C.track);
    doc.fillColor(C.faint).font("Helvetica").fontSize(9)
       .text("No birds recorded", barX, barY + 6, { width: barW, align: "center", lineBreak: false });
  }

  const rows: { label: string; value: number; color: string }[] = [
    { label: "Males", value: comp.males, color: C.male },
    { label: "Females", value: comp.females, color: C.female },
    { label: "Unsexed", value: comp.unknown, color: C.unknown },
  ];
  let ry = barY + barH + 20;
  for (const r of rows) {
    doc.roundedRect(barX, ry, 10, 10, 2).fill(r.color);
    doc.fillColor(C.heading).font("Helvetica").fontSize(10)
       .text(r.label, barX + 18, ry, { width: barW - 110, lineBreak: false });
    const pct = total > 0 ? Math.round((r.value / total) * 100) : 0;
    doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(10)
       .text(`${fmtInt(r.value)}  ·  ${pct}%`, barX + 18, ry, { width: barW - 18, align: "right", lineBreak: false });
    ry += 26;
  }
}

function drawTopSpecies(doc: Doc, comp: FlockComposition, x: number, y: number, w: number, h: number) {
  card(doc, x, y, w, h);
  doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(12)
     .text("Top Species", x + 16, y + 16, { lineBreak: false });
  doc.fillColor(C.muted).font("Helvetica").fontSize(8.5)
     .text("Most-kept species in your flock", x + 16, y + 33, { lineBreak: false });

  const species = comp.topSpecies.slice(0, 6);
  if (species.length === 0) {
    doc.fillColor(C.faint).font("Helvetica").fontSize(9)
       .text("No birds recorded", x + 16, y + 64, { lineBreak: false });
    return;
  }

  const maxCount = Math.max(...species.map(s => s.count), 1);
  const rowsTop = y + 60;
  const rowH = (h - 76) / species.length;
  const labelW = 116;
  const barX = x + 16 + labelW + 8;
  const barMaxW = x + w - 16 - 36 - barX;

  species.forEach((s, i) => {
    const ry = rowsTop + i * rowH;
    const cy = ry + rowH / 2;
    doc.fillColor(C.heading).font("Helvetica").fontSize(9.5)
       .text(s.name, x + 16, cy - 5, { width: labelW, lineBreak: false, ellipsis: true });
    // track + bar
    const bw = Math.max(3, (s.count / maxCount) * barMaxW);
    doc.roundedRect(barX, cy - 5, barMaxW, 10, 5).fill(C.track);
    doc.roundedRect(barX, cy - 5, bw, 10, 5).fill(C.primary);
    doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(9.5)
       .text(fmtInt(s.count), barX + barMaxW + 6, cy - 5, { width: 30, align: "right", lineBreak: false });
  });
}
