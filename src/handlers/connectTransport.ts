import { getTransport } from "../mediasoup/transport.js";
import type { ConnectTransport } from "../types.js";

export async function handleConnectTransport(
    message: ConnectTransport
) {
    const transport = getTransport(message.transportId);

    await transport.connect({ dtlsParameters: message.dtlsParameters });
}