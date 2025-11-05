const axios = require('axios');

async function testSimpleWebhook() {
    try {
        console.log('🧪 Enviando mensaje simple a webhook...');
        
        const response = await axios.post('http://localhost:3000/webhook/whatsapp', 
            'From=whatsapp:+51987654321&To=whatsapp:+14155238886&Body=1&NumMedia=0',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        console.log('✅ Respuesta recibida:', response.status);
        console.log('🎯 Mensaje procesado correctamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testSimpleWebhook();