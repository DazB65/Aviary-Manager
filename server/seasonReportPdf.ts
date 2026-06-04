import PDFDocument from "pdfkit";

/**
 * Premium "Breeding Season Scorecard" — a single-page, presentation-quality PDF
 * built from StatsService.getSeasonStats(). This is the proof-of-concept page for
 * the eventual multi-page Flock Report. Mirrors the layout/streaming pattern of
 * pedigreePdf.ts (pdfkit, absolute coordinates, Helvetica only — no Unicode glyphs).
 */

type Doc = InstanceType<typeof PDFDocument>;

// Shape returned by StatsService.getSeasonStats (superset of the documented fields).
export type SeasonStats = {
  pairs: number;
  broods: number;
  incubating: number;
  totalEggs: number;
  eggsRemaining?: number;
  eggsResolved?: number;
  hatched: number;
  fledged: number;
  infertile: number;
  died: number;
  cracked: number;
  missing: number;
  abandoned?: number;
  losses: number;
  hatchRate: number;
};

export type ScorecardMeta = {
  year: number;
  aviaryName?: string | null;  // breeder/aviary name (preferred identity on the report)
  preparedFor?: string | null; // account email — fallback when no aviary name is set
  generatedAt?: Date;
};

// ── Palette (brand-aligned with pedigreePdf.ts) ──────────────────────────────
const C = {
  primary:    "#0d9488",
  primaryDk:  "#0f766e",
  priLight:   "#ccfbf1",
  secondary:  "#f59e0b",
  text:       "#0f172a",
  heading:    "#1e293b",
  muted:      "#64748b",
  faint:      "#94a3b8",
  border:     "#e2e8f0",
  cardBg:     "#ffffff",
  panelBg:    "#f8fafc",
  track:      "#eef2f6",
  white:      "#ffffff",
};

// Egg-outcome colours — keys match StatsService outcome buckets.
const OUTCOME = {
  hatched:   { color: "#22c55e", label: "Hatched" },
  fledged:   { color: "#0d9488", label: "Fledged" },
  remaining: { color: "#3b82f6", label: "Still incubating" },
  infertile: { color: "#94a3b8", label: "Infertile" },
  cracked:   { color: "#f59e0b", label: "Cracked" },
  died:      { color: "#f43f5e", label: "Died" },
  missing:   { color: "#a855f7", label: "Missing" },
  abandoned: { color: "#78716c", label: "Abandoned" },
} as const;

// ── Page geometry (A4 portrait) ──────────────────────────────────────────────
const PW = 595.28;
const PH = 841.89;
const M  = 40;
const CW = PW - M * 2; // content width

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-AU");
}

function ratio(n: number, d: number): string {
  if (!d) return "—";
  return (n / d).toFixed(1);
}

/** Draw a soft "card": filled rounded rect with a hairline border. */
function card(doc: Doc, x: number, y: number, w: number, h: number, r = 8) {
  doc.roundedRect(x, y, w, h, r).fill(C.cardBg);
  doc.roundedRect(x, y, w, h, r).lineWidth(0.8).strokeColor(C.border).stroke();
}

/** Point on a circle, 0° at top, clockwise positive (pdfkit y-down). */
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** Stroke a circular arc from 0° clockwise by `sweep` degrees (for the donut). */
function arc(doc: Doc, cx: number, cy: number, r: number, sweep: number, width: number, color: string) {
  if (sweep <= 0) return;
  if (sweep >= 360) {
    doc.circle(cx, cy, r).lineWidth(width).strokeColor(color).stroke();
    return;
  }
  const [sx, sy] = polar(cx, cy, r, 0);
  const [ex, ey] = polar(cx, cy, r, sweep);
  const large = sweep > 180 ? 1 : 0;
  doc.path(`M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`)
     .lineWidth(width).lineCap("round").strokeColor(color).stroke();
}

// ── Main export ──────────────────────────────────────────────────────────────
export async function generateSeasonScorecardPdf(
  stats: SeasonStats,
  meta: ScorecardMeta
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "portrait",
      margin: 0,
      autoFirstPage: true,
      info: {
        Title: `Breeding Season Scorecard — ${meta.year}`,
        Author: "Aviary Manager",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawHeader(doc, meta);
    let y = drawHero(doc, stats, meta);
    y = drawKpis(doc, stats, y + 16);
    y = drawVizBlock(doc, stats, y + 18);
    y = drawProductivity(doc, stats, y + 18);
    drawFooter(doc);

    doc.end();
  });
}

