// src/pages/Chat.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../hooks/UseAuth.tsx";
import { messagesAPI } from '../services/api';
import { Message } from '../types';
import { Send, LogOut, Trash2, Bot, User, Settings, Loader2, AlertTriangle } from 'lucide-react';

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { PluggableList } from 'unified';

type UIMessage = Message & {
    pending?: boolean;
    error?: boolean;
    own?: boolean;
};

export default function Chat() {
    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const { username, logout } = useAuth(); // if you also have userId, prefer it over username
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const mdPlugins: PluggableList = [remarkGfm, remarkBreaks as any];

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

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
                setMessages(response.result.messages.reverse());
            }
        } finally {
            setLoading(false);
        }
    };

    const swapTempWithReal = (
        tempUserId: number,
        tempBotId: number,
        realUser: Message,
        realBot: Message
    ) => {
        setMessages(prev =>
            prev.map(m =>
                m.message_id === tempUserId ? (realUser as UIMessage) :
                    m.message_id === tempBotId ? (realBot as UIMessage) : m
            )
        );
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || sending) return;

        const messageText = inputText.trim();
        setInputText('');
        setSending(true);

        const base = Date.now();
        const tempUserId = -base;
        const tempBotId  = -(base + 1);
        const nowISO = new Date().toISOString();

        // ✅ Add user_id to satisfy your Message type
        const tempUser: UIMessage = {
            message_id: tempUserId,
            user_id: String(username || 'me'),
            own: true,
            text: messageText,
            datetime: nowISO
        };

        const tempBot: UIMessage = {
            message_id: tempBotId,
            user_id: 'assistant',
            own: false,
            text: '',
            datetime: nowISO,
            pending: true
        };

        setMessages(prev => [...prev, tempUser, tempBot]);

        try {
            const response = await messagesAPI.send(messageText);

            if (response.success && response.result) {
                const { userMessage, botMessage } = response.result;
                swapTempWithReal(tempUserId, tempBotId, userMessage, botMessage);
            } else {
                setMessages(prev =>
                    prev.map(m =>
                        m.message_id === tempBotId
                            ? { ...m, pending: false, error: true, text: "Failed to get a reply. Try again." }
                            : m
                    )
                );
            }
        } catch (error: any) {
            setMessages(prev =>
                prev.map(m =>
                    m.message_id === tempBotId
                        ? { ...m, pending: false, error: true, text: error?.response?.data?.errors?.[0]?.message || "Network error. Please retry." }
                        : m
                )
            );
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleClear = async () => {
        if (!confirm('Are you sure you want to clear all messages?')) return;
        await messagesAPI.clear();
        setMessages([]);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const formatTime = (datetime: string) =>
        new Date(datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const autoResize = (el: HTMLTextAreaElement | null) => {
        if (!el) return;
        el.style.height = '0px';
        const next = Math.min(el.scrollHeight, 240);
        el.style.height = next + 'px';
    };

    const Bubble = ({ m }: { m: UIMessage }) => {
        const isUser = !!m.own;
        const wrapperAlign = isUser ? 'justify-end' : 'justify-start';
        const rowDir = isUser ? 'flex-row-reverse space-x-reverse' : '';
        const avatarBg = isUser ? 'bg-indigo-600' : 'bg-gray-300';
        const bubbleColors = isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-gray-800 border border-gray-200';

        const showSpinner = !!m.pending && !isUser;
        const showError = !!m.error && !isUser;

        return (
            <div className={`flex ${wrapperAlign}`}>
                <div className={`flex items-start space-x-3 max-w-[80%] ${rowDir}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow ${avatarBg}`}>
                        {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-gray-700" />}
                    </div>

                    <div>
                        <div className={`rounded-2xl px-4 py-2 shadow ${bubbleColors}`}>
                            {!isUser && showSpinner ? (
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="typing-dots" aria-live="polite" aria-label="Assistant is typing">Thinking</span>
                                </div>
                            ) : !isUser && showError ? (
                                <div className="flex items-center gap-2 text-red-100">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="font-medium"> {m.text} </span>
                                </div>
                            ) : (
                                <div className={`markdown ${isUser ? 'prose-invert' : ''}`}>
                                    <ReactMarkdown
                                        remarkPlugins={mdPlugins}
                                        skipHtml
                                        components={{
                                            ul: ({ node, ...props }) => <ul style={{ marginTop: 4, marginBottom: 8, paddingLeft: 20 }} {...props} />,
                                            ol: ({ node, ...props }) => <ol style={{ marginTop: 4, marginBottom: 8, paddingLeft: 20 }} {...props} />,
                                            a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
                                            code: ({ node, className, children, ...props }: any) => {
                                                const inline = !className;
                                                if (inline) {
                                                    return <code className={className} {...props}>{children}</code>;
                                                }
                                                return (
                                                    <pre>
                            <code className={className} {...props}>{children}</code>
                          </pre>
                                                );
                                            },
                                        }}
                                    >
                                        {m.text ?? ""}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>

                        <p className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
                            {formatTime(m.datetime)}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-slate-100">
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
                        <button onClick={() => navigate('/mcp')} className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors" title="MCP Settings">
                            <Settings className="w-5 h-5" />
                        </button>
                        <button onClick={handleClear} className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors" title="Clear all messages">
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button onClick={handleLogout} className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors" title="Logout">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

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
                        {messages.map((m) => (
                            <Bubble key={m.message_id} m={m} />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

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
                            {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
