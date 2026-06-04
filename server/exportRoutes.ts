import type { Express, Request, Response } from "express";
import ExcelJS from "exceljs";
import * as ArchiverPkg from "archiver";
import type { Archiver, ArchiverOptions } from "archiver";

// archiver v8 is ESM and exposes format-specific classes (ZipArchive, …),
// replacing the old archiver("zip", opts) factory. @types/archiver (v7) still
// describes the old API, so we reach for the class through the namespace and
// type it against the existing Archiver interface (append/pipe/finalize/on).
const ZipArchive = (ArchiverPkg as unknown as {
  ZipArchive: new (options?: ArchiverOptions) => Archiver;
}).ZipArchive;
import { sdk } from "./_core/sdk";
import { storageGetBytes } from "./storage";
import { BirdService } from "./services/birdService";
import { PairService } from "./services/pairService";
import { BroodService } from "./services/broodService";
import { EventService } from "./services/eventService";
import { SpeciesService } from "./services/speciesService";
import { AISavedNoteService } from "./services/aiSavedNoteService";

/**
 * Full-data export: a single .zip containing
 *   - "Aviary Manager Export.xlsx"  (multi-sheet, human-readable, IDs resolved to names)
 *   - photos/                       (bird photos, named after the bird)
 *   - README.txt                    (what's inside + any photos that couldn't be included)
 *
 * Streamed as binary over REST (outside tRPC), mirroring pdfRoutes.ts.
 * Auth is the session cookie, so a plain anchor-click download works on the client.
 */
