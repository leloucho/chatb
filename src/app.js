require('dotenv').config();
const { createApp } = require('./bootstrap/createApp');
const { startServer } = require('./bootstrap/startServer');
const { registerProcessHandlers } = require('./bootstrap/registerProcessHandlers');

const app = createApp();
const PORT = process.env.PORT || 3000;

registerProcessHandlers();

// Iniciar aplicación
startServer(app, PORT);

module.exports = app;