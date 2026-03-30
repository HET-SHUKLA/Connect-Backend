import type { PeerSocket } from "../types.js";

const peerProducers: Map<string, Map<string, string[]>> = new Map();
const roomPeers: Map<string, PeerSocket[]> = new Map()

export const addPeerToRoom = (roomId: string, peer: PeerSocket) => {
    const peerMap = peerProducers.get(roomId);
    const peers = roomPeers.get(roomId);
    const peerId = peer.peerId;
    
    if (!peerMap) {
        const producers = new Map<string, string[]>();
        producers.set(peerId, []);
        peerProducers.set(roomId, producers);
    } else {
        peerMap.set(peerId, []);
    }

    if (!peers) {
        roomPeers.set(roomId, [peer]);
    } else {
        peers.push(peer);
    }
}

export const removePeerFromRoom = (roomId: string, peer: PeerSocket) => {
    const peerMap = peerProducers.get(roomId);
    const peerId = peer.peerId;

    if (peerMap) {
        peerMap.delete(peerId);
        if (peerMap.size === 0) {
            peerProducers.delete(roomId);
        }
    }

    const peers = roomPeers.get(roomId);
    if (peers) {
        const updatedPeers = peers.filter((p) => p.peerId !== peerId);
        roomPeers.set(roomId, updatedPeers);
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

export const addProducerToPeer = (roomId: string, peer: PeerSocket, producerId: string) => {
    const peerId = peer.peerId;

    let peerMap = peerProducers.get(roomId);
    let producerIds = peerMap?.get(peerId);
    if (!peerMap || !producerIds) {
        addPeerToRoom(roomId, peer);
        peerMap = peerProducers.get(roomId);
        producerIds = peerMap?.get(peerId);
    }

    if (!producerIds) {
        throw new Error(`Peer ${peerId} not found in room ${roomId}`)
    }

    producerIds.push(producerId);
}

export const getPeerInRoom = (roomId: string) => {
    return roomPeers.get(roomId) ?? [];
}