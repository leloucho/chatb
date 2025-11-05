const twilio = require('twilio');
const ConversationService = require('../services/conversationService');
const OrderService = require('../services/orderService');
const path = require('path');
const fs = require('fs');

class ChatbotController {
    constructor() {
        this.services = {
            'corte_laser': {
                name: 'Corte Láser',
                description: 'Corte de precisión en diversos materiales',
                files_required: true,
                specifications: ['Material', 'Grosor', 'Dimensiones', 'Cantidad']
            },
            'ploteo': {
                name: 'Ploteo',
                description: 'Impresión y corte de vinilos',
                files_required: true,
                specifications: ['Tipo de vinilo', 'Dimensiones', 'Colores', 'Cantidad']
            },
            'impresion_3d': {
                name: 'Impresión 3D',
                description: 'Impresión de prototipos y piezas',
                files_required: true,
                specifications: ['Material', 'Resolución', 'Relleno', 'Cantidad']
            },
            'otros': {
                name: 'Otros Servicios',
                description: 'Servicios personalizados',
                files_required: false,
                specifications: ['Descripción detallada del servicio']
            }
        };
    }

    // Generar token único para formulario web
    generateUniqueToken(phoneNumber, serviceType) {
        return `${phoneNumber.replace('+', '')}_${serviceType}_${Date.now()}`;
    }

    // Manejar mensajes entrantes de WhatsApp
    async handleIncomingMessage(req, res) {
        try {
            const { From, Body, MediaUrl0, MediaContentType0, NumMedia } = req.body;
            const phoneNumber = From.replace('whatsapp:', '');
            const messageBody = Body ? Body.toLowerCase().trim() : '';

            console.log(`--- WEBHOOK COMPLETO ---`);
            console.log(`Mensaje de ${phoneNumber}: "${messageBody}"`);
            console.log(`NumMedia: ${NumMedia || '0'}`);
            console.log(`MediaUrl0: ${MediaUrl0 || 'No hay archivo'}`);
            console.log(`MediaContentType0: ${MediaContentType0 || 'No especificado'}`);
            console.log('Body completo del request:', JSON.stringify(req.body, null, 2));

            // Comando especial para resetear conversación (para pruebas)
            if (messageBody === 'reset' || messageBody === 'reiniciar') {
                await ConversationService.resetConversation(phoneNumber);
                await this.sendWhatsAppMessage(phoneNumber, '🔄 *Conversación reiniciada.*\n\nEscribe cualquier mensaje para comenzar de nuevo.');
                res.status(200).send('OK');
                return;
            }

            // Obtener o crear conversación
            const conversation = await ConversationService.getOrCreateConversation(phoneNumber);
            
            let responseMessage = '';

            switch (conversation.current_state) {
                case 'initial':
                    responseMessage = await this.handleInitialState(phoneNumber, messageBody);
                    break;
                
                case 'service_selection':
                    responseMessage = await this.handleServiceSelection(phoneNumber, messageBody);
                    break;
                
                case 'awaiting_files':
                    responseMessage = await this.handleFileUpload(phoneNumber, messageBody, MediaUrl0, MediaContentType0);
                    break;
                
                case 'awaiting_web_upload':
                    responseMessage = await this.handleWebUploadState(phoneNumber, messageBody);
                    break;
                
                case 'awaiting_review_response':
                    responseMessage = await this.handleReviewResponse(phoneNumber, messageBody);
                    break;
                
                case 'awaiting_specifications':
                    responseMessage = await this.handleSpecifications(phoneNumber, messageBody);
                    break;
                
                case 'awaiting_confirmation':
                    responseMessage = await this.handleConfirmation(phoneNumber, messageBody);
                    break;
                
                default:
                    responseMessage = await this.handleInitialState(phoneNumber, messageBody);
                    break;
            }

            // Enviar respuesta solo si hay mensaje
            if (responseMessage) {
                await this.sendWhatsAppMessage(phoneNumber, responseMessage);
            }
            res.status(200).send('OK');

        } catch (error) {
            console.error('Error procesando mensaje:', error);
            res.status(500).send('Error interno del servidor');
        }
    }

