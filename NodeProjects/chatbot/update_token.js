const { Pool } = require('pg');

async function updateToken() {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'pedidos',
        password: '12345',
        port: 5432
    });

    try {
        const phoneNumber = '+51910262022';
        const token = '51910262022_corte_laser_1762314379561';
        const url = `http://localhost:3000/pedido/corte-laser?token=${token}`;
        
        console.log('🔄 Actualizando token para', phoneNumber);
        console.log('🔑 Token:', token);
        
        await pool.query(
            'UPDATE conversations SET web_token = $1, web_form_url = $2 WHERE phone_number = $3',
            [token, url, phoneNumber]
        );
        
        console.log('✅ Token actualizado');
        
        const result = await pool.query(
            'SELECT web_token, web_form_url FROM conversations WHERE phone_number = $1',
            [phoneNumber]
        );
        
        console.log('📋 Resultado:', result.rows[0]);
        
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await pool.end();
    }
}

updateToken();