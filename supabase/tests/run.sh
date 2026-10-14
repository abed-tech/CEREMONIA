#!/bin/bash
# Recrée une base vierge, applique l'émulation puis toutes les migrations, puis les tests.
set -e
P="psql -h /tmp -p 54329 -U postgres -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists cer_test" -c "create database cer_test"
for r in anon authenticated service_role; do $P -d postgres -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='$r') then execute 'create role $r nologin'; end if; end \$\$" ; done
sed '/^create role/d' "$(dirname $0)/00_supabase_emulation.sql" | $P -d cer_test
$P -d cer_test -c "alter role service_role bypassrls"
for f in "$(dirname $0)"/../migrations/*.sql; do echo "== $(basename $f)"; $P -d cer_test -f "$f"; done
echo "migrations OK"
for t in "$(dirname $0)"/1*_*.sql; do echo "== $(basename $t)"; $P -d cer_test -f "$t" 2>&1 | sed -n "s/^psql:.*NOTICE:  //p;/ERROR/p"; done
