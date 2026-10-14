# Démarrer Cérémonia sur votre ordinateur

Ce guide lance **toute la plateforme en local** : la base de données Supabase, l’espace organisateur
(avec les invitations, les contrôleurs et les serveurs) et l’espace administrateur.

## 1. À installer une seule fois

| Outil | Pourquoi | Lien |
|---|---|---|
| **Node.js 20 ou plus récent** | exécute les applications | https://nodejs.org |
| **Docker Desktop** | fait tourner Supabase (base, connexion, stockage des photos) sur votre machine | https://www.docker.com/products/docker-desktop |
| **VS Code** | éditeur | https://code.visualstudio.com |

Ensuite, dans un terminal : `corepack enable` (active **pnpm**, fourni avec Node).

## 2. Lancer la plateforme

Ouvrez le dossier `ceremonia-prod` dans VS Code, puis le terminal intégré (menu **Terminal → Nouveau terminal**) :

```bash
pnpm install          # installe les dépendances (2 à 5 min la première fois)
pnpm db:start         # démarre Supabase local (Docker doit être ouvert ; 5 à 10 min la première fois)
pnpm setup:env        # crée les fichiers .env.local des deux applications
pnpm dev              # lance l’espace organisateur et l’espace admin
```

`pnpm db:start` applique automatiquement les 7 migrations et charge les **données de démonstration**
(`supabase/seed.sql`, uniquement en local).

| Adresse | Contenu |
|---|---|
| http://localhost:3000 | Espace organisateur, invitations (`/i/…`), personnel (`/k/…`), page Service (`/s/…`) |
| http://127.0.0.1:3100 | Espace administrateur |
| http://127.0.0.1:54323 | Supabase Studio (voir les tables) |
| http://127.0.0.1:54324 | Boîte e-mail de test (confirmation d’inscription, mot de passe oublié) |

> Les deux espaces utilisent volontairement deux adresses différentes (`localhost` et `127.0.0.1`) :
> comme en production avec deux domaines, leurs sessions ne se mélangent jamais.

Dans VS Code, vous pouvez aussi utiliser **Terminal → Exécuter la tâche** (tâches 1, 2, 3) ou l’onglet
**Exécuter et déboguer** → « Les deux applications ».

## 3. Comptes de démonstration (local uniquement)

| Rôle | Où | Identifiants |
|---|---|---|
| Organisateur | http://localhost:3000/login | `organisateur@demo.local` / `Demo-Organisateur-1` |
| Administrateur principal | http://127.0.0.1:3100/login | `admin@demo.local` / `Demo-Admin-1` — à la première connexion, scannez le QR code avec une application d’authentification (Google Authenticator, Microsoft Authenticator, 1Password…) |
| Contrôleur | http://localhost:3000/k/DEMO2026/44444444-4444-4444-8444-444444444441 | code `CTL234` / mot de passe `controle1` |
| Serveur | http://localhost:3000/k/DEMO2026/44444444-4444-4444-8444-444444444442 | code `SRV234` / mot de passe `service1` |
| Personnel de service (lien) | http://localhost:3000/s/DEMO2026/demoservice | aucun identifiant |

Vous pouvez aussi créer votre propre compte organisateur depuis http://localhost:3000/signup.

## 4. Parcours de test complet

1. **Organisateur** : connectez-vous, ouvrez « Patrick & Grâce ».
2. **Invités** : ajoutez un invité, collez une liste, importez un fichier Excel ou CSV (colonnes Nom ; Statut ; WhatsApp).
3. **Tables** : « Placer les invités » (les couples restent ensemble, aucune table n’est dépassée), déplacez ou échangez des invités.
4. **Boissons / Buffet** : ajoutez, renommez, supprimez des éléments.
5. **Modifier l’événement** : ajoutez 1 à 4 photos (JPEG, PNG, WebP ; les grandes photos sont réduites automatiquement).
6. **Aperçu de l’invitation** depuis l’accueil de l’événement.
7. **Règlement** : sur l’accueil, cliquez « Payer… ». En local, aucun prestataire n’est appelé : la page affiche une référence
   `CRM-…`. Confirmez-la comme le ferait le prestataire :
   ```bash
   pnpm dev:confirm-payment CRM-XXXXXXXXXX
   ```
   La page se met à jour, l’envoi des invitations est activé.
8. **Envoi** : rubrique « Envoi des invitations » → WhatsApp s’ouvre avec le message et le lien personnel.
9. **Invité** : ouvrez http://localhost:3000/i/demo-invitation-mbuyi-01 (ou le lien d’un autre invité), confirmez la présence et
   choisissez une boisson et un plat par personne. Le QR code d’accès apparaît.
   *(Avant l’étape 7, ce lien affiche « Invitation indisponible » : c’est voulu.)*
10. **Contrôleur** : ouvrez son lien, connectez-vous, scannez le QR code avec la caméra, prenez-le en photo,
    ou saisissez le code `MBUYI1`. « Confirmer l’entrée ». Un second scan affiche « Déjà validée ».
11. **Serveur** : même principe, puis « Boisson servie » / « Plat servi ».
12. **Suivis** : « Suivi de présence », « Suivi boissons », « Suivi plats », « Service » se mettent à jour tout seuls.
13. **Administrateur** : tableau de bord, événements (création gratuite, pour la plateforme ou pour un organisateur),
    organisateurs (suspendre / réactiver), finances (le paiement de l’étape 7 apparaît), rapports, journal, paramètres.

### Scanner avec un téléphone

La caméra du navigateur n’est autorisée que sur `https` ou sur `localhost`. Pour tester avec un vrai téléphone, utilisez
« Prendre une photo du QR code » ou la saisie du code, ou exposez votre poste en https (par exemple avec
`cloudflared tunnel --url http://localhost:3000`).

## 5. Commandes utiles

| Commande | Effet |
|---|---|
| `pnpm db:reset` | remet la base à zéro (migrations + démonstration) |
| `pnpm db:stop` | arrête Supabase local |
| `pnpm test` | tests de la logique métier et des signatures de paiement |
| `pnpm typecheck` | vérifie les types des trois paquets |
| `pnpm test:db` | tests de sécurité de la base (Linux, macOS ou WSL, avec PostgreSQL 16 : voir `supabase/tests/run.sh`) |

## 6. En cas de problème

- **« Supabase local ne répond pas »** : ouvrez Docker Desktop, attendez qu’il soit prêt, relancez `pnpm db:start`.
- **Port déjà utilisé** : fermez l’application qui utilise 3000, 3100 ou 54321-54324, ou arrêtez un ancien `supabase start` avec `pnpm db:stop`.
- **Connexion admin refusée** : utilisez bien http://127.0.0.1:3100 (et non `localhost:3100`).
- **Fichiers .env.local à recréer** : `pnpm setup:env --force`.
- **Paiement en vrai (Stripe / CinetPay)** : voir `docs/DEPLOYMENT.md` ; retirez `DEV_PAYMENTS=1` et renseignez les clés.
