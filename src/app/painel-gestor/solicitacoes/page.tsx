import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { ResponderSolicitacaoButtons } from "./responder-solicitacao-button";

const formatoData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

const LABEL_TIPO: Record<string, string> = {
  corretor: "Quer se vincular a esta organização",
  gestor: "Quer virar gestor desta organização",
};

type SolicitacaoRow = {
  id: string;
  tipo: "corretor" | "gestor";
  created_at: string;
  solicitante: { nome: string; telefone: string | null } | null;
};

export default async function PainelGestorSolicitacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/painel-gestor/solicitacoes");
  }

  const { data: gestorPerfil } = await supabase
    .from("gestor_perfis")
    .select("organizacao_catalogo_id")
    .eq("profile_id", user.id)
    .single();

  if (!gestorPerfil) {
    redirect("/");
  }

  const { data: solicitacoesData } = await supabase
    .from("solicitacoes_vinculo")
    .select("id, tipo, created_at, solicitante:solicitante_id(nome, telefone)")
    .eq("organizacao_catalogo_id", gestorPerfil.organizacao_catalogo_id)
    .eq("status", "pendente")
    .order("created_at", { ascending: true });

  const solicitacoes = (solicitacoesData ?? []) as unknown as SolicitacaoRow[];

  return (
    <>
      <Nav active="/painel-gestor" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Painel do gestor</span>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
              Solicitações{solicitacoes.length > 0 ? ` (${solicitacoes.length})` : ""}
            </h1>
            <p className="muted" style={{ marginBottom: 0 }}>
              Pedidos de corretores pra se vincular à sua organização, ou pra virar gestor
              dela também. Nada aparece no seu painel até você aprovar.
            </p>
          </div>
          <Link href="/painel-gestor" className="btn btn-outline btn-sm">
            ← Voltar pro painel
          </Link>
        </div>

        {solicitacoes.length === 0 ? (
          <div className="card mt-24" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>Nenhuma solicitação pendente.</p>
          </div>
        ) : (
          <div className="card mt-24" style={{ padding: "8px 20px" }}>
            {solicitacoes.map((s) => (
              <div key={s.id} className="list-row">
                <div className="flex between items-center" style={{ width: "100%", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.solicitante?.nome ?? "—"}</div>
                    <div className="hint" style={{ margin: 0 }}>
                      {LABEL_TIPO[s.tipo] ?? s.tipo}
                      {s.solicitante?.telefone ? ` · ${s.solicitante.telefone}` : ""}
                      {` · ${formatoData.format(new Date(s.created_at))}`}
                    </div>
                  </div>
                  <ResponderSolicitacaoButtons solicitacaoId={s.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
