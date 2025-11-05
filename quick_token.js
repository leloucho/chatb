const { Pool } = require('pg');

async function quickInsert() {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'pedidos',
        password: '12345',
        port: 5432,
    });

    try {
        const testPhone = '+51987654321';
        const testToken = 'test_token_123';
        
        await pool.query(`
            INSERT INTO conversations (phone_number, current_state, selected_service, web_token, web_form_url, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (phone_number) DO UPDATE SET
                current_state = $2,
                selected_service = $3,
                web_token = $4,
                web_form_url = $5,
                updated_at = NOW()
        `, [testPhone, 'awaiting_web_upload', 'corte_laser', testToken, `http://localhost:3000/pedido/corte-laser?token=${testToken}`]);
        
        console.log('✅ Token insertado exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

quickInsert();