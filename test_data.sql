-- ============================================================================
-- SCRIPT DE DATOS DE PRUEBA - TESTING MANUAL
-- ============================================================================
-- Copia y pega este script en pgAdmin o psql para populat la BD con 
-- clientes, conversaciones y tokens de prueba.
-- 
-- ⚠️  IDEMPOTENTE: Puedes correr múltiples veces sin errores
-- ============================================================================

-- Limpiar datos previos (OPCIONAL - comentar si quieres mantener datos existentes)
-- DELETE FROM orders WHERE customer_dni IN ('12345678', '87654321', '11111111');
-- DELETE FROM conversations WHERE phone_number IN ('+34600000001', '+34600000002', '+34600000003');
-- DELETE FROM customers WHERE dni IN ('12345678', '87654321', '11111111');

-- ============================================================================
-- TC1: PRIMERA VEZ - Cliente nuevo sin registro
-- ============================================================================

INSERT INTO customers (dni, phone_number, name, created_at)
VALUES ('12345678', '+34600000001', NULL, NOW())
ON CONFLICT (dni) DO NOTHING;

INSERT INTO conversations (
  phone_number, 
  current_state, 
  selected_service, 
  customer_dni, 
  web_token, 
  web_token_expires_at,
  created_at,
  updated_at
) VALUES (
  '+34600000001',
  'web_form_access',
  'corte_laser',
  '12345678',
  'valid-token-tc1-first-time',
  NOW() + INTERVAL '120 minutes',
  NOW(),
  NOW()
) ON CONFLICT (phone_number) 
DO UPDATE SET 
  web_token = 'valid-token-tc1-first-time',
  web_token_expires_at = NOW() + INTERVAL '120 minutes',
  updated_at = NOW();

-- ============================================================================
-- TC2: RECURRENTE - Cliente registrado
-- ============================================================================

INSERT INTO customers (dni, phone_number, name, created_at)
VALUES ('87654321', '+34600000002', 'María López', NOW())
ON CONFLICT (dni) DO NOTHING;

INSERT INTO conversations (
  phone_number, 
  current_state, 
  selected_service, 
  customer_dni, 
  web_token, 
  web_token_expires_at,
  created_at,
  updated_at
) VALUES (
  '+34600000002',
  'web_form_access',
  'corte_laser',
  '87654321',
  'valid-token-tc2-recurrent',
  NOW() + INTERVAL '120 minutes',
  NOW(),
  NOW()
) ON CONFLICT (phone_number) 
DO UPDATE SET 
  web_token = 'valid-token-tc2-recurrent',
  web_token_expires_at = NOW() + INTERVAL '120 minutes',
  updated_at = NOW();

-- ============================================================================
-- TC4: TOKEN EXPIRADO - Token que ya pasó su TTL
-- ============================================================================

INSERT INTO customers (dni, phone_number, name, created_at)
VALUES ('11111111', '+34600000003', NULL, NOW())
ON CONFLICT (dni) DO NOTHING;

INSERT INTO conversations (
  phone_number, 
  current_state, 
  selected_service, 
  customer_dni, 
  web_token, 
  web_token_expires_at,
  created_at,
  updated_at
) VALUES (
  '+34600000003',
  'web_form_access',
  'corte_laser',
  '11111111',
  'expired-token-tc4',
  NOW() - INTERVAL '1 minute',  -- Ya expiró hace 1 minuto
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 minute'
) ON CONFLICT (phone_number) 
DO UPDATE SET 
  web_token = 'expired-token-tc4',
  web_token_expires_at = NOW() - INTERVAL '1 minute',
  updated_at = NOW();

-- ============================================================================
-- VERIFICACIONES - Validar que los datos quedaron correctos
-- ============================================================================

-- Ver todos los clientes de prueba
SELECT 
  'CUSTOMERS' as tipo,
  dni, 
  phone_number, 
  name, 
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM customers 
WHERE dni IN ('12345678', '87654321', '11111111')
ORDER BY dni;

-- Ver todas las conversaciones de prueba
SELECT 
  'CONVERSATIONS' as tipo,
  phone_number,
  current_state,
  selected_service,
  customer_dni,
  web_token,
  TO_CHAR(web_token_expires_at, 'YYYY-MM-DD HH24:MI:SS') as token_expires,
  CASE 
    WHEN web_token_expires_at < NOW() THEN '⏰ EXPIRADO'
    ELSE '✅ VÁLIDO'
  END as token_status
FROM conversations 
WHERE phone_number IN ('+34600000001', '+34600000002', '+34600000003')
ORDER BY phone_number;

-- ============================================================================
-- INFORMACIÓN PARA TESTING MANUAL
-- ============================================================================

/*
TOKENS POR TEST CASE:

TC1 (Primera Vez):
  URL: http://localhost:4200/pedido/acceso?token=valid-token-tc1-first-time
  DNI: 12345678
  Nombre: [vacío - usuario debe ingresar]
  Token expira en: 120 minutos desde ahora
  Esperado: Formulario de REGISTRO

TC2 (Recurrente):
  URL: http://localhost:4200/pedido/acceso?token=valid-token-tc2-recurrent
  DNI: 87654321
  Nombre: María López (pre-cargado)
  Token expira en: 120 minutos desde ahora
  Esperado: Formulario de AUTENTICACIÓN

TC3 (Invalid Token):
  URL: http://localhost:4200/pedido/acceso?token=inexistente
  Esperado: Error 404 "Enlace inválido"

TC4 (Expired Token):
  URL: http://localhost:4200/pedido/acceso?token=expired-token-tc4
  DNI: 11111111
  Token expira en: [HACE 1 MINUTO] ⏰
  Status: EXPIRADO
  Esperado: Error 410 "Tu enlace expiró"

CURL PARA VERIFICAR TOKENS:

1. Contexto de cliente (TC1):
   curl "http://localhost:3000/api/web/customer-context?token=valid-token-tc1-first-time"

2. Contexto de cliente (TC2):
   curl "http://localhost:3000/api/web/customer-context?token=valid-token-tc2-recurrent"

3. Contexto expirado (TC4):
   curl -v "http://localhost:3000/api/web/customer-context?token=expired-token-tc4"

*/
