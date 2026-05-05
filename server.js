require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { pool } = require('./database');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { 
  cors: { 
    origin: '*',
    methods: ['GET', 'POST']
  } 
});

app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/print', require('./routes/print'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Socket.io para tempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('join-tenant', (tenantId) => {
    socket.join(`tenant-${tenantId}`);
  });

  socket.on('new-order', (data) => {
    socket.to(`tenant-${data.tenantId}`).emit('order-update', data);
  });
});

app.set('io', io);

// Railway fornece a porta via variável de ambiente PORT
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
