const ConversationService = require('../../../services/conversationService');
const OrderService = require('../../../services/orderService');
const chatGateway = require('../../chat/services/chatGateway');
const ordersRepository = require('../repositories/ordersRepository');

async function processUploadFiles(body, files) {
    const { token, specifications } = body;

    if (!token) {
        const err = new Error('Token requerido');
        err.statusCode = 400;
        throw err;
    }

    if (!files || files.length === 0) {
        const err = new Error('No se subieron archivos');
        err.statusCode = 400;
        throw err;
    }

    // Buscar conversación por token
    const conversation = await ConversationService.getConversationByToken(token);

    if (!conversation) {
        const err = new Error('Token inválido o expirado');
        err.statusCode = 404;
        throw err;
    }

    // Preparar informacion de archivos
    const fileNames = files.map(file => file.filename);
    const specsObj = JSON.parse(specifications);

    // Crear pedido con archivos
    const order = await OrderService.createOrderWithFiles({
        phoneNumber: conversation.phone_number,
        customerDni: conversation.customer_dni || null,
        serviceType: 'corte_laser',
        serviceName: 'Corte Láser',
        files: fileNames,
        specifications: specsObj,
        status: 'Solicitado'
    });

    // Actualizar estado de conversación
    await ConversationService.updateConversationState(
        conversation.phone_number,
        'awaiting_review_response'
    );

    // Enviar notificación por WhatsApp
    await chatGateway.sendFileReceivedNotification(
        conversation.phone_number,
        {
            files: fileNames,
            specifications: Object.entries(specsObj).map(([key, value]) => `${key}: ${value}`).join(', ')
        }
    );

    return {
        success: true,
        orderId: order.id,
        message: 'Archivos subidos exitosamente',
        debug: {
            token,
            conversation
        }
    };
}

async function processReviewOrder(orderId, reviewStatus, comment) {
    await OrderService.updateWorkerReview(orderId, reviewStatus, comment);

    const order = await OrderService.getOrderById(orderId);

    if (order) {
        await chatGateway.sendReviewNotification(
            order.phone_number,
            orderId,
            reviewStatus,
            comment
        );
    }

    return { success: true };
}

async function getPendingOrders() {
    return OrderService.getPendingOrders();
}

async function processUpdateOrder(orderId, status, comment, estimatedTime) {
    await OrderService.updateOrderWithComment(orderId, status, comment, estimatedTime);

    const order = await OrderService.getOrderById(orderId);

    if (order) {
        const message = await chatGateway.generateStatusUpdateMessage(order, status, comment, estimatedTime);
        await chatGateway.sendWhatsAppMessage(order.phone_number, message);
    }

    return { success: true };
}

async function getDownloadOrderFilesPayload(orderId) {
    const rows = await ordersRepository.getOrderFilesById(orderId);

    if (rows.length === 0) {
        const err = new Error('Pedido no encontrado');
        err.statusCode = 404;
        throw err;
    }

    const files = rows[0].uploaded_files || rows[0].file_paths || '';

    if (!files) {
        const err = new Error('No hay archivos para descargar');
        err.statusCode = 404;
        throw err;
    }

    return {
        success: true,
        message: 'Funcionalidad de descarga en desarrollo',
        files: files.split(',').map(f => f.trim()).filter(f => f)
    };
}

module.exports = {
    processUploadFiles,
    processReviewOrder,
    getPendingOrders,
    processUpdateOrder,
    getDownloadOrderFilesPayload
};
