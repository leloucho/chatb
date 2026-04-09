const chatGateway = require('../services/chatGateway');
const chatWebhookService = require('../services/chatWebhookService');

function handleIncomingWhatsApp(req, res) {
    return chatGateway.handleIncomingMessage(req, res);
}

function handleStatusWebhook(req, res) {
    return chatGateway.handleMessageStatus(req, res);
}

function verifyWebhook(req, res) {
    const result = chatWebhookService.buildVerificationResponse(req.query);

    if (result.log) {
        console.log(result.log);
    }

    return res.status(result.statusCode).send(result.body);
}

module.exports = {
    handleIncomingWhatsApp,
    handleStatusWebhook,
    verifyWebhook
};
