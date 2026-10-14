import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client à clé serveur : réservé à la limitation des tentatives de connexion.
 * N'est jamais importé par un composant client ; la clé n'est jamais envoyée au navigateur.
 */
export function supabaseService() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
