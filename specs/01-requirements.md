# 01 — Requirements (Connect-Backend)

Status as of 2026-11-01, verified against the code. Source: project report §2.4–2.5. Only requirements this repo implements or enables are listed; other repos track the rest.

## Functional

### Rooms

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR-ROOM-01 | Authenticated users **must** create a room and get a unique ID | Partial | `POST /api/rooms` works, **no auth**; 6-char code, in-memory |
| FR-ROOM-02 | Rooms **may** be password protected (bcrypt hash in PostgreSQL) | Planned | |
| FR-ROOM-03 | Authenticated users **must** join by room ID (+ password if set) | Partial | Join by code works; no auth/password |
| FR-ROOM-04 | Host **must** be able to mute/unmute/remove participants | Planned | |
| FR-ROOM-05 | Host **must** be able to end the session for everyone | Planned | `room:end` in report |
| FR-ROOM-06 | Room state/participants **must** persist in PostgreSQL | Planned | Currently in-memory `Map`s |
| FR-ROOM-07 | Room lifecycle **must** follow PENDING→ACTIVE→CLOSING→CLOSED | Planned | See `02-signaling-sfu.md` |

### Media and E2EE

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR-MEDIA-01 | Real-time audio/video over WebRTC | Implemented | |
| FR-MEDIA-02 | mediasoup **must** be the SFU | Implemented | Worker per CPU core, round-robin |
| FR-MEDIA-05 | ≥10 simultaneous participants per room | Planned | Design target, never measured |
| FR-MEDIA-06 | VP8/VP9/H.264 + Opus; VP8 simulcast (360/540/720p) | Partial | Opus + VP8 only |
| FR-E2EE-01 | SFU **must not** be able to read media | Implemented (client-side) | Frames encrypted by the frontend; server forwards ciphertext |
| FR-E2EE-02 | Room key **must** be distributed without the server seeing it | Partial | Relay of ECDH-wrapped key; public keys served by this backend unauthenticated |

### Auth consumption

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FR-AUTH-03 | API **must** reject requests without a valid, non-expired JWT | Planned | Not enforced in this repo |

### Chat / Deployment

| ID | Requirement | Status |
|---|---|---|
| FR-CHAT-01 | Real-time in-room text chat (relay over WebSocket) | Planned |
| FR-DEPLOY-01 | Containerised (Docker), orchestrated by Compose | Planned (no Dockerfile) |

## Non-functional

| ID | Requirement | Status |
|---|---|---|
| NFR-PERF-01 | Same-region glass-to-glass latency < 150 ms | Not measured |
| NFR-PERF-02 | > 100 simultaneous rooms | Not measured |
| NFR-SEC-01 | No plaintext media at any point the server can see | Partial (see `03-e2ee.md`) |
| NFR-SEC-03 | JWT HS256 validated on every protected request | Planned |
| NFR-SCALE-01 | Horizontal SFU scaling by adding workers | Partial (workers per core; no multi-node) |
| NFR-REL-01 | Disconnect/reconnect without terminating the room | Partial (router deleted when last peer leaves) |
| NFR-OBS-01 | Metrics (Prometheus) and structured logs | Planned (only `console.log`) |
| NFR-QA-01 | Automated tests (Jest; mediasoup lifecycle tests) | Planned (none exist) |
| NFR-API-01 | REST under `/api/v1/`; RFC 7807 errors | Partial (uses `/api`, ad-hoc `{error}`) |
| NFR-PORT-01 | Runnable anywhere with Docker | Planned |
