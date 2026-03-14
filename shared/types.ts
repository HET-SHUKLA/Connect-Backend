type JoinRoomMessage = {
    type: "join-room";
    roomId: string;
};

type CreateTransportMessage = {
    type: "create-transport";
    roomId: string;
}

type TransportCreatedMessage = {
    type: "transport-created";
    id: string;
}