-- Insertar token de prueba para testing
INSERT INTO conversations (phone_number, current_state, selected_service, web_token, web_form_url, created_at, updated_at)
VALUES ('+51987654321', 'awaiting_web_upload', 'corte_laser', 'test_token_123', 'http://localhost:3000/pedido/corte-laser?token=test_token_123', NOW(), NOW())
ON CONFLICT (phone_number) DO UPDATE SET
    current_state = 'awaiting_web_upload',
    selected_service = 'corte_laser',
    web_token = 'test_token_123',
    web_form_url = 'http://localhost:3000/pedido/corte-laser?token=test_token_123',
    updated_at = NOW();