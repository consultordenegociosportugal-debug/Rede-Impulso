import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";
import { VisitaAcoes } from "./visita-acoes";
import { QuadroSemanal } from "./quadro-semanal";
import { ViewToggle } from "./view-toggle";
import { LinkPerfilPublico } from "./link-perfil-publico";
import { googleCalendarConfigurado } from "@/lib/google-calendar";
import { hojeISO } from "@/lib/data";

const PAPEIS_COM_PAINEL = ["corretor"];

const STATUS_VISITA: Record<string, { label: string; className: string }> = {
  solicitada: { label: "Aguardando você", className: "badge-amber" },
  confirmada: { label: "Confirmada", className: "badge-primary" },
  cancelada: { label: "Cancelada", className: "badge-outline" },
  realizada: { label: "Realizada", className: "badge-primary" },
  nao_compareceu: { label: "Cliente não apareceu", className: "badge-coral" },
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

  // Este painel é só do corretor — sem isso, qualquer comprador
  // autenticado conseguia abrir a tela (e, pelas outras duas, até
  // configurar disponibilidade e se auto-agendar como se fosse
  // corretor). Mesmo padrão de /relatorio-visitas.
  const { data: perfilUsuario } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!PAPEIS_COM_PAINEL.includes(perfilUsuario?.role ?? "")) {
    return (
      <>
        <Nav active="/painel-negocios" />
        <div className="wrap">
          <div className="card" style={{ margin: "48px 0", textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Este painel é para quem atende visitas — corretores.
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Visitas em que este usuário é o responsável. `comprador` aparece
  // quando o cliente agendou direto logado; `cliente_avulso` aparece
  // quando o corretor cadastrou e agendou o cliente diretamente.
  // -03:00 explícito: `new Date(); .setHours(0,0,0,0)` monta meia-noite no
  // fuso do PROCESSO (UTC na Vercel), não o de Brasília — ficava até 3h
  // adiantado ou atrasado do "hoje" real, dependendo da hora do dia (mesma
  // causa-raiz do bug já corrigido em disponibilidade.ts).
  const inicioDeHojeIso = `${hojeISO()}T00:00:00-03:00`;
  const inicioDeHoje = new Date(inicioDeHojeIso);

  // Sem o "ou status confirmada", uma visita que passou da data e nunca foi
  // marcada como realizada/não compareceu some daqui pra sempre — não
  // aparece mais aqui (já passou) nem no relatório (que não tem os botões
  // de ação), ficando "confirmada" eternamente sem ninguém poder resolver.
  const { data: dadosVisitas } = await supabase
    .from("visitas")
    .select(
      "id, data_hora, status, observacoes, google_event_id, comprador:comprador_id(nome, telefone), cliente_avulso:cliente_avulso_id(nome, telefone)",
    )
    .eq("corretor_id", user.id)
    .or(`data_hora.gte.${inicioDeHojeIso},status.eq.confirmada`)
    .order("data_hora", { ascending: true });
  const visitas = (dadosVisitas ?? []) as unknown as VisitaRow[];

  // Sinal pro corretor quando a agenda está vazia: hoje ele configura
  // disponibilidade e fica esperando sem nenhuma pista do porquê ninguém
  // agendou. Olha disponibilidade configurada + perfil completo (foto,
  // bairros) pra sugerir o próximo passo certo, em vez de só "sem
  // visitas".
  let diagnosticoAgendaVazia: { temDisponibilidade: boolean; perfilCompleto: boolean } | null =
    null;
  if (visitas.length === 0) {
    const [{ count: totalDisponibilidade }, { data: perfilCorretor }, { data: fotoPerfil }] =
      await Promise.all([
        supabase
          .from("disponibilidade_semanal")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", user.id),
        supabase.from("corretor_perfis").select("bairros_atuacao").eq("profile_id", user.id).single(),
        supabase.from("profiles").select("foto_url").eq("id", user.id).single(),
      ]);
    diagnosticoAgendaVazia = {
      temDisponibilidade: (totalDisponibilidade ?? 0) > 0,
      perfilCompleto: Boolean(fotoPerfil?.foto_url) && (perfilCorretor?.bairros_atuacao?.length ?? 0) > 0,
    };
  }
  const linkPerfilPublico = `https://www.redeimpulso.com.br/perfil-corretor?id=${user.id}`;
  // Cancelada não conta como "próxima" nem "hoje" — senão os números do
  // topo ficam inflados com visita que não vai mais acontecer.
  const futuras = visitas.filter(
    (v) => new Date(v.data_hora) >= inicioDeHoje && v.status !== "cancelada",
  );

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

  const hoje = futuras.filter(
    (v) => new Date(v.data_hora).toDateString() === new Date().toDateString(),
  ).length;
  const confirmadas = futuras.filter((v) => v.status === "confirmada").length;

  const STATS = [
    { num: String(futuras.length), label: "Próximas visitas" },
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

        <LinkPerfilPublico link={linkPerfilPublico} />

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
              {!diagnosticoAgendaVazia?.temDisponibilidade ? (
                <p className="hint" style={{ marginTop: 8 }}>
                  Você ainda não configurou nenhum horário de atendimento — sem isso,
                  ninguém consegue agendar com você.{" "}
                  <Link href="/painel-negocios/disponibilidade">Configurar disponibilidade →</Link>
                </p>
              ) : !diagnosticoAgendaVazia.perfilCompleto ? (
                <p className="hint" style={{ marginTop: 8 }}>
                  Sua disponibilidade está configurada, mas seu perfil ainda está
                  incompleto (falta foto ou bairros de atuação) — isso pode estar
                  deixando você de fora da busca de clientes.{" "}
                  <Link href="/editar-perfil">Completar perfil →</Link>
                </p>
              ) : (
                <p className="hint" style={{ marginTop: 8 }}>
                  Seu perfil está pronto — compartilhe o link acima direto com seus
                  clientes pra eles agendarem com você.
                </p>
              )}
              <p className="hint" style={{ marginTop: 8 }}>
                Ou cadastre um cliente direto para agendar na hora.
              </p>
            </div>
          ) : (
            <ViewToggle
              lista={
                <div className="card" style={{ padding: "8px 20px" }}>
                  {visitas.map((visita) => {
                    const badge = STATUS_VISITA[visita.status] ?? {
                      label: visita.status,
                      className: "badge-outline",
                    };
                    const atrasada =
                      visita.status === "confirmada" && new Date(visita.data_hora) < inicioDeHoje;
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
                            {atrasada && <span className="badge badge-amber">Atrasada</span>}
                            <span className={`badge ${badge.className}`}>{badge.label}</span>
                            {visita.google_event_id && (
                              <span className="badge badge-outline">📅 na agenda</span>
                            )}
                          </div>
                          <VisitaAcoes
                            visitaId={visita.id}
                            status={visita.status}
                            dataHora={visita.data_hora}
                            corretorId={user.id}
                            googleEventId={visita.google_event_id}
                            googleConfigurado={googleConfigurado}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              }
              semana={
                <QuadroSemanal
                  visitas={visitas}
                  corretorId={user.id}
                  googleConfigurado={googleConfigurado}
                />
              }
            />
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
