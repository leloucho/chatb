const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.AUTH_ENABLED = 'false';

const { createApp } = require('../../src/bootstrap/createApp');
const ordersModuleService = require('../../src/modules/orders/services/ordersModuleService');

test('GET /api/orders/pending devuelve listado de pedidos', async () => {
    const app = createApp();
    const original = ordersModuleService.getPendingOrders;

    ordersModuleService.getPendingOrders = async () => [{ id: 1, status: 'solicitado' }];

    const res = await request(app).get('/api/orders/pending');

    assert.equal(res.statusCode, 200);
    assert.equal(Array.isArray(res.body), true);
    assert.equal(res.body[0].id, 1);

    ordersModuleService.getPendingOrders = original;
});

test('POST /api/orders/:id/review procesa revisión', async () => {
    const app = createApp();
    const original = ordersModuleService.processReviewOrder;

    ordersModuleService.processReviewOrder = async () => ({ success: true });

    const res = await request(app)
        .post('/api/orders/12/review')
        .send({ reviewStatus: 'aprobado', comment: 'ok' });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);

    ordersModuleService.processReviewOrder = original;
});

test('POST /api/orders/:id/update actualiza pedido', async () => {
    const app = createApp();
    const original = ordersModuleService.processUpdateOrder;

    ordersModuleService.processUpdateOrder = async () => ({ success: true });

    const res = await request(app)
        .post('/api/orders/12/update')
        .send({ status: 'aceptado', comment: 'ok', estimatedTime: '24h' });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);

    ordersModuleService.processUpdateOrder = original;
});

test('POST /api/upload-files procesa carga de archivos', async () => {
    const app = createApp();
    const original = ordersModuleService.processUploadFiles;

    ordersModuleService.processUploadFiles = async () => ({
        success: true,
        orderId: 77,
        message: 'Archivos subidos exitosamente',
        debug: { conversation: { phone_number: '+51999999999' } }
    });

    const res = await request(app)
        .post('/api/upload-files')
        .field('token', 'abc')
        .field('specifications', '{"material":"acero"}')
        .attach('files', Buffer.from('pdf-data'), 'plano.pdf');

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.orderId, 77);

    ordersModuleService.processUploadFiles = original;
});
