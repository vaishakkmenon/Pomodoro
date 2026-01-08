// CSRF State Signing for OAuth Flows
// Uses HMAC-SHA256 to sign state parameters

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function getSecret(): string {
    const secret = Deno.env.get("SESSION_SECRET");
    if (!secret) throw new Error("Missing SESSION_SECRET");
    return secret;
}

// Create HMAC signature
async function hmacSign(data: string): Promise<string> {
    const secret = getSecret();
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    // Use URL-safe base64
    return btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

// Verify HMAC signature
async function hmacVerify(data: string, signature: string): Promise<boolean> {
    const expected = await hmacSign(data);
    // Constant-time comparison
    if (expected.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
        result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
}

export interface StatePayload {
    csrf: string;
    siteUserId: string;
    timestamp: number;
}

/**
 * Create a signed state parameter for OAuth flow
 * Format: base64url(payload).signature
 */
export async function signState(payload: Omit<StatePayload, "timestamp">): Promise<string> {
    const fullPayload: StatePayload = {
        ...payload,
        timestamp: Date.now(),
    };

    // URL-safe base64 encoding
    const data = btoa(JSON.stringify(fullPayload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    const signature = await hmacSign(data);
    return `${data}.${signature}`;
}

/**
 * Verify and decode a signed state parameter
 * Returns null if invalid, tampered, or expired
 */
export async function verifyState(signedState: string): Promise<StatePayload | null> {
    try {
        const parts = signedState.split(".");
        if (parts.length !== 2) return null;

        const [data, signature] = parts;

        // Verify signature
        const isValid = await hmacVerify(data, signature);
        if (!isValid) return null;

        // Decode payload (restore base64 padding)
        const paddedData = data
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(data.length + (4 - (data.length % 4)) % 4, "=");

        const payload = JSON.parse(atob(paddedData)) as StatePayload;

        // Check expiration
        if (Date.now() - payload.timestamp > STATE_MAX_AGE_MS) {
            console.warn("[CSRF] State expired");
            return null;
        }

        return payload;
    } catch (error) {
        console.error("[CSRF] State verification failed:", error);
        return null;
    }
}

/**
 * Compare state from URL with state from cookie
 * Both must be present, match, and be valid
 */
export async function validateOAuthState(
    urlState: string | null,
    cookieState: string | null
): Promise<StatePayload | null> {
    if (!urlState || !cookieState) {
        console.warn("[CSRF] Missing state parameter");
        return null;
    }

    // States must match exactly
    if (urlState !== cookieState) {
        console.warn("[CSRF] State mismatch");
        return null;
    }

    // Verify the signature and expiration
    return verifyState(urlState);
}
