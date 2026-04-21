import { randomUUID } from "node:crypto"

interface Room {
    roomId: string
    createdAt: Date
}

const rooms = new Map<string, Room>()
const codeIndex = new Map<string, string>()  

function generateShortCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = ""
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return codeIndex.has(code) ? generateShortCode() : code
}

export function createRoom(): Room {
    const roomId = generateShortCode();
    const room: Room = { roomId, createdAt: new Date() }
    rooms.set(roomId, room)
    return room
}

export function roomExists(roomId: string): boolean {
    return rooms.has(roomId)
}

export function getRoom(roomId: string): Room | undefined {
    return rooms.get(roomId)
}