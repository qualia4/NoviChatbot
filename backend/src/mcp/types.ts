// src/mcp/types.ts
import { z } from "zod";

// MCP Server schema
export const mcpServerSchema = z.object({
    server_id: z.number().int().optional(),
    user_id: z.string(),
    server_name: z.string().min(1).max(255),
    server_url: z.string().url(),
    api_key: z.string().optional(),
    description: z.string().optional(),
    is_active: z.boolean().default(true),
    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
});

// MCP Tool schema
export const mcpToolSchema = z.object({
    tool_id: z.number().int().optional(),
    server_id: z.number().int(),
    tool_name: z.string().min(1).max(255),
    tool_description: z.string().optional(),
    input_schema: z.record(z.any()).optional(),
    is_enabled: z.boolean().default(true),
    created_at: z.string().datetime().optional(),
});

// MCP Tool Invocation schema
export const mcpToolInvocationSchema = z.object({
    invocation_id: z.number().int().optional(),
    message_id: z.number().int(),
    tool_id: z.number().int(),
    input_data: z.record(z.any()),
    output_data: z.record(z.any()).optional(),
    status: z.enum(["success", "error", "pending"]),
    error_message: z.string().optional(),
    invoked_at: z.string().datetime().optional(),
    completed_at: z.string().datetime().optional(),
});

export type MCPServer = z.infer<typeof mcpServerSchema>;
export type MCPTool = z.infer<typeof mcpToolSchema>;
export type MCPToolInvocation = z.infer<typeof mcpToolInvocationSchema>;

// MCP Tool Call Request (from Gemini)
export interface MCPToolCall {
    toolName: string;
    arguments: Record<string, any>;
}

// MCP Server Response
export interface MCPToolResponse {
    success: boolean;
    result?: any;
    error?: string;
}