"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { allowedUsers } from "@/db/schema";
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
