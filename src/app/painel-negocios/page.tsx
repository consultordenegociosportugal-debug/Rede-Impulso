import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";
import { VisitaAcoes } from "./visita-acoes";
import { googleCalendarConfigurado } from "@/lib/google-calendar";

const STATUS_VISITA: Record<string, { label: string; className: string }> = {
  solicitada: { label: "Aguardando você", className: "badge-amber" },
  confirmada: { label: "Confirmada", className: "badge-primary" },
  cancelada: { label: "Cancelada", className: "badge-outline" },
  realizada: { label: "Realizada", className: "badge-outline" },
  nao_compareceu: { label: "Cliente não apareceu", className: "badge-outline" },
};

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

// Retorno do fluxo OAuth (/api/google-calendar/callback) e do caso em
// que as variáveis de ambiente do Google ainda não existem.
const AVISO_GOOGLE: Record<string, string> = {
  conectado: "Google Agenda conectada. Visitas confirmadas viram evento na sua agenda.",
  negado: "Você não autorizou o acesso à Google Agenda. Nada foi alterado.",
  erro: "Não foi possível conectar a Google Agenda. Tente de novo.",
  nao_configurado:
    "A integração com a Google Agenda ainda não foi configurada nesta instalação.",
};

type VisitaRow = {
  id: string;
  data_hora: string;
  status: string;
  observacoes: string | null;
  google_event_id: string | null;
  comprador: { nome: string; telefone: string | null } | null;
  cliente_avulso: { nome: string; telefone: string | null } | null;
};

export default async function PainelNegociosPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { google } = await searchParams;
  const avisoGoogle = google ? AVISO_GOOGLE[google] : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  // Visitas em que este usuário é o responsável. `comprador` aparece
  // quando o cliente agendou direto logado; `cliente_avulso` aparece
  // quando o corretor cadastrou e agendou o cliente diretamente.
  const inicioDeHoje = new Date();
  inicioDeHoje.setHours(0, 0, 0, 0);

  const { data: dadosVisitas } = await supabase
    .from("visitas")
    .select(
      "id, data_hora, status, observacoes, google_event_id, comprador:comprador_id(nome, telefone), cliente_avulso:cliente_avulso_id(nome, telefone)",
    )
    .eq("corretor_id", user.id)
    .gte("data_hora", inicioDeHoje.toISOString())
    .order("data_hora", { ascending: true });
  const visitas = (dadosVisitas ?? []) as unknown as VisitaRow[];

  // A integração é opcional em duas camadas: as variáveis de ambiente
  // podem nem existir, e mesmo existindo cada corretor decide se
  // conecta a própria conta.
  const googleConfigurado = googleCalendarConfigurado();
  const { data: conexaoGoogle } = googleConfigurado
    ? await supabase
        .from("google_calendar_conexoes")
        .select("profile_id, conectado_em")
        .eq("profile_id", user.id)
        .maybeSingle()
    : { data: null };

  const hoje = visitas.filter(
    (v) => new Date(v.data_hora).toDateString() === new Date().toDateString(),
  ).length;
  const confirmadas = visitas.filter((v) => v.status === "confirmada").length;

  const STATS = [
    { num: String(visitas.length), label: "Próximas visitas" },
    { num: String(hoje), label: "Hoje" },
    { num: String(confirmadas), label: "Confirmadas" },
  ];

  return (
    <>
      <Nav active="/painel-negocios" />

      <div className="wrap">
        <div className={styles.topBar}>
          <div>
            <span className="eyebrow">Painel de agendamento</span>
            <h1 style={{ fontSize: 24, margin: "6px 0 0" }}>Suas visitas</h1>
          </div>
          <div className="flex items-center gap-8" style={{ flexWrap: "wrap" }}>
            <Link href="/painel-negocios/clientes" className="btn btn-primary btn-sm">
              + Cadastrar cliente e agendar
            </Link>
            <Link href="/editar-perfil" className="btn btn-outline btn-sm">
              ✏️ Editar perfil
            </Link>
          </div>
        </div>

        <div className="grid grid-3 mb-24">
          {STATS.map((stat) => (
            <div key={stat.label} className="stat">
              <div className="num">{stat.num}</div>
              <div className="label">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-24">
          <div
            className="flex between items-center mb-12"
            style={{ gap: 12, flexWrap: "wrap" }}
          >
            <h2 style={{ fontSize: 18, margin: 0 }}>Visitas agendadas</h2>
            <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
              <Link href="/painel-negocios/disponibilidade" className="btn btn-outline btn-sm">
                🗓️ Minha disponibilidade
              </Link>
              {googleConfigurado ? (
                <a href="/api/google-calendar/conectar" className="btn btn-ghost btn-sm">
                  {conexaoGoogle ? "🔄 Reconectar Google Agenda" : "📅 Conectar Google Agenda"}
                </a>
              ) : (
                <span className="badge badge-outline">Google Agenda não configurada</span>
              )}
            </div>
          </div>

          {avisoGoogle && (
            <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
              {avisoGoogle}
            </p>
          )}

          {googleConfigurado && conexaoGoogle && (
            <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
              Google Agenda conectada — cada visita que você confirmar vira um
              evento na sua agenda automaticamente.
            </p>
          )}

          {visitas.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <p className="muted" style={{ margin: 0 }}>
                Nenhuma visita agendada para os próximos dias.
              </p>
              <p className="hint" style={{ marginTop: 8 }}>
                Configure sua disponibilidade e compartilhe seu perfil, ou cadastre um
                cliente direto para agendar na hora.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: "8px 20px" }}>
              {visitas.map((visita) => {
                const badge = STATUS_VISITA[visita.status] ?? {
                  label: visita.status,
                  className: "badge-outline",
                };
                const nomeCliente = visita.comprador?.nome ?? visita.cliente_avulso?.nome;
                const telefoneCliente =
                  visita.comprador?.telefone ?? visita.cliente_avulso?.telefone;
                return (
                  <div key={visita.id} className="list-row">
                    <div
                      className="flex between items-center"
                      style={{ width: "100%", gap: 12, flexWrap: "wrap" }}
                    >
                      <div style={{ minWidth: 220, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {formatoDataHora.format(new Date(visita.data_hora))}
                        </div>
                        <div className="hint" style={{ margin: 0 }}>
                          Cliente: {nomeCliente ?? "—"}
                          {telefoneCliente ? ` · ${telefoneCliente}` : ""}
                        </div>
                        {visita.observacoes && (
                          <div className="hint" style={{ margin: 0 }}>
                            “{visita.observacoes}”
                          </div>
                        )}
                      </div>
                      <div className="flex gap-8 items-center">
                        <span className={`badge ${badge.className}`}>{badge.label}</span>
                        {visita.google_event_id && (
                          <span className="badge badge-outline">📅 na agenda</span>
                        )}
                      </div>
                      <VisitaAcoes
                        visitaId={visita.id}
                        status={visita.status}
                        dataHora={visita.data_hora}
                        googleEventId={visita.google_event_id}
                        googleConfigurado={googleConfigurado}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
