import type {
    IceParameters,
    IceCandidate,
    DtlsParameters,
    MediaKind,
    RtpParameters,
    RtpCapabilities,
} from "mediasoup/types";

import type { WebSocket } from "ws";

export type JoinRoomMessage = {
    type: "join-room";
    roomId: string;
};

export type JoinedRoomMessage = {
    type: "joined-room"
    peerId: string
}

export type CreateTransportMessage = {
    type: "create-transport";
    roomId: string;
    direction: "send" | "receive";
}

export type TransportCreatedMessage = {
    type: "transport-created";
    id: string;
    direction: "send" | "receive";
    iceParameters: IceParameters;
    iceCandidates: IceCandidate[];
    dtlsParameters: DtlsParameters;
}

export type ConnectTransport = {
    type: "connect-transport";
    transportId: string;
    dtlsParameters: DtlsParameters;
}

export type Produce = {
    type: "produce";
    roomId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
}

export type ProduceCreated = {
    type: "produce-created";
    producerId: string;
}

export type NewProducer = {
    type: "new-producer";
    producerId: string;
    peerId: string;
}

export type Consume = {
    type: "consume";
    roomId: string;
    producerId: string;
    rtpCapabilities: RtpCapabilities;
}

export type ConsumerCreated = {
    type: "consumer-created";
    consumerId: string;
    producerId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
}

export type PeerLeft = {
    type: "peer-left"
    peerId: string
}

export type RouterRtpCapabilitiesMessage = {
    type: "router-rtp-capabilities";
    rtpCapabilities: RtpCapabilities;
}

// Messages that flow CLIENT → SERVER
export type ClientMessage = 
    | JoinRoomMessage
    | CreateTransportMessage
    | ConnectTransport
    | Produce
    | Consume;
    
// Messages that flow SERVER → CLIENT  
export type ServerMessage =
    | TransportCreatedMessage
    | ProduceCreated
    | NewProducer
    | ConsumerCreated
    | JoinedRoomMessage
    | PeerLeft
    | RouterRtpCapabilitiesMessage;

export interface PeerSocket extends WebSocket {
    peerId: string;
    roomId?: string;
    sendTransportId?: string;
    recvTransportId?: string;
    producerIds: string[];
}