// ── Header band ──────────────────────────────────────────────────────────────
function drawHeader(doc: Doc, meta: ScorecardMeta) {
  const H = 92;
  const grad = doc.linearGradient(0, 0, PW, H);
  grad.stop(0, C.primaryDk).stop(1, C.primary);
  doc.rect(0, 0, PW, H).fill(grad);

  // Eyebrow + title
  doc.fillColor(C.priLight).font("Helvetica-Bold").fontSize(9)
     .text("AVIARY MANAGER", M, 26, { characterSpacing: 2, lineBreak: false });
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(22)
     .text("Breeding Season Scorecard", M, 40, { lineBreak: false });

  // Year badge (right)
  const badgeW = 96, badgeH = 44, bx = PW - M - badgeW, by = (H - badgeH) / 2;
  doc.roundedRect(bx, by, badgeW, badgeH, 8)
     .fillOpacity(0.18).fill(C.white).fillOpacity(1);
  doc.fillColor(C.priLight).font("Helvetica-Bold").fontSize(8)
     .text("SEASON", bx, by + 8, { width: badgeW, align: "center", characterSpacing: 1.5, lineBreak: false });
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(20)
     .text(String(meta.year), bx, by + 18, { width: badgeW, align: "center", lineBreak: false });
}

// ── Hero strip ───────────────────────────────────────────────────────────────
function drawHero(doc: Doc, stats: SeasonStats, meta: ScorecardMeta): number {
  const top = 92 + 22;
  doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(26)
     .text(`${meta.year} Season Summary`, M, top, { lineBreak: false });
  doc.fillColor(C.muted).font("Helvetica").fontSize(11)
     .text("A snapshot of this season's breeding performance across your flock.",
           M, top + 34, { width: CW * 0.62, lineBreak: false });

  // Right-aligned meta. Prefer the aviary name; fall back to the account email.
  const generated = (meta.generatedAt ?? new Date()).toLocaleDateString("en-AU", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const identity = meta.aviaryName?.trim() || meta.preparedFor?.trim() || null;
  const rx = M, rw = CW;
  if (identity) {
    doc.fillColor(C.faint).font("Helvetica").fontSize(9)
       .text("PREPARED FOR", rx, top + 2, { width: rw, align: "right", characterSpacing: 1, lineBreak: false });
    doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(11)
       .text(identity, rx, top + 14, { width: rw, align: "right", lineBreak: false });
  }
  doc.fillColor(C.faint).font("Helvetica").fontSize(9)
     .text(`Generated ${generated}`, rx, top + 32, { width: rw, align: "right", lineBreak: false });

  const ruleY = top + 56;
  doc.rect(M, ruleY, CW, 1).fill(C.border);
  return ruleY;
}

// ── KPI row ──────────────────────────────────────────────────────────────────
function drawKpis(doc: Doc, stats: SeasonStats, top: number): number {
  const youngProduced = stats.hatched + stats.fledged;
  const kpis: { label: string; value: string; accent: string }[] = [
    { label: "Breeding Pairs", value: fmtInt(stats.pairs),       accent: C.primary },
    { label: "Broods Raised",  value: fmtInt(stats.broods),      accent: C.primary },
    { label: "Eggs Laid",      value: fmtInt(stats.totalEggs),   accent: C.secondary },
    { label: "Young Produced", value: fmtInt(youngProduced),     accent: OUTCOME.hatched.color },
  ];

  const gap = 14;
  const w = (CW - gap * (kpis.length - 1)) / kpis.length;
  const h = 80;

  kpis.forEach((k, i) => {
    const x = M + i * (w + gap);
    card(doc, x, top, w, h);
    // accent tab
    doc.roundedRect(x, top, w, 4, 2).fill(k.accent);
    doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(8.5)
       .text(k.label.toUpperCase(), x + 12, top + 16, { width: w - 24, characterSpacing: 0.5, lineBreak: false });
    doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(28)
       .text(k.value, x + 12, top + 34, { width: w - 24, lineBreak: false });
  });

  return top + h;
}

// ── Viz block (donut + outcomes) ─────────────────────────────────────────────
function drawVizBlock(doc: Doc, stats: SeasonStats, top: number): number {
  const h = 244;
  const gap = 16;
  const leftW = 196;
  const rightW = CW - leftW - gap;
  const lx = M, rx = M + leftW + gap;

  // ----- Left: hatch-rate donut -----
  card(doc, lx, top, leftW, h);
  doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(12)
     .text("Hatch Rate", lx + 16, top + 16, { lineBreak: false });
  doc.fillColor(C.muted).font("Helvetica").fontSize(8.5)
     .text("Young produced ÷ eggs laid".replace("÷", "/"), lx + 16, top + 33, { lineBreak: false });

  const cx = lx + leftW / 2;
  const cy = top + 138;
  const r = 58;
  const ring = 16;
  const pct = Math.max(0, Math.min(100, stats.hatchRate));
  arc(doc, cx, cy, r, 360, ring, C.track);          // track
  arc(doc, cx, cy, r, (pct / 100) * 360, ring, C.primary); // value

  doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(30)
     .text(`${Math.round(pct)}%`, cx - r, cy - 18, { width: r * 2, align: "center", lineBreak: false });
  doc.fillColor(C.muted).font("Helvetica").fontSize(8.5)
     .text("hatch rate", cx - r, cy + 12, { width: r * 2, align: "center", lineBreak: false });

  const young = stats.hatched + stats.fledged;
  doc.fillColor(C.muted).font("Helvetica").fontSize(9.5)
     .text(`${fmtInt(young)} of ${fmtInt(stats.totalEggs)} eggs produced young`,
           lx + 14, top + h - 30, { width: leftW - 28, align: "center", lineBreak: false });

  // ----- Right: egg-outcome stacked bar + legend -----
  card(doc, rx, top, rightW, h);
  doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(12)
     .text("Egg Outcomes", rx + 16, top + 16, { lineBreak: false });
  doc.fillColor(C.muted).font("Helvetica").fontSize(8.5)
     .text(`${fmtInt(stats.totalEggs)} eggs laid across ${fmtInt(stats.broods)} broods`,
           rx + 16, top + 33, { lineBreak: false });

  const remaining = stats.eggsRemaining ?? Math.max(0, stats.totalEggs
    - stats.hatched - stats.fledged - stats.infertile - stats.died
    - stats.cracked - stats.missing - (stats.abandoned ?? 0));

  const segs: { key: keyof typeof OUTCOME; value: number }[] = [
    { key: "hatched",   value: stats.hatched },
    { key: "fledged",   value: stats.fledged },
    { key: "remaining", value: remaining },
    { key: "infertile", value: stats.infertile },
    { key: "cracked",   value: stats.cracked },
    { key: "died",      value: stats.died },
    { key: "missing",   value: stats.missing },
    { key: "abandoned", value: stats.abandoned ?? 0 },
  ];

  const barX = rx + 16, barY = top + 58, barW = rightW - 32, barH = 22;
  const total = stats.totalEggs;
  doc.roundedRect(barX, barY, barW, barH, 5).fill(C.track);
  if (total > 0) {
    let cursor = barX;
    doc.save();
    doc.roundedRect(barX, barY, barW, barH, 5).clip();
    for (const s of segs) {
      if (s.value <= 0) continue;
      const segW = (s.value / total) * barW;
      doc.rect(cursor, barY, segW, barH).fill(OUTCOME[s.key].color);
      cursor += segW;
    }
    doc.restore();
  } else {
    doc.fillColor(C.faint).font("Helvetica").fontSize(9)
       .text("No eggs recorded this season", barX, barY + 6, { width: barW, align: "center", lineBreak: false });
  }

  // Legend grid (2 columns)
  const legendTop = barY + barH + 22;
  const colGap = 18;
  const colW = (barW - colGap) / 2;
  const rowH = 22;
  const shown = segs.filter(s => s.value > 0);
  shown.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = barX + col * (colW + colGap);
    const yy = legendTop + row * rowH;
    doc.roundedRect(x, yy, 10, 10, 2).fill(OUTCOME[s.key].color);
    doc.fillColor(C.heading).font("Helvetica").fontSize(9.5)
       .text(OUTCOME[s.key].label, x + 18, yy, { width: colW - 70, lineBreak: false });
    const pctOf = total > 0 ? Math.round((s.value / total) * 100) : 0;
    doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(9.5)
       .text(`${fmtInt(s.value)}  ·  ${pctOf}%`, x + 18, yy, { width: colW - 18, align: "right", lineBreak: false });
  });

  return top + h;
}

