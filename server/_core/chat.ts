/**
 * Chat API Handler
 *
 * Express endpoint for AI SDK streaming chat with tool calling support.
 * Uses patched fetch to fix OpenAI-compatible proxy issues.
 */

import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { Express } from "express";
import { z } from "zod/v4";
import { createPatchedFetch } from "./patchedFetch";
import { BirdService } from "../services/birdService";
import { PairService } from "../services/pairService";
import { BroodService } from "../services/broodService";
import { StatsService } from "../services/statsService";
import { SpeciesService } from "../services/speciesService";
import { EventService } from "../services/eventService";
import { sdk } from "./sdk";

/**
 * Creates an OpenAI-compatible provider with patched fetch.
 */
function createLLMProvider() {
  const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL ?? "";
  const baseURL = forgeApiUrl.endsWith("/v1") ? forgeApiUrl : `${forgeApiUrl}/v1`;

  return createOpenAI({
    baseURL,
    apiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
    fetch: createPatchedFetch(fetch),
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

      const limit = checkChatRateLimit(user.id);
      if (!limit.allowed) {
        const resetsIn = Math.ceil((limit.resetAt - Date.now()) / 1000 / 60 / 60);
        console.warn(`[chat:ratelimit] userId=${user.id} hit daily limit (${CHAT_MAX_PER_DAY}/day), resets in ~${resetsIn}h`);
        res.status(429).json({
          error: `Daily message limit reached (${CHAT_MAX_PER_DAY}/day). Resets in ~${resetsIn}h.`,
        });
        return;
      }

      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "messages array is required" });
        return;
      }

      const modelMessages = await convertToModelMessages(messages as any);

      const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";
      console.log(`[chat] userId=${user.id} model=${modelName} remaining=${limit.remaining}/${CHAT_MAX_PER_DAY}`);

      const result = streamText({
        model: openai.chat(modelName),
        system:
          "You are an expert aviculture assistant. You help the user manage their aviary, which is called 'Aviary Manager'. You have access to tools that can fetch their live bird stats, search their bird database, check upcoming care events, and retrieve a full mutation summary of all their birds.\n\nWhen recommending pairings or discussing colour mutations, use the getMutationSummary tool to see all birds and their mutations, then apply your expert knowledge of avian genetics (dominant, recessive, sex-linked mutations, split carriers, expected offspring ratios) to make accurate recommendations. Clearly state the expected offspring mutation probabilities.\n\nDo not make up data about their specific birds — always use the tools. But do use your own genetics knowledge to reason about mutation outcomes.\n\nCRITICAL RULE: Never output raw JSON, internal tool data structures, or code blocks containing data from tools. Always format your responses in natural, conversational language. Be concise and helpful.",
        messages: modelMessages,
        tools: tools(user.id),
        stopWhen: stepCountIs(5),
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
