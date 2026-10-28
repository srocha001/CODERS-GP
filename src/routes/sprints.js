const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);

// Sprints + suas tarefas já ordenadas por coluna e posição (o Kanban usa isso direto)
router.get('/', async (req, res) => {
  const { project_id } = req.query;
  const params = [req.user.id];
  let where = 'WHERE s.user_id=$1';
  if (project_id) { params.push(project_id); where += ` AND s.project_id=$${params.length}`; }
  const { rows } = await db.query(`SELECT * FROM sprints s ${where} ORDER BY s.created_at DESC`, params);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, goal, start_date, end_date, project_id } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Nome da sprint é obrigatório.' });
  const { rows } = await db.query(
    'INSERT INTO sprints (user_id, project_id, name, goal, start_date, end_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.user.id, project_id || null, name.trim(), goal || null, start_date || null, end_date || null]);
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const f = req.body || {};
  const { rows } = await db.query(
    `UPDATE sprints SET name=COALESCE($1,name), goal=$2, start_date=$3, end_date=$4, status=COALESCE($5,status), updated_at=now()
     WHERE id=$6 AND user_id=$7 RETURNING *`,
    [f.name || null, f.goal ?? null, f.start_date ?? null, f.end_date ?? null, f.status || null, req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Sprint não encontrada.' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM sprints WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!rowCount) return res.status(404).json({ error: 'Sprint não encontrada.' });
  res.json({ ok: true });
});

module.exports = router;
