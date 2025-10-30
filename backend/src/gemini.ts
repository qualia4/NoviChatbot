// src/gemini.ts - Enhanced version with MCP tool calling
import { z } from "zod";
import type { MCPTool } from "./mcp/types";

const GEMINI_API_KEY = "AIzaSyBpenZMKQF1fHNpDPpwqq-4RHEIKsCn69k";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

export interface GeminiMessage {
    role: "user" | "model";
    parts: { text: string }[];
}

export interface GeminiRequest {
    contents: GeminiMessage[];
    tools?: GeminiFunctionDeclaration[];
}

export interface GeminiFunctionDeclaration {
    function_declarations: {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: Record<string, any>;
            required?: string[];
        };
    }[];
}

export interface GeminiResponse {
    candidates: {
        content: {
            parts: ({ text: string } | { functionCall: { name: string; args: Record<string, any> } })[];
            role: string;
        };
        finishReason: string;
    }[];
}

/**
 * Convert MCP tools to Gemini function declarations
 */
export function convertMCPToolsToGeminiFunctions(tools: MCPTool[]): GeminiFunctionDeclaration | undefined {
    if (tools.length === 0) return undefined;

    const functionDeclarations = tools.map((tool) => ({
        name: tool.tool_name,
        description: tool.tool_description || `Tool: ${tool.tool_name}`,
        parameters: tool.input_schema || {
            type: "object",
            properties: {},
        },
    }));

    return {
        function_declarations: functionDeclarations,
    };
}

/**
 * Send a message to Gemini API with conversation history and optional tools
 * @param userMessage - The current user message
 * @param conversationHistory - Optional array of previous messages in the conversation
 * @param availableTools - Optional MCP tools that Gemini can use
 */
export async function getGeminiResponse(
    userMessage: string,
    conversationHistory: GeminiMessage[] = [],
    availableTools?: MCPTool[]
): Promise<GeminiResponse> {
    // Build the contents array with conversation history + new message
    const contents: GeminiMessage[] = [
        ...conversationHistory,
        {
            role: "user",
            parts: [{ text: userMessage }],
        },
    ];

    const requestBody: GeminiRequest = {
        contents,
    };

    // Add tools if available
    if (availableTools && availableTools.length > 0) {
        const tools = convertMCPToolsToGeminiFunctions(availableTools);
        if (tools) {
            requestBody.tools = [tools];
        }
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", errorText);
        throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No response from Gemini API");
    }

    return data;
}

/**
 * Extract text response from Gemini response
 */
export function extractTextResponse(response: GeminiResponse): string | null {
    const parts = response.candidates[0]?.content?.parts || [];
    for (const part of parts) {
        if ("text" in part) {
            return part.text;
        }
    }
    return null;
}

/**
 * Extract function calls from Gemini response
 */
export function extractFunctionCalls(response: GeminiResponse): { name: string; args: Record<string, any> }[] {
    const parts = response.candidates[0]?.content?.parts || [];
    const functionCalls: { name: string; args: Record<string, any> }[] = [];

    for (const part of parts) {
        if ("functionCall" in part && part.functionCall) {
            functionCalls.push({
                name: part.functionCall.name,
                args: part.functionCall.args,
            });
        }
    }

    return functionCalls;
}