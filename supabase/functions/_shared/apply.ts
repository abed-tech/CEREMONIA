// Enregistre une notification vérifiée dans la base (clé serveur, jamais exposée au navigateur).
export async function applyPaymentEvent(args: {
  provider: "stripe" | "cinetpay"; providerEventId: string; reference: string;
  status: "succeeded" | "failed" | "refunded"; providerRef: string | null; amountCents: number | null; payload: unknown;
}): Promise<{ ok: boolean; error?: string; duplicate?: boolean }> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Configuration serveur manquante.");
  const res = await fetch(`${url}/rest/v1/rpc/apply_payment_event`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_provider: args.provider, p_provider_event_id: args.providerEventId, p_reference: args.reference, p_status: args.status,
      p_provider_ref: args.providerRef, p_amount_cents: args.amountCents, p_payload: args.payload,
    }),
  });
  if (!res.ok) throw new Error(`Base de données : ${res.status}`);
  return await res.json();
}

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
