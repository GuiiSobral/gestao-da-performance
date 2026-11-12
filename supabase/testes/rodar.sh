#!/usr/bin/env bash
# Roda as migrações e os testes de acesso num banco Postgres local descartável.
# Uso: PGHOST=/tmp/pg PGPORT=5433 PGUSER=postgres supabase/testes/rodar.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=gp_teste_$$
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f testes/simular-supabase.sql
for f in migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -q -t -A -v ON_ERROR_STOP=1 -d "$DB" -f testes/acesso.sql | grep -v "^$"
