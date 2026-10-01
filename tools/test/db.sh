#!/usr/bin/env bash
# 在本機開一個空的 Postgres，依序跑：守護異世界 schema.sql（共用帳號表）→ 樂園 park_accounts.sql、
# park_teacher.sql → 這個遊戲的 supabase/island_pioneer.sql，再跑權限測試。
# 前兩個 repo 的 SQL 從 GitHub 抓 dev 分支（都是公開的）。
#
#   ./tools/test/db.sh
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGROOT=${PGROOT:-/tmp/pg-island}
SOCK="$PGROOT/sock"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNAS=${RUNAS:-claude}

if [ ! -x "$PGBIN/initdb" ]; then
  echo "找不到 Postgres（$PGBIN）。裝一個：apt-get install -y postgresql-16" >&2
  exit 1
fi

DL="$PGROOT/sql"
mkdir -p "$DL"
EN=https://raw.githubusercontent.com/cphskid/gaming_english_practice/dev/supabase
PARK=https://raw.githubusercontent.com/cphskid/cphskid.github.io/dev/supabase
curl -fsSL "$EN/test/00_supabase_stub.sql" -o "$DL/00_stub.sql"
curl -fsSL "$EN/schema.sql" -o "$DL/schema.sql"
curl -fsSL "$PARK/park_accounts.sql" -o "$DL/park_accounts.sql"
curl -fsSL "$PARK/park_teacher.sql" -o "$DL/park_teacher.sql"

as_pg() { if [ "$(id -u)" = 0 ]; then su "$RUNAS" -c "PATH=$PGBIN:\$PATH $1"; else PATH=$PGBIN:$PATH sh -c "$1"; fi; }
"$PGBIN/pg_ctl" -D "$PGROOT/data" stop >/dev/null 2>&1 || true
rm -rf "$PGROOT/data" "$SOCK"
mkdir -p "$PGROOT/data" "$SOCK"
[ "$(id -u)" = 0 ] && chown -R "$RUNAS" "$PGROOT"
as_pg "initdb -D $PGROOT/data -U postgres --auth=trust" >/dev/null
as_pg "pg_ctl -D $PGROOT/data -o '-k $SOCK -c listen_addresses= -c log_min_messages=warning' -l $PGROOT/log start" >/dev/null
trap 'as_pg "pg_ctl -D $PGROOT/data stop" >/dev/null 2>&1 || true' EXIT

run() { "$PGBIN/psql" -h "$SOCK" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

echo "── 守護異世界 schema、樂園 park_accounts / park_teacher"
run -f "$DL/00_stub.sql" >/dev/null
run -f "$DL/schema.sql" >/dev/null 2>&1
run -f "$DL/park_accounts.sql" 2>&1 | grep -v NOTICE || true
run -f "$DL/park_teacher.sql" 2>&1 | grep -v NOTICE || true

echo "── island_pioneer.sql（跑兩次，確定可以重複執行）"
cd "$ROOT"
run -f supabase/island_pioneer.sql 2>&1 | grep -v NOTICE || true
run -f supabase/island_pioneer.sql 2>&1 | grep -v NOTICE || true

echo "── 權限測試"
run -f supabase/test/island_test.sql 2>&1 | grep -E "✓|✗|ERROR|──" | sed 's/^psql:[^ ]* NOTICE:  //'
