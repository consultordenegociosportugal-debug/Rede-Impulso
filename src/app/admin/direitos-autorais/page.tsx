import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { RevisarDireitosAutoraisForm } from "./revisar-form";

type DenunciaRow = {
  id: string;
  url_conteudo: string;
  descricao_obra: string;
  titular_nome: string;
  titular_email: string;
  detalhes: string | null;
  status: string;
  resposta_admin: string | null;
  created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
  pendente: "badge-primary",
  em_analise: "badge-amber",
  procedente: "badge-coral",
  improcedente: "badge-outline",
};

export default async function AdminDireitosAutoraisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/admin/direitos-autorais");
  }

  const { data: meuPerfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!meuPerfil?.is_admin) {
    redirect("/");
  }

  const { data } = await supabase
    .from("denuncias_direitos_autorais")
    .select(
      "id, url_conteudo, descricao_obra, titular_nome, titular_email, detalhes, status, resposta_admin, created_at",
    )
    .order("created_at", { ascending: false });

  const denuncias = (data ?? []) as DenunciaRow[];

  return (
    <>
      <Nav active="/admin" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Administração</span>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
              Notificações de direitos autorais
            </h1>
          </div>
          <Link href="/admin" className="btn btn-outline btn-sm">
            ← Voltar
          </Link>
        </div>
        <p className="muted mb-24">
          Procedente = remova o conteúdo pela ferramenta de cada vertical
          (editar imóvel → arquivar, status do veículo → arquivado etc.) antes
          de marcar aqui.
        </p>

        {denuncias.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhuma notificação recebida.
            </p>
          </div>
        ) : (
          denuncias.map((d) => (
            <div key={d.id} className="card mb-16">
              <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
                <div>
                  <a
                    href={d.url_conteudo}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontWeight: 600, textDecoration: "underline" }}
                  >
                    {d.url_conteudo} ↗
                  </a>
                  <div className="muted mono" style={{ fontSize: 12, marginTop: 2 }}>
                    {d.titular_nome} · {d.titular_email} ·{" "}
                    {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGE[d.status] ?? "badge-outline"}`}>
                  {d.status}
                </span>
              </div>
              <p style={{ fontSize: 13.5, margin: "10px 0 0" }}>
                <strong>Obra:</strong> {d.descricao_obra}
              </p>
              {d.detalhes && (
                <p style={{ fontSize: 13.5, margin: "4px 0 0" }}>
                  <strong>Detalhes:</strong> {d.detalhes}
                </p>
              )}
              <RevisarDireitosAutoraisForm
                id={d.id}
                statusAtual={d.status}
                respostaAtual={d.resposta_admin}
              />
            </div>
          ))
        )}
      </div>

      <Footer />
    </>
  );
}
