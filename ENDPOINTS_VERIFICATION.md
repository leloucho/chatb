# 🔍 Verificación de Endpoints - Backend Ready

**Fecha:** 2026-04-10  
**Estado:** ✅ Todos los endpoints implementados y testeados  
**Build:** OK (con warning modular en Angular, no crítico)  

---

## 📋 Tabla de Endpoints Verificados

### 1️⃣ Token Validation Endpoints

| Endpoint | Method | Status | Body | Response | Test Case |
|----------|--------|--------|------|----------|-----------|
| `/api/web/customer-context?token=...` | GET | ✅ 200 / 404 / 410 | - | `{success, data: {customerDni, customerName, isRegistered}}` | TC1, TC2, TC3, TC4 |
| `/api/web/form-context?token=...` | GET | ✅ 200 / 404 / 410 | - | `{success, data: {serviceType, serviceName, customerDni, customerName}}` | TC1, TC2, TC5 |

**Error Responses:**
- **404:** `{success: false, message: "Token inválido o expirado"}`
- **410:** `{success: false, message: "Token expirado. Solicita un nuevo enlace desde WhatsApp."}`

---

### 2️⃣ Page Render Endpoints

| Endpoint | Method | Returns | Checks | Status |
|----------|--------|---------|--------|--------|
| `/cliente/registro?token=...` | GET | HTML | Renders `cliente-registro.html` with token param | ✅ OK |
| `/cliente/autenticacion?token=...` | GET | HTML | Renders `cliente-autenticacion.html` with token param | ✅ OK |
| `/pedido/corte-laser?token=...` | GET | HTML | Renders `pedido-corte-laser.html` with token param | ✅ OK |

---

### 3️⃣ Customer Flow Endpoints

#### Register (Primera Vez)
```bash
POST /api/web/customer-register
```
**Request Body:**
```json
{
  "token": "valid-token-tc1-first-time",
  "name": "Juan Pérez"
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "Cliente registrado exitosamente",
  "nextUrl": "/pedido/corte-laser?token=valid-token-tc1-first-time"
}
```
**Error (404/410):** Token error payload  
**Test Case:** TC1  
**Status:** ✅ Implemented

---

#### Authenticate (Recurrente)
```bash
POST /api/web/customer-authenticate
```
**Request Body:**
```json
{
  "token": "valid-token-tc2-recurrent",
  "dni": "87654321"
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "Autenticación exitosa",
  "nextUrl": "/pedido/corte-laser?token=valid-token-tc2-recurrent"
}
```
**Error (404/410):** Token error payload  
**Test Case:** TC2  
**Status:** ✅ Implemented

---

### 4️⃣ Order Upload Endpoint

```bash
POST /api/orders/upload-files
```
**Request (FormData):**
```
token: "valid-token-tc1-first-time"
serviceType: "corte_laser"
specifications: "Corte en acrilico, 10cm x 5cm"
material: "Acrílico transparente"
quantity: "2"
file: <binary .dwg file>
```
**Response (200):**
```json
{
  "success": true,
  "message": "Pedido creado exitosamente",
  "orderId": "abc123def456",
  "status": "pending"
}
```
**Error (404/410):** Token error payload  
**Error (400):** Validation error  
**Error (500):** Server error  
**Test Cases:** TC5, TC6, TC7  
**Status:** ✅ Implemented

---

## 🧪 Quick Test Sequence

### Setup
```bash
# Terminal 1: Backend
npm start

# Terminal 2: Frontend (Angular)
ng serve

# Terminal 3: Load test data
node load_test_data.js
```

### Tests (en orden)

**TC1 - Primera Vez:**
```bash
# Verificar contexto
curl "http://localhost:3000/api/web/customer-context?token=valid-token-tc1-first-time"
# Esperado: 200, isRegistered=false

# Abrir en navegador
# http://localhost:4200/pedido/acceso?token=valid-token-tc1-first-time
# → Debe mostrar formulario de REGISTRO
```

**TC2 - Recurrente:**
```bash
curl "http://localhost:3000/api/web/customer-context?token=valid-token-tc2-recurrent"
# Esperado: 200, isRegistered=true

# Abrir en navegador
# http://localhost:4200/pedido/acceso?token=valid-token-tc2-recurrent
# → Debe mostrar formulario de AUTENTICACIÓN
```

**TC3 - Token Inválido:**
```bash
curl -v "http://localhost:3000/api/web/customer-context?token=inexistente"
# Esperado: 404 con mensaje "Token inválido"
```

**TC4 - Token Expirado:**
```bash
curl -v "http://localhost:3000/api/web/customer-context?token=expired-token-tc4"
# Esperado: 410 con mensaje "Token expirado"
```

