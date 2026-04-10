# Testing Manual - Flujo Cliente WhatsApp Chatbot

**Estado del Build:** ✅ OK  
**Última actualización:** $(date)  
**Platform:** Frontend Angular + Backend Node.js/Express

---

## 📋 Precondiciones

### Backend debe estar corriendo:
```bash
npm start
# o en desarrollo
npm run dev
```

### Base de datos inicializada:
```bash
npm run init-db
```

### Twilio Sandbox activo (opcional para WhatsApp):
- Número: +14155238886
- Webhook URL configurada en `.env` (WEBHOOK_URL)

### Frontend corriendo en Angular:
```bash
ng serve
```

---

## 🧪 Test Cases

### TC1: Token Válido - Primera Vez (Flujo Registro)

**Objetivo:** Usuario nuevo entra por link, completa registro.

**Pasos:**
1. Generar token en base de datos manualmente:
```sql
-- Insertar conversación con token válido
INSERT INTO conversations (
  phone_number, 
  current_state, 
  selected_service, 
  customer_dni, 
  web_token, 
  web_token_expires_at
) VALUES (
  '+34600000001',
  'web_form_access',
  'corte_laser',
  '12345678',
  'valid-token-tc1-first-time',
  NOW() + INTERVAL '120 minutes'
) ON CONFLICT (phone_number) 
DO UPDATE SET 
  web_token = 'valid-token-tc1-first-time',
  web_token_expires_at = NOW() + INTERVAL '120 minutes'
RETURNING *;
```

2. Entrar en navegador: `http://localhost:4200/pedido/acceso?token=valid-token-tc1-first-time`

3. **Validaciones esperadas:**
   - ✅ Se muestra formulario de REGISTRO (no autenticación)
   - ✅ Campo DNI pre-cargado: `12345678` (readonly)
   - ✅ Campo Nombre vacío (editable, requerido)
   - ✅ Botón "Registrarse"
   - ✅ Mensaje tipo: "Es tu primera vez. Por favor, completa tu registro."

4. Llenar nombre: `Juan Pérez`

5. Click en "Registrarse"

6. **Validaciones post-submit:**
   - ✅ Spinner/loading state visible
   - ✅ POST a `/api/web/customer-register` (endpoint real: `http://localhost:3000/api/web/customer-register`) con body:
     ```json
     {
       "token": "valid-token-tc1-first-time",
       "name": "Juan Pérez"
     }
     ```
   - ✅ Response 200 OK con `{ success: true, nextUrl: "..." }`
   - ✅ Redirección automática a `/pedido/corte-laser?token=valid-token-tc1-first-time`
   - ✅ Formulario de corte laser se carga con:
     - Customer Nombre: `Juan Pérez` (readonly o display)
     - Service: `Corte Láser` (readonly)
     - Capacidad de cargar archivos

---

### TC2: Token Válido - Recurrente (Flujo Autenticación)

**Objetivo:** Cliente registrado entra por link, passa autenticación rápida.

**Pasos:**
1. Usar cliente existente o insertar:
```sql
INSERT INTO customers (dni, phone_number, name, created_at) 
VALUES ('87654321', '+34600000002', 'María López', NOW())
ON CONFLICT (dni) DO NOTHING;

INSERT INTO conversations (
  phone_number, 
  current_state, 
  selected_service, 
  customer_dni, 
  web_token, 
  web_token_expires_at
) VALUES (
  '+34600000002',
  'web_form_access',
  'corte_laser',
  '87654321',
  'valid-token-tc2-recurrent',
  NOW() + INTERVAL '120 minutes'
) ON CONFLICT (phone_number) 
DO UPDATE SET 
  web_token = 'valid-token-tc2-recurrent',
  web_token_expires_at = NOW() + INTERVAL '120 minutes'
RETURNING *;
```

2. Entrar: `http://localhost:4200/pedido/acceso?token=valid-token-tc2-recurrent`

3. **Validaciones esperadas:**
   - ✅ Se muestra formulario de AUTENTICACIÓN (no registro)
   - ✅ Campo DNI pre-cargado: `87654321` (readonly)
   - ✅ Nombre pre-cargado: `María López` (readonly)
   - ✅ Botón "Continuar" (o similar)
   - ✅ Mensaje tipo: "¡Hola de nuevo, María! Por favor confirma para continuar."

