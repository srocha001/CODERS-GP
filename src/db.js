const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.warn('[db] DATABASE_URL não definida. Defina no .env (veja .env.example).');
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => console.error('[db] erro no pool:', err.message));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  // Transação simples para o move do Kanban (reordenar em 1 operação atômica)
  withClient: async (fn) => {
    const client = await pool.connect();
    try { await client.query('BEGIN'); const r = await fn(client); await client.query('COMMIT'); return r; }
    catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  },
};
