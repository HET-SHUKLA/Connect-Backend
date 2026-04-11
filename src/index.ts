import { WebSocketServer } from "ws"
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

const handleMessage = async (ws: PeerSocket, message: ClientMessage) => {
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
        case "router-rtp-capabilities":
            // this message type is only sent from server → client, so we can ignore it here
            break;
        default:
            const _exhaustive: never = message;
            console.warn("Unhandled message type");
    }
}

async function main() {
    await createWorkers()

    const wss = new WebSocketServer({ port: config.WS_PORT })
    console.log(`WebSocket server running on port ${config.WS_PORT}`)

    wss.on("connection", (ws: PeerSocket) => {
        console.log("Client connected");

        ws.peerId = randomUUID();
        ws.producerIds = [];

        ws.on("message", async (raw) => {
            // parse message, route to handler
            try {
                const message: ClientMessage = JSON.parse(raw.toString())
                await handleMessage(ws, message)
            } catch (err) {
                console.error("Invalid message:", err)
            }
        })

        ws.on("close", () => {
            // handle disconnect
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