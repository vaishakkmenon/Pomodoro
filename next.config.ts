import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// CSP is more permissive in development to avoid issues
const ContentSecurityPolicy = isDev
    ? "" // Disable CSP in development
    : `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.pomodoro.vaishakmenon.com https://*.clerk.accounts.dev https://js.clerk.dev https://challenges.cloudflare.com https://www.youtube.com https://s.ytimg.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' data: blob: https://*.spotifycdn.com https://i.scdn.co https://img.clerk.com https://*.clerk.com https://i.ytimg.com https://*.ytimg.com;
        font-src 'self' https://fonts.gstatic.com;
        connect-src 'self' https://clerk.pomodoro.vaishakmenon.com https://*.clerk.accounts.dev https://*.clerk.dev https://api.spotify.com wss://*.neon.tech https://cdn.jsdelivr.net https://unpkg.com;
        frame-src 'self' https://*.spotify.com https://challenges.cloudflare.com https://www.youtube.com https://youtube.com;
        media-src 'self' blob:;
        worker-src 'self' blob:;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        upgrade-insecure-requests;
    `.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
    {
        key: "X-Frame-Options",
        value: "DENY",
    },
    {
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
    },
    // Only add CSP in production
    ...(ContentSecurityPolicy
        ? [{ key: "Content-Security-Policy", value: ContentSecurityPolicy }]
        : []),
];

const nextConfig: NextConfig = {
    images: {
        unoptimized: true,
    },
    async headers() {
        return [
            {
                // Apply to all routes
                source: "/:path*",
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;
