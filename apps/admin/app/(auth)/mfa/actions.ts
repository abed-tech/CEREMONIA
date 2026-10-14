"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type MfaState = { message?: string; enroll?: { factorId: string; qr: string; secret: string } } | null;

export async function startEnroll(): Promise<MfaState> {
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Cérémonia Admin" });
  if (error || !data) return { message: "Impossible de démarrer l’activation. Réessayez." };
  return { enroll: { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret } };
}

export async function verify(_: MfaState, fd: FormData): Promise<MfaState> {
  const factorId = String(fd.get("factorId") || "");
  const code = String(fd.get("code") || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { message: "Saisissez les 6 chiffres affichés par votre application." };
  const sb = await supabaseServer();
  const { data: ch, error: e1 } = await sb.auth.mfa.challenge({ factorId });
  if (e1 || !ch) return { message: "Vérification impossible. Réessayez." };
  const { error } = await sb.auth.mfa.verify({ factorId, challengeId: ch.id, code });
  if (error) return { message: "Code incorrect ou expiré." };
  redirect("/");
}
