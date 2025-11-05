# 🔥 FLUJO CHATBOT ESIAD - SISTEMA HÍBRIDO WEB + WHATSAPP

## 📱 FLUJO PRINCIPAL ACTUALIZADO

### 1. **SALUDO INICIAL**
```
👋 ¡Hola! Bienvenido a ESIAD Proyectos SAC.

Estoy aquí para ayudarte con tus pedidos de servicio.

Por favor, elige una de las siguientes opciones:

1️⃣ Corte láser
2️⃣ Ploteo  
3️⃣ Impresión 3D
4️⃣ Otros

(Por favor, responde con el número de la opción que deseas.)
```

### 2. **SELECCIÓN DE CORTE LÁSER (NUEVO FLUJO)**
Usuario envía: `1`

```
🔥 ¡Perfecto! Seleccionaste Corte Láser

Para enviar tu archivo DWG de forma segura, usa nuestro formulario web especializado:

🌐 SUBIR ARCHIVOS DWG:
https://amirah-undatable-shaniqua.ngrok-free.dev/pedido/corte-laser?token=TOKEN_ÚNICO

📋 En el formulario podrás:
✅ Subir archivos DWG/DXF (hasta 50MB)
✅ Especificar material y dimensiones
✅ Describir requerimientos técnicos
✅ Visualización de archivos en tiempo real

📱 También puedes enviar aquí:
• 📷 Imagen/captura del diseño DWG
• 📄 PDF del plano
• 📝 Descripción detallada por texto

⏱️ El formulario web estará disponible por 2 horas

¿Prefieres usar el formulario web o enviar por WhatsApp?
```

## 🌐 FLUJO FORMULARIO WEB

### A. **USUARIO ELIGE FORMULARIO WEB**
Usuario responde: "web" o "formulario"

```
🌐 Perfecto, usarás el formulario web.

El enlace ya te fue enviado anteriormente. Si lo perdiste, escribe "enlace" y te lo enviaré nuevamente.

⏱️ Recuerda: El formulario estará disponible por 2 horas desde que se generó.

Una vez subas tu archivo, recibirás confirmación aquí en WhatsApp.
```

### B. **USUARIO SUBE ARCHIVO EN WEB**
1. **Formulario Web (`/pedido/corte-laser`) muestra:**
   - **Drag & Drop** para archivos DWG/DXF/PDF
   - **Campos obligatorios**: Material, Espesor, Dimensiones, Cantidad
   - **Progreso de subida** en tiempo real
   - **Validación de archivos** (tipo y tamaño)
   - **Interfaz moderna** con iconos y animaciones

2. **Proceso Backend:**
   - Archivos se guardan en `/uploads/` con nombres únicos
   - Se registra en base de datos con token de seguridad
   - Se crea orden automáticamente con estado "Solicitado"
   - Información se vincula a conversación de WhatsApp

3. **Notificación Automática WhatsApp:**
```
✅ ¡Archivo recibido correctamente desde el formulario web!

📁 Archivos subidos: 2 archivo(s)
📝 Especificaciones: Material: Acero inoxidable, Espesor: 3mm, Dimensiones: 100x50mm, Cantidad: 5 piezas

🔍 Estado: En revisión por nuestro equipo técnico

Te notificaremos aquí cuando tengamos una respuesta sobre la viabilidad de tu proyecto.

¡Gracias por usar nuestro formulario web!
```

### C. **TRABAJADOR REVISA EN PANEL ADMIN**
1. **Panel Admin (`/admin.html`) muestra:**
   - ✅ **Pedido con archivos DWG adjuntos** descargables
   - ✅ **Especificaciones técnicas completas**
   - ✅ **Enlaces directos** para descargar cada archivo
   - ✅ **Botones de acción**: Aprobar/Rechazar
   - ✅ **Formularios** para costo y tiempo estimado

2. **Trabajador puede:**
   - ✅ **APROBAR** → Establecer costo y tiempo estimado
   - ❌ **RECHAZAR** → Proporcionar comentarios y correcciones necesarias

### D. **NOTIFICACIÓN DE RESULTADO AUTOMÁTICA**

**✅ Si es APROBADO:**
```
✅ ¡Tu proyecto ha sido aprobado!

📝 Pedido #123
💰 Costo estimado: S/ 150.00
⏱️ Tiempo estimado: 2 días hábiles

💬 Comentarios del técnico:
"Proyecto viable. Materiales disponibles en stock."

🚀 ¿Deseas proceder con el pedido?

Responde:
1 "confirmar" - Para iniciar el trabajo
2 "consultar" - Para hacer preguntas
3 "cancelar" - Para cancelar el pedido
```

**❌ Si es RECHAZADO:**
```
❌ Tu proyecto necesita correcciones

📝 Pedido #123

💬 Observaciones del técnico:
"El grosor del material no es compatible con las dimensiones solicitadas"

🔧 Sugerencias:
• Revisar espesor del material (máximo 10mm)
• Ajustar dimensiones según capacidad de máquina
• Verificar compatibilidad en diseño DWG

🌐 ¿Quieres corregir tu archivo?

Responde:
1 "corregir" - Para enviar archivo corregido  
2 "consultar" - Para hablar con un técnico
3 "cancelar" - Para cancelar el pedido
```

## 📱 FLUJO WHATSAPP TRADICIONAL (FALLBACK)

### A. **USUARIO ELIGE WHATSAPP**
Usuario responde: "whatsapp" o "aqui"

