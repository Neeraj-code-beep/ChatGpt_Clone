const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

/* Routes */
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('../src/routes/chat.routes');

const app = express();

/* Using middlewares */
app.use(express.json());
app.use(cookieParser());

/* Health Check Endpoint */
app.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: isDbConnected ? 'connected' : 'disconnected',
  });
});

/* Using Routes */
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

module.exports = app;
