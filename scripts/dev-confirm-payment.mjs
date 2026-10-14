// LOCAL UNIQUEMENT : simule la confirmation d'un paiement par le prestataire (comme le ferait le webhook).
// Usage : pnpm dev:confirm-payment CRM-XXXXXXXXXX
// Passe par la même fonction que les vrais webhooks (apply_payment_event) : montant vérifié, preuve enregistrée, journal.
import { execFileSync } from "node:child_process";

const ref = process.argv[2] || "";
if (!/^CRM-[A-Z0-9]{6,12}$/.test(ref)) {
  console.error("Usage : pnpm dev:confirm-payment CRM-XXXXXXXXXX (référence affichée sur la page de paiement)");
  process.exit(1);
}
const sql = `do $$ declare t public.transactions; r jsonb; begin
  select * into t from public.transactions where reference = '${ref}';
  if not found then raise exception 'Référence inconnue : ${ref}'; end if;
  r := public.apply_payment_event(t.provider, 'dev-' || t.reference, t.reference, 'succeeded', 'dev-local', t.amount_cents, '{"dev_local": true}'::jsonb);
  raise notice 'Résultat : %', r;
end $$;`;
try {
  // conteneur de la base créé par « supabase start » (project_id = ceremonia)
  const out = execFileSync("docker", ["exec", "-i", "supabase_db_ceremonia", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  console.log(out.trim() || "Paiement confirmé.");
  console.log(`Paiement ${ref} confirmé en local. Rechargez la page.`);
} catch (e) {
  console.error((e.stderr || e.message || "").toString().trim());
  console.error("Échec. Vérifiez que Supabase local tourne (pnpm db:start) et que la référence est correcte.");
  process.exit(1);
}
