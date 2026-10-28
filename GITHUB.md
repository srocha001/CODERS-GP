# GitHub — para que serve e para que NÃO serve aqui

## Pode colocar no GitHub? Sim, como backup do código — e deve ser PRIVADO.

O GitHub guarda **código**, não roda seu back-end nem seu banco sozinho.
Ou seja: subir para o GitHub não deixa o sistema online, e não substitui
o Postgres. O que ele resolve bem para você, que é o único usuário, é:
- backup do código se o computador quebrar,
- histórico de versões,
- baixar o projeto em outra máquina depois.

## O que NUNCA vai para o GitHub
- `.env` (já está no `.gitignore`) — lá vai JWT_SECRET e senha do banco.
- `node_modules/` (também no `.gitignore`).
- O banco de dados em si: faça backup do Postgres à parte
  (`pg_dump glassy_pm > backup.sql`) ou exporte pelo dashboard.

## Passo a passo (repositório privado)
```bash
cd glassy-pm-backend
git init
git add .
git commit -m "Glassy PM: back-end Node + Express + PostgreSQL"
```
1. No github.com, crie um repositório novo e marque **Private**.
2. Não marque "Add README" (o projeto já tem um).
3. Volte ao terminal:
```bash
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/glassy-pm.git
git push -u origin main
```
Pronto. Para baixar em outra máquina depois:
```bash
git clone https://github.com/SEU-USUARIO/glassy-pm.git
cd glassy-pm
# depois siga o README.md (Docker + schema + npm run dev)
```

## E se um dia quiser acessar de qualquer lugar?
Aí sim precisa de um servidor, não só do GitHub. Opções simples depois:
Render / Railway (API + Postgres gerenciado) ou uma VPS. Para uso só seu,
na sua máquina, isso é custo e complexidade à toa — local + GitHub privado
como backup é o melhor custo-benefício.
