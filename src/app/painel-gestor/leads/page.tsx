import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { NovoLeadForm } from "./novo-lead-form";
import { ImportarLeadsForm } from "./importar-leads-form";

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  contatado: "Contatado",
  agendado: "Agendado",
  convertido: "Convertido",
  perdido: "Perdido",
};

const STATUS_BADGE: Record<string, string> = {
  novo: "badge-outline",
  contatado: "badge-amber",
  agendado: "badge-primary",
  convertido: "badge-primary",
  perdido: "badge-coral",
};

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

type LeadRow = {
  id: string;
  nome: string;
  telefone: string | null;
  origem: string | null;
  status: string;
  valor_venda: number | null;
  created_at: string;
  corretor: { nome: string } | null;
};

export default async function PainelGestorLeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/painel-gestor/leads");
  }

  const { data: gestorPerfil } = await supabase
    .from("gestor_perfis")
    .select("organizacao_catalogo_id")
    .eq("profile_id", user.id)
    .single();

  if (!gestorPerfil) {
    redirect("/");
  }

  const [{ data: corretoresData }, { data: leadsData }] = await Promise.all([
    supabase
      .from("corretor_perfis")
      .select("profile_id, profiles:profile_id(nome)")
      .eq("organizacao_catalogo_id", gestorPerfil.organizacao_catalogo_id),
    supabase
      .from("leads")
      .select("id, nome, telefone, origem, status, valor_venda, created_at, corretor:corretor_id(nome)")
      .eq("organizacao_catalogo_id", gestorPerfil.organizacao_catalogo_id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const corretores = (corretoresData ?? []).map((c) => ({
    profile_id: c.profile_id as string,
    nome: (c.profiles as unknown as { nome: string } | null)?.nome ?? "—",
  }));
  const leads = (leadsData ?? []) as unknown as LeadRow[];

  return (
    <>
      <Nav active="/painel-gestor" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Painel do gestor</span>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Leads</h1>
            <p className="muted" style={{ marginBottom: 0 }}>
              Entregue um lead a um corretor vinculado — só ele consegue atualizar o andamento
              (contatado, agendado, convertido ou perdido).
            </p>
          </div>
          <Link href="/painel-gestor" className="btn btn-outline btn-sm">
            ← Voltar pro painel
          </Link>
        </div>

        <div className="grid grid-2 mt-24" style={{ gap: 24, alignItems: "start" }}>
          <NovoLeadForm organizacaoId={gestorPerfil.organizacao_catalogo_id} corretores={corretores} />
          <ImportarLeadsForm organizacaoId={gestorPerfil.organizacao_catalogo_id} corretores={corretores} />
        </div>

        <h2 style={{ fontSize: 20, margin: "32px 0 12px" }}>
          Leads entregues{leads.length > 0 ? ` (${leads.length})` : ""}
        </h2>
        {leads.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>Nenhum lead cadastrado ainda.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: "8px 20px" }}>
            {leads.map((lead) => (
              <div key={lead.id} className="list-row">
                <div className="flex between items-center" style={{ width: "100%", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{lead.nome}</div>
                    <div className="hint" style={{ margin: 0 }}>
                      {lead.corretor?.nome ?? "—"}
                      {lead.origem ? ` · ${lead.origem}` : ""}
                      {` · ${formatoData.format(new Date(lead.created_at))}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={`badge ${STATUS_BADGE[lead.status] ?? "badge-outline"}`}>
                      {STATUS_LABEL[lead.status] ?? lead.status}
                    </span>
                    {lead.valor_venda != null && (
                      <div className="hint" style={{ margin: "4px 0 0" }}>
                        {formatoMoeda.format(lead.valor_venda)}
                      </div>
                    )}
                  </div>
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