    // Estado inicial - Mostrar menú principal
    async handleInitialState(phoneNumber, messageBody) {
        await ConversationService.updateConversationState(phoneNumber, 'service_selection');
        
        return `👋 ¡Hola! Bienvenido a *ESIAD Proyectos SAC*.

Estoy aquí para ayudarte con tus pedidos.

Por favor, elige una de las siguientes opciones:

1️⃣ *Corte láser*
2️⃣ *Ploteo*  
3️⃣ *Impresión 3D*
4️⃣ *Otros*

_(Por favor, responde con el número de la opción que deseas.)_`;
    }

    // Manejo de selección de servicio
    async handleServiceSelection(phoneNumber, messageBody) {
        const serviceMap = {
            '1': 'corte_laser',
            '2': 'ploteo',
            '3': 'impresion_3d',
            '4': 'otros'
        };

        const selectedService = serviceMap[messageBody];

        if (selectedService) {
            if (selectedService === 'corte_laser') {
                // Verificar si ya existe un token válido para este número
                const existingConversation = await ConversationService.getOrCreateConversation(phoneNumber);
                let token, webFormUrl;
                
                if (existingConversation.web_token) {
                    // Usar token existente
                    token = existingConversation.web_token;
                    webFormUrl = existingConversation.web_form_url || `${process.env.WEBHOOK_URL.replace('/webhook/whatsapp', '')}/pedido/corte-laser?token=${token}`;
                    console.log(`🔄 Usando token existente: ${token}`);
                } else {
                    // Generar nuevo token solo si no existe
                    token = this.generateUniqueToken(phoneNumber, selectedService);
                    webFormUrl = `${process.env.WEBHOOK_URL.replace('/webhook/whatsapp', '')}/pedido/corte-laser?token=${token}`;
                    console.log(`🆕 Generando nuevo token: ${token}`);
                    
                    // Actualizar conversación con token y URL
                    await ConversationService.updateConversationState(phoneNumber, 'awaiting_web_upload', selectedService, {
                        web_token: token,
                        web_form_url: webFormUrl
                    });
                }
                
                return `🔥 *¡Perfecto! Seleccionaste Corte Láser*

Para enviar tu archivo DWG:

${webFormUrl}

_(Haz clic en el enlace para subir tu archivo)_`;
            
            } else {
                await ConversationService.updateConversationState(phoneNumber, 'awaiting_files', selectedService);
            }
            
            if (selectedService === 'corte_laser') {
                try {
                    // Enviar mensaje con instrucciones actualizadas
                    await this.sendWhatsAppMessage(phoneNumber, `📐 Perfecto, seleccionaste *Corte Láser*.

📎 *Descarga archivo plantilla (opcional):*
${process.env.WEBHOOK_URL.replace('/webhook/whatsapp', '')}/download.html

💡 *Para enviar tu diseño, puedes usar:*

📷 **Opción 1:** Envía una *imagen* (captura/foto) de tu diseño DWG
📄 **Opción 2:** Convierte tu DWG a *PDF* y envíalo
📝 **Opción 3:** Describe tu diseño *por texto* detalladamente

⚠️ *Nota:* WhatsApp no soporta archivos .dwg directamente

✏️ *También incluye estas especificaciones:*
- Material (acero, aluminio, etc.)
- Espesor en mm
- Dimensiones
- Cantidad de piezas`);
                    
                    return null;
                    
                } catch (error) {
                    console.error('Error enviando instrucciones:', error);
                    return `📐 Perfecto, seleccionaste *Corte Láser*.

Por favor, envía tu archivo DWG directamente y especifica:
- Material (acero, aluminio, etc.)
- Espesor en mm
- Dimensiones
- Cantidad de piezas

_Envía tu archivo y especificaciones cuando estés listo._`;
                }
            
            } else if (selectedService === 'ploteo') {
                return `🖨️ Perfecto, seleccionaste *Ploteo*.

Por favor, proporciona la siguiente información:

📏 *Tamaño requerido:*
- A0, A1, A2, A3, A4
- O dimensiones personalizadas

📎 *Envía tu archivo:*
- Formato PDF o DWG preferiblemente
- Resolución mínima 300 DPI

📝 *Especificaciones adicionales:*
- Tipo de material
- Colores específicos
- Cantidad de copias

_Envía toda la información y tu archivo cuando estés listo._`;
            
            } else if (selectedService === 'impresion_3d') {
                return `🏗️ Perfecto, seleccionaste *Impresión 3D*.

📎 *Envía tu archivo 3D:*
- Formato STL u OBJ
- Archivo optimizado para impresión

📝 *Especificaciones del material:*
- PLA, ABS, PETG, etc.
- Color preferido
- Resolución deseada (0.1mm, 0.2mm, 0.3mm)
- Relleno (10%, 20%, 50%, 100%)

_Envía tu archivo y especificaciones cuando estés listo._`;
            
            } else if (selectedService === 'otros') {
                await ConversationService.updateConversationState(phoneNumber, 'awaiting_specifications', selectedService);
                return `🔧 Perfecto, seleccionaste *Otros Servicios*.

📝 Por favor, describe detalladamente el servicio que necesitas:
- ¿Qué tipo de trabajo requieres?
- Materiales preferidos
- Dimensiones aproximadas
- Cualquier especificación importante

_Escribe toda la información en un solo mensaje._`;
            }
        }

        return `❌ Opción no válida. Por favor, responde con un número del 1 al 4:

1️⃣ Corte láser
2️⃣ Ploteo  
3️⃣ Impresión 3D
4️⃣ Otros`;
    }

