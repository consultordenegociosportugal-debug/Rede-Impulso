import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";

type VisitaRow = {
  id: string;
  status: string;
  data_hora: string;
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

type Periodo = "mes_atual" | "mes_passado" | "ultimos_30" | "tudo";

const PERIODO_LABEL: Record<Periodo, string> = {
  mes_atual: "Este mês",
  mes_passado: "Mês passado",
  ultimos_30: "Últimos 30 dias",
  tudo: "Tudo",
};

function dataISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Calcula o intervalo [inicio, fim] (ou null em "tudo") a partir do
// preset escolhido — tudo em horário local, não UTC, pra "este mês" não
// cortar o dia 1 por causa do fuso.
function intervaloDoPeriodo(periodo: Periodo): { inicio: string; fim: string } | null {
  const hoje = new Date();
  if (periodo === "mes_atual") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { inicio: dataISO(inicio), fim: dataISO(fim) };
  }
  if (periodo === "mes_passado") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    return { inicio: dataISO(inicio), fim: dataISO(fim) };
  }
  if (periodo === "ultimos_30") {
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - 30);
    return { inicio: dataISO(inicio), fim: dataISO(hoje) };
  }
  return null;
}

// Percentual pronto pra exibir, sem dividir por zero quando o corretor
// ainda não teve nenhum agendamento no período.
function pct(parte: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((parte / total) * 100)}%`;
}

export default async function PainelGestorPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo: periodoParam } = await searchParams;
  const periodo: Periodo =
    periodoParam === "mes_passado" || periodoParam === "ultimos_30" || periodoParam === "tudo"
      ? periodoParam
      : "mes_atual";
  const intervalo = intervaloDoPeriodo(periodo);

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
    let queryVisitas = supabase
      .from("visitas")
      .select("id, status, data_hora, corretor_id, corretor:corretor_id(nome)")
      .in("corretor_id", idsCorretores)
      .order("data_hora", { ascending: false });
    if (intervalo) {
      queryVisitas = queryVisitas
        .gte("data_hora", `${intervalo.inicio}T00:00:00`)
        .lte("data_hora", `${intervalo.fim}T23:59:59`);
    }
    const { data: visitasData } = await queryVisitas;
    visitas = (visitasData ?? []) as unknown as VisitaRow[];

    let queryNps = supabase
      .from("nps_respostas")
      .select("nota, visitas!inner(corretor_id, corretor:corretor_id(nome), data_hora)")
      .in("visitas.corretor_id", idsCorretores);
    if (intervalo) {
      queryNps = queryNps
        .gte("visitas.data_hora", `${intervalo.inicio}T00:00:00`)
        .lte("visitas.data_hora", `${intervalo.fim}T23:59:59`);
    }
    const { data: npsData } = await queryNps;
    npsRespostas = (npsData ?? []) as unknown as NpsRow[];
  }

  const porStatus = new Map<string, number>();
  for (const v of visitas) {
    porStatus.set(v.status, (porStatus.get(v.status) ?? 0) + 1);
  }
  const totalVisitas = visitas.length;
  const realizadasTotal = porStatus.get("realizada") ?? 0;
  const naoCompareceuTotal = porStatus.get("nao_compareceu") ?? 0;
  const canceladasTotal = porStatus.get("cancelada") ?? 0;

  const porCorretor = new Map<
    string,
    {
      nome: string;
      total: number;
      realizadas: number;
      naoCompareceu: number;
      canceladas: number;
      notas: number[];
    }
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

  // Ranking por taxa de sucesso, não por volume — um corretor com 2
  // visitas e 2 realizadas deve aparecer acima de outro com 20 visitas e
  // 5 realizadas. Quem não teve nenhum agendamento no período vai pro
  // fim, sem taxa calculável.
  const resumoCorretores = Array.from(porCorretor.entries())
    .map(([id, dados]) => ({ id, ...dados }))
    .sort((a, b) => {
      const taxaA = a.total > 0 ? a.realizadas / a.total : -1;
      const taxaB = b.total > 0 ? b.realizadas / b.total : -1;
      return taxaB - taxaA;
    });
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

        <div className="flex gap-8 mb-24" style={{ flexWrap: "wrap" }}>
          {(Object.keys(PERIODO_LABEL) as Periodo[]).map((p) => (
            <Link
              key={p}
              href={`/painel-gestor?periodo=${p}`}
              // Sem isso, o Next prefetch de cada botão de período assim
              // que a tela montava, multiplicando requisições concorrentes
              // pra mesma URL sem necessidade (só 4 períodos, trocados
              // raramente) — reduz ruído de rede, não é fix de bug.
              prefetch={false}
              className={`btn btn-sm ${p === periodo ? "btn-primary" : "btn-outline"}`}
            >
              {PERIODO_LABEL[p]}
            </Link>
          ))}
        </div>

        <div className="grid grid-3 mb-24">
          <div className="card" style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{totalVisitas}</div>
            <div className="hint">Agendamentos no período</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{pct(realizadasTotal, totalVisitas)}</div>
            <div className="hint">Taxa de sucesso ({realizadasTotal} realizada{realizadasTotal === 1 ? "" : "s"})</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {pct(naoCompareceuTotal + canceladasTotal, totalVisitas)}
            </div>
            <div className="hint">
              Não compareceu ou cancelada ({naoCompareceuTotal + canceladasTotal})
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: 20, margin: "32px 0 4px" }}>Qualidade do atendimento (NPS)</h2>
        <p className="muted mb-16">
          {mediaGeral !== null
            ? `Média geral: ${mediaGeral.toFixed(1)} (${npsRespostas.length} avaliações).`
            : "Nenhuma avaliação recebida neste período."}
        </p>

        <h2 style={{ fontSize: 20, margin: "32px 0 12px" }}>Corretores por taxa de sucesso ({corretores.length})</h2>
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
                <div key={c.id} className="list-row">
                  <div className="flex between items-center" style={{ width: "100%", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.nome}</div>
                      <div className="hint" style={{ margin: 0 }}>
                        {c.total} agendamento{c.total === 1 ? "" : "s"} no período
                      </div>
                    </div>
                    <div className="hint" style={{ margin: 0 }}>
                      {pct(c.realizadas, c.total)} sucesso · {pct(c.naoCompareceu, c.total)} não
                      compareceu · {pct(c.canceladas, c.total)} cancelada
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

        <h2 style={{ fontSize: 20, margin: "32px 0 12px" }}>Agendamentos no período</h2>
        {visitas.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum agendamento neste período.
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
            {visitas.length > 30 && (
              <p className="hint" style={{ padding: "8px 0 0" }}>
                Mostrando os 30 mais recentes de {visitas.length}.
              </p>
            )}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
