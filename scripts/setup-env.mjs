// Crée les fichiers .env.local des deux applications à partir de Supabase local (supabase status).
// Usage : pnpm setup:env   (après « pnpm db:start »)
import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

let out = "";
try {
  out = execSync("pnpm exec supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch {
  console.error("Supabase local ne répond pas. Lancez d’abord : pnpm db:start (Docker doit être démarré).");
  process.exit(1);
}
const env = Object.fromEntries(out.split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const url = env.API_URL, anon = env.ANON_KEY || env.PUBLISHABLE_KEY, service = env.SERVICE_ROLE_KEY || env.SECRET_KEY;
if (!url || !anon || !service) {
  console.error("Clés introuvables dans « supabase status ». Copiez-les à la main depuis la sortie de « pnpm exec supabase status ».");
  process.exit(1);
}
const files = {
  "apps/web/.env.local": `# Généré par scripts/setup-env.mjs — environnement local
ORGANIZER_ORIGIN=http://localhost:3000
ADMIN_ORIGIN=http://127.0.0.1:3100
NEXT_PUBLIC_SUPABASE_URL=${url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}
# Paiement de test local : aucun prestataire appelé, confirmation par « pnpm dev:confirm-payment <référence> »
DEV_PAYMENTS=1
STRIPE_SECRET_KEY=
CINETPAY_API_KEY=
CINETPAY_SITE_ID=
`,
  "apps/admin/.env.local": `# Généré par scripts/setup-env.mjs — environnement local
ADMIN_ORIGIN=http://127.0.0.1:3100
ORGANIZER_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=${url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}
SUPABASE_SERVICE_ROLE_KEY=${service}
ADMIN_IDLE_MINUTES=30
`,
};
for (const [f, c] of Object.entries(files)) {
  if (existsSync(f) && !process.argv.includes("--force")) { console.log(`${f} existe déjà (ajoutez --force pour le remplacer).`); continue; }
  writeFileSync(f, c);
  console.log(`${f} créé.`);
}
