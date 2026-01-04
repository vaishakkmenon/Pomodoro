// Simple signed cookie session
// Stores spotify_user_id in a signed cookie

const COOKIE_NAME = "pomodoro_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
    const secret = Deno.env.get("SESSION_SECRET");
    if (!secret) throw new Error("Missing SESSION_SECRET");
    return secret;
}

// Create HMAC signature
async function sign(value: string): Promise<string> {
    const secret = getSecret();
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return `${value}.${signatureBase64}`;
}

// Verify HMAC signature
async function verify(signedValue: string): Promise<string | null> {
    const [value, signature] = signedValue.split(".");
    if (!value || !signature) return null;

    const expected = await sign(value);
    if (expected !== signedValue) return null;

    return value;
}

// Get session from request cookies
export async function getSession(request: Request): Promise<string | null> {
    const cookies = request.headers.get("Cookie") || "";
    const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (!match) return null;

    const signedValue = decodeURIComponent(match[1]);
    return verify(signedValue);
}

// Create Set-Cookie header for session
export async function createSessionCookie(spotifyUserId: string): Promise<string> {
    const signedValue = await sign(spotifyUserId);
    const isProduction = Deno.env.get("NETLIFY") === "true";

    return [
        `${COOKIE_NAME}=${encodeURIComponent(signedValue)}`,
        `Max-Age=${COOKIE_MAX_AGE}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        isProduction ? "Secure" : "",
    ].filter(Boolean).join("; ");
}

// Create cookie to delete session
export function deleteSessionCookie(): string {
    return `${COOKIE_NAME}=; Max-Age=0; Path=/`;
}
