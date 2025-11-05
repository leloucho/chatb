const axios = require('axios');

// Función para simular mensajes de WhatsApp
async function simulateWhatsAppMessage(phoneNumber, message, mediaUrl = null, mediaType = null) {
    const webhookData = {
        From: `whatsapp:${phoneNumber}`,
        To: 'whatsapp:+14155238886',
        Body: message,
        NumMedia: mediaUrl ? '1' : '0'
    };

    if (mediaUrl) {
        webhookData.MediaUrl0 = mediaUrl;
        webhookData.MediaContentType0 = mediaType;
    }

    try {
        const response = await axios.post('http://localhost:3000/webhook/whatsapp', webhookData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log(`✅ Mensaje enviado: "${message}"`);
        console.log(`📱 Desde: ${phoneNumber}`);
        console.log(`🔄 Status: ${response.status}`);
        console.log('---');
        
    } catch (error) {
        console.error(`❌ Error enviando mensaje: ${error.message}`);
    }
}

// Función para simular una conversación completa
async function testCompleteFlow() {
    const testPhone = '+51987654321';
    
    console.log('🧪 INICIANDO PRUEBA COMPLETA DEL CHATBOT\n');
    
    // 1. Mensaje inicial
    console.log('1️⃣ Enviando saludo inicial...');
    await simulateWhatsAppMessage(testPhone, 'Hola');
    await sleep(2000);
    
    // 2. Selección de corte láser
    console.log('2️⃣ Seleccionando corte láser...');
    await simulateWhatsAppMessage(testPhone, '1');
    await sleep(2000);
    
    // 3. Usuario prefiere formulario web
    console.log('3️⃣ Usuario prefiere formulario web...');
    await simulateWhatsAppMessage(testPhone, 'web');
    await sleep(2000);
    
    // 4. Usuario pide enlace
    console.log('4️⃣ Usuario solicita enlace...');
    await simulateWhatsAppMessage(testPhone, 'enlace');
    await sleep(2000);
    
    console.log('✅ Prueba completa finalizada. Revisa el panel admin en http://localhost:3000/admin.html');
}

// Función auxiliar para esperar
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
    testCompleteFlow().catch(console.error);
}

module.exports = { simulateWhatsAppMessage, testCompleteFlow };