const express = require('express');
const webController = require('../controllers/webController');

const router = express.Router();

// Ruta para formulario de corte laser
router.get('/pedido/corte-laser', (req, res) => {
    webController.renderLaserForm(req, res);
});

// Ruta de salud del servidor
router.get('/health', (req, res) => {
    webController.health(req, res);
});

// Ruta raiz
router.get('/', (req, res) => {
    webController.root(req, res);
});

// Ruta para el panel de administracion
router.get('/admin', (req, res) => {
    webController.adminRedirect(req, res);
});

module.exports = router;
