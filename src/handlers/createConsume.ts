import { getOrCreateRouter } from "../mediasoup/router.js";
import { getTransport } from "../mediasoup/transport.js";
import type { Consume, ConsumerCreated, PeerSocket } from "../types.js";
import { send } from "../utils/helper.js";

export const handleConsume = async (
    ws: PeerSocket,
    message: Consume
) => {
    if(!ws.recvTransportId) {
        throw new Error("No receive transport found for this peer");
    }

    const consumerOptions = {
        producerId: message.producerId,
        rtpCapabilities: message.rtpCapabilities,
    };

    const recvTransport = getTransport(ws.recvTransportId);
    const router = await getOrCreateRouter(message.roomId);

    const canConsume = router.canConsume(consumerOptions);

    if (!canConsume) {
        throw new Error("Cannot consume this producer with the given RTP capabilities");
    }

    const consumer = await recvTransport.consume({
        ...consumerOptions,
        paused: false,
    });

    const consumerCreatedMessage: ConsumerCreated = {
        type: "consumer-created",
        consumerId: consumer.id,
        producerId: message.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
    }

    send(ws, consumerCreatedMessage);
}