import { z } from "zod";
import {
  db,
  runtime,
  identity,
  json,
  HttpError,
  assertOrigin,
  limit,
  normalize,
  signIn,
  callback,
  configured,
  cookie,
  hash,
  setCookie,
  experienceSql,
  venueSql,
} from "@/lib/server";
export const dynamic = "force-dynamic";
const score = z.number().min(0).max(10).nullable().default(null);
const experienceSchema = z
  .object({
    beer: z.string().trim().min(1).max(120),
    brewery: z.string().trim().max(120).default("Unknown brewery"),
    style: z.string().trim().max(60).default("Unknown"),
    abv: z.number().min(0).max(100).nullable().default(null),
    venueId: z.string().max(80),
    rating: score,
    date: z
      .string()
      .max(40)
      .refine((s) => Number.isFinite(Date.parse(s)), "Choose a valid date"),
    price: z.number().min(0).max(1000000).nullable().default(null),
    currency: z.enum(["GBP", "EUR", "USD", "TRY", "CAD", "AUD"]),
    notes: z.string().max(3000).default(""),
    venueNotes: z.string().max(3000).default(""),
    drinkAgain: z.boolean().default(true),
    wouldReturn: z.boolean().default(true),
    venueRating: score,
    pourRating: score,
    priceRating: score,
    contribute: z.boolean().default(false),
    photoId: z.string().max(80).nullable().default(null),
  })
  .strict();
const venueSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    city: z.string().trim().min(1).max(100),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    lat: z.number().min(-85).max(85),
    lng: z.number().min(-180).max(180),
  })
  .strict();
