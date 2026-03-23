const peerProducers: Map<string, Map<string, string[]>> = new Map();

export const addPeersToRoom = (roomId: string, peerId: string) => {
    const peerMap = peerProducers.get(roomId);
    if (!peerMap) {
        const producers = new Map<string, string[]>();
        producers.set(peerId, []); // PeerId->ProducerIds
        peerProducers.set(roomId, producers);
        return;
    }

    peerMap.set(peerId, []);
}

export const removePeerFromRoom = (roomId: string, peerId: string) => {
    const peerMap = peerProducers.get(roomId);
    if (peerMap) {
        peerMap.delete(peerId);
        if (peerMap.size === 0) {
            peerProducers.delete(roomId);
        }
    }
}

export const getProducersInRoom = (roomId: string) => {
    const peerMap = peerProducers.get(roomId);
    if (!peerMap) {
        return [];
    }
    const producers: { peerId: string; producerIds: string[] }[] = [];
    peerMap.forEach((producerIds, peerId) => {
        producers.push({ peerId, producerIds });
    })
    return producers;
};

export const addProducerToPeer = (roomId: string, peerId: string, producerId: string) => {
    let peerMap = peerProducers.get(roomId);
    let producerIds = peerMap?.get(peerId);
    if (!peerMap || !producerIds) {
        addPeersToRoom(roomId, peerId);
        peerMap = peerProducers.get(roomId);
        producerIds = peerMap?.get(peerId);
    }

    if (!producerIds) {
        throw new Error(`Peer ${peerId} not found in room ${roomId}`)
    }

    producerIds.push(producerId);
}