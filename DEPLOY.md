# Acessar de qualquer lugar — deploy do Glassy PM

Boa notícia: o pacote já está pronto para subir. Você continua usando
local agora, e quando quiser, sobe o mesmo código — sem reescrever nada.

## O que muda quando vai para a nuvem?

| | Na sua máquina | Online |
|---|---|---|
| Onde roda | Seu computador, Docker | Um servidor (Render/Railway/VPS) |
| Acesso | Só nesse computador | Qualquer lugar, com login e senha |
| Banco | Postgres no Docker local | Postgres gerenciado na nuvem |
| Custo | R$ 0 | A partir de ~US$ 6–13/mês para ficar sempre ligado |
| Backup | Você faz (pg_dump / export) | Automático no plano pago |

O GitHub continua sendo só o intermediário: você sobe o código lá (privado)
e o serviço de deploy puxa de lá. O banco online é separado do local.

## Opção recomendada para você (mais simples): Render

1. Siga o `GITHUB.md` e suba o código para um repositório **privado**.
2. Crie conta no Render (render.com) e clique em **New → Blueprint**.
3. Conecte o repositório. O arquivo `render.yaml` já cria:
   - o serviço web (API + front, Dockerfile),
   - o banco Postgres,
   - `DATABASE_URL` e `JWT_SECRET` automaticamente.
4. No primeiro deploy, o schema é aplicado sozinho: o servidor roda
   `schema.sql` na subida (`src/init-db.js`, idempotente). Você não
   precisa de psql. Se quiser confirmar, veja nos Logs do serviço a linha
   `[db] Schema aplicado/verificado com sucesso.`
5. Abra a URL que o Render deu (ex.: `https://glassy-pm.onrender.com`):
   - `https://glassy-pm.onrender.com/frontend/auth.html` — crie sua conta
   - `https://glassy-pm.onrender.com/frontend/index.html` — seu dashboard
6. Migre seus dados locais, se quiser:
   ```bash
   node scripts/migrate-localstorage.js backup.json \
     --api=https://glassy-pm.onrender.com --token=SEU_TOKEN_ONLINE
   ```
   (O token online é o `glassy_token` do navegador, depois de logar no site online.)

### Atenção ao plano free do Render
- O serviço web free **dorme após inatividade** — o primeiro acesso demora ~1 minuto para acordar. Para uso diário, vale o plano pago do web service.
- O Postgres free **expira em 30 dias**. Para uso contínuo, use o Postgres pago (~US$ 6/mês) ou outra opção abaixo.

## Outras opções, se preferir

**Railway:** parecido com o Render, crie projeto a partir do GitHub,
adicione Postgres, defina `JWT_SECRET` e faça deploy do Dockerfile.
Bom para quem já usa Railway; o custo é por uso.

**VPS (Hetzner, DigitalOcean, etc. — mais barato a longo prazo):**
```bash
# Na VPS (Ubuntu), com Docker instalado:
git clone https://github.com/SEU-USUARIO/glassy-pm.git
cd glassy-pm
cp .env.example .env   # edite JWT_SECRET e DATABASE_URL
docker compose up -d   # Postgres local na VPS
# Rode a API com Docker ou: npm install && npm start
# E coloque um domínio + HTTPS com Caddy ou Nginx na frente.
```
Mais trabalho de configuração, mas ~US$ 5/mês e sem expiração do banco.

## Checklist de segurança antes de abrir para a internet

- [ ] Repositório **privado** no GitHub.
- [ ] `.env` nunca commitado (já está no `.gitignore`).
- [ ] `JWT_SECRET` longo, diferente do de teste, só no painel do serviço de deploy.
- [ ] HTTPS (o Render/Railway já dão de graça).
- [ ] Senha forte na sua conta do Glassy PM.
- [ ] SMTP real no `.env` do deploy, para o "esqueci minha senha" funcionar por email.
- [ ] Backup do banco online ativado (plano pago) ou `pg_dump` regular.

## Quando você quiser, o que vou precisar de você?

Nada de código novo — só:
1. o nome do repositório privado no GitHub, e
2. qual serviço você escolheu (Render é o que eu recomendo para começar).

Aí eu te acompanho no deploy passo a passo, ou, se você me der acesso
ao repositório, eu deixo o `render.yaml` já revisado para o seu caso.
