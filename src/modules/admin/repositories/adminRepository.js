const { Pool } = require('pg');

async function fetchAllOrders() {
    const pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'pedidos',
        password: process.env.DB_PASSWORD || '12345',
        port: process.env.DB_PORT || 5432,
    });

    try {
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

        return result.rows;
    } finally {
        await pool.end();
    }
}

module.exports = {
    fetchAllOrders
};
