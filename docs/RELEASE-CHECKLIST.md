# Before inviting users

This is a first build, not a security-audited public release.

## Validation already completed

- TypeScript compile check passes.
- Frontend and Cloudflare Worker production builds pass.
- Both relational migrations apply to local D1.
- 12 local API checks pass: unauthenticated read/write rejection, canonical venue reuse, experience save/readback/delete, cross-user journal isolation and edit/delete denial, private photo authentication, invalid ratings and global map exclusion of private/pending venues.
- Mutation-origin rejection was observed in a separate local request; the full Entra flow remains untested.
- Browser QA was not performed: browser access was declined. Do not treat responsive CSS or a successful build as proof of visual correctness.

## Required staging checks

1. Configure Entra and run docs/ENTRA.md, including two-user ownership tests.
2. Test desktop and 390px mobile layouts, touch navigation, keyboard operation, focus traps, 200% zoom, contrast and screen-reader labels. Confirm no horizontal overflow.
3. Verify map tiles, clustering, country filters and the independent venue list when map loading fails. Map tiles are third-party requests; document this in the privacy notice.
4. Log, refresh, edit and delete entries. Test upload failure and retry, and verify no lost draft or accidental duplicate submission.
5. Test JPEG validation, EXIF rejection, oversized streaming requests, dimensions, upload quotas and all private photo authorization paths. Add actual image decoding/scanning before public uploads.
6. Test sign-out, expired sessions, origin checks, rate limiting, authorization, wrong-owner resource IDs, SQL parameters, XSS output escaping and account deletion.
7. Validate D1 and R2 backups and restoration together. Document deletion/backup retention and provider identity deletion.
8. Add a licensed external venue directory, canonical provider IDs, concurrent duplicate prevention, moderated missing-venue submissions and audited reversible merges. A schema alone does not implement this workflow.
9. Add a durable publication process for global aggregates. Thresholds and a seven-day delay reduce leakage but do not prove anonymity against repeated queries; evaluate sparse areas and differencing attacks.
10. Add viewport/tile aggregation, pagination, per-user storage accounting, bounded orphan-photo cleanup, monitoring and usage alerts.
11. Add an accessible account privacy notice, lawful data processing policies and age/audience choices for the markets you will serve.
12. Test Entra and Cloudflare staging-to-production configuration with separate identity apps/resources. Keep secrets out of Git and audit dependencies before widening access.

## Deferred scope

Social graph, comments/messages, public individual check-ins, native apps, monetisation, Google review handoff, yearly recap, and offline write queues.
