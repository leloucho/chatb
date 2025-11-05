# 🤖 FLUJO CHATBOT ESIAD PROYECTOS SAC - VERSIÓN FINALIZADA

## 📋 **ESTADO ACTUAL - NOVIEMBRE 2025**

---

## 🚀 **INICIO DEL FLUJO**

### **Comando Reset**
```
Usuario: "reset" / "reiniciar"
↓
🔄 Conversación reiniciada.
Escribe cualquier mensaje para comenzar de nuevo.
```

### **Saludo Inicial**
```
Usuario: "hola" / cualquier mensaje
↓
👋 ¡Hola! Bienvenido a ESIAD Proyectos SAC.

Estoy aquí para ayudarte con tus pedidos de servicio.

Por favor, elige una de las siguientes opciones:

1️⃣ Corte láser
2️⃣ Ploteo  
3️⃣ Impresión 3D
4️⃣ Otros

(Por favor, responde con el número de la opción que deseas.)
```

---

## 🔥 **FLUJO OPCIÓN 1: CORTE LÁSER (CON ENLACE ÚNICO)**

### **Selección del Servicio (Estado: awaiting_service_selection)**
```
Usuario: "1"
↓
📐 Perfecto, seleccionaste Corte Láser.

**¡Simplificamos el proceso de envío!**

Para enviarnos tu diseño (DWG, DXF, etc.) y especificar los detalles del corte (material, espesor, etc.), haz clic en el siguiente enlace:

🔗 **Abrir Formulario de Pedido y Carga:**
   `https://amirah-undatable-shaniqua.ngrok-free.dev/pedido/corte-laser?token=[TOKEN_UNICO]`

**⚠️ Pasos en la web:**
1. Descarga nuestra plantilla (opcional)
2. Sube tu(s) archivo(s) editado(s) (DWG/DXF/PDF)
3. Ingresa las especificaciones de corte

**Te avisaré por aquí en WhatsApp tan pronto como recibamos el archivo subido.**
```

### **Estado: awaiting_web_upload**

#### **A) Si el Usuario Sube el Archivo en la Web (Flujo Principal):**
```
[Servidor Web recibe archivo(s) .dwg y especificaciones]
[Bot envía mensaje automático a WhatsApp]
↓
✅ **¡Archivo(s) y Especificaciones recibidas correctamente!**

📋 Resumen de tu solicitud de Corte Láser:

🔹 Número de pedido: #[ID_PEDIDO]
🔹 Archivos recibidos: [Conteo de archivos]
🔹 Especificaciones: [Resumen de especificaciones de la web]

Un trabajador de ESIAD revisará tu diseño. Te confirmaré por aquí si tu pedido puede iniciarse.

**¡Gracias por confiar en ESIAD Proyectos SAC!**
```

#### **B) Si el Usuario Envía Mensajes de Control en WhatsApp:**
```
Usuario: "1" o "menu"
↓
� Volviendo al menú principal...
[Muestra menú principal nuevamente]

Usuario: "2" o "reset" o "cancelar"
↓
❌ **Pedido Cancelado**

