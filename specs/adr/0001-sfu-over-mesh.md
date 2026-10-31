# ADR-0001 — Use an SFU (mediasoup) instead of full-mesh P2P

- **Status:** Accepted
- **Date:** 2026-11-01 (records a decision from the project report §4.6)

## Context

Full-mesh P2P gives trivial E2EE but each client uploads N-1 streams; it collapses past a few participants. The requirement is ≥10 participants per room (FR-MEDIA-05) with constant upload per client.

## Options considered

1. Full-mesh P2P — simple, no media server, O(N) upload per client.
2. SFU (mediasoup) — one upload per client, server forwards selectively; terminates DTLS-SRTP so needs an extra E2EE layer.
3. MCU — decodes/mixes; breaks E2EE and is CPU-heavy.

## Decision

mediasoup SFU, one Worker per CPU core, one Router per room, round-robin worker assignment.

## Consequences

Scales per room; requires frame-level E2EE (ADR-0002); needs UDP port range and a TURN server; multi-node scaling is future work.
