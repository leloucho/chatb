const chatConversationService = require('../modules/chat/services/chatConversationService');
const chatMessagingService = require('../modules/chat/services/chatMessagingService');

class ChatbotController {
    generateUniqueToken(phoneNumber, serviceType) {
        return chatConversationService.generateUniqueToken(phoneNumber, serviceType);
    }

    async handleIncomingMessage(req, res) {
        return chatConversationService.handleIncomingMessage(req, res);
    }

    handleMessageStatus(req, res) {
        return chatConversationService.handleMessageStatus(req, res);
    }

    async handleInitialState(phoneNumber, messageBody) {
        return chatConversationService.handleInitialState(phoneNumber, messageBody);
    }

    async handleServiceSelection(phoneNumber, messageBody) {
        return chatConversationService.handleServiceSelection(phoneNumber, messageBody);
    }

    async handleFileUpload(phoneNumber, messageBody, mediaUrl, mediaContentType) {
        return chatConversationService.handleFileUpload(phoneNumber, messageBody, mediaUrl, mediaContentType);
    }

    async handleSpecifications(phoneNumber, messageBody) {
        return chatConversationService.handleSpecifications(phoneNumber, messageBody);
    }

    async handleConfirmation(phoneNumber, messageBody) {
        return chatConversationService.handleConfirmation(phoneNumber, messageBody);
    }

    async handleWebUploadState(phoneNumber, messageBody) {
        return chatConversationService.handleWebUploadState(phoneNumber, messageBody);
    }

    async handleReviewResponse(phoneNumber, messageBody) {
        return chatConversationService.handleReviewResponse(phoneNumber, messageBody);
    }

    sendWhatsAppMessage(to, message) {
        return chatMessagingService.sendWhatsAppMessage(to, message);
    }

    async sendWhatsAppFile(to, filePath, caption = '') {
        return chatMessagingService.sendWhatsAppFile(to, filePath, caption);
    }

    async generateStatusUpdateMessage(order, status, comment, estimatedTime) {
        return chatMessagingService.generateStatusUpdateMessage(order, status, comment, estimatedTime);
    }

    async sendFileReceivedNotification(phoneNumber, orderData) {
        return chatMessagingService.sendFileReceivedNotification(phoneNumber, orderData);
    }

    async sendReviewNotification(phoneNumber, reviewOrOrderId, reviewStatus, comment) {
        const review = typeof reviewOrOrderId === 'object'
            ? reviewOrOrderId
            : {
                orderId: reviewOrOrderId,
                status: reviewStatus,
                comments: comment
            };

        return chatMessagingService.sendReviewNotification(phoneNumber, review);
    }
}

module.exports = new ChatbotController();
