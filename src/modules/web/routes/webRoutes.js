const express = require('express');
const webController = require('../controllers/webController');

const router = express.Router();

// Ruta para formulario de corte laser
router.get('/pedido/corte-laser', (req, res) => {
    webController.renderLaserForm(req, res);
});

// Flujo de cliente (registro/autenticación)
router.get('/cliente/registro', (req, res) => {
    webController.renderCustomerRegistration(req, res);
});

router.get('/cliente/autenticacion', (req, res) => {
    webController.renderCustomerAuth(req, res);
});

// Contexto para autocompletar formulario por token
router.get('/api/web/form-context', (req, res, next) => {
    webController.getFormContext(req, res, next);
});

router.get('/api/web/customer-context', (req, res, next) => {
    webController.getCustomerAccessContext(req, res, next);
});

router.post('/api/web/customer-register', (req, res, next) => {
    webController.registerCustomer(req, res, next);
});

router.post('/api/web/customer-authenticate', (req, res, next) => {
    webController.authenticateCustomer(req, res, next);
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
