require('dotenv').config();
const app = require('./src/app');
const port = 3000;
const ConnectToDB = require('./src/db/db');
const initSocketServer = require('./src/sockets/socket.server');
const httpServer = require('http').createServer(app);

ConnectToDB();
initSocketServer(httpServer);

httpServer.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
