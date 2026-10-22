#!/usr/bin/env bash
# Aplica as migrations num banco PostgreSQL vazio (com o stub do Supabase)
# e executa os testes de RLS. Uso: PGURL=postgres://... supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${PGURL:?defina PGURL}"
psql "$PGURL" -v ON_ERROR_STOP=1 -q -f tests/supabase_stub.sql
for f in migrations/*.sql; do
  psql "$PGURL" -v ON_ERROR_STOP=1 -q -f "$f"
done
# Reaplicar os dados iniciais precisa ser inofensivo (idempotência).
psql "$PGURL" -v ON_ERROR_STOP=1 -q -f migrations/20261022000300_initial_data.sql
psql "$PGURL" -v ON_ERROR_STOP=1 -q -o /dev/null -f tests/rls.sql
echo "OK: migrations e RLS"
