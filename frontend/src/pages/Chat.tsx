// src/pages/Chat.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../hooks/UseAuth.tsx";
import { messagesAPI } from '../services/api';
import { Message } from '../types';
import { Send, LogOut, Trash2, Bot, User, Settings, Loader2 } from 'lucide-react';

// Markdown rendering
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export default function Chat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const { username, logout } = useAuth();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        loadMessages();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadMessages = async () => {
        setLoading(true);
        try {
            const response = await messagesAPI.getAll(100, 0);
            if (response.success && response.result) {
                // oldest first
                setMessages(response.result.messages.reverse());
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || sending) return;

        const messageText = inputText.trim();
        setInputText('');
        setSending(true);

        try {
            const response = await messagesAPI.send(messageText);
            if (response.success && response.result) {
                setMessages((prev) => [
                    ...prev,
                    response.result!.userMessage,
                    response.result!.botMessage,
                ]);
            }
        } catch (error: any) {
            console.error('Failed to send message:', error);
            alert('Failed to send message: ' + (error.response?.data?.errors?.[0]?.message || error.message));
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleClear = async () => {
        if (!confirm('Are you sure you want to clear all messages?')) return;

        try {
            await messagesAPI.clear();
            setMessages([]);
        } catch (error) {
            console.error('Failed to clear messages:', error);
            alert('Failed to clear messages');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const formatTime = (datetime: string) => {
        return new Date(datetime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    // Auto-resize textarea (caps at 240px)
    const autoResize = (el: HTMLTextAreaElement | null) => {
        if (!el) return;
        el.style.height = '0px';
        const next = Math.min(el.scrollHeight, 240);
        el.style.height = next + 'px';
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-slate-100">
            {/* Header (sticky) */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 px-4">
                <div className="max-w-5xl mx-auto py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Bot className="w-8 h-8 text-indigo-600" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Novi Chatbot</h1>
                            <p className="text-sm text-gray-500">Logged in as {username}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={() => navigate('/mcp')}
                            className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="MCP Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleClear}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Clear all messages"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Bot className="w-16 h-16 mb-4 text-gray-300" />
                        <p className="text-lg">No messages yet. Start a conversation!</p>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto space-y-3">
                        {messages.map((message) => (
                            <div
                                key={message.message_id}
                                className={`flex ${message.own ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`flex items-start space-x-3 max-w-[80%] ${
                                        message.own ? 'flex-row-reverse space-x-reverse' : ''
                                    }`}
                                >
                                    <div
                                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow ${
                                            message.own ? 'bg-indigo-600' : 'bg-gray-300'
                                        }`}
                                    >
                                        {message.own ? (
                                            <User className="w-5 h-5 text-white" />
                                        ) : (
                                            <Bot className="w-5 h-5 text-gray-700" />
                                        )}
                                    </div>
                                    <div>
                                        <div
                                            className={`rounded-2xl px-4 py-1 shadow ${
                                                message.own
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-white text-gray-800 border border-gray-200'
                                            }`}
                                        >
                                            <div className={`markdown ${message.own ? 'prose-invert' : ''}`}>
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                                    skipHtml
                                                    components={{
                                                        ul: ({node, ...props}) => (
                                                            <ul style={{ marginTop: 4, marginBottom: 8 }} {...props} />
                                                        ),
                                                        ol: ({node, ...props}) => (
                                                            <ol style={{ marginTop: 4, marginBottom: 8 }} {...props} />
                                                        ),
                                                        a: ({node, ...props}) => (
                                                            <a target="_blank" rel="noopener noreferrer" {...props} />
                                                        ),
                                                        code: ({ inline, className, children, ...props }) => {
                                                            if (inline) {
                                                                return (
                                                                    <code className={className} {...props}>
                                                                        {children}
                                                                    </code>
                                                                );
                                                            }
                                                            return (
                                                                <pre>
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                                                            );
                                                        },
                                                    }}
                                                >
                                                    {message.text ?? ""}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                        <p
                                            className={`text-xs text-gray-500 mt-1 ${
                                                message.own ? 'text-right' : 'text-left'
                                            }`}
                                        >
                                            {formatTime(message.datetime)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input (sticky footer) */}
            <div className="sticky bottom-0 z-10 bg-white/80 backdrop-blur border-t border-gray-200 px-4 py-4">
                <form onSubmit={handleSend} className="max-w-5xl mx-auto">
                    <div className="flex items-end space-x-2">
            <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => {
                    setInputText(e.target.value);
                    autoResize(e.currentTarget);
                }}
                onInput={(e) => autoResize(e.currentTarget)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                    }
                }}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white shadow-sm"
                rows={1}
                style={{ minHeight: '52px', maxHeight: '240px' }}
                disabled={sending}
            />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || sending}
                            className="bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0 shadow"
                            aria-label="Send message"
                            title="Send"
                        >
                            {sending ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <Send className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
