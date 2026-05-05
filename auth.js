const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../database');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password, tenantName } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  const tenant = await query(
    'INSERT INTO tenants (name) VALUES ($1) RETURNING *',
    [tenantName]
  );

  const user = await query(
    'INSERT INTO users (tenant_id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [tenant.rows[0].id, name, email, hashed, 'admin']
  );

  const token = jwt.sign({ userId: user.rows[0].id, tenantId: tenant.rows[0].id }, process.env.JWT_SECRET);
  res.json({ token, user: user.rows[0], tenant: tenant.rows[0] });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas' });

  const valid = await bcrypt.compare(password, result.rows[0].password);
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

  const token = jwt.sign({ userId: result.rows[0].id, tenantId: result.rows[0].tenant_id }, process.env.JWT_SECRET);
  res.json({ token, user: result.rows[0] });
});

module.exports = router;
