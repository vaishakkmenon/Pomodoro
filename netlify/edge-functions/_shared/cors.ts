// Standard CORS headers for edge functions
// Note: Access-Control-Allow-Origin cannot be '*' when credentials are included
export const corsHeaders = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
};

export function handleCors(request: Request): Response | null {
    const origin = request.headers.get("Origin");
    const allowedOrigins = [
        "http://localhost:3000",
        "https://pomodoro.vaishakmenon.com",
        // Add other allowed domains if necessary
    ];

    // If origin is allowed, add it to headers. Otherwise default to the production domain.
    const allowOrigin = origin && allowedOrigins.includes(origin)
        ? origin
        : "https://pomodoro.vaishakmenon.com";

    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                ...corsHeaders,
                "Access-Control-Allow-Origin": allowOrigin,
            }
        });
    }
    return null; // For non-OPTIONS requests, you'll need to append the header manually or use a wrapper
}

export function jsonResponse(data: unknown, status = 200, headers: HeadersInit = {}): Response {
    // We can't easily get the request origin here without passing the request object. 
    // For simplicity in this helper, we'll need to rely on the caller or default to prod validation.
    // However, since handleCors handles the preflight, the actual response also needs the CORS headers.

    // A safer pattern for the response helper given the dynamic origin requirement:
    // Ideally, we should pass the origin or the request. 
    // To minimize refactoring, let's just use the production domain as default safe fallback,
    // but this might break local dev if not handled. 
    // Let's modify jsonResponse to accept custom headers that override.

    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://pomodoro.vaishakmenon.com", // Default safe
            ...headers,
        },
    });
}

export function errorResponse(message: string, status = 500, code?: string): Response {
    return jsonResponse({ error: message, code }, status);
}
