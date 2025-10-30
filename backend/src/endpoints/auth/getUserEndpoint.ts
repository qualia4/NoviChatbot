import { contentJson, OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { z } from "zod";
import { supa } from "../../supabase";
import { verifyToken } from "../../auth";

export class GetUserEndpoint extends OpenAPIRoute {
    public schema = {
        tags: ["Auth"],
        summary: "Get authenticated user information",
        operationId: "getUser",
        security: [{ bearerAuth: [] }],
        responses: {
            "200": {
                description: "User information retrieved successfully",
                ...contentJson({
                    success: z.boolean(),
                    result: z.object({
                        username: z.string(),
                        created_at: z.string(),
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
            "404": {
                description: "User not found",
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
        const client = supa(c);

        try {
            // Get user information
            const { data: user, error } = await client
                .from("users")
                .select("username, created_at")
                .eq("username", username)
                .maybeSingle();

            if (error) {
                console.error("Error fetching user:", error);
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 7008, message: "Failed to fetch user information" }],
                    },
                    500
                );
            }

            if (!user) {
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 4040, message: "User not found" }],
                    },
                    404
                );
            }

            return c.json(
                {
                    success: true,
                    result: {
                        username: user.username,
                        created_at: user.created_at,
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