"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { allowedUsers, appUsers } from "@/db/schema";
import { eq } from "drizzle-orm";

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
// ... (existing code)

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

export async function updateUserPreferences(preferences: any) {
    try {
        const user = await currentUser();
        if (!user) return { success: false, error: "Unauthorized" };

        // Upsert logic: if user doesn't exist in appUsers (rare if sync works), create them.
        // For now, assume user exists or simple update. 
        // Actually, best to use onConflictDoUpdate if we were creating, but let's just update for now as user creation happens elsewhere usually.
        // Wait, if they are new, they might not be in appUsers yet if we rely on webhooks. 
        // Let's safe upsert.

        await db.insert(appUsers).values({
            id: user.id,
            email: user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || "",
            preferences,
            updatedAt: new Date(),
        }).onConflictDoUpdate({
            target: appUsers.id,
            set: {
                preferences,
                updatedAt: new Date(),
            }
        });

        return { success: true };
    } catch (error) {
        console.error("Error updating preferences:", error);
        return { success: false, error: "Failed to update" };
    }
}
