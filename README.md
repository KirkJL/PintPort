# Beer Passport

A personal beer and travel journal. The experience is the record: beer + place + date + photo + memory.

**Delivery status:** working first build for GitHub and Cloudflare. Not deployed. Not launch-ready. Entra sign-in is disabled until configured; no alternative or demo login bypass exists. Sample memories are read-only examples, never imported into the database. Browser visual testing was unavailable because access was declined.

## What is built

- Mobile-first passport with country → city → venue → experience navigation.
- Journal search, country/year filters, experience details and edit/delete flows.
- Clustered personal venue map with an independent venue list when tiles fail.
- Global Explore map, with opt-in anonymous aggregates only. Verified venues require five distinct contributors; experiences from the last seven days are excluded.
- Quick logger: beer, venue and date; rating, photo, price, notes and extra ratings are optional.
- Shared canonical venue/beer records in D1, ownership enforced in API queries.
- Missing-venue submission with nearby/exact-name duplicate checks. Pending venues are visible only to their creator. They do not appear on Explore.
- Private R2 photos: browser decode/resize/re-encode; server JPEG/size/dimension/metadata checks; authenticated photo access.
- Personal statistics. Prices remain separated by currency.
- Downloadable 1080 × 1920 memory/passport cards.
- Journal JSON export, individual photo downloads, passport deletion and sign-out.
- Entra OIDC authorization code flow with PKCE, state, nonce, signature/issuer/audience validation, one-use transactions and opaque HttpOnly sessions.

## Stack

React + TypeScript + Vite for static frontend assets. A same-origin Cloudflare Worker serves the assets and API. Cloudflare D1 stores relational records; R2 stores private photo bytes. Microsoft Entra handles authentication. GitHub stores source and runs validation.

This is **not a GitHub Pages-only application**. Pages cannot run this private API/database/photo layer. Uploading source to GitHub does not deploy it. No GPT hosting is required.

## 1. Upload to GitHub

1. Extract `beer-passport-source.zip`.
2. Create a **private** GitHub repository named `beer-passport`.
3. Upload the **contents** of the extracted `beer-passport` folder at the repository root. Include `.github`, `.gitignore`, `.dev.vars.example` and `pnpm-lock.yaml`; hidden files must be included.
4. Do not upload `node_modules`, `dist`, `.wrangler`, `.dev.vars`, `.env`, secrets or personal database files. Those are excluded from the supplied archive.
5. Commit the files. The included GitHub Actions workflow validates types and builds the app; it does not deploy anything or apply remote migrations.

For a normal local Git workflow after creating an empty repository:

```bash
git init
git add .
git commit -m "Initial Beer Passport application"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/beer-passport.git
git push -u origin main
```

Replace `YOUR-USERNAME`; do not paste credentials into commands or source.

## 2. Run locally

Install Node.js 22.13+ (Node 24 is used for validation) and pnpm 11.25.0. From the project folder:

```bash
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
pnpm db:local
pnpm dev
```

On PowerShell use `Copy-Item .dev.vars.example .dev.vars`. Open the URL printed by Vite. Account sign-in remains unavailable with empty variables, while the sample passport can be explored. `.dev.vars` is private Worker configuration and is ignored by Git.

```bash
pnpm typecheck
pnpm build
```

## 3. Provision Cloudflare

From the same folder:

```bash
pnpm exec wrangler login
pnpm exec wrangler d1 create beer-passport
pnpm exec wrangler r2 bucket create beer-passport-photos
```

1. Copy the **real database UUID** returned by `d1 create` into `wrangler.jsonc` under `d1_databases[0].database_id`.
2. Keep `binding: "DB"` and `binding: "BUCKET"` unchanged. Match the bucket name if you choose a different one.
3. Apply the included migration:

```bash
pnpm db:remote
```

4. Build and deploy:

```bash
pnpm build
pnpm deploy
```

