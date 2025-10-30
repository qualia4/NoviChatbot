// src/endpoints/mcp/connectServerEndpoint.ts
import { contentJson, OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { z } from "zod";
import { supa } from "../../db";
import { verifyToken } from "../../auth";
import { discoverMCPTools } from "../../mcp/mcpClient";

export class ConnectMCPServerEndpoint extends OpenAPIRoute {
    public schema = {
        tags: ["MCP"],
        summary: "Connect an MCP server and discover its tools",
        operationId: "connectMCPServer",
        security: [{ bearerAuth: [] }],
        request: {
            body: contentJson(
                z.object({
                    server_name: z.string().min(1).max(255),
                    server_url: z.string().url(),
                    api_key: z.string().optional(),
                    description: z.string().optional(),
                })
            ),
        },
        responses: {
            "201": {
                description: "MCP server connected successfully",
                ...contentJson({
                    success: z.boolean(),
                    result: z.object({
                        server: z.object({
                            server_id: z.number(),
                            server_name: z.string(),
                            server_url: z.string(),
                            description: z.string().optional(),
                            is_active: z.boolean(),
                        }),
                        tools_discovered: z.number(),
                        tools: z.array(
                            z.object({
                                tool_name: z.string(),
                                tool_description: z.string().optional(),
                            })
                        ),
                    }),
                }),
            },
            "400": {
                description: "Bad request or server already connected",
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
        const data = await this.getValidatedData<typeof this.schema>();
        const { server_name, server_url, api_key, description } = data.body;

        const client = supa(c);

        try {
            // Check if server with this name already exists for user
            const { data: existing } = await client
                .from("mcp_servers")
                .select("server_id")
                .eq("user_id", username)
                .eq("server_name", server_name)
                .maybeSingle();

            if (existing) {
                return c.json(
                    {
                        success: false,
                        errors: [
                            {
                                code: 4001,
                                message: "MCP server with this name already connected",
                            },
                        ],
                    },
                    400
                );
            }

            // Discover tools from the MCP server
            const toolDiscovery = await discoverMCPTools(server_url, api_key);

            if (!toolDiscovery.success) {
                return c.json(
                    {
                        success: false,
                        errors: [
                            {
                                code: 4002,
                                message: `Failed to connect to MCP server: ${toolDiscovery.error}`,
                            },
                        ],
                    },
                    400
                );
            }

            // Insert MCP server
            const { data: server, error: serverError } = await client
                .from("mcp_servers")
                .insert({
                    user_id: username,
                    server_name,
                    server_url,
                    api_key: api_key || null,
                    description: description || null,
                    is_active: true,
                })
                .select()
                .single();

            if (serverError) {
                console.error("Error inserting MCP server:", serverError);
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 7000, message: "Failed to save MCP server" }],
                    },
                    500
                );
            }

            // Insert discovered tools
            const tools = toolDiscovery.tools || [];
            if (tools.length > 0) {
                const toolsToInsert = tools.map((tool) => ({
                    server_id: server.server_id,
                    tool_name: tool.tool_name,
                    tool_description: tool.tool_description || null,
                    input_schema: tool.input_schema || null,
                    is_enabled: true,
                }));

                const { error: toolsError } = await client
                    .from("mcp_tools")
                    .insert(toolsToInsert);

                if (toolsError) {
                    console.error("Error inserting MCP tools:", toolsError);
                    // Don't fail the request, just log the error
                }
            }

            return c.json(
                {
                    success: true,
                    result: {
                        server: {
                            server_id: server.server_id,
                            server_name: server.server_name,
                            server_url: server.server_url,
                            description: server.description,
                            is_active: server.is_active,
                        },
                        tools_discovered: tools.length,
                        tools: tools.map((t) => ({
                            tool_name: t.tool_name,
                            tool_description: t.tool_description,
                        })),
                    },
                },
                201
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