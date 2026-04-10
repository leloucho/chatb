#!/usr/bin/env node

/**
 * 🧪 Script para Generar Datos de Prueba
 * 
 * Uso:
 *   node load_test_data.js
 * 
 * Este script prepara toda la BD con clientes, conversaciones y tokens
 * listos para ejecutar los test cases del TESTING_MANUAL.md
 */

const { pool } = require('./src/database/database');

const testData = {
  customers: [
    {
      dni: '12345678',
      phoneNumber: '+34600000001',
      name: null,
      description: 'TC1 - Primera Vez (usuario nuevo)'
    },
    {
      dni: '87654321',
      phoneNumber: '+34600000002',
      name: 'María López',
      description: 'TC2 - Recurrente (usuario registrado)'
    },
    {
      dni: '11111111',
      phoneNumber: '+34600000003',
      name: null,
      description: 'TC4 - Token Expirado'
    }
  ],
  conversations: [
    {
      phoneNumber: '+34600000001',
      currentState: 'web_form_access',
      selectedService: 'corte_laser',
      customerDni: '12345678',
      webToken: 'valid-token-tc1-first-time',
      expiresInMinutes: 120,
      description: 'TC1 - Token válido, primera vez'
    },
    {
      phoneNumber: '+34600000002',
      currentState: 'web_form_access',
      selectedService: 'corte_laser',
      customerDni: '87654321',
      webToken: 'valid-token-tc2-recurrent',
      expiresInMinutes: 120,
      description: 'TC2 - Token válido, recurrente'
    },
    {
      phoneNumber: '+34600000003',
      currentState: 'web_form_access',
      selectedService: 'corte_laser',
      customerDni: '11111111',
      webToken: 'expired-token-tc4',
      expiresInMinutes: -1, // Hace 1 minuto
      description: 'TC4 - Token expirado'
    }
  ]
};

async function loadTestData() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando carga de datos de prueba...\n');

    // ========== CLIENTES ==========
    console.log('📝 Insertando clientes...');
    for (const customer of testData.customers) {
      const result = await client.query(
        `INSERT INTO customers (dni, phone_number, name, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (dni) 
         DO UPDATE SET phone_number = $2, name = $3, updated_at = NOW()
         RETURNING dni, phone_number, name;`,
        [customer.dni, customer.phoneNumber, customer.name]
      );

      console.log(
        `   ✅ ${customer.dni}: ${customer.name || '(sin nombre)'} [${customer.description}]`
      );
    }

    // ========== CONVERSACIONES ==========
    console.log('\n📞 Insertando conversaciones con tokens...');
    for (const conv of testData.conversations) {
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + conv.expiresInMinutes);

      const result = await client.query(
        `INSERT INTO conversations (
           phone_number, current_state, selected_service, customer_dni,
           web_token, web_token_expires_at, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (phone_number)
         DO UPDATE SET 
           web_token = $5,
           web_token_expires_at = $6,
           updated_at = NOW()
         RETURNING phone_number, web_token, web_token_expires_at;`,
        [
          conv.phoneNumber,
          conv.currentState,
          conv.selectedService,
          conv.customerDni,
          conv.webToken,
          expiryDate
        ]
      );

      const expiresAt = result.rows[0].web_token_expires_at;
      const isExpired = expiresAt < new Date();
      const status = isExpired ? '⏰ EXPIRADO' : '✅ VÁLIDO';

      console.log(
        `   ${status} ${conv.webToken}\n      Expira: ${expiresAt.toLocaleString()}\n      [${conv.description}]`
      );
    }

    // ========== RESUMEN ==========
    console.log('\n📊 Verificación final de datos cargados:\n');

    const customersResult = await client.query(
      `SELECT dni, phone_number, name FROM customers 
       WHERE dni IN ('12345678', '87654321', '11111111')
       ORDER BY dni;`
    );

    console.log('Clientes:');
    for (const row of customersResult.rows) {
      console.log(`  • DNI ${row.dni}: ${row.phone_number} → ${row.name || '(sin nombre)'}`);
    }

    const conversationsResult = await client.query(
      `SELECT phone_number, web_token, web_token_expires_at,
              CASE WHEN web_token_expires_at < NOW() THEN '⏰ EXPIRADO' 
                   ELSE '✅ VÁLIDO' END as status
       FROM conversations 
       WHERE phone_number IN ('+34600000001', '+34600000002', '+34600000003')
       ORDER BY phone_number;`
    );

    console.log('\nTokens:');
    for (const row of conversationsResult.rows) {
      console.log(
        `  • ${row.status} ${row.phone_number}: "${row.web_token}"`
      );
      console.log(`      Expira: ${row.web_token_expires_at.toLocaleString()}`);
    }

    // ========== INSTRUCCIONES ==========
    console.log('\n✨ Datos de prueba cargados exitosamente!\n');
    console.log('🔗 URLs para testing manual:\n');
    console.log('   TC1 (Primera vez):');
    console.log('   http://localhost:4200/pedido/acceso?token=valid-token-tc1-first-time\n');
    console.log('   TC2 (Recurrente):');
    console.log('   http://localhost:4200/pedido/acceso?token=valid-token-tc2-recurrent\n');
    console.log('   TC3 (Token inválido):');
    console.log('   http://localhost:4200/pedido/acceso?token=inexistente\n');
    console.log('   TC4 (Token expirado):');
    console.log('   http://localhost:4200/pedido/acceso?token=expired-token-tc4\n');

    console.log('📖 Ver TESTING_MANUAL.md para detalles completos de cada test case.\n');

  } catch (error) {
    console.error('❌ Error al cargar datos:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
loadTestData()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falló:', error);
    process.exit(1);
  });
