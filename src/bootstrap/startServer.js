const { initDatabase } = require('../database/database');

async function startServer(app, port) {
    try {
        // Inicializar base de datos
        await initDatabase();
        console.log('✅ Base de datos inicializada');

        // Verificar variables de entorno críticas
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            console.warn('⚠️  Variables de Twilio no configuradas. El envío de mensajes no funcionará.');
        }

        // Iniciar servidor
        app.listen(port, () => {
            console.log(`🚀 Servidor iniciado en puerto ${port}`);
            console.log(`📱 Webhook URL: http://localhost:${port}/webhook/whatsapp`);
            console.log(`🔍 Health check: http://localhost:${port}/health`);
            console.log(`📋 Estado: http://localhost:${port}/webhook/status`);
        });
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

module.exports = {
    startServer
};
