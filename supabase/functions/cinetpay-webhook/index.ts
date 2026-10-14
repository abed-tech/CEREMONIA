// Notification CinetPay (mobile money). Déployé sans vérification JWT :
//   supabase functions deploy cinetpay-webhook --no-verify-jwt
// Secrets : CINETPAY_API_KEY, CINETPAY_SITE_ID, CINETPAY_SECRET_KEY.
// Sécurité : 1) contrôle du jeton x-token (HMAC) ; 2) le statut et le montant sont relus auprès de CinetPay
// (/v2/payment/check) : le contenu de la notification n'est jamais cru tel quel.
import { verifyCinetpayToken, cinetpayOutcome, toCents } from "../_shared/verify.ts";
import { applyPaymentEvent, json } from "../_shared/apply.ts";

Deno.serve(async (req) => {
  if (req.method === "GET") return json({ ok: true }); // CinetPay teste parfois l'URL en GET
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const form = await req.formData();
  const fields: Record<string, string> = {};
  form.forEach((v, k) => { if (typeof v === "string") fields[k] = v.slice(0, 2000); });

  const siteId = Deno.env.get("CINETPAY_SITE_ID") || "";
  if (fields.cpm_site_id !== siteId || !/^CRM-[A-Z0-9]{10}$/.test(fields.cpm_trans_id || "")) return json({ error: "invalid" }, 400);
  if (!(await verifyCinetpayToken(fields, req.headers.get("x-token"), Deno.env.get("CINETPAY_SECRET_KEY") || ""))) return json({ error: "token" }, 400);

  try {
    const res = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: Deno.env.get("CINETPAY_API_KEY"), site_id: siteId, transaction_id: fields.cpm_trans_id }),
    });
    const check = await res.json();
    const out = cinetpayOutcome(check);
    if (!out) return json({ pending: true });
    const r = await applyPaymentEvent({
      provider: "cinetpay",
      providerEventId: `${fields.cpm_trans_id}:${out.status}`, // une seule application par transaction et par statut
      reference: fields.cpm_trans_id, status: out.status, providerRef: out.providerRef,
      amountCents: out.amountMinor != null ? toCents(out.amountMinor) : null, payload: { notification: fields, check },
    });
    return json({ received: true, result: r.error || (r.duplicate ? "duplicate" : "applied") });
  } catch (e) {
    console.error("cinetpay-webhook", e);
    return json({ error: "retry" }, 500);
  }
});
