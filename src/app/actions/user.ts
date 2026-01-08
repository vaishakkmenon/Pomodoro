"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { allowedUsers, appUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validate, preferencesSchema } from "@/lib/validation";

export async function getPremiumStatus() {
    try {
        const user = await currentUser();
        // If not logged in, clearly not premium
        if (!user) return false;

        // Check all emails, or just the primary? usually primary.
        const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;
        if (!email) return false;

        const match = await db.select().from(allowedUsers).where(eq(allowedUsers.email, email));

        // Check if record exists and is active
        return match.length > 0 && match[0].isActive;
    } catch (error) {
        console.error("Error checking premium status:", error);
        return false;
    }
}

export async function getUserPreferences() {
    try {
        const user = await currentUser();
        if (!user) return null;

        const record = await db.select({ preferences: appUsers.preferences }).from(appUsers).where(eq(appUsers.id, user.id));

        if (record.length > 0) {
            return record[0].preferences;
        }
        return null;
    } catch (error) {
        console.error("Error fetching preferences:", error);
        return null;
    }
}

export async function updateUserPreferences(preferences: Record<string, unknown>) {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const validPrefs = validate(preferencesSchema, preferences);

        // Upsert logic...
        await db.insert(appUsers).values({
            id: user.id,
            email: user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || "",
            preferences: validPrefs,
            updatedAt: new Date(),
        }).onConflictDoUpdate({
            target: appUsers.id,
            set: {
                preferences: validPrefs,
                updatedAt: new Date(),
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Error updating preferences:", error);
        return { success: false, error: "Failed to update" };
    }
}
