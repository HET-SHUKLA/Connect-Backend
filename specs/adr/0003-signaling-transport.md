# ADR-0003 — Socket.IO vs raw `ws` for signaling

- **Status:** Accepted
- **Date:** 2026-11-01

## Context

The report specifies Express + Socket.IO with colon-style events (`room:join`, `transport:create`, …). The implementation used raw `ws` with a typed discriminated union (`join-room`, …). The project owner decided to follow the report.

## Options considered

1. **Keep `ws`** and update the report. No breaking change, but reconnection, rooms and fallback transports must be built by hand.
2. **Migrate to Socket.IO** (chosen). Matches the report; adds acks, rooms and reconnection primitives.

## Decision

Migrate to Socket.IO 4 on the existing HTTP server (default path `/socket.io`). Step 1 (done) changes only the **transport**: every message keeps its typed shape and is emitted as a Socket.IO event named after its `type` (`join-room`, `create-transport`, …), so handlers and `types.ts` are unchanged. Auto-reconnect is disabled in the client for now because a reconnect creates a new peer with no room state. Step 2 (planned): rename events to the report's colon style (`room:join`, `room:joined`, `transport:create`, …) and add `room:leave`, `room:end`, chat — one feature spec per group.

## Consequences

Breaking wire change for Connect-Frontend (done together). `ws` is no longer a direct dependency. Behind Nginx, WebSocket upgrade must be allowed for `/socket.io/`. Run `npm install` in both repos to refresh lockfiles.
