import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/** Nom de cookie propre à l'espace admin : jamais partagé avec l'espace organisateur, même en local. */
export const ADMIN_COOKIE = "cer-adm";

/** Client Supabase côté serveur, agissant avec la session de l'administrateur connecté (soumis aux règles RLS). */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { name: ADMIN_COOKIE },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, { ...options, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" }));
        } catch {
          /* appelé depuis un composant serveur : le middleware rafraîchit la session */
        }
      },
    },
  });
}
