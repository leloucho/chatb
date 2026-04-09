-- Agregar nuevas columnas para soporte web
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS web_token VARCHAR(255);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS web_form_url TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS details TEXT; -- Para información adicional
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_dni VARCHAR(8);

-- Agregar nuevas columnas para orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS uploaded_files TEXT; -- JSON array
ALTER TABLE orders ADD COLUMN IF NOT EXISTS worker_review_status VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS file_upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_dni VARCHAR(8);

-- Tabla de clientes por DNI
CREATE TABLE IF NOT EXISTS customers (
	id SERIAL PRIMARY KEY,
	dni VARCHAR(8) UNIQUE NOT NULL,
	phone_number VARCHAR(20) NOT NULL,
	name VARCHAR(100),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_dni ON customers(dni);
CREATE INDEX IF NOT EXISTS idx_customers_phone_number ON customers(phone_number);