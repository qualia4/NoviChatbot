// src/endpoints/mcp/listToolsEndpoint.ts
import { contentJson, OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { z } from "zod";
import { supa } from "../../db";
import { verifyToken } from "../../auth";

export class ListMCPToolsEndpoint extends OpenAPIRoute {
    public schema = {
        tags: ["MCP"],
        summary: "List all tools from a specific MCP server",
        operationId: "listMCPTools",
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({
                server_id: z.string().regex(/^\d+$/).transform(Number),
            }),
        },
        responses: {
            "200": {
                description: "MCP tools retrieved successfully",
                ...contentJson({
                    success: z.boolean(),
                    result: z.object({
                        server: z.object({
                            server_id: z.number(),
                            server_name: z.string(),
                            server_url: z.string(),
                        }),
                        tools: z.array(
                            z.object({
                                tool_id: z.number(),
                                tool_name: z.string(),
                                tool_description: z.string().nullable(),
                                input_schema: z.record(z.any()).nullable(),
                                is_enabled: z.boolean(),
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
            "404": {
                description: "MCP server not found",
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
        const data = await this.getValidatedData<typeof this.schema>();
        const { server_id } = data.params;

        const client = supa(c);

        try {
            // Verify server belongs to user
            const { data: server, error: serverError } = await client
                .from("mcp_servers")
                .select("server_id, server_name, server_url")
                .eq("server_id", server_id)
                .eq("user_id", username)
                .maybeSingle();

            if (serverError) {
                console.error("Error fetching MCP server:", serverError);
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 7000, message: "Failed to fetch MCP server" }],
                    },
                    500
                );
            }

            if (!server) {
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 4040, message: "MCP server not found" }],
                    },
                    404
                );
            }

            // Get all tools for the server
            const { data: tools, error: toolsError } = await client
                .from("mcp_tools")
                .select("*")
                .eq("server_id", server_id)
                .order("tool_name", { ascending: true });

            if (toolsError) {
                console.error("Error fetching MCP tools:", toolsError);
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 7000, message: "Failed to fetch MCP tools" }],
                    },
                    500
                );
            }

            return c.json(
                {
                    success: true,
                    result: {
                        server,
                        tools: tools || [],
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