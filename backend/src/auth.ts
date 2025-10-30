import { z } from "zod";

// User schema
export const userSchema = z.object({
    username: z.string().min(3).max(255),
    password: z.string().min(6),
});

// Message schema
export const messageSchema = z.object({
    message_id: z.number().int(),
    user_id: z.string(),
    datetime: z.string().datetime(),
    own: z.boolean(),
    text: z.string(),
});

export type User = z.infer<typeof userSchema>;
export type Message = z.infer<typeof messageSchema>;

/**
 * Hash a password using SHA-256
 * Note: For production, consider using bcrypt or argon2
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
}

/**
 * Generate a simple JWT-like token
 * Note: For production, use a proper JWT library
 */
export async function generateToken(username: string): Promise<string> {
    const payload = {
        username,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    return btoa(String.fromCharCode(...new Uint8Array(data)));
}

/**
 * Verify and decode a token
 */
export function verifyToken(token: string): { username: string } | null {
    try {
        const decoded = atob(token);
        const payload = JSON.parse(decoded);
        if (payload.exp < Date.now()) {
            return null; // Token expired
        }
        return { username: payload.username };
    } catch {
        return null;
    }
}