4. Click en "Continuar"

5. **Validaciones post-submit:**
   - ✅ POST a `/api/web/customer-authenticate` (endpoint real: `http://localhost:3000/api/web/customer-authenticate`) con body:
     ```json
     {
       "token": "valid-token-tc2-recurrent",
       "dni": "87654321"
     }
     ```
   - ✅ Response 200 OK
   - ✅ Redirección a `/pedido/corte-laser?token=valid-token-tc2-recurrent`
   - ✅ Formulario carga sin bloqueos

---

### TC3: Token Inválido (404)

**Objetivo:** Usuario intenta con token no existente o mal formado.

**Pasos:**
1. Entrar: `http://localhost:4200/pedido/acceso?token=token-que-nunca-existio`

2. **Validaciones esperadas:**
   - ✅ **No** se muestra formulario de registro/auth
   - ✅ Se muestra error 404 con mensaje:
     ```
     ❌ Enlace inválido. Solicita uno nuevo por WhatsApp.
     ```
   - ✅ Botón o link para volver atrás / solicitar nuevo enlace

3. **Backend validation (curl):**
```bash
curl -v "http://localhost:3000/api/web/customer-context?token=token-inexistente"
# Esperado: Response 404 con JSON
# {
#   "success": false,
#   "message": "Token inválido o expirado"
# }
```

---

### TC4: Token Expirado (410)

**Objetivo:** Token generado pero ya pasó su TTL.

**Pasos:**
1. Insertar token con expiración al pasado:
```sql
INSERT INTO conversations (
  phone_number, 
  current_state, 
  selected_service, 
  customer_dni, 
  web_token, 
  web_token_expires_at
) VALUES (
  '+34600000003',
  'web_form_access',
  'corte_laser',
  '11111111',
  'expired-token-tc4',
  NOW() - INTERVAL '1 minute'  -- Ya expiró hace 1 minuto
) ON CONFLICT (phone_number) 
DO UPDATE SET 
  web_token = 'expired-token-tc4',
  web_token_expires_at = NOW() - INTERVAL '1 minute'
RETURNING *;
```

2. Entrar: `http://localhost:4200/pedido/acceso?token=expired-token-tc4`

3. **Validaciones esperadas:**
   - ✅ **No** se muestra formulario
   - ✅ Se muestra error 410 con mensaje:
     ```
     ⏰ Tu enlace expiró. Solicita un nuevo enlace por WhatsApp.
     ```
   - ✅ Diferencia visual entre 404 (invalid) y 410 (expired)

4. **Backend validation (curl):**
```bash
curl -v "http://localhost:3000/api/web/customer-context?token=expired-token-tc4"
# Esperado: Response 410 con JSON
# {
#   "success": false,
#   "message": "Token expirado. Solicita un nuevo enlace desde WhatsApp."
# }
```

---

### TC5: Upload Exitoso - Corte Láser

**Objetivo:** Cliente completa formulario de pedido + carga archivo.

**Pasos:**
1. Entrar con token válido a `/pedido/corte-laser?token=valid-token-tc1-first-time`

2. Completar formulario:
   - **Especificaciones:** `Corte en acrilico, 10cm x 5cm`
   - **Material:** `Acrílico transparente` (si hay dropdown)
   - **Cantidad:** `2 unidades`
   - **Archivo de diseño:** Upload `test_design.dwg` (existe en proyecto)

3. Click en "Enviar Pedido"

4. **Validaciones esperadas:**
   - ✅ Spinner/loading visible
   - ✅ POST a `/api/orders/upload-files` con FormData:
     ```
     token: "valid-token-tc1-first-time"
     serviceType: "corte_laser"
     specifications: "Corte en acrilico, 10cm x 5cm"
     material: "Acrílico transparente"
     quantity: "2"
     file: <binary DWG>
     ```
   - ✅ Response 200 OK con estructura:
     ```json
     {
       "success": true,
       "message": "Pedido creado exitosamente",
       "orderId": "abc123def456",
       "status": "pending"
     }
     ```
   - ✅ Se muestra mensaje de éxito con **orderId**
   - ✅ Botón "Ver Estado" o link a estado del pedido
   - ✅ **NO** rompe UI (input fields permanecen visibles pero deshabilitados)

