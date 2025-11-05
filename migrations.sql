-- Agregar nuevas columnas para soporte web
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS web_token VARCHAR(255);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS web_form_url TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS details TEXT; -- Para información adicional

-- Agregar nuevas columnas para orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS uploaded_files TEXT; -- JSON array
ALTER TABLE orders ADD COLUMN IF NOT EXISTS worker_review_status VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS file_upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;