import type { PeerSocket, ServerMessage } from "../types.js";

export const send = (ws: PeerSocket, message: ServerMessage) => {
    ws.send(JSON.stringify(message));
}