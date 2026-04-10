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

## 🧪 Testing Manual

### Cargar Datos de Prueba

```bash
# Opción 1: Script Node.js (recomendado)
node load_test_data.js

# Opción 2: SQL directo (ver test_data.sql)
psql -U usuario -d pedidos -f test_data.sql
```

### Ejecutar Test Cases

Ver documentación completa en: [TESTING_MANUAL.md](./TESTING_MANUAL.md)

**Test Cases Disponibles:**
- ✅ TC1: Primera Vez (Usuario nuevo → Registro)
- ✅ TC2: Recurrente (Usuario registrado → Autenticación)
- ✅ TC3: Token Inválido (Error 404)
- ✅ TC4: Token Expirado (Error 410)
- ✅ TC5: Upload Exitoso (Pedido creado)
- ✅ TC6: Upload con Error (Validación cliente)
- ✅ TC7: Upload con Error (Servidor 500)
- ✅ TC8: Flujo Completo ChatBot → Web

**URLs para Testing:**
```
http://localhost:4200/pedido/acceso?token=valid-token-tc1-first-time (Primera vez)
http://localhost:4200/pedido/acceso?token=valid-token-tc2-recurrent (Recurrente)
http://localhost:4200/pedido/acceso?token=inexistente (Token inválido → 404)
http://localhost:4200/pedido/acceso?token=expired-token-tc4 (Token expirado → 410)
```

### Verificar Endpoints

Ver: [ENDPOINTS_VERIFICATION.md](./ENDPOINTS_VERIFICATION.md)

```bash
# Verificar token válido (primera vez)
curl "http://localhost:3000/api/web/customer-context?token=valid-token-tc1-first-time"

# Verificar token expirado
curl -v "http://localhost:3000/api/web/customer-context?token=expired-token-tc4"
```

---

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

## Frontend Angular para Produccion (Guia Basica)

Esta seccion te da el camino minimo para iniciar el frontend Angular consumiendo este backend en un entorno de produccion.

### 1. Variables de entorno backend (obligatorias para frontend admin)

Agrega o valida estas variables en tu `.env` de produccion:

```env
# Entorno
NODE_ENV=production
PORT=3000

# Seguridad HTTP
CORS_ORIGIN=https://tu-frontend.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300

# Auth JWT para panel/API admin
AUTH_ENABLED=true
JWT_SECRET=CAMBIA_ESTE_SECRETO_LARGO_Y_ALEATORIO
JWT_EXPIRES_IN=8h
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CAMBIA_ESTA_PASSWORD

# Base URL para WhatsApp/Webhook
WEBHOOK_URL=https://tu-backend.com/webhook/whatsapp
```

Notas:
- Si `AUTH_ENABLED=true`, los endpoints de admin y gestion de pedidos requieren token Bearer.
- `CORS_ORIGIN` debe apuntar al dominio real de Angular (o lista separada por comas).

### 2. Endpoints clave para Angular

- Login admin: `POST /api/auth/login`
- OpenAPI JSON: `GET /api/openapi.json`
- Swagger UI: `GET /api/docs`
- Pedidos admin: `GET /api/admin/orders`
- Pendientes: `GET /api/orders/pending`
- Revisar pedido: `POST /api/orders/:id/review`
- Actualizar pedido: `POST /api/orders/:id/update`

### 3. Configuracion inicial en Angular

En `src/environments/environment.ts` y `src/environments/environment.prod.ts` define:

```ts
export const environment = {
    production: true,
    apiBaseUrl: 'https://tu-backend.com'
};
```

Implementa:
- `AuthService` para login contra `/api/auth/login`.
- `HttpInterceptor` que agregue `Authorization: Bearer <token>` en rutas protegidas.
- Guard de rutas para panel admin.

### 4. Flujo minimo recomendado

1. Login en Angular con usuario/password admin.
2. Guardar token JWT de forma segura (memoria o storage segun tu politica).
3. Consumir endpoints de pedidos/admin con interceptor.
4. Manejar errores usando el contrato JSON estandar del backend:

```json
{
    "success": false,
    "error": {
        "code": "ERROR_CODE",
        "message": "Mensaje",
        "details": null
    },
    "requestId": "...",
    "timestamp": "..."
}
```

### 5. Build y despliegue Angular (basico)

```bash
ng build --configuration production
```

Publica `dist/` en tu servidor web (Nginx/Apache/CDN) y define proxy hacia backend para `/api`.

Ejemplo conceptual de reverse proxy:
- Frontend: `https://tu-frontend.com`
- Backend API: `https://tu-backend.com`

### 6. Verificaciones antes de conectar frontend

Ejecuta en backend:

```bash
npm run lint
npm run smoke
npm test
```

Y confirma:
- `/api/docs` responde correctamente.
- login admin devuelve token.
- endpoints admin responden con Bearer valido.

**© 2024 ESIAD Proyectos SAC** - Todos los derechos reservados.