async function boundedBody(req: Request, max: number) {
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  let length = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new HttpError(413, "Upload is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
async function payload(req: Request) {
  const bytes = await boundedBody(req, 16000);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "Invalid entry.");
  }
}
async function handle(req: Request) {
  const u = new URL(req.url),
    path = u.pathname.replace(/^\/api\//, "").split("/"),
    method = req.method;
  if (path.join("/") === "auth/entra/start" && method === "GET")
    return signIn(req);
  if (path.join("/") === "auth/entra/callback" && method === "GET")
    return callback(req);
  if (method !== "GET") assertOrigin(req);
  const user = await identity(req);
  if (path[0] === "me" && method === "GET")
    return json({ user, authConfigured: configured() });
  if (path[0] === "explore" && method === "GET") {
    const rows = await db()
      .prepare(
        `SELECT v.id,v.name,v.city,v.country,v.country_code countryCode,v.lat,v.lng,COUNT(e.id) experiences,COUNT(DISTINCT e.beer_id) beers FROM venues v JOIN experiences e ON e.venue_id=v.id WHERE e.contribute=1 AND v.status='verified' AND date(e.occurred_at)<date('now','-7 days') GROUP BY v.id HAVING COUNT(DISTINCT e.user_id)>=5 LIMIT 2000`,
      )
      .all();
    return json({ venues: rows.results });
  }
  if (!user)
    throw new HttpError(401, "Sign in to save and access your passport.");
  await limit("user:" + user.id, 120);
  if (path[0] === "auth" && path[1] === "logout" && method === "POST") {
    await db()
      .prepare("DELETE FROM sessions WHERE hash=?")
      .bind(await hash(cookie(req, "__Host-bp_session")))
      .run();
    return new Response(null, {
      status: 204,
      headers: { "Set-Cookie": setCookie("__Host-bp_session", "", 0) },
    });
  }
  if (path[0] === "journal" && method === "GET") {
    const [entries, venues] = await db().batch([
      db()
        .prepare(
          experienceSql +
            " WHERE e.user_id=? ORDER BY e.occurred_at DESC LIMIT 2000",
        )
        .bind(user.id),
      db()
        .prepare(
          venueSql +
            " WHERE id IN (SELECT venue_id FROM experiences WHERE user_id=?)",
        )
        .bind(user.id),
    ]);
    return json({ experiences: entries.results, venues: venues.results });
  }
  if (path[0] === "venues" && method === "GET") {
    const q = (u.searchParams.get("q") || "").slice(0, 100);
    const rows = await db()
      .prepare(
        venueSql +
          " WHERE merged_into IS NULL AND (status='verified' OR created_by=?) AND normalized LIKE ? ESCAPE '\\' LIMIT 30",
      )
      .bind(user.id, "%" + normalize(q).replace(/[\\%_]/g, "\\$&") + "%")
      .all();
    return json({ venues: rows.results });
  }
  if (path[0] === "venues" && method === "POST") {
    await limit("venue:" + user.id, 10, 3600);
    const v = venueSchema.parse(await payload(req));
    const candidates = await db()
      .prepare(
        venueSql +
          " WHERE merged_into IS NULL AND (status='verified' OR created_by=?) AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ? LIMIT 30",
      )
      .bind(
        user.id,
        v.lat - 0.001,
        v.lat + 0.001,
        v.lng - 0.0015,
        v.lng + 0.0015,
      )
      .all();
    const existing = candidates.results.find(
      (x: any) => normalize(x.name) === normalize(v.name),
    );
    if (existing) return json({ venue: existing });
    if (candidates.results.length)
      return json(
        {
          error:
            "Nearby places already exist. Select an existing place or adjust the location if this is a different venue.",
          candidates: candidates.results,
        },
        409,
      );
    const id = crypto.randomUUID();
    let country;
    try {
      country = new Intl.DisplayNames(["en"], { type: "region" }).of(
        v.countryCode,
      );
    } catch {
      throw new HttpError(400, "Choose a valid country.");
    }
    if (!country || country === v.countryCode)
      throw new HttpError(400, "Choose a valid country.");
    await db()
      .prepare(
        "INSERT INTO venues(id,name,normalized,city,country,country_code,lat,lng,status,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(normalized,lat,lng) DO NOTHING",
      )
      .bind(
        id,
        v.name,
        normalize(v.name),
        v.city,
        country,
        v.countryCode,
        v.lat,
        v.lng,
        "pending",
        user.id,
        Date.now(),
      )
      .run();
    const inserted = await db()
      .prepare("SELECT id FROM venues WHERE id=? AND created_by=?")
      .bind(id, user.id)
      .first();
    if (!inserted)
      throw new HttpError(
        409,
        "This venue is already awaiting review. Please choose an existing verified place.",
      );
    return json({ venue: { id, ...v, country, status: "pending" } }, 201);
  }
  if (path[0] === "experiences" && (method === "POST" || method === "PUT")) {
    await limit("write:" + user.id, 30, 3600);
    const e = experienceSchema.parse(await payload(req));
    const id = method === "PUT" ? path[1] : crypto.randomUUID();
    if (
      method === "PUT" &&
      !(await db()
        .prepare("SELECT id FROM experiences WHERE id=? AND user_id=?")
        .bind(id, user.id)
        .first())
    )
      throw new HttpError(404, "Experience not found.");
    const venue = await db()
      .prepare(
        "SELECT id FROM venues WHERE id=? AND merged_into IS NULL AND (status='verified' OR created_by=?)",
      )
      .bind(e.venueId, user.id)
      .first();
    if (!venue) throw new HttpError(400, "Choose an available venue.");
    if (
      e.photoId &&
      !(await db()
        .prepare(
          "SELECT id FROM photos WHERE id=? AND user_id=? AND (experience_id IS NULL OR experience_id=?)",
        )
        .bind(e.photoId, user.id, id)
        .first())
    )
      throw new HttpError(400, "Photo unavailable.");
    const breweryName = e.brewery || "Unknown brewery",
      bn = normalize(breweryName);
    await db()
      .prepare(
        "INSERT INTO breweries(id,name,normalized) VALUES(?,?,?) ON CONFLICT(normalized) DO NOTHING",
      )
      .bind(crypto.randomUUID(), breweryName, bn)
      .run();
    const brewery: any = await db()
      .prepare("SELECT id FROM breweries WHERE normalized=?")
      .bind(bn)
      .first();
    await db()
      .prepare(
        "INSERT INTO beers(id,name,normalized,brewery_id,style,abv) VALUES(?,?,?,?,?,?) ON CONFLICT(normalized,brewery_id) DO NOTHING",
      )
      .bind(
        crypto.randomUUID(),
        e.beer,
        normalize(e.beer),
        brewery.id,
        e.style || "Unknown",
        e.abv,
      )
      .run();
    const beer: any = await db()
      .prepare("SELECT id FROM beers WHERE normalized=? AND brewery_id=?")
      .bind(normalize(e.beer), brewery.id)
      .first();
    const values = [
      beer.id,
      e.venueId,
      e.rating,
      e.date,
      e.price,
      e.currency,
      e.notes,
      e.venueNotes,
      +e.drinkAgain,
      +e.wouldReturn,
      e.venueRating,
      e.pourRating,
      e.priceRating,
      +e.contribute,
    ];
    const statement =
      method === "POST"
        ? db()
            .prepare(
              "INSERT INTO experiences(beer_id,venue_id,rating,occurred_at,price,currency,notes,venue_notes,drink_again,would_return,venue_rating,pour_rating,price_rating,contribute,id,user_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            )
            .bind(...values, id, user.id, Date.now())
        : db()
            .prepare(
              "UPDATE experiences SET beer_id=?,venue_id=?,rating=?,occurred_at=?,price=?,currency=?,notes=?,venue_notes=?,drink_again=?,would_return=?,venue_rating=?,pour_rating=?,price_rating=?,contribute=? WHERE id=? AND user_id=?",
            )
            .bind(...values, id, user.id);
    await db().batch([
      statement,
      ...(e.photoId
        ? [
            db()
              .prepare(
                "UPDATE photos SET experience_id=NULL WHERE experience_id=? AND user_id=?",
              )
              .bind(id, user.id),
            db()
              .prepare(
                "UPDATE photos SET experience_id=? WHERE id=? AND user_id=?",
              )
              .bind(id, e.photoId, user.id),
          ]
        : []),
    ]);
    return json({ id }, method === "POST" ? 201 : 200);
  }
  if (path[0] === "experiences" && method === "DELETE") {
    const id = path[1];
    const found = await db()
      .prepare("SELECT id FROM experiences WHERE id=? AND user_id=?")
      .bind(id, user.id)
      .first();
    if (!found) throw new HttpError(404, "Experience not found.");
    const photos = await db()
      .prepare(
        "SELECT object_key FROM photos WHERE experience_id=? AND user_id=?",
      )
      .bind(id, user.id)
      .all<{ object_key: string }>();
    for (const p of photos.results) await runtime().BUCKET.delete(p.object_key);
    await db().batch([
      db()
        .prepare("DELETE FROM photos WHERE experience_id=? AND user_id=?")
        .bind(id, user.id),
      db()
        .prepare("DELETE FROM experiences WHERE id=? AND user_id=?")
        .bind(id, user.id),
    ]);
    return json({ deleted: true });
  }
  if (path[0] === "photos" && method === "POST") {
    await limit("upload:" + user.id, 20, 3600);
    const count: any = await db()
      .prepare("SELECT COUNT(*) count FROM photos WHERE user_id=?")
      .bind(user.id)
      .first();
    if (count.count >= 500)
      throw new HttpError(413, "Photo allowance reached.");
    if (
      req.headers.get("content-type") !== "image/jpeg" ||
      Number(req.headers.get("content-length") || 0) > 2000000
    )
      throw new HttpError(415, "Use a JPEG under 2 MB.");
    const bytes = await boundedBody(req, 2000000);
    if (bytes.length > 2000000 || bytes[0] !== 255 || bytes[1] !== 216)
      throw new HttpError(415, "Invalid photo.");
    let pos = 2,
      valid = false;
    while (pos < bytes.length) {
      if (bytes[pos++] !== 255) throw new HttpError(415, "Invalid JPEG.");
      const marker = bytes[pos++];
      if (marker === 0xda) break;
      if (marker === 0xd9) break;
      const len = (bytes[pos] << 8) | bytes[pos + 1];
      if (len < 2 || pos + len > bytes.length)
        throw new HttpError(415, "Invalid photo.");
      if (marker === 0xe1)
        throw new HttpError(415, "Remove photo metadata before uploading.");
      if (marker === 0xc0 || marker === 0xc2) {
        const height = (bytes[pos + 3] << 8) | bytes[pos + 4],
          width = (bytes[pos + 5] << 8) | bytes[pos + 6];
        if (!width || !height || width * height > 4000000)
          throw new HttpError(415, "Photo dimensions are too large.");
        valid = true;
      }
      pos += len;
    }
    if (
      !valid ||
      bytes[bytes.length - 2] !== 255 ||
      bytes[bytes.length - 1] !== 217
    )
      throw new HttpError(415, "Invalid photo.");
    const id = crypto.randomUUID(),
      key = `photos/${user.id}/${id}.jpg`;
    await runtime().BUCKET.put(key, bytes, {
      httpMetadata: { contentType: "image/jpeg" },
    });
    try {
      await db()
        .prepare(
          "INSERT INTO photos(id,user_id,object_key,created_at) VALUES(?,?,?,?)",
        )
        .bind(id, user.id, key, Date.now())
        .run();
    } catch (err) {
      await runtime().BUCKET.delete(key);
      throw err;
    }
    return json({ id, url: "/api/photos/" + id }, 201);
  }
  if (path[0] === "photos" && method === "GET") {
    const p: any = await db()
      .prepare("SELECT object_key FROM photos WHERE id=? AND user_id=?")
      .bind(path[1], user.id)
      .first();
    if (!p) throw new HttpError(404, "Photo not found.");
    const file = await runtime().BUCKET.get(p.object_key);
    if (!file) throw new HttpError(404, "Photo not found.");
    return new Response(file.body, {
      headers: {
        "Content-Type": "image/jpeg",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  }
  if (path[0] === "export" && method === "GET") {
    const entries = await db()
      .prepare(experienceSql + " WHERE e.user_id=? ORDER BY e.occurred_at DESC")
      .bind(user.id)
      .all();
    const venues = await db()
      .prepare(
        venueSql +
          " WHERE id IN (SELECT venue_id FROM experiences WHERE user_id=?)",
      )
      .bind(user.id)
      .all();
    return new Response(
      JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          experiences: entries.results,
          venues: venues.results,
        },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="beer-passport.json"',
          "Cache-Control": "no-store",
        },
      },
    );
  }
  if (path[0] === "account" && method === "DELETE") {
    const photos = await db()
      .prepare("SELECT object_key FROM photos WHERE user_id=?")
      .bind(user.id)
      .all<{ object_key: string }>();
    for (const p of photos.results) await runtime().BUCKET.delete(p.object_key);
    await db().batch([
      db()
        .prepare("UPDATE venues SET created_by=NULL WHERE created_by=?")
        .bind(user.id),
      db().prepare("DELETE FROM photos WHERE user_id=?").bind(user.id),
      db().prepare("DELETE FROM experiences WHERE user_id=?").bind(user.id),
      db().prepare("DELETE FROM sessions WHERE user_id=?").bind(user.id),
      db().prepare("DELETE FROM users WHERE id=?").bind(user.id),
    ]);
    return new Response(null, {
      status: 204,
      headers: { "Set-Cookie": setCookie("__Host-bp_session", "", 0) },
    });
  }
  throw new HttpError(404, "Not found.");
}
async function route(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    if (e instanceof z.ZodError)
      return json({ error: e.issues[0].message }, 400);
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(
      "Beer Passport request failed",
      e instanceof Error ? e.name + ": " + e.message : "Unknown",
    );
    return json(
      { error: "Could not complete that request. Please try again." },
      503,
    );
  }
}
export const GET = route,
  POST = route,
  PUT = route,
  DELETE = route;