    // Manejo de archivos
    async handleFileUpload(phoneNumber, messageBody, mediaUrl, mediaContentType) {
        const conversation = await ConversationService.getOrCreateConversation(phoneNumber);
        const service = this.services[conversation.selected_service];

        console.log(`--- PROCESANDO ARCHIVO ---`);
        console.log(`MediaUrl: ${mediaUrl || 'No hay archivo'}`);
        console.log(`MediaType: ${mediaContentType || 'No especificado'}`);
        console.log(`MessageBody: "${messageBody || 'Vacío'}"`);
        console.log(`Estado actual: ${conversation.current_state}`);
        console.log(`Servicio seleccionado: ${conversation.selected_service}`);

        // Si hay archivo adjunto (imágenes, PDFs, etc.)
        if (mediaUrl && mediaUrl.trim() !== '') {
            console.log(`✅ Archivo detectado: ${mediaUrl}`);
            
            // Archivo aceptado (imagen, PDF, etc.)
            console.log(`📁 Archivo procesado correctamente de ${phoneNumber}: ${mediaUrl}`);
            
            // Cambiar estado a esperando especificaciones
            await ConversationService.updateConversationState(phoneNumber, 'awaiting_specifications');
            
            return `✅ *Archivo recibido correctamente!*

📄 *Archivo:* ${mediaUrl.split('/').pop() || 'archivo'}

📝 *Ahora escribe tus especificaciones técnicas en un solo mensaje con este formato:*

**Material:** (acero, aluminio, madera, etc.)
**Espesor:** (en mm)
**Dimensiones:** (largo x ancho o descripción)
**Cantidad:** (número de piezas)

*Ejemplo:*
Material: Acero inoxidable
Espesor: 3mm
Dimensiones: 100x50mm
Cantidad: 5 piezas

_Escribe todas las especificaciones en un solo mensaje siguiendo este formato._`;
        }

        // Si no hay archivo pero hay texto (especificaciones)
        if (messageBody && messageBody.length > 20) {
            console.log(`📝 Especificaciones recibidas: ${messageBody}`);
            
            // Validar que las especificaciones contengan elementos clave
            const hasRequired = ['material', 'espesor', 'dimensiones', 'cantidad'].some(keyword => 
                messageBody.toLowerCase().includes(keyword)
            );

            if (!hasRequired) {
                return `📝 *Especificaciones incompletas*

Por favor, incluye la siguiente información en tu mensaje:

**Material:** (acero, aluminio, madera, etc.)
**Espesor:** (en mm)
**Dimensiones:** (largo x ancho)
**Cantidad:** (número de piezas)

*Escribe todo en un solo mensaje siguiendo este formato.*`;
            }
            
            // Especificaciones válidas, ir a confirmación
            await ConversationService.updateConversationState(phoneNumber, 'awaiting_confirmation');
            
            return `📄 *Recibimos tu archivo y tus especificaciones.*

A continuación te muestro un resumen de tu pedido:

🔸 *Servicio:* ${service.name}
🔸 *Archivo:* Archivo recibido
🔸 *Detalles:* ${messageBody}

¿Deseas confirmar el envío de este pedido?

✅ *Sí, confirmar pedido*
🔄 *No, quiero corregirlo*
❌ *Cancelar solicitud*`;
        }

        // Si no hay archivo ni especificaciones suficientes
        return `⚠️ *Por favor proporciona:*

📎 **Envía tu archivo de diseño** como:
   • 📷 *Imagen* (JPG, PNG) de tu diseño
   • 📄 *PDF* con el plano/diseño
   • 📝 *Descripción detallada* por texto

💡 *Nota:* WhatsApp no soporta archivos .dwg directamente. 
Puedes enviar una imagen/captura del diseño DWG o convertirlo a PDF.

_Para ${service.name}, necesitamos ver tu diseño de alguna forma._`;
    }