export function registerExportRoutes(app: Express) {
  app.get("/api/export/full", async (req: Request, res: Response) => {
    // ── Auth ────────────────────────────────────────────────────────────────
    let userId: number | null = null;
    let userEmail: string | null = null;
    try {
      const user = await sdk.authenticateRequest(req as any);
      if (user) {
        userId = user.id;
        userEmail = user.email ?? null;
      }
    } catch {
      // fall through to 401
    }
    if (!userId) {
      res.status(401).json({ error: "Unauthorised" });
      return;
    }

    try {
      // ── Gather all user-owned data via the service layer ──────────────────
      const [birds, pairs, broods, eggs, events, allSpecies, savedNotes] = await Promise.all([
        BirdService.getBirdsByUser(userId),
        PairService.getPairsByUser(userId),
        BroodService.getBroodsByUser(userId),
        BroodService.getEggsByUser(userId),
        EventService.getEventsByUser(userId),
        SpeciesService.getAllSpecies(userId),
        AISavedNoteService.list(userId).catch(() => []),
      ]);

      // ── Lookup maps (resolve foreign keys to readable labels) ─────────────
      const speciesName = new Map<number, string>();
      for (const s of allSpecies) speciesName.set(s.id, s.commonName);

      const birdLabel = new Map<number, string>();
      for (const b of birds) birdLabel.set(b.id, labelForBird(b));

      const pairLabel = new Map<number, string>();
      for (const p of pairs) {
        const male = birdLabel.get(p.maleId) ?? `Bird #${p.maleId}`;
        const female = birdLabel.get(p.femaleId) ?? `Bird #${p.femaleId}`;
        pairLabel.set(p.id, `${male} × ${female}`);
      }

      // ── Build the workbook ────────────────────────────────────────────────
      const wb = new ExcelJS.Workbook();
      wb.creator = "Aviary Manager";
      wb.created = new Date();

      const exportedAt = new Date();

      // Summary sheet
      const summary = wb.addWorksheet("Summary");
      summary.columns = [
        { header: "Field", key: "field", width: 28 },
        { header: "Value", key: "value", width: 48 },
      ];
      const customSpecies = allSpecies.filter(s => s.isCustom && s.userId === userId);
      summary.addRows([
        { field: "Export date", value: exportedAt.toLocaleString() },
        { field: "Account", value: userEmail ?? `User #${userId}` },
        { field: "Birds", value: birds.length },
        { field: "Breeding pairs", value: pairs.length },
        { field: "Broods", value: broods.length },
        { field: "Clutch eggs", value: eggs.length },
        { field: "Events", value: events.length },
        { field: "Custom species", value: customSpecies.length },
        { field: "AI saved notes", value: savedNotes.length },
        { field: "", value: "" },
        { field: "Note", value: "Bird photos are in the photos/ folder of this zip." },
      ]);

      // Birds sheet
      const birdsSheet = wb.addWorksheet("Birds");
      birdsSheet.columns = [
        { header: "Name", key: "name", width: 20 },
        { header: "Ring ID", key: "ringId", width: 16 },
        { header: "Species", key: "species", width: 20 },
        { header: "Gender", key: "gender", width: 12 },
        { header: "Date of Birth", key: "dob", width: 14 },
        { header: "Age", key: "age", width: 16 },
        { header: "Fledged", key: "fledged", width: 14 },
        { header: "Cage", key: "cage", width: 12 },
        { header: "Colour Mutation", key: "mutation", width: 20 },
        { header: "Status", key: "status", width: 12 },
        { header: "Father", key: "father", width: 20 },
        { header: "Mother", key: "mother", width: 20 },
        { header: "Notes", key: "notes", width: 40 },
        { header: "Photo File", key: "photo", width: 28 },
      ];

      // Resolve photos as we go (so the workbook references match the zip).
      const photoTasks: { key: string; filename: string }[] = [];
      const usedPhotoNames = new Set<string>();

      for (const b of birds) {
        const photoFilename = planPhotoFilename(b, userId, usedPhotoNames, photoTasks);
        birdsSheet.addRow({
          name: b.name ?? "",
          ringId: b.ringId ?? "",
          species: speciesName.get(b.speciesId) ?? "",
          gender: b.gender ?? "",
          dob: b.dateOfBirth ?? "",
          age: ageString(b.dateOfBirth),
          fledged: b.fledgedDate ?? "",
          cage: b.cageNumber ?? "",
          mutation: b.colorMutation ?? "",
          status: b.status ?? "",
          father: b.fatherId ? (birdLabel.get(b.fatherId) ?? `Bird #${b.fatherId}`) : "",
          mother: b.motherId ? (birdLabel.get(b.motherId) ?? `Bird #${b.motherId}`) : "",
          notes: b.notes ?? "",
          photo: photoFilename ?? "",
        });
      }

      // Breeding Pairs sheet
      const pairsSheet = wb.addWorksheet("Breeding Pairs");
      pairsSheet.columns = [
        { header: "Male", key: "male", width: 20 },
        { header: "Female", key: "female", width: 20 },
        { header: "Season", key: "season", width: 12 },
        { header: "Pairing Date", key: "pairing", width: 14 },
        { header: "Status", key: "status", width: 12 },
        { header: "Notes", key: "notes", width: 40 },
      ];
      for (const p of pairs) {
        pairsSheet.addRow({
          male: birdLabel.get(p.maleId) ?? `Bird #${p.maleId}`,
          female: birdLabel.get(p.femaleId) ?? `Bird #${p.femaleId}`,
          season: p.season ?? "",
          pairing: p.pairingDate ?? "",
          status: p.status ?? "",
          notes: p.notes ?? "",
        });
      }

      // Broods sheet
      const broodsSheet = wb.addWorksheet("Broods");
      broodsSheet.columns = [
        { header: "Pair", key: "pair", width: 30 },
        { header: "Season", key: "season", width: 12 },
        { header: "Eggs Laid", key: "eggsLaid", width: 12 },
        { header: "Lay Date", key: "layDate", width: 14 },
        { header: "Expected Hatch", key: "expHatch", width: 16 },
        { header: "Actual Hatch", key: "actHatch", width: 14 },
        { header: "Chicks Survived", key: "chicks", width: 16 },
        { header: "Status", key: "status", width: 14 },
        { header: "Notes", key: "notes", width: 40 },
      ];
      for (const br of broods) {
        broodsSheet.addRow({
          pair: pairLabel.get(br.pairId) ?? `Pair #${br.pairId}`,
          season: br.season ?? "",
          eggsLaid: br.eggsLaid ?? 0,
          layDate: br.layDate ?? "",
          expHatch: br.expectedHatchDate ?? "",
          actHatch: br.actualHatchDate ?? "",
          chicks: br.chicksSurvived ?? 0,
          status: br.status ?? "",
          notes: br.notes ?? "",
        });
      }

      // Clutch Eggs sheet
      const broodPairLabel = new Map<number, string>();
      for (const br of broods) broodPairLabel.set(br.id, pairLabel.get(br.pairId) ?? `Pair #${br.pairId}`);
      const broodSeason = new Map<number, string>();
      for (const br of broods) broodSeason.set(br.id, br.season ?? "");

      const eggsSheet = wb.addWorksheet("Clutch Eggs");
      eggsSheet.columns = [
        { header: "Brood (Pair)", key: "brood", width: 30 },
        { header: "Season", key: "season", width: 12 },
        { header: "Egg #", key: "eggNo", width: 10 },
        { header: "Outcome", key: "outcome", width: 18 },
        { header: "Outcome Date", key: "outcomeDate", width: 14 },
        { header: "Resulting Bird", key: "bird", width: 20 },
        { header: "Notes", key: "notes", width: 40 },
      ];
      for (const e of eggs) {
        eggsSheet.addRow({
          brood: broodPairLabel.get(e.broodId) ?? `Brood #${e.broodId}`,
          season: broodSeason.get(e.broodId) ?? "",
          eggNo: e.eggNumber,
          outcome: e.outcome ?? "",
          outcomeDate: e.outcomeDate ?? "",
          bird: e.birdId ? (birdLabel.get(e.birdId) ?? `Bird #${e.birdId}`) : "",
          notes: e.notes ?? "",
        });
      }

      // Events sheet
      const eventsSheet = wb.addWorksheet("Events");
      eventsSheet.columns = [
        { header: "Title", key: "title", width: 28 },
        { header: "Date", key: "date", width: 14 },
        { header: "Type", key: "type", width: 16 },
        { header: "Linked To", key: "linked", width: 24 },
        { header: "Recurrence", key: "recurrence", width: 18 },
        { header: "Completed", key: "completed", width: 12 },
        { header: "Notes", key: "notes", width: 40 },
      ];
      for (const ev of events) {
        let linked = "";
        if (ev.allBirds) linked = "All birds";
        else if (ev.birdId) linked = birdLabel.get(ev.birdId) ?? `Bird #${ev.birdId}`;
        else if (ev.pairId) linked = pairLabel.get(ev.pairId) ?? `Pair #${ev.pairId}`;

        const recurrence = ev.recurrenceUnit && ev.recurrenceInterval
          ? `Every ${ev.recurrenceInterval} ${ev.recurrenceUnit}${ev.isIndefinite ? " (ongoing)" : ""}`
          : "";

        eventsSheet.addRow({
          title: ev.title ?? "",
          date: ev.eventDate ?? "",
          type: ev.eventType ?? "",
          linked,
          recurrence,
          completed: ev.completed ? "Yes" : "No",
          notes: ev.notes ?? "",
        });
      }

      // Custom Species sheet
      if (customSpecies.length > 0) {
        const speciesSheet = wb.addWorksheet("Custom Species");
        speciesSheet.columns = [
          { header: "Common Name", key: "common", width: 24 },
          { header: "Scientific Name", key: "scientific", width: 24 },
          { header: "Category", key: "category", width: 16 },
          { header: "Incubation Days", key: "incubation", width: 16 },
          { header: "Clutch Min", key: "clutchMin", width: 12 },
          { header: "Clutch Max", key: "clutchMax", width: 12 },
          { header: "Fledgling Days", key: "fledgling", width: 16 },
          { header: "Sexual Maturity (months)", key: "maturity", width: 22 },
          { header: "Nest Type", key: "nest", width: 16 },
          { header: "Sexing Method", key: "sexing", width: 16 },
        ];
        for (const s of customSpecies) {
          speciesSheet.addRow({
            common: s.commonName ?? "",
            scientific: s.scientificName ?? "",
            category: s.category ?? "",
            incubation: s.incubationDays ?? "",
            clutchMin: s.clutchSizeMin ?? "",
            clutchMax: s.clutchSizeMax ?? "",
            fledgling: s.fledglingDays ?? "",
            maturity: s.sexualMaturityMonths ?? "",
            nest: s.nestType ?? "",
            sexing: s.sexingMethod ?? "",
          });
        }
      }

      // AI Saved Notes sheet
      if (savedNotes.length > 0) {
        const notesSheet = wb.addWorksheet("AI Saved Notes");
        notesSheet.columns = [
          { header: "Title", key: "title", width: 28 },
          { header: "Content", key: "content", width: 80 },
          { header: "Saved", key: "saved", width: 20 },
        ];
        for (const n of savedNotes) {
          notesSheet.addRow({
            title: n.title ?? "",
            content: n.content ?? "",
            saved: n.createdAt ? new Date(n.createdAt).toLocaleString() : "",
          });
        }
      }

      // Style every sheet's header row + freeze it.
      for (const sheet of wb.worksheets) {
        const header = sheet.getRow(1);
        header.font = { bold: true };
        header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEAFB" } };
        sheet.views = [{ state: "frozen", ySplit: 1 }];
      }

      const xlsxBuffer = Buffer.from(await wb.xlsx.writeBuffer());

      // ── Fetch photos (skip failures, record them for the README) ──────────
      const photoBuffers: { filename: string; data: Buffer }[] = [];
      const photoFailures: string[] = [];
      for (const task of photoTasks) {
        try {
          const data = await storageGetBytes(task.key);
          photoBuffers.push({ filename: task.filename, data });
        } catch (err) {
          photoFailures.push(`${task.filename} (${err instanceof Error ? err.message : "unavailable"})`);
        }
      }

      const readme = buildReadme({
        exportedAt,
        userEmail: userEmail ?? `User #${userId}`,
        counts: {
          birds: birds.length,
          pairs: pairs.length,
          broods: broods.length,
          eggs: eggs.length,
          events: events.length,
          customSpecies: customSpecies.length,
          savedNotes: savedNotes.length,
        },
        photosIncluded: photoBuffers.length,
        photoFailures,
      });

      // ── Stream the zip ────────────────────────────────────────────────────
      const dateStr = exportedAt.toISOString().slice(0, 10); // YYYY-MM-DD
      const zipName = `aviary-manager-export-${dateStr}.zip`;
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

      const archive = new ZipArchive({ zlib: { level: 9 } });
      archive.on("warning", (err: unknown) => console.warn("[export] archive warning:", err));
      archive.on("error", (err: unknown) => {
        console.error("[export] archive error:", err);
        if (!res.headersSent) res.status(500).end();
      });
      archive.pipe(res);

      archive.append(xlsxBuffer, { name: "Aviary Manager Export.xlsx" });
      archive.append(readme, { name: "README.txt" });
      for (const p of photoBuffers) {
        archive.append(p.data, { name: `photos/${p.filename}` });
      }
      await archive.finalize();
    } catch (err) {
      console.error("[export] Failed to build export:", err);
      if (!res.headersSent) res.status(500).json({ error: "Failed to build export" });
    }
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function labelForBird(b: { id: number; name: string | null; ringId: string | null }): string {
  return b.name?.trim() || b.ringId?.trim() || `Bird #${b.id}`;
}

/**
 * Derive the S3 key for a managed bird photo from its stored photoUrl.
 * Managed photos look like "/api/photos/birds/{userId}/file.jpg".
 * Data-URLs and external URLs return null (skipped from the photo bundle).
 */
function managedPhotoKey(photoUrl: string | null | undefined, userId: number): string | null {
  if (!photoUrl) return null;
  let pathname = photoUrl;
  try {
    pathname = new URL(photoUrl, "https://aviarymanager.app").pathname;
  } catch {
    // keep raw string
  }
  const prefix = `/api/photos/birds/${userId}/`;
  if (!pathname.startsWith(prefix)) return null;
  return pathname.slice("/api/photos/".length).replace(/^\/+/, "");
}

/**
 * Decide a unique, readable filename for a bird's photo and queue the fetch.
 * Returns the filename to reference in the workbook, or null if no managed photo.
 */
function planPhotoFilename(
  b: { id: number; name: string | null; ringId: string | null; photoUrl: string | null },
  userId: number,
  used: Set<string>,
  tasks: { key: string; filename: string }[]
): string | null {
  const key = managedPhotoKey(b.photoUrl, userId);
  if (!key) return null;

  const ext = (key.match(/\.([a-z0-9]+)$/i)?.[1] ?? "jpg").toLowerCase();
  const base = sanitizeFilename(labelForBird(b)) || `bird-${b.id}`;
  let filename = `${base}.${ext}`;
  if (used.has(filename.toLowerCase())) {
    filename = `${base} (${b.id}).${ext}`;
  }
  used.add(filename.toLowerCase());
  tasks.push({ key, filename });
  return filename;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\/\\?%*:|"<>]/g, "-") // illegal filename chars
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function ageString(dob: string | null | undefined): string {
  if (!dob) return "";
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "";
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) return "";
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr`;
  return `${years} yr ${rem} mo`;
}

function buildReadme(info: {
  exportedAt: Date;
  userEmail: string;
  counts: Record<string, number>;
  photosIncluded: number;
  photoFailures: string[];
}): string {
  const lines: string[] = [];
  lines.push("Aviary Manager — Data Export");
  lines.push("============================");
  lines.push("");
  lines.push(`Exported: ${info.exportedAt.toLocaleString()}`);
  lines.push(`Account:  ${info.userEmail}`);
  lines.push("");
  lines.push("Contents");
  lines.push("--------");
  lines.push("• Aviary Manager Export.xlsx — your full records, one sheet per type.");
  lines.push("  Open it in Excel, Numbers, or Google Sheets.");
  lines.push("• photos/ — your bird photos, named after each bird.");
  lines.push("");
  lines.push("Records");
  lines.push("-------");
  lines.push(`Birds:          ${info.counts.birds}`);
  lines.push(`Breeding pairs: ${info.counts.pairs}`);
  lines.push(`Broods:         ${info.counts.broods}`);
  lines.push(`Clutch eggs:    ${info.counts.eggs}`);
  lines.push(`Events:         ${info.counts.events}`);
  lines.push(`Custom species: ${info.counts.customSpecies}`);
  lines.push(`AI saved notes: ${info.counts.savedNotes}`);
  lines.push(`Photos:         ${info.photosIncluded}`);
  lines.push("");
  if (info.photoFailures.length > 0) {
    lines.push("Photos that could not be included");
    lines.push("---------------------------------");
    for (const f of info.photoFailures) lines.push(`• ${f}`);
    lines.push("");
  }
  lines.push("This export is yours to keep. Aviary Manager does not need it back —");
  lines.push("it's a complete local copy of your aviary records.");
  lines.push("");
  return lines.join("\n");
}
