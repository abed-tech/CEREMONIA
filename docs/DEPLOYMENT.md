# Déploiement

## 1. Deux domaines distincts

| Application | Domaine (provisoire) | Contenu |
|---|---|---|
| `apps/admin` | `https://admin.ceremonia-provisoire.example` | espace administrateur uniquement |
| `apps/web` | `https://app.ceremonia-provisoire.example` | organisateurs, invitations, contrôleurs, serveurs, page Service |

Remplacer les domaines provisoires dès qu’ils sont choisis (variables `ADMIN_ORIGIN` / `ORGANIZER_ORIGIN`).
Déployer l’admin comme **projet séparé** (Vercel, ou tout hébergeur Node 20+). Recommandé : restreindre en plus
l’accès au domaine admin (liste d’adresses IP, Cloudflare Access ou équivalent).

## 2. Supabase

1. Créer le projet, puis appliquer les migrations : `supabase link --project-ref <ref>` puis `supabase db push`.
2. **Authentication → Providers → Email** : les inscriptions publiques servent à l’application organisateur.
   Elles sont sans risque pour l’admin : un compte organisateur ne peut jamais recevoir de rôle d’administration.
3. **Authentication → Multi-Factor** : activer TOTP. L’espace admin exige `aal2` pour toute donnée.
4. **Database → Extensions** : activer `pg_cron`, puis réappliquer la fin de `20261013000500_admin.sql`
   (bloc « tâches planifiées ») ou exécuter les trois `cron.schedule` à la main :
   clôture mensuelle (1er du mois, 00:05), conservation (chaque nuit, désactivée tant que le paramètre ne l’est pas),
   nettoyage des sessions du personnel.
5. Premier administrateur principal (une seule fois, dans l’éditeur SQL, avec un compte invité **dédié**) :
   ```sql
   insert into public.admin_users (user_id, role, display_name)
   select id, 'super', 'Votre nom' from auth.users where email = 'admin@votre-domaine';
   ```
   Les suivants se nomment depuis **Paramètres → Administrateurs**.

### URL de redirection (Authentication → URL Configuration)
- Site URL : `https://app.ceremonia-provisoire.example`
- Redirect URLs : `https://app.ceremonia-provisoire.example/auth/callback`

### Stockage des photos
La migration `20261013000700_organizer_app.sql` crée le compartiment `event-photos` et ses règles d’écriture.
Vérifiez dans **Storage** qu’il existe (lecture publique, 6 Mo par fichier, JPEG/PNG/WebP).

## 3. Paiements (Edge Functions)

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... CINETPAY_API_KEY=... CINETPAY_SITE_ID=... CINETPAY_SECRET_KEY=...
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy cinetpay-webhook --no-verify-jwt
```
- Stripe : point de terminaison `https://<ref>.functions.supabase.co/stripe-webhook`, événements
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
  `checkout.session.expired`, `charge.refunded`. La session Checkout doit porter `client_reference_id = <référence CRM-…>`.
- CinetPay : `notify_url = https://<ref>.functions.supabase.co/cinetpay-webhook`, `transaction_id = <référence CRM-…>`.
- Ces fonctions n’ont **pas encore été testées contre les prestataires réels** : faire un paiement test dans chaque
  mode sandbox avant l’ouverture.

## 4. Variables d’environnement de l’admin

| Variable | Côté | Rôle |
|---|---|---|
| `ADMIN_ORIGIN` | serveur | seul domaine accepté (sinon 404) ; contrôle d’origine des exports et actions |
| `ORGANIZER_ORIGIN` | serveur | domaine organisateur, refusé par l’admin ; sert aussi aux liens d’invitation |
| `NEXT_PUBLIC_SUPABASE_URL` | public | URL du projet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | clé publique (protégée par RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **serveur uniquement** | limitation et journal des tentatives de connexion |
| `ADMIN_IDLE_MINUTES` | serveur | déconnexion après inactivité (30 par défaut) |

Aucun secret n’est préfixé par `NEXT_PUBLIC_`. `lib/supabase/service.ts` importe `server-only` : une
importation accidentelle depuis un composant client échoue à la compilation.

## 4 bis. Variables d’environnement de l’espace organisateur (`apps/web`)

| Variable | Côté | Rôle |
|---|---|---|
| `ORGANIZER_ORIGIN` | serveur | seul domaine accepté ; base des liens d’invitation, d’accès du personnel et de retour de paiement |
| `ADMIN_ORIGIN` | serveur | domaine admin, refusé par cette application |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | projet Supabase (protégé par RLS) |
| `STRIPE_SECRET_KEY` | **serveur uniquement** | création des sessions de paiement par carte (vide = moyen désactivé) |
| `CINETPAY_API_KEY`, `CINETPAY_SITE_ID` | **serveur uniquement** | création des paiements mobile money (vide = moyen désactivé) |
| `DEV_PAYMENTS` | local uniquement | `1` = paiement simulé en développement ; ignoré en production |

L’espace organisateur n’utilise **jamais** la clé `SUPABASE_SERVICE_ROLE_KEY`.

## 5. Avant l’ouverture

- `pnpm install && pnpm typecheck && pnpm build` (non exécutés dans l’environnement de développement initial : à faire en premier).
- Parcours complet de `docs/DEMARRAGE.md` en local, puis paiement test réel Stripe et CinetPay en mode sandbox.
- `pnpm test` et `pnpm test:db`.
- Confirmer la règle de conservation (désactivée par défaut) dans **Paramètres**.
