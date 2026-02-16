import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as IOServer } from 'socket.io';

const httpServer = createServer();
const io = new IOServer(httpServer, {
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
  socket.join('admin_notifications');
  
  socket.on('join_admin', (data) => {
    console.log('Admin joined room:', data.room);
    socket.join(data.room);
  });
  
  socket.on('disconnect', () => {
    console.log('Admin disconnected from notification system:', socket.id);
  });
});

// Make io globally available
global.io = io;

const start = async () => {
  const nextApp = next({ dev: process.env.NODE_ENV !== 'production' });
  const port = process.env.PORT || 3000;
  
  await nextApp.prepare();
  
  httpServer.listen(port, () => {
    console.log(`Socket.IO server running on port ${port}`);
  });
};

start();

export default start;
