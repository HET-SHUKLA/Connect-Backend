import type { WebRtcTransport } from "mediasoup/types";

const transports: Map<string, WebRtcTransport> = new Map()

export function addTransport(transportId: string, transport: WebRtcTransport) {
    transports.set(transportId, transport);
}

export function getTransport(transportId: string): WebRtcTransport {
    const transport = transports.get(transportId);
    if (!transport) {
        throw new Error(`Transport ${transportId} not found`);
    }
    return transport;
}

export function removeTransport(transportId: string): void {
    transports.delete(transportId);
}