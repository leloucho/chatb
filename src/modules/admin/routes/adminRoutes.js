const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAdminAuth } = require('../../../middlewares/requireAdminAuth');

const router = express.Router();

// Obtener todos los pedidos para el panel de admin
router.get('/api/admin/orders', requireAdminAuth, adminController.getAdminOrders);

module.exports = router;
