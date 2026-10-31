# Gap Analysis and Roadmap (Connect-Backend)

Differences between the project report (target) and this repo's code, plus known defects. Update when a gap closes or a new one appears. Last verified 2026-11-01.

## A. Report vs code

| # | Area | Report says | Code today | Action |
|---|---|---|---|---|
| G1 | Signaling transport | Express + Socket.IO, events like `room:join` | Socket.IO (done); events still kebab-case (`join-room`) | Transport done (ADR-0003 Accepted); rename to colon style + add `room:leave`/`room:end`/chat as feature specs |
| G2 | Room persistence | PostgreSQL rooms/participants, lifecycle states | In-memory maps | FR-ROOM-06/07 |
| G3 | Room auth | JWT on create/join, host role, password, host controls, `room:end` | None | FR-AUTH-03, FR-ROOM-01..05; see `04-auth-integration.md` |
| G4 | Chat | Real-time chat relay | Not present | FR-CHAT-01 |
| G5 | Codecs / simulcast | VP8/VP9/H.264 + Opus; 3-layer VP8 simulcast | Opus + VP8 | FR-MEDIA-06 |
| G6 | Error format | RFC 7807 | ad-hoc `{ error }` | Align with auth service decision |
| G7 | API versioning | `/api/v1/` | `/api` | Add prefix (breaking for frontend) |
| G8 | TURN | HMAC short-lived credentials | Static `TURN_SERVERS` returned; HMAC helper unused | Wire `generateTurnCredentials` into `/turn-credentials` and transport creation |
| G9 | Infra | Docker, Nginx, Coturn, Prometheus/Grafana | None in this repo | Deployment feature spec |
| G10 | Testing | Jest + mediasoup lifecycle tests | No tests; no `test` script | Add tests; don't cite report numbers as facts |
| G11 | Worker pool | Resilient worker pool | A worker dying exits the process | Replace dead workers, close affected rooms |
| G12 | Code quality | ESLint + Prettier + pre-commit hooks | None configured | Add |
| G13 | Versions | Express 4, Node 20 | Express 5, Node 20+ | Docs only |

## B. Known defects (not yet fixed)

| # | Where | Defect |
|---|---|---|
| D1 | `src/index.ts` | **Fixed**: `CORS_ORIGIN` is now applied to REST and Socket.IO, but still defaults to `*` when unset |
| D2 | `src/index.ts` | Invalid JSON/handler errors are only `console.error`'d; client gets no error message |
| D3 | `src/api.ts` | `/keys/:peerId` unauthenticated, unbounded in-memory map, entries never deleted |
| D4 | `src/handlers/createTransport.ts` | Port range hard-coded 40000–49151 (report default 40000–49999); `generateTurnCredentials()` evaluated once at module load (would expire) |
| D5 | `src/handlers/joinRoom.ts` | **Fixed** (membership set before `joined-room`, double join ignored, other messages require the joined `roomId`); was: `joined-room` sent **before** `ws.roomId` is set and the peer is added; a peer may join twice; no membership checks on `create-transport`/`produce`/`consume` (they trust client `roomId`) |
| D6 | `src/index.ts` | `JSON.parse` failures and unknown types are swallowed; no message size/rate limits |
| D7 | `src/rooms.ts` | Rooms are never removed (only routers are); `Math.random` used for codes; collision check uses wrong index (`codeIndex`, never populated) |
| D8 | `src/lib/*.ts` | Unused client-style crypto helpers (dead code) |
| D9 | README | Previously claimed a worker crash doesn't affect other rooms (fixed in docs; see G11) |

## C. Suggested roadmap (each becomes a feature spec)

1. **001 Room model + persistence** — Prisma `rooms`/`room_participants`, lifecycle, `/api/v1`, fix D5/D7 (G2, G7).
2. **002 Auth integration** — JWT middleware, authenticated WS join, restrict `/keys`, CORS (G3, D1, D3) — needs ADR on token verification.
3. **003 E2EE hardening (server side)** — membership-checked key relay, key registry TTL, tolerate frontend fail-closed behaviour (E1–E6 in `03-e2ee.md`).
4. **004 Host controls + end room** (FR-ROOM-04/05).
5. **005 Chat relay** (FR-CHAT-01).
6. **006 Deployment** — Dockerfile (host networking for mediasoup), Compose, Coturn + HMAC TURN, Prometheus metrics (G8, G9).
7. **007 Tests** — Jest + mediasoup lifecycle tests (G10).
8. **008 Resilience** — worker replacement, graceful shutdown (G11).
9. Report future work: multi-node SFU cluster, lobby/co-host, simulcast + codecs (G5).
