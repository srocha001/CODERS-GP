const fs = require('fs');
const path = require('path');
const db = require('./db');

// Cria as tabelas automaticamente na primeira subida (Render, Railway, local).
// É idempotente: CREATE TABLE IF NOT EXISTS, então rodar de novo não apaga nada.
// Assim você NÃO precisa rodar psql manualmente no deploy.
async function initDb() {
  try {
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await db.query(sql);
    console.log('[db] Schema aplicado/verificado com sucesso.');
  } catch (e) {
    console.warn('[db] Não consegui aplicar o schema agora:', e.message);
    console.warn('[db] O servidor vai subir mesmo assim. Verifique DATABASE_URL e rode schema.sql manualmente se precisar.');
  }
}
module.exports = { initDb };
