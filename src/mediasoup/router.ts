import { getWorker } from "./worker.js";
import mediasoup from "mediasoup";
import type { MediaKind } from "mediasoup/types";

const rooms: Map<string, mediasoup.types.Router> = new Map();

const mediaCodecs = [
    {
        kind: "audio" as MediaKind,
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: "video" as MediaKind,
        mimeType: "video/VP8",
        clockRate: 90000,
    }
]

export async function getOrCreateRouter(roomId: string): Promise<mediasoup.types.Router> {
    // if room exists, return existing router
    // if not, create new one on next available worker

    let router = rooms.get(roomId);
    if (router) {
        return router;
    }

    const worker = getWorker();
    router = await worker.createRouter({ mediaCodecs });
    rooms.set(roomId, router);
    return router;
}

export function deleteRouter(roomId: string): void {
    const router = rooms.get(roomId)
    if (router) {
        router.close()
        rooms.delete(roomId)
    }
}