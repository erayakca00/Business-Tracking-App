import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '../app/hooks';
import { BASE_URL } from '../services/api';

export const useSocket = (groupId?: string) => {
    const token = useAppSelector((state) => state.auth.token);
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

        // Derive socket server URL directly from the base API URL (stripping '/api/v1')
        const socketUrl = BASE_URL.replace('/api/v1', '');

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
            console.log('[Socket Mobile] Connected to backend');
            setConnected(true);

            // Join group room if groupId is supplied
            if (groupId) {
                socket.emit('join-group', groupId);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket Mobile] Disconnected from backend:', reason);
            setConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('[Socket Mobile] Connection error:', error);
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
