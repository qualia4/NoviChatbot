// src/mcp/mcpClient.ts
import type { MCPServer, MCPTool, MCPToolCall, MCPToolResponse } from "./types";

/**
 * Invokes a tool on an MCP server
 * @param server - The MCP server configuration
 * @param tool - The tool to invoke
 * @param toolCall - The tool call parameters from Gemini
 * @returns The tool execution result
 */
export async function invokeMCPTool(
    server: MCPServer,
    tool: MCPTool,
    toolCall: MCPToolCall
): Promise<MCPToolResponse> {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        // Add API key if provided
        if (server.api_key) {
            headers["Authorization"] = `Bearer ${server.api_key}`;
        }

        // Make request to MCP server
        const response = await fetch(`${server.server_url}/tools/${tool.tool_name}`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                arguments: toolCall.arguments,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`MCP tool invocation failed for ${tool.tool_name}:`, errorText);
            return {
                success: false,
                error: `Tool execution failed: ${response.status} ${response.statusText}`,
            };
        }

        const result = await response.json();
        return {
            success: true,
            result,
        };
    } catch (error) {
        console.error(`Error invoking MCP tool ${tool.tool_name}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
}

/**
 * Discovers available tools from an MCP server
 * @param serverUrl - The URL of the MCP server
 * @param apiKey - Optional API key for authentication
 * @returns List of available tools
 */
export async function discoverMCPTools(
    serverUrl: string,
    apiKey?: string
): Promise<{ success: boolean; tools?: MCPTool[]; error?: string }> {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
        }

        const response = await fetch(`${serverUrl}/tools`, {
            method: "GET",
            headers,
        });

        if (!response.ok) {
            return {
                success: false,
                error: `Failed to discover tools: ${response.status}`,
            };
        }

        const data = await response.json();
        return {
            success: true,
            tools: data.tools || [],
        };
    } catch (error) {
        console.error("Error discovering MCP tools:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}