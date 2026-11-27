import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { BuscarEPromoverAdmin } from "./buscar-e-promover-admin";
import { RemoverAdminBotao } from "./remover-admin-botao";

type AdminRow = {
  id: string;
  nome: string;
  email: string | null;
  role: string;
};

export default async function AdminAdministradoresPage() {
  const { supabase, user } = await requireAdmin("/admin/administradores");

  const { data: adminsData } = await supabase
    .from("profiles")
    .select("id, nome, email, role")
    .eq("is_admin", true)
    .order("nome", { ascending: true });

  const admins = (adminsData ?? []) as AdminRow[];

  return (
    <>
      <Nav active="/admin" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Administração</span>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Administradores</h1>
            <p className="muted" style={{ marginBottom: 0 }}>
              Quem tem acesso total ao painel admin — revisão de documentos, catálogo, suporte e
              tudo mais. Só um admin existente pode promover outro.
            </p>
          </div>
          <Link href="/admin" className="btn btn-outline btn-sm">
            ← Voltar pra administração
          </Link>
        </div>

        <BuscarEPromoverAdmin />

        <h2 style={{ fontSize: 18, margin: "32px 0 12px" }}>
          Administradores atuais ({admins.length})
        </h2>
        <div className="card" style={{ padding: "8px 20px" }}>
          {admins.map((admin) => (
            <div key={admin.id} className="list-row" style={{ flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {admin.nome} {admin.id === user.id && <span className="hint">(você)</span>}
                </div>
                <div className="hint" style={{ margin: 0 }}>
                  {admin.email ?? "sem e-mail"} · {admin.role}
                </div>
              </div>
              <RemoverAdminBotao profileId={admin.id} ehVoceMesmo={admin.id === user.id} />
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </>
  );
}
