const { Pool } = require('pg');

async function getOrderFilesById(orderId) {
    const pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'pedidos',
        password: process.env.DB_PASSWORD || '12345',
        port: process.env.DB_PORT || 5432,
    });

    try {
        const result = await pool.query('SELECT uploaded_files, file_paths FROM orders WHERE id = $1', [orderId]);
        return result.rows;
    } finally {
        await pool.end();
    }
}

module.exports = {
    getOrderFilesById
};
