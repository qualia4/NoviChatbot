import { contentJson, OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { z } from "zod";
import { supa } from "../../supabase";
import { verifyToken } from "../../auth";

export class ClearMessagesEndpoint extends OpenAPIRoute {
    public schema = {
        tags: ["Messages"],
        summary: "Clear all messages for the authenticated user",
        operationId: "clearMessages",
        security: [{ bearerAuth: [] }],
        responses: {
            "200": {
                description: "All messages cleared successfully",
                ...contentJson({
                    success: z.boolean(),
                    result: z.object({
                        message: z.string(),
                        deletedCount: z.number(),
                    }),
                }),
            },
            "401": {
                description: "Unauthorized",
                ...contentJson({
                    success: z.boolean(),
                    errors: z.array(
                        z.object({
                            code: z.number(),
                            message: z.string(),
                        })
                    ),
                }),
            },
            "500": {
                description: "Internal server error",
                ...contentJson({
                    success: z.boolean(),
                    errors: z.array(
                        z.object({
                            code: z.number(),
                            message: z.string(),
                        })
                    ),
                }),
            },
        },
    };

    public async handle(c: AppContext) {
        // Verify authentication
        const authHeader = c.req.header("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return c.json(
                {
                    success: false,
                    errors: [{ code: 4011, message: "Missing or invalid authorization header" }],
                },
                401
            );
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        if (!decoded) {
            return c.json(
                {
                    success: false,
                    errors: [{ code: 4012, message: "Invalid or expired token" }],
                },
                401
            );
        }

        const username = decoded.username;
        const client = supa(c);

        try {
            // Get count before deletion
            const { count, error: countError } = await client
                .from("messages")
                .select("*", { count: "exact", head: true })
                .eq("user_id", username);

            if (countError) {
                console.error("Error counting messages:", countError);
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 7004, message: "Failed to count messages" }],
                    },
                    500
                );
            }

            // Delete all messages for the user
            const { error: deleteError } = await client
                .from("messages")
                .delete()
                .eq("user_id", username);

            if (deleteError) {
                console.error("Error clearing messages:", deleteError);
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 7007, message: "Failed to clear messages" }],
                    },
                    500
                );
            }

            return c.json(
                {
                    success: true,
                    result: {
                        message: "All messages cleared successfully",
                        deletedCount: count || 0,
                    },
                },
                200
            );
        } catch (error) {
            console.error("Unexpected error:", error);
            return c.json(
                {
                    success: false,
                    errors: [{ code: 7000, message: "Internal Server Error" }],
                },
                500
            );
        }
    }
}