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
  const result = await query(
    'SELECT * FROM notifications WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user.tenantId]
  );
  res.json(result.rows);
});

router.patch('/:id/read', auth, async (req, res) => {
  await query('UPDATE notifications SET read = true WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
