// Migração: backup JSON do dashboard antigo (localStorage) -> API/Postgres
// Uso:
//   1) No dashboard antigo: Sidebar -> Exportar backup -> salva backup.json
//   2) Crie sua conta em http://localhost:4000/frontend/auth.html e faça login
//      (o token fica em localStorage do navegador, chave glassy_token — copie-o)
//   3) node scripts/migrate-localstorage.js backup.json --token=SEU_TOKEN
//      (ou: --api=http://localhost:4000 --token=...)
//
// O que migra: clientes (a partir do campo cliente dos projetos), projetos,
// sprints, tarefas (com coluna e ordem) e lembretes. Equipe/riscos/notas do
// dashboard antigo não têm tabela no novo banco e são apenas listados no final.
const fs = require('fs');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { api: 'http://localhost:4000', token: process.env.GLASSY_TOKEN || '' };
  for (const a of args) {
    if (a.startsWith('--api=')) out.api = a.slice(6);
    else if (a.startsWith('--token=')) out.token = a.slice(8);
    else if (!out.file) out.file = a;
  }
  return out;
}

async function api(base, token, path, method, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${data.error || res.status}`);
  return data;
}

async function main() {
  const { file, api: base, token } = parseArgs();
  if (!file || !token) {
    console.log('Uso: node scripts/migrate-localstorage.js backup.json --token=SEU_TOKEN');
    process.exit(1);
  }
  const old = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`Projetos antigos: ${(old.projects || []).length}, tarefas: ${(old.tasks || []).length}, sprints: ${(old.sprints || []).length}, lembretes: ${(old.reminders || []).length}`);

  const clientMap = {}; // nome do cliente antigo -> id novo
  for (const p of old.projects || []) {
    const cname = (p.cliente || '').trim();
    if (cname && !clientMap[cname]) {
      const c = await api(base, token, '/api/clients', 'POST', { name: cname });
      clientMap[cname] = c.id;
    }
  }
  const projectMap = {}; // id antigo -> id novo
  for (const p of old.projects || []) {
    const created = await api(base, token, '/api/projects', 'POST', {
      name: p.nome, description: p.desc || null, status: p.status || 'Em andamento',
      priority: p.prior || 'Média', budget: p.orc || 0, start_date: p.ini || null,
      end_date: p.fim || null, client_id: clientMap[(p.cliente || '').trim()] || null,
    });
    projectMap[p.id] = created.id;
    if (p.progress) { try { await api(base, token, `/api/projects/${created.id}`, 'PUT', { progress: p.progress }); } catch {} }
    console.log('Projeto:', p.nome);
  }
  const sprintMap = {};
  for (const s of old.sprints || []) {
    const created = await api(base, token, '/api/sprints', 'POST', {
      name: s.nome, goal: s.meta || null, start_date: s.ini || null, end_date: s.fim || null,
      project_id: projectMap[s.proj] || null,
    });
    sprintMap[s.id] = created.id;
  }
  // position: contador por (sprint, status)
  const pos = {};
  for (const t of old.tasks || []) {
    const key = `${t.sprint || ''}|${t.status || 'todo'}`;
    const position = pos[key] || 0; pos[key] = position + 1;
    const created = await api(base, token, '/api/tasks', 'POST', {
      title: t.titulo, status: t.status || 'todo', priority: t.prior || 'Média',
      due_date: t.data || null, project_id: projectMap[t.proj] || null,
      sprint_id: sprintMap[t.sprint] || null,
    });
    // POST já põe no fim da coluna; se a ordem antiga diferir, corrige com move
    if (position !== created.position) {
      await api(base, token, `/api/tasks/${created.id}/move`, 'PATCH', { status: created.status, position });
    }
  }
  for (const r of old.reminders || []) {
    const created = await api(base, token, '/api/reminders', 'POST', {
      title: r.titulo, type: r.tipo || 'Reunião', remind_date: r.data || null, remind_time: r.hora || null,
    });
    if (r.done) { try { await api(base, token, `/api/reminders/${created.id}`, 'PUT', { done: true }); } catch {} }
  }
  console.log('Migração concluída! Equipe/riscos/notas do antigo não foram migrados (sem tabela no novo banco).');
  console.log('Confira em http://localhost:4000/frontend/index.html');
}
main().catch((e) => { console.error('Falha na migração:', e.message); process.exit(1); });
