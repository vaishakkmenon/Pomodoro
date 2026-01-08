// Standard CORS headers for edge functions
// Note: Access-Control-Allow-Origin cannot be '*' when credentials are included

const ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://pomodoro.vaishakmenon.com",
];

const DEFAULT_ORIGIN = "https://pomodoro.vaishakmenon.com";

export const corsHeaders = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
};

/**
 * Get the allowed origin from request
 */
export function getAllowedOrigin(request: Request): string {
    const origin = request.headers.get("Origin");
    return origin && ALLOWED_ORIGINS.includes(origin) ? origin : DEFAULT_ORIGIN;
}

/**
 * Get CORS headers for a specific request
 */
export function corsHeadersForRequest(request: Request): Record<string, string> {
    return {
        ...corsHeaders,
        "Access-Control-Allow-Origin": getAllowedOrigin(request),
    };
}

/**
 * Handle CORS preflight requests
 */
export function handleCors(request: Request): Response | null {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeadersForRequest(request),
        });
    }
    return null;
}

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponse(
    data: unknown,
    request?: Request,
    status = 200,
    extraHeaders: Record<string, string> = {}
): Response {
    const origin = request ? getAllowedOrigin(request) : DEFAULT_ORIGIN;

    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin,
            ...extraHeaders,
        },
    });
}

/**
 * Create an error JSON response
 */
export function errorResponse(
    message: string,
    status = 500,
    code?: string,
    request?: Request,
    extraHeaders: Record<string, string> = {}
): Response {
    return jsonResponse({ error: message, code }, request, status, extraHeaders);
}
