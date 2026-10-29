import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

const PERIODO_DIAS = 30;

const DIAS_SEMANA_ORDEM = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DIAS_SEMANA_LABEL: Record<string, string> = {
  Sun: "Dom",
  Mon: "Seg",
  Tue: "Ter",
  Wed: "Qua",
  Thu: "Qui",
  Fri: "Sex",
  Sat: "Sáb",
};

// Dia da semana no fuso de Brasília — nunca Date.getDay() direto, que
// depende do fuso do processo (mesmo motivo do src/lib/disponibilidade.ts).
function diaSemanaNoFuso(instante: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  }).format(instante);
}

const PAPEIS_COM_DASHBOARD = ["corretor"];

const DIAS_SEM_RETORNO = 14;

type VisitaRow = {
  id: string;
  data_hora: string;
  comprador_id: string | null;
  cliente_avulso_id: string | null;
  status: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=%2Fdashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "";

  if (!PAPEIS_COM_DASHBOARD.includes(role)) {
    return (
      <>
        <Nav active="/dashboard" />
        <div className="wrap">
          <div className="card" style={{ margin: "48px 0", textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              O dashboard é para quem atende visitas — corretores.
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const scopeIds = [user.id];

  const inicioPeriodo = new Date();
  inicioPeriodo.setDate(inicioPeriodo.getDate() - PERIODO_DIAS);

  const [{ data: dadosVisitas }, { data: dadosTodasVisitas }] = await Promise.all([
    supabase
      .from("visitas")
      .select("id, data_hora, comprador_id, cliente_avulso_id, status")
      .in("corretor_id", scopeIds)
      .gte("data_hora", inicioPeriodo.toISOString())
      .lte("data_hora", new Date().toISOString()),
    // Sem corte de 30 dias — "sem retorno" compara contra o último
    // contato de cada cliente, que pode ser mais antigo que o período
    // do resto do dashboard.
    supabase
      .from("visitas")
      .select("id, data_hora, comprador_id, cliente_avulso_id, status")
      .in("corretor_id", scopeIds)
      .lte("data_hora", new Date().toISOString()),
  ]);

  // Cancelada não é atividade real — sem isso, "Visitas agendadas",
  // "Clientes atendidos" e o gráfico por dia da semana ficam inflados
  // com visita que não aconteceu, e "sem retorno" mascara o cliente
  // cujo único contato foi uma visita depois cancelada.
  const visitas = ((dadosVisitas ?? []) as unknown as VisitaRow[]).filter(
    (v) => v.status !== "cancelada",
  );
  const todasVisitas = ((dadosTodasVisitas ?? []) as unknown as VisitaRow[]).filter(
    (v) => v.status !== "cancelada",
  );

  // Cliente avulso e comprador autenticado são identidades distintas —
  // combina as duas pra não contar duas vezes o mesmo comprador, nem
  // juntar clientes avulsos diferentes num só.
  function chaveCliente(v: VisitaRow) {
    return v.comprador_id ?? `avulso:${v.cliente_avulso_id}`;
  }

  const clientesAtendidos = new Set(visitas.map(chaveCliente)).size;

  const contagemPorDia = new Map<string, number>();
  for (const visita of visitas) {
    const dia = diaSemanaNoFuso(new Date(visita.data_hora));
    contagemPorDia.set(dia, (contagemPorDia.get(dia) ?? 0) + 1);
  }
  const maiorContagem = Math.max(1, ...DIAS_SEMANA_ORDEM.map((d) => contagemPorDia.get(d) ?? 0));

  // Pendências — mesmo espírito do "Resumo" do AppBarber (clientes sem
  // retorno, comandas pendentes etc.), adaptado pro que existe aqui.
  const agora = new Date().getTime();

  const visitasAguardandoConfirmacao = visitas.filter((v) => v.status === "solicitada").length;

  const ultimoContatoPorCliente = new Map<string, number>();
  for (const v of todasVisitas) {
    const instante = new Date(v.data_hora).getTime();
    const chave = chaveCliente(v);
    const atual = ultimoContatoPorCliente.get(chave);
    if (!atual || instante > atual) ultimoContatoPorCliente.set(chave, instante);
  }
  const clientesSemRetorno = Array.from(ultimoContatoPorCliente.values()).filter(
    (ultimo) => agora - ultimo > DIAS_SEM_RETORNO * 24 * 60 * 60 * 1000,
  ).length;

  const PENDENCIAS = [
    {
      label: "Visitas aguardando confirmação",
      valor: visitasAguardandoConfirmacao,
      hint: "Pedidos de visita que ainda não foram confirmados.",
    },
    {
      label: `Clientes sem retorno há mais de ${DIAS_SEM_RETORNO} dias`,
      valor: clientesSemRetorno,
      hint: "Última visita faz tempo, sem novo agendamento desde então.",
    },
  ];

  const KPIS = [
    { label: "Visitas agendadas", valor: String(visitas.length) },
    { label: "Clientes atendidos", valor: String(clientesAtendidos) },
  ];

  return (
    <>
      <Nav active="/dashboard" />

      <div className="wrap">
        <div className={styles.topBar}>
          <div>
            <span className="eyebrow">{profile?.nome ?? "Dashboard"}</span>
            <h1 style={{ fontSize: 24, margin: "6px 0 0" }}>Dashboard</h1>
          </div>
          <span className="hint" style={{ margin: 0 }}>Últimos {PERIODO_DIAS} dias</span>
        </div>

        <div className="grid grid-4 mb-24" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="stat">
              <div className="num">{kpi.valor}</div>
              <div className="label">{kpi.label}</div>
            </div>
          ))}
        </div>

        <div className={`card ${styles.chartCard}`}>
          <h2 style={{ fontSize: 16, margin: 0 }}>Visitas por dia da semana</h2>
          <div className={styles.chart}>
            {DIAS_SEMANA_ORDEM.map((dia) => {
              const valor = contagemPorDia.get(dia) ?? 0;
              const altura = Math.max(2, Math.round((valor / maiorContagem) * 100));
              return (
                <div key={dia} className={styles.bar}>
                  <span className={styles.barValor}>{valor}</span>
                  <div className={styles.barFill} style={{ height: `${altura}%` }} />
                  <span className={styles.barLabel}>{DIAS_SEMANA_LABEL[dia]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-24">
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Pendências</h2>
          <div className="grid grid-3">
            {PENDENCIAS.map((p) => (
              <div key={p.label} className="card">
                <div
                  style={{
                    fontSize: 28,
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    color: p.valor > 0 ? "var(--coral)" : "var(--ink)",
                  }}
                >
                  {p.valor}
                </div>
                <strong style={{ fontSize: 13.5 }}>{p.label}</strong>
                <p className="hint" style={{ marginBottom: 0 }}>{p.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