```
📱 Perfecto, enviarás por WhatsApp.

💡 Para enviar tu diseño, puedes usar:

📷 Opción 1: Envía una imagen (captura/foto) de tu diseño DWG
📄 Opción 2: Convierte tu DWG a PDF y envíalo
📝 Opción 3: Describe tu diseño por texto detalladamente

⚠️ Nota: WhatsApp no soporta archivos .dwg directamente

✏️ También incluye estas especificaciones:
- Material (acero, aluminio, etc.)
- Espesor en mm
- Dimensiones
- Cantidad de piezas

Envía tu archivo y especificaciones cuando estés listo.
```

### B. **PROCESAMIENTO TRADICIONAL**
Continúa con el flujo normal de especificaciones y confirmación que ya existía.

## 🔧 ARQUITECTURA TÉCNICA HÍBRIDA

### **🔐 Seguridad del Token**
```javascript
// Generación de token único
generateUniqueToken(phoneNumber, serviceType) {
    return `${phoneNumber.replace('+', '')}_${serviceType}_${Date.now()}`;
}

// Ejemplo: 51987654321_corte_laser_1703123456789
```
- ✅ **Único por conversación**: Vinculado a teléfono específico
- ✅ **Expiración**: 2 horas desde generación  
- ✅ **Verificación**: Backend valida token antes de procesar
- ✅ **Seguridad**: No reutilizable entre sesiones

### **📁 Gestión de Archivos**
```javascript
// Configuración Multer
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.dwg', '.dxf', '.pdf', '.jpg', '.png'];
        // ... validación
    }
});
```
- ✅ **Formatos soportados**: DWG, DXF, PDF, JPG, PNG
- ✅ **Tamaño máximo**: 50MB por archivo
- ✅ **Almacenamiento**: `/uploads/` con nombres únicos timestamp
- ✅ **Metadata**: Respaldo completo en PostgreSQL

### **🗄️ Base de Datos Híbrida**
```sql
-- Nuevas columnas para soporte web
ALTER TABLE conversations ADD COLUMN web_token VARCHAR(255);
ALTER TABLE conversations ADD COLUMN web_form_url TEXT;
ALTER TABLE conversations ADD COLUMN additional_data TEXT; -- JSON

ALTER TABLE orders ADD COLUMN uploaded_files TEXT; -- JSON array de archivos
ALTER TABLE orders ADD COLUMN worker_review_status VARCHAR(50);
```

### **🔄 Estados de Conversación Expandidos**
- `awaiting_web_upload`: Usuario debe elegir entre formulario web o WhatsApp
- `awaiting_review_response`: Esperando revisión del trabajador desde panel admin
- **Estados tradicionales mantenidos** para compatibilidad total

### **🌐 Endpoints Web Nuevos**
```javascript
// Servir formulario web con token
app.get('/pedido/corte-laser', (req, res) => {
    const token = req.query.token;
    // Validar token y servir formulario
});

// Procesar archivos subidos
app.post('/api/upload-files', upload.array('files', 10), async (req, res) => {
    // Procesar archivos y especificaciones
});

// Revisión de trabajador
app.post('/api/orders/:id/review', async (req, res) => {
    // Aprobar/rechazar con notificación automática WhatsApp
});
```

## 🎯 VENTAJAS DEL SISTEMA HÍBRIDO

### **👤 Para el Cliente:**
- ✅ **Archivos nativos**: Puede subir DWG originales (no soportados en WhatsApp)
- ✅ **Experiencia moderna**: Formulario intuitivo con drag & drop
- ✅ **Feedback visual**: Progreso de subida y validación en tiempo real
- ✅ **Flexibilidad**: Puede elegir entre web o WhatsApp tradicional
- ✅ **Seguridad**: Token único y temporal para cada sesión

### **🏢 Para ESIAD:**
- ✅ **Calidad técnica**: Recibe archivos DWG originales para mejor evaluación
- ✅ **Automatización completa**: Desde subida hasta notificación de resultado
- ✅ **Panel integrado**: Gestión centralizada en `/admin.html`
- ✅ **Trazabilidad**: Toda la comunicación sigue siendo por WhatsApp
- ✅ **Escalabilidad**: Base para otros servicios técnicos

### **⚙️ Técnicas:**
- ✅ **Seguridad robusta**: Tokens únicos con expiración
- ✅ **Integración seamless**: Web + WhatsApp sin fricciones
- ✅ **Compatibilidad**: Mantiene todos los flujos existentes
- ✅ **Performance**: Archivos grandes manejados eficientemente
- ✅ **Monitoreo**: Logs completos de todas las operaciones

## 🚀 FLUJO COMPLETO DE EJEMPLO

### **Paso 1**: Cliente dice "1" → Recibe enlace web único
### **Paso 2**: Cliente sube archivo DWG de 25MB + especificaciones
### **Paso 3**: Sistema notifica por WhatsApp "archivo recibido"
### **Paso 4**: Trabajador ve pedido en admin panel con archivos descargables
### **Paso 5**: Trabajador aprueba con costo S/150 y tiempo 2 días
### **Paso 6**: Cliente recibe notificación automática con detalles
### **Paso 7**: Cliente confirma "1" y pedido inicia
### **Paso 8**: Sistema mantiene seguimiento completo en WhatsApp

## 📈 MEJORAS FUTURAS PLANIFICADAS
- [ ] **Push notifications** para trabajadores en tiempo real
- [ ] **Múltiples archivos** por pedido con categorización
- [ ] **Previsualización 3D** de archivos DWG en browser
- [ ] **Integración de pagos** con Yape/Plin APIs
- [ ] **Dashboard analytics** con métricas de conversión
- [ ] **Sistema de plantillas** DWG predefinidas
- [ ] **Chat en vivo** integrado en formulario web

---
**🎯 El sistema híbrido combina la conveniencia de WhatsApp con la capacidad técnica de una plataforma web, ofreciendo la mejor experiencia para ambas partes sin comprometer la funcionalidad.**