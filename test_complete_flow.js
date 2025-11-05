const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuración de la base de datos
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'pedidos',
    password: '12345',
    port: 5432,
});

// Crear archivo de prueba DWG simulado
function createTestFile() {
    const testContent = `
AutoCAD DWG File - Test File
This is a simulation of a DWG file for testing purposes
Version: 2021
Created: ${new Date().toISOString()}
Drawing Units: Millimeters
Length: 100mm
Width: 50mm
Height: 20mm
Material: Acero inoxidable 304
`;
    
    const filePath = path.join(__dirname, 'test_design.dwg');
    fs.writeFileSync(filePath, testContent);
    console.log(`✅ Archivo de prueba creado: ${filePath}`);
    return filePath;
}

// Simular conversación completa con token real
async function testCompleteWebFlow() {
    try {
        console.log('🧪 PROBANDO FLUJO COMPLETO WEB + WHATSAPP\n');
        
        const testPhone = '+51987654321';
        
        // 1. Simular selección de corte láser para generar token
        console.log('1️⃣ Simulando selección de corte láser...');
        
        const webhookData = {
            From: `whatsapp:${testPhone}`,
            To: 'whatsapp:+14155238886',
            Body: '1',
            NumMedia: '0'
        };

        await axios.post('http://localhost:3000/webhook/whatsapp', webhookData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        console.log('2️⃣ Esperando 2 segundos para que se procese...');
        await sleep(2000);
        
        // 3. Obtener el token real de la base de datos
        console.log('3️⃣ Obteniendo token de la base de datos...');
        
        const client = await pool.connect();
        const result = await client.query(
            'SELECT web_token FROM conversations WHERE phone_number = $1 ORDER BY updated_at DESC LIMIT 1',
            [testPhone]
        );
        client.release();
        
        if (result.rows.length === 0 || !result.rows[0].web_token) {
            console.log('❌ No se encontró token en la base de datos. El flujo no se completó correctamente.');
            return;
        }
        
        const realToken = result.rows[0].web_token;
        console.log(`✅ Token obtenido: ${realToken}`);
        
        // 4. Crear archivo de prueba
        console.log('4️⃣ Creando archivo de prueba...');
        const testFilePath = createTestFile();
        
        // 5. Preparar FormData para la subida
        console.log('5️⃣ Preparando archivo para subida...');
        
        const form = new FormData();
        form.append('files', fs.createReadStream(testFilePath));
        form.append('token', realToken);
        form.append('material', 'Acero inoxidable 304');
        form.append('espesor', '3mm');
        form.append('dimensiones', '100x50x20mm');
        form.append('cantidad', '5 piezas');
        form.append('comentarios', 'Prueba completa de subida de archivo DWG desde script de testing. Incluye especificaciones técnicas completas.');
        
        console.log('6️⃣ Subiendo archivo al endpoint...');
        
        const response = await axios.post('http://localhost:3000/api/upload-files', form, {
            headers: {
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        
        console.log('✅ Respuesta del servidor:', response.data);
        console.log(`📁 Archivo subido exitosamente con ID de orden: ${response.data.orderId}`);
        
        // 7. Limpiar archivo de prueba
        fs.unlinkSync(testFilePath);
        console.log('🗑️ Archivo de prueba eliminado');
        
        console.log('\n🎯 PRUEBA COMPLETADA EXITOSAMENTE!');
        console.log('👀 Revisa el panel admin para ver el pedido: http://localhost:3000/admin.html');
        console.log('📱 El cliente debería haber recibido notificación por WhatsApp');
        
    } catch (error) {
        console.error('❌ Error en la prueba completa:', error.response?.data || error.message);
    } finally {
        await pool.end();
    }
}

// Función auxiliar para esperar
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Ejecutar si se llama directamente
if (require.main === module) {
    testCompleteWebFlow().catch(console.error);
}

module.exports = { testCompleteWebFlow };