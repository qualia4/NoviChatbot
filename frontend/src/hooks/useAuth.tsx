// src/hooks/useAuth.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

interface AuthContextType {
    username: string | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<void>;
    signup: (username: string, password: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [username, setUsername] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing token on mount
        const storedToken = localStorage.getItem('token');
        const storedUsername = localStorage.getItem('username');
        if (storedToken && storedUsername) {
            setToken(storedToken);
            setUsername(storedUsername);
        }
        setLoading(false);
    }, []);

    const login = async (username: string, password: string) => {
        const response = await authAPI.login(username, password);
        if (response.success && response.result) {
            const { token, username: user } = response.result;
            localStorage.setItem('token', token);
            localStorage.setItem('username', user);
            setToken(token);
            setUsername(user);
        } else {
            throw new Error(response.errors?.[0]?.message || 'Login failed');
        }
    };

    const signup = async (username: string, password: string) => {
        const response = await authAPI.signup(username, password);
        if (response.success && response.result) {
            const { token, username: user } = response.result;
            localStorage.setItem('token', token);
            localStorage.setItem('username', user);
            setToken(token);
            setUsername(user);
        } else {
            throw new Error(response.errors?.[0]?.message || 'Signup failed');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setToken(null);
        setUsername(null);
    };

    return (
        <AuthContext.Provider
            value={{
                username,
                token,
                isAuthenticated: !!token,
                login,
                signup,
                logout,
                loading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}