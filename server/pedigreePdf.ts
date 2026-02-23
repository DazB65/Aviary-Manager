import PDFDocument from "pdfkit";
import { getPedigree } from "./db";

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

// Colour palette
const COLORS = {
  primary:    "#0d9488", // teal-600
  secondary:  "#f59e0b", // amber-500
  male:       "#3b82f6", // blue-500
  female:     "#f43f5e", // rose-500
  unknown:    "#94a3b8", // slate-400
  cardBg:     "#f8fafc", // slate-50
  border:     "#e2e8f0", // slate-200
  text:       "#1e293b", // slate-900
  muted:      "#64748b", // slate-500
  white:      "#ffffff",
  headerBg:   "#0d9488",
};

function genderColor(gender: string): string {
  if (gender === "male") return COLORS.male;
  if (gender === "female") return COLORS.female;
  return COLORS.unknown;
}

function birdLabel(b: PedigreeBird | undefined | null, speciesName?: string): string[] {
  if (!b) return ["Unknown"];
  const lines: string[] = [];
  if (b.name) lines.push(b.name);
  if (b.ringId) lines.push(`Ring: ${b.ringId}`);
  if (speciesName) lines.push(speciesName);
  if (b.colorMutation) lines.push(b.colorMutation);
  return lines.length ? lines : [`#${b.id}`];
}

/**
 * Generate a pedigree PDF for a given bird.
 * Returns a Buffer containing the PDF bytes.
 */
