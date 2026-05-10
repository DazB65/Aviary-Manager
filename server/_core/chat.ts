/**
 * Chat API Handler
 *
 * Express endpoint for AI SDK streaming chat with tool calling support.
 * Uses patched fetch to fix OpenAI-compatible proxy issues.
 */

import { streamText, stepCountIs, convertToModelMessages, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { Express } from "express";
import { z } from "zod/v4";
import { BirdService } from "../services/birdService";
import { PairService } from "../services/pairService";
import { BroodService } from "../services/broodService";
import { StatsService } from "../services/statsService";
import { SpeciesService } from "../services/speciesService";
import { EventService } from "../services/eventService";
import { PedigreeService } from "../services/pedigreeService";
import { SettingsService } from "../services/settingsService";
import { sdk } from "./sdk";
import {
  CHAT_MAX_OUTPUT_TOKENS,
  getActiveToolsForMessages,
  validateChatMessages,
} from "./chatSafety";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function birdLabel(bird: { id: number; name?: string | null; ringId?: string | null }) {
  return bird.name || bird.ringId || `#${bird.id}`;
}

function inbreedingRisk(coefficient: number) {
  if (coefficient >= 0.125) return "high";
  if (coefficient >= 0.0625) return "moderate";
  if (coefficient > 0) return "low";
  return "none";
}

function parseFavouriteSpeciesIds(value: string | null | undefined): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

async function getOwnedBrood(broodId: number, userId: number) {
  const broods = await BroodService.getBroodsByUser(userId);
  return broods.find((brood: any) => brood.id === broodId);
}

async function getOwnedEvent(eventId: number, userId: number) {
  const events = await EventService.getEventsByUser(userId);
  return events.find((event: any) => event.id === eventId);
}

async function validateEventLinks(userId: number, birdId?: number, pairId?: number) {
  if (birdId !== undefined) {
    const bird = await BirdService.getBirdById(birdId, userId);
    if (!bird) return { ok: false as const, error: "Bird not found." };
  }

  if (pairId !== undefined) {
    const pair = await PairService.getPairById(pairId, userId);
    if (!pair) return { ok: false as const, error: "Pair not found." };
  }

  return { ok: true as const };
}

function logAiTool(
  userId: number,
  toolName: string,
  status: "success" | "blocked" | "error",
  target: Record<string, number | string | undefined> = {}
) {
  const targetText = Object.entries(target)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  console.log(`[chat:tool] userId=${userId} tool=${toolName} status=${status}${targetText ? ` ${targetText}` : ""}`);
}

/**
 * Creates an OpenAI-compatible provider with patched fetch.
 */
function createLLMProvider() {
  const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL ?? "";
  const baseURL = forgeApiUrl.endsWith("/v1") ? forgeApiUrl : `${forgeApiUrl}/v1`;

  return createOpenAI({
    baseURL,
    apiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  });
}

/**
 * Example tool registry - customize these for your app.
 */
const tools = (userId: number) => ({
  getFlockStats: tool({
    description: "Get the total number of birds, active pairs, and eggs incubating for the user's aviary flock.",
    inputSchema: z.object({}),
    execute: async () => {
      const stats = await StatsService.getDashboardStatsByUser(userId);
      return stats;
    },
  }),

  searchBirds: tool({
    description: "Search for birds in the aviary. You can filter by species name, ring ID, gender, or status.",
    inputSchema: z.object({
      query: z.string().describe("Optional search term to match against bird name, species, ringId, or color").optional(),
      status: z.enum(["alive", "breeding", "resting", "deceased", "sold", "unknown"]).optional(),
      gender: z.enum(["male", "female", "unknown"]).optional(),
    }),
    execute: async ({ query, status, gender }) => {
      const birds = await BirdService.getBirdsByUser(userId);
      const speciesList = await SpeciesService.getAllSpecies(userId);

      const speciesMap = Object.fromEntries(speciesList.map(s => [s.id, s.commonName.toLowerCase()]));

      return birds
        .filter(b => {
          if (status && b.status !== status) return false;
          if (gender && b.gender !== gender) return false;

          if (query) {
            const q = query.toLowerCase();
            const speciesName = speciesMap[b.speciesId] || "";
            return (
              b.name?.toLowerCase().includes(q) ||
              b.ringId?.toLowerCase().includes(q) ||
              b.colorMutation?.toLowerCase().includes(q) ||
              speciesName.includes(q)
            );
          }
          return true;
        })
        .slice(0, 10); // return at most 10 to avoid token limits
    },
  }),

  getUpcomingEvents: tool({
    description: "Get a list of upcoming events and reminders (like vet visits, banding, weaning) for the aviary.",
    inputSchema: z.object({}),
    execute: async () => {
      const events = await EventService.getEventsByUser(userId);
      const today = new Date().toISOString().split("T")[0];
      return events.filter(e => {
        const d = String(e.eventDate).includes("T") ? String(e.eventDate).split("T")[0] : String(e.eventDate);
        return !e.completed && d >= today;
      }).sort((a, b) => a.eventDate < b.eventDate ? -1 : 1).slice(0, 5);
    },
  }),

  getMutationSummary: tool({
    description: "Get a full list of all birds in the aviary with their colour mutations and species, for use in pairing recommendations or mutation analysis. Returns all birds, not just a subset.",
    inputSchema: z.object({}),
    execute: async () => {
      const birds = await BirdService.getBirdsByUser(userId);
      const speciesList = await SpeciesService.getAllSpecies(userId);
      const speciesMap = Object.fromEntries(speciesList.map(s => [s.id, s.commonName]));

      return birds
        .filter(b => b.status !== "deceased" && b.status !== "sold")
        .map(b => ({
          id: b.id,
          name: b.name || b.ringId || `#${b.id}`,
          ringId: b.ringId,
          gender: b.gender,
          species: speciesMap[b.speciesId] || "Unknown",
          colorMutation: b.colorMutation || "Normal/Wild-type",
          status: b.status,
        }));
    },
  }),

  getPairEggStats: tool({
    description: "Get egg and brood statistics for specific breeding pairs or all pairs.",
    inputSchema: z.object({
      pairId: z.number().describe("Optional pair ID to get stats for a specific pair").optional(),
    }),
    execute: async ({ pairId }) => {
      let pairs = await PairService.getPairsByUser(userId);
      if (pairId) {
        pairs = pairs.filter(p => p.id === pairId);
      }

      const allBroods = await BroodService.getBroodsByUser(userId);
      const allBirds = await BirdService.getBirdsByUser(userId);
      const birdMap = Object.fromEntries(allBirds.map(b => [b.id, b]));

      return pairs.map(pair => {
        const pairBroods = allBroods.filter(b => b.pairId === pair.id);
        const male = birdMap[pair.maleId];
        const female = birdMap[pair.femaleId];

        const mName = male ? male.name || male.ringId || `#${male.id}` : "?";
        const fName = female ? female.name || female.ringId || `#${female.id}` : "?";

        const totalClutches = pairBroods.length;
        const totalEggsLaid = pairBroods.reduce((sum, b) => sum + (b.eggsLaid || 0), 0);
        const totalChicksSurvived = pairBroods.reduce((sum, b) => sum + (b.chicksSurvived || 0), 0);

        return {
          pairId: pair.id,
          pairLabel: `${mName} × ${fName}`,
          cageNumber: male?.cageNumber || female?.cageNumber || "Unknown",
          totalClutches,
          totalEggsLaid,
          totalChicksSurvived,
          hatchRate: totalEggsLaid > 0 ? Math.round((totalChicksSurvived / totalEggsLaid) * 100) : 0
        };
      });
    },
  }),

  // ── Action tools ────────────────────────────────────────────────────────────

  createBreedingPair: tool({
    description: "Pair two birds together as a breeding pair. Always use searchBirds first to confirm the correct birds before calling this.",
    inputSchema: z.object({
      maleId: z.number().describe("ID of the male bird"),
      femaleId: z.number().describe("ID of the female bird"),
      season: z.number().int().optional().describe("The current breeding season year. ALWAYS default to the current calendar year unless the user explicitly specifies a different season. Never infer the season from bird names or ring IDs."),
      notes: z.string().optional().describe("Optional notes about this pairing"),
    }),
    needsApproval: true,
    execute: async ({ maleId, femaleId, season, notes }) => {
      try {
        const male = await BirdService.getBirdById(maleId, userId);
        if (!male) return { success: false, error: "Male bird not found" };
        const female = await BirdService.getBirdById(femaleId, userId);
        if (!female) return { success: false, error: "Female bird not found" };
        if (male.gender === "female" || female.gender === "male") {
          logAiTool(userId, "createBreedingPair", "blocked", { maleId, femaleId });
          return { success: false, error: "Those birds do not match the requested male/female pairing. Please confirm the birds first." };
        }

        const currentYear = new Date().getFullYear();
        const pair = await PairService.createPair({
          userId,
          maleId,
          femaleId,
          season: season ?? currentYear,
          status: "active",
          pairingDate: new Date().toISOString().split("T")[0],
          notes: notes ?? null,
        });

        const maleName = male.name || male.ringId || `#${male.id}`;
        const femaleName = female.name || female.ringId || `#${female.id}`;
        logAiTool(userId, "createBreedingPair", "success", { pairId: pair.id, maleId, femaleId });
        return { success: true, pairId: pair.id, maleName, femaleName, season: season ?? currentYear };
      } catch (e: any) {
        if (e?.message?.includes("already exists") || e?.code === "23505") {
          return { success: false, error: "This pair already exists for that season." };
        }
        logAiTool(userId, "createBreedingPair", "error", { maleId, femaleId });
        return { success: false, error: "Failed to create pair. Please try again." };
      }
    },
  }),

  updatePairStatus: tool({
    description: "Update the status of a breeding pair (active, resting, or retired). Use getPairEggStats to find the pair ID first.",
    inputSchema: z.object({
      pairId: z.number().describe("ID of the breeding pair to update"),
      status: z.enum(["active", "breeding", "resting", "retired"]).describe("New status for the pair"),
      notes: z.string().optional().describe("Optional notes to append"),
    }),
    needsApproval: true,
    execute: async ({ pairId, status, notes }) => {
      try {
        const pair = await PairService.getPairById(pairId, userId);
        if (!pair) return { success: false, error: "Pair not found" };

        await PairService.updatePair(pairId, userId, {
          status,
          ...(notes !== undefined ? { notes } : {}),
        });

        logAiTool(userId, "updatePairStatus", "success", { pairId, status });
        return { success: true, pairId, status };
      } catch {
        logAiTool(userId, "updatePairStatus", "error", { pairId });
        return { success: false, error: "Failed to update pair status. Please try again." };
      }
    },
  }),

  recordClutch: tool({
    description: "Record a new clutch (brood) for a breeding pair. This logs how many eggs were laid and auto-calculates fertility check and hatch dates.",
    inputSchema: z.object({
      pairId: z.number().describe("ID of the breeding pair"),
      eggsLaid: z.number().int().min(1).describe("Number of eggs laid"),
      layDate: z.string().optional().describe("Date eggs were laid in YYYY-MM-DD format. Defaults to today."),
      incubationDays: z.number().int().min(1).optional().describe("Incubation period in days. Defaults to 14."),
      notes: z.string().optional().describe("Optional notes about this clutch"),
    }),
    needsApproval: true,
    execute: async ({ pairId, eggsLaid, layDate, incubationDays, notes }) => {
      try {
        const pair = await PairService.getPairById(pairId, userId);
        if (!pair) return { success: false, error: "Pair not found" };

        const baseDate = layDate || new Date().toISOString().split("T")[0];
        const days = incubationDays ?? 14;
        const fertilityCheckDate = addDays(baseDate, 7);
        const expectedHatchDate = addDays(baseDate, days);
        const season = String(new Date(baseDate).getFullYear());

        const brood = await BroodService.createBrood({
          userId,
          pairId,
          season,
          eggsLaid,
          layDate: baseDate,
          fertilityCheckDate,
          expectedHatchDate,
          status: "incubating",
          notes: notes ?? null,
        } as any);

        await EventService.syncBroodEvents(userId, pairId, brood.id, fertilityCheckDate, expectedHatchDate);
        await BroodService.syncClutchEggs(brood.id, userId, eggsLaid);

        logAiTool(userId, "recordClutch", "success", { pairId, broodId: brood.id, eggsLaid });
        return {
          success: true,
          broodId: brood.id,
          eggsLaid,
          layDate: baseDate,
          fertilityCheckDate,
          expectedHatchDate,
        };
      } catch {
        logAiTool(userId, "recordClutch", "error", { pairId });
        return { success: false, error: "Failed to record clutch. Please try again." };
      }
    },
  }),

  addEvent: tool({
    description: "Add a reminder or event to the aviary calendar, such as a vet visit, banding, weaning, or medication.",
    inputSchema: z.object({
      title: z.string().describe("Title of the event"),
      eventDate: z.string().describe("Date of the event in YYYY-MM-DD format"),
      eventType: z.enum(["vet", "banding", "medication", "weaning", "sale", "other"]).describe("Type of event"),
      notes: z.string().optional().describe("Optional notes about the event"),
      birdId: z.number().optional().describe("Optional bird ID to link this event to a specific bird"),
      pairId: z.number().optional().describe("Optional pair ID to link this event to a specific pair"),
    }),
    needsApproval: true,
    execute: async ({ title, eventDate, eventType, notes, birdId, pairId }) => {
      try {
        const links = await validateEventLinks(userId, birdId, pairId);
        if (!links.ok) {
          logAiTool(userId, "addEvent", "blocked", { birdId, pairId });
          return { success: false, error: links.error };
        }

        const event = await EventService.createEvent({
          userId,
          title,
          eventDate,
          eventType,
          notes: notes ?? null,
          birdId: birdId ?? null,
          pairId: pairId ?? null,
        } as any);

        logAiTool(userId, "addEvent", "success", { eventId: event.id, birdId, pairId });
        return { success: true, eventId: event.id, title, eventDate };
      } catch {
        logAiTool(userId, "addEvent", "error", { birdId, pairId });
        return { success: false, error: "Failed to add event. Please try again." };
      }
    },
  }),

  updateBirdStatus: tool({
    description: "Update the status of a bird (alive, breeding, resting, deceased, sold, unknown). Use searchBirds to find the bird ID first.",
    inputSchema: z.object({
      birdId: z.number().describe("ID of the bird to update"),
      status: z.enum(["alive", "breeding", "resting", "deceased", "sold", "unknown"]).describe("New status for the bird"),
    }),
    needsApproval: true,
    execute: async ({ birdId, status }) => {
      try {
        const bird = await BirdService.getBirdById(birdId, userId);
        if (!bird) return { success: false, error: "Bird not found" };

        await BirdService.updateBird(birdId, userId, { status });

        const birdName = bird.name || bird.ringId || `#${bird.id}`;
        logAiTool(userId, "updateBirdStatus", "success", { birdId, status });
        return { success: true, birdId, birdName, status };
      } catch {
        logAiTool(userId, "updateBirdStatus", "error", { birdId });
        return { success: false, error: "Failed to update bird status. Please try again." };
      }
    },
  }),

  updateBird: tool({
    description: "Update details of a bird such as cage number, name, notes, or ring ID. Use searchBirds to find the bird ID first.",
    inputSchema: z.object({
      birdId: z.number().describe("ID of the bird to update"),
      cageNumber: z.string().optional().describe("Cage number or label, e.g. '5' or 'Cage A'"),
      name: z.string().optional().describe("Bird's name"),
      ringId: z.string().optional().describe("Ring or band ID"),
      notes: z.string().optional().describe("Notes about the bird"),
    }),
    needsApproval: true,
    execute: async ({ birdId, cageNumber, name, ringId, notes }) => {
      try {
        const bird = await BirdService.getBirdById(birdId, userId);
        if (!bird) return { success: false, error: "Bird not found" };

        const updates: Record<string, string> = {};
        if (cageNumber !== undefined) updates.cageNumber = cageNumber;
        if (name !== undefined) updates.name = name;
        if (ringId !== undefined) updates.ringId = ringId;
        if (notes !== undefined) updates.notes = notes;

        await BirdService.updateBird(birdId, userId, updates as any);

        const birdName = bird.name || bird.ringId || `#${bird.id}`;
        logAiTool(userId, "updateBird", "success", { birdId });
        return { success: true, birdId, birdName, updated: updates };
      } catch {
        logAiTool(userId, "updateBird", "error", { birdId });
        return { success: false, error: "Failed to update bird. Please try again." };
      }
    },
  }),

  addBird: tool({
    description: "Open the Add Bird form pre-filled with the details the user has provided. Use this when the user wants to register a new bird — it opens the form for them to review and confirm before saving. Use searchBirds to find a speciesId from an existing bird of the same species first.",
    inputSchema: z.object({
      speciesId: z.number().describe("Species ID — get this from an existing bird of the same species using searchBirds"),
      name: z.string().optional().describe("Bird's name"),
      ringId: z.string().optional().describe("Ring or band ID"),
      gender: z.enum(["male", "female", "unknown"]).optional().describe("Bird's gender"),
      cageNumber: z.string().optional().describe("Cage number"),
      colorMutation: z.string().optional().describe("Colour mutation, e.g. 'Lutino', 'Pied'"),
      dateOfBirth: z.string().optional().describe("Date of birth in YYYY-MM-DD format"),
      notes: z.string().optional().describe("Notes about the bird"),
    }),
    needsApproval: true,
    execute: async ({ speciesId, name, ringId, gender, cageNumber, colorMutation, dateOfBirth, notes }) => {
      const species = await SpeciesService.getAllSpecies(userId);
      if (!species.some((item) => item.id === speciesId)) {
        logAiTool(userId, "addBird", "blocked", { speciesId });
        return { success: false, error: "Species not found." };
      }
      logAiTool(userId, "addBird", "success", { speciesId });
      return {
        uiAction: "openAddBirdModal",
        prefill: { speciesId, name, ringId, gender, cageNumber, colorMutation, dateOfBirth, notes },
      };
    },
  }),

  deletePair: tool({
    description: "PERMANENTLY delete an entire breeding pair AND all its clutches, eggs, and history. This is irreversible. Only use this if the user explicitly says 'delete the pair' or 'remove the pair'. If the user says 'remove a clutch', 'delete a clutch', or 'remove eggs', use deleteClutch instead.",
    inputSchema: z.object({
      pairId: z.number().describe("ID of the breeding pair to delete"),
    }),
    needsApproval: true,
    execute: async ({ pairId }) => {
      try {
        const pair = await PairService.getPairById(pairId, userId);
        if (!pair) return { success: false, error: "Pair not found" };

        await PairService.deletePair(pairId, userId);
        logAiTool(userId, "deletePair", "success", { pairId });
        return { success: true, pairId };
      } catch {
        logAiTool(userId, "deletePair", "error", { pairId });
        return { success: false, error: "Failed to delete pair. Please try again." };
      }
    },
  }),

  updateClutch: tool({
    description: "Update a clutch/brood — change egg count, status, hatch date, or chicks survived. Use getPairEggStats to find the brood ID first.",
    inputSchema: z.object({
      broodId: z.number().describe("ID of the brood/clutch to update"),
      eggsLaid: z.number().int().min(0).optional().describe("Updated number of eggs laid"),
      status: z.enum(["incubating", "hatched", "failed", "abandoned"]).optional().describe("Updated status"),
      actualHatchDate: z.string().optional().describe("Actual hatch date in YYYY-MM-DD format"),
      chicksSurvived: z.number().int().min(0).optional().describe("Number of chicks that survived"),
      notes: z.string().optional().describe("Notes about the clutch"),
    }),
    needsApproval: true,
    execute: async ({ broodId, eggsLaid, status, actualHatchDate, chicksSurvived, notes }) => {
      try {
        const brood = await getOwnedBrood(broodId, userId);
        if (!brood) return { success: false, error: "Clutch not found." };

        const updates: Record<string, any> = {};
        if (eggsLaid !== undefined) updates.eggsLaid = eggsLaid;
        if (status !== undefined) updates.status = status;
        if (actualHatchDate !== undefined) updates.actualHatchDate = actualHatchDate;
        if (chicksSurvived !== undefined) updates.chicksSurvived = chicksSurvived;
        if (notes !== undefined) updates.notes = notes;

        await BroodService.updateBrood(broodId, userId, updates);

        if (eggsLaid !== undefined) {
          await BroodService.syncClutchEggs(broodId, userId, eggsLaid);
        }

        logAiTool(userId, "updateClutch", "success", { broodId });
        return { success: true, broodId, updated: updates };
      } catch {
        logAiTool(userId, "updateClutch", "error", { broodId });
        return { success: false, error: "Failed to update clutch. Please try again." };
      }
    },
  }),

  deleteClutch: tool({
    description: "Delete a single clutch/brood record and its eggs. Use this when the user says 'remove a clutch', 'delete a clutch', or 'remove the eggs'. This does NOT delete the pair. Use getPairEggStats to find the brood ID first.",
    inputSchema: z.object({
      broodId: z.number().describe("ID of the brood/clutch to delete"),
    }),
    needsApproval: true,
    execute: async ({ broodId }) => {
      try {
        const brood = await getOwnedBrood(broodId, userId);
        if (!brood) return { success: false, error: "Clutch not found." };
        await BroodService.deleteBrood(broodId, userId);
        logAiTool(userId, "deleteClutch", "success", { broodId });
        return { success: true, broodId };
      } catch {
        logAiTool(userId, "deleteClutch", "error", { broodId });
        return { success: false, error: "Failed to delete clutch. Please try again." };
      }
    },
  }),

  recordHatch: tool({
    description: "Record that a clutch has hatched — set the hatch date, number of chicks survived, and mark the brood as hatched.",
    inputSchema: z.object({
      broodId: z.number().describe("ID of the brood/clutch that hatched"),
      chicksSurvived: z.number().int().min(0).describe("Number of chicks that survived"),
      actualHatchDate: z.string().optional().describe("Actual hatch date in YYYY-MM-DD format. Defaults to today."),
    }),
    needsApproval: true,
    execute: async ({ broodId, chicksSurvived, actualHatchDate }) => {
      try {
        const brood = await getOwnedBrood(broodId, userId);
        if (!brood) return { success: false, error: "Clutch not found." };
        const hatchDate = actualHatchDate || new Date().toISOString().split("T")[0];
        await BroodService.updateBrood(broodId, userId, {
          status: "hatched",
          chicksSurvived,
          actualHatchDate: hatchDate,
        });
        logAiTool(userId, "recordHatch", "success", { broodId, chicksSurvived });
        return { success: true, broodId, chicksSurvived, hatchDate };
      } catch {
        logAiTool(userId, "recordHatch", "error", { broodId });
        return { success: false, error: "Failed to record hatch. Please try again." };
      }
    },
  }),

  listPairs: tool({
    description: "List all breeding pairs with their bird names, status, season, and cage. Use this when the user asks what pairs they have.",
    inputSchema: z.object({
      status: z.enum(["active", "breeding", "resting", "retired"]).optional().describe("Filter by status"),
    }),
    execute: async ({ status }) => {
      try {
        let pairs = await PairService.getPairsByUser(userId);
        if (status) pairs = pairs.filter(p => p.status === status);

        const allBirds = await BirdService.getBirdsByUser(userId);
        const birdMap = Object.fromEntries(allBirds.map(b => [b.id, b]));

        return pairs.map(p => {
          const male = birdMap[p.maleId];
          const female = birdMap[p.femaleId];
          return {
            pairId: p.id,
            male: male ? (male.name || male.ringId || `#${male.id}`) : "Unknown",
            female: female ? (female.name || female.ringId || `#${female.id}`) : "Unknown",
            status: p.status,
            season: p.season,
            cage: male?.cageNumber || female?.cageNumber || "No cage set",
            notes: p.notes,
          };
        });
      } catch {
        return { success: false, error: "Failed to list pairs." };
      }
    },
  }),

  getBirdDetails: tool({
    description: "Get full details for a specific bird including status, cage, mutation, date of birth, and breeding history. Use searchBirds to find the bird ID first.",
    inputSchema: z.object({
      birdId: z.number().describe("ID of the bird"),
    }),
    execute: async ({ birdId }) => {
      try {
        const bird = await BirdService.getBirdById(birdId, userId);
        if (!bird) return { success: false, error: "Bird not found." };
        const history = await BroodService.getBreedingHistoryByBird(birdId, userId);
        return {
          id: bird.id,
          name: bird.name,
          ringId: bird.ringId,
          gender: bird.gender,
          status: bird.status,
          cageNumber: bird.cageNumber,
          colorMutation: bird.colorMutation,
          dateOfBirth: bird.dateOfBirth,
          notes: bird.notes,
          breedingHistory: history.map((h: any) => ({
            season: h.season,
            partner: h.partnerName,
            clutches: h.clutches?.length ?? 0,
          })),
        };
      } catch {
        return { success: false, error: "Failed to get bird details." };
      }
    },
  }),

  deleteBird: tool({
    description: "Permanently delete a bird from the registry. Only do this if the user explicitly asks to delete a bird. Use searchBirds to confirm the bird ID first.",
    inputSchema: z.object({
      birdId: z.number().describe("ID of the bird to delete"),
    }),
    needsApproval: true,
    execute: async ({ birdId }) => {
      try {
        const bird = await BirdService.getBirdById(birdId, userId);
        if (!bird) return { success: false, error: "Bird not found." };
        const birdName = bird.name || bird.ringId || `#${bird.id}`;
        await BirdService.deleteBird(birdId, userId);
        logAiTool(userId, "deleteBird", "success", { birdId });
        return { success: true, birdId, birdName };
      } catch {
        logAiTool(userId, "deleteBird", "error", { birdId });
        return { success: false, error: "Failed to delete bird. Please try again." };
      }
    },
  }),

  updateEvent: tool({
    description: "Update an existing event — change the title, date, notes, or type. Use getUpcomingEvents to find the event ID first.",
    inputSchema: z.object({
      eventId: z.number().describe("ID of the event to update"),
      title: z.string().optional().describe("New title for the event"),
      date: z.string().optional().describe("New date in YYYY-MM-DD format"),
      notes: z.string().optional().describe("Notes about the event"),
      type: z.enum(["vet", "banding", "medication", "weaning", "sale", "other"]).optional().describe("Event type"),
    }),
    needsApproval: true,
    execute: async ({ eventId, title, date, notes, type }) => {
      try {
        const event = await getOwnedEvent(eventId, userId);
        if (!event) return { success: false, error: "Event not found." };

        const updates: Record<string, any> = {};
        if (title !== undefined) updates.title = title;
        if (date !== undefined) updates.eventDate = date;
        if (notes !== undefined) updates.notes = notes;
        if (type !== undefined) updates.eventType = type;
        await EventService.updateEvent(eventId, userId, updates);
        logAiTool(userId, "updateEvent", "success", { eventId });
        return { success: true, eventId, updated: updates };
      } catch {
        logAiTool(userId, "updateEvent", "error", { eventId });
        return { success: false, error: "Failed to update event. Please try again." };
      }
    },
  }),

  deleteEvent: tool({
    description: "Delete an event or reminder. Use getUpcomingEvents to find the event ID first. Only do this if the user explicitly asks to delete or cancel an event.",
    inputSchema: z.object({
      eventId: z.number().describe("ID of the event to delete"),
    }),
    needsApproval: true,
    execute: async ({ eventId }) => {
      try {
        const event = await getOwnedEvent(eventId, userId);
        if (!event) return { success: false, error: "Event not found." };
        await EventService.deleteEvent(eventId, userId);
        logAiTool(userId, "deleteEvent", "success", { eventId });
        return { success: true, eventId };
      } catch {
        logAiTool(userId, "deleteEvent", "error", { eventId });
        return { success: false, error: "Failed to delete event. Please try again." };
      }
    },
  }),

  markEventComplete: tool({
    description: "Mark an event or reminder as completed (or uncompleted). Use getUpcomingEvents to find the event ID first.",
    inputSchema: z.object({
      eventId: z.number().describe("ID of the event to toggle"),
    }),
    needsApproval: true,
    execute: async ({ eventId }) => {
      try {
        const event = await getOwnedEvent(eventId, userId);
        if (!event) return { success: false, error: "Event not found." };
        await EventService.toggleEventComplete(eventId, userId);
        logAiTool(userId, "markEventComplete", "success", { eventId });
        return { success: true, eventId };
      } catch {
        logAiTool(userId, "markEventComplete", "error", { eventId });
        return { success: false, error: "Failed to update event. Please try again." };
      }
    },
  }),

  recordEggOutcome: tool({
    description: "Record the outcome of a specific egg in a clutch — e.g. mark it as infertile, cracked, hatched, or died. Use getPairEggStats to find the brood ID first.",
    inputSchema: z.object({
      broodId: z.number().describe("ID of the brood/clutch"),
      eggNumber: z.number().int().min(1).describe("Egg number within the clutch (1-based)"),
      status: z.enum(["incubating", "hatched", "infertile", "cracked", "died", "missing", "abandoned"]).describe("Outcome for this egg"),
    }),
    needsApproval: true,
    execute: async ({ broodId, eggNumber, status }) => {
      try {
        const brood = await getOwnedBrood(broodId, userId);
        if (!brood) return { success: false, error: "Clutch not found." };
        await BroodService.upsertClutchEgg(broodId, userId, eggNumber, status as any);
        logAiTool(userId, "recordEggOutcome", "success", { broodId, eggNumber });
        return { success: true, broodId, eggNumber, status };
      } catch {
        logAiTool(userId, "recordEggOutcome", "error", { broodId, eggNumber });
        return { success: false, error: "Failed to record egg outcome. Please try again." };
      }
    },
  }),

  getUpcomingHatches: tool({
    description: "Get clutches with upcoming expected hatch dates. Use this when the user asks what hatches are due soon.",
    inputSchema: z.object({
      days: z.number().int().min(1).max(90).optional().describe("How many days ahead to look (default 14)"),
    }),
    execute: async ({ days = 14 }) => {
      try {
        const broods = await BroodService.getBroodsByUser(userId);
        const allBirds = await BirdService.getBirdsByUser(userId);
        const birdMap = Object.fromEntries(allBirds.map(b => [b.id, b]));
        const allPairs = await PairService.getPairsByUser(userId);
        const pairMap = Object.fromEntries(allPairs.map(p => [p.id, p]));

        const today = new Date();
        const cutoff = new Date(today.getTime() + days * 86400000);

        return broods
          .filter((b: any) => b.expectedHatchDate && b.status === "incubating")
          .filter((b: any) => {
            const d = new Date(b.expectedHatchDate);
            return d >= today && d <= cutoff;
          })
          .map((b: any) => {
            const pair = pairMap[b.pairId];
            const male = pair ? birdMap[pair.maleId] : null;
            const female = pair ? birdMap[pair.femaleId] : null;
            return {
              broodId: b.id,
              pair: male && female
                ? `${male.name || male.ringId} x ${female.name || female.ringId}`
                : `Pair #${b.pairId}`,
              eggsLaid: b.eggsLaid,
              expectedHatchDate: b.expectedHatchDate,
              daysUntilHatch: Math.ceil((new Date(b.expectedHatchDate).getTime() - today.getTime()) / 86400000),
            };
          })
          .sort((a: any, b: any) => a.daysUntilHatch - b.daysUntilHatch);
      } catch {
        return { success: false, error: "Failed to get upcoming hatches." };
      }
    },
  }),

  getPairHistory: tool({
    description: "Get full clutch history for a specific breeding pair including all broods, egg counts, and hatch results.",
    inputSchema: z.object({
      pairId: z.number().describe("ID of the breeding pair"),
    }),
    execute: async ({ pairId }) => {
      try {
        const pair = await PairService.getPairById(pairId, userId);
        if (!pair) return { success: false, error: "Pair not found." };

        const allBirds = await BirdService.getBirdsByUser(userId);
        const birdMap = Object.fromEntries(allBirds.map(b => [b.id, b]));
        const male = birdMap[pair.maleId];
        const female = birdMap[pair.femaleId];

        const broods = await BroodService.getBroodsByPair(pairId, userId);
        return {
          pairId,
          male: male ? (male.name || male.ringId || `#${male.id}`) : "Unknown",
          female: female ? (female.name || female.ringId || `#${female.id}`) : "Unknown",
          status: pair.status,
          season: pair.season,
          clutches: broods.map((b: any) => ({
            broodId: b.id,
            clutchNumber: b.clutchNumber,
            eggsLaid: b.eggsLaid,
            status: b.status,
            layDate: b.layDate,
            expectedHatchDate: b.expectedHatchDate,
            actualHatchDate: b.actualHatchDate,
            chicksSurvived: b.chicksSurvived,
          })),
        };
      } catch {
        return { success: false, error: "Failed to get pair history." };
      }
    },
  }),

  getSpeciesInfo: tool({
    description: "Get species husbandry details such as incubation days, clutch size, fledging days, maturity, nest type, and sexing method.",
    inputSchema: z.object({
      speciesId: z.number().optional().describe("Optional species ID to fetch one species"),
      query: z.string().optional().describe("Optional species name search"),
    }),
    execute: async ({ speciesId, query }) => {
      try {
        const speciesList = await SpeciesService.getAllSpecies(userId);
        const q = query?.toLowerCase();
        return speciesList
          .filter((s) => (speciesId ? s.id === speciesId : true))
          .filter((s) => (q ? s.commonName.toLowerCase().includes(q) || s.scientificName?.toLowerCase().includes(q) : true))
          .slice(0, speciesId ? 1 : 10)
          .map((s) => ({
            id: s.id,
            commonName: s.commonName,
            scientificName: s.scientificName,
            category: s.category,
            incubationDays: s.incubationDays,
            clutchSizeMin: s.clutchSizeMin,
            clutchSizeMax: s.clutchSizeMax,
            fledglingDays: s.fledglingDays,
            sexualMaturityMonths: s.sexualMaturityMonths,
            nestType: s.nestType,
            sexingMethod: s.sexingMethod,
            isCustom: s.isCustom,
          }));
      } catch {
        return { success: false, error: "Failed to get species information." };
      }
    },
  }),

  getUserSettings: tool({
    description: "Get the user's aviary preferences such as breeding year, default species, and favourite species.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const settings = await SettingsService.getUserSettings(userId);
        const speciesList = await SpeciesService.getAllSpecies(userId);
        const speciesMap = Object.fromEntries(speciesList.map((s) => [s.id, s.commonName]));
        const favouriteSpeciesIds = parseFavouriteSpeciesIds(settings?.favouriteSpeciesIds);
        return {
          breedingYear: settings?.breedingYear ?? new Date().getFullYear(),
          defaultSpeciesId: settings?.defaultSpeciesId ?? null,
          defaultSpecies: settings?.defaultSpeciesId ? speciesMap[settings.defaultSpeciesId] ?? null : null,
          favouriteSpecies: favouriteSpeciesIds.map((id) => ({ id, name: speciesMap[id] ?? "Unknown" })),
        };
      } catch {
        return { success: false, error: "Failed to get user settings." };
      }
    },
  }),

  getPedigreeSummary: tool({
    description: "Get pedigree context for a bird: parents, siblings, descendants, and known ancestors.",
    inputSchema: z.object({
      birdId: z.number().describe("ID of the bird"),
    }),
    execute: async ({ birdId }) => {
      try {
        const bird = await BirdService.getBirdById(birdId, userId);
        if (!bird) return { success: false, error: "Bird not found." };

        const pedigree = await PedigreeService.getPedigree(birdId, userId, 4);
        const siblings = await PedigreeService.getSiblings(birdId, userId);
        const descendants = await PedigreeService.getDescendants(birdId, userId);
        const allBirds = await BirdService.getBirdsByUser(userId);
        const birdMap = Object.fromEntries(allBirds.map((b) => [b.id, b]));
        const ancestors = Object.values(pedigree).filter((b: any) => b.id !== birdId);

        return {
          bird: { id: bird.id, name: birdLabel(bird), gender: bird.gender, status: bird.status },
          father: bird.fatherId && birdMap[bird.fatherId] ? { id: bird.fatherId, name: birdLabel(birdMap[bird.fatherId]) } : null,
          mother: bird.motherId && birdMap[bird.motherId] ? { id: bird.motherId, name: birdLabel(birdMap[bird.motherId]) } : null,
          siblings: siblings.slice(0, 20).map((s: any) => ({ id: s.id, name: birdLabel(s), type: s.siblingType, gender: s.gender, status: s.status })),
          descendants: descendants.slice(0, 20).map((d: any) => ({ id: d.id, name: birdLabel(d), gender: d.gender, status: d.status })),
          ancestorCount: ancestors.length,
          ancestors: ancestors.slice(0, 20).map((a: any) => ({ id: a.id, name: birdLabel(a), gender: a.gender })),
        };
      } catch {
        return { success: false, error: "Failed to get pedigree summary." };
      }
    },
  }),

  getInbreedingRisk: tool({
    description: "Calculate inbreeding risk for a proposed male and female bird pairing.",
    inputSchema: z.object({
      maleId: z.number().describe("ID of the male bird"),
      femaleId: z.number().describe("ID of the female bird"),
    }),
    execute: async ({ maleId, femaleId }) => {
      try {
        const male = await BirdService.getBirdById(maleId, userId);
        const female = await BirdService.getBirdById(femaleId, userId);
        if (!male || !female) return { success: false, error: "Bird not found." };
        const coefficient = await PedigreeService.calcInbreedingCoefficient(maleId, femaleId, userId);
        return {
          male: { id: male.id, name: birdLabel(male), gender: male.gender },
          female: { id: female.id, name: birdLabel(female), gender: female.gender },
          coefficient,
          percentage: Math.round(coefficient * 10000) / 100,
          risk: inbreedingRisk(coefficient),
        };
      } catch {
        return { success: false, error: "Failed to calculate inbreeding risk." };
      }
    },
  }),

  getEggDetails: tool({
    description: "Get individual egg outcomes, dates, notes, and linked birds for one clutch or all clutches.",
    inputSchema: z.object({
      broodId: z.number().optional().describe("Optional brood/clutch ID"),
    }),
    execute: async ({ broodId }) => {
      try {
        const broods = await BroodService.getBroodsByUser(userId);
        const ownedBroodIds = new Set(broods.map((b: any) => b.id));
        if (broodId && !ownedBroodIds.has(broodId)) return { success: false, error: "Clutch not found." };

        const eggs = await BroodService.getEggsByUser(userId);
        const birds = await BirdService.getBirdsByUser(userId);
        const birdMap = Object.fromEntries(birds.map((b) => [b.id, b]));
        const broodMap = Object.fromEntries(broods.map((b: any) => [b.id, b]));

        return eggs
          .filter((egg: any) => (broodId ? egg.broodId === broodId : ownedBroodIds.has(egg.broodId)))
          .slice(0, 80)
          .map((egg: any) => ({
            broodId: egg.broodId,
            clutchNumber: broodMap[egg.broodId]?.clutchNumber,
            eggNumber: egg.eggNumber,
            outcome: egg.outcome,
            outcomeDate: egg.outcomeDate,
            notes: egg.notes,
            linkedBird: egg.birdId && birdMap[egg.birdId] ? { id: egg.birdId, name: birdLabel(birdMap[egg.birdId]) } : null,
          }));
      } catch {
        return { success: false, error: "Failed to get egg details." };
      }
    },
  }),

  getAttentionReport: tool({
    description: "Summarise what needs attention today: overdue events, upcoming events, fertility checks, upcoming hatches, and active clutches.",
    inputSchema: z.object({
      days: z.number().int().min(1).max(30).optional().describe("Days ahead to include, default 7"),
    }),
    execute: async ({ days = 7 }) => {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const futureStr = new Date(today.getTime() + days * 86400000).toISOString().split("T")[0];
        const [events, broods, pairs, birds] = await Promise.all([
          EventService.getEventsByUser(userId),
          BroodService.getBroodsByUser(userId),
          PairService.getPairsByUser(userId),
          BirdService.getBirdsByUser(userId),
        ]);
        const pairMap = Object.fromEntries(pairs.map((p: any) => [p.id, p]));
        const birdMap = Object.fromEntries(birds.map((b) => [b.id, b]));
        const pairLabel = (pairId: number) => {
          const pair = pairMap[pairId];
          if (!pair) return `Pair #${pairId}`;
          const male = birdMap[pair.maleId];
          const female = birdMap[pair.femaleId];
          return `${male ? birdLabel(male) : "Unknown"} x ${female ? birdLabel(female) : "Unknown"}`;
        };

        const incompleteEvents = events.filter((event: any) => !event.completed);
        return {
          overdueEvents: incompleteEvents
            .filter((event: any) => event.eventDate < todayStr)
            .slice(0, 10)
            .map((event: any) => ({ id: event.id, title: event.title, date: event.eventDate, type: event.eventType })),
          upcomingEvents: incompleteEvents
            .filter((event: any) => event.eventDate >= todayStr && event.eventDate <= futureStr)
            .slice(0, 10)
            .map((event: any) => ({ id: event.id, title: event.title, date: event.eventDate, type: event.eventType })),
          fertilityChecksDue: broods
            .filter((brood: any) => brood.status === "incubating" && brood.fertilityCheckDate && brood.fertilityCheckDate <= futureStr)
            .slice(0, 10)
            .map((brood: any) => ({ broodId: brood.id, pair: pairLabel(brood.pairId), date: brood.fertilityCheckDate, eggsLaid: brood.eggsLaid })),
          hatchesDue: broods
            .filter((brood: any) => brood.status === "incubating" && brood.expectedHatchDate && brood.expectedHatchDate <= futureStr)
            .slice(0, 10)
            .map((brood: any) => ({ broodId: brood.id, pair: pairLabel(brood.pairId), date: brood.expectedHatchDate, eggsLaid: brood.eggsLaid })),
          activeClutches: broods.filter((brood: any) => brood.status === "incubating").length,
        };
      } catch {
        return { success: false, error: "Failed to build attention report." };
      }
    },
  }),

  getPairPerformanceReport: tool({
    description: "Rank breeding pairs by clutch count, eggs laid, chicks survived, hatch rate, and potential underperformance.",
    inputSchema: z.object({
      season: z.string().optional().describe("Optional season/year filter"),
      limit: z.number().int().min(1).max(20).optional().describe("Maximum pairs to return"),
    }),
    execute: async ({ season, limit = 10 }) => {
      try {
        const [pairs, broods, birds] = await Promise.all([
          PairService.getPairsByUser(userId),
          BroodService.getBroodsByUser(userId),
          BirdService.getBirdsByUser(userId),
        ]);
        const birdMap = Object.fromEntries(birds.map((b) => [b.id, b]));
        return pairs
          .map((pair: any) => {
            const pairBroods = broods.filter((brood: any) => brood.pairId === pair.id && (!season || String(brood.season) === String(season)));
            const eggsLaid = pairBroods.reduce((sum: number, brood: any) => sum + Number(brood.eggsLaid ?? 0), 0);
            const chicksSurvived = pairBroods.reduce((sum: number, brood: any) => sum + Number(brood.chicksSurvived ?? 0), 0);
            const hatchRate = eggsLaid > 0 ? Math.round((chicksSurvived / eggsLaid) * 100) : null;
            const male = birdMap[pair.maleId];
            const female = birdMap[pair.femaleId];
            return {
              pairId: pair.id,
              pair: `${male ? birdLabel(male) : "Unknown"} x ${female ? birdLabel(female) : "Unknown"}`,
              status: pair.status,
              season: pair.season,
              clutchCount: pairBroods.length,
              eggsLaid,
              chicksSurvived,
              hatchRate,
              underperforming: pairBroods.length >= 2 && eggsLaid >= 4 && chicksSurvived === 0,
            };
          })
          .filter((row) => row.clutchCount > 0)
          .sort((a, b) => Number(a.hatchRate ?? -1) - Number(b.hatchRate ?? -1))
          .slice(0, limit);
      } catch {
        return { success: false, error: "Failed to build pair performance report." };
      }
    },
  }),

  recommendPairings: tool({
    description: "Recommend possible pairings from current birds using gender, status, active pairings, relatedness, breeding history, and mutations.",
    inputSchema: z.object({
      speciesId: z.number().optional().describe("Optional species ID filter"),
      limit: z.number().int().min(1).max(10).optional().describe("Maximum recommendations"),
    }),
    execute: async ({ speciesId, limit = 5 }) => {
      try {
        const [birds, pairs, broods] = await Promise.all([
          BirdService.getBirdsByUser(userId),
          PairService.getPairsByUser(userId),
          BroodService.getBroodsByUser(userId),
        ]);
        const pairedIds = new Set(
          pairs
            .filter((pair: any) => pair.status === "active" || pair.status === "breeding")
            .flatMap((pair: any) => [pair.maleId, pair.femaleId])
        );
        const candidates = birds.filter((bird) =>
          bird.status !== "deceased" &&
          bird.status !== "sold" &&
          !pairedIds.has(bird.id) &&
          (!speciesId || bird.speciesId === speciesId)
        );
        const males = candidates.filter((bird) => bird.gender === "male");
        const females = candidates.filter((bird) => bird.gender === "female");
        const recs: Array<Record<string, unknown>> = [];

        for (const male of males) {
          for (const female of females) {
            if (male.speciesId !== female.speciesId) continue;
            const coefficient = await PedigreeService.calcInbreedingCoefficient(male.id, female.id, userId);
            const sharedMutation = male.colorMutation && female.colorMutation && male.colorMutation === female.colorMutation;
            const priorPair = pairs.find((pair: any) => pair.maleId === male.id && pair.femaleId === female.id);
            const priorBroods = priorPair ? broods.filter((brood: any) => brood.pairId === priorPair.id) : [];
            const eggsLaid = priorBroods.reduce((sum: number, brood: any) => sum + Number(brood.eggsLaid ?? 0), 0);
            const chicksSurvived = priorBroods.reduce((sum: number, brood: any) => sum + Number(brood.chicksSurvived ?? 0), 0);
            const score = 100 - coefficient * 400 + (sharedMutation ? 8 : 0) + (priorBroods.length > 0 && chicksSurvived > 0 ? 10 : 0);
            recs.push({
              male: { id: male.id, name: birdLabel(male), mutation: male.colorMutation, cage: male.cageNumber },
              female: { id: female.id, name: birdLabel(female), mutation: female.colorMutation, cage: female.cageNumber },
              inbreedingCoefficient: coefficient,
              inbreedingRisk: inbreedingRisk(coefficient),
              priorClutches: priorBroods.length,
              priorEggsLaid: eggsLaid,
              priorChicksSurvived: chicksSurvived,
              reasons: [
                "Both birds are unpaired, living, known male/female, and the same species.",
                coefficient === 0 ? "No shared ancestors found in the recorded pedigree." : `Recorded pedigree shows ${inbreedingRisk(coefficient)} inbreeding risk.`,
                sharedMutation ? "Both birds share the same recorded colour mutation." : "Mutations should be reviewed for the desired colour goal.",
              ],
              score,
            });
          }
        }

        return recs.sort((a, b) => Number(b.score) - Number(a.score)).slice(0, limit);
      } catch {
        return { success: false, error: "Failed to recommend pairings." };
      }
    },
  }),
});

