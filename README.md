# Cérémonia — code source complet

Plateforme d’invitations et d’accueil des invités : espace organisateur, invitation personnelle de chaque invité,
contrôleurs (entrées) et serveurs (boissons et plats) le jour J, suivis en direct, paiement, et espace administrateur
sur un domaine séparé.

**Pour tout lancer sur votre ordinateur : [`docs/DEMARRAGE.md`](docs/DEMARRAGE.md).**

## Organisation

| Dossier | Contenu |
|---|---|
| `apps/web` | Espace organisateur (événements, invités, tables, boissons, buffet, photos, envoi WhatsApp, règlement, personnel, suivis), invitation des invités (`/i/…`), application des contrôleurs et serveurs (`/k/…`), page Service (`/s/…`) |
| `apps/admin` | Espace administrateur (tableau de bord, événements, organisateurs, finances, rapports, journal, paramètres) — MFA obligatoire, domaine séparé |
| `packages/core` | Logique partagée : places (couple = 2), tables, placement automatique, import Excel/CSV, numéros WhatsApp, tarif |
| `supabase/migrations` | Base de données : tables, règles d’accès (RLS), fonctions serveur — toute la sécurité est ici |
| `supabase/functions` | Webhooks de paiement Stripe (carte) et CinetPay (mobile money) |
| `supabase/seed.sql` | Données de démonstration, **local uniquement** |
| `supabase/tests` | Tests sur un vrai PostgreSQL : sécurité, comptes admin, application organisateur, concurrence, démonstration |
| `docs/` | Démarrage local, permissions, déploiement |

## Documentation

- [`docs/DEMARRAGE.md`](docs/DEMARRAGE.md) — installation locale, comptes de démonstration, parcours de test
- [`docs/PERMISSIONS.md`](docs/PERMISSIONS.md) — qui peut faire quoi, et où c’est vérifié
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — mise en ligne (deux domaines, Supabase, paiements)
