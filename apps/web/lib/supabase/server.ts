import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/** Nom de cookie propre à l'espace organisateur (distinct de celui de l'admin). */
export const ORG_COOKIE = "cer-org";

/** Client Supabase côté serveur, avec la session de l'organisateur (soumis aux règles RLS). */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { name: ORG_COOKIE },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, { ...options, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" }));
        } catch {
          /* composant serveur : le middleware rafraîchit la session */
        }
      },
    },
  });
}

/** Client anonyme (invités et personnel : aucune session, accès par jeton vérifié dans la base). */
export async function supabaseAnon() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}
