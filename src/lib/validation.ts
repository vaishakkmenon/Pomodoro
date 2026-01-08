import { z } from "zod";

export const emailSchema = z.email("Invalid email address").min(5).max(255);

export const adminUserSchema = z.object({
    email: emailSchema,
    notes: z.string().max(500, "Notes are too long").optional(),
});

export const preferencesSchema = z.record(z.string(), z.unknown()); // Basic schema for preferences, refine if needed

/**
 * Validates data against a schema and throws if invalid.
 * Used in Server Actions.
 */
export function validate<T>(schema: z.Schema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        const error = result.error;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error((error as any).errors[0]?.message || "Invalid input");
    }
    return result.data;
}
