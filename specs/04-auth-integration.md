# 04 — Auth Integration (what Connect-Backend needs from Authentication-Service)

Authentication-Service is a separate repo you may not have. This file is the **consumer-side contract**; the provider's owner-side spec is `specs/02-auth-service.md` in the Authentication-Service repo. Status: **Planned** (no integration exists).

## What the backend will consume

- **Access token**: JWT signed HS256 by Authentication-Service. Currently carries `sub` (user id), `iat`, `exp`; TTL set by the auth service's `JWT_EXPIRES_IN` (report: 15 minutes). The report also names `userId` and `tokenVersion` claims — **claim names are not final** (Decision needed; see [ADR-0004](./adr/0004-jwt-verification.md)).
- Sent by clients as `Authorization: Bearer <jwt>` on REST, and in the WebSocket join (`join-room`) or the upgrade request.
- Failure behaviour: invalid/expired token ⇒ `401` for REST; for WebSocket close with an application code (suggest `4401`).

## Integration options (Decision needed — [ADR-0004](./adr/0004-jwt-verification.md))

| Option | How | Pros | Cons |
|---|---|---|---|
| A. Shared secret | Backend gets the auth service's `JWT_SECRET` and verifies HS256 locally | No network hop, simple | Secret shared across services; cannot see revocation (`tokenVersion`) |
| B. Introspection | Backend calls `GET /api/v1/auth/me` with the token | Always current, no secret sharing | Latency on each join; auth service becomes a runtime dependency |
| C. Asymmetric JWT (RS/ES256) | Auth signs with private key, backend verifies with public key (JWKS) | Best isolation | Requires changes in the auth service (report says HS256) |

Report default is HS256 ("validated on every protected request"), so A (optionally cached B for revocation) is the closest to the report.

## Backend work this implies

1. Config: new env var(s) (`JWT_SECRET` or `AUTH_SERVICE_URL`) in `src/config.ts` and README.
2. Express middleware for `POST /api/rooms` and `GET /api/rooms/:id`; token check on `join-room`; reject unauthenticated `/api/keys/*`.
3. Attach `userId` to `PeerSocket`; use it as host/participant identity once rooms are persisted.
4. CORS: restrict to the real frontend origin (`CORS_ORIGIN`), required once credentials/tokens are used.

## Out of scope here

Login, registration, refresh, session storage: all owned by Authentication-Service. This repo never stores passwords or refresh tokens.
