const { pool } = require('../database/database');

class CustomerService {
    static async upsertByDni({ dni, phoneNumber, name = null }) {
        const client = await pool.connect();

        try {
            const result = await client.query(
                `INSERT INTO customers (dni, phone_number, name, updated_at, last_seen_at)
                 VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT (dni)
                 DO UPDATE SET
                    phone_number = EXCLUDED.phone_number,
                    name = COALESCE(EXCLUDED.name, customers.name),
                    updated_at = CURRENT_TIMESTAMP,
                    last_seen_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [dni, phoneNumber, name]
            );

            return result.rows[0];
        } finally {
            client.release();
        }
    }
}

module.exports = CustomerService;
