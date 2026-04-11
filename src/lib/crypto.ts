const KEY_ALGORITHM = "AES-GCM"
const IV_LENGTH = 12

// Generate room key — called by first peer
export async function generateRoomKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
        { name: KEY_ALGORITHM, length: 256 },
        true,        // extractable — so we can export and share it
        ["encrypt", "decrypt"]
    )
}

// Export key to raw bytes — for sending to other peers
export async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
    return crypto.subtle.exportKey("raw", key)
}

// Import raw bytes back to CryptoKey
export async function importRoomKey(rawKey: ArrayBuffer): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "raw",
        rawKey,
        { name: KEY_ALGORITHM },
        false,       // not extractable once imported
        ["encrypt", "decrypt"]
    )
}

// Encrypt a packet
export async function encryptPacket(
    key: CryptoKey,
    data: ArrayBuffer
): Promise<ArrayBuffer> {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
    const ciphertext = await crypto.subtle.encrypt(
        { name: KEY_ALGORITHM, iv },
        key,
        data
    )
    // Prepend IV to ciphertext
    const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength)
    result.set(iv, 0)
    result.set(new Uint8Array(ciphertext), IV_LENGTH)
    return result.buffer
}

// Decrypt a packet
export async function decryptPacket(
    key: CryptoKey,
    data: ArrayBuffer
): Promise<ArrayBuffer> {
    const iv = data.slice(0, IV_LENGTH)
    const ciphertext = data.slice(IV_LENGTH)
    return crypto.subtle.decrypt(
        { name: KEY_ALGORITHM, iv },
        key,
        ciphertext
    )
}