const { pool } = require('./index');

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      plan VARCHAR(50) DEFAULT 'essencial',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'caixa',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      category VARCHAR(100),
      image_url TEXT,
      active BOOLEAN DEFAULT true,
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tables_map (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      number INTEGER NOT NULL,
      name VARCHAR(100),
      status VARCHAR(20) DEFAULT 'free',
      x_position INTEGER DEFAULT 0,
      y_position INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      table_id UUID REFERENCES tables_map(id),
      user_id UUID REFERENCES users(id),
      status VARCHAR(20) DEFAULT 'open',
      total DECIMAL(10,2) DEFAULT 0,
      payment_method VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW(),
      closed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES orders(id),
      product_id UUID REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      notes TEXT,
      printed BOOLEAN DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS print_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      type VARCHAR(50) NOT NULL,
      content JSONB NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      printer_name VARCHAR(255),
      attempts INTEGER DEFAULT 0,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255),
      message TEXT,
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ Banco de dados inicializado!');
  process.exit(0);
};

initDB().catch(console.error);
