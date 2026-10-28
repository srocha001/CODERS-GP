const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { z } = require('zod');
const db = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { sendResetEmail } = require('../utils/mail');

const router = express.Router();
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido').transform((s) => s.toLowerCase()),
  password: z.string().min(8, 'Senha precisa ter pelo menos 8 caracteres'),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

// POST /api/auth/register — cria usuário, senha com bcrypt (nunca em texto)
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { name, email, password } = parsed.data;
  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email, created_at',
      [name, email, hash],
    );
    const user = rows[0];
    return res.status(201).json({ user, token: signToken(user) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Já existe uma conta com este email.' });
    console.error(e); return res.status(500).json({ error: 'Erro ao criar conta.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Email ou senha inválidos.' });
  const { email, password } = parsed.data;
  const { rows } = await db.query('SELECT id, name, email, password_hash FROM users WHERE email=$1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Email ou senha incorretos.' }); // mensagem genérica de propósito
  }
  delete user.password_hash;
  return res.json({ user, token: signToken(user) });
});

// GET /api/auth/me — valida o token e devolve o usuário (proteção de rotas no front)
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await db.query('SELECT id, name, email, avatar_url, created_at FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado.' });
  return res.json({ user: rows[0] });
});

// PUT /api/auth/me — dados da conta (nome, avatar). Troca de senha em /change-password.
router.put('/me', requireAuth, async (req, res) => {
  const { name, avatar_url } = req.body || {};
  if (name && String(name).trim().length < 2) return res.status(400).json({ error: 'Nome muito curto.' });
  const { rows } = await db.query(
    'UPDATE users SET name=COALESCE($1,name), avatar_url=COALESCE($2,avatar_url), updated_at=now() WHERE id=$3 RETURNING id, name, email, avatar_url',
    [name || null, avatar_url || null, req.user.id],
  );
  return res.json({ user: rows[0] });
});

// PUT /api/auth/change-password — exige senha atual
router.put('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Nova senha precisa ter pelo menos 8 caracteres.' });
  const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword || '', rows[0].password_hash))) {
    return res.status(401).json({ error: 'Senha atual incorreta.' });
  }
  const hash = await bcrypt.hash(newPassword, 12);
  await db.query('UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2', [hash, req.user.id]);
  return res.json({ ok: true });
});

// POST /api/auth/forgot-password — sempre responde ok (não revela se o email existe)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (email) {
    const { rows } = await db.query('SELECT id FROM users WHERE email=$1', [String(email).toLowerCase()]);
    if (rows[0]) {
      const token = crypto.randomBytes(32).toString('hex'); // token puro só vai por email
      await db.query(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1,$2,now() + interval \'1 hour\')',
        [rows[0].id, sha256(token)],
      );
      const url = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/frontend/auth.html?reset=${token}`;
      await sendResetEmail(email, url);
    }
  }
  return res.json({ ok: true, message: 'Se o email existir, você receberá o link de redefinição.' });
});

// POST /api/auth/reset-password — token de uso único, expira em 1h
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Token ou nova senha inválidos.' });
  }
  const { rows } = await db.query(
    'SELECT id, user_id FROM password_resets WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now()',
    [sha256(token)],
  );
  if (!rows[0]) return res.status(400).json({ error: 'Link inválido ou expirado.' });
  const hash = await bcrypt.hash(newPassword, 12);
  await db.withClient(async (c) => {
    await c.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, rows[0].user_id]);
    await c.query('UPDATE password_resets SET used_at=now() WHERE id=$1', [rows[0].id]);
  });
  return res.json({ ok: true });
});

module.exports = router;
