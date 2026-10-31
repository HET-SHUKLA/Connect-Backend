# Architecture Decision Records (Connect-Backend)

One file per significant decision: `NNNN-kebab-title.md`, from [`../templates/adr.md`](../templates/adr.md). Never edit an accepted ADR's decision — supersede it with a new ADR.

| ADR | Title | Status |
|---|---|---|
| [0001](./0001-sfu-over-mesh.md) | Use an SFU (mediasoup) instead of full-mesh P2P | Accepted |
| [0002](./0002-frame-level-e2ee.md) | Frame-level E2EE on top of DTLS-SRTP; server relays keys blindly | Accepted |
| [0003](./0003-signaling-transport.md) | Raw `ws` vs Socket.IO for signaling | **Proposed — decision needed** |
| [0004](./0004-jwt-verification.md) | How the backend verifies Authentication-Service tokens | **Proposed — decision needed** |
