import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { MfaForm } from "./MfaForm";

/** Second facteur obligatoire (TOTP Supabase) : inscription au premier passage, puis vérification à chaque connexion. */
export default async function MfaPage() {
  const sb = await supabaseServer();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) redirect("/login");
  const { data: a } = await sb.from("admin_users").select("active").eq("user_id", u.user.id).maybeSingle();
  if (!a?.active) { await sb.auth.signOut(); redirect("/login?e=denied"); }
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") redirect("/");
  const { data: f } = await sb.auth.mfa.listFactors();
  const verified = (f?.totp || []).find((x: { status: string }) => x.status === "verified");
  return (
    <main className="auth">
      <div className="card">
        <p className="eyebrow">Sécurité</p>
        <h1 style={{ fontSize: "1.9rem", margin: "6px 0 14px" }}>{verified ? "Code de vérification" : "Activer le second facteur"}</h1>
        <MfaForm factorId={verified?.id || null} />
      </div>
    </main>
  );
}
