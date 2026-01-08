"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { allowedUsers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { validate, adminUserSchema, emailSchema } from "@/lib/validation";

const ADMIN_USER_ID = process.env.CLERK_ADMIN_USER_ID;

async function checkAdmin() {
    const { userId } = await auth();
    if (!userId || userId !== ADMIN_USER_ID) {
        throw new Error("Unauthorized");
    }
}

export async function addAllowedUser(email: string, notes?: string) {
    await checkAdmin();

    // Validate input
    const validData = validate(adminUserSchema, { email, notes });

    // Check if exists
    const existing = await db.select().from(allowedUsers).where(eq(allowedUsers.email, validData.email));
    if (existing.length > 0) {
        return { success: false, message: "User already allowed" };
    }

    await db.insert(allowedUsers).values({
        email: validData.email,
        notes: validData.notes || "",
        isActive: true,
    });

    revalidatePath("/admin");
    return { success: true, message: "User added successfully" };
}

export async function removeAllowedUser(email: string) {
    await checkAdmin();

    const validEmail = validate(emailSchema, email);

    await db.delete(allowedUsers).where(eq(allowedUsers.email, validEmail));
    revalidatePath("/admin");
    return { success: true };
}

export async function getAllowedUsers() {
    await checkAdmin();
    return await db.select().from(allowedUsers).orderBy(desc(allowedUsers.createdAt));
}
