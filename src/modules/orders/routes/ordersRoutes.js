const express = require('express');
const { upload } = require('../../../config/upload');
const ordersController = require('../controllers/ordersController');
const { validate } = require('../../../middlewares/validate');
const { requireAdminAuth } = require('../../../middlewares/requireAdminAuth');
const {
	uploadFilesSchema,
	reviewOrderSchema,
	updateOrderSchema,
	orderIdSchema
} = require('../schemas/ordersSchemas');

const router = express.Router();

// Endpoint para upload de archivos desde el formulario web
router.post('/api/upload-files', upload.array('files', 10), validate(uploadFilesSchema), ordersController.uploadFiles);

// Endpoint para que el trabajador apruebe/rechace pedidos
router.post('/api/orders/:id/review', requireAdminAuth, validate(reviewOrderSchema), ordersController.reviewOrder);

// API para que el trabajador actualice pedidos
router.get('/api/orders/pending', requireAdminAuth, ordersController.getPendingOrders);
router.post('/api/orders/:id/update', requireAdminAuth, validate(updateOrderSchema), ordersController.updateOrder);

// Descargar archivos de un pedido
router.get('/api/orders/:id/download', requireAdminAuth, validate(orderIdSchema), ordersController.downloadOrderFiles);

module.exports = router;
