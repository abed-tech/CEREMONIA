import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC = ["/login", "/mfa"];

/**
 * 1. Refuse toute requête qui n'arrive pas par le domaine admin (jamais sur le domaine organisateur).
 * 2. Rafraîchit la session Supabase (cookies httpOnly, Secure, SameSite=Strict).
 * 3. Déconnecte après une période d'inactivité.
 * 4. Redirige vers la connexion / le second facteur. (Les droits réels sont vérifiés par la base.)
 */
export async function middleware(req: NextRequest) {
  const adminHost = process.env.ADMIN_ORIGIN ? new URL(process.env.ADMIN_ORIGIN).host : null;
  const orgHost = process.env.ORGANIZER_ORIGIN ? new URL(process.env.ORGANIZER_ORIGIN).host : null;
  const host = req.headers.get("host");
  if (process.env.NODE_ENV === "production" && (!adminHost || host !== adminHost || host === orgHost)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { name: "cer-adm" },
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, { ...options, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" }));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + "/"));

  if (!data.user) {
    if (isPublic) return res;
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // inactivité
  const idleMin = Number(process.env.ADMIN_IDLE_MINUTES || 30);
  const last = Number(req.cookies.get("adm_last")?.value || 0);
  if (last && Date.now() - last > idleMin * 60_000) {
    await sb.auth.signOut();
    const r = NextResponse.redirect(new URL("/login?e=idle", req.url));
    r.cookies.delete("adm_last");
    return r;
  }
  res.cookies.set("adm_last", String(Date.now()), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" });

  if (!isPublic) {
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") return NextResponse.redirect(new URL("/mfa", req.url));
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"] };
