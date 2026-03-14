# Welcome Back. Good That You Asked.

Never continue building without knowing exactly where you stand. That's a good habit.

Here's everything we've decided, top to bottom.

---

# The App — High Level Design

## What We're Building
```
E2EE Group Video/Voice Conferencing App
Max 8-10 people per room
Server cannot read any media. Ever.
```

---

## Tech Stack
```
Frontend    → React + TypeScript (Vite)
Backend     → Node.js + TypeScript
WebSockets  → Raw ws library (your choice, justified)
SFU         → mediasoup
Database    → MongoDB (later, Phase 4)
Auth        → Deliberately deferred to Phase 4
Deployment  → Frontend on Vercel, Backend on VPS
Structure   → Monorepo (client/, server/, shared/)
```

---

## Architecture — 4 Layers

```
Layer 1 — SIGNALING LAYER
Your WebSocket server.
Coordinates connections.
Never sees media content.
Only routes control messages.

Layer 2 — MEDIA LAYER
mediasoup SFU.
Receives encrypted media from peers.
Forwards packets without decoding.
Completely blind to content.

Layer 3 — E2EE LAYER
Lives entirely in the browser.
Server never touches keys.
Never touches plaintext media.

Layer 4 — AUTH LAYER
Phase 4. Not touching until core works.
```

---

## mediasoup Architecture
```
Node.js Process
├── Worker 1 (CPU Core 1)
│   ├── Router → Room A
│   │   ├── WebRtcTransport → Alice
│   │   │   └── Producer (Alice's video/audio)
│   │   └── WebRtcTransport → Bob
│   │       └── Consumer (consuming Alice)
│   └── Router → Room B
│
├── Worker 2 (CPU Core 2)
│   └── Router → Room C
│
└── ... one Worker per CPU core
    Rooms distributed via round robin
```

---

## E2EE Key Architecture
```
On Registration:
├── Browser generates ECDH key pair
├── Private key → stays in browser forever
└── Public key → uploaded to server

When Room is Created:
└── Browser generates random AES-256 Room Key

When New User Joins:
├── Server tells Alice that Bob wants to join
├── Alice fetches Bob's public key from server
├── Alice derives shared secret (ECDH)
├── Alice encrypts Room Key with shared secret
├── Sends encrypted blob through server to Bob
├── Bob derives same shared secret
└── Bob decrypts Room Key
    Server saw encrypted blob. Useless to them.

Media Flow:
├── Alice encrypts video with Room Key
├── Sends to mediasoup
├── mediasoup forwards encrypted packets
├── Bob/Carol/Dave decrypt with same Room Key
└── Server forwards but cannot read. Ever.

When Someone Leaves:
└── Generate NEW Room Key
    Distribute to remaining members only
    → Forward Secrecy

When Someone New Joins:
└── They get CURRENT Room Key only
    Cannot decrypt past media
    → Future Secrecy
```

---

## Build Phases
```
Phase 1 — Make the call work
├── Project skeleton (monorepo)
├── mediasoup setup
├── WebRTC signaling
├── Working 1:1 then group call
└── TURN server

Phase 2 — Make it E2EE
├── ECDH key pairs
├── Room key generation
├── Key encapsulation
└── Forward/Future secrecy

Phase 3 — Add Chat
├── E2EE text messages
└── Ciphertext stored in DB

Phase 4 — Auth + Polish
├── Register/Login (JWT)
├── User search
└── Deploy everything
```

---

## The Signaling Message Flow
```
Client → Server: join-room { roomId }
Server → Client: create transport details back
Client → Server: create-transport { roomId }
Server → Client: transport params (id, iceParameters, 
                  iceCandidates, dtlsParameters)
Client → Server: connect-transport { dtlsParameters }
Client → Server: produce { roomId, kind, rtpParameters }
Server → Client: producer-created { producerId }
Server → All:    new-producer { producerId, peerId }
Client → Server: consume { producerId, roomId }
Server → Client: consumer params
```

---

## Where We Stopped

We were building `shared/types.ts` — the TypeScript types for every signaling message.

We had gotten to:

```typescript
// Done so far
type JoinRoomMessage = {
    type: "join-room"
    roomId: string
}

type CreateTransportMessage = {
    type: "create-transport"
    roomId: string
}
```

And I had just asked you — when server creates a transport and responds to the client, what 4 fields does that response contain?

**Go look at mediasoup docs for `router.createWebRtcTransport()` return value. Find those 4 fields. Then we continue.**