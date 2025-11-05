const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'pedidos',
    password: '12345',
    port: 5432,
});

async function runMigrations() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Ejecutando migraciones de base de datos...\n');
        
        // Leer archivo de migraciones
        const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');
        const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                console.log(`📝 Ejecutando: ${statement.substring(0, 50)}...`);
                await client.query(statement);
                console.log('✅ Completado\n');
            }
        }
        
        console.log('🎉 Todas las migraciones ejecutadas exitosamente!');
        console.log('\n📋 Verificando estructura de tablas...');
        
        // Verificar estructura de conversations
        const conversationsResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'conversations' 
            ORDER BY ordinal_position;
        `);
        
        console.log('\n🗂️ Tabla CONVERSATIONS:');
        conversationsResult.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type}`);
        });
        
        // Verificar estructura de orders
        const ordersResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'orders' 
            ORDER BY ordinal_position;
        `);
        
        console.log('\n🗂️ Tabla ORDERS:');
        ordersResult.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type}`);
        });
        
    } catch (error) {
        console.error('❌ Error ejecutando migraciones:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar migraciones
runMigrations().catch(console.error);