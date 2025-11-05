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

    // Manejar mensajes entrantes de WhatsApp
    async handleIncomingMessage(req, res) {
        try {
            const { From, Body, MediaUrl0, MediaContentType0 } = req.body;
            const phoneNumber = From.replace('whatsapp:', '');
            const messageBody = Body ? Body.toLowerCase().trim() : '';

            console.log(`Mensaje de ${phoneNumber}: ${messageBody}`);
            console.log(`Media URL: ${MediaUrl0}`);
            console.log(`Media Type: ${MediaContentType0}`);

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

            // Enviar respuesta solo si no se envió archivo
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

Estoy aquí para ayudarte con tus pedidos de servicio.

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
            await ConversationService.updateConversationState(phoneNumber, 'awaiting_files', selectedService);
            
            if (selectedService === 'corte_laser') {
                // Enviar archivo DWG template
                const templatePath = path.join(__dirname, '../../templates/corte1.dwg');
                
                // Verificar si el archivo existe
                if (!fs.existsSync(templatePath)) {
                    return `📐 Perfecto, seleccionaste *Corte Láser*.

❌ *Error: Archivo plantilla no encontrado.*

Por favor, envía tu archivo DWG directamente y especifica:
- Material (acero, aluminio, etc.)
- Espesor en mm
- Dimensiones
- Cantidad de piezas

_Envía tu archivo y especificaciones cuando estés listo._`;
                }
                
                try {
                    // Primero enviar mensaje explicativo
                    await this.sendWhatsAppMessage(phoneNumber, `📐 Perfecto, seleccionaste *Corte Láser*.

Este es el formato base que usamos para los cortes.
Puedes editarlo según tus necesidades y enviarlo aquí cuando esté listo.

📎 *Te envío el archivo plantilla ahora...*`);
                    
                    // Pequeña pausa para que lleguen los mensajes en orden
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Luego enviar el archivo
                    await this.sendWhatsAppFile(phoneNumber, templatePath, `📁 *corte1.dwg* - Archivo plantilla para corte láser

✏️ *Instrucciones:*
1. Descarga este archivo
2. Ábrelo en AutoCAD o similar
3. Edita según tus necesidades
4. Guarda y envía el archivo modificado aquí

📝 También escribe tus especificaciones (material, espesor, etc.)`);
                    
                    // No retornar mensaje adicional porque ya se enviaron
                    return null;
                    
                } catch (error) {
                    console.error('Error enviando archivo DWG:', error);
                    return `📐 Perfecto, seleccionaste *Corte Láser*.

❌ *Error enviando archivo plantilla.* 

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

        if (mediaUrl) {
            // Aquí se descargaría y guardaría el archivo
            console.log(`Archivo recibido de ${phoneNumber}: ${mediaUrl} (${mediaContentType})`);
            
            // Guardar que recibimos archivo y continuar esperando especificaciones
            await ConversationService.updateConversationState(phoneNumber, 'awaiting_specifications');
            
            return `✅ *Archivo recibido correctamente!*

📝 Ahora por favor escribe tus especificaciones técnicas:
- Detalles del material
- Dimensiones específicas  
- Cualquier instrucción especial

_Escribe todas las especificaciones en un solo mensaje._`;
        }

        if (messageBody && messageBody.length > 10) {
            // Si no hay archivo pero hay texto suficiente, asumir que son las especificaciones
            await ConversationService.updateConversationState(phoneNumber, 'awaiting_confirmation');
            
            return `� *Recibimos tu información.*

A continuación te muestro un resumen de tu pedido:

🔸 *Servicio:* ${service.name}
🔸 *Archivo:* ${mediaUrl ? 'Archivo recibido' : 'Sin archivo'}
🔸 *Detalles:* ${messageBody}

¿Deseas confirmar el envío de este pedido?

✅ *Sí, confirmar pedido*
🔄 *No, quiero corregirlo*`;
        }

        return `⚠️ Por favor:
- Envía tu archivo (imagen, PDF, DWG, STL, etc.)
- Y escribe tus especificaciones técnicas

_También puedes enviar solo las especificaciones si ya enviaste el archivo._`;
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
✅ *"confirmar"* - Para procesar tu pedido
❌ *"cancelar"* - Para cancelar
🔄 *"menu"* - Para volver al menú principal`;
    }

    // Manejo de confirmación
    async handleConfirmation(phoneNumber, messageBody) {
        if (messageBody.toLowerCase().includes('sí') || messageBody.toLowerCase().includes('si') || messageBody.toLowerCase().includes('confirmar')) {
            const conversation = await ConversationService.getOrCreateConversation(phoneNumber);
            const service = this.services[conversation.selected_service];
            
            // Crear pedido en la base de datos con estado "solicitado"
            const orderId = await OrderService.createOrder(
                phoneNumber,
                conversation.selected_service,
                'Especificaciones y archivo recibidos',
                'archivos_recibidos',
                ''
            );

            // Reiniciar conversación
            await ConversationService.resetConversation(phoneNumber);

            return `🧾 *Perfecto, tu pedido ha sido registrado.*

📝 *Número de pedido:* #${orderId}
� *Servicio:* ${service.name}

Un trabajador de ESIAD revisará tu archivo y te confirmará si puede iniciarse el trabajo.

*Te avisaré aquí mismo cuando tengamos una respuesta.*

¡Gracias por confiar en *ESIAD Proyectos SAC*! 🙌`;
        }

        if (messageBody.toLowerCase().includes('no') || messageBody.toLowerCase().includes('corregir')) {
            await ConversationService.updateConversationState(phoneNumber, 'awaiting_files');
            return `🔁 *No hay problema.*

Por favor, vuelve a subir el archivo corregido y escribe tus nuevas especificaciones.

_Envía tu archivo y especificaciones cuando estés listo._`;
        }

        return `❓ *No entendí tu respuesta.*

¿Deseas confirmar el envío de este pedido?

✅ *Sí, confirmar pedido*
🔄 *No, quiero corregirlo*`;
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
}

module.exports = new ChatbotController();