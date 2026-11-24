// This is the main file for the backend

// import functionalities
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');

const cors = require('cors');
// allow using a .env file
require('dotenv').config(); //require the dotenv

// creates a new instance of express application
const app = express();

// add cors header to the server
app.use(
  cors({
    origin: '*'
  })
);

// suppress mongoose warning to prepare for new version
mongoose.set('strictQuery', false);

// sets up mongoose for the mongoDB connection
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log('Database connection Success!');
  })
  .catch((err) => {
    console.error('Mongo Connection Error', err);
  });

// declare port number for the api
const PORT = process.env.PORT || 3000;

// setup and access request body
app.use(express.json());
app.use(morgan('dev'));

// setup middle ware for routes
app.use('/clients', require('./routes/clients'));
app.use('/events', require('./routes/events'));
app.use('/org', require('./routes/org'));
app.use('/services', require('./routes/services'));
app.use('/users', require('./routes/users'));

// Report whether the API is up and MongoDB is connected.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Keep unknown routes in the same JSON format as other API errors.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Hide internal server details while preserving safe client error messages.
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const message = status >= 500 ? 'Internal server error' : err.message;
  res.status(status).json({ error: message || 'Request failed' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
