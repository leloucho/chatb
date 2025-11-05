const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'pedidos',
    password: '12345',
    port: 5432,
});

async function insertTestToken() {
    const client = await pool.connect();
    
    try {
        // Insertar conversación de prueba con token
        const testPhone = '+51987654321';
        const testToken = 'test_token_123';
        const webFormUrl = `http://localhost:3000/pedido/corte-laser?token=${testToken}`;
        
        await client.query(`
            INSERT INTO conversations (phone_number, current_state, selected_service, web_token, web_form_url, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (phone_number) DO UPDATE SET
                current_state = $2,
                selected_service = $3,
                web_token = $4,
                web_form_url = $5,
                updated_at = NOW()
        `, [testPhone, 'awaiting_web_upload', 'corte_laser', testToken, webFormUrl]);
        
        console.log('✅ Token de prueba insertado correctamente');
        console.log(`📱 Teléfono: ${testPhone}`);
        console.log(`🔑 Token: ${testToken}`);
        console.log(`🌐 URL: ${webFormUrl}`);
        
    } catch (error) {
        console.error('❌ Error insertando token:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

insertTestToken();