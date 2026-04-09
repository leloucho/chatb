const twilio = require('twilio');
const path = require('path');
const ConversationService = require('../../../services/conversationService');
const storageService = require('../../files/services/storageService');

function getTwilioClient() {
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function sendWhatsAppMessage(to, message) {
    const client = getTwilioClient();

    return client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${to}`,
        body: message
    }).then(message => {
        console.log(`Mensaje enviado a ${to}: ${message.sid}`);
    }).catch(error => {
        console.error('Error enviando mensaje:', error);
    });
}

async function sendWhatsAppFile(to, filePath, caption = '') {
    const client = getTwilioClient();

    try {
        const fileUrl = storageService.getPublicFileUrl(path.basename(filePath));

        const message = await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${to}`,
            body: caption,
            mediaUrl: [fileUrl]
        });

        console.log(`Archivo enviado a ${to}: ${message.sid}`);
        return message;
    } catch (error) {
        console.error('Error enviando archivo:', error);
        throw error;
    }
}

async function generateStatusUpdateMessage(order, status, comment, estimatedTime) {
    const serviceNames = {
        'corte_laser': 'Corte Láser',
        'ploteo': 'Ploteo',
        'impresion_3d': 'Impresión 3D',
        'otros': 'Otros Servicios'
    };

    const serviceName = serviceNames[order.service_type] || order.service_type;

    switch (status) {
        case 'rechazado':
            return `❌ *Tu pedido ha sido revisado y fue rechazado* por el motivo siguiente:

"${comment}"

Por favor, revisa tu archivo, corrige los detalles y vuelve a subirlo.

_Puedes enviar un nuevo archivo cuando tengas las correcciones listas._`;

        case 'aceptado':
            return `✅ *Tu pedido ha sido aceptado.*

📝 *Pedido #${order.id}*
🔸 *Servicio:* ${serviceName}
⏰ *Tiempo estimado de elaboración:* ${estimatedTime}

🔧 *Estado actual:* En elaboración.`;

        case 'iniciado':
            return `🛠️ *Tu pedido está en proceso de elaboración.*

📝 *Pedido #${order.id}*
🔸 *Servicio:* ${serviceName}

El trabajo ha comenzado y está en progreso.`;

        case 'completado':
            return `✅ *Tu pedido está listo para recoger.*

📝 *Pedido #${order.id}*
🔸 *Servicio:* ${serviceName}

💰 Puedes hacer el pago mediante:
• Yape o transferencia al número *999 999 999*, o
• Pago en efectivo al momento de la entrega.

*Por favor, envía aquí una captura del comprobante de pago.*`;

        default:
            return `📋 *Actualización de tu pedido #${order.id}*

🔸 *Estado:* ${status}
${comment ? `💬 *Comentario:* ${comment}` : ''}`;
    }
}

async function sendFileReceivedNotification(phoneNumber, orderData) {
    const message = `✅ *¡Archivo recibido correctamente desde el formulario web!*

📁 *Archivos subidos:* ${orderData.files?.length || 0} archivo(s)
📝 *Especificaciones:* ${orderData.specifications || 'Sin especificaciones'}

🔍 *Estado:* En revisión por nuestro equipo técnico

Te notificaremos aquí cuando tengamos una respuesta sobre la viabilidad de tu proyecto.

_¡Gracias por usar nuestro formulario web!_`;

    await sendWhatsAppMessage(phoneNumber, message);
    await ConversationService.updateConversationState(phoneNumber, 'awaiting_review_response');
}

async function sendReviewNotification(phoneNumber, review) {
    let message = '';

    if (review.status === 'aprobado') {
        message = `✅ *¡Tu proyecto ha sido aprobado!*

📝 *Pedido #${review.orderId}*
💰 *Costo estimado:* S/ ${review.estimatedCost || 'Por confirmar'}
⏱️ *Tiempo estimado:* ${review.estimatedTime || 'Por confirmar'}

💬 *Comentarios del técnico:*
"${review.comments || 'Proyecto viable sin observaciones'}"

🚀 *¿Deseas proceder con el pedido?*

Responde:
*1* "confirmar" - Para iniciar el trabajo
*2* "consultar" - Para hacer preguntas
*3* "cancelar" - Para cancelar el pedido`;
    } else {
        message = `❌ *Tu proyecto necesita correcciones*

📝 *Pedido #${review.orderId}*

💬 *Observaciones del técnico:*
"${review.comments || 'Revisar especificaciones técnicas'}"

🔧 *Sugerencias:*
${review.suggestions || '• Revisar dimensiones\n• Verificar materiales\n• Ajustar especificaciones'}

🌐 *¿Quieres corregir tu archivo?*

Responde:
*1* "corregir" - Para enviar archivo corregido  
*2* "consultar" - Para hablar con un técnico
*3* "cancelar" - Para cancelar el pedido`;
    }

    await sendWhatsAppMessage(phoneNumber, message);
    await ConversationService.updateConversationState(phoneNumber, 'awaiting_confirmation');
}

module.exports = {
    sendWhatsAppMessage,
    sendWhatsAppFile,
    generateStatusUpdateMessage,
    sendFileReceivedNotification,
    sendReviewNotification
};
