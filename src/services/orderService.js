const { pool } = require('../database/database');

class OrderService {
    // Crear nuevo pedido
    static async createOrder(orderData) {
        const client = await pool.connect();
        
        try {
            // Compatibilidad con el formato anterior (parámetros separados)
            if (typeof orderData === 'string') {
                const [phoneNumber, serviceType, specifications, filePaths, customerName] = arguments;
                const result = await client.query(
                    'INSERT INTO orders (phone_number, service_type, specifications, file_paths, customer_name, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                    [phoneNumber, serviceType, specifications || '', filePaths || '', customerName || '', 'solicitado']
                );
                return result.rows[0].id;
            }
            
            // Formato nuevo (objeto)
            const { 
                phoneNumber, 
                serviceType, 
                serviceName,
                specifications = '', 
                filePaths = '', 
                customerName = '',
                status = 'Solicitado'
            } = orderData;
            
            const result = await client.query(
                'INSERT INTO orders (phone_number, service_type, specifications, file_paths, customer_name, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [phoneNumber, serviceType, specifications, filePaths, customerName, status]
            );
            return { id: result.rows[0].id };
        } finally {
            client.release();
        }
    }

    // Obtener pedidos por número de teléfono
    static async getOrdersByPhone(phoneNumber) {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                'SELECT * FROM orders WHERE phone_number = $1 ORDER BY created_at DESC',
                [phoneNumber]
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Actualizar estado del pedido
    static async updateOrderStatus(orderId, status) {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [status, orderId]
            );
            return result.rowCount > 0;
        } finally {
            client.release();
        }
    }

    // Obtener todos los pedidos pendientes
    static async getPendingOrders() {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                'SELECT * FROM orders WHERE status = $1 ORDER BY created_at ASC',
                ['solicitado']
            );
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Obtener pedido por ID
    static async getOrderById(orderId) {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                'SELECT * FROM orders WHERE id = $1',
                [orderId]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    // Crear pedido con archivos subidos desde web
    static async createOrderWithFiles(orderData) {
        const client = await pool.connect();
        
        try {
            const { 
                phoneNumber, 
                serviceType = 'corte_laser',
                serviceName = 'Corte Láser',
                files = [], 
                specifications = {},
                status = 'Solicitado'
            } = orderData;

            // Convertir especificaciones a string
            const specsText = Object.entries(specifications)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');

            const result = await client.query(
                `INSERT INTO orders 
                (phone_number, service_type, specifications, status, uploaded_files, worker_review_status, created_at, updated_at) 
                VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
                RETURNING id`,
                [
                    phoneNumber, 
                    serviceType, 
                    specsText, 
                    status, 
                    JSON.stringify(files)
                ]
            );
            
            return { id: result.rows[0].id };
        } finally {
            client.release();
        }
    }

    // Actualizar estado de revisión del trabajador
    static async updateWorkerReview(orderId, reviewStatus, comment = '') {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                'UPDATE orders SET worker_review_status = $1, worker_comment = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                [reviewStatus, comment, orderId]
            );
            return result.rowCount > 0;
        } finally {
            client.release();
        }
    }
}

module.exports = OrderService;