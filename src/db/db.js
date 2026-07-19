const mongoose = require('mongoose');

const ConnectToDB = async () => {
  await mongoose
    .connect(process.env.MONGODB_URL)
    .then(() => {
      console.log('Server is connected to DB');
    })
    .catch((err) => {
      console.log('Server is failed to connect with DB', err);
    });
};

module.exports = ConnectToDB;
