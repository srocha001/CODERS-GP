#!/bin/bash
# Glassy PM — uso só na sua máquina (Linux / Mac)
# 1) Sobe o Postgres no Docker, 2) instala deps, 3) sobe a API
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then echo "Instale o Node.js 20+ em https://nodejs.org"; exit 1; fi
if [ ! -f .env ]; then cp .env.example .env; echo "Criei o .env — edite o JWT_SECRET antes de usar em produção."; fi
if command -v docker >/dev/null; then
  docker compose up -d
  echo "Postgres subindo no Docker... aguarde 5s na primeira vez."
  sleep 5
  echo "Se for a primeira vez, aplique o schema UMA vez:"
  echo "  psql \"postgres://glassy:glassy123@localhost:5432/glassy_pm\" -f schema.sql"
  echo "  (ou use o Docker: docker compose exec postgres psql -U glassy -d glassy_pm -f /dev/stdin < schema.sql)"
else
  echo "Docker não encontrado — use um Postgres local e ajuste DATABASE_URL no .env"
fi
if [ ! -d node_modules ]; then npm install; fi
echo "Abrindo em http://localhost:4000/frontend/auth.html"
npm run dev
