export default async function handler(request: Request): Promise<Response> {
    const headers = new Headers();

    // Clear session cookie
    headers.append("Set-Cookie", "spotify_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");

    // Clear OAuth state cookie (prevent reuse)
    headers.append("Set-Cookie", "spotify_oauth_state=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");

    return new Response("Logged out", {
        status: 200,
        headers,
    });
}