Tu solicitud de Corte Láser (Pedido #[ID_PEDIDO]) ha sido cancelada antes de la recepción del archivo.

Escribe "hola" o "reset" cuando quieras hacer una nueva consulta.
```

#### **C) Si el Usuario Envía Mensaje NO VÁLIDO en WhatsApp:**
```
Usuario: [Cualquier mensaje/archivo que no sea "menu" o "reset"]
↓
� **Aún estamos esperando tu diseño y especificaciones.**

Recuerda que debes usar el enlace que te envié para completar tu pedido:

🔗 **Abrir Formulario de Pedido y Carga:**
   `https://amirah-undatable-shaniqua.ngrok-free.dev/pedido/corte-laser?token=[TOKEN_UNICO]`

Si deseas cancelar o volver, responde:
1️⃣ "menu" - Para volver al menú principal
2️⃣ "cancelar" - Para terminar esta consulta
```

---

## 🕒 **FLUJO POST-CARGA WEB (Cliente Esperando Respuesta)**

### **Estado: awaiting_review_response**

#### **A) Notificación de Aprobación/Rechazo (Mensaje Asíncrono):**
```
[Trabajador ESIAD aprueba/rechaza el diseño desde panel admin]
↓
**[Ejemplo de Aprobación]**
🎉 **¡Tu pedido ha sido aprobado!**

El equipo de ESIAD ha revisado tu diseño (Pedido #[ID_PEDIDO]) y está listo para cotizar.

En breve, te enviaremos la cotización detallada.

**[Ejemplo de Rechazo]**
⚠️ **Pedido requiere modificaciones**

Tu diseño (Pedido #[ID_PEDIDO]) necesita algunos ajustes:

📝 **Comentarios del especialista:**
[Comentarios específicos del trabajador]

Por favor, modifica tu diseño y envíalo nuevamente usando el mismo enlace.
```

#### **B) Si el Usuario Envía Mensaje durante la Espera:**
```
Usuario: [Cualquier mensaje, ej: "ya lo revisaron?"]
↓
⏳ **Gracias por tu paciencia.**

Tu diseño (Pedido #[ID_PEDIDO]) está siendo revisado por nuestro equipo de especialistas.

Te enviaremos una notificación aquí mismo tan pronto como tengamos una respuesta (aprobación/rechazo). No es necesario que escribas más.

Escribe "reset" si deseas iniciar una consulta completamente nueva.
```

---

## � **CARACTERÍSTICAS TÉCNICAS REQUERIDAS**

### **Nuevos Estados de Conversación:**
- `initial` → Estado inicial
- `service_selection` → Seleccionando servicio  
- `awaiting_web_upload` → **NUEVO:** Esperando carga en formulario web
- `awaiting_review_response` → **NUEVO:** Esperando respuesta del trabajador
- `completed` → Pedido completado
- `cancelled` → Pedido cancelado

### **Nuevas Funcionalidades Requeridas:**

#### **A) Generación de Token Único:**
```javascript
// Generar token único por conversación
const generateUniqueToken = (phoneNumber, serviceType) => {
    return `${phoneNumber}_${serviceType}_${Date.now()}`;
};

// URL personalizada
const webFormUrl = `${baseUrl}/pedido/corte-laser?token=${token}`;
```

#### **B) Formulario Web de Carga:**
- **Ruta:** `/pedido/corte-laser?token=[TOKEN_UNICO]`
- **Funcionalidades:**
  - Descarga de plantilla DWG
  - Upload múltiple de archivos DWG/DXF/PDF
  - Formulario de especificaciones:
    - Material (dropdown)
    - Espesor (input number)
    - Dimensiones (input text)
    - Cantidad (input number)
    - Comentarios adicionales (textarea)
  - Validación de archivos
  - Confirmación de envío

#### **C) API de Notificación al Bot:**
```javascript
// Cuando se sube archivo en web, notificar al bot
POST /api/webhook/file-uploaded
{
    "token": "[TOKEN_UNICO]",
    "phoneNumber": "+51910262022",
    "files": ["file1.dwg", "file2.dxf"],
    "specifications": {
        "material": "Acero inoxidable",
        "espesor": "5mm",
        "dimensiones": "100x100mm",
        "cantidad": 20
    }
}
```

#### **D) Panel Admin Mejorado:**
- Visualización de archivos DWG
- Botones de Aprobación/Rechazo
- Campo de comentarios para trabajador
- Notificación automática a WhatsApp

### **Base de Datos Actualizada:**

#### **Tabla conversations (actualizada):**
```sql
ALTER TABLE conversations ADD COLUMN web_token VARCHAR(255);
ALTER TABLE conversations ADD COLUMN web_form_url TEXT;
```

#### **Tabla orders (actualizada):**
```sql
ALTER TABLE orders ADD COLUMN uploaded_files TEXT; -- JSON array
ALTER TABLE orders ADD COLUMN file_upload_timestamp TIMESTAMP;
ALTER TABLE orders ADD COLUMN worker_review_status VARCHAR(50); -- 'pending', 'approved', 'rejected'
```

---

## �️ **IMPLEMENTACIÓN REQUERIDA**

### **1. Crear Formulario Web:**
```html
<!-- /public/pedido-corte-laser.html -->
<form id="uploadForm">
    <h2>Pedido de Corte Láser - ESIAD</h2>
    
    <!-- Descarga de plantilla -->
    <a href="/files/corte1.dwg" download>📎 Descargar Plantilla DWG</a>
    
    <!-- Upload de archivos -->
    <input type="file" multiple accept=".dwg,.dxf,.pdf" required>
    
    <!-- Especificaciones -->
    <select name="material" required>
        <option value="acero">Acero</option>
        <option value="aluminio">Aluminio</option>
        <option value="acero_inoxidable">Acero Inoxidable</option>
    </select>
    
    <input type="number" name="espesor" placeholder="Espesor en mm" required>
    <input type="text" name="dimensiones" placeholder="Dimensiones" required>
    <input type="number" name="cantidad" placeholder="Cantidad" required>
    
    <button type="submit">Enviar Pedido</button>
</form>
```

### **2. Actualizar Controller del Bot:**
```javascript
// En handleServiceSelection - Opción 1
if (selectedOption === '1') {
    const token = generateUniqueToken(phoneNumber, 'corte_laser');
    const webFormUrl = `${process.env.BASE_URL}/pedido/corte-laser?token=${token}`;
    
    await ConversationService.updateConversationState(
        phoneNumber, 
        'awaiting_web_upload', 
        'corte_laser',
        { webToken: token, webFormUrl: webFormUrl }
    );
    
    return `📐 Perfecto, seleccionaste Corte Láser.
    
🔗 **Abrir Formulario:**
${webFormUrl}

Te avisaré cuando recibamos tu archivo.`;
}
```

### **3. Nuevo Endpoint para Recibir Uploads:**
```javascript
// /api/upload-files
app.post('/api/upload-files', async (req, res) => {
    const { token, files, specifications } = req.body;
    
    // Buscar conversación por token
    const conversation = await ConversationService.getByToken(token);
    
    // Crear pedido con archivos
    const order = await OrderService.createOrderWithFiles({
        phoneNumber: conversation.phone_number,
        files: files,
        specifications: specifications
    });
    
    // Notificar al cliente por WhatsApp
    await ChatbotController.sendFileReceivedNotification(
        conversation.phone_number, 
        order.id, 
        files.length
    );
    
    // Cambiar estado a waiting review
    await ConversationService.updateState(
        conversation.phone_number, 
        'awaiting_review_response'
    );
});
```

---

## 📊 **FLUJO COMPLETO ACTUALIZADO**

```
1. Usuario: "reset"
2. Usuario: "hola"  
3. Bot: [Menú de opciones]
4. Usuario: "1"
5. Bot: [Enlace al formulario web con token único]
6. Usuario: [Abre web, sube archivos DWG + especificaciones]
7. Web: [POST a /api/upload-files]
8. Bot: [Mensaje automático "Archivos recibidos"]
9. [Estado: awaiting_review_response]
10. Trabajador: [Revisa desde panel admin]
11. Trabajador: [Aprueba/Rechaza con comentarios]
12. Bot: [Mensaje automático de aprobación/rechazo]
```

---

## ✅ **VENTAJAS DEL NUEVO FLUJO**

- ✅ **Soporte nativo para archivos DWG** (sin limitaciones de WhatsApp)
- ✅ **Formulario estructurado** con validaciones
- ✅ **Upload múltiple** de archivos
- ✅ **Experiencia web optimizada** para especificaciones
- ✅ **Token único** por conversación (seguridad)
- ✅ **Notificaciones automáticas** a WhatsApp
- ✅ **Flujo asíncrono** eficiente
- ✅ **Panel admin integrado** para revisión

**El chatbot ahora actúa como coordinador entre WhatsApp y la plataforma web, optimizando la experiencia para archivos complejos.**