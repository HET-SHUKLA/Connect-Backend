import type {
    IceParameters,
    IceCandidate,
    DtlsParameters,
    MediaKind,
    RtpParameters,
    RtpCapabilities,
} from "mediasoup/types";

type JoinRoomMessage = {
    type: "join-room";
    roomId: string;
};

type CreateTransportMessage = {
    type: "create-transport";
    roomId: string;
    direction: "send" | "receive";
}

type TransportCreatedMessage = {
    type: "transport-created";
    id: string;
    iceParameters: IceParameters;
    iceCandidates: IceCandidate[];
    dtlsParameters: DtlsParameters;
}

type ConnectTransport = {
    type: "connect-transport";
    transportId: string;
    dtlsParameters: DtlsParameters;
}

type Produce = {
    type: "produce";
    roomId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
}

type ProduceCreated = {
    type: "produce-created";
    producerId: string;
}

type NewProducer = {
    type: "new-producer";
    producerId: string;
    peerId: string;
}

type Consume = {
    type: "consume";
    roomId: string;
    producerId: string;
    rtpCapabilities: RtpCapabilities;
}

type ConsumerCreated = {
    type: "consumer-created";
    consumerId: string;
    producerId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
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
    | ConsumerCreated;