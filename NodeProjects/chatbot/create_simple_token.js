const { Pool } = require('pg');

async function createSimpleToken() {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'pedidos',
        password: '12345',
        port: 5432,
    });

    try {
        // Token simple sin caracteres especiales
        const token = `51910262022_corte_laser_${Date.now()}`;
        const url = `http://localhost:3000/pedido/corte-laser?token=${token}`;
        
        console.log('🔄 Creando token simple...');
        
        await pool.query(`
            UPDATE conversations 
            SET web_token = $1, web_form_url = $2, updated_at = NOW() 
            WHERE phone_number = '+51910262022'
        `, [token, url]);
        
        console.log('✅ Token simple creado exitosamente!');
        console.log('🔑 Token:', token);
        console.log('🌐 URL completa:', url);
        console.log('');
        console.log('📋 COPIA ESTA URL EN TU NAVEGADOR:');
        console.log(url);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

createSimpleToken();