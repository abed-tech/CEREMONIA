import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Retour des liens envoyés par e-mail (confirmation d'inscription, réinitialisation du mot de passe). */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") || "/events";
  const dest = /^\/(?!\/)[\w\-/]*$/.test(next) ? next : "/events";
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(dest, req.url));
  }
  return NextResponse.redirect(new URL("/login?e=link", req.url));
}
