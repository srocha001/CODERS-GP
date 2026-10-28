const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);
router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM reminders WHERE user_id=$1 ORDER BY remind_date, remind_time', [req.user.id]);
  res.json(rows);
});
router.post('/', async (req, res) => {
  const { title, type, remind_date, remind_time } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Título do lembrete é obrigatório.' });
  const { rows } = await db.query(
    'INSERT INTO reminders (user_id, title, type, remind_date, remind_time) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.user.id, title, type || 'Reunião', remind_date || null, remind_time || null]);
  res.status(201).json(rows[0]);
});
router.put('/:id', async (req, res) => {
  const f = req.body || {};
  const { rows } = await db.query(
    'UPDATE reminders SET title=COALESCE($1,title), type=COALESCE($2,type), done=COALESCE($3,done) WHERE id=$4 AND user_id=$5 RETURNING *',
    [f.title || null, f.type || null, f.done ?? null, req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Lembrete não encontrado.' });
  res.json(rows[0]);
});
router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM reminders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!rowCount) return res.status(404).json({ error: 'Lembrete não encontrado.' });
  res.json({ ok: true });
});
module.exports = router;
