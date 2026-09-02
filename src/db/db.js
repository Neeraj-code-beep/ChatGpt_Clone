const mongoose = require('mongoose');

const ConnectToDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Server is connected to DB');
  } catch (err) {
    console.error('Server failed to connect with DB:', err);
    throw err;
  }
};

const DisconnectFromDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed cleanly');
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
  }
};

module.exports = {
  ConnectToDB,
  DisconnectFromDB,
};
