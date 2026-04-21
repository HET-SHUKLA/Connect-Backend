import crypto from "crypto"
import { config } from "../config.js"

export function generateTurnCredentials() {
  const expiry = Math.floor(Date.now() / 1000) + 3600 // 1 hour

  const username = expiry.toString()

  const hmac = crypto.createHmac("sha1", config.TURN_SECRET)
  hmac.update(username)

  const credential = hmac.digest("base64")

  return { username, credential }
}