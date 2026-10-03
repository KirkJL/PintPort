import { GET, POST, PUT, DELETE } from "./api";
const handlers = { GET, POST, PUT, DELETE };
export default {
  async fetch(request: Request, env: Cloudflare.Env) {
    const path = new URL(request.url).pathname;
    let response: Response;
    if (path.startsWith("/api/")) {
      const handler = handlers[request.method as keyof typeof handlers];
      response = handler
        ? await handler(request)
        : Response.json({ error: "Method not allowed." }, { status: 405 });
    } else response = await env.ASSETS.fetch(request);
    const r = new Response(response.body, response);
    r.headers.set("X-Content-Type-Options", "nosniff");
    r.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    r.headers.set(
      "Permissions-Policy",
      "geolocation=(self), camera=(), microphone=()",
    );
    r.headers.set("Strict-Transport-Security", "max-age=31536000");
    r.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.openfreemap.org; connect-src 'self' https://*.openfreemap.org; font-src 'self' data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    );
    return r;
  },
};
