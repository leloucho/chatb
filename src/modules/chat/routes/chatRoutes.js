const express = require('express');
const chatHttpController = require('../controllers/chatHttpController');

const router = express.Router();

// Webhook para mensajes entrantes de WhatsApp
router.post('/webhook/whatsapp', (req, res) => {
    chatHttpController.handleIncomingWhatsApp(req, res);
});

// Webhook para estado de mensajes
router.post('/webhook/status', (req, res) => {
    chatHttpController.handleStatusWebhook(req, res);
});

// Ruta de verificación para Twilio
router.get('/webhook/whatsapp', (req, res) => {
    chatHttpController.verifyWebhook(req, res);
});

module.exports = router;
