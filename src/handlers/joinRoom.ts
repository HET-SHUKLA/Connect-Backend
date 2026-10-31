import { addPeerToRoom, getProducersInRoom } from "../mediasoup/room.js";
import { getOrCreateRouter } from "../mediasoup/router.js";
import { roomExists } from "../rooms.js";
import type { JoinedRoomMessage, JoinRoomMessage, NewProducer, PeerSocket, RouterRtpCapabilitiesMessage } from "../types.js";
import { send } from "../utils/helper.js";

export async function handleJoinRoom(
    ws: PeerSocket,
    message: JoinRoomMessage
) {

    if (ws.roomId) return

    if (!roomExists(message.roomId)) {
        send(ws, { type: "join-error", reason: "Room not found" })
        ws.disconnect(true)
        return
    }

    const roomId = message.roomId;
    const router = await getOrCreateRouter(roomId);
    const producers = getProducersInRoom(roomId);

    // Register membership before replying so later requests pass the room check
    ws.roomId = roomId;
    addPeerToRoom(roomId, ws);

    const joinedRoom: JoinedRoomMessage = {
        type: "joined-room",
        peerId: ws.peerId,
    };
    send(ws, joinedRoom);

    producers.forEach(({ peerId, producerIds }) => {
        producerIds.forEach((producerId) => {
            const newProducerMessage: NewProducer = {
                type: "new-producer",
                producerId,
                peerId,
            }
            send(ws, newProducerMessage);
        });
    });

    // send capabilities to client
    const routerRtpCapabilities: RouterRtpCapabilitiesMessage = {
        type: "router-rtp-capabilities",
        rtpCapabilities: router.rtpCapabilities
    }
    send(ws, routerRtpCapabilities)
}