The Cloudflare Vite plugin generates `.wrangler/deploy/config.json`; `wrangler deploy` uses the generated Worker and frontend asset output. A placeholder database ID cannot deploy real data successfully. R2 provisioning may require enabling R2 in your Cloudflare account. Review your selected Cloudflare plan and usage controls before enabling public registrations.

Start with a staging deployment. Configure accounts only after its final HTTPS origin is known.

## 4. Connect Entra

Read [docs/ENTRA.md](docs/ENTRA.md). Supply your tenant-specific authority, app client ID and server-side client secret through Wrangler secret prompts. Register a **Web** redirect URI of:

```text
https://YOUR-APP-ORIGIN/api/auth/entra/callback
```

The consumer product is designed around **Entra External ID in an external tenant**. If you intend to use a workforce tenant instead, confirm that customer access is the intended account audience before configuring it.

## 5. Before public beta

Read [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md). In particular: test actual Entra sign-in, verify the app on phones and desktop browsers, connect a licensed venue provider, implement a venue moderation/merge workflow, exercise backups/restores and run API authorization/security tests in staging.

## Source guide

| File | Purpose |
|---|---|
| `src/App.tsx` | Product views, logger, settings, share-card generation |
| `src/style.css` | Forest-green passport identity and responsive layouts |
| `components/passport-map.tsx` | Lazy-loaded MapLibre clustering and map failure handling |
| `lib/data.ts` | Types, statistics and clearly labelled sample data |
| `lib/server.ts` | Entra flow, sessions, authorization helpers and rate limiting |
| `worker/api.ts` | Owner-scoped APIs, uploads, export and deletion |
| `worker/index.ts` | API/static routing and security headers |
| `db/schema.ts` | Relational schema with shared entities and private records |
| `drizzle/` | Initial database migration and schema metadata |
| `wrangler.jsonc` | Your Cloudflare bindings |
| `.github/workflows/validate.yml` | GitHub type/build validation |
| `docs/SOURCE-LINES.md` | Source line-number map |

## Known limitations

- Entra end-to-end authentication needs your real tenant and application. The implementation has not been exercised against that tenant.
- No external worldwide venue directory is connected. Search currently covers verified shared venues and your own pending venues. This is the next infrastructure task; do not market worldwide venue autocomplete yet.
- Nearby detection is conservative: two genuinely different bars within the configured range require review. It is a duplicate prevention guard, not a complete entity resolution system. Exact normalized name and coordinate identity is enforced with a unique database index; fuzzy name matching and concurrent near-duplicate reconciliation still need moderation.
- Venue merge/aliases and provider references are represented in the schema, but there is no admin moderation UI or merge operation yet. Beer/brewery identities also need moderation.
- Global results are capped at 2,000 venues. Viewport/tile aggregation is needed before a large public rollout.
- Journals load up to 2,000 experiences; exports include all journal records. Pagination is required before increasing the journal limit.
- Photo uploads have a 500-photo account quota, 2 MB transformed-file limit and 4-million-pixel decoded-dimension limit. The server validates JPEG structure and rejects EXIF segments; a production image decoding/scanning service remains a release requirement.
- Public profiles, social features, recommendations, yearly recaps, trip collections, payments and Google review handoff are intentionally absent.
- PWA metadata is included; there is no offline journal queue or service worker. Native apps are not built.
- Deleting the passport does not delete the identity from Entra. Shared beer/venue catalogue entries remain; your notes, experiences and photos are removed. Provider-side account deletion and backup retention need a documented policy.

## Photo credits

Sample photos are from Pexels, whose pages mark them free to use:
- Tugay Kocatürk: https://www.pexels.com/photo/people-holding-beer-glasses-and-french-fries-on-the-table-21952119/
- Kaboompics: https://www.pexels.com/photo/hand-holding-glass-of-beer-on-the-beach-4996691/

They are illustrative sample assets and are not presented as Kirky's own photographs. OpenFreeMap/MapLibre/OpenStreetMap attribution remains visible on the map.
