const { Pool } = require('pg');

async function testChatbotLogic() {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'pedidos',
        password: '12345',
        port: 5432
    });

    try {
        const phoneNumber = '+51910262022';
        
        console.log('🧪 TESTING CHATBOT TOKEN LOGIC');
        console.log('📱 Número:', phoneNumber);
        
        // Obtener conversación existente
        const result = await pool.query(
            'SELECT * FROM conversations WHERE phone_number = $1',
            [phoneNumber]
        );
        
        if (result.rows.length > 0) {
            const conversation = result.rows[0];
            console.log('📋 Conversación encontrada:');
            console.log('   ID:', conversation.id);
            console.log('   Estado:', conversation.current_state);
            console.log('   Servicio:', conversation.selected_service);
            console.log('🔑 Token existente:', conversation.web_token || 'NO HAY TOKEN');
            console.log('🌐 URL existente:', conversation.web_form_url || 'NO HAY URL');
            
            if (conversation.web_token) {
                console.log('✅ EL CHATBOT DEBERÍA USAR EL TOKEN EXISTENTE');
                console.log('🌐 URL que debería enviar:', `http://localhost:3000/pedido/corte-laser?token=${conversation.web_token}`);
            } else {
                console.log('🆕 EL CHATBOT DEBERÍA CREAR UN NUEVO TOKEN');
            }
        } else {
            console.log('📋 No hay conversación existente para este número');
        }
        
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await pool.end();
    }
}

testChatbotLogic();