    // Manejo de especificaciones
    async handleSpecifications(phoneNumber, messageBody) {
        if (messageBody.length < 10) {
            return `📝 *Necesito más información.*

Por favor, proporciona más detalles sobre:
- Materiales
- Dimensiones
- Cantidad
- Cualquier especificación importante

_Mínimo 10 caracteres para procesar tu solicitud._`;
        }

        await ConversationService.updateConversationState(phoneNumber, 'awaiting_confirmation');
        const conversation = await ConversationService.getOrCreateConversation(phoneNumber);
        const service = this.services[conversation.selected_service];

        return `📋 *Resumen de tu solicitud:*

🔹 *Servicio:* ${service.name}
🔹 *Especificaciones:* ${messageBody}

¿Confirmas este pedido?

Responde:
*1* "confirmar" - Para procesar tu pedido
*2* "cancelar" - Para cancelar tu pedido
*3* "menu" - Para volver al menú principal`;
    }

    // Manejo de confirmación
    async handleConfirmation(phoneNumber, messageBody) {
        const lowerBody = messageBody.toLowerCase();
        
        // Opción 1: Confirmar pedido
        if (lowerBody.includes('1') || lowerBody.includes('confirmar') || 
            lowerBody.includes('sí') || lowerBody.includes('si')) {
            
            const conversation = await ConversationService.getOrCreateConversation(phoneNumber);
            const service = this.services[conversation.selected_service];
            
            // Crear pedido en la base de datos con estado "Solicitado"
            const order = await OrderService.createOrder({
                phoneNumber,
                serviceType: conversation.selected_service,
                serviceName: service.name,
                specifications: conversation.details || 'Sin especificaciones adicionales',
                status: 'Solicitado'
            });

            // Marcar conversación como completada
            await ConversationService.updateConversationState(phoneNumber, 'completed');

            return `🧾 *Perfecto, tu pedido ha sido registrado.*

� *Número de pedido:* #${order.id}
🔸 *Servicio:* ${service.name}

Un trabajador de ESIAD revisará tu archivo y te confirmará si puede iniciarse el trabajo.

Te avisaré aquí mismo cuando tengamos una respuesta.

_¡Gracias por confiar en ESIAD Proyectos SAC!_

---
_Escribe "reset" en cualquier momento para hacer una nueva consulta._`;
        }

        // Opción 2: Cancelar pedido
        if (lowerBody.includes('2') || lowerBody.includes('cancelar')) {
            
            // Cancelar solicitud completamente
            await ConversationService.updateConversationState(phoneNumber, 'cancelled');
            
            const conversation = await ConversationService.getOrCreateConversation(phoneNumber);
            const service = this.services[conversation.selected_service];
            
            return `� *Perfecto, vamos a corregir tu pedido.*

📐 ${service.name}

📎 *Descarga tu archivo plantilla:*
${this.ngrokUrl}/download.html

✏️ *Instrucciones:*
1. Haz clic en el enlace de arriba
2. Descarga el archivo corte1.dwg
3. Ábrelo en AutoCAD o similar  
4. Edita según tus necesidades
5. Guarda y envía el archivo modificado aquí

_Envía tu archivo .dwg cuando esté listo._`;
        }
        
        if (lowerBody.includes('cancelar') || lowerBody.includes('❌')) {
            // Cancelar solicitud completamente
            await ConversationService.updateConversationState(phoneNumber, 'cancelled');
            
            return `❌ *Solicitud cancelada*

Tu pedido ha sido cancelado. No se ha registrado ninguna información.

---
_Escribe "reset" cuando quieras hacer una nueva consulta._

¡Estaremos aquí cuando nos necesites! 😊`;
        }

        return `❓ *No entendí tu respuesta.*

Por favor elige una de estas opciones:

*1* "confirmar" - Para procesar tu pedido
*2* "cancelar" - Para cancelar tu pedido
*3* "menu" - Para volver al menú principal

_Escribe el número de tu elección._`;
    }

