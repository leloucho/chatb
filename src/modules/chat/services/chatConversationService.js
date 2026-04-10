const ConversationService = require('../../../services/conversationService');
const OrderService = require('../../../services/orderService');
const CustomerService = require('../../../services/customerService');
const chatMessagingService = require('./chatMessagingService');

class ChatConversationService {
    constructor() {
        this.services = {
            corte_laser: {
                name: 'Corte Láser',
                description: 'Corte de precisión en diversos materiales',
                files_required: true,
                specifications: ['Material', 'Grosor', 'Dimensiones', 'Cantidad']
            },
            ploteo: {
                name: 'Ploteo',
                description: 'Impresión y corte de vinilos',
                files_required: true,
                specifications: ['Tipo de vinilo', 'Dimensiones', 'Colores', 'Cantidad']
            },
            impresion_3d: {
                name: 'Impresión 3D',
                description: 'Impresión de prototipos y piezas',
                files_required: true,
                specifications: ['Material', 'Resolución', 'Relleno', 'Cantidad']
            },
            otros: {
                name: 'Otros Servicios',
                description: 'Servicios personalizados',
                files_required: false,
                specifications: ['Descripción detallada del servicio']
            }
        };

        // Se conserva sin definir para no alterar el comportamiento actual del flujo de cancelación.
        this.ngrokUrl = undefined;
    }

    generateUniqueToken(phoneNumber, serviceType) {
        return `${phoneNumber.replace('+', '')}_${serviceType}_${Date.now()}`;
    }

    getTokenTtlMinutes() {
        const ttl = Number(process.env.WEB_TOKEN_TTL_MINUTES || 120);
        if (!Number.isFinite(ttl) || ttl < 5) {
            return 120;
        }
        return ttl;
    }

    buildTokenExpiryDate() {
        return new Date(Date.now() + this.getTokenTtlMinutes() * 60 * 1000);
    }

    isTokenExpired(expiresAt) {
        if (!expiresAt) {
            return false;
        }

        const parsed = new Date(expiresAt);
        if (!Number.isFinite(parsed.getTime())) {
            return false;
        }

        return parsed.getTime() < Date.now();
    }

    sendWhatsAppMessage(to, message) {
        return chatMessagingService.sendWhatsAppMessage(to, message);
    }

    sendWhatsAppFile(to, filePath, caption = '') {
        return chatMessagingService.sendWhatsAppFile(to, filePath, caption);
    }

    async generateStatusUpdateMessage(order, status, comment, estimatedTime) {
        return chatMessagingService.generateStatusUpdateMessage(order, status, comment, estimatedTime);
    }

    async sendFileReceivedNotification(phoneNumber, orderData) {
        return chatMessagingService.sendFileReceivedNotification(phoneNumber, orderData);
    }

    async sendReviewNotification(phoneNumber, review) {
        return chatMessagingService.sendReviewNotification(phoneNumber, review);
    }

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

            if (messageBody === 'reset' || messageBody === 'reiniciar') {
                await ConversationService.resetConversation(phoneNumber);
                await this.sendWhatsAppMessage(phoneNumber, '🔄 *Conversación reiniciada.*\n\nEscribe cualquier mensaje para comenzar de nuevo.');
                res.status(200).send('OK');
                return;
            }

            const conversation = await ConversationService.getOrCreateConversation(phoneNumber);
            let responseMessage = '';

            switch (conversation.current_state) {
                case 'initial':
                    responseMessage = await this.handleInitialState(phoneNumber, messageBody);
                    break;
                case 'awaiting_dni':
                    responseMessage = await this.handleDniState(phoneNumber, messageBody);
                    break;
                case 'awaiting_dni_confirmation':
                    responseMessage = await this.handleDniConfirmationState(phoneNumber, messageBody);
                    break;
                case 'awaiting_web_registration':
                    responseMessage = await this.handleWebRegistrationState(messageBody);
                    break;
                case 'awaiting_web_auth':
                    responseMessage = await this.handleWebAuthState(messageBody);
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

            if (responseMessage) {
                await this.sendWhatsAppMessage(phoneNumber, responseMessage);
            }

            res.status(200).send('OK');
        } catch (error) {
            console.error('Error procesando mensaje:', error);
            res.status(500).send('Error interno del servidor');
        }
    }

    handleMessageStatus(req, res) {
        console.log('Estado del mensaje:', req.body);
        res.status(200).send('OK');
    }

    async handleInitialState(phoneNumber, messageBody) {
        const conversation = await ConversationService.getOrCreateConversation(phoneNumber);
        const possibleDni = (messageBody || '').replace(/\D/g, '');

        if (conversation.customer_dni) {
            await ConversationService.updateConversationState(phoneNumber, 'awaiting_dni_confirmation');
            return `👋 ¡Hola de nuevo! Bienvenido a *ESIAD Proyectos SAC*.

¿Deseas continuar con tu DNI registrado *${conversation.customer_dni}*?

Responde:
*1* Sí
*2* No, ingresar otro DNI`;
        }

        if (/^\d{8}$/.test(possibleDni)) {
            return this.handleDniState(phoneNumber, possibleDni);
        }

        await ConversationService.updateConversationState(phoneNumber, 'awaiting_dni');
        return `👋 ¡Hola! Bienvenido a *ESIAD Proyectos SAC*.

Antes de continuar, envíame tu *DNI (8 dígitos)* para registrar tu pedido.`;
    }

    async handleDniState(phoneNumber, messageBody) {
        const dni = (messageBody || '').replace(/\D/g, '');

        if (!/^\d{8}$/.test(dni)) {
            return '❌ DNI inválido. Por favor, envía un DNI de 8 dígitos (solo números).';
        }

        const customer = await CustomerService.upsertByDni({ dni, phoneNumber });
        return this.buildAccessStepMessage(phoneNumber, dni, customer);
    }

    async handleDniConfirmationState(phoneNumber, messageBody) {
        const normalized = (messageBody || '').toLowerCase().trim();

        if (normalized === '1' || normalized === 'si' || normalized === 'sí') {
            const conversation = await ConversationService.getOrCreateConversation(phoneNumber);
            const dni = conversation.customer_dni;

            if (!dni) {
                await ConversationService.updateConversationState(phoneNumber, 'awaiting_dni');
                return 'No encontré un DNI asociado. Envíame tu DNI (8 dígitos) para continuar.';
            }

            const customer = await CustomerService.getByDni(dni);
            return this.buildAccessStepMessage(phoneNumber, dni, customer);
        }

        if (normalized === '2' || normalized.includes('no')) {
            await ConversationService.updateConversationState(phoneNumber, 'awaiting_dni', null, {
                customer_dni: null
            });
            return 'Perfecto. Envíame el nuevo DNI (8 dígitos) para continuar.';
        }

        return 'Responde *1* para usar el DNI registrado o *2* para ingresar otro DNI.';
    }

    async buildAccessStepMessage(phoneNumber, dni, customer) {
        const publicBase = this.getPublicBaseUrl();
        const accessToken = this.generateUniqueToken(phoneNumber, 'customer_access');
        const expiresAt = this.buildTokenExpiryDate();
        const ttlMinutes = this.getTokenTtlMinutes();

        await ConversationService.updateConversationState(
            phoneNumber,
            customer?.name ? 'awaiting_web_auth' : 'awaiting_web_registration',
            'corte_laser',
            {
                customer_dni: dni,
                web_token: accessToken,
                web_token_expires_at: expiresAt,
                web_form_url: `${publicBase}/pedido/corte-laser?token=${accessToken}`
            }
        );

        if (customer?.name) {
            return `✅ DNI ${dni} validado.

Hola ${customer.name}, para continuar con tu pedido ingresa aquí:

${publicBase}/cliente/autenticacion?token=${accessToken}

Este enlace vence en ${ttlMinutes} minutos.

Cuando termines, se abrirá el formulario del pedido.`;
        }

        return `✅ DNI ${dni} validado.

Es tu primera vez. Regístrate aquí para continuar:

${publicBase}/cliente/registro?token=${accessToken}

Este enlace vence en ${ttlMinutes} minutos.

Al finalizar, se abrirá automáticamente el formulario del pedido.`;
    }

    handleWebRegistrationState(messageBody) {
        const lowerBody = (messageBody || '').toLowerCase();

        if (lowerBody.includes('ya') || lowerBody.includes('listo') || lowerBody.includes('ok')) {
            return 'Perfecto. Si ya te registraste, vuelve al enlace que te envié y continúa con tu pedido.';
        }

        return 'Para continuar de forma segura, completa primero tu registro en el enlace que te envié.';
    }

    handleWebAuthState(messageBody) {
        const lowerBody = (messageBody || '').toLowerCase();

        if (lowerBody.includes('ya') || lowerBody.includes('listo') || lowerBody.includes('ok')) {
            return 'Perfecto. Si ya te autenticaste, se abrirá el formulario para completar tu pedido.';
        }

        return 'Para continuar, usa el enlace de autenticación que te envié.';
    }

    getPublicBaseUrl() {
        const webhookUrl = process.env.WEBHOOK_URL || '';

        if (webhookUrl.includes('/webhook/whatsapp')) {
            return webhookUrl.replace('/webhook/whatsapp', '');
        }

        return `http://localhost:${process.env.PORT || 3000}`;
    }

    buildServiceMenuMessage() {
        return `Estoy aquí para ayudarte con tus pedidos.

Por favor, elige una de las siguientes opciones:

1️⃣ *Corte láser*
2️⃣ *Ploteo*  
3️⃣ *Impresión 3D*
4️⃣ *Otros*

_(Por favor, responde con el número de la opción que deseas.)_`;
    }

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
                const existingConversation = await ConversationService.getOrCreateConversation(phoneNumber);
                let token, webFormUrl, expiresAt;

                if (existingConversation.web_token && !this.isTokenExpired(existingConversation.web_token_expires_at)) {
                    token = existingConversation.web_token;
                    webFormUrl = existingConversation.web_form_url || `${process.env.WEBHOOK_URL.replace('/webhook/whatsapp', '')}/pedido/corte-laser?token=${token}`;
                    expiresAt = existingConversation.web_token_expires_at;
                    console.log(`🔄 Usando token existente: ${token}`);
                } else {
                    token = this.generateUniqueToken(phoneNumber, selectedService);
                    webFormUrl = `${process.env.WEBHOOK_URL.replace('/webhook/whatsapp', '')}/pedido/corte-laser?token=${token}`;
                    expiresAt = this.buildTokenExpiryDate();
                    console.log(`🆕 Generando nuevo token: ${token}`);

                    await ConversationService.updateConversationState(phoneNumber, 'awaiting_web_upload', selectedService, {
                        web_token: token,
                        web_token_expires_at: expiresAt,
                        web_form_url: webFormUrl
                    });
                }

                const ttlMinutes = this.getTokenTtlMinutes();

                return `🔥 *¡Perfecto! Seleccionaste Corte Láser*

Para enviar tu archivo DWG:

${webFormUrl}

⏱️ _Este enlace es temporal y vence en ${ttlMinutes} minutos._

_(Haz clic en el enlace para subir tu archivo)_`;
            } else {
                await ConversationService.updateConversationState(phoneNumber, 'awaiting_files', selectedService);
            }

            if (selectedService === 'corte_laser') {
                try {
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

    async handleFileUpload(phoneNumber, messageBody, mediaUrl, mediaContentType) {
        const conversation = await ConversationService.getOrCreateConversation(phoneNumber);
        const service = this.services[conversation.selected_service];

        console.log(`--- PROCESANDO ARCHIVO ---`);
        console.log(`MediaUrl: ${mediaUrl || 'No hay archivo'}`);
        console.log(`MediaType: ${mediaContentType || 'No especificado'}`);
        console.log(`MessageBody: "${messageBody || 'Vacío'}"`);
        console.log(`Estado actual: ${conversation.current_state}`);
        console.log(`Servicio seleccionado: ${conversation.selected_service}`);

        if (mediaUrl && mediaUrl.trim() !== '') {
            console.log(`✅ Archivo detectado: ${mediaUrl}`);
            console.log(`📁 Archivo procesado correctamente de ${phoneNumber}: ${mediaUrl}`);

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

        if (messageBody && messageBody.length > 20) {
            console.log(`📝 Especificaciones recibidas: ${messageBody}`);

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

        return `⚠️ *Por favor proporciona:*

📎 **Envía tu archivo de diseño** como:
   • 📷 *Imagen* (JPG, PNG) de tu diseño
   • 📄 *PDF* con el plano/diseño
   • 📝 *Descripción detallada* por texto

💡 *Nota:* WhatsApp no soporta archivos .dwg directamente. 
Puedes enviar una imagen/captura del diseño DWG o convertirlo a PDF.

_Para ${service.name}, necesitamos ver tu diseño de alguna forma._`;
    }

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

    async handleConfirmation(phoneNumber, messageBody) {
        const lowerBody = messageBody.toLowerCase();

        if (lowerBody.includes('1') || lowerBody.includes('confirmar') ||
            lowerBody.includes('sí') || lowerBody.includes('si')) {

            const conversation = await ConversationService.getOrCreateConversation(phoneNumber);
            const service = this.services[conversation.selected_service];

            const order = await OrderService.createOrder({
                phoneNumber,
                customerDni: conversation.customer_dni || null,
                serviceType: conversation.selected_service,
                serviceName: service.name,
                specifications: conversation.details || 'Sin especificaciones adicionales',
                status: 'Solicitado'
            });

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

        if (lowerBody.includes('2') || lowerBody.includes('cancelar')) {
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

    async handleWebUploadState(phoneNumber, messageBody) {
        const lowerBody = messageBody.toLowerCase();

        if (lowerBody.includes('web') || lowerBody.includes('formulario')) {
            return `🌐 *Perfecto, usarás el formulario web.*

El enlace ya te fue enviado anteriormente. Si lo perdiste, escribe "enlace" y te lo enviaré nuevamente.

⏱️ *Recuerda:* El formulario estará disponible por 2 horas desde que se generó.

Una vez subas tu archivo, recibirás confirmación aquí en WhatsApp.`;
        } else if (lowerBody.includes('whatsapp') || lowerBody.includes('aqui')) {
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
            return await this.handleFileUpload(phoneNumber, messageBody, null, null);
        }
    }

    async handleReviewResponse(phoneNumber, messageBody) {
        return `📋 *Tu archivo ha sido revisado.*

Te hemos enviado una notificación con el resultado de la revisión.

Para hacer un nuevo pedido, escribe "reset" y comenzaremos de nuevo.

_¡Gracias por usar ESIAD Proyectos SAC!_`;
    }
}

module.exports = new ChatConversationService();
