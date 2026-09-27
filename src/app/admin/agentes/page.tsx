import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { AgenteControles } from "./agente-controles";
import { SugestaoBotoes } from "./sugestao-botoes";
import { AprovarTodas } from "./aprovar-todas";

// A fila pode ter centenas de itens (postos de GNV da ANP): mostra os
// primeiros e o total por agente, com "Aprovar todas".
const LIMITE_PENDENTES = 50;

// Painel dos agentes autônomos do braço de elétricos (migração 0033):
// modo/ativo de cada agente, fila de sugestões pendentes para aprovar
// ou rejeitar, e o histórico recente.

type AgenteRow = {
  id: string;
  nome: string;
  descricao: string;
  modo: "aprovacao" | "autonomo";
  ativo: boolean;
  ultima_execucao: string | null;
  ultimo_resultado: string | null;
};

type SugestaoRow = {
  id: string;
  agente_id: string;
  acao: string;
  alvo_id: string | null;
  payload: Record<string, unknown>;
  resumo: string;
  justificativa: string | null;
  fontes: string[];
  status: string;
  erro: string | null;
  revisado_em: string | null;
  created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
  pendente: "badge-amber",
  aplicada: "badge-primary",
  rejeitada: "badge-outline",
  erro: "badge-coral",
};

