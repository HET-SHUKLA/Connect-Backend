import type { TransportListenInfo } from "mediasoup/types";
import { getOrCreateRouter } from "../mediasoup/router.js";
import type { CreateTransportMessage, PeerSocket, TransportCreatedMessage } from "../types.js";
import { send } from "../utils/helper.js";
import { config } from "../config.js";
import { addTransport } from "../mediasoup/transport.js";

const listenInfos: TransportListenInfo[] = [
    {
        protocol: "udp",
        ip: "0.0.0.0",
        announcedAddress: config.ANNOUNCED_IP,
    }
]

export async function handleCreateTransport(
    ws: PeerSocket,
    message: CreateTransportMessage
) {
    const router = await getOrCreateRouter(message.roomId);
    const transport = await router.createWebRtcTransport({
        listenInfos,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
    });
    const direction = message.direction;

    if (direction === "send") {
        ws.sendTransportId = transport.id;
    } else {
        ws.recvTransportId = transport.id;
    }

    addTransport(transport.id, transport);

    const newTransportMessage: TransportCreatedMessage = {
        type: "transport-created",
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        direction,
        iceServers: config.TURN_SERVERS || [],
    }

    send(ws, newTransportMessage);
}