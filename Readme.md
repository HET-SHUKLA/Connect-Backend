A WebRTC video conferencing backend with a Selective Forwarding Unit (SFU) and end-to-end encrypted media - the server routes video packets it cannot decrypt.

## The Problem

A peer-to-peer mesh collapses past two participants - every new peer multiplies upload bandwidth for everyone. Without a TURN server, connections fail silently for users behind symmetric NAT (~15% of real-world traffic). And a standard SFU solves the scaling problem but introduces a new one: the server can inspect every frame it forwards. This backend addresses all three - an SFU for N-participant rooms, HMAC-signed short-lived TURN credentials for NAT traversal, and a per-room key exchange that keeps the forwarded RTP opaque to the server.

## Technical Highlights

- **mediasoup SFU with round-robin worker pool** - one mediasoup `Worker` process is spawned per CPU core. Rooms are assigned routers via round-robin across the worker pool, so media processing is parallelized and a single worker crash doesn't take down all rooms.

- **Per-room E2EE key exchange over the signaling channel** - when a peer joins, it broadcasts a `request-key` to the room. Existing peers respond with `key-exchange`, carrying an `encryptedRoomKey` encrypted to the joiner's public key. The server relays this payload opaquely - it never holds the plaintext key, so the RTP packets it forwards are undecipherable to the server.

- **HMAC-SHA1 TURN credential rotation** - TURN credentials are generated on demand with a 1-hour expiry, signed with a shared `TURN_SECRET` using `crypto.createHmac`. No long-lived credentials are issued or stored, the credential is the HMAC of the expiry timestamp.

- **Fully typed WebSocket message bus** - every client→server and server→client message shape is declared as a discriminated union in `types.ts`. The message router in `index.ts` uses an exhaustive `switch` with a `never` guard, so TypeScript will catch an unhandled message type at compile time rather than silently dropping it at runtime.

## Architecture

The signaling server and SFU are colocated in a single Node.js process. The WebSocket server handles all signaling (join, transport negotiation, key exchange), Express handles REST (room creation, public key registry, TURN credential endpoint). mediasoup workers run as separate C++ child processes managed by the Node.js parent - media never passes through the JS event loop.

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
| `TURN_SERVERS` | JSON array of ICE server configs passed to clients. Use `[]` locally |
| `CORS_ORIGIN` | Allowed origin for the REST API |

### 3. Start the server

```bash
npm run dev
```

The server is now running at `http://localhost:8080`.

### Create a room and connect

```bash
# Create a room
curl -X POST http://localhost:8080/api/rooms
# → { "roomId": "AB3K7X" }

# Verify it exists
curl http://localhost:8080/api/rooms/AB3K7X
# → { "roomId": "AB3K7X" }

# Get TURN credentials
curl http://localhost:8080/api/turn-credentials
```

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