const SELO_LABEL: Record<string, string> = {
  preco_ok: "Preço dentro do mercado",
  preco_acima: "Preço acima do mercado",
  preco_abaixo: "Preço abaixo do mercado",
  suspeito: "⚠️ Suspeito",
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function linkWhatsApp(telefone: string, mensagem: string) {
  let numero = telefone.replace(/\D/g, "");
  if (numero.length <= 11) numero = `55${numero}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

// Mostra o que exatamente será gravado se a sugestão for aprovada.
function Detalhes({ s }: { s: SugestaoRow }) {
  const p = s.payload;
  const campo = (rotulo: string, valor: unknown) =>
    valor === null || valor === undefined || valor === "" || (Array.isArray(valor) && valor.length === 0) ? null : (
      <div>
        <span className="muted">{rotulo}:</span> {Array.isArray(valor) ? valor.join(", ") : String(valor)}
      </div>
    );

  if (s.acao === "responder_post") {
    return (
      <>
        <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{String(p.texto)}</p>
        <Link href={`/eletricos/comunidade/${s.alvo_id}`} target="_blank" className="hint">
          Ver a publicação →
        </Link>
      </>
    );
  }

  if (s.acao === "avaliar_veiculo") {
    return (
      <>
        <Link href={`/eletricos/veiculos/${s.alvo_id}`} target="_blank" className="hint">
          Ver o anúncio →
        </Link>
        {campo("Selo", SELO_LABEL[String(p.selo)] ?? p.selo)}
        {campo("Nota no anúncio", p.nota)}
      </>
    );
  }

  if (s.acao === "atualizar_eletroposto") {
    return (
      <>
        {campo("Novo status", p.status)}
        {campo("Observações", p.observacoes)}
      </>
    );
  }

  const mensagem = typeof p.mensagem_contato === "string" ? p.mensagem_contato : null;
  const telefone = typeof p.telefone === "string" ? p.telefone : null;

  return (
    <>
      {campo("Endereço", p.endereco)}
      {typeof p.preco === "number" &&
        campo("Preço", `R$ ${p.preco.toFixed(2).replace(".", ",")}/${p.preco_unidade ?? "un."} em ${String(p.preco_atualizado_em ?? "")}`)}
      {p.localizacao_aproximada === true && campo("Localização", "aproximada (pelo CEP)")}
      {campo("Conectores", p.conectores)}
      {campo("Potência (kW)", p.potencia_kw)}
      {campo("Preço/kWh", p.preco_kwh)}
      {campo("Operadora", p.operadora)}
      {campo("Especialidades", p.especialidades)}
      {campo("Marcas", p.atende_marcas)}
      {campo("Telefone", p.telefone)}
      {campo("Descrição", p.descricao ?? p.observacoes)}
      {mensagem && (
        <div className="mt-16" style={{ borderLeft: "3px solid var(--line)", paddingLeft: 12 }}>
          <div className="muted">Mensagem de convite (não é enviada automaticamente):</div>
          <p style={{ whiteSpace: "pre-wrap", margin: "4px 0" }}>{mensagem}</p>
          {telefone && (
            <a href={linkWhatsApp(telefone, mensagem)} target="_blank" rel="noopener noreferrer" className="hint">
              Abrir no WhatsApp →
            </a>
          )}
        </div>
      )}
    </>
  );
}

function Fontes({ fontes }: { fontes: string[] }) {
  if (fontes.length === 0) return null;
  return (
    <div className="hint" style={{ margin: "8px 0 0" }}>
      Fontes:{" "}
      {fontes.map((url, i) => (
        <span key={url}>
          {i > 0 && " · "}
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
          </a>
        </span>
      ))}
    </div>
  );
}

export default async function AdminAgentesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/admin/agentes");
  }

  const { data: meuPerfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!meuPerfil?.is_admin) {
    redirect("/");
  }

  const [{ data: agentesData }, { data: pendentesData }, { data: historicoData }, { data: pendentesPorAgente }] = await Promise.all([
    supabase.from("ev_agentes").select("*").order("nome"),
    supabase
      .from("ev_agente_sugestoes")
      .select("*")
      .eq("status", "pendente")
      .order("created_at", { ascending: true })
      .limit(LIMITE_PENDENTES),
    supabase
      .from("ev_agente_sugestoes")
      .select("*")
      .neq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("ev_agente_sugestoes").select("agente_id").eq("status", "pendente"),
  ]);

  const agentes = (agentesData ?? []) as AgenteRow[];
  const pendentes = (pendentesData ?? []) as SugestaoRow[];
  const historico = (historicoData ?? []) as SugestaoRow[];
  const nomeAgente = new Map(agentes.map((a) => [a.id, a.nome]));
  const totalPendentes = new Map<string, number>();
  for (const s of pendentesPorAgente ?? []) {
    totalPendentes.set(s.agente_id, (totalPendentes.get(s.agente_id) ?? 0) + 1);
  }
  const somaPendentes = [...totalPendentes.values()].reduce((a, b) => a + b, 0);

  return (
    <>
      <Nav active="/admin" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <Link href="/admin" className="hint">
          ← Voltar para a administração
        </Link>
        <span className="eyebrow" style={{ display: "block", marginTop: 16 }}>
          Rede Impulso Elétricos
        </span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Agentes autônomos</h1>
        <p className="muted mb-24">
          Cada agente pesquisa na web uma vez por dia. Em <strong>Pede aprovação</strong>, o que ele propõe
          fica na fila abaixo; em <strong>Autônomo</strong>, ele aplica sozinho e tudo aparece no histórico.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {agentes.map((a) => (
            <div key={a.id} className="card">
              <div className="flex between items-center" style={{ gap: 8 }}>
                <strong>{a.nome}</strong>
                <span className={`badge ${a.modo === "autonomo" ? "badge-primary" : "badge-amber"}`}>
                  {a.modo === "autonomo" ? "Autônomo" : "Pede aprovação"}
                </span>
              </div>
              <p className="hint" style={{ margin: "8px 0" }}>
                {a.descricao}
              </p>
              <p className="hint" style={{ margin: 0 }}>
                {a.ultima_execucao
                  ? `Última execução: ${formatarData(a.ultima_execucao)} — ${a.ultimo_resultado ?? ""}`
                  : "Ainda não executou."}
              </p>
              <AgenteControles agenteId={a.id} modo={a.modo} ativo={a.ativo} />
              {(totalPendentes.get(a.id) ?? 0) > 0 && (
                <AprovarTodas agenteId={a.id} total={totalPendentes.get(a.id)!} />
              )}
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 20, margin: "40px 0 4px" }}>Aguardando aprovação ({somaPendentes})</h2>
        <p className="muted mb-16">
          Aprovar grava a mudança no app na hora. Rejeitar só descarta a sugestão.
          {somaPendentes > pendentes.length && ` Mostrando as ${pendentes.length} mais antigas.`}
        </p>

        {pendentes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nada pendente.
            </p>
          </div>
        ) : (
          pendentes.map((s) => (
            <div key={s.id} className="card mb-16">
              <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
                <div>
                  <span className="hint" style={{ margin: 0 }}>
                    {nomeAgente.get(s.agente_id) ?? s.agente_id} · {formatarData(s.created_at)}
                  </span>
                  <div>
                    <strong>{s.resumo}</strong>
                  </div>
                </div>
                <SugestaoBotoes sugestaoId={s.id} />
              </div>
              <div className="mt-16" style={{ fontSize: 14, lineHeight: 1.6 }}>
                <Detalhes s={s} />
              </div>
              {s.justificativa && (
                <p className="hint" style={{ margin: "8px 0 0" }}>
                  Por quê: {s.justificativa}
                </p>
              )}
              <Fontes fontes={s.fontes} />
            </div>
          ))
        )}

        <h2 style={{ fontSize: 20, margin: "40px 0 16px" }}>Histórico recente</h2>
        {historico.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhuma sugestão revisada ainda.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: "8px 20px" }}>
            {historico.map((s) => (
              <div key={s.id} className="list-row" style={{ flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div>{s.resumo}</div>
                  <div className="hint" style={{ margin: 0 }}>
                    {nomeAgente.get(s.agente_id) ?? s.agente_id} · {formatarData(s.revisado_em ?? s.created_at)}
                    {s.erro ? ` · ${s.erro}` : ""}
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGE[s.status] ?? "badge-outline"}`}>{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
