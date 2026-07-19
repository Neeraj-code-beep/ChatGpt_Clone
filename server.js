require('dotenv').config();
const app = require('./src/app');
const port = 3000;
const ConnectToDB = require('./src/db/db');

ConnectToDB();

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
