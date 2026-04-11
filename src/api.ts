import express from "express"
import { createRoom, roomExists } from "./rooms.js"
import { readFileSync } from "node:fs"
import { join } from "node:path"


export const router = express.Router()

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
})