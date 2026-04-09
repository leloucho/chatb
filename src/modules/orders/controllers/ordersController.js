const ordersModuleService = require('../services/ordersModuleService');

async function uploadFiles(req, res, next) {
    try {
        console.log('--- DEBUG UPLOAD ENDPOINT ---');
        console.log('Body:', req.body);
        console.log('Files:', req.files ? req.files.length : 0);

        console.log('Token recibido:', req.body.token);
        console.log('Buscando conversación con token:', req.body.token);

        const result = await ordersModuleService.processUploadFiles(req.body, req.files);

        console.log('Conversación encontrada:', result.debug.conversation);

        res.json({
            success: result.success,
            orderId: result.orderId,
            message: result.message
        });
    } catch (error) {
        if (error.statusCode) {
            if (error.statusCode === 400 && error.message === 'Token requerido') {
                console.log('ERROR: Token no proporcionado');
            }
            if (error.statusCode === 400 && error.message === 'No se subieron archivos') {
                console.log('ERROR: No hay archivos');
            }
            if (error.statusCode === 404 && error.message === 'Token inválido o expirado') {
                console.log('ERROR: Token inválido o expirado');
            }
            return next(error);
        }

        console.error('--- ERROR EN UPLOAD ENDPOINT ---');
        console.error('Error completo:', error);
        console.error('Stack:', error.stack);
        return next(error);
    }
}

async function reviewOrder(req, res, next) {
    try {
        const { reviewStatus, comment } = req.body;
        const orderId = req.params.id;

        const result = await ordersModuleService.processReviewOrder(orderId, reviewStatus, comment);
        res.json(result);
    } catch (error) {
        console.error('Error actualizando revision:', error);
        return next(error);
    }
}

async function getPendingOrders(req, res, next) {
    try {
        const orders = await ordersModuleService.getPendingOrders();
        res.json(orders);
    } catch (error) {
        return next(error);
    }
}

async function updateOrder(req, res, next) {
    try {
        const { status, comment, estimatedTime } = req.body;
        const orderId = req.params.id;

        const result = await ordersModuleService.processUpdateOrder(orderId, status, comment, estimatedTime);
        res.json(result);
    } catch (error) {
        return next(error);
    }
}

async function downloadOrderFiles(req, res, next) {
    try {
        const orderId = req.params.id;

        const result = await ordersModuleService.getDownloadOrderFilesPayload(orderId);
        res.json(result);
    } catch (error) {
        if (error.statusCode) {
            return next(error);
        }
        console.error('Error descargando archivos:', error);
        return next(error);
    }
}

module.exports = {
    uploadFiles,
    reviewOrder,
    getPendingOrders,
    updateOrder,
    downloadOrderFiles
};
