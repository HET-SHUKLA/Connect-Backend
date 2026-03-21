import { WebSocketServer, WebSocket } from "ws"
import { createWorkers } from "./mediasoup/worker.js"
import type { ClientMessage } from "./types.js"
import { WS_PORT } from "./utils/constants.js";

const handleMessage = (ws: WebSocket, message: ClientMessage) => {
    switch (message.type) {
        case "join-room":
            console.log(`Client joining room ${message.roomId}`);
            break;
        case "create-transport":
            console.log(`Client creating transport`);
            break;
        case "connect-transport":
            console.log(`Transport connected`);
            break;
        case "produce":
            console.log(`Producer created`);
            break;
        case "consume":
            console.log(`Consumer created`);
            break;
        default:
            const _exhaustive: never = message;
            console.warn("Unhandled message type");
    }
}

async function main() {
    await createWorkers()

    const wss = new WebSocketServer({ port: WS_PORT })
    console.log(`WebSocket server running on port ${WS_PORT}`)

    wss.on("connection", (ws: WebSocket) => {
        console.log("Client connected")

        ws.on("message", (raw) => {
            // parse message, route to handler
            try {
                const message: ClientMessage = JSON.parse(raw.toString())
                handleMessage(ws, message)
            } catch (err) {
                console.error("Invalid message:", err)
            }
        })

        ws.on("close", () => {
            // handle disconnect

        })
    })
}

main().catch(console.error)