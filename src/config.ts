import { z } from "zod"
import dotenv from "dotenv"

dotenv.config();

const schema = z.object({
    ANNOUNCED_IP: z.string({
        error: "ANNOUNCED_IP is required and must be a string",
    }),
    WS_PORT: z.coerce.number({
        error: "WS_PORT is required and must be a number",
    }),
    TURN_SERVERS: z.string().transform(val => JSON.parse(val)).optional(),
    TURN_USERNAME: z.string().optional(),
    TURN_PASSWORD: z.string().optional(),
    TURN_SECRET: z.string({
        error: "TURN_SECRET is required and must be a string",
    }),
    TURN_HOST: z.string({
        error: "TURN_HOST is required and must be a string",
    }),
    CORS_ORIGIN: z.string().optional(),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error)
    process.exit(1)
}

export const config = parsed.data;