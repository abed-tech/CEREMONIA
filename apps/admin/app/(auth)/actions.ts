"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

export type AuthState = { message?: string } | null;

const LoginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(200) });

/** Connexion admin : limitation des tentatives (par e-mail et par adresse IP), puis second facteur obligatoire. */
export async function login(_: AuthState, fd: FormData): Promise<AuthState> {
  const parsed = LoginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { message: "E-mail ou mot de passe invalide." };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim();
  const svc = supabaseService();
  const { data: guard } = await svc.rpc("admin_login_guard", { p_email: parsed.data.email, p_ip: ip });
  if (guard && guard.allowed === false) return { message: `Trop de tentatives. Réessayez dans ${guard.retry_after_minutes} minutes.` };

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithPassword(parsed.data);
  let isAdmin = false;
  if (!error && data.user) {
    const { data: a } = await sb.from("admin_users").select("active").eq("user_id", data.user.id).maybeSingle();
    isAdmin = !!a?.active;
  }
  await svc.rpc("admin_login_record", { p_email: parsed.data.email, p_ip: ip, p_success: isAdmin });
  if (!isAdmin) {
    if (!error) await sb.auth.signOut();
    // message identique : ne révèle pas si le compte existe ni s'il s'agit d'un organisateur
    return { message: "E-mail ou mot de passe incorrect." };
  }
  redirect("/mfa");
}

export async function logout() {
  const sb = await supabaseServer();
  await sb.auth.signOut({ scope: "global" });
  redirect("/login");
}
