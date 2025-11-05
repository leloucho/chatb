const { Pool } = require('pg');

async function checkTokenExists() {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'pedidos',
        password: '12345',
        port: 5432,
    });

    try {
        const tokenToCheck = '+51910262022_corte_laser_1762310751539';
        
        console.log('🔍 Buscando token:', tokenToCheck);
        
        const result = await pool.query(
            'SELECT * FROM conversations WHERE web_token = $1',
            [tokenToCheck]
        );
        
        if (result.rows.length > 0) {
            console.log('✅ Token encontrado!');
            console.log('📋 Datos:', result.rows[0]);
        } else {
            console.log('❌ Token NO encontrado');
            
            // Ver todos los tokens existentes
            const allTokens = await pool.query('SELECT phone_number, web_token FROM conversations WHERE web_token IS NOT NULL');
            console.log('📋 Tokens existentes:');
            allTokens.rows.forEach(row => {
                console.log(`  ${row.phone_number}: ${row.web_token}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTokenExists();