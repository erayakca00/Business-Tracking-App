import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export const useSocket = (groupId?: string) => {
    const { token } = useAuth();
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!token) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setConnected(false);
            return;
        }

        const socketUrl = (import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:3000';
        
        // Initialize Socket.IO connection with JWT token inside handshake auth
        const socket = io(socketUrl, {
            auth: {
                token,
            },
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Socket] Connected to backend');
            setConnected(true);
            
            // If group ID is provided, join group room instantly
            if (groupId) {
                socket.emit('join-group', groupId);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected from backend:', reason);
            setConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error);
            setConnected(false);
        });

        return () => {
            if (groupId) {
                socket.emit('leave-group', groupId);
            }
            socket.disconnect();
            socketRef.current = null;
            setConnected(false);
        };
    }, [token, groupId]);

    return {
        socket: socketRef.current,
        connected,
    };
};
