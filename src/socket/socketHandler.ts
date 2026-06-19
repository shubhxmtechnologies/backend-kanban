import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const setupSocket = (io: Server) => {
    // Authenticate socket connections with JWT
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
            socket.data.userId = decoded.id;
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id} (userId: ${socket.data.userId})`);

        // Auto-join personal room for user-specific notifications
        if (socket.data.userId) {
            socket.join(`user:${socket.data.userId}`);
        }

        // User joins a board room
        socket.on('join-board', (boardId) => {
            socket.join(boardId);
            console.log(`User ${socket.id} joined board: ${boardId}`);
        });

        // User leaves a board room
        socket.on('leave-board', (boardId) => {
            socket.leave(boardId);
            console.log(`User ${socket.id} left board: ${boardId}`);
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};

export default setupSocket;