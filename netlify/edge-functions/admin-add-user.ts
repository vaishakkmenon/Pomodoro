import { handleCors, jsonResponse, errorResponse } from "./_shared/cors.ts";
import { addAllowedUser, isUserAllowed } from "./_shared/neon.ts";
import { checkRateLimit, rateLimitHeaders } from "./_shared/rateLimit.ts";
import { validateEmail } from "./_shared/validation.ts";
import { verifyAdminRequest } from "./_shared/clerk.ts";

export default async function handler(request: Request): Promise<Response> {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    // Rate limiting - strict for admin endpoints
    const rateLimit = await checkRateLimit(request, "admin");
    const headers = rateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        return errorResponse("Too many requests", 429, "RATE_LIMITED", request, headers);
    }

    if (request.method !== "POST") {
        return errorResponse("Method not allowed", 405, "METHOD_NOT_ALLOWED", request, headers);
    }

    // Verify admin status using proper Clerk JWT verification
    const admin = await verifyAdminRequest(request);

    if (!admin) {
        return errorResponse("Forbidden: Admins only", 403, "FORBIDDEN", request, headers);
    }

    try {
        const body = await request.json();
        const email = validateEmail(body.email);

        if (!email) {
            return errorResponse("Valid email required", 400, "INVALID_EMAIL", request, headers);
        }

        // Check if user already exists
        const exists = await isUserAllowed(email);
        if (exists) {
            return jsonResponse({ success: true, message: "User already exists" }, request, 200, headers);
        }

        // Add user to allowed list
        const result = await addAllowedUser(email, body.notes);

        console.log(`[Admin] User ${admin.userId} added allowed user: ${email}`);

        return jsonResponse({ success: true, id: result.id }, request, 200, headers);
    } catch (err) {
        console.error("[Admin] Error:", err);
        return errorResponse("Failed to add user", 500, "SERVER_ERROR", request, headers);
    }
}
