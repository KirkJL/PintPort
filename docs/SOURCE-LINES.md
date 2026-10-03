# Source line guide

Complete files are included; line numbers refer to the delivered version.

| File | Lines |
|---|---:|
| `src/App.tsx` | 2230 |
| `src/main.tsx` | 9 |
| `src/style.css` | 2048 |
| `components/passport-map.tsx` | 189 |
| `lib/data.ts` | 190 |
| `lib/server.ts` | 282 |
| `worker/api.ts` | 498 |
| `worker/index.ts` | 27 |
| `db/schema.ts` | 146 |

## Key entry points

| Function | File | Line |
|---|---|---:|
| `function startLog` | `src/App.tsx` | 310 |
| `async function refresh` | `src/App.tsx` | 173 |
| `async function save` | `src/App.tsx` | 376 |
| `async function createVenue` | `src/App.tsx` | 422 |
| `async function remove` | `src/App.tsx` | 452 |
| `async function downloadCard` | `src/App.tsx` | 480 |
| `export async function identity` | `lib/server.ts` | 58 |
| `export function assertOrigin` | `lib/server.ts` | 77 |
| `export async function limit` | `lib/server.ts` | 90 |
| `export async function metadata` | `lib/server.ts` | 103 |
| `export async function signIn` | `lib/server.ts` | 149 |
| `export async function callback` | `lib/server.ts` | 196 |
| `const experienceSchema` | `worker/api.ts` | 22 |
| `async function boundedBody` | `worker/api.ts` | 56 |
| `async function handle` | `worker/api.ts` | 87 |
| `async function route` | `worker/api.ts` | 478 |
