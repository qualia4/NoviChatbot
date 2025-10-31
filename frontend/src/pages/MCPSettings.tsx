// src/pages/MCPSettings.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mcpAPI } from '../services/api';
import { MCPServer, MCPTool } from '../types';
import { ArrowLeft, Plus, Server, Wrench, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function MCPSettings() {
    const [servers, setServers] = useState<MCPServer[]>([]);
    const [selectedServer, setSelectedServer] = useState<number | null>(null);
    const [tools, setTools] = useState<MCPTool[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const navigate = useNavigate();

    // Form state
    const [serverName, setServerName] = useState('');
    const [serverUrl, setServerUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [description, setDescription] = useState('');
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        loadServers();
    }, []);

    useEffect(() => {
        if (selectedServer) {
            loadTools(selectedServer);
        }
    }, [selectedServer]);

    const loadServers = async () => {
        setLoading(true);
        try {
            const response = await mcpAPI.listServers();
            if (response.success && response.result) {
                setServers(response.result.servers);
            }
        } catch (error) {
            console.error('Failed to load servers:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTools = async (serverId: number) => {
        try {
            const response = await mcpAPI.listTools(serverId);
            if (response.success && response.result) {
                setTools(response.result.tools);
            }
        } catch (error) {
            console.error('Failed to load tools:', error);
        }
    };

    const handleAddServer = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);

        try {
            await mcpAPI.connectServer(
                serverName,
                serverUrl,
                apiKey || undefined,
                description || undefined
            );

            // Reset form
            setServerName('');
            setServerUrl('');
            setApiKey('');
            setDescription('');
            setShowAddForm(false);

            // Reload servers
            await loadServers();
        } catch (error: any) {
            setFormError(error.response?.data?.errors?.[0]?.message || 'Failed to add server');
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => navigate('/chat')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <Server className="w-6 h-6 text-indigo-600" />
                        <h1 className="text-xl font-bold text-gray-800">MCP Server Settings</h1>
                    </div>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Server</span>
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto p-6">
                {/* Add Server Form Modal */}
                {showAddForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">Add MCP Server</h2>

                                <form onSubmit={handleAddServer} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Server Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={serverName}
                                            onChange={(e) => setServerName(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="e.g., My MCP Server"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Server URL *
                                        </label>
                                        <input
                                            type="url"
                                            value={serverUrl}
                                            onChange={(e) => setServerUrl(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="https://api.example.com"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            API Key (optional)
                                        </label>
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="Your API key"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Description (optional)
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="Describe what this server does"
                                            rows={3}
                                        />
                                    </div>

                                    {formError && (
                                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                            {formError}
                                        </div>
                                    )}

                                    <div className="flex space-x-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddForm(false);
                                                setFormError('');
                                            }}
                                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                            disabled={formLoading}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={formLoading}
                                            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {formLoading ? 'Adding...' : 'Add Server'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Servers List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Servers Panel */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <Server className="w-5 h-5 mr-2 text-indigo-600" />
                            Connected Servers
                        </h2>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            </div>
                        ) : servers.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Server className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>No servers connected yet</p>
                                <p className="text-sm mt-1">Click "Add Server" to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {servers.map((server) => (
                                    <div
                                        key={server.server_id}
                                        onClick={() => setSelectedServer(server.server_id)}
                                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                            selectedServer === server.server_id
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-gray-200 hover:border-indigo-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-800">{server.server_name}</h3>
                                                <p className="text-sm text-gray-600 mt-1">{server.server_url}</p>
                                                {server.description && (
                                                    <p className="text-sm text-gray-500 mt-1">{server.description}</p>
                                                )}
                                            </div>
                                            <div className="ml-3">
                                                {server.is_active ? (
                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tools Panel */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <Wrench className="w-5 h-5 mr-2 text-indigo-600" />
                            Available Tools
                        </h2>

                        {!selectedServer ? (
                            <div className="text-center py-12 text-gray-500">
                                <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>Select a server to view its tools</p>
                            </div>
                        ) : tools.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>No tools available for this server</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tools.map((tool) => (
                                    <div
                                        key={tool.tool_id}
                                        className="p-4 border border-gray-200 rounded-lg"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-800">{tool.tool_name}</h3>
                                                {tool.tool_description && (
                                                    <p className="text-sm text-gray-600 mt-1">{tool.tool_description}</p>
                                                )}
                                            </div>
                                            <div className="ml-3">
                                                {tool.is_enabled ? (
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                            Enabled
                          </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                            Disabled
                          </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">What are MCP Servers?</h3>
                    <p className="text-sm text-blue-800">
                        MCP (Model Context Protocol) servers allow you to connect external tools and services to your chatbot.
                        Once connected, the AI can use these tools to perform actions like searching the web, accessing databases,
                        or interacting with APIs on your behalf.
                    </p>
                </div>
            </div>
        </div>
    );
}