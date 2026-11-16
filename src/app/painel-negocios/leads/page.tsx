import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { LeadCard } from "./lead-card";

type LeadRow = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: string | null;
  observacoes: string | null;
  status: string;
  valor_venda: number | null;
};

export default async function PainelNegociosLeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/painel-negocios/leads");
  }

  const { data } = await supabase
    .from("leads")
    .select("id, nome, telefone, email, origem, observacoes, status, valor_venda")
    .eq("corretor_id", user.id)
    .order("created_at", { ascending: false });

  const leads = (data ?? []) as LeadRow[];
  const emAndamento = leads.filter((l) => l.status !== "convertido" && l.status !== "perdido");
  const encerrados = leads.filter((l) => l.status === "convertido" || l.status === "perdido");

  return (
    <>
      <Nav active="/painel-negocios/leads" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Agendamento</span>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Meus leads</h1>
            <p className="muted" style={{ marginBottom: 0 }}>
              Leads que o gestor da sua imobiliária/construtora entregou pra você.
            </p>
          </div>
          <Link href="/painel-negocios" className="btn btn-outline btn-sm">
            ← Voltar pro painel
          </Link>
        </div>

        {leads.length === 0 ? (
          <div className="card mt-24" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum lead entregue ainda — eles aparecem aqui assim que o gestor da sua
              organização cadastrar um pra você.
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 18, margin: "24px 0 12px" }}>
              Em andamento{emAndamento.length > 0 ? ` (${emAndamento.length})` : ""}
            </h2>
            {emAndamento.length === 0 ? (
              <p className="hint">Nenhum lead em andamento agora.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {emAndamento.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} corretorId={user.id} />
                ))}
              </div>
            )}

            {encerrados.length > 0 && (
              <>
                <h2 style={{ fontSize: 18, margin: "32px 0 12px" }}>
                  Encerrados ({encerrados.length})
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {encerrados.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} corretorId={user.id} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <Footer />
    </>
  );
}
