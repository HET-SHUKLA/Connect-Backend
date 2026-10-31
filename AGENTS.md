# Connect-Backend — Agent Guide

Signaling + SFU for **Connect**, an end-to-end encrypted (E2EE) video conferencing app. One Node.js process: Express REST (`/api`), `ws` WebSocket (`/ws`), mediasoup workers (one per CPU core). This repo is **self-contained**: everything an agent needs is here, including the specs. It is one of three sibling repos (`Connect-Frontend`, `Authentication-Service`) that you do **not** need cloned; their relevant contracts are documented in [specs/](./specs/README.md).

## Spec-driven workflow

Read the relevant spec **before** changing code; update it in the same change.

1. **Specify** — find/create the spec in `specs/` (`/spec-new` creates `specs/features/NNN-slug.md` from [the template](./specs/templates/feature-spec.md)). Requirements have IDs (`FR-ROOM-03`) in [specs/01-requirements.md](./specs/01-requirements.md).
2. **Decide** — significant choices become an ADR in `specs/adr/` ([template](./specs/templates/adr.md)).
3. **Plan** — affected files, contract changes (REST/WS/DB/env), ordered tasks, in the feature spec.
4. **Implement** — contracts first (types, config), then handlers, then docs. Prefer small vertical slices (`/spec-implement`).
5. **Verify** — run build; exercise the flow (curl, `src/sample.html`, or a client).
6. **Sync** — update spec status, requirement table, gap analysis, README (`/spec-sync`).

Source priority when sources disagree: user instruction > `specs/` > README/AGENTS.md > code comments. `specs/00-system-context.md` summarises the project report (target design); the code is the *current* state; [specs/gap-analysis.md](./specs/gap-analysis.md) lists every known difference. If something is undecided, ask the user.

## Spec map

| File | Contents |
|---|---|
| [00-system-context.md](./specs/00-system-context.md) | Vision, actors, whole-system architecture, sibling repos and contract ownership |
| [01-requirements.md](./specs/01-requirements.md) | Requirements relevant to this repo, with status |
| [02-signaling-sfu.md](./specs/02-signaling-sfu.md) | Room lifecycle, REST + WebSocket contract (**owned by this repo**), mediasoup design, config |
| [03-e2ee.md](./specs/03-e2ee.md) | Encryption design, threat model, weaknesses, rules |
| [04-auth-integration.md](./specs/04-auth-integration.md) | What this repo needs from Authentication-Service (JWT validation) |
| [gap-analysis.md](./specs/gap-analysis.md) | Report-vs-code gaps, known defects, roadmap |
| [adr/](./specs/adr) · [features/](./specs/features) · [templates/](./specs/templates) | Decisions, per-feature specs, templates |

Prompts: `/spec-new`, `/spec-implement`, `/spec-sync` in [.github/prompts](./.github/prompts). Path rules: [.github/instructions](./.github/instructions).

## Commands

```bash
npm install     # postinstall compiles the mediasoup C++ worker (Python 3 + C++ toolchain needed)
npm run dev     # tsx src/index.ts, port WS_PORT (default 8080)
npm run build   # tsc → dist/
npm start       # node dist/index.js
```
No test suite exists yet. Don't claim tests passed; state exactly what you ran.

## Layout (`src/`)

| Path | Role |
|---|---|
| `index.ts` | HTTP+WS bootstrap, message router (`handleMessage`, exhaustive `switch`), disconnect cleanup |
| `api.ts` | REST: `POST /api/rooms`, `GET /api/rooms/:id`, `GET /api/turn-credentials`, `/api/keys/:peerId`, `/api/mediasoup-client.js` |
| `rooms.ts` | In-memory room registry (6-char codes) |
| `handlers/` | `joinRoom`, `createTransport`, `connectTransport`, `createProducer`, `createConsume` |
| `mediasoup/` | `worker.ts` (pool, round-robin), `router.ts` (router per room, codecs), `transport.ts`, `room.ts` |
| `utils/` | `constants.ts`, `helper.ts` (`send`), `turn.ts` (HMAC-SHA1 TURN credentials) |
| `lib/` | `crypto.ts`, `keyExchange.ts` |
| `types.ts` | Signaling message unions + `PeerSocket` — **contract owned here, mirrored by Connect-Frontend** |
| `config.ts` | Zod-validated env (process exits on invalid) |
| `sample.html` | Manual test client |

Environment (`.env`, gitignored): `WS_PORT`, `ANNOUNCED_IP`, `TURN_SECRET`, `TURN_HOST` required; `TURN_SERVERS`, `TURN_USERNAME`, `TURN_PASSWORD`, `CORS_ORIGIN` optional.

## Contract ownership (this repo is the source of truth for)

- REST under `/api` and the WebSocket vocabulary in `src/types.ts` (documented in [02-signaling-sfu.md](./specs/02-signaling-sfu.md)). Connect-Frontend keeps a manual mirror. **Any change to a message or REST shape is a breaking change for the frontend**: update `types.ts`, the spec table, and call it out in the commit/PR so the frontend repo can follow.
- It *consumes* the JWT issued by Authentication-Service (see [04-auth-integration.md](./specs/04-auth-integration.md)).

## Rules for every change

- Strict TypeScript, ESM: relative imports end in `.js`. No new `any`.
- Adding a signaling message: type → add to `ClientMessage`/`ServerMessage` → `case` in `handleMessage` (keep the `never` guard) → handler in `handlers/` → spec table → note for frontend.
- Validate all external input; never trust client-provided `roomId`/`peerId` without membership checks.
- Close every mediasoup object you create (transports, producers, consumers, routers) on leave/empty room.
- Never log, store or inspect room keys or media; key-exchange payloads are relayed opaquely. Changes near key exchange need a security note in [03-e2ee.md](./specs/03-e2ee.md).
- New env var ⇒ `config.ts` schema **and** README table. Never commit `.env*` or secrets.
- No features beyond the active spec; unrelated defects go to `specs/gap-analysis.md`, not into the diff.
- Git: feature branches (`feat/<slug>`); never push, force-push or rewrite history unless asked.
- Keep the README truthful when setup or behaviour changes.

## Known gaps (don't assume these exist)

No auth/JWT on REST or WS; rooms in memory (no PostgreSQL, password, host, end-room); no chat; Opus + VP8 only, no simulcast; CORS `*`; `/keys` unauthenticated; no Dockerfile/Prometheus. See [gap-analysis.md](./specs/gap-analysis.md).
