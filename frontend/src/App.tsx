// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {AuthProvider} from "./hooks/UseAuth.tsx";
import ProtectedRoute from "./components/ProtectedRoot.tsx";
import Login from './pages/Login';
import Signup from './pages/Signup';
import Chat from './pages/Chat';
import MCPSettings from './pages/MCPSettings';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route
                        path="/chat"
                        element={
                            <ProtectedRoute>
                                <Chat />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/mcp"
                        element={
                            <ProtectedRoute>
                                <MCPSettings />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/" element={<Navigate to="/chat" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;