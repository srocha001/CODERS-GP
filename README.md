# Glassy PM — Back-end Node.js + Express + PostgreSQL

Front-end visual que você já tinha (Glassy PM) + agora back-end real, banco de dados e login.

## O que foi entregue

- **Auth completa:** cadastro, login, `GET /auth/me` (proteção de rota), troca de senha, esqueci minha senha com token de uso único (1h, guardado como hash) e envio por email (ou log no console em dev).
- **Segurança:** senha com bcrypt (12 rounds), JWT (7 dias), `Authorization: Bearer`, rate limit no login, e **todas** as queries filtram por `user_id` — um usuário nunca vê dado de outro.
- **CRUD:** clientes, projetos, sprints, tarefas e lembretes.
- **Kanban drag-and-drop:** `PATCH /api/tasks/:id/move` salva coluna (`todo/doing/done`) + posição em transação no PostgreSQL, em tempo real. O front (`frontend/kanban.js`) faz rollback visual se a API falhar.

## Subir em 5 minutos

### Opção A — Docker (recomendada, sem instalar Postgres)
```bash
docker compose up -d   # sobe só o Postgres na porta 5432
cp .env.example .env   # edite JWT_SECRET
psql "postgres://glassy:glassy123@localhost:5432/glassy_pm" -f schema.sql
npm install
npm run dev            # http://localhost:4000  ->  /frontend/auth.html
```

### Opção B — Postgres local
```bash
createdb glassy_pm
psql glassy_pm -f schema.sql
cp .env.example .env
npm install && npm run dev
```

Sem Docker e sem Postgres instalado na máquina, o servidor sobe mas as rotas de banco falham — é esperado, suba o Postgres primeiro.

## Front-end

- `frontend/auth.html` — entrar, cadastrar, esqueci minha senha, redefinir por link (`?reset=TOKEN`).
- `frontend/index.html` — seu Glassy PM atual, já com proteção de rota (sem token vai para `auth.html`) e colunas do sprint como Kanban arrastável.
- `frontend/api-client.js` — `PM_API.register/login/me/forgotPassword/resetPassword`, CRUDs e `moveTask(id, status, position)`.
- `frontend/kanban.js` — `initKanban()` + `kanbanCardHTML(task)`. No seu HTML: card com `class="kanban-card" data-task-id`, coluna com `class="kanban-column" data-status`.

## Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| POST | /api/auth/register | Cadastro (bcrypt) |
| POST | /api/auth/login | Login (JWT) |
| GET | /api/auth/me | Usuário do token |
| PUT | /api/auth/change-password | Troca com senha atual |
| POST | /api/auth/forgot-password | Envia link (sempre ok, não revela email) |
| POST | /api/auth/reset-password | Token único, 1h |
| GET/POST/PUT/DELETE | /api/clients, /api/projects, /api/sprints, /api/reminders | CRUD por usuário |
| GET/POST/PUT/DELETE | /api/tasks | CRUD de tarefas |
| PATCH | /api/tasks/:id/move | Drag-and-drop: `{status, position}` |

Exemplo Kanban:
```bash
curl -X PATCH http://localhost:4000/api/tasks/<id>/move \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"doing","position":0}'
```

## Migração do localStorage antigo

Seu dashboard antigo guardava tudo no navegador. Para migrar: no dashboard antigo, Sidebar → Exportar backup (JSON), e depois importe os projetos/tarefas pela API (ou cadastre os principais de novo — o formato novo é relacional, com cliente e sprint separados, e vale a pena essa limpeza).

## Produção (checklist rápido)

1. `JWT_SECRET` longo e aleatório, `NODE_ENV=production`, HTTPS obrigatório.
2. SMTP real no `.env` para o email de reset funcionar de verdade.
3. Postgres com backup, e nunca exponha a porta 5432 na internet.
4. Front servido pelo mesmo domínio da API (ou CORS restrito ao seu domínio).