    // Enviar mensaje de WhatsApp
    sendWhatsAppMessage(to, message) {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        return client.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${to}`,
            body: message
        }).then(message => {
            console.log(`Mensaje enviado a ${to}: ${message.sid}`);
        }).catch(error => {
            console.error('Error enviando mensaje:', error);
        });
    }

    // Enviar archivo de WhatsApp
    async sendWhatsAppFile(to, filePath, caption = '') {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        try {
            // Crear URL pública para el archivo
            const fileUrl = `${process.env.WEBHOOK_URL.replace('/webhook/whatsapp', '')}/files/${path.basename(filePath)}`;
            
            const message = await client.messages.create({
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                to: `whatsapp:${to}`,
                body: caption,
                mediaUrl: [fileUrl]
            });
            
            console.log(`Archivo enviado a ${to}: ${message.sid}`);
            return message;
        } catch (error) {
            console.error('Error enviando archivo:', error);
            throw error;
        }
    }

    // Webhook para estado de mensajes
    handleMessageStatus(req, res) {
        console.log('Estado del mensaje:', req.body);
        res.status(200).send('OK');
    }

    // Generar mensaje de actualización de estado
    async generateStatusUpdateMessage(order, status, comment, estimatedTime) {
        const serviceNames = {
            'corte_laser': 'Corte Láser',
            'ploteo': 'Ploteo',
            'impresion_3d': 'Impresión 3D',
            'otros': 'Otros Servicios'
        };

        const serviceName = serviceNames[order.service_type] || order.service_type;

        switch (status) {
            case 'rechazado':
                return `❌ *Tu pedido ha sido revisado y fue rechazado* por el motivo siguiente:

"${comment}"

Por favor, revisa tu archivo, corrige los detalles y vuelve a subirlo.

_Puedes enviar un nuevo archivo cuando tengas las correcciones listas._`;

            case 'aceptado':
                return `✅ *Tu pedido ha sido aceptado.*

📝 *Pedido #${order.id}*
🔸 *Servicio:* ${serviceName}
⏰ *Tiempo estimado de elaboración:* ${estimatedTime}

🔧 *Estado actual:* En elaboración.`;

            case 'iniciado':
                return `🛠️ *Tu pedido está en proceso de elaboración.*

📝 *Pedido #${order.id}*
🔸 *Servicio:* ${serviceName}

El trabajo ha comenzado y está en progreso.`;

            case 'completado':
                return `✅ *Tu pedido está listo para recoger.*

📝 *Pedido #${order.id}*
🔸 *Servicio:* ${serviceName}

💰 Puedes hacer el pago mediante:
• Yape o transferencia al número *999 999 999*, o
• Pago en efectivo al momento de la entrega.

*Por favor, envía aquí una captura del comprobante de pago.*`;

            default:
                return `📋 *Actualización de tu pedido #${order.id}*

🔸 *Estado:* ${status}
${comment ? `💬 *Comentario:* ${comment}` : ''}`;
        }
    }

    // Estado: awaiting_web_upload - Usuario debe usar formulario web o enviar por WhatsApp
    async handleWebUploadState(phoneNumber, messageBody) {
        const lowerBody = messageBody.toLowerCase();
        
        if (lowerBody.includes('web') || lowerBody.includes('formulario')) {
            return `🌐 *Perfecto, usarás el formulario web.*

El enlace ya te fue enviado anteriormente. Si lo perdiste, escribe "enlace" y te lo enviaré nuevamente.

⏱️ *Recuerda:* El formulario estará disponible por 2 horas desde que se generó.

Una vez subas tu archivo, recibirás confirmación aquí en WhatsApp.`;
        
        } else if (lowerBody.includes('whatsapp') || lowerBody.includes('aqui')) {
            // Cambiar a flujo tradicional de WhatsApp
            await ConversationService.updateConversationState(phoneNumber, 'awaiting_files');
            
            return `📱 *Perfecto, enviarás por WhatsApp.*

💡 *Para enviar tu diseño, puedes usar:*

📷 **Opción 1:** Envía una *imagen* (captura/foto) de tu diseño DWG
📄 **Opción 2:** Convierte tu DWG a *PDF* y envíalo
📝 **Opción 3:** Describe tu diseño *por texto* detalladamente

⚠️ *Nota:* WhatsApp no soporta archivos .dwg directamente

✏️ *También incluye estas especificaciones:*
- Material (acero, aluminio, etc.)
- Espesor en mm
- Dimensiones
- Cantidad de piezas

_Envía tu archivo y especificaciones cuando estés listo._`;
        
        } else if (lowerBody.includes('enlace') || lowerBody.includes('link')) {
            const conversation = await ConversationService.getOrCreateConversation(phoneNumber);
            const additionalData = conversation.additional_data ? JSON.parse(conversation.additional_data) : {};
            
            if (additionalData.web_form_url) {
                return `🌐 *Aquí tienes tu enlace del formulario:*

${additionalData.web_form_url}

⏱️ *Válido por 2 horas desde su creación*`;
            } else {
                return `❌ *El enlace ha expirado.*

Escribe "reset" para generar un nuevo formulario.`;
            }
        
        } else {
            // Si envía archivo por WhatsApp directamente
            return await this.handleFileUpload(phoneNumber, messageBody, null, null);
        }
    }

    // Estado: awaiting_review_response - El trabajador revisó el archivo desde web
    async handleReviewResponse(phoneNumber, messageBody) {
        return `📋 *Tu archivo ha sido revisado.*

Te hemos enviado una notificación con el resultado de la revisión.

Para hacer un nuevo pedido, escribe "reset" y comenzaremos de nuevo.

_¡Gracias por usar ESIAD Proyectos SAC!_`;
    }

    // Notificar cuando se recibe un archivo desde el formulario web
    async sendFileReceivedNotification(phoneNumber, orderData) {
        const message = `✅ *¡Archivo recibido correctamente desde el formulario web!*

📁 *Archivos subidos:* ${orderData.files?.length || 0} archivo(s)
📝 *Especificaciones:* ${orderData.specifications || 'Sin especificaciones'}

🔍 *Estado:* En revisión por nuestro equipo técnico

Te notificaremos aquí cuando tengamos una respuesta sobre la viabilidad de tu proyecto.

_¡Gracias por usar nuestro formulario web!_`;

        await this.sendWhatsAppMessage(phoneNumber, message);
        await ConversationService.updateConversationState(phoneNumber, 'awaiting_review_response');
    }

    // Notificar resultado de revisión técnica
    async sendReviewNotification(phoneNumber, review) {
        let message = '';
        
        if (review.status === 'aprobado') {
            message = `✅ *¡Tu proyecto ha sido aprobado!*

📝 *Pedido #${review.orderId}*
💰 *Costo estimado:* S/ ${review.estimatedCost || 'Por confirmar'}
⏱️ *Tiempo estimado:* ${review.estimatedTime || 'Por confirmar'}

💬 *Comentarios del técnico:*
"${review.comments || 'Proyecto viable sin observaciones'}"

🚀 *¿Deseas proceder con el pedido?*

Responde:
*1* "confirmar" - Para iniciar el trabajo
*2* "consultar" - Para hacer preguntas
*3* "cancelar" - Para cancelar el pedido`;
        
        } else {
            message = `❌ *Tu proyecto necesita correcciones*

📝 *Pedido #${review.orderId}*

💬 *Observaciones del técnico:*
"${review.comments || 'Revisar especificaciones técnicas'}"

🔧 *Sugerencias:*
${review.suggestions || '• Revisar dimensiones\n• Verificar materiales\n• Ajustar especificaciones'}

🌐 *¿Quieres corregir tu archivo?*

Responde:
*1* "corregir" - Para enviar archivo corregido  
*2* "consultar" - Para hablar con un técnico
*3* "cancelar" - Para cancelar el pedido`;
        }

        await this.sendWhatsAppMessage(phoneNumber, message);
        await ConversationService.updateConversationState(phoneNumber, 'awaiting_confirmation');
    }
}

module.exports = new ChatbotController();