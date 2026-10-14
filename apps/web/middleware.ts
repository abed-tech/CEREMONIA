import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Pages ouvertes sans compte : accueil, connexion, invitations (/i), personnel (/k), page Service (/s).
const PUBLIC = ["/", "/login", "/signup", "/forgot", "/auth", "/i", "/k", "/s"];

/**
 * 1. Refuse toute requête qui n'arrive pas par le domaine organisateur (le domaine admin n'est jamais servi ici).
 * 2. Rafraîchit la session de l'organisateur.
 * 3. Redirige vers la connexion pour l'espace organisateur. (Les droits réels sont vérifiés par la base.)
 */
export async function middleware(req: NextRequest) {
  const orgHost = process.env.ORGANIZER_ORIGIN ? new URL(process.env.ORGANIZER_ORIGIN).host : null;
  const adminHost = process.env.ADMIN_ORIGIN ? new URL(process.env.ADMIN_ORIGIN).host : null;
  const host = req.headers.get("host");
  if (process.env.NODE_ENV === "production" && (!orgHost || host !== orgHost || host === adminHost)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || (p !== "/" && path.startsWith(p + "/")));
  // invitations et personnel : aucune session organisateur n'est lue ni rafraîchie
  if (/^\/(i|k|s)\//.test(path)) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { name: "cer-org" },
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, { ...options, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" }));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  if (!data.user && !isPublic) {
    const u = new URL("/login", req.url);
    u.searchParams.set("next", path);
    return NextResponse.redirect(u);
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|api/).*)"] };
