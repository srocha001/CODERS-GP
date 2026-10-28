const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT p.*, c.name AS client_name FROM projects p LEFT JOIN clients c ON c.id=p.client_id
     WHERE p.user_id=$1 ORDER BY p.created_at DESC`, [req.user.id]);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, description, status, priority, budget, start_date, end_date, client_id } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Nome do projeto é obrigatório.' });
  const { rows } = await db.query(
    `INSERT INTO projects (user_id, client_id, name, description, status, priority, budget, start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.user.id, client_id || null, name.trim(), description || null, status || 'Em andamento',
     priority || 'Média', budget || 0, start_date || null, end_date || null]);
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const f = req.body || {};
  const { rows } = await db.query(
    `UPDATE projects SET name=COALESCE($1,name), description=$2, status=COALESCE($3,status),
     priority=COALESCE($4,priority), budget=COALESCE($5,budget), start_date=$6, end_date=$7,
     progress=COALESCE($8,progress), client_id=$9, updated_at=now()
     WHERE id=$10 AND user_id=$11 RETURNING *`,
    [f.name || null, f.description ?? null, f.status || null, f.priority || null, f.budget ?? null,
     f.start_date ?? null, f.end_date ?? null, f.progress ?? null, f.client_id ?? null, req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Projeto não encontrado.' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM projects WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!rowCount) return res.status(404).json({ error: 'Projeto não encontrado.' });
  res.json({ ok: true });
});

module.exports = router;
