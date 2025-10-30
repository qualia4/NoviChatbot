// src/endpoints/messages/sendMessageEndpoint.ts - Enhanced with MCP tool support
import { contentJson, OpenAPIRoute } from "chanfana";
import type { AppContext } from "../../types";
import { z } from "zod";
import { supa } from "../../db";
import { verifyToken } from "../../auth";
import {
    getGeminiResponse,
    extractTextResponse,
    extractFunctionCalls,
    type GeminiMessage,
} from "../../gemini";
import { invokeMCPTool } from "../../mcp/mcpClient";
import type { MCPTool, MCPServer } from "../../mcp/types";

export class SendMessageEndpoint extends OpenAPIRoute {
    public schema = {
        tags: ["Messages"],
        summary: "Send a message and get AI response (with MCP tool support)",
        operationId: "sendMessage",
        security: [{ bearerAuth: [] }],
        request: {
            body: contentJson(
                z.object({
                    text: z.string().min(1).max(5000),
                })
            ),
        },
        responses: {
            "200": {
                description: "Message sent and response received",
                ...contentJson({
                    success: z.boolean(),
                    result: z.object({
                        userMessage: z.object({
                            message_id: z.number(),
                            user_id: z.string(),
                            datetime: z.string(),
                            own: z.boolean(),
                            text: z.string(),
                        }),
                        botMessage: z.object({
                            message_id: z.number(),
                            user_id: z.string(),
                            datetime: z.string(),
                            own: z.boolean(),
                            text: z.string(),
                        }),
                        toolsUsed: z.array(z.string()).optional(),
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
        const { text } = data.body;

        const client = supa(c);

        try {
            // Fetch recent conversation history (last 20 messages)
            const { data: recentMessages, error: historyError } = await client
                .from("messages")
                .select("own, text, datetime")
                .eq("user_id", username)
                .order("datetime", { ascending: true })
                .limit(20);

            if (historyError) {
                console.error("Error fetching conversation history:", historyError);
            }

            // Convert database messages to Gemini format
            const conversationHistory: GeminiMessage[] = [];
            if (recentMessages) {
                for (const msg of recentMessages) {
                    conversationHistory.push({
                        role: msg.own ? "user" : "model",
                        parts: [{ text: msg.text }],
                    });
                }
            }

            // Fetch user's active MCP servers and their enabled tools
            const { data: servers, error: serversError } = await client
                .from("mcp_servers")
                .select("*")
                .eq("user_id", username)
                .eq("is_active", true);

            let availableTools: (MCPTool & { server: MCPServer })[] = [];
            if (servers && servers.length > 0) {
                for (const server of servers) {
                    const { data: tools } = await client
                        .from("mcp_tools")
                        .select("*")
                        .eq("server_id", server.server_id)
                        .eq("is_enabled", true);

                    if (tools) {
                        availableTools.push(
                            ...tools.map((tool) => ({ ...tool, server }))
                        );
                    }
                }
            }

            // Save user message
            const { data: userMessage, error: userMessageError } = await client
                .from("messages")
                .insert({
                    user_id: username,
                    datetime: new Date().toISOString(),
                    own: true,
                    text: text,
                })
                .select()
                .single();

            if (userMessageError) {
                console.error("Error saving user message:", userMessageError);
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 7001, message: "Failed to save user message" }],
                    },
                    500
                );
            }

            // Get response from Gemini API with conversation history and tools
            let geminiResponse;
            try {
                geminiResponse = await getGeminiResponse(
                    text,
                    conversationHistory,
                    availableTools
                );
            } catch (error) {
                console.error("Gemini API error:", error);
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 7002, message: "Failed to get AI response" }],
                    },
                    500
                );
            }

            // Check if Gemini wants to call any functions
            const functionCalls = extractFunctionCalls(geminiResponse);
            const toolsUsed: string[] = [];

            if (functionCalls.length > 0) {
                // Execute function calls and collect results
                const functionResults: string[] = [];

                for (const funcCall of functionCalls) {
                    const tool = availableTools.find((t) => t.tool_name === funcCall.name);
                    if (tool) {
                        toolsUsed.push(funcCall.name);

                        // Invoke the MCP tool
                        const result = await invokeMCPTool(tool.server, tool, {
                            toolName: funcCall.name,
                            arguments: funcCall.args,
                        });

                        // Log the invocation
                        await client.from("mcp_tool_invocations").insert({
                            message_id: userMessage.message_id,
                            tool_id: tool.tool_id,
                            input_data: funcCall.args,
                            output_data: result.result || null,
                            status: result.success ? "success" : "error",
                            error_message: result.error || null,
                            invoked_at: new Date().toISOString(),
                            completed_at: new Date().toISOString(),
                        });

                        if (result.success) {
                            functionResults.push(
                                `Tool ${funcCall.name} returned: ${JSON.stringify(result.result)}`
                            );
                        } else {
                            functionResults.push(
                                `Tool ${funcCall.name} failed: ${result.error}`
                            );
                        }
                    }
                }

                // Send function results back to Gemini for final response
                conversationHistory.push({
                    role: "user",
                    parts: [{ text }],
                });
                conversationHistory.push({
                    role: "model",
                    parts: [{ text: `Used tools: ${functionResults.join(", ")}` }],
                });

                // Get final response from Gemini with function results
                geminiResponse = await getGeminiResponse(
                    "Based on the tool results above, provide a final response to the user.",
                    conversationHistory
                );
            }

            // Extract text response
            const botResponseText =
                extractTextResponse(geminiResponse) ||
                "I'm sorry, I couldn't generate a response.";

            // Save bot response
            const { data: botMessage, error: botMessageError } = await client
                .from("messages")
                .insert({
                    user_id: username,
                    datetime: new Date().toISOString(),
                    own: false,
                    text: botResponseText,
                })
                .select()
                .single();

            if (botMessageError) {
                console.error("Error saving bot message:", botMessageError);
                return c.json(
                    {
                        success: false,
                        errors: [{ code: 7003, message: "Failed to save bot response" }],
                    },
                    500
                );
            }

            return c.json(
                {
                    success: true,
                    result: {
                        userMessage,
                        botMessage,
                        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
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