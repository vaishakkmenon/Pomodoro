import { handleCors, jsonResponse, errorResponse } from "./_shared/cors.ts";
import { getSession } from "./_shared/session.ts";
import { getSupabase } from "./_shared/supabase.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";



export default async function handler(request: Request): Promise<Response> {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    if (request.method !== "POST") {
        return errorResponse("Method not allowed", 405);
    }

    // 1. Verify Authentication (Supabase JWT)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
        return errorResponse("Missing Authorization header", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = getSupabase();

    // Verify JWT using Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return errorResponse("Invalid Token", 401);
    }

    // 2. Verify Admin Status
    const ownerEmail = Deno.env.get("OWNER_EMAIL");
    if (!ownerEmail) {
        console.error("Missing OWNER_EMAIL env var");
        return errorResponse("Server configuration error", 500);
    }

    if (!user.email || user.email.toLowerCase() !== ownerEmail.toLowerCase()) {
        return errorResponse("Forbidden: Admins only", 403);
    }

    try {
        const { email } = await request.json();
        if (!email) return errorResponse("Email required", 400);

        // 3. Perform Admin Action using Service Role (Bypass RLS)
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        console.log("[Admin] Service Role Key present:", !!serviceRoleKey);

        if (!serviceRoleKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
            return errorResponse("Server configuration error", 500);
        }

        const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
        console.log("[Admin] Supabase URL:", supabaseUrl);

        const supabaseAdmin = createClient(
            supabaseUrl!,
            serviceRoleKey
        );

        console.log("[Admin] Attempting to insert:", email);
        const { error } = await supabaseAdmin
            .from("allowed_users")
            .insert([{ email: email.toLowerCase(), is_active: true }]);

        console.log("[Admin] Insert result error:", error);

        if (error) {
            // Ignore duplicate error
            if (error.code === '23505') {
                return jsonResponse({ success: true, message: "User already exists" });
            }
            throw error;
        }

        return jsonResponse({ success: true });

    } catch (err) {
        console.error("[Admin] Error:", err);
        return errorResponse("Failed to add user", 500);
    }
}