5. **Database validation:**
```sql
SELECT * FROM orders WHERE customer_dni = '12345678' ORDER BY created_at DESC LIMIT 1;
-- Verificar: status='pending', uploaded_files contiene el archivo, customer_name='Juan Pérez'
```

---

### TC6: Upload con Error - Validación Cliente

**Objetivo:** Capturar y mostrar errores sin romper UI.

**Pasos:**
1. Entrar a `/pedido/corte-laser?token=valid-token-tc1-first-time`

2. **Escenario A: Especificaciones vacías (validación requerida)**
   - Dejar vacíos: especificaciones
   - Click enviar
   - ✅ Error: `Las especificaciones son requeridas`
   - ✅ Form no se envía
   - ✅ Campo resaltado en rojo

3. **Escenario B: Archivo no enviado**
   - Llenar especificaciones pero no seleccionar archivo
   - Click enviar
   - ✅ Error: `Se requiere al menos un archivo`
   - ✅ Form no se envía

---

### TC7: Upload con Error - Backend (500)

**Objetivo:** Simular fallo servidor y recuperación graceful.

**Pasos:**
1. Completar formulario válido con archivo

2. **Simular error backend:**
   - Detener base de datos temporalmente O
   - Interceptar request en DevTools y modificar response a 500

3. **Validaciones esperadas:**
   - ✅ Modal/snackbar de error: `Error al procesar pedido. Intenta nuevamente.`
   - Parar el servidor backend (Ctrl+C en terminal)
   - Intentar submit del formulario

3. **Validaciones esperadas:**
   - ✅ Modal/snackbar de error: `Error al procesar pedido. Intenta nuevamente.`
   - ✅ Botón "Reintentar" visible
   - ✅ **No** se borra el formulario
   - ✅ Campos mantienen valores (no se resetean)
   - ✅ Se puede editar y reintentar sin recargar página
   - ✅ Una vez que backend vuelve online, `Reintentar` funcio
**Objetivo:** Integración end-to-end chatbot → web.

**Pasos (require Twilio Sandbox activo):**

1. **Enviar primer mensaje a Twilio:**
   ```
   Usuario WhatsApp: "Hola"
   ```

2. **Chatbot responda y genere link:**
   ```
   Bot: "¡Hola! 👋 Soy el asistente de ESIAD Proyectos SAC.
   Para procesar tu pedido, necesito algunos datos.
   ¿Cuál es tu DNI? (Ej: 12345678)"
   ```

3. **Usuario envía DNI:**
   ```
   Usuario: "98765432"
   ```

4. **Chatbot genera token y envía link:**
   ```
   Bot: "¡Gracias! Aquí está tu enlace para completar el registro: 
   http://localhost:4200/pedido/acceso?token=xxxx
   Este enlace vence en 120 minutos.
   
   Presiona el botón para continuar."
   ```

5. **Usuario abre link en navegador:**
   - Ver TC1 (registro) o TC2 (recurrente)
   - Completar flujo

6. **Validaciones finales:**
   - ✅ Orden creada en BD con `customer_dni` y `customer_name`
   - ✅ Archivo cargado en servidor
   - ✅ Estado inicial `pending`
   - ✅ Worker puede verlo en admin

---

## 🔍 Testing API Directo (curl)

Si necesitas probar sin UI, usa estos curl:

### Test 1: Obtener contexto del cliente (primera vez)
```bash
curl -X GET "http://localhost:3000/api/web/customer-context?token=valid-token-tc1-first-time"
# Esperado: 200
# {
#   "success": true,
#   "data": {
#     "customerDni": "12345678",
#     "customerName": null,
#     "isRegistered": false
#   }
# }
```

### Test 2: Obtener contexto del cliente (recurrente)
```bash
curl -X GET "http://localhost:3000/api/web/customer-context?token=valid-token-tc2-recurrent"
# Esperado: 200
# {
#   "success": true,
#   "data": {
#     "customerDni": "87654321",
#     "customerName": "María López",
#     "isRegistered": true
#   }
# }
```

