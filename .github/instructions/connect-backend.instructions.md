---
description: "Use when editing Connect-Backend code: WebSocket signaling handlers, mediasoup workers/routers/transports, rooms, TURN credentials, Express REST API, Zod config"
applyTo: "src/**"
---
# Connect-Backend code rules

- Read [specs/02-signaling-sfu.md](../../specs/02-signaling-sfu.md) and [specs/03-e2ee.md](../../specs/03-e2ee.md) first (auth work: [specs/04-auth-integration.md](../../specs/04-auth-integration.md)).
- ESM project: relative imports **must** end in `.js` (e.g. `import { send } from "../utils/helper.js"`).
- Signaling messages are a typed discriminated union in `src/types.ts`. To add one: add the type, add it to `ClientMessage`/`ServerMessage` and `clientEvents`, add a `case` in `handleMessage` (`src/index.ts`, keep the `never` exhaustiveness guard), put logic in `src/handlers/`, update the spec table. Connect-Frontend mirrors these types, so treat message changes as cross-repo contract changes and document them.
- Validate every external input (REST bodies, WS payloads), preferably with Zod; never trust `roomId`/`peerId` from the client without checking membership.
- Never store, log, or inspect room keys or decrypted media; key-exchange payloads are relayed opaquely.
- State that must survive restarts belongs in PostgreSQL, not module-level `Map`s (current in-memory state is known debt).
- New env vars go in `src/config.ts` (Zod) and the README table. Don't read `process.env` elsewhere.
- Keep mediasoup cleanup symmetrical: anything created must be closed on peer leave and when the room empties.
- `npm install` compiles the mediasoup C++ worker (Python 3 + toolchain). Check with `npm run build`; run with `npm run dev`. No automated tests yet.