**TC5 - Upload Exitoso:**
```bash
curl -X POST "http://localhost:3000/api/orders/upload-files" \
  -F "token=valid-token-tc1-first-time" \
  -F "serviceType=corte_laser" \
  -F "specifications=Test" \
  -F "quantity=1" \
  -F "file=@test_design.dwg"
# Esperado: 200 con orderId
```

---

## 📊 Database Validation

```sql
-- Verificar clientes de prueba cargados
SELECT * FROM customers WHERE dni IN ('12345678', '87654321', '11111111');

-- Verificar tokens válidos/expirados
SELECT 
  phone_number, 
  web_token,
  web_token_expires_at,
  CASE WHEN web_token_expires_at < NOW() THEN 'EXPIRADO' ELSE 'VÁLIDO' END
FROM conversations 
WHERE phone_number IN ('+34600000001', '+34600000002', '+34600000003');

-- Verificar órdenes creadas (post TC5)
SELECT * FROM orders WHERE customer_dni = '12345678' ORDER BY created_at DESC;
```

---

## 🔐 Token Error Handling

### 404 vs 410 - Diseño

**404 (Not Found):**
- Token no existe en BD
- Token nunca fue creado
- Mensaje: "Token inválido o expirado"
- Usuario debe: Solicitar nuevo link por WhatsApp

**410 (Gone):**
- Token existía pero `web_token_expires_at < NOW()`
- Token temporalmente no disponible
- Mensaje: "Token expirado. Solicita un nuevo enlace desde WhatsApp."
- Usuario debe: Solicitar nuevo link (diferente código de error para analytics)

### Middleware Chain

```
Request → webController.getFormContext()
  → ConversationService.getConversationByTokenStatus(token)
    → Query: SELECT * WHERE web_token = token
    → If NULL: return {conversation: null, reason: 'not_found'} → 404
    → If web_token_expires_at < NOW(): return {conversation, reason: 'expired'} → 410
    → Else: return {conversation, reason: null} → 200
  → buildTokenErrorPayload(reason) → Response
```

---

## ✅ Checklist Pre-Production

### Backend
- [x] Todos los endpoints retornan 200/404/410 correctos
- [x] Token expiration se valida en BD (no en frontend)
- [x] Error messages centralizados en `buildTokenErrorPayload()`
- [x] FormData upload soporta múltiples archivos
- [x] Database migrations idempotentes y aplicadas
- [x] No hay hardcoded credentials en código
- [x] Todos los tokens de prueba en test_data.sql son regenerables

### Frontend (responsabilidad del equipo Angular)
- [ ] Componentes "registro" y "autenticación" creados
- [ ] Services HTTP tipados (no `any` types)
- [ ] Error handling diferencia 404 vs 410
- [ ] Loading states en formularios
- [ ] Validaciones cliente antes de POST
- [ ] Mobile responsive (< 400px)
- [ ] Accesibilidad basic (labels, ARIA)

### Integration
- [ ] Backend + Frontend testean en localhost:3000 + localhost:4200
- [ ] Twilio Sandbox integrado (si aplica)
- [ ] Token TTL configurable vía env var
- [ ] No hay CORS issues

---

## 🚀 Deployment Readiness

### Environment Variables Requeridas
```bash
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/pedidos
WEBHOOK_URL=https://xxxxx.ngrok.io/webhook/whatsapp
WEBHOOK_VERIFY_TOKEN=secrettoken123
PORT=3000
JWT_SECRET=your-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
WEB_TOKEN_TTL_MINUTES=120

# Frontend (.env)
BACKEND_URL=http://localhost:3000
API_TIMEOUT=5000
```

### Logs a Monitorear
```
POST /api/web/customer-register  → 200 (cliente crea account)
POST /api/web/customer-authenticate → 200 (cliente autentica)
GET /api/web/customer-context?token=... → 404/410 (tokens inválidos/expirados)
POST /api/orders/upload-files → 200/500 (pedidos subidos)
```

---

## 📞 Support Info

**If 404 persists:**
- Verificar token existe en BD: `SELECT * FROM conversations WHERE web_token = '...';`
- Verificar `web_token_expires_at` no es NULL

**If 410 persists:**
- Verificar `NOW()` en DB vs servidor: `SELECT NOW();`
- Regenerar token: `node load_test_data.js`

**If upload fails:**
- Verificar espacio disco: `df -h`
- Verificar permisos carpeta uploads: `ls -la public/uploads/`
- Verificar mime-type de archivo: `file test_design.dwg`

---

**Estado actual:** 🟢 Ready for integration testing with Angular frontend

