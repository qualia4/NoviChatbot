import { contentJson, OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { z } from "zod";
import { supa } from "../../supabase";
import { verifyToken } from "../../auth";

export class GetMessagesEndpoint extends OpenAPIRoute {
    public schema = {
        tags: ["Messages"],
        summary: "Get user's messages sorted by date",
        operationId: "getMessages",
        security: [{ bearerAuth: [] }],
        request: {
            query: z.object({
                limit: z.string().optional().default("50"),
                offset: z.string().optional().default("0"),
            }),
        },
        responses: {
            "200": {
                description: "Messages retrieved successfully",
                ...contentJson({
                    success: z.boolean(),
                    result: z.object({
                        messages: z.array(
                            z.object({
                                message_id: z.number(),
                                user_id: z.string(),
                                datetime: z.string(),
                                own: z.boolean(),
                                text: z.string(),
                            })
                        ),
                        total: z.number(),
                        limit: z.number(),
                        offset: z.number(),
                    }),
                }),
            },
            "401": {
                description: "Unauthorized - Invalid or missing token",
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

        const token = authHeader.substring(7); // Remove "Bearer " prefix
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
        const data = await this.getValidatedData<typeof this.schema>();
        const limit = parseInt(data.query.limit);
        const offset = parseInt(data.query.offset);

        const client = supa(c);

        try {
            // Get total count
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

            // Get messages sorted by datetime descending (most recent first)
            const { data: messages, error: messagesError } = await client
                .from("messages")
                .select("*")
                .eq("user_id", username)
                .order("datetime", { ascending: false })
                .range(offset, offset + limit - 1);

            if (messagesError) {
                console.error("Error fetching messages:", messagesError);
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 7005, message: "Failed to fetch messages" }],
                    },
                    500
                );
            }

            return c.json(
                {
                    success: true,
                    result: {
                        messages: messages || [],
                        total: count || 0,
                        limit,
                        offset,
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