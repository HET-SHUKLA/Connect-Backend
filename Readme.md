Signaling and media backend for **Connect**, an end-to-end encrypted WebRTC video conferencing app. It runs a Selective Forwarding Unit (SFU) built on mediasoup - the server routes media frames that are encrypted by the clients, so it cannot decrypt them.

Part of the Connect system:

| Repo | Role |
|---|---|
| [Connect-Frontend](https://github.com/HET-SHUKLA/Connect-Frontend) | React web client (WebRTC + E2EE) |
| [Connect-Backend](https://github.com/HET-SHUKLA/Connect-Backend) (this repo) | Signaling + mediasoup SFU + TURN credentials |
| [authentication-service](https://github.com/HET-SHUKLA/authentication-service) | Accounts, JWT, sessions (not yet enforced by this backend) |

## Status

Working: room creation by code, WebSocket signaling, mediasoup SFU with a per-core worker pool, Opus + VP8, client-side E2EE key relay.
Not built yet: JWT authentication on REST/WebSocket, persisted rooms (PostgreSQL), room passwords, host controls / end-room, text chat, simulcast and extra codecs, Dockerfile and metrics. Rooms are currently kept **in memory** and are lost on restart.

## The Problem

A peer-to-peer mesh collapses past two participants - every new peer multiplies upload bandwidth for everyone. Without a TURN server, connections fail silently for users behind symmetric NAT (~15% of real-world traffic). And a standard SFU solves the scaling problem but introduces a new one: the server can inspect every frame it forwards. This backend addresses all three - an SFU for N-participant rooms, HMAC-signed short-lived TURN credentials for NAT traversal, and a per-room key exchange that keeps the forwarded RTP opaque to the server.

## Technical Highlights

- **mediasoup SFU with round-robin worker pool** - one mediasoup `Worker` process is spawned per CPU core. Rooms are assigned routers via round-robin across the worker pool, so media processing is parallelized across cores. (A worker death currently shuts the whole server down; isolating it per room is planned.)

- **Per-room E2EE key exchange over the signaling channel** - when a peer joins, it broadcasts a `request-key` to the room. Existing peers respond with `key-exchange`, carrying an `encryptedRoomKey` encrypted to the joiner's public key. The server relays this payload opaquely - it never holds the plaintext key, so the frames it forwards are undecipherable to the server. Known limitation: public keys are fetched from this server (`/api/keys/:peerId`) without authentication, so a malicious server could substitute keys; see [specs/03-e2ee.md](./specs/03-e2ee.md).

- **HMAC-SHA1 TURN credentials (helper ready, not yet wired)** - `utils/turn.ts` generates 1-hour credentials signed with the shared `TURN_SECRET` (coturn `use-auth-secret` style). Today `/api/turn-credentials` and transport creation return the static `TURN_SERVERS` list from the environment; switching them to the HMAC credentials is on the roadmap.

- **Fully typed WebSocket message bus** - every client→server and server→client message shape is declared as a discriminated union in `types.ts`. The message router in `index.ts` uses an exhaustive `switch` with a `never` guard, so TypeScript will catch an unhandled message type at compile time rather than silently dropping it at runtime.

## Architecture

The signaling server and SFU are colocated in a single Node.js process. The WebSocket server handles all signaling (join, transport negotiation, key exchange), Express handles REST (room creation, public key registry, ICE server endpoint). mediasoup workers run as separate C++ child processes managed by the Node.js parent - media never passes through the JS event loop.

```
Client A                        Server                        Client B
   │                               │                               │
   │── POST /api/rooms ───────────▶│                               │
   │◀─ { roomId } ─────────────────│                               │
   │                               │                               │
   │── WS: join-room ─────────────▶│◀──── WS: join-room ──────────│
   │── WS: create-transport ──────▶│◀──── WS: create-transport ───│
   │── WS: produce ───────────────▶│                               │
   │                               │──── WS: new-producer ────────▶│
   │                               │◀─── WS: consume ─────────────│
   │                               │                               │
   │  ── E2EE Key Exchange ──────────────────────────────────────  │
   │── WS: request-key ───────────▶│──── WS: key-requested ───────▶│
   │◀── WS: key-exchange-received ─│◀─── WS: key-exchange ────────│
   │                               │                               │
   │◀════════ RTP (encrypted) ═════╪════════ RTP (encrypted) ═════│
   │           (SFU forwards,      │         server cannot read)   │
```

```
mediasoup Worker Pool
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Worker 0 │ │ Worker 1 │ │ Worker N │  ← 1 per CPU core
│ Room A   │ │ Room B   │ │ Room C   │  ← round-robin assignment
└──────────┘ └──────────┘ └──────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Language | TypeScript 5 |
| SFU | mediasoup 3 |
| Signaling | `ws` (raw WebSocket) |
| HTTP API | Express 5 |
| Validation | Zod 4 |
| NAT Traversal | TURN (HMAC-SHA1 short-lived credentials) |
| Encryption | Per-room key exchange over signaling (client-side E2EE) |

## Project Structure

```
src/
  index.ts            # HTTP + WebSocket bootstrap, message router, disconnect cleanup
  api.ts              # REST routes
  rooms.ts            # In-memory room registry
  config.ts           # Zod-validated environment
  types.ts            # Signaling message types (mirrored in Connect-Frontend)
  handlers/           # join-room, create-transport, connect-transport, produce, consume
  mediasoup/          # worker pool, router per room, transports, per-room peer/producer state
  utils/              # TURN credential helper, send helper, constants
  lib/                # E2EE crypto helpers
```

Contributors and AI agents: see [AGENTS.md](./AGENTS.md). This repo is self-contained: specs, ADRs and agent prompts live in [specs/](./specs/README.md) and `.github/`.

## Local Setup

**Prerequisites:** Node.js 20+, Python 3 and a C++ build toolchain (`build-essential` on Linux / Xcode CLT on macOS) - required to compile the mediasoup native worker.

### 1. Clone and install

```bash
git clone https://github.com/HET-SHUKLA/Connect-Backend.git
cd Connect-Backend
npm install
```

The `postinstall` script automatically compiles the mediasoup C++ worker binary.

### 2. Configure environment

Create a `.env` file in the project root:

```env
WS_PORT=8080
ANNOUNCED_IP=127.0.0.1        # Your public/LAN IP - used in ICE candidates
TURN_SECRET=your-turn-secret  # Shared secret for HMAC TURN credential signing
TURN_HOST=your.turn.host      # Hostname of your TURN server
TURN_SERVERS=[]               # JSON array of ICE server objects (can be [] for local)
CORS_ORIGIN=http://localhost:3000
```

| Variable | Description |
|---|---|
| `WS_PORT` | Port the HTTP + WebSocket server listens on |
| `ANNOUNCED_IP` | Public IP announced in ICE candidates - use `127.0.0.1` for local dev |
| `TURN_SECRET` | Shared secret for HMAC-SHA1 TURN credential generation |
| `TURN_HOST` | Hostname of your TURN server (e.g. `turn.yourdomain.com`) |
| `TURN_SERVERS` | Optional. JSON array of ICE server configs passed to clients. Use `[]` locally |
| `TURN_USERNAME` / `TURN_PASSWORD` | Optional static TURN credentials |
| `CORS_ORIGIN` | Optional. Validated but **not applied yet** - the API currently allows all origins |

`WS_PORT`, `ANNOUNCED_IP`, `TURN_SECRET` and `TURN_HOST` are required; the server exits on startup if they are missing or invalid.

### 3. Start the server

```bash
npm run dev
```

The server is now running at `http://localhost:8080`. Other scripts: `npm run build` (compile to `dist/`) and `npm start` (run the build).

mediasoup uses UDP ports 40000-49151 for media; open them (and set `ANNOUNCED_IP` to a reachable address) when testing from other devices. There is no automated test suite yet.

### Create a room and connect

```bash
# Create a room
curl -X POST http://localhost:8080/api/rooms
# → { "roomId": "AB3K7X" }

# Verify it exists
curl http://localhost:8080/api/rooms/AB3K7X
# → { "roomId": "AB3K7X" }

# Get ICE servers
curl http://localhost:8080/api/turn-credentials
```

### REST API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/rooms` | Create a room, returns `{ roomId }` |
| `GET` | `/api/rooms/:roomId` | Check a room exists (404 otherwise) |
| `GET` | `/api/turn-credentials` | ICE server list for clients |
| `POST` / `GET` | `/api/keys/:peerId` | Register / fetch a peer's ECDH public key (in memory) |
| `GET` | `/api/mediasoup-client.js` | Serves the mediasoup-client bundle (used by `src/sample.html`) |

Then connect to `ws://localhost:8080/ws` and send `{ "type": "join-room", "roomId": "AB3K7X" }`.

## WebSocket Message Reference

All messages are JSON. The client→server and server→client contracts are fully typed as discriminated unions in `src/types.ts`.

**Client → Server**

| Message type | Purpose |
|---|---|
| `join-room` | Join an existing room by `roomId` |
| `create-transport` | Request a send or receive WebRTC transport |
| `connect-transport` | Complete DTLS handshake with transport DTLS params |
| `produce` | Start sending audio or video |
| `consume` | Start receiving a remote producer's stream |
| `request-key` | Request the room encryption key from existing peers |
| `key-exchange` | Send an encrypted room key to a specific peer |

**Server → Client**

| Message type | Purpose |
|---|---|
| `joined-room` | Confirms join, returns assigned `peerId` |
| `router-rtp-capabilities` | Sends router codecs for client-side device loading |
| `transport-created` | ICE/DTLS params for the new transport |
| `produce-created` | Confirms producer creation with `producerId` |
| `new-producer` | Notifies peers of a new stream to consume |
| `consumer-created` | RTP params for the new consumer |
| `peer-left` | Notifies peers of a disconnection |
| `key-requested` | Relays a key request to existing peers |
| `key-exchange-received` | Delivers an encrypted room key to the target peer |