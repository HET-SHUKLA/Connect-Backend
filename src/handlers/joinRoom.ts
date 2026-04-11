import { addPeerToRoom, getProducersInRoom } from "../mediasoup/room.js";
import { getOrCreateRouter } from "../mediasoup/router.js";
import type { JoinedRoomMessage, JoinRoomMessage, NewProducer, PeerSocket, RouterRtpCapabilitiesMessage } from "../types.js";
import { send } from "../utils/helper.js";

export async function handleJoinRoom(
    ws: PeerSocket,
    message: JoinRoomMessage
) {

    const joinedRoom: JoinedRoomMessage = {
        type: "joined-room",
        peerId: ws.peerId,
    };

    send(ws, joinedRoom);
    
    const roomId = message.roomId;
    ws.roomId = roomId;
    
    const router = await getOrCreateRouter(roomId);
    
    const producers = getProducersInRoom(roomId);
    
    addPeerToRoom(roomId, ws);

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