### Test 3: Obtener contexto del formulario
```bash
curl -X GET "http://localhost:3000/api/web/form-context?token=valid-token-tc1-first-time"
# Esperado: 200
# {
#   "success": true,
#   "data": {
#     "serviceType": "corte_laser",
#     "serviceName": "Corte Láser",
#     "customerDni": "12345678",
#     "customerName": "Juan Pérez"
#   }
# }
```

### Test 4: Registrar cliente
```bash
curl -X POST "http://localhost:3000/api/web/customer-register" \
  -H "Content-Type: application/json" \
  -d '{"token": "valid-token-tc1-first-time", "name": "Juan Pérez"}'
# Esperado: 200
# {
#   "success": true,
#   "message": "Cliente registrado exitosamente",
#   "nextUrl": "/pedido/corte-laser?token=valid-token-tc1-first-time"
# }
```

### Test 5: Autenticar cliente
```bash
curl -X POST "http://localhost:3000/api/web/customer-authenticate" \
  -H "Content-Type: application/json" \
  -d '{"token": "valid-token-tc2-recurrent", "dni": "87654321"}'
# Esperado: 200
# {
#   "success": true,
#   "message": "Autenticación exitosa",
#   "nextUrl": "/pedido/corte-laser?token=valid-token-tc2-recurrent"
# }
```

### Test 6: Token inválido
```bash
curl -v "http://localhost:3000/api/web/customer-context?token=inexistente"
# Esperado: 404 NOT FOUND
# {
#   "success": false,
#   "message": "Token inválido o expirado"
# }
```

### Test 7: Token expirado
```bash
curl -v "http://localhost:3000/api/web/customer-context?token=expired-token-tc4"
# Esperado: 410 GONE
# {
#   "success": false,
#   "message": "Token expirado. Solicita un nuevo enlace desde WhatsApp."
# }
```

---

## 📊 Resumen de Validaciones

| Test Case | Endpoint | Method | Expected Status | Error Code | Validación Clave |
|-----------|----------|--------|-----------------|-----------|------------------|
| TC1 Primera Vez | /pedido/acceso?token=... | GET | 200 | - | Muestra REGISTRO, DNI readonly, Nombre editable |
| TC2 Recurrente | /pedido/acceso?token=... | GET | 200 | - | Muestra AUTH, ambos readonly |
| TC3 Token Inválido | /api/web/customer-context | GET | 404 | 404 | Mensaje "Enlace inválido" |
| TC4 Token Expirado | upload-files | POST | 200 | - | `{success: true, orderId: ...}` |
| TC6 Upload Error | /api/upload-files | POST | 400 | - | Error message visible, UI intacta |
| TC7 Backend Error | /apie-laser | Form | 200 | - | Error message visible, UI intacta |
| TC7 Backend Error | /api/orders/upload-files | POST | 500 | - | Modal de error, botón reintentar |
| TC8 WhatsApp Flow | /webhook/whatsapp | POST | 200 | - | Link generado, token válido en BD |

---

## 🚀 Checklist Final

- [ ] TC1: Primera vez usuario completa registro
- [ ] TC2: Usuario recurrente autentica rápidamente
- [ ] TC3: Error 404 mostrado con mensaje correcto
- [ ] TC4: Error 410 diferenciado de 404
- [ ] TC5: Archivo sube y orden se crea
- [ ] TC6: Errores cliente no rompen UI
- [ ] TC7: Error servidor manejado gracefully
- [ ] TC8: Flujo ChatBot → Web funciona end-to-end
- [ ] Database: Todas las órdenes tienen customer_name, customer_dni, web_token_expires_at poblados
- [ ] No hay console errors en DevTools
- [ ] Responsive design en mobile (test en <400px, 768px, 1024px)

---

## 📝 Notas

- Todos los tokens de prueba están hardcoded en `TESTING_MANUAL.md` para referencias rápidas
- Los SQL están optimizados para idempotencia (ON CONFLICT)
- Los curl pueden importarse en Postman como requests
- Package.json asume `npm start` inicia servidor en http://localhost:3000
