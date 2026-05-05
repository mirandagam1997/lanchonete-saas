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
  const result = await query('SELECT * FROM tables_map WHERE tenant_id = $1 ORDER BY number', [req.user.tenantId]);
  res.json(result.rows);
});

router.post('/', auth, async (req, res) => {
  const { number, name, x_position, y_position } = req.body;
  const result = await query(
    'INSERT INTO tables_map (tenant_id, number, name, x_position, y_position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [req.user.tenantId, number, name, x_position || 0, y_position || 0]
  );
  res.status(201).json(result.rows[0]);
});

router.patch('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  const result = await query(
    'UPDATE tables_map SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  res.json(result.rows[0]);
});

module.exports = router;
