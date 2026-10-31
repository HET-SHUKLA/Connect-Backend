# ADR-0002 — Frame-level E2EE on top of DTLS-SRTP; server relays keys blindly

- **Status:** Accepted
- **Date:** 2026-11-01 (records implemented design; report §3.4/§8.4)

## Context

An SFU terminates DTLS-SRTP, so transport encryption alone lets the server read media. True E2EE needs encryption before SRTP, with a shared key the server never learns.

## Options considered

1. DTLS-SRTP only — not E2EE (rejected).
2. Frame-level encryption via WebRTC Encoded Transform (`RTCRtpScriptTransform`) + per-room AES-GCM key, key exchange over signaling (chosen; same direction as Jitsi/SFrame).
3. SFrame / MLS (RFC 9420) — standards-based, not yet practical in browsers; future work.

## Decision

Clients encrypt frames with AES-GCM using a room key distributed through ECDH-wrapped messages relayed by this backend. The backend only routes `key-requested` / `key-exchange` messages and hosts a public-key registry; it never holds a room key.

## Consequences

Backend must never log, persist or modify relayed key material. Known weaknesses (unauthenticated public keys, no rotation, fail-open worker) are tracked in `03-e2ee.md` (E1–E8). A future ADR should supersede this one when moving to SFrame/MLS.
