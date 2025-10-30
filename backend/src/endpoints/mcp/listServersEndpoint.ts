// src/endpoints/mcp/listServersEndpoint.ts
import { contentJson, OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { z } from "zod";
import { supa } from "../../db";
import { verifyToken } from "../../auth";

export class ListMCPServersEndpoint extends OpenAPIRoute {
    public schema = {
        tags: ["MCP"],
        summary: "List all connected MCP servers for the authenticated user",
        operationId: "listMCPServers",
        security: [{ bearerAuth: [] }],
        responses: {
            "200": {
                description: "MCP servers retrieved successfully",
                ...contentJson({
                    success: z.boolean(),
                    result: z.object({
                        servers: z.array(
                            z.object({
                                server_id: z.number(),
                                server_name: z.string(),
                                server_url: z.string(),
                                description: z.string().nullable(),
                                is_active: z.boolean(),
                                tool_count: z.number(),
                                created_at: z.string(),
                            })
                        ),
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
            // Get all servers for the user
            const { data: servers, error: serversError } = await client
                .from("mcp_servers")
                .select("*")
                .eq("user_id", username)
                .order("created_at", { ascending: false });

            if (serversError) {
                console.error("Error fetching MCP servers:", serversError);
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 7000, message: "Failed to fetch MCP servers" }],
                    },
                    500
                );
            }

            // Get tool counts for each server
            const serversWithToolCounts = await Promise.all(
                (servers || []).map(async (server) => {
                    const { count } = await client
                        .from("mcp_tools")
                        .select("*", { count: "exact", head: true })
                        .eq("server_id", server.server_id);

                    return {
                        server_id: server.server_id,
                        server_name: server.server_name,
                        server_url: server.server_url,
                        description: server.description,
                        is_active: server.is_active,
                        tool_count: count || 0,
                        created_at: server.created_at,
                    };
                })
            );

            return c.json(
                {
                    success: true,
                    result: {
                        servers: serversWithToolCounts,
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