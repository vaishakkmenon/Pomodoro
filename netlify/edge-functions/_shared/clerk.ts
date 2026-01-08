// Clerk JWT verification for Deno edge functions
// Uses jose library for JWT verification against Clerk's JWKS

import * as jose from "https://esm.sh/jose@5.9.6";

// Cache JWKS to avoid fetching on every request
let cachedJwks: jose.JWTVerifyGetKey | null = null;
let jwksCachedAt = 0;
let usingPemKey = false;
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export interface ClerkUser {
    userId: string;
    email?: string;
    sessionId: string;
}

/**
 * Get Clerk's JWKS URL
 * Uses the Frontend API URL from environment
 */
function getJwksUrl(): string {
    // Clerk Frontend API URL format: https://xxx.clerk.accounts.dev
    const frontendApi = Deno.env.get("NEXT_PUBLIC_CLERK_FRONTEND_API")
        || Deno.env.get("CLERK_FRONTEND_API");

    if (frontendApi) {
        return `${frontendApi}/.well-known/jwks.json`;
    }

    // Fallback to Backend API JWKS
    return "https://api.clerk.com/v1/jwks";
}

/**
 * Try to import PEM public key
 */
async function tryImportPemKey(): Promise<jose.JWTVerifyGetKey | null> {
    const pemKey = Deno.env.get("CLERK_JWT_PUBLIC_KEY");

    if (!pemKey) {
        return null;
    }

    try {
        // Replace escaped newlines and import
        const formattedKey = pemKey.replace(/\\n/g, "\n");
        const publicKey = await jose.importSPKI(formattedKey, "RS256");
        console.log("[Clerk] Using PEM public key for JWT verification");
        return async () => publicKey;
    } catch (error) {
        console.warn("[Clerk] Failed to import PEM key, will fallback to JWKS:", error);
        return null;
    }
}

/**
 * Get or create JWKS keyset with caching
 * Tries PEM key first, falls back to JWKS URL
 */
async function getJwks(): Promise<jose.JWTVerifyGetKey> {
    const now = Date.now();

    // Return cached JWKS if still valid
    if (cachedJwks && (now - jwksCachedAt) < JWKS_CACHE_TTL) {
        return cachedJwks;
    }

    // Try PEM key first (no network call needed)
    const pemJwks = await tryImportPemKey();
    if (pemJwks) {
        cachedJwks = pemJwks;
        jwksCachedAt = now;
        usingPemKey = true;
        return cachedJwks;
    }

    // Fallback: Fetch JWKS from Clerk
    console.log("[Clerk] Using JWKS URL for JWT verification");
    const jwksUrl = getJwksUrl();
    cachedJwks = jose.createRemoteJWKSet(new URL(jwksUrl));
    jwksCachedAt = now;
    usingPemKey = false;

    return cachedJwks;
}

/**
 * Extract session token from request
 * Checks both cookie (__session) and Authorization header
 */
function extractSessionToken(request: Request): string | null {
    // Check Authorization header first (Bearer token)
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }

    // Check __session cookie (Clerk's default session cookie)
    const cookies = request.headers.get("Cookie") || "";
    const sessionMatch = cookies.match(/__session=([^;]+)/);
    if (sessionMatch) {
        return decodeURIComponent(sessionMatch[1]);
    }

    // Check __clerk_db_jwt cookie (development)
    const devMatch = cookies.match(/__clerk_db_jwt=([^;]+)/);
    if (devMatch) {
        return decodeURIComponent(devMatch[1]);
    }

    return null;
}

/**
 * Verify a Clerk session token
 * Returns user info if valid, null if invalid
 */
export async function verifyClerkToken(token: string): Promise<ClerkUser | null> {
    try {
        const jwks = await getJwks();

        // Verify the JWT
        const { payload } = await jose.jwtVerify(token, jwks, {
            // Clerk tokens use these standard claims
            clockTolerance: 5, // 5 seconds tolerance for clock skew
        });

        // Validate required claims
        if (!payload.sub) {
            console.warn("[Clerk] Token missing sub claim");
            return null;
        }

        // Check expiration (jose does this automatically, but let's be explicit)
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            console.warn("[Clerk] Token expired");
            return null;
        }

        return {
            userId: payload.sub,
            email: payload.email as string | undefined,
            sessionId: payload.sid as string || "",
        };
    } catch (error) {
        if (error instanceof jose.errors.JWTExpired) {
            console.warn("[Clerk] Token expired");
        } else if (error instanceof jose.errors.JWTClaimValidationFailed) {
            console.warn("[Clerk] Token claim validation failed:", error.message);
        } else if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
            console.warn("[Clerk] Token signature verification failed");
        } else {
            console.error("[Clerk] Token verification error:", error);
        }
        return null;
    }
}

/**
 * Verify Clerk authentication from request
 * Extracts token and verifies it
 */
export async function verifyClerkRequest(request: Request): Promise<ClerkUser | null> {
    const token = extractSessionToken(request);

    if (!token) {
        return null;
    }

    return verifyClerkToken(token);
}

/**
 * Check if the authenticated user is an admin
 */
export async function verifyAdminRequest(request: Request): Promise<ClerkUser | null> {
    const user = await verifyClerkRequest(request);

    if (!user) {
        return null;
    }

    const adminUserId = Deno.env.get("CLERK_ADMIN_USER_ID");

    if (!adminUserId) {
        console.error("[Clerk] Missing CLERK_ADMIN_USER_ID env var");
        return null;
    }

    if (user.userId !== adminUserId) {
        console.warn(`[Clerk] User ${user.userId} is not admin`);
        return null;
    }

    return user;
}
