"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { origin } from "@/lib/auth";

export type FormState = { ok?: boolean; message?: string } | null;
const safeNext = (n: FormDataEntryValue | null) => { const s = String(n || ""); return /^\/(?!\/)[\w\-/?=&%.]*$/.test(s) ? s : "/events"; };

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const p = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(200) }).safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!p.success) return { message: "E-mail ou mot de passe invalide." };
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithPassword(p.data);
  if (error || !data.user) {
    if (error && /confirm/i.test(error.message)) return { message: "Confirmez d’abord votre adresse e-mail (lien reçu par e-mail)." };
    if (error && error.status === 429) return { message: "Trop de tentatives. Patientez quelques minutes." };
    return { message: "E-mail ou mot de passe incorrect." };
  }
  const { data: adm } = await sb.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (adm) {
    await sb.auth.signOut();
    return { message: "Ce compte ne peut pas se connecter ici." };
  }
  redirect(safeNext(fd.get("next")));
}

const SignupSchema = z.object({
  username: z.string().trim().min(2, "Nom d’utilisateur : 2 caractères minimum.").max(40),
  phone: z.string().trim().max(20).regex(/^[+\d\s]*$/, "Téléphone invalide."),
  email: z.string().trim().email("E-mail invalide.").max(254),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum.").max(72),
});

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const p = SignupSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { message: p.error.issues[0]?.message };
  if (fd.get("password") !== fd.get("password2")) return { message: "Les deux mots de passe ne correspondent pas." };
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signUp({
    email: p.data.email, password: p.data.password,
    options: { emailRedirectTo: `${origin()}/auth/callback?next=/onboarding`, data: { username: p.data.username, phone: p.data.phone } },
  });
  if (error) return { message: error.status === 429 ? "Trop de tentatives. Patientez quelques minutes." : /registered|exists/i.test(error.message) ? "Un compte existe déjà avec cet e-mail." : "Inscription impossible. Réessayez." };
  if (!data.session) return { ok: true, message: "Compte créé. Ouvrez le lien de confirmation envoyé à votre adresse e-mail pour terminer." };
  redirect("/onboarding");
}

export async function forgot(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") || "").trim();
  if (!z.string().email().safeParse(email).success) return { message: "E-mail invalide." };
  const sb = await supabaseServer();
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/auth/callback?next=/reset` });
  // même réponse que le compte existe ou non
  return { ok: true, message: "Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé." };
}

export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  const pw = String(fd.get("password") || "");
  if (pw.length < 8 || pw.length > 72) return { message: "Mot de passe : 8 à 72 caractères." };
  if (pw !== fd.get("password2")) return { message: "Les deux mots de passe ne correspondent pas." };
  const sb = await supabaseServer();
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) return { message: "Lien expiré. Recommencez depuis « Mot de passe oublié »." };
  redirect("/events?pw=1");
}

export async function logout() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/login");
}