export async function generatePedigreePdf(
  birdId: number,
  userId: number,
  speciesMap: Record<number, { commonName: string }>
): Promise<Buffer> {
  const pedigreeMap = await getPedigree(birdId, userId, 5);
  const subject = pedigreeMap[birdId];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 30,
      info: {
        Title: `Pedigree — ${subject?.name || subject?.ringId || `Bird #${birdId}`}`,
        Author: "Aviary Manager",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PAGE_W = doc.page.width;
    const PAGE_H = doc.page.height;
    const MARGIN = 30;

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 56).fill(COLORS.headerBg);
    doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(18)
      .text("🐦 Aviary Manager — Pedigree Certificate", MARGIN, 14, { width: PAGE_W - MARGIN * 2 });
    const subjectName = subject?.name || subject?.ringId || `Bird #${birdId}`;
    const subjectSpecies = subject ? speciesMap[subject.speciesId]?.commonName : undefined;
    doc.font("Helvetica").fontSize(11)
      .text(`${subjectName}${subjectSpecies ? ` · ${subjectSpecies}` : ""}`, MARGIN, 36, { width: PAGE_W - MARGIN * 2 });

    // ── Generation labels ────────────────────────────────────────────────────
    const CONTENT_TOP = 70;
    const CONTENT_H = PAGE_H - CONTENT_TOP - 40;
    const GEN_COUNT = 5;
    const COL_W = (PAGE_W - MARGIN * 2) / GEN_COUNT;

    const genLabels = ["Subject", "Parents", "Grandparents", "Great-grandparents", "Gg-grandparents"];
    for (let g = 0; g < GEN_COUNT; g++) {
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(7)
        .text(genLabels[g], MARGIN + g * COL_W, CONTENT_TOP - 12, { width: COL_W, align: "center" });
    }

    // ── Card drawing helper ──────────────────────────────────────────────────
    const CARD_W = COL_W - 10;
    const CARD_H = 44;
    const CARD_RADIUS = 5;

    function drawCard(
      bird: PedigreeBird | undefined | null,
      x: number,
      y: number,
      speciesName?: string
    ) {
      if (!bird) {
        // Empty placeholder
        doc.roundedRect(x, y, CARD_W, CARD_H, CARD_RADIUS)
          .strokeColor(COLORS.border).lineWidth(0.5).stroke();
        doc.fillColor(COLORS.muted).font("Helvetica").fontSize(7)
          .text("Unknown", x, y + CARD_H / 2 - 4, { width: CARD_W, align: "center" });
        return;
      }

      const gc = genderColor(bird.gender);
      // Card background
      doc.roundedRect(x, y, CARD_W, CARD_H, CARD_RADIUS)
        .fillColor(COLORS.cardBg).fill();
      // Left accent bar
      doc.rect(x, y, 3, CARD_H).fillColor(gc).fill();
      // Rounded border
      doc.roundedRect(x, y, CARD_W, CARD_H, CARD_RADIUS)
        .strokeColor(gc).lineWidth(0.7).stroke();

      // Gender symbol
      const sym = bird.gender === "male" ? "♂" : bird.gender === "female" ? "♀" : "?";
      doc.fillColor(gc).font("Helvetica-Bold").fontSize(9)
        .text(sym, x + 6, y + 4);

      // Text lines
      const lines = birdLabel(bird, speciesName);
      const textX = x + 16;
      const textW = CARD_W - 20;
      doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(7.5)
        .text(lines[0] ?? "", textX, y + 4, { width: textW, lineBreak: false });
      if (lines[1]) {
        doc.fillColor(COLORS.muted).font("Helvetica").fontSize(6.5)
          .text(lines[1], textX, y + 15, { width: textW, lineBreak: false });
      }
      if (lines[2]) {
        doc.fillColor(COLORS.muted).font("Helvetica").fontSize(6)
          .text(lines[2], textX, y + 24, { width: textW, lineBreak: false });
      }
      if (lines[3]) {
        doc.fillColor(COLORS.secondary).font("Helvetica").fontSize(6)
          .text(lines[3], textX, y + 33, { width: textW, lineBreak: false });
      }
    }

    // ── Recursive layout ─────────────────────────────────────────────────────
    // We place cards in a binary tree layout.
    // At generation g, there are 2^g slots, each occupying CONTENT_H / 2^g height.

    function drawGeneration(
      birdId: number | null | undefined,
      generation: number,
      slotIndex: number   // 0-based index within this generation's slots
    ) {
      if (generation >= GEN_COUNT) return;

      const slotsInGen = Math.pow(2, generation);
      const slotH = CONTENT_H / slotsInGen;
      const x = MARGIN + generation * COL_W + 5;
      const y = CONTENT_TOP + slotIndex * slotH + (slotH - CARD_H) / 2;

      const bird = birdId ? pedigreeMap[birdId] : null;
      const speciesName = bird ? speciesMap[bird.speciesId]?.commonName : undefined;
      drawCard(bird, x, y, speciesName);

      // Connector line to next generation
      if (generation < GEN_COUNT - 1 && bird) {
        const nextSlotH = CONTENT_H / (slotsInGen * 2);
        const fatherY = CONTENT_TOP + slotIndex * 2 * nextSlotH + (nextSlotH - CARD_H) / 2 + CARD_H / 2;
        const motherY = CONTENT_TOP + (slotIndex * 2 + 1) * nextSlotH + (nextSlotH - CARD_H) / 2 + CARD_H / 2;
        const midX = x + CARD_W;
        const nextX = MARGIN + (generation + 1) * COL_W + 5;
        const cardMidY = y + CARD_H / 2;

        doc.moveTo(midX, cardMidY).lineTo(midX + (nextX - midX) / 2, cardMidY)
          .lineTo(midX + (nextX - midX) / 2, fatherY)
          .lineTo(nextX, fatherY)
          .strokeColor(COLORS.border).lineWidth(0.5).stroke();

        doc.moveTo(midX + (nextX - midX) / 2, cardMidY)
          .lineTo(midX + (nextX - midX) / 2, motherY)
          .lineTo(nextX, motherY)
          .strokeColor(COLORS.border).lineWidth(0.5).stroke();
      }

      // Recurse
      if (bird) {
        drawGeneration(bird.fatherId, generation + 1, slotIndex * 2);
        drawGeneration(bird.motherId, generation + 1, slotIndex * 2 + 1);
      } else {
        drawGeneration(null, generation + 1, slotIndex * 2);
        drawGeneration(null, generation + 1, slotIndex * 2 + 1);
      }
    }

    drawGeneration(birdId, 0, 0);

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = PAGE_H - 28;
    doc.rect(0, footerY, PAGE_W, 28).fill(COLORS.cardBg);
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(7)
      .text(
        `Generated by Aviary Manager · ${new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" })}`,
        MARGIN, footerY + 10, { width: PAGE_W - MARGIN * 2, align: "center" }
      );

    doc.end();
  });
}
