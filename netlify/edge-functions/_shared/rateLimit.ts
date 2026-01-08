// Database-backed rate limiting for edge functions
// Uses Neon.tech to store rate limit counters

import { getDb } from "./neon.ts";

// Rate limit configurations per endpoint
export const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
    // OAuth endpoints - stricter limits
    login: { maxRequests: 5, windowMs: 60_000 },
    callback: { maxRequests: 10, windowMs: 60_000 },

    // API endpoints - moderate limits
    session: { maxRequests: 30, windowMs: 60_000 },
    settings: { maxRequests: 20, windowMs: 60_000 },
    playlists: { maxRequests: 30, windowMs: 60_000 },
    sync: { maxRequests: 60, windowMs: 60_000 },  // Called frequently during timer
    logout: { maxRequests: 10, windowMs: 60_000 },

    // Admin endpoints - very strict
    admin: { maxRequests: 10, windowMs: 60_000 },
};

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;      // Unix timestamp (ms)
    retryAfter: number;   // Seconds until reset
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header (set by Netlify) or falls back to a default
 */
function getClientId(request: Request): string {
    // Netlify sets X-Forwarded-For header
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        // Get first IP in chain (original client)
        return forwarded.split(",")[0].trim();
    }

    // Fallback to X-Real-IP
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp;

    // Last resort - should not happen in production
    return "unknown";
}

/**
 * Check rate limit for a request
 * Returns whether the request is allowed and remaining quota
 */
export async function checkRateLimit(
    request: Request,
    endpoint: string
): Promise<RateLimitResult> {
    const config = RATE_LIMITS[endpoint];
    if (!config) {
        // No rate limit configured for this endpoint
        return {
            allowed: true,
            remaining: Infinity,
            resetAt: 0,
            retryAfter: 0,
        };
    }

    const { maxRequests, windowMs } = config;
    const clientId = getClientId(request);
    const key = `${endpoint}:${clientId}`;

    // Calculate window start (round down to nearest window)
    const now = Date.now();
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
    const windowEnd = windowStart.getTime() + windowMs;

    try {
        const db = getDb();

        // Try to increment existing counter or insert new one
        // Using a single atomic query with ON CONFLICT
        const result = await db`
            INSERT INTO rate_limits (key, window_start, request_count, created_at)
            VALUES (${key}, ${windowStart}, 1, NOW())
            ON CONFLICT (key, window_start)
            DO UPDATE SET
                request_count = rate_limits.request_count + 1
            RETURNING request_count
        `;

        const currentCount = result[0]?.request_count ?? 1;
        const remaining = Math.max(0, maxRequests - currentCount);
        const retryAfterMs = windowEnd - now;
        const retryAfter = Math.ceil(retryAfterMs / 1000);

        if (currentCount > maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: windowEnd,
                retryAfter,
            };
        }

        return {
            allowed: true,
            remaining,
            resetAt: windowEnd,
            retryAfter: 0,
        };
    } catch (error) {
        // On database error, allow the request but log the error
        // Better to fail open than block legitimate users
        console.error("[RateLimit] Database error:", error);
        return {
            allowed: true,
            remaining: maxRequests,
            resetAt: 0,
            retryAfter: 0,
        };
    }
}

/**
 * Add rate limit headers to response
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
    if (result.resetAt === 0) return {};

    return {
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
        ...(result.retryAfter > 0 ? { "Retry-After": String(result.retryAfter) } : {}),
    };
}

/**
 * Clean up old rate limit records (call periodically via cron)
 * Deletes records older than 1 hour
 */
export async function cleanupRateLimits(): Promise<number> {
    const db = getDb();
    const result = await db`
        DELETE FROM rate_limits
        WHERE window_start < NOW() - INTERVAL '1 hour'
        RETURNING id
    `;
    return result.length;
}
