import PDFDocument from "pdfkit";

/**
 * Shared visual language for the multi-page Flock Report (cover, flock-at-a-glance,
 * season scorecard, and future roster/pedigree pages). Keeping the palette, page
 * geometry, header/footer and primitive drawing helpers in one place means every
 * page looks like part of the same document.
 *
 * pdfkit notes carried over from pedigreePdf.ts: Helvetica only, no Unicode glyphs.
 */

export type Doc = InstanceType<typeof PDFDocument>;

// ── Page geometry (A4 portrait) ──────────────────────────────────────────────
export const PW = 595.28;
export const PH = 841.89;
export const M  = 40;
export const CW = PW - M * 2;

// ── Palette (brand-aligned with pedigreePdf.ts) ──────────────────────────────
export const C = {
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
  male:       "#3b82f6",
  female:     "#f43f5e",
  unknown:    "#94a3b8",
};

// ── Numeric helpers ──────────────────────────────────────────────────────────
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-AU");
}

export function ratio(n: number, d: number): string {
  if (!d) return "—";
  return (n / d).toFixed(1);
}

// ── Primitive shapes ─────────────────────────────────────────────────────────
/** Soft card: filled rounded rect with a hairline border. */
export function card(doc: Doc, x: number, y: number, w: number, h: number, r = 8) {
  doc.roundedRect(x, y, w, h, r).fill(C.cardBg);
  doc.roundedRect(x, y, w, h, r).lineWidth(0.8).strokeColor(C.border).stroke();
}

/** Point on a circle, 0° at top, clockwise positive (pdfkit y-down). */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** Stroke a circular arc from 0° clockwise by `sweep` degrees (donut rings). */
export function arc(doc: Doc, cx: number, cy: number, r: number, sweep: number, width: number, color: string) {
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

/**
 * Proportional horizontal stacked bar inside a rounded track. Segments with a
 * non-positive value are skipped. Renders nothing meaningful when total is 0.
 */
export function stackedBar(
  doc: Doc,
  x: number, y: number, w: number, h: number,
  total: number,
  segments: { value: number; color: string }[],
  r = 5,
) {
  doc.roundedRect(x, y, w, h, r).fill(C.track);
  if (total <= 0) return;
  doc.save();
  doc.roundedRect(x, y, w, h, r).clip();
  let cursor = x;
  for (const s of segments) {
    if (s.value <= 0) continue;
    const segW = (s.value / total) * w;
    doc.rect(cursor, y, segW, h).fill(s.color);
    cursor += segW;
  }
  doc.restore();
}

// ── Shared section header (gradient band) ────────────────────────────────────
export const HEADER_H = 92;

export function drawSectionHeader(
  doc: Doc,
  opts: { title: string; eyebrow?: string; badgeLabel?: string; badgeValue?: string },
): number {
  const grad = doc.linearGradient(0, 0, PW, HEADER_H);
  grad.stop(0, C.primaryDk).stop(1, C.primary);
  doc.rect(0, 0, PW, HEADER_H).fill(grad);

  doc.fillColor(C.priLight).font("Helvetica-Bold").fontSize(9)
     .text(opts.eyebrow ?? "AVIARY MANAGER", M, 26, { characterSpacing: 2, lineBreak: false });
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(22)
     .text(opts.title, M, 40, { lineBreak: false });

  if (opts.badgeValue) {
    const badgeW = 96, badgeH = 44, bx = PW - M - badgeW, by = (HEADER_H - badgeH) / 2;
    doc.roundedRect(bx, by, badgeW, badgeH, 8).fillOpacity(0.18).fill(C.white).fillOpacity(1);
    if (opts.badgeLabel) {
      doc.fillColor(C.priLight).font("Helvetica-Bold").fontSize(8)
         .text(opts.badgeLabel, bx, by + 8, { width: badgeW, align: "center", characterSpacing: 1.5, lineBreak: false });
    }
    doc.fillColor(C.white).font("Helvetica-Bold").fontSize(20)
       .text(opts.badgeValue, bx, by + 18, { width: badgeW, align: "center", lineBreak: false });
  }

  return HEADER_H;
}

// ── Shared footer ────────────────────────────────────────────────────────────
export function drawReportFooter(doc: Doc, opts?: { page?: string }) {
  const fy = PH - 46;
  doc.rect(M, fy, CW, 1).fill(C.border);
  doc.fillColor(C.faint).font("Helvetica").fontSize(8.5)
     .text("Made with Aviary Manager", M, fy + 12, { lineBreak: false });
  if (opts?.page) {
    doc.fillColor(C.faint).font("Helvetica").fontSize(8.5)
       .text(opts.page, M, fy + 12, { width: CW, align: "center", lineBreak: false });
  }
  doc.fillColor(C.faint).font("Helvetica").fontSize(8.5)
     .text("aviarymanager.app", M, fy + 12, { width: CW, align: "right", lineBreak: false });
}
