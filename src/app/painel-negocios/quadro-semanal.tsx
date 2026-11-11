"use client";

import { VisitaAcoes } from "./visita-acoes";
import { ICONE_STATUS_VISITA } from "@/lib/status-visita";
import styles from "./quadro-semanal.module.css";

type VisitaRow = {
  id: string;
  data_hora: string;
  status: string;
  observacoes: string | null;
  google_event_id: string | null;
  comprador: { nome: string; telefone: string | null } | null;
  cliente_avulso: { nome: string; telefone: string | null } | null;
};

const STATUS_VISITA: Record<string, { label: string; className: string }> = {
  solicitada: { label: "Aguardando você", className: "badge-amber" },
  confirmada: { label: "Confirmada", className: "badge-primary" },
  realizada: { label: "Realizada", className: "badge-primary" },
  nao_compareceu: { label: "Não apareceu", className: "badge-coral" },
};

const FUSO = "America/Sao_Paulo";

const formatoHora = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
  timeZone: FUSO,
});
const formatoDiaCurto = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  timeZone: FUSO,
});
const formatoChaveDia = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });

function chaveDoDia(data: Date) {
  return formatoChaveDia.format(data);
}

// Quadro semanal: os próximos 7 dias a partir de hoje, um por coluna —
// visão rápida de quando cada dia está cheio ou livre. A lista por data
// (acima) continua existindo pra quem prefere ver tudo em sequência.
export function QuadroSemanal({
  visitas,
  corretorId,
  googleConfigurado,
}: {
  visitas: VisitaRow[];
  corretorId: string;
  googleConfigurado: boolean;
}) {
  const hojeChave = chaveDoDia(new Date());

  // Ancorado ao meio-dia UTC (não ao "agora" do navegador): se o corretor
  // estiver num fuso diferente de Brasília, `new Date(); d.setDate(...)`
  // soma dias no calendário LOCAL do navegador, não no de Brasília — a
  // coluna "hoje" e a janela de 7 dias podiam ficar um dia deslocadas.
  // `Date.UTC` normaliza o estouro de dia/mês sozinho, e meio-dia UTC
  // nunca cruza a meia-noite quando formatado 3h atrás, em Brasília.
  const [anoBase, mesBase, diaBase] = hojeChave.split("-").map(Number);
  const dias = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(anoBase, mesBase - 1, diaBase + i, 12, 0, 0)),
  );

  const porDia = new Map<string, VisitaRow[]>();
  for (const v of visitas) {
    if (v.status === "cancelada") continue;
    const chave = chaveDoDia(new Date(v.data_hora));
    const lista = porDia.get(chave) ?? [];
    lista.push(v);
    porDia.set(chave, lista);
  }

  return (
    <div className={styles.quadro}>
      {dias.map((dia) => {
        const chave = chaveDoDia(dia);
        const visitasDoDia = (porDia.get(chave) ?? []).sort(
          (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime(),
        );
        return (
          <div key={chave} className={styles.coluna}>
            <div
              className={`${styles.colunaTitulo} ${chave === hojeChave ? styles.colunaTituloHoje : ""}`}
            >
              {formatoDiaCurto.format(dia)}
            </div>
            {visitasDoDia.length === 0 ? (
              <p className="hint" style={{ margin: 0 }}>
                Livre
              </p>
            ) : (
              visitasDoDia.map((v) => {
                const badge = STATUS_VISITA[v.status] ?? {
                  label: v.status,
                  className: "badge-outline",
                };
                const nomeCliente = v.comprador?.nome ?? v.cliente_avulso?.nome ?? "—";
                return (
                  <div key={v.id} className={styles.cartao}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {formatoHora.format(new Date(v.data_hora))}
                    </div>
                    <div className="hint" style={{ margin: "2px 0 6px" }}>
                      {nomeCliente}
                    </div>
                    <span className={`badge ${badge.className}`}>
                      {ICONE_STATUS_VISITA[v.status] ?? ""} {badge.label}
                    </span>
                    <div style={{ marginTop: 8 }}>
                      <VisitaAcoes
                        visitaId={v.id}
                        status={v.status}
                        dataHora={v.data_hora}
                        corretorId={corretorId}
                        googleEventId={v.google_event_id}
                        googleConfigurado={googleConfigurado}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
