const { pool } = require('../database/database');

class ConversationService {
    // Obtener o crear conversación
    static async getOrCreateConversation(phoneNumber) {
        const client = await pool.connect();
        
        try {
            // Intentar obtener conversación existente
            const result = await client.query(
                'SELECT * FROM conversations WHERE phone_number = $1',
                [phoneNumber]
            );

            if (result.rows.length > 0) {
                return result.rows[0];
            } else {
                // Crear nueva conversación
                const insertResult = await client.query(
                    'INSERT INTO conversations (phone_number, current_state) VALUES ($1, $2) RETURNING *',
                    [phoneNumber, 'initial']
                );
                return insertResult.rows[0];
            }
        } finally {
            client.release();
        }
    }

    // Actualizar estado de conversación con datos adicionales
    static async updateConversationState(phoneNumber, newState, selectedService = null, additionalData = {}) {
        const client = await pool.connect();
        
        try {
            let query, params;
            
            // Construir la consulta dinámicamente
            let updates = ['current_state = $1', 'updated_at = CURRENT_TIMESTAMP'];
            params = [newState];
            let paramIndex = 2;

            if (selectedService) {
                updates.push(`selected_service = $${paramIndex}`);
                params.push(selectedService);
                paramIndex++;
            }

            if (additionalData.web_token) {
                updates.push(`web_token = $${paramIndex}`);
                params.push(additionalData.web_token);
                paramIndex++;
            }

            if (additionalData.web_form_url) {
                updates.push(`web_form_url = $${paramIndex}`);
                params.push(additionalData.web_form_url);
                paramIndex++;
            }

            if (additionalData.details) {
                updates.push(`details = $${paramIndex}`);
                params.push(additionalData.details);
                paramIndex++;
            }

            params.push(phoneNumber);
            query = `UPDATE conversations SET ${updates.join(', ')} WHERE phone_number = $${paramIndex}`;

            const result = await client.query(query, params);
            return result.rowCount > 0;
        } finally {
            client.release();
        }
    }

    // Obtener conversación por token
    static async getConversationByToken(token) {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                'SELECT * FROM conversations WHERE web_token = $1',
                [token]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    // Reiniciar conversación
    static async resetConversation(phoneNumber) {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                'UPDATE conversations SET current_state = $1, selected_service = NULL, web_token = NULL, web_form_url = NULL, details = NULL, updated_at = CURRENT_TIMESTAMP WHERE phone_number = $2',
                ['initial', phoneNumber]
            );
            return result.rowCount > 0;
        } finally {
            client.release();
        }
    }
}

module.exports = ConversationService;