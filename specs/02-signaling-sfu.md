# 04 — Signaling, Rooms and SFU (Connect-Backend)

Repo: Connect-Backend · one Node.js process: Express (REST, `/api`) + Socket.IO 4 (default path `/socket.io`) + mediasoup workers. Port `WS_PORT` (default 8080). **This repo owns this contract**; Connect-Frontend mirrors it by hand (`src/types.ts`).

## Room lifecycle (target, report §4.4)

| State | Trigger | Next | Side effects |
|---|---|---|---|
| PENDING | Host calls `POST /rooms` | ACTIVE | Room row created, host assigned, room ID generated |
| ACTIVE | Participant joins via WebSocket | ACTIVE | Participant row, mediasoup transports created |
| ACTIVE | Host ends room (`room:end`) | CLOSING | Transports destroyed, disconnect broadcast |
| CLOSING | All sockets closed | CLOSED | Status persisted, audit log |
| CLOSED | Rejoin attempt | CLOSED | `403 Forbidden`, no state change |

**Current:** a room is an in-memory `{ roomId, createdAt }` (6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`). Router is created on first join and deleted when the last peer leaves. There is no host concept, persistence, password, or end-room.

## REST (as implemented)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/rooms` | Create room → `{ roomId }` (no auth) |
| GET | `/api/rooms/:roomId` | Exists? else 404 |
| GET | `/api/turn-credentials` | `{ iceServers }` from `TURN_SERVERS` env (HMAC credential generator exists in `utils/turn.ts`, endpoint code for it is commented out) |
| POST/GET | `/api/keys/:peerId` | In-memory public-key registry (ECDH public key) |
| GET | `/api/mediasoup-client.js` | Serves the mediasoup-client bundle (used by `src/sample.html`) |

Target: version prefix `/api/v1`, JWT middleware on room create/join, RFC 7807 errors.

## Signaling contract (as implemented: Socket.IO, [ADR-0003](./adr/0003-signaling-transport.md))

Each message is emitted as a Socket.IO event **named after its `type`** (e.g. `emit("join-room", { type: "join-room", roomId })`). Only `join-room` is accepted before the peer has joined; every later message must carry the `roomId` the peer joined or it is ignored. A missing room yields `join-error { reason }` and the server disconnects the socket. Source of truth: `src/types.ts` (**Connect-Frontend keeps a mirror in its `src/types.ts` — a breaking change here must be announced for the frontend**). The server router in `index.ts` uses an exhaustive `switch` with a `never` guard — adding a `ClientMessage` variant without a case is a compile error; keep it that way, and add the type to `clientEvents`.

| Dir | `type` | Payload | Behaviour |
|---|---|---|---|
| C→S | `join-room` | `roomId` | Unknown room ⇒ socket closed `4004 "Room not found"` |
| S→C | `joined-room` | `peerId` | |
| S→C | `router-rtp-capabilities` | `rtpCapabilities` | Client loads mediasoup `Device` |
| S→C | `new-producer` | `producerId, peerId` | Sent for existing producers on join and for each new producer |
| C→S | `create-transport` | `roomId, direction: send|receive` | |
| S→C | `transport-created` | `id, iceParameters, iceCandidates, dtlsParameters, direction, iceServers` | |
| C→S | `connect-transport` | `transportId, dtlsParameters` | |
| C→S | `produce` | `roomId, kind, rtpParameters` | Requires send transport |
| S→C | `produce-created` | `producerId` | |
| C→S | `consume` | `roomId, producerId, rtpCapabilities` | |
| S→C | `consumer-created` | `consumerId, producerId, kind, rtpParameters` | |
| C→S | `request-key` | — | Server fans out `key-requested` to every other peer |
| S→C | `key-requested` | `peerId` | |
| C→S | `key-exchange` | `targetPeerId, encryptedRoomKey` | Relayed opaquely |
| S→C | `key-exchange-received` | `fromPeerId, encryptedRoomKey` | |
| S→C | `peer-left` | `peerId` | On socket close |

Heartbeat: server pings every 30 s. Disconnect cleanup: remove peer, close send/recv transports, broadcast `peer-left`, delete router if room empty.

### Target contract (report §5.4, Socket.IO style) — not implemented

`room:join {roomId, token, password?}` → `room:joined {routerRtpCapabilities, participants[]}`; `transport:create/created/connect`; `producer:create` / `producer:new`; `consumer:create/created`; `room:leave`; `room:end` (host only). **Decision needed:** keep raw `ws` and extend the existing vocabulary (cheaper, recommended) *or* migrate to Socket.IO (reconnection, rooms, but a breaking change for the frontend). Whichever is chosen, record an ADR, update this file and `types.ts`, and note the breaking change for Connect-Frontend (which mirrors the types) and `gap-analysis.md` (G1).

## mediasoup

- One `Worker` per CPU core (`os.cpus().length`); `getWorker()` round-robin; a dead worker currently `process.exit(1)` (README claims a crash doesn't take down all rooms — it does today).
- One `Router` per room. Codecs: `audio/opus` 48k stereo, `video/VP8`. Target adds VP9, H.264 and VP8 simulcast (three spatial layers).
- `WebRtcTransport`: UDP 0.0.0.0, `announcedAddress = ANNOUNCED_IP`, port range 40000–49151 (hard-coded; report default 40000–49999), TCP enabled, UDP preferred.
- Producer/Consumer: each peer has one send and one recv transport; consumers are created per remote producer.
- The SFU forwards RTP whose payload is already frame-encrypted by clients (see `03-e2ee.md`).

## Configuration (`src/config.ts`, Zod)

`ANNOUNCED_IP` (required), `WS_PORT` (required), `TURN_SECRET` (required), `TURN_HOST` (required), `TURN_SERVERS` (optional JSON array), `TURN_USERNAME`/`TURN_PASSWORD` (optional), `CORS_ORIGIN` (optional; **currently ignored — CORS is `*`**).

## Integration to build (see features)

Auth middleware (JWT) → persisted rooms with host/password (PostgreSQL via Prisma) → host controls and `room:end` → chat events → metrics (`prom-client`) → Dockerfile with host networking.
