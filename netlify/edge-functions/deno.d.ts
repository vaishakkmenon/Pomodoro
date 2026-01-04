// Basic type definitions for Deno global required for Netlify Edge Functions
// This prevents "Cannot find name 'Deno'" errors in TypeScript

declare namespace Deno {
    export const env: {
        get(key: string): string | undefined;
        toObject(): { [key: string]: string };
    };
}
