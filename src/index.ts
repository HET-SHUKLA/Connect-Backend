import { Server } from "socket.io"
import { createWorkers } from "./mediasoup/worker.js"
import type { ClientMessage, PeerLeft, PeerSocket } from "./types.js"
import { randomUUID } from "node:crypto";
import { handleJoinRoom } from "./handlers/joinRoom.js";
import { config } from "./config.js";
import { handleCreateTransport } from "./handlers/createTransport.js";
import { handleConnectTransport } from "./handlers/connectTransport.js";
import { handleProduce } from "./handlers/createProducer.js";
import { handleConsume } from "./handlers/createConsume.js";
import { getPeerInRoom, removePeerFromRoom } from "./mediasoup/room.js";
import { getTransport, removeTransport } from "./mediasoup/transport.js";
import { send } from "./utils/helper.js";
import { deleteRouter } from "./mediasoup/router.js";
import { router } from "./api.js";
import express from "express"
import { createServer } from "node:http";
import cors from "cors"

const clientEvents: ClientMessage["type"][] = [
    "join-room", "create-transport", "connect-transport",
    "produce", "consume", "request-key", "key-exchange",
]

const handleMessage = async (ws: PeerSocket, message: ClientMessage) => {
    // Only join-room is allowed before the peer is a room member, and every
    // later message must target the room the peer actually joined.
    if (message.type !== "join-room") {
        if (!ws.roomId) return
        if ("roomId" in message && message.roomId !== ws.roomId) return
    }

    switch (message.type) {
        case "join-room":
            await handleJoinRoom(ws, message);
            break;
        case "create-transport":
            await handleCreateTransport(ws, message);
            break;
        case "connect-transport":
            await handleConnectTransport(message);
            break;
        case "produce":
            await handleProduce(ws, message);
            break;
        case "consume":
            await handleConsume(ws, message);
            break;
        case "request-key":
            if (!ws.roomId) break
            getPeerInRoom(ws.roomId).forEach(peer => {
                if (peer.peerId !== ws.peerId) {
                    send(peer, { type: "key-requested", peerId: ws.peerId })
                }
            });
        break

        case "key-exchange":
            if (!ws.roomId) break
            const target = getPeerInRoom(ws.roomId)
                .find(p => p.peerId === message.targetPeerId)
            if (target) {
                send(target, {
                    type: "key-exchange-received",
                    fromPeerId: ws.peerId,
                    encryptedRoomKey: message.encryptedRoomKey
                })
            }
            break;
        default:
            const _exhaustive: never = message;
            console.warn("Unhandled message type");
    }
}

async function main() {
    await createWorkers()

    const corsOrigin = config.CORS_ORIGIN ?? "*"
    const app = express()
    app.use(cors({ origin: corsOrigin }))
    app.use(express.json())
    app.use("/api", router);

    const httpServer = createServer(app)

    const io = new Server(httpServer, { cors: { origin: corsOrigin } })
    console.log(`Socket.IO server running on http://0.0.0.0:${config.WS_PORT}/socket.io`);

    httpServer.listen(config.WS_PORT, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${config.WS_PORT}`)
    })

    io.on("connection", (socket) => {
        console.log("Client connected");

        const ws = socket as PeerSocket
        ws.peerId = randomUUID();
        ws.producerIds = [];

        // Each client message is a Socket.IO event named after its `type`
        for (const type of clientEvents) {
            ws.on(type, async (payload: unknown) => {
                try {
                    const message = { ...(payload as object), type } as ClientMessage
                    await handleMessage(ws, message)
                } catch (err) {
                    console.error(`Error handling "${type}":`, err)
                }
            })
        }

        ws.on("disconnect", () => {
            if (!ws.roomId) {
                return;
            }

            removePeerFromRoom(ws.roomId, ws);
            if (ws.sendTransportId) {
                getTransport(ws.sendTransportId).close()
                removeTransport(ws.sendTransportId)
            }
            if (ws.recvTransportId) {
                getTransport(ws.recvTransportId).close()
                removeTransport(ws.recvTransportId)
            }

            const peers = getPeerInRoom(ws.roomId);
            peers.forEach((peer) => {
                const peerLeftMessage: PeerLeft = {
                    type: "peer-left",
                    peerId: ws.peerId,
                }
                send(peer, peerLeftMessage);
            });

            const remainingPeers = getPeerInRoom(ws.roomId)
            if (remainingPeers.length === 0) {
                deleteRouter(ws.roomId)
            }
        })
    })
}

main().catch(console.error)