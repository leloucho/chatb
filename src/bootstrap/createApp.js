const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const chatModule = require('../modules/chat');
const ordersModule = require('../modules/orders');
const adminModule = require('../modules/admin');
const webModule = require('../modules/web');
const authModule = require('../modules/auth');
const docsModule = require('../modules/docs');
const requestLogger = require('../middlewares/requestLogger');
const requestContext = require('../middlewares/requestContext');
const errorHandler = require('../middlewares/errorHandler');

function createApp() {
    const app = express();
    const corsOrigin = process.env.CORS_ORIGIN || '*';

    app.disable('x-powered-by');

    app.use(helmet());
    app.use(cors({
        origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((v) => v.trim()),
        credentials: true
    }));
    app.use(rateLimit({
        windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
        max: Number(process.env.RATE_LIMIT_MAX || 300),
        standardHeaders: true,
        legacyHeaders: false
    }));

    // Middleware
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(requestContext);

    // Servir archivos estáticos
    app.use(express.static('public'));

    // Servir archivos de templates para WhatsApp
    app.use('/files', express.static('templates'));

    // Middleware para logging
    app.use(requestLogger);

    // Rutas modulares
    app.use(authModule.routes);
    app.use(docsModule.routes);
    app.use(chatModule.routes);
    app.use(ordersModule.routes);
    app.use(adminModule.routes);
    app.use(webModule.routes);

    // Manejo de errores
    app.use(errorHandler);

    return app;
}

module.exports = {
    createApp
};
