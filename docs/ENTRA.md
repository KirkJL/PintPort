# Entra account setup

Use Microsoft Entra External ID customer accounts in an **external tenant** for the consumer product. Do not expose the client secret in browser code or GitHub. Entra authenticates; the Worker determines which passport records the signed-in user owns.

## Portal setup

1. Create or select your external tenant.
2. Register Beer Passport as a **Web** application. Copy its Application (client) ID.
3. Register your exact HTTPS redirect URI: `https://YOUR-ORIGIN/api/auth/entra/callback`. Keep production and staging registrations separate.
4. Create the customer sign-up/sign-in user flow and associate this app with it. Choose your customer identity methods and include a display name claim. Do not require users to have Microsoft work accounts unless that is your intended audience.
5. Obtain the **tenant-specific authority**, ending in `/v2.0`, from your tenant's OpenID Connect endpoints. It should use `<tenant>.ciamlogin.com` for an external tenant. Never use `common`, `organizations` or an issuer template.
6. Create a server-side client secret and note its expiry. Store the **value**, not the secret identifier, in Cloudflare. Rotate it before expiry. The auth flow uses `response_type=code`; implicit grant is not needed.

## Worker configuration

From the project folder, run each command and supply the value to its hidden prompt:

```bash
pnpm exec wrangler secret put ENTRA_AUTHORITY
pnpm exec wrangler secret put ENTRA_CLIENT_ID
pnpm exec wrangler secret put ENTRA_CLIENT_SECRET
pnpm exec wrangler secret put APP_ORIGIN
```

`APP_ORIGIN` is the exact HTTPS origin with **no trailing slash**, e.g. your Cloudflare custom domain. It is used for redirects and same-origin mutation checks. All four values must be nonempty or sign-in remains unavailable.

Then rebuild and deploy. If using Cloudflare's dashboard, the same four names can be configured under the Worker settings. Set the client secret as an encrypted secret, never a public `VITE_*` value.

For local HTTPS testing, use a dedicated staging app registration and HTTPS tunnel or local certificate supported by your environment. Secure `__Host-` cookies intentionally are not weakened for plain HTTP debugging.

## End-to-end test

1. Open the deployed HTTPS application. Choose Create your passport.
2. Continue to Entra, complete the configured account flow and return to the app.
3. Verify you see an **empty personal passport**, never another user's data or the sample data as your records.
4. Add a missing public venue, log a beer and refresh. The memory must persist.
5. Upload a photo, sign out, and confirm the photo URL and journal API return 401.
6. Sign in as another staging user and request the first user's experience/photo IDs. They must remain inaccessible.
7. Verify logout invalidates the local session. Sessions expire after 24 hours; no refresh tokens are retained.
8. Check expired state, reused callback, bad nonce, wrong issuer/audience and expired token failure paths.

## Protocol design

- Authorization code flow, S256 PKCE, random state and nonce.
- One-use server-side auth transaction, bound to a Secure HttpOnly browser cookie.
- Tenant-specific discovery with constrained Microsoft endpoint hosts.
- `jose` validates RS256 token signature through remote JWKS, issuer, audience, expiry, subject and nonce. User identity is `(issuer, subject)`, not email.
- Opaque random session cookie with only its SHA-256 hash in D1. Entra tokens are not sent to browser storage or saved in the journal database.
- Server-side owner predicates for private API records and photos.
- Same-origin checks for mutations; no cross-origin API access is enabled.

References:
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
- https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-web-app-node-sign-in-prepare-app?tabs=external-tenant
