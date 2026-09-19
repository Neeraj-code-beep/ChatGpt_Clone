const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

/* Routes */
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();

/* CORS Middleware for REST API */
app.use((req, res, next) => {
  const allowedOrigin =
    process.env.CLIENT_ORIGIN ||
    (process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173');
  const requestOrigin = req.headers.origin;

  if (allowedOrigin && requestOrigin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

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
