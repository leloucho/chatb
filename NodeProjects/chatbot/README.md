# 🤖 ESIAD WhatsApp Chatbot

Chatbot de WhatsApp para **ESIAD Proyectos SAC** que permite a los clientes solicitar servicios de:
- ✂️ **Corte Láser** - Corte de precisión en diversos materiales
- 🖨️ **Ploteo** - Impresión y corte de vinilos  
- 🏗️ **Impresión 3D** - Prototipos y piezas personalizadas
- 🔧 **Otros Servicios** - Servicios personalizados

## 🛠️ Tecnologías Utilizadas

- **Node.js + Express** - Servidor backend
- **Twilio API** - Integración con WhatsApp Business
- **PostgreSQL** - Base de datos para pedidos y conversaciones
- **Multer** - Manejo de archivos multimedia
- **dotenv** - Gestión de variables de entorno

## 📋 Requisitos Previos

1. **Node.js** v16 o superior
2. **PostgreSQL** instalado y ejecutándose
3. **Cuenta de Twilio** con WhatsApp Business API habilitado
4. **DBeaver** o cliente PostgreSQL para gestión de BD
5. **ngrok** para túneles locales (desarrollo)

## � Instalación y Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Base de Datos PostgreSQL

En **DBeaver** conecta a tu servidor PostgreSQL y ejecuta:

```sql
-- La base de datos 'pedidos' ya debe existir
-- Las tablas se crearán automáticamente
```

### 3. Configurar Variables de Entorno

Edita el archivo `.env` con tus credenciales reales:

```env
# Configuración del Servidor
PORT=3000
NODE_ENV=development

# Configuración de Twilio WhatsApp
TWILIO_ACCOUNT_SID=TU_ACCOUNT_SID_AQUI
TWILIO_AUTH_TOKEN=TU_AUTH_TOKEN_AQUI
TWILIO_WHATSAPP_NUMBER=+14155238886

# Token de verificación para webhooks
WEBHOOK_VERIFY_TOKEN=esiad_webhook_2024

# Configuración de Base de Datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pedidos
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_password_postgres

# URLs del webhook (usar ngrok para desarrollo)
WEBHOOK_URL=https://tu-url-ngrok.ngrok.io/webhook/whatsapp
STATUS_WEBHOOK_URL=https://tu-url-ngrok.ngrok.io/webhook/status
```

### 4. Obtener Credenciales de Twilio

1. Ve a [Twilio Console](https://console.twilio.com/)
2. Ya tienes configuradas tus credenciales reales en el `.env`
3. Configura el **Sandbox de WhatsApp** para pruebas

### 5. Configurar Webhook URLs

Para desarrollo local, usa **ngrok**:

```bash
# Instalar ngrok globalmente
npm install -g ngrok

# Crear túnel en puerto 3000
ngrok http 3000
```

Copia la URL HTTPS generada (ej: `https://abc123.ngrok.io`) y configúrala en:
- Tu archivo `.env` (reemplaza `https://tu-url-ngrok.ngrok.io`)
- La configuración de webhook en Twilio Console

### 6. Inicializar Base de Datos

```bash
npm run init-db
```

### 7. Iniciar la Aplicación

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 📱 Configuración de WhatsApp Business

### En Twilio Console:

1. Ve a **Messaging > Settings > WhatsApp sandbox settings**
2. Configura la **Webhook URL**: `https://tu-ngrok-url.ngrok.io/webhook/whatsapp`
3. Configura la **Status callback URL**: `https://tu-ngrok-url.ngrok.io/webhook/status`
4. Método HTTP: **POST**

### Para activar el sandbox:

1. Envía el código de activación al número de Twilio desde tu WhatsApp
2. Ejemplo: `join <código-único>` a `+1 415 523 8886`

## 🎯 Flujo de Conversación

1. **Inicio**: Cliente envía cualquier mensaje
2. **Menú**: Bot muestra servicios disponibles (1-4)
3. **Selección**: Cliente elige servicio con número
4. **Corte Láser**: Bot envía archivo `corte1.dwg` automáticamente
5. **Archivos**: Cliente descarga, edita y reenvía archivo
6. **Especificaciones**: Cliente proporciona detalles técnicos
7. **Confirmación**: Cliente confirma o cancela pedido
8. **Registro**: Pedido se guarda con estado "solicitado"
9. **Gestión**: Trabajador acepta/rechaza desde panel web
10. **Notificaciones**: Cliente recibe actualizaciones automáticas

## � Estructura de Base de Datos

### Tabla `conversations`
```sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    current_state VARCHAR(50) DEFAULT 'initial',
    selected_service VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla `orders`
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    specifications TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    file_paths TEXT,
    customer_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🧪 Pruebas

1. Inicia el servidor: `npm run dev`
2. Inicia ngrok: `ngrok http 3000`
3. Configura la URL en Twilio
4. Envía mensaje al número de sandbox de Twilio
5. Prueba el flujo completo

### Comandos de prueba:
- `hola` o `menu` - Iniciar conversación
- `1`, `2`, `3`, `4` - Seleccionar servicio
- Enviar archivos multimedia
- `listo` - Continuar después de archivos
- `confirmar` o `cancelar` - Finalizar pedido

## � Configuración Específica

### Para el archivo `.env`:

1. **WEBHOOK_VERIFY_TOKEN**: Ya está configurado como `esiad_webhook_2024`
2. **Base de datos**: Cambia `DB_USER` y `DB_PASSWORD` por tus credenciales de PostgreSQL
3. **URLs de webhook**: Una vez que tengas ngrok corriendo, reemplaza las URLs

### Para las URLs de webhook:

```env
# Ejemplo después de correr ngrok:
WEBHOOK_URL=https://1234-56-78-90-123.ngrok.io/webhook/whatsapp
STATUS_WEBHOOK_URL=https://1234-56-78-90-123.ngrok.io/webhook/status
```

---

**© 2024 ESIAD Proyectos SAC** - Todos los derechos reservados.