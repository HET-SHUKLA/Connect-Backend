import type { ProducerOptions } from "mediasoup/types";
import { addProducerToPeer, getPeerInRoom } from "../mediasoup/room.js";
import { getTransport } from "../mediasoup/transport.js";
import type { NewProducer, PeerSocket, Produce, ProduceCreated } from "../types.js";
import { send } from "../utils/helper.js";

export const handleProduce = async(
    ws: PeerSocket,
    message: Produce
)  => {
    if (!ws.sendTransportId) {
        throw new Error("Peer does not have a send transport");
    }

    const transport = getTransport(ws.sendTransportId);

    const options: ProducerOptions = {
        kind: message.kind,
        rtpParameters: message.rtpParameters,
    };

    const producer = await transport.produce(options);
    addProducerToPeer(message.roomId, ws, producer.id);
    
    const producerCreated: ProduceCreated = {
        type: "produce-created",
        producerId: producer.id,
    }

    send(ws, producerCreated);
    
    const peers = getPeerInRoom(message.roomId);
    peers.forEach((peer) => {
        if (peer.peerId !== ws.peerId) {
            const newProducerMessage: NewProducer = {
                type: "new-producer",
                producerId: producer.id,
                peerId: ws.peerId,
            }
            send(peer, newProducerMessage);
        }
    });
}