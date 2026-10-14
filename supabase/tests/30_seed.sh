#!/bin/bash
# Vérifie que les données de démonstration locales se chargent sur une base neuve et respectent toutes les règles.
set -e
P="psql -h /tmp -p 54329 -U postgres -v ON_ERROR_STOP=1 -q"
D="$(dirname $0)"
$P -d postgres -c "drop database if exists cer_seed" -c "create database cer_seed"
sed '/^create role/d' "$D/00_supabase_emulation.sql" | $P -d cer_seed
for f in "$D"/../migrations/*.sql; do $P -d cer_seed -f "$f"; done
$P -d cer_seed -f "$D/../seed.sql"
$P -d cer_seed -f "$D/../seed.sql"   # rejouable sans erreur
$P -d cer_seed -At -c "select count(*) from public.guests" | grep -qx 6
$P -d cer_seed -At -c "select count(*) from public.staff_accounts where password_hash like '\$2a\$%'" | grep -qx 2
# invitation fermée tant que le paiement n'est pas confirmé (même en démo)
$P -d cer_seed -At -c "set role anon; select public.get_invitation('demo-invitation-mbuyi-01') is null" | grep -qx t
# connexion du contrôleur démo
$P -d cer_seed -At -c "set role anon; select (public.staff_login('DEMO2026', '44444444-4444-4444-8444-444444444441', 'CTL234', 'controle1') ->> 'ok')" | grep -qx true
echo "OK   données de démonstration : chargées, rejouables, règles respectées"
