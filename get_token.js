const { Pool } = require('pg');

async function getActiveToken() {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'pedidos',
        password: '12345',
        port: 5432,
    });

    try {
        const result = await pool.query(`
            SELECT web_token, web_form_url 
            FROM conversations 
            WHERE phone_number = '+51910262022' 
            ORDER BY updated_at DESC 
            LIMIT 1
        `);
        
        if(result.rows.length > 0) {
            const row = result.rows[0];
            console.log('🔗 URL actual:', row.web_form_url);
            console.log('🔑 Token:', row.web_token);
            
            // Generar URL localhost para probar
            const localUrl = `http://localhost:3000/pedido/corte-laser?token=${row.web_token}`;
            console.log('🏠 URL localhost:', localUrl);
        } else {
            console.log('❌ No hay token activo');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

getActiveToken();