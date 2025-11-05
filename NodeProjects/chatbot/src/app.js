require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database/database');
const chatbotController = require('./controllers/chatbotController');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar multer para upload de archivos
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generar nombre único con timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    // Permitir solo archivos DWG, DXF y PDF
    const allowedTypes = ['.dwg', '.dxf', '.pdf'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no soportado. Solo DWG, DXF y PDF.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB máximo
    }
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Servir archivos estáticos
app.use(express.static('public'));

// Servir archivos de templates para WhatsApp
app.use('/files', express.static('templates'));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Rutas
// Webhook para mensajes entrantes de WhatsApp
app.post('/webhook/whatsapp', (req, res) => {
    chatbotController.handleIncomingMessage(req, res);
});

// Webhook para estado de mensajes
app.post('/webhook/status', (req, res) => {
    chatbotController.handleMessageStatus(req, res);
});

// Ruta para formulario de corte láser
app.get('/pedido/corte-laser', (req, res) => {
    const token = req.query.token;
    if (!token) {
        return res.status(400).send('Token requerido');
    }
    res.sendFile(path.join(__dirname, '../public/pedido-corte-laser.html'));
});

// Endpoint para upload de archivos desde el formulario web
app.post('/api/upload-files', upload.array('files', 10), async (req, res) => {
    try {
        console.log('--- DEBUG UPLOAD ENDPOINT ---');
        console.log('Body:', req.body);
        console.log('Files:', req.files ? req.files.length : 0);
        
        const { token, specifications } = req.body;
        
        console.log('Token recibido:', token);
        
        if (!token) {
            console.log('ERROR: Token no proporcionado');
            return res.status(400).json({ error: 'Token requerido' });
        }

        if (!req.files || req.files.length === 0) {
            console.log('ERROR: No hay archivos');
            return res.status(400).json({ error: 'No se subieron archivos' });
        }

        const ConversationService = require('./services/conversationService');
        const OrderService = require('./services/orderService');

        console.log('Buscando conversación con token:', token);
        
        // Buscar conversación por token
        const conversation = await ConversationService.getConversationByToken(token);
        
        console.log('Conversación encontrada:', conversation);
        
        if (!conversation) {
            console.log('ERROR: Token inválido o expirado');
            return res.status(404).json({ error: 'Token inválido o expirado' });
        }

        // Preparar información de archivos
        const fileNames = req.files.map(file => file.filename);
        const specsObj = JSON.parse(specifications);

        // Crear pedido con archivos
        const order = await OrderService.createOrderWithFiles({
            phoneNumber: conversation.phone_number,
            serviceType: 'corte_laser',
            serviceName: 'Corte Láser',
            files: fileNames,
            specifications: specsObj,
            status: 'Solicitado'
        });

        // Actualizar estado de conversación
        await ConversationService.updateConversationState(
            conversation.phone_number, 
            'awaiting_review_response'
        );

        // Enviar notificación por WhatsApp
        await chatbotController.sendFileReceivedNotification(
            conversation.phone_number,
            {
                files: fileNames,
                specifications: Object.entries(specsObj).map(([key, value]) => `${key}: ${value}`).join(', ')
            }
        );

        res.json({ 
            success: true, 
            orderId: order.id,
            message: 'Archivos subidos exitosamente' 
        });

    } catch (error) {
        console.error('--- ERROR EN UPLOAD ENDPOINT ---');
        console.error('Error completo:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
});

// Endpoint para que el trabajador apruebe/rechace pedidos
app.post('/api/orders/:id/review', async (req, res) => {
    try {
        const { reviewStatus, comment } = req.body;
        const orderId = req.params.id;
        
        const OrderService = require('./services/orderService');
        
        // Actualizar estado de revisión
        await OrderService.updateWorkerReview(orderId, reviewStatus, comment);
        
        // Obtener datos del pedido para enviar notificación
        const order = await OrderService.getOrderById(orderId);
        
        if (order) {
            // Enviar notificación de aprobación/rechazo
            await chatbotController.sendReviewNotification(
                order.phone_number,
                orderId,
                reviewStatus,
                comment
            );
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error actualizando revisión:', error);
        res.status(500).json({ error: error.message });
    }
});

// API para que el trabajador actualice pedidos
app.get('/api/orders/pending', async (req, res) => {
    try {
        const OrderService = require('./services/orderService');
        const orders = await OrderService.getPendingOrders();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders/:id/update', async (req, res) => {
    try {
        const { status, comment, estimatedTime } = req.body;
        const orderId = req.params.id;
        
        const OrderService = require('./services/orderService');
        
        // Actualizar pedido
        await OrderService.updateOrderWithComment(orderId, status, comment, estimatedTime);
        
        // Obtener datos del pedido para enviar notificación
        const order = await OrderService.getOrderById(orderId);
        
        if (order) {
            // Enviar notificación al cliente
            const message = await chatbotController.generateStatusUpdateMessage(order, status, comment, estimatedTime);
            await chatbotController.sendWhatsAppMessage(order.phone_number, message);
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta de verificación para Twilio
app.get('/webhook/whatsapp', (req, res) => {
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === verifyToken) {
            console.log('Webhook verificado exitosamente');
            res.status(200).send(challenge);
        } else {
            res.status(403).send('Token de verificación incorrecto');
        }
    } else {
        res.status(400).send('Parámetros de verificación faltantes');
    }
});

// Ruta de salud del servidor
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'ESIAD WhatsApp Chatbot'
    });
});

// Ruta raíz
app.get('/', (req, res) => {
    res.json({
        message: 'ESIAD Proyectos SAC - WhatsApp Chatbot',
        version: '1.0.0',
        endpoints: {
            webhook: '/webhook/whatsapp',
            status: '/webhook/status',
            health: '/health',
            admin: '/admin.html'
        }
    });
});

// Ruta para el panel de administración
app.get('/admin', (req, res) => {
    res.redirect('/admin.html');
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString()
    });
});

