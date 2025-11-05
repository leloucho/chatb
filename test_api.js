const { Pool } = require('pg');

async function testAPI() {
    try {
        const pool = new Pool({
            user: 'postgres',
            host: 'localhost',
            database: 'pedidos',
            password: '12345',
            port: 5432,
        });

        console.log('🔍 Probando consulta directa a la base de datos...');
        
        const result = await pool.query(`
            SELECT 
                id,
                phone_number,
                service_type,
                specifications,
                status,
                file_paths,
                customer_name,
                uploaded_files,
                worker_review_status,
                created_at,
                updated_at
            FROM orders 
            ORDER BY created_at DESC
        `);

        console.log('📋 Resultados de la consulta:');
        console.log('Número de pedidos:', result.rows.length);
        
        if (result.rows.length > 0) {
            result.rows.forEach((order, index) => {
                console.log(`\n--- PEDIDO ${index + 1} ---`);
                console.log('ID:', order.id);
                console.log('Cliente:', order.phone_number);
                console.log('Servicio:', order.service_type);
                console.log('Estado:', order.status);
                console.log('Revisión:', order.worker_review_status || 'Pendiente');
                console.log('Especificaciones:', order.specifications);
                console.log('Archivos:', order.uploaded_files || order.file_paths || 'No especificado');
            });

            // Simular respuesta de la API
            const apiResponse = {
                success: true,
                orders: result.rows
            };

            console.log('\n🔧 Respuesta simulada de la API:');
            console.log(JSON.stringify(apiResponse, null, 2));
        } else {
            console.log('❌ No hay pedidos en la base de datos');
        }

        await pool.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testAPI();