const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth); // tudo aqui exige login e filtra por user_id

// GET /api/clients — lista só os clientes do usuário logado
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM clients WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
  res.json(rows);
});

// POST /api/clients
router.post('/', async (req, res) => {
  const { name, email, phone, company, notes } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
  const { rows } = await db.query(
    'INSERT INTO clients (user_id, name, email, phone, company, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.user.id, name.trim(), email || null, phone || null, company || null, notes || null]);
  res.status(201).json(rows[0]);
});

// PUT /api/clients/:id — o WHERE user_id impede alterar cliente de outro usuário
router.put('/:id', async (req, res) => {
  const { name, email, phone, company, notes } = req.body || {};
  const { rows } = await db.query(
    `UPDATE clients SET name=COALESCE($1,name), email=$2, phone=$3, company=$4, notes=$5, updated_at=now()
     WHERE id=$6 AND user_id=$7 RETURNING *`,
    [name || null, email || null, phone || null, company || null, notes || null, req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado.' });
  res.json(rows[0]);
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM clients WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!rowCount) return res.status(404).json({ error: 'Cliente não encontrado.' });
  res.json({ ok: true });
});

module.exports = router;
