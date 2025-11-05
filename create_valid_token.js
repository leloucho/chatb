const { Pool } = require('pg');

async function createValidToken() {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'pedidos',
        password: '12345',
        port: 5432,
    });

    try {
        const phone = '+51910262022';
        const token = `${phone}_corte_laser_${Date.now()}`;
        const url = `http://localhost:3000/pedido/corte-laser?token=${token}`;
        
        console.log('🔄 Creando token válido...');
        
        // Primero crear la conversación si no existe
        await pool.query(`
            INSERT INTO conversations (phone_number, current_state, selected_service, web_token, web_form_url, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (phone_number) DO UPDATE SET
                current_state = $2,
                selected_service = $3,
                web_token = $4,
                web_form_url = $5,
                updated_at = NOW()
        `, [phone, 'awaiting_web_upload', 'corte_laser', token, url]);
        
        console.log('✅ Token creado exitosamente!');
        console.log('🔑 Token:', token);
        console.log('🌐 URL completa:', url);
        console.log('');
        console.log('📋 COPIA ESTA URL EXACTA EN TU NAVEGADOR:');
        console.log(url);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

createValidToken();