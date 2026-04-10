# 🚀 Quick Testing Cheatsheet

## ⚡ 1-Minute Setup

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Load test data
node load_test_data.js  # Carga clientes + tokens automáticamente

# Terminal 3: Frontend (si existe)
ng serve
```

---

## 🔗 URLs Rápidas por Test Case

### TC1: Primera Vez (Usuario Nuevo → Registro)
```
http://localhost:4200/pedido/acceso?token=valid-token-tc1-first-time
```
✅ Esperado: Muestra formulario de REGISTRO
- DNI: 12345678 (readonly)
- Nombre: vacío (editable)
- Botón: "Registrarse"

### TC2: Recurrente (Usuario Registrado → Auth)
```
http://localhost:4200/pedido/acceso?token=valid-token-tc2-recurrent
```
✅ Esperado: Muestra formulario de AUTENTICACIÓN
- DNI: 87654321 (readonly)
- Nombre: María López (readonly)
- Botón: "Continuar"

### TC3: Token Inválido (404)
```
http://localhost:4200/pedido/acceso?token=inexistente
```
❌ Esperado: Error 404
- Mensaje: "Enlace inválido. Solicita uno nuevo por WhatsApp."

### TC4: Token Expirado (410)
```
http://localhost:4200/pedido/acceso?token=expired-token-tc4
```
⏰ Esperado: Error 410
- Mensaje: "Tu enlace expiró. Solicita un nuevo enlace por WhatsApp."

### TC5: Upload Exitoso (Corte Láser)
```
http://localhost:4200/pedido/corte-laser?token=valid-token-tc1-first-time
```
✅ Esperado: 
1. Llenar: Especificaciones + Cantidad + Archivo
2. Submit → Orden creada con orderId
3. Mensaje de éxito

---

## 🧪 Curl Commands

### Verificar Token Válido (Primera Vez)
```bash
curl http://localhost:3000/api/web/customer-context?token=valid-token-tc1-first-time
# 200: {"success": true, "data": {"customerDni": "12345678", "customerName": null, "isRegistered": false}}
```

### Verificar Token Válido (Recurrente)
```bash
curl http://localhost:3000/api/web/customer-context?token=valid-token-tc2-recurrent
# 200: {"success": true, "data": {"customerDni": "87654321", "customerName": "María López", "isRegistered": true}}
```

### Verificar Token Expirado
```bash
curl -v http://localhost:3000/api/web/customer-context?token=expired-token-tc4
# 410: {"success": false, "message": "Token expirado..."}
```

### Verificar Token Inválido
```bash
curl -v http://localhost:3000/api/web/customer-context?token=inexistente
# 404: {"success": false, "message": "Token inválido..."}
```

### Registrar Cliente
```bash
curl -X POST http://localhost:3000/api/web/customer-register \
  -H "Content-Type: application/json" \
  -d '{"token":"valid-token-tc1-first-time", "name":"Juan Pérez"}'
# 200: {"success": true, "nextUrl": "/pedido/corte-laser?token=..."}
```

### Autenticar Cliente
```bash
curl -X POST http://localhost:3000/api/web/customer-authenticate \
  -H "Content-Type: application/json" \
  -d '{"token":"valid-token-tc2-recurrent", "dni":"87654321"}'
# 200: {"success": true, "nextUrl": "/pedido/corte-laser?token=..."}
```

### Upload Archivo
```bash
curl -X POST http://localhost:3000/api/upload-files \
  -F "token=valid-token-tc1-first-time" \
  -F "serviceType=corte_laser" \
  -F "specifications=Corte en acrilico" \
  -F "quantity=2" \
  -F "files=@test_design.dwg"
# 200: {"success": true, "orderId": "..."}
```

---

## ✅ Quick Validation Checklist

- [ ] TC1: Formulario Registro muestra correctamente
- [ ] TC2: Formulario Autenticación muestra correctamente
- [ ] TC3: Error 404 con mensaje correcto
- [ ] TC4: Error 410 diferenciado de 404
- [ ] TC5: Archivo sube sin errores
- [ ] DevTools: No hay console errors
- [ ] Responsive: Funciona en móvil (<400px)

---

## 🔧 Troubleshooting

### Ya ejecuté TC1 y no quiero regenerar?
```bash
# Los tokens de prueba permanecen en BD después de load_test_data.js
# Solo es necesario `node load_test_data.js` UNA VEZ
# Los siguientes tests reutilizan los mismos tokens
```

### Quiero resetear completamente?
```bash
# Opción 1: Borrar registro específico
psql -U usuario -d pedidos -c "DELETE FROM conversations WHERE web_token LIKE 'valid-token-%' OR web_token LIKE 'expired-token-%';"

# Opción 2: Volver a correr load_test_data.js
node load_test_data.js  # Las rutas ON CONFLICT actualizan automáticamente
```

### El token expirado ya no es "expirado"?
```bash
# Los tokens se regeneran cada vez que corres load_test_data.js
# Para crear permanentemente un token expirado, edita test_data.sql 
# Línea: NOW() - INTERVAL '1 day'  (cambiar '1 minute' por '1 day')
```

---

## 📊 Response Status Codes

| Status | Significa | Qué Revisar |
|--------|-----------|------------|
| 200 | OK | Respuesta válida con datos |
| 404 | Not Found | Token no existe en BD |
| 410 | Gone | Token expirado (web_token_expires_at < NOW()) |
| 400 | Bad Request | Falta campo requerido en body |
| 500 | Server Error | Error en backend, revisar logs |

---

## 📚 Documentos Completos

| Documento | Propósito |
|-----------|-----------|
| [TESTING_MANUAL.md](./TESTING_MANUAL.md) | Guía detallada de cada test case con SQL |
| [ENDPOINTS_VERIFICATION.md](./ENDPOINTS_VERIFICATION.md) | Validación de todos los endpoints |
| [test_data.sql](./test_data.sql) | Script SQL para cargar datos |
| [load_test_data.js](./load_test_data.js) | Script Node.js para cargar datos |

---

**Last Updated:** 2026-04-10  
**Status:** ✅ Backend Ready for Integration Testing
