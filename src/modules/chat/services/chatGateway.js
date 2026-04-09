const chatMessagingService = require('./chatMessagingService');
const chatConversationService = require('./chatConversationService');

function handleIncomingMessage(req, res) {
    return chatConversationService.handleIncomingMessage(req, res);
}

function handleMessageStatus(req, res) {
    return chatConversationService.handleMessageStatus(req, res);
}

function sendWhatsAppMessage(to, message) {
    return chatMessagingService.sendWhatsAppMessage(to, message);
}

function sendFileReceivedNotification(phoneNumber, orderData) {
    return chatMessagingService.sendFileReceivedNotification(phoneNumber, orderData);
}

function sendReviewNotification(phoneNumber, orderId, reviewStatus, comment) {
    return chatMessagingService.sendReviewNotification(phoneNumber, {
        orderId,
        status: reviewStatus,
        comments: comment
    });
}

function generateStatusUpdateMessage(order, status, comment, estimatedTime) {
    return chatMessagingService.generateStatusUpdateMessage(order, status, comment, estimatedTime);
}

module.exports = {
    handleIncomingMessage,
    handleMessageStatus,
    sendWhatsAppMessage,
    sendFileReceivedNotification,
    sendReviewNotification,
    generateStatusUpdateMessage
};
