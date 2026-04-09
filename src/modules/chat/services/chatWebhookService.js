function buildVerificationResponse(query) {
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === verifyToken) {
            return {
                statusCode: 200,
                body: challenge,
                log: 'Webhook verificado exitosamente'
            };
        }

        return {
            statusCode: 403,
            body: 'Token de verificación incorrecto'
        };
    }

    return {
        statusCode: 400,
        body: 'Parámetros de verificación faltantes'
    };
}

module.exports = {
    buildVerificationResponse
};
