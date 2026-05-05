const express = require('express');
const { query } = require('../database');
const router = express.Router();

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token necessário' });
  try {
    const jwt = require('jsonwebtoken');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Token inválido' }); }
};

router.get('/', auth, async (req, res) => {
  const result = await query('SELECT * FROM products WHERE tenant_id = $1 AND active = true', [req.user.tenantId]);
  res.json(result.rows);
});

router.post('/', auth, async (req, res) => {
  const { name, description, price, category, stock, min_stock } = req.body;
  const result = await query(
    'INSERT INTO products (tenant_id, name, description, price, category, stock, min_stock) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [req.user.tenantId, name, description, price, category, stock || 0, min_stock || 5]
  );

  // Verifica estoque baixo e cria notificação
  if (stock <= (min_stock || 5)) {
    await query(
      'INSERT INTO notifications (tenant_id, type, title, message) VALUES ($1, $2, $3, $4)',
      [req.user.tenantId, 'low_stock', 'Estoque Baixo', `Produto ${name} está com estoque baixo (${stock} unidades)`]
    );
  }

  res.status(201).json(result.rows[0]);
});

module.exports = router;