/**
 * Registers the /api/chat endpoint for streaming AI responses.
 *
 * @example
 * ```ts
 * // In server/_core/index.ts
 * import { registerChatRoutes } from "./chat";
 *
 * registerChatRoutes(app);
 * ```
 */
// ── Per-user daily chat rate limiter (in-memory) ──────────────────────────────
const CHAT_MAX_PER_DAY = 20;
const chatUsage = new Map<number, { count: number; resetAt: number }>();

function checkChatRateLimit(userId: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours

  const entry = chatUsage.get(userId);
  if (!entry || now > entry.resetAt) {
    chatUsage.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: CHAT_MAX_PER_DAY - 1, resetAt: now + windowMs };
  }

  if (entry.count >= CHAT_MAX_PER_DAY) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: CHAT_MAX_PER_DAY - entry.count, resetAt: entry.resetAt };
}

export function registerChatRoutes(app: Express) {
  const openai = createLLMProvider();

  app.post("/api/chat", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // AI is a Pro-only feature. Trial users get temporary full access.
      if (user.plan === "starter") {
        res.status(403).json({ error: "PRO_REQUIRED", code: "PRO_REQUIRED" });
        return;
      }
      if (user.plan === "free") {
        const TRIAL_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const trialEnd = user.planExpiresAt
          ? new Date(user.planExpiresAt)
          : new Date(user.createdAt.getTime() + TRIAL_DAYS_MS);
        if (trialEnd <= new Date()) {
          res.status(403).json({ error: "PRO_REQUIRED", code: "PRO_REQUIRED" });
          return;
        }
      }

      const { messages } = req.body ?? {};
      const validation = validateChatMessages(messages);
      if (!validation.ok) {
        res.status(validation.status).json({ error: validation.error, code: validation.code });
        return;
      }

      const limit = checkChatRateLimit(user.id);
      if (!limit.allowed) {
        const resetsIn = Math.ceil((limit.resetAt - Date.now()) / 1000 / 60 / 60);
        console.warn(`[chat:ratelimit] userId=${user.id} hit daily limit (${CHAT_MAX_PER_DAY}/day), resets in ~${resetsIn}h`);
        res.status(429).json({
          error: `Daily message limit reached (${CHAT_MAX_PER_DAY}/day). Resets in ~${resetsIn}h.`,
          code: "RATE_LIMITED",
        });
        return;
      }

      const modelMessages = await convertToModelMessages(messages as any);
      const activeTools = getActiveToolsForMessages(messages as any);

      const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";
      console.log(`[chat] userId=${user.id} model=${modelName} remaining=${limit.remaining}/${CHAT_MAX_PER_DAY} activeTools=${activeTools.length}`);

      const userDate = typeof req.body.userDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.body.userDate)
        ? req.body.userDate
        : new Date().toISOString().split("T")[0];
      const today = userDate;
      const todayMs = new Date(userDate + "T12:00:00Z").getTime();
      const yesterday = new Date(todayMs - 86400000).toISOString().split("T")[0];

      const result = streamText({
        model: openai.chat(modelName),
        system:
          `You are an expert aviculture assistant with full control over the user's aviary. You help manage their aviary, called 'Aviary Manager'. You can both read data AND request actions on their behalf after user approval.\n\nToday's date is ${today}. Yesterday was ${yesterday}. Always use these exact dates when the user refers to 'today' or 'yesterday'.\n\nREAD TOOLS: getFlockStats, searchBirds, getUpcomingEvents, getMutationSummary, getPairEggStats, listPairs, getBirdDetails, getUpcomingHatches, getPairHistory, getSpeciesInfo, getUserSettings, getPedigreeSummary, getInbreedingRisk, getEggDetails, getAttentionReport, getPairPerformanceReport, recommendPairings\nACTION TOOLS: createBreedingPair, updatePairStatus, deletePair, recordClutch, updateClutch, recordHatch, addEvent, updateEvent, deleteEvent, markEventComplete, updateBirdStatus, updateBird, addBird, deleteBird, recordEggOutcome\n\nUse the richer read tools for analysis questions: getAttentionReport for 'what needs attention', getPairPerformanceReport for hatch-rate and underperformance questions, getPedigreeSummary/getInbreedingRisk for lineage questions, getEggDetails for individual egg outcomes, and recommendPairings for pairing recommendations.\n\nValid pair statuses are: active, breeding, resting, retired.\nIMPORTANT: When creating a breeding pair, always use the current calendar year as the season unless the user explicitly says otherwise. Never infer the season from bird names or ring IDs (a bird named '2024 Dad' was born in 2024, that is not the breeding season).\nValid bird statuses are: alive, breeding, resting, deceased, sold, unknown.\n\nWhen taking actions:\n1. Always use a read tool first to confirm you have the right bird(s), event, clutch, or pair before acting.\n2. If the user asks for something invalid (e.g. a status that doesn't exist), explain what the valid options are in plain language — never show raw error messages or JSON.\n3. If there is any ambiguity (multiple matches, wrong gender, etc.), ask the user to clarify rather than guessing.\n4. Action tools require user approval. If approval is denied, do not retry the same action unless the user asks again.\n5. After a successful action, confirm what you did in plain language. For example: 'Done — I've paired Rio (male) and Blue (female) for the 2026 season.'\n6. To update a bird's cage number, name, or notes use the updateBird tool.\n7. When opening the Add Bird modal (openAddBirdModal), only fill in fields the user explicitly provided. Leave all other fields null/undefined — never fill optional fields with 'Unknown' or placeholder text.\n\nWhen recommending pairings or discussing colour mutations, use getMutationSummary or recommendPairings then apply your expert genetics knowledge.\n\nDo not make up data about their specific birds — always use the tools.\n\nCRITICAL RULE: Never output raw JSON, error objects, or code blocks. Always respond in natural, conversational language. Be concise and helpful.`,
        messages: modelMessages,
        tools: tools(user.id),
        activeTools,
        maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
        stopWhen: stepCountIs(10),
      });

      result.pipeUIMessageStreamToResponse(res);
    } catch (error) {
      console.error(`[chat:error] userId=${(await sdk.authenticateRequest(req).catch(() => null))?.id ?? "unknown"} error:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });
}

export { tools };

// ── Admin: expose live chat usage stats ──────────────────────────────────────
export function getChatStats() {
  const now = Date.now();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  let totalMessages = 0;
  let rateLimitedUsers = 0;
  const topUsers: Array<{ userId: number; count: number; remaining: number }> = [];

  for (const [userId, entry] of Array.from(chatUsage.entries())) {
    if (now > entry.resetAt) continue; // window expired, skip
    totalMessages += entry.count;
    if (entry.count >= CHAT_MAX_PER_DAY) rateLimitedUsers++;
    topUsers.push({ userId, count: entry.count, remaining: Math.max(0, CHAT_MAX_PER_DAY - entry.count) });
  }

  topUsers.sort((a, b) => b.count - a.count);

  return {
    model,
    maxPerDay: CHAT_MAX_PER_DAY,
    activeUsersToday: topUsers.length,
    totalMessagesToday: totalMessages,
    rateLimitedUsers,
    topUsers: topUsers.slice(0, 10),
  };
}
