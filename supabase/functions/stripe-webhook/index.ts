// Webhook Stripe (carte bancaire). Déployé sans vérification JWT : l'authenticité est prouvée par la signature Stripe.
//   supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets : STRIPE_WEBHOOK_SECRET (whsec_…). SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase.
import { verifyStripe, stripeOutcome } from "../_shared/verify.ts";
import { applyPaymentEvent, json } from "../_shared/apply.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const raw = await req.text();
  if (raw.length > 512 * 1024) return json({ error: "too_large" }, 413);
  const ok = await verifyStripe(raw, req.headers.get("stripe-signature"), Deno.env.get("STRIPE_WEBHOOK_SECRET") || "");
  if (!ok) return json({ error: "signature" }, 400);

  const ev = JSON.parse(raw);
  const out = stripeOutcome(ev);
  if (!out) return json({ ignored: true }); // 2xx : Stripe ne renvoie pas les événements non utilisés
  try {
    const r = await applyPaymentEvent({ provider: "stripe", providerEventId: ev.id, reference: out.reference, status: out.status, providerRef: out.providerRef, amountCents: out.amountCents, payload: ev });
    // Référence inconnue ou montant incohérent : enregistré (preuve + journal), répondu 200 pour éviter des renvois inutiles.
    return json({ received: true, result: r.error || (r.duplicate ? "duplicate" : "applied") });
  } catch (e) {
    console.error("stripe-webhook", e);
    return json({ error: "retry" }, 500); // Stripe renverra la notification
  }
});
