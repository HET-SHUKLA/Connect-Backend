import express from "express"
import { createRoom, roomExists } from "./rooms.js"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { generateTurnCredentials } from "./utils/turn.js"
import { config } from "./config.js"

export const router = express.Router()
const publicKeys = new Map<string, string>()

// POST /api/rooms — create a new room
router.post("/rooms", (req, res) => {
    const room = createRoom()
    res.json({ roomId: room.roomId })
})

// GET /api/rooms/:roomId — check if room exists
router.get("/rooms/:roomId", (req, res) => {
    const { roomId } = req.params
    if (!roomExists(roomId)) {
        res.status(404).json({ error: "Room not found" })
        return
    }
    res.json({ roomId })
})

router.get("/mediasoup-client.js", (req, res) => {
    const filePath = join(
        process.cwd(), 
        "node_modules/mediasoup-client/dist/mediasoup-client.min.js"
    )
    res.setHeader("Content-Type", "application/javascript")
    res.send(readFileSync(filePath))
});

router.post("/keys/:peerId", (req, res) => {
    publicKeys.set(req.params.peerId, req.body.publicKey)
    res.json({ ok: true })
})

router.get("/keys/:peerId", (req, res) => {
    const key = publicKeys.get(req.params.peerId)
    if (!key) { res.status(404).json({ error: "Not found" }); return }
    res.json({ publicKey: key })
})

router.get("/turn-credentials", (req, res) => {
    const creds = generateTurnCredentials()

    res.json({
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302",
            },
            {
                urls: [
                    `turn:${config.TURN_HOST}:3478?transport=udp`,
                    `turns:${config.TURN_HOST}:5349?transport=tcp`,
                ],
                username: creds.username,
                credential: creds.credential,
            },
        ],
    })
})