// ── Productivity strip ───────────────────────────────────────────────────────
function drawProductivity(doc: Doc, stats: SeasonStats, top: number): number {
  const young = stats.hatched + stats.fledged;
  const chips: { label: string; value: string }[] = [
    { label: "Eggs / Pair",   value: ratio(stats.totalEggs, stats.pairs) },
    { label: "Eggs / Brood",  value: ratio(stats.totalEggs, stats.broods) },
    { label: "Young / Pair",  value: ratio(young, stats.pairs) },
    { label: "Total Losses",  value: fmtInt(stats.losses) },
  ];

  const h = 84;
  card(doc, M, top, CW, h);
  doc.fillColor(C.heading).font("Helvetica-Bold").fontSize(12)
     .text("Productivity", M + 16, top + 14, { lineBreak: false });

  const inner = CW - 32;
  const cellW = inner / chips.length;
  const cellTop = top + 38;
  chips.forEach((c, i) => {
    const x = M + 16 + i * cellW;
    if (i > 0) doc.rect(x, cellTop, 1, 30).fill(C.border);
    doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(22)
       .text(c.value, x + 12, cellTop, { width: cellW - 16, lineBreak: false });
    doc.fillColor(C.muted).font("Helvetica").fontSize(9)
       .text(c.label, x + 12, cellTop + 26, { width: cellW - 16, lineBreak: false });
  });

  return top + h;
}

// ── Footer ───────────────────────────────────────────────────────────────────
function drawFooter(doc: Doc) {
  const fy = PH - 46;
  doc.rect(M, fy, CW, 1).fill(C.border);
  doc.fillColor(C.faint).font("Helvetica").fontSize(8.5)
     .text("Made with Aviary Manager", M, fy + 12, { lineBreak: false });
  doc.fillColor(C.faint).font("Helvetica").fontSize(8.5)
     .text("aviarymanager.app", M, fy + 12, { width: CW, align: "right", lineBreak: false });
}
