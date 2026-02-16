import { NextApiRequest, NextApiResponse } from 'next';
import { Server as IOServer } from 'socket.io';

export const config = {
  api: {
    bodyParser: false,
  },
};

let io;

const SocketHandler = (req, res) => {
  if (!io) {
    console.log('Initializing Socket.IO server...');

    // Use the built-in Next.js server
    const io = new IOServer({
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true 
    });

    io.on('connection', (socket) => {
      console.log('Admin connected to notification system:', socket.id);

      // Join admin room for notifications
      socket.join('admin_notifications');

      socket.on('join_admin', (data) => {
        console.log('Admin joined room:', data.room);
        socket.join(data.room);
      });

      socket.on('disconnect', () => {
        console.log('Admin disconnected from notification system:', socket.id);
      });

      // Send welcome message
      socket.emit('welcome', { 
        message: 'Connected to notification system',
        socketId: socket.id 
      });
    });

    // Make io globally available for broadcasting
    global.io = io;

    console.log('Socket.IO server initialized successfully');
  }

  res.end();
};

export default SocketHandler;
