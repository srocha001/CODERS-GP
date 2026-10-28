const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1); // necessário atrás do Render/Railway (rate limit + IP real)
// Em produção, defina CORS_ORIGIN com o seu domínio. Sem ele, só a mesma origem é usada
// na prática, pois o front é servido pelo próprio back-end.
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '1mb' }));

// Anti força-bruta só no login / recuperação
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, message: { error: 'Muitas tentativas. Aguarde 15 minutos.' } });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'glassy-pm-backend' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/sprints', require('./routes/sprints'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/reminders', require('./routes/reminders'));

// Front-end: serve a pasta frontend/ (auth.html + index com API) em http://localhost:4000/
app.use('/frontend', express.static(path.join(__dirname, '..', 'frontend')));
app.get('/', (req, res) => res.redirect('/frontend/auth.html'));

// Erro genérico (nunca vaza stack em produção)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  const { initDb } = require('./init-db');
  initDb().finally(() => {
    app.listen(PORT, () => console.log(`Glassy PM API rodando em http://localhost:${PORT}  |  front em http://localhost:${PORT}/frontend/auth.html`));
  });
}
module.exports = app;
