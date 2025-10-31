// src/services/api.ts
import axios from 'axios';
import type {
    AuthResponse,
    MessagesResponse,
    SendMessageResponse,
    MCPServersResponse,
    MCPToolsResponse,
} from '../types';

// Update this to your deployed Cloudflare Worker URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth APIs
export const authAPI = {
    signup: async (username: string, password: string): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/signup', {
            username,
            password,
        });
        return response.data;
    },

    login: async (username: string, password: string): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/login', {
            username,
            password,
        });
        return response.data;
    },
};

// Messages APIs
export const messagesAPI = {
    send: async (text: string): Promise<SendMessageResponse> => {
        const response = await api.post<SendMessageResponse>('/messages/send', {
            text,
        });
        return response.data;
    },

    getAll: async (
        limit: number = 50,
        offset: number = 0
    ): Promise<MessagesResponse> => {
        const response = await api.get<MessagesResponse>('/messages', {
            params: { limit, offset },
        });
        return response.data;
    },

    clear: async (): Promise<{ success: boolean }> => {
        const response = await api.delete('/messages');
        return response.data;
    },
};

// MCP APIs
export const mcpAPI = {
    connectServer: async (
        serverName: string,
        serverUrl: string,
        apiKey?: string,
        description?: string
    ): Promise<any> => {
        const response = await api.post('/mcp/servers', {
            server_name: serverName,
            server_url: serverUrl,
            api_key: apiKey,
            description,
        });
        return response.data;
    },

    listServers: async (): Promise<MCPServersResponse> => {
        const response = await api.get<MCPServersResponse>('/mcp/servers');
        return response.data;
    },

    listTools: async (serverId: number): Promise<MCPToolsResponse> => {
        const response = await api.get<MCPToolsResponse>(
            `/mcp/servers/${serverId}/tools`
        );
        return response.data;
    },
};

export default api;