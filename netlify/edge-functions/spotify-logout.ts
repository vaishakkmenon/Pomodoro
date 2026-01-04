import { deleteSessionCookie } from "./_shared/session.ts";

export default async function handler(): Promise<Response> {
    return new Response(null, {
        status: 302,
        headers: {
            Location: "/",
            "Set-Cookie": deleteSessionCookie(),
        },
    });
}
