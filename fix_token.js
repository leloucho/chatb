const { Pool } = require('pg');

async function fixToken() {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'pedidos',
        password: '12345',
        port: 5432
    });

    try {
        const phoneNumber = '+51910262022';
        const service = 'corte_laser';
        const timestamp = Date.now();
        const token = phoneNumber.replace('+', '') + '_' + service + '_' + timestamp;
        
        console.log('🔄 Creando token para', phoneNumber);
        console.log('🔑 Token:', token);
        
        const url = `http://localhost:3000/pedido/corte-laser?token=${encodeURIComponent(token)}`;
        
        // Insertar o actualizar token
        await pool.query(`
            INSERT INTO conversations (phone_number, selected_service, web_token, web_form_url, current_state) 
            VALUES ($1, $2, $3, $4, $5) 
            ON CONFLICT (phone_number) 
            DO UPDATE SET 
                web_token = $3, 
                web_form_url = $4, 
                selected_service = $2
        `, [phoneNumber, service, token, url, 'form_sent']);
        
        console.log('✅ Token creado en base de datos');
        console.log('🌐 URL:', url);
        
        // Verificar
        const result = await pool.query(
            'SELECT * FROM conversations WHERE phone_number = $1', 
            [phoneNumber]
        );
        
        if (result.rows.length > 0) {
            console.log('✅ Verificación exitosa:');
            console.log('   Token guardado:', result.rows[0].web_token);
        }
        
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await pool.end();
    }
}

fixToken();