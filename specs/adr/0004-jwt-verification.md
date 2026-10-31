# ADR-0004 — How the backend verifies Authentication-Service tokens

- **Status:** Proposed — **decision needed from the project owner**
- **Date:** 2026-11-01

## Context

Authentication-Service issues HS256 JWTs (`sub`, `iat`, `exp`; short TTL). The report requires the signaling service to validate the JWT on every protected request (NFR-SEC-03) and to reject expired/invalid tokens (FR-AUTH-03). The two services are separate repos with separate deployments. See `04-auth-integration.md`.

## Options considered

1. **Shared HS256 secret** — local verification, no latency; secret duplicated across services; can't see revocation (`tokenVersion`) unless combined with a cache/introspection.
2. **Introspection call** (`GET /api/v1/auth/me`) — always current; adds latency and a runtime dependency per join.
3. **Asymmetric JWT (RS256/ES256 + JWKS)** — best isolation; requires changing the auth service away from HS256.

## Decision

_Pending._ Recommendation: option 1 for now (matches report), with the token verified once at REST call / WebSocket join, and revisit option 3 when `tokenVersion` revocation is implemented in the auth service.

## Consequences

New env var(s) in `src/config.ts` and README; middleware for REST and WS; the claim names (`sub` vs `userId`) must be agreed with Authentication-Service (see its ADR on token claims).
