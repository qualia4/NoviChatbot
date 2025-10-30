-- Migration for MCP (Model Context Protocol) server integration
-- Allows users to connect external tools to the chatbot

-- MCP Servers table - stores registered MCP server connections
CREATE TABLE IF NOT EXISTS mcp_servers (
    server_id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    server_name VARCHAR(255) NOT NULL,
    server_url VARCHAR(500) NOT NULL,
    api_key VARCHAR(500),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(username) ON DELETE CASCADE,
    UNIQUE(user_id, server_name)
);

-- MCP Tools table - stores available tools from each server
CREATE TABLE IF NOT EXISTS mcp_tools (
    tool_id SERIAL PRIMARY KEY,
    server_id INTEGER NOT NULL,
    tool_name VARCHAR(255) NOT NULL,
    tool_description TEXT,
    input_schema JSONB,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES mcp_servers(server_id) ON DELETE CASCADE,
    UNIQUE(server_id, tool_name)
);

-- MCP Tool Invocations table - logs when tools are used
CREATE TABLE IF NOT EXISTS mcp_tool_invocations (
    invocation_id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    tool_id INTEGER NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB,
    status VARCHAR(50) NOT NULL, -- 'success', 'error', 'pending'
    error_message TEXT,
    invoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES mcp_tools(tool_id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_mcp_servers_user_id ON mcp_servers(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_active ON mcp_servers(is_active);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_server_id ON mcp_tools(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_enabled ON mcp_tools(is_enabled);
CREATE INDEX IF NOT EXISTS idx_mcp_invocations_message_id ON mcp_tool_invocations(message_id);
CREATE INDEX IF NOT EXISTS idx_mcp_invocations_tool_id ON mcp_tool_invocations(tool_id);