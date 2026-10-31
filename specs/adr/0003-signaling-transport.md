# ADR-0003 — Raw `ws` vs Socket.IO for signaling

- **Status:** Proposed — **decision needed from the project owner**
- **Date:** 2026-11-01

## Context

The report specifies Express + Socket.IO with colon-style events (`room:join`, `transport:create`, …). The implementation uses raw `ws` with a fully typed discriminated union (`join-room`, …) and an exhaustive router. Connect-Frontend mirrors the current types and uses a raw `WebSocket` client. Switching changes the wire protocol for both repos.

## Options considered

1. **Keep `ws`**, extend the vocabulary (add `room:end`-style messages in the existing kebab-case style, add heartbeat/reconnect logic in the client). Pros: no breaking change, minimal deps, strong typing already in place. Cons: reconnection, rooms/broadcast helpers, and fallback transports must be built; deviates from the report text (update the report instead).
2. **Migrate to Socket.IO.** Pros: auto-reconnect, rooms, acks, matches the report. Cons: breaking change in backend and frontend, heavier client, must re-establish the typed contract (Socket.IO has typed events, but the exhaustive-switch pattern changes).

## Decision

_Pending._ Recommendation: option 1, because NFR-REL-01 (reconnect) can be met with a small client reconnect layer and it avoids a cross-repo rewrite.

## Consequences

Whichever is chosen: update `02-signaling-sfu.md`, `gap-analysis.md` G1, the `types.ts` mirror in Connect-Frontend, and the report's wording if option 1.
