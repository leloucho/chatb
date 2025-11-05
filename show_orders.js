const { Pool } = require('pg');

async function showOrders() {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'pedidos',
        password: '12345',
        port: 5432,
    });

    try {
        console.log('📋 PEDIDOS EN LA BASE DE DATOS:');
        console.log('================================');
        
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
                created_at
            FROM orders 
            ORDER BY created_at DESC
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ No hay pedidos en la base de datos');
        } else {
            result.rows.forEach((order, index) => {
                console.log(`\n📦 PEDIDO #${order.id}`);
                console.log(`📱 Cliente: ${order.phone_number}`);
                console.log(`🛠️  Servicio: ${order.service_type}`);
                console.log(`📊 Estado: ${order.status}`);
                console.log(`📁 Archivos: ${order.uploaded_files || order.file_paths || 'No especificado'}`);
                console.log(`📝 Especificaciones: ${order.specifications}`);
                console.log(`👷 Revisión: ${order.worker_review_status || 'Pendiente'}`);
                console.log(`📅 Fecha: ${order.created_at}`);
                console.log('---');
            });
            
            console.log(`\n✅ Total de pedidos: ${result.rows.length}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

showOrders();