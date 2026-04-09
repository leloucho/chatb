const { Pool } = require('pg');
require('dotenv').config();

// Configurar pool de conexiones de PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'pedidos',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Verificar conexión
pool.on('connect', () => {
    console.log('Conectado a la base de datos PostgreSQL');
});

pool.on('error', (err, client) => {
    console.error('Error inesperado en cliente inactivo', err);
    process.exit(-1);
});

// Crear tablas
const initDatabase = async () => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Tabla de conversaciones para mantener el estado
        await client.query(`
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                phone_number VARCHAR(20) UNIQUE NOT NULL,
                current_state VARCHAR(50) DEFAULT 'initial',
                selected_service VARCHAR(50),
                customer_dni VARCHAR(8),
                web_token VARCHAR(255),
                web_form_url TEXT,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Tabla conversations creada o ya existe');

        // Tabla de pedidos
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                phone_number VARCHAR(20) NOT NULL,
                customer_dni VARCHAR(8),
                service_type VARCHAR(50) NOT NULL,
                specifications TEXT,
                status VARCHAR(20) DEFAULT 'solicitado',
                file_paths TEXT,
                customer_name VARCHAR(100),
                worker_comment TEXT,
                estimated_time VARCHAR(50),
                payment_proof TEXT,
                uploaded_files TEXT,
                file_upload_timestamp TIMESTAMP,
                worker_review_status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Tabla orders creada o ya existe');

        // Tabla de clientes identificados por DNI
        await client.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                dni VARCHAR(8) UNIQUE NOT NULL,
                phone_number VARCHAR(20) NOT NULL,
                name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Tabla customers creada o ya existe');

        // Migraciones idempotentes para bases ya existentes
        await client.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_dni VARCHAR(8)');
        await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_dni VARCHAR(8)');
        await client.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(100)');
        await client.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        await client.query('CREATE INDEX IF NOT EXISTS idx_customers_dni ON customers(dni)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_customers_phone_number ON customers(phone_number)');

        await client.query('COMMIT');
        console.log('Base de datos inicializada correctamente');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error inicializando la base de datos:', error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    pool,
    initDatabase
};