import { env } from "cloudflare:workers";
import { createRemoteJWKSet, jwtVerify } from "jose";
export function runtime() {
  return env as unknown as {
    DB: D1Database;
    BUCKET: R2Bucket;
    ENTRA_AUTHORITY?: string;
    ENTRA_CLIENT_ID?: string;
    ENTRA_CLIENT_SECRET?: string;
    APP_ORIGIN?: string;
  };
}
export function db() {
  const d = runtime().DB;
  if (!d) throw new Error("Storage unavailable");
  return d;
}
export const normalize = (s: string) =>
  s
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
export async function hash(s: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
}
export function cookie(req: Request, key: string) {
  return (
    req.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(key + "="))
      ?.slice(key.length + 1) || ""
  );
}
export function setCookie(name: string, value: string, age: number) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
}
export function configured() {
  const e = runtime();
  return !!(
    e.ENTRA_AUTHORITY &&
    e.ENTRA_CLIENT_ID &&
    e.ENTRA_CLIENT_SECRET &&
    e.APP_ORIGIN
  );
}
export async function identity(req: Request) {
  const t = cookie(req, "__Host-bp_session");
  if (!/^[a-f0-9]{64}$/.test(t)) return null;
  return await db()
    .prepare(
      "SELECT u.id,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires_at>?",
    )
    .bind(await hash(t), Date.now())
    .first<{ id: string; name: string }>();
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function assertOrigin(req: Request) {
  const origin = runtime().APP_ORIGIN || new URL(req.url).origin;
  if (req.headers.get("origin") !== origin)
    throw new HttpError(403, "This action must come from Beer Passport.");
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function limit(key: string, max: number, seconds = 60) {
  const k = await hash(`${key}|${Math.floor(Date.now() / (seconds * 1000))}`);
  const row = await db()
    .prepare(
      "INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    )
    .bind(k, Date.now() + seconds * 1000)
    .first<{ count: number }>();
  if (!row || row.count > max)
    throw new HttpError(429, "Too many requests. Please try again shortly.");
}
let metadataCache: { authority: string; expires: number; value: any } | null =
  null;
export async function metadata() {
  const e = runtime();
  if (!configured())
    throw new HttpError(503, "Account sign-in is not available yet.");
  const u = new URL(e.ENTRA_AUTHORITY!);
  if (
    u.protocol !== "https:" ||
    !(
      u.hostname.endsWith(".ciamlogin.com") ||
      u.hostname === "login.microsoftonline.com"
    ) ||
    u.username ||
    u.password
  )
    throw new Error("Invalid authority");
  if (
    metadataCache &&
    metadataCache.authority === u.href &&
    metadataCache.expires > Date.now()
  )
    return metadataCache.value;
  const r = await fetch(
    u.href.replace(/\/$/, "") + "/.well-known/openid-configuration",
  );
  if (!r.ok) throw new Error("Identity provider unavailable");
  const m: any = await r.json();
  for (const k of ["authorization_endpoint", "token_endpoint", "jwks_uri"]) {
    const x = new URL(m[k]);
    if (
      x.protocol !== "https:" ||
      !(
        x.hostname.endsWith(".ciamlogin.com") ||
        x.hostname === "login.microsoftonline.com"
      )
    )
      throw new Error("Invalid identity endpoint");
  }
  if (!m.issuer || m.issuer.includes("{"))
    throw new Error("Use tenant-specific authority");
  metadataCache = {
    authority: u.href,
    expires: Date.now() + 3600000,
    value: m,
  };
  return m;
}
export async function signIn(req: Request) {
  const m = await metadata(),
    e = runtime();
  await limit(
    "auth:" + (req.headers.get("cf-connecting-ip") || "unknown"),
    20,
    300,
  );
  const transaction = token(),
    state = token(),
    nonce = token(),
    verifier = token();
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
  );
  const challenge = btoa(String.fromCharCode(...digest))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  await db()
    .prepare(
      "INSERT INTO auth_transactions(hash,state,nonce,verifier,expires_at) VALUES(?,?,?,?,?)",
    )
    .bind(await hash(transaction), state, nonce, verifier, Date.now() + 600000)
    .run();
  const u = new URL(m.authorization_endpoint);
  u.search = new URLSearchParams({
    client_id: e.ENTRA_CLIENT_ID!,
    response_type: "code",
    response_mode: "query",
    scope: "openid profile email",
    redirect_uri: e.APP_ORIGIN + "/api/auth/entra/callback",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return new Response(null, {
    status: 302,
    headers: {
      Location: u.href,
      "Set-Cookie": setCookie("__Host-bp_auth", transaction, 600),
      "Cache-Control": "no-store",
    },
  });
}
const keysets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export async function callback(req: Request) {
  const e = runtime(),
    url = new URL(req.url);
  const t = cookie(req, "__Host-bp_auth");
  if (!/^[a-f0-9]{64}$/.test(t))
    throw new HttpError(400, "Sign-in expired. Please try again.");
  const tx = await db()
    .prepare(
      "DELETE FROM auth_transactions WHERE hash=? AND expires_at>? RETURNING state,nonce,verifier",
    )
    .bind(await hash(t), Date.now())
    .first<{ state: string; nonce: string; verifier: string }>();
  if (
    !tx ||
    url.searchParams.get("state") !== tx.state ||
    !url.searchParams.get("code")
  )
    throw new HttpError(
      400,
      "Sign-in could not be verified. Please try again.",
    );
  const m = await metadata();
  const result = await fetch(m.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: e.ENTRA_CLIENT_ID!,
      client_secret: e.ENTRA_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code: url.searchParams.get("code")!,
      redirect_uri: e.APP_ORIGIN + "/api/auth/entra/callback",
      code_verifier: tx.verifier,
    }),
  });
  if (!result.ok) throw new HttpError(401, "Sign-in could not be completed.");
  const data: any = await result.json();
  if (!keysets.has(m.jwks_uri))
    keysets.set(m.jwks_uri, createRemoteJWKSet(new URL(m.jwks_uri)));
  const { payload } = await jwtVerify(data.id_token, keysets.get(m.jwks_uri)!, {
    issuer: m.issuer,
    audience: e.ENTRA_CLIENT_ID,
    algorithms: ["RS256"],
    requiredClaims: ["exp", "iat", "sub", "nonce"],
    maxTokenAge: "10m",
  });
  if (payload.nonce !== tx.nonce || typeof payload.sub !== "string")
    throw new HttpError(401, "Sign-in could not be verified.");
  const id = crypto.randomUUID(),
    name =
      typeof payload.name === "string"
        ? payload.name.slice(0, 80)
        : "Traveller";
  await db()
    .prepare(
      "INSERT INTO users(id,subject,issuer,name,created_at) VALUES(?,?,?,?,?) ON CONFLICT(issuer,subject) DO NOTHING",
    )
    .bind(id, payload.sub, m.issuer, name, Date.now())
    .run();
  const user = await db()
    .prepare("SELECT id FROM users WHERE subject=? AND issuer=?")
    .bind(payload.sub, m.issuer)
    .first<{ id: string }>();
  const s = token();
  const old = cookie(req, "__Host-bp_session");
  await db().batch([
    db()
      .prepare("DELETE FROM sessions WHERE hash=? OR expires_at<?")
      .bind(await hash(old), Date.now()),
    db()
      .prepare("INSERT INTO sessions(hash,user_id,expires_at) VALUES(?,?,?)")
      .bind(await hash(s), user!.id, Date.now() + 86400000),
    db()
      .prepare("DELETE FROM auth_transactions WHERE expires_at<?")
      .bind(Date.now()),
    db().prepare("DELETE FROM rate_limits WHERE expires_at<?").bind(Date.now()),
  ]);
  const headers = new Headers({
    Location: e.APP_ORIGIN + "/",
    "Cache-Control": "no-store",
  });
  headers.append("Set-Cookie", setCookie("__Host-bp_session", s, 86400));
  headers.append("Set-Cookie", setCookie("__Host-bp_auth", "", 0));
  return new Response(null, { status: 302, headers });
}
export const experienceSql = `SELECT e.id,b.name beer,br.name brewery,b.style,b.abv,e.venue_id venueId,e.rating,e.occurred_at date,e.price,e.currency,e.notes,e.venue_notes venueNotes,e.drink_again drinkAgain,e.would_return wouldReturn,e.venue_rating venueRating,e.pour_rating pourRating,e.price_rating priceRating,e.contribute,(SELECT '/api/photos/'||p.id FROM photos p WHERE p.experience_id=e.id LIMIT 1) photo FROM experiences e JOIN beers b ON b.id=e.beer_id JOIN breweries br ON br.id=b.brewery_id`;
export const venueSql =
  "SELECT id,name,city,country,country_code countryCode,lat,lng,status FROM venues";
