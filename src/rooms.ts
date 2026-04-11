import { randomUUID } from "node:crypto"

interface Room {
    roomId: string
    createdAt: Date
}

const rooms = new Map<string, Room>()

export function createRoom(): Room {
    const roomId = randomUUID()
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