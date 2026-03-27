import type { TransportListenInfo } from "mediasoup/types";
import { getOrCreateRouter } from "../mediasoup/router.js";
import type { CreateTransportMessage, JoinRoomMessage, PeerSocket, TransportCreatedMessage } from "../types.js";
import { send } from "../utils/helper.js";

const listenInfos: TransportListenInfo[] = [
    {
        protocol: "udp",
        ip: "0.0.0.0",
        announcedAddress: process.env.ANNOUNCED_IP ?? "127.0.0.1",
    }
]

export async function handleCreateTransport(
    ws: PeerSocket,
    message: CreateTransportMessage
) {
    const router = await getOrCreateRouter(message.roomId);
    const transport = await router.createWebRtcTransport({ listenInfos });
    const direction = message.direction;

    if (direction === "send") {
        ws.sendTransportId = transport.id;
    } else {
        ws.recvTransportId = transport.id;
    }

    const newTransportMessage: TransportCreatedMessage = {
        type: "transport-created",
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
    }

    send(ws, newTransportMessage);
}