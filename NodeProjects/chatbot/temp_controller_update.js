// Actualización para handleServiceSelection - sección corte_laser

// REEMPLAZAR ESTA SECCIÓN:
/*
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
            
            }
*/

// POR ESTA NUEVA SECCIÓN:
if (selectedService === 'corte_laser') {
    // Generar token único para el formulario web
    const token = this.generateUniqueToken(phoneNumber, selectedService);
    const webFormUrl = `${process.env.WEBHOOK_URL.replace('/webhook/whatsapp', '')}/pedido/corte-laser?token=${token}`;
    
    // Actualizar conversación con token y URL
    await ConversationService.updateConversationState(phoneNumber, 'awaiting_web_upload', selectedService, {
        web_token: token,
        web_form_url: webFormUrl
    });
    
    return `🔥 *¡Perfecto! Seleccionaste Corte Láser*

Para enviar tu archivo DWG de forma segura, usa nuestro formulario web especializado:

🌐 *SUBIR ARCHIVOS DWG:*
${webFormUrl}

📋 *En el formulario podrás:*
✅ Subir archivos DWG/DXF (hasta 50MB)
✅ Especificar material y dimensiones
✅ Describir requerimientos técnicos
✅ Visualización de archivos en tiempo real

📱 *También puedes enviar aquí:*
• 📷 Imagen/captura del diseño DWG
• 📄 PDF del plano
• 📝 Descripción detallada por texto

⏱️ *El formulario web estará disponible por 2 horas*

¿Prefieres usar el formulario web o enviar por WhatsApp?`;

} else {
    await ConversationService.updateConversationState(phoneNumber, 'awaiting_files', selectedService);
}