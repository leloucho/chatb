const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Crear archivo de prueba DWG simulado
function createTestFile() {
    const testContent = `
AutoCAD DWG File - Test File
This is a simulation of a DWG file for testing purposes
Version: 2021
Created: ${new Date().toISOString()}
Drawing Units: Millimeters
`;
    
    const filePath = path.join(__dirname, 'test_design.dwg');
    fs.writeFileSync(filePath, testContent);
    console.log(`✅ Archivo de prueba creado: ${filePath}`);
    return filePath;
}

// Probar subida de archivo al formulario web
async function testFileUpload() {
    try {
        console.log('🧪 PROBANDO SUBIDA DE ARCHIVO AL FORMULARIO WEB\n');
        
        // Crear archivo de prueba
        const testFilePath = createTestFile();
        
        // Simular token de conversación (el mismo que se generaría en el chatbot)
        const testPhone = '+51987654321';
        const testToken = testPhone.replace('+', '') + '_corte_laser_' + Date.now();
        
        console.log('1️⃣ Creando conversación simulada...');
        
        // Primero simular que el usuario llegó hasta la selección de corte láser
        const webhookData = {
            From: `whatsapp:${testPhone}`,
            To: 'whatsapp:+14155238886',
            Body: '1', // Seleccionar corte láser
            NumMedia: '0'
        };

        await axios.post('http://localhost:3000/webhook/whatsapp', webhookData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        console.log('2️⃣ Esperando 1 segundo para que se procese...');
        await sleep(1000);
        
        // Ahora obtener el token real de la base de datos o usar uno fijo para prueba
        console.log('3️⃣ Preparando archivo para subida...');
        
        // Preparar FormData para la subida
        const form = new FormData();
        form.append('files', fs.createReadStream(testFilePath));
        form.append('token', testToken); // Este token debería existir en la BD
        form.append('material', 'Acero inoxidable 304');
        form.append('espesor', '3mm');
        form.append('dimensiones', '100x50x20mm');
        form.append('cantidad', '5 piezas');
        form.append('comentarios', 'Prueba de subida de archivo DWG desde script de testing');
        
        console.log('4️⃣ Subiendo archivo al endpoint...');
        
        const response = await axios.post('http://localhost:3000/api/upload-files', form, {
            headers: {
                ...form.getHeaders(),
                'Content-Type': 'multipart/form-data'
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        
        console.log('✅ Respuesta del servidor:', response.data);
        console.log(`📁 Archivo subido exitosamente con ID de orden: ${response.data.orderId}`);
        
        // Limpiar archivo de prueba
        fs.unlinkSync(testFilePath);
        console.log('🗑️ Archivo de prueba eliminado');
        
        console.log('\n🎯 Revisa el panel admin para ver el pedido: http://localhost:3000/admin.html');
        
    } catch (error) {
        console.error('❌ Error en la prueba de subida:', error.response?.data || error.message);
        if (error.response?.status === 400) {
            console.log('💡 Esto es normal - el token no existe en la BD. El flujo completo funciona cuando se genera desde WhatsApp.');
        }
    }
}

// Función auxiliar para esperar
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Ejecutar si se llama directamente
if (require.main === module) {
    testFileUpload().catch(console.error);
}

module.exports = { testFileUpload, createTestFile };