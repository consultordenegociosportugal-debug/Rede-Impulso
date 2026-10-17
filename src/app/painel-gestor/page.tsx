import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";

type VisitaRow = {
  id: string;
  status: string;
  corretor_id: string;
  corretor: { nome: string } | null;
};

type NpsRow = {
  nota: number;
  visitas: { corretor_id: string; corretor: { nome: string } | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  solicitada: "Solicitada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  nao_compareceu: "Cliente não apareceu",
  cancelada: "Cancelada",
};

export default async function PainelGestorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/painel-gestor");
  }

  const { data: gestorPerfil } = await supabase
    .from("gestor_perfis")
    .select("organizacao_catalogo_id, organizacao:organizacao_catalogo_id(nome, tipo)")
    .eq("profile_id", user.id)
    .single();

  if (!gestorPerfil) {
    redirect("/");
  }

  const organizacao = gestorPerfil.organizacao as unknown as { nome: string; tipo: string } | null;

  const { data: corretoresData } = await supabase
    .from("corretor_perfis")
    .select("profile_id, profiles:profile_id(nome)")
    .eq("organizacao_catalogo_id", gestorPerfil.organizacao_catalogo_id);

  const corretores = (corretoresData ?? []) as unknown as {
    profile_id: string;
    profiles: { nome: string } | null;
  }[];
  const idsCorretores = corretores.map((c) => c.profile_id);

  let visitas: VisitaRow[] = [];
  let npsRespostas: NpsRow[] = [];

  if (idsCorretores.length > 0) {
    const { data: visitasData } = await supabase
      .from("visitas")
      .select("id, status, corretor_id, corretor:corretor_id(nome)")
      .in("corretor_id", idsCorretores);
    visitas = (visitasData ?? []) as unknown as VisitaRow[];

    const { data: npsData } = await supabase
      .from("nps_respostas")
      .select("nota, visitas!inner(corretor_id, corretor:corretor_id(nome))")
      .in("visitas.corretor_id", idsCorretores);
    npsRespostas = (npsData ?? []) as unknown as NpsRow[];
  }

  const porStatus = new Map<string, number>();
  for (const v of visitas) {
    porStatus.set(v.status, (porStatus.get(v.status) ?? 0) + 1);
  }

  const porCorretor = new Map<
    string,
    { nome: string; total: number; realizadas: number; naoCompareceu: number; canceladas: number; notas: number[] }
  >();
  for (const corretor of corretores) {
    porCorretor.set(corretor.profile_id, {
      nome: corretor.profiles?.nome ?? "—",
      total: 0,
      realizadas: 0,
      naoCompareceu: 0,
      canceladas: 0,
      notas: [],
    });
  }
  for (const v of visitas) {
    const entrada = porCorretor.get(v.corretor_id);
    if (!entrada) continue;
    entrada.total += 1;
    if (v.status === "realizada") entrada.realizadas += 1;
    if (v.status === "nao_compareceu") entrada.naoCompareceu += 1;
    if (v.status === "cancelada") entrada.canceladas += 1;
  }
  for (const r of npsRespostas) {
    const corretorId = r.visitas?.corretor_id;
    if (!corretorId) continue;
    porCorretor.get(corretorId)?.notas.push(r.nota);
  }

  const resumoCorretores = Array.from(porCorretor.values()).sort((a, b) => b.total - a.total);
  const mediaGeral =
    npsRespostas.length > 0
      ? npsRespostas.reduce((s, r) => s + r.nota, 0) / npsRespostas.length
      : null;

  return (
    <>
      <Nav active="/painel-gestor" />
      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <span className="eyebrow">Painel do gestor</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>{organizacao?.nome ?? "Minha organização"}</h1>
        <p className="muted mb-16">
          Métricas dos corretores vinculados a {organizacao?.tipo === "construtora" ? "esta construtora" : "esta imobiliária"}.
        </p>

        <div className="grid grid-3 mb-24">
          <div className="card" style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{visitas.length}</div>
            <div className="hint">Agendamentos no total</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{porStatus.get("realizada") ?? 0}</div>
            <div className="hint">Visitas realizadas</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {(porStatus.get("nao_compareceu") ?? 0) + (porStatus.get("cancelada") ?? 0)}
            </div>
            <div className="hint">Não compareceu ou cancelada</div>
          </div>
        </div>

        <h2 style={{ fontSize: 20, margin: "32px 0 4px" }}>Qualidade do atendimento (NPS)</h2>
        <p className="muted mb-16">
          {mediaGeral !== null
            ? `Média geral: ${mediaGeral.toFixed(1)} (${npsRespostas.length} avaliações).`
            : "Nenhuma avaliação recebida ainda."}
        </p>

        <h2 style={{ fontSize: 20, margin: "32px 0 12px" }}>Corretores ({corretores.length})</h2>
        {resumoCorretores.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum corretor vinculado a esta organização ainda.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: "8px 20px" }}>
            {resumoCorretores.map((c) => {
              const media = c.notas.length > 0 ? c.notas.reduce((s, n) => s + n, 0) / c.notas.length : null;
              return (
                <div key={c.nome} className="list-row">
                  <div className="flex between items-center" style={{ width: "100%", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.nome}</div>
                      <div className="hint" style={{ margin: 0 }}>
                        {c.total} agendamento{c.total === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="hint" style={{ margin: 0 }}>
                      {c.realizadas} realizada{c.realizadas === 1 ? "" : "s"} · {c.naoCompareceu} não
                      compareceu · {c.canceladas} cancelada{c.canceladas === 1 ? "" : "s"}
                    </div>
                    <div style={{ textAlign: "right", minWidth: 80 }}>
                      {media !== null ? (
                        <>
                          <div style={{ fontWeight: 600, fontSize: 16 }}>{media.toFixed(1)}</div>
                          <div className="hint" style={{ margin: 0 }}>NPS</div>
                        </>
                      ) : (
                        <span className="hint">sem avaliação</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <h2 style={{ fontSize: 20, margin: "32px 0 12px" }}>Últimos agendamentos</h2>
        {visitas.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum agendamento ainda.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: "8px 20px" }}>
            {visitas.slice(0, 30).map((v) => (
              <div key={v.id} className="list-row">
                <div className="flex between items-center" style={{ width: "100%", gap: 12 }}>
                  <span style={{ fontSize: 14 }}>{v.corretor?.nome ?? "—"}</span>
                  <span className="badge badge-outline">{STATUS_LABEL[v.status] ?? v.status}</span>
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
