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
  const result = await query(`
    SELECT o.*, t.number as table_number, t.name as table_name,
           json_agg(json_build_object(
             'id', oi.id, 'product_id', oi.product_id, 
             'product_name', p.name, 'quantity', oi.quantity,
             'unit_price', oi.unit_price, 'notes', oi.notes
           )) as items
    FROM orders o
    LEFT JOIN tables_map t ON o.table_id = t.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.tenant_id = $1 AND o.status = 'open'
    GROUP BY o.id, t.number, t.name
    ORDER BY o.created_at DESC
  `, [req.user.tenantId]);
  res.json(result.rows);
});

router.post('/', auth, async (req, res) => {
  const { table_id, items } = req.body;
  const client = await require('../database').pool.connect();

  try {
    await client.query('BEGIN');

    let total = 0;
    items.forEach(i => total += i.quantity * i.unit_price);

    const order = await client.query(
      'INSERT INTO orders (tenant_id, table_id, user_id, total) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.tenantId, table_id, req.user.userId, total]
    );

    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price, notes) VALUES ($1, $2, $3, $4, $5)',
        [order.rows[0].id, item.product_id, item.quantity, item.unit_price, item.notes]
      );
      // Atualiza estoque
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('COMMIT');

    // Cria job de impressão para cozinha
    await require('../database').query(
      'INSERT INTO print_jobs (tenant_id, type, content, printer_name) VALUES ($1, $2, $3, $4)',
      [req.user.tenantId, 'kitchen', JSON.stringify({ order_id: order.rows[0].id, items }), 'cozinha']
    );

    // Notifica via socket
    const io = req.app.get('io');
    io.to(`tenant-${req.user.tenantId}`).emit('new-order', order.rows[0]);

    res.status(201).json(order.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.post('/:id/close', auth, async (req, res) => {
  const { payment_method } = req.body;
  const result = await query(
    "UPDATE orders SET status = 'closed', payment_method = $1, closed_at = NOW() WHERE id = $2 RETURNING *",
    [payment_method, req.params.id]
  );

  // Job de impressão de recibo
  await query(
    'INSERT INTO print_jobs (tenant_id, type, content, printer_name) VALUES ($1, $2, $3, $4)',
    [req.user.tenantId, 'receipt', JSON.stringify(result.rows[0]), 'caixa']
  );

  res.json(result.rows[0]);
});

module.exports = router;
