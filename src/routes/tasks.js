const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);

const STATUSES = ['todo', 'doing', 'done'];

// GET /api/tasks?sprint_id=... — ordenado por status e position: é a ordem do Kanban
router.get('/', async (req, res) => {
  const { sprint_id, project_id } = req.query;
  const params = [req.user.id]; let where = 'WHERE user_id=$1';
  if (sprint_id) { params.push(sprint_id); where += ` AND sprint_id=$${params.length}`; }
  if (project_id) { params.push(project_id); where += ` AND project_id=$${params.length}`; }
  const { rows } = await db.query(`SELECT * FROM tasks ${where} ORDER BY status, position, created_at`, params);
  res.json(rows);
});

// POST /api/tasks — position = fim da coluna de destino
router.post('/', async (req, res) => {
  const { title, description, status, priority, due_date, project_id, sprint_id } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Título da tarefa é obrigatório.' });
  const st = STATUSES.includes(status) ? status : 'todo';
  const pos = await db.query(
    'SELECT COALESCE(MAX(position),-1)+1 AS p FROM tasks WHERE user_id=$1 AND sprint_id IS NOT DISTINCT FROM $2 AND status=$3',
    [req.user.id, sprint_id || null, st]);
  const { rows } = await db.query(
    `INSERT INTO tasks (user_id, project_id, sprint_id, title, description, status, priority, due_date, position)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.user.id, project_id || null, sprint_id || null, title.trim(), description || null, st,
     priority || 'Média', due_date || null, pos.rows[0].p]);
  res.status(201).json(rows[0]);
});

// PUT /api/tasks/:id — edição normal (título, prazo, prioridade, projeto, sprint)
router.put('/:id', async (req, res) => {
  const f = req.body || {};
  const { rows } = await db.query(
    `UPDATE tasks SET title=COALESCE($1,title), description=$2, priority=COALESCE($3,priority),
     due_date=$4, project_id=$5, sprint_id=$6, updated_at=now()
     WHERE id=$7 AND user_id=$8 RETURNING *`,
    [f.title || null, f.description ?? null, f.priority || null, f.due_date ?? null,
     f.project_id ?? null, f.sprint_id ?? null, req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Tarefa não encontrada.' });
  res.json(rows[0]);
});

// PATCH /api/tasks/:id/move — DRAG AND DROP
// Body: { status: 'todo'|'doing'|'done', position: 0 }
// Salva coluna + ordem em tempo real, em transação, e reordena as outras tarefas da coluna.
// O front chama isso no evento 'drop' (veja frontend/kanban.js).
router.patch('/:id/move', async (req, res) => {
  const { status, position } = req.body || {};
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Coluna inválida. Use todo, doing ou done.' });
  const newPos = Math.max(0, parseInt(position, 10) || 0);
  try {
    const moved = await db.withClient(async (c) => {
      const cur = await c.query('SELECT id, sprint_id, status, position FROM tasks WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      if (!cur.rows[0]) return null;
      const t = cur.rows[0];
      // 1) Fecha o buraco na coluna de origem
      await c.query(
        'UPDATE tasks SET position = position - 1 WHERE user_id=$1 AND sprint_id IS NOT DISTINCT FROM $2 AND status=$3 AND position > $4',
        [req.user.id, t.sprint_id, t.status, t.position]);
      // 2) Abre espaço na coluna de destino (se for a mesma coluna, a posição já foi ajustada acima)
      await c.query(
        'UPDATE tasks SET position = position + 1 WHERE user_id=$1 AND sprint_id IS NOT DISTINCT FROM $2 AND status=$3 AND position >= $4 AND id <> $5',
        [req.user.id, t.sprint_id, status, newPos, t.id]);
      // 3) Move a tarefa
      const { rows } = await c.query(
        'UPDATE tasks SET status=$1, position=$2, updated_at=now() WHERE id=$3 AND user_id=$4 RETURNING *',
        [status, newPos, t.id, req.user.id]);
      return rows[0];
    });
    if (!moved) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    return res.json(moved);
  } catch (e) {
    console.error(e); return res.status(500).json({ error: 'Erro ao mover tarefa.' });
  }
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM tasks WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!rowCount) return res.status(404).json({ error: 'Tarefa não encontrada.' });
  res.json({ ok: true });
});

module.exports = router;
