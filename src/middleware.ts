import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes
// /sign-in, /sign-up are standard Clerk routes. 
// /api/uploadthing is common if we use uploadthing, but let's stick to what we know.
// / (home) is public? No, the user wants "Login to use". Actually, page.tsx has "Auth & Tasks", suggesting it might work for guests or require auth. 
// Implementation plan says "restrict Spotify Auto-DJ features to whitelisted...". 
// Let's assume the landing page is public, but specific actions require auth.
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/' // Landing page is public
]);

export default clerkMiddleware(async (auth, req) => {
  // 1. Protect routes
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // 2. Add Security Headers
  const response = NextResponse.next();

  // Content Security Policy (Basic)
  // We need to allow scripts from: 'self', 'unsafe-inline' (Next.js needs it often or we need nonces), 
  // clerk.com, spotify.com, maybe others.
  // For now, let's start with a reasonably strict policy but allow 'unsafe-inline' for styles/scripts to avoid breaking Next.js app router 
  // until we have nonces set up properly (which is complex).
  // Frame-ancestors: deny to prevent clickjacking (unless we need to be iframed).

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.com https://*.spotify.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https://*.spotifycdn.com https://i.scdn.co https://img.clerk.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.clerk.accounts.dev https://clerk.com https://api.spotify.com;
    frame-src 'self' https://*.spotify.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;

  response.headers.set(
    'Content-Security-Policy',
    cspHeader.replace(/\s{2,}/g, ' ').trim() // Minify
  );

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
