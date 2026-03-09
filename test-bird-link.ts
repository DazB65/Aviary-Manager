import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./drizzle/schema";
import { eq, and } from "drizzle-orm";
import { birds, clutchEggs } from "./drizzle/schema";
import dotenv from "dotenv";

dotenv.config();

// Using local ENV if present
const queryClient = postgres("postgresql://postgres:SDEgEebwVbOQxIetAInyQcKthNffyLof@junction.proxy.rlwy.net:49065/railway");
const db = drizzle(queryClient, { schema });

async function testBirdCreation() {
    const userId = 1;
    const insertData = {
        userId,
        speciesId: 1,
        dateOfBirth: "2025-03-01",
        status: "alive" as const,
        gender: "unknown" as const
    };
    const fromBroodId = 20; // Assume Brood #20 exists from our previous tests
    const fromEggNumber = 1;

    console.log("Starting test...");
    await db.transaction(async (tx) => {
        const [result] = await tx.insert(birds).values(insertData).returning();
        console.log("Bird created:", result, result.dateOfBirth);

        console.log("Looking for egg", fromBroodId, fromEggNumber);
        const [egg] = await tx.select().from(clutchEggs).where(
            and(
                eq(clutchEggs.broodId, fromBroodId),
                eq(clutchEggs.eggNumber, fromEggNumber),
                eq(clutchEggs.userId, insertData.userId)
            )
        );

        console.log("Found egg pre-update:", egg);

        if (egg) {
            const [updatedEgg] = await tx.update(clutchEggs)
                .set({ birdId: result.id, updatedAt: new Date() })
                .where(
                    and(
                        eq(clutchEggs.broodId, fromBroodId),
                        eq(clutchEggs.eggNumber, fromEggNumber),
                        eq(clutchEggs.userId, insertData.userId)
                    )
                )
                .returning();

            console.log("Updated egg:", updatedEgg);
        }

        // Roll it back so we don't pollute the db
        tx.rollback();
    }).catch((e) => {
        if (e.message !== "Rollback") {
            throw e;
        }
    });

    await queryClient.end();
}

testBirdCreation().catch(console.error);
