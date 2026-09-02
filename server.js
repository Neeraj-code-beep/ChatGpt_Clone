require('dotenv').config();
const { validateEnv } = require('./src/config/env');
const app = require('./src/app');
const { ConnectToDB, DisconnectFromDB } = require('./src/db/db');
const initSocketServer = require('./src/sockets/socket.server');
const httpServer = require('http').createServer(app);

// 1. Validate environment configuration
const env = validateEnv();

// 2. Connect to MongoDB
ConnectToDB();

// 3. Initialize Socket.IO server
initSocketServer(httpServer);

// 4. Start HTTP Server
const server = httpServer.listen(env.port, () => {
  console.log(`Server is running on port ${env.port} (${env.nodeEnv})`);
});

// 5. Graceful Shutdown Handler
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // Bounded 10-second timeout to force exit if closing hangs
  const forceExitTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000);

  try {
    // Stop accepting new HTTP connections
    server.close(async () => {
      console.log('HTTP and Socket.IO servers closed.');

      // Close MongoDB connection
      await DisconnectFromDB();

      clearTimeout(forceExitTimer);
      console.log('Graceful shutdown completed successfully.');
      process.exit(0);
    });
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
