// src/types/index.ts
export interface User {
    username: string;
    created_at?: string;
}

export interface AuthResponse {
    success: boolean;
    result?: {
        username: string;
        token: string;
    };
    errors?: Array<{
        code: number;
        message: string;
    }>;
}

export interface Message {
    message_id: number;
    user_id: string;
    datetime: string;
    own: boolean;
    text: string;
}

export interface MessagesResponse {
    success: boolean;
    result?: {
        messages: Message[];
        total: number;
        limit: number;
        offset: number;
    };
    errors?: Array<{
        code: number;
        message: string;
    }>;
}

export interface SendMessageResponse {
    success: boolean;
    result?: {
        userMessage: Message;
        botMessage: Message;
        toolsUsed?: string[];
    };
    errors?: Array<{
        code: number;
        message: string;
    }>;
}

export interface MCPServer {
    server_id: number;
    user_id: string;
    server_name: string;
    server_url: string;
    api_key?: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface MCPTool {
    tool_id: number;
    server_id: number;
    tool_name: string;
    tool_description?: string;
    input_schema?: any;
    is_enabled: boolean;
    created_at: string;
}

export interface MCPServersResponse {
    success: boolean;
    result?: {
        servers: MCPServer[];
    };
    errors?: Array<{
        code: number;
        message: string;
    }>;
}

export interface MCPToolsResponse {
    success: boolean;
    result?: {
        tools: MCPTool[];
    };
    errors?: Array<{
        code: number;
        message: string;
    }>;
}