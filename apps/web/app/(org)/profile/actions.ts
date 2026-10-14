"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganizer, humanError } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { ActionState } from "@/components/ConfirmAction";

export async function updateProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireOrganizer();
  const p = z.object({ username: z.string().trim().min(2).max(40), full_name: z.string().trim().max(120), phone: z.string().trim().max(20).regex(/^[+\d\s]*$/) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: "Nom d’utilisateur (2 à 40 caractères) et téléphone valides requis." };
  const sb = await supabaseServer();
  const { error } = await sb.from("profiles").update({ username: p.data.username, full_name: p.data.full_name || null, phone: p.data.phone || null }).eq("id", me.id);
  if (error) return { ok: false, message: humanError(error.message, error.code) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profil enregistré." };
}

export async function changePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireOrganizer();
  const cur = String(fd.get("current") || ""), pw = String(fd.get("password") || "");
  if (pw.length < 8 || pw.length > 72) return { ok: false, message: "Nouveau mot de passe : 8 à 72 caractères." };
  if (pw !== fd.get("password2")) return { ok: false, message: "Les deux mots de passe ne correspondent pas." };
  const sb = await supabaseServer();
  const { error: e1 } = await sb.auth.signInWithPassword({ email: me.email, password: cur });
  if (e1) return { ok: false, message: "Mot de passe actuel incorrect." };
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) return { ok: false, message: "Modification impossible. Réessayez." };
  return { ok: true, message: "Mot de passe modifié." };
}