// ======================================
// ENDPOINTS PARA PANEL DE ADMINISTRACIÓN
// ======================================

// Obtener todos los pedidos para el panel de admin
app.get('/api/admin/orders', async (req, res) => {
    try {
        console.log('--- API ADMIN ORDERS CALLED ---');
        
        const { Pool } = require('pg');
        const pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'pedidos',
            password: process.env.DB_PASSWORD || '12345',
            port: process.env.DB_PORT || 5432,
        });

        console.log('Ejecutando consulta a la base de datos...');

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

        console.log('Resultados obtenidos:', result.rows.length, 'pedidos');

        await pool.end();

        const response = {
            success: true,
            orders: result.rows
        };

        console.log('Enviando respuesta:', JSON.stringify(response, null, 2));

        res.json(response);

    } catch (error) {
        console.error('--- ERROR EN API ADMIN ORDERS ---');
        console.error('Error obteniendo pedidos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Descargar archivos de un pedido
app.get('/api/orders/:id/download', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { Pool } = require('pg');
        const pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'pedidos',
            password: process.env.DB_PASSWORD || '12345',
            port: process.env.DB_PORT || 5432,
        });

        const result = await pool.query('SELECT uploaded_files, file_paths FROM orders WHERE id = $1', [orderId]);
        await pool.end();

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const files = result.rows[0].uploaded_files || result.rows[0].file_paths || '';
        
        if (!files) {
            return res.status(404).json({ error: 'No hay archivos para descargar' });
        }

        // Por ahora, simplemente mostrar información de archivos
        // En un sistema real, aquí crearías un ZIP con los archivos
        res.json({
            success: true,
            message: 'Funcionalidad de descarga en desarrollo',
            files: files.split(',').map(f => f.trim()).filter(f => f)
        });

    } catch (error) {
        console.error('Error descargando archivos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Inicializar servidor
async function startServer() {
    try {
        // Inicializar base de datos
        await initDatabase();
        console.log('✅ Base de datos inicializada');

        // Verificar variables de entorno críticas
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            console.warn('⚠️  Variables de Twilio no configuradas. El envío de mensajes no funcionará.');
        }

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
            console.log(`📱 Webhook URL: http://localhost:${PORT}/webhook/whatsapp`);
            console.log(`🔍 Health check: http://localhost:${PORT}/health`);
            console.log(`📋 Estado: http://localhost:${PORT}/webhook/status`);
        });

    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

// Manejo de cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Cerrando servidor...');
    process.exit(0);
});

// Iniciar aplicación
startServer();

module.exports = app;