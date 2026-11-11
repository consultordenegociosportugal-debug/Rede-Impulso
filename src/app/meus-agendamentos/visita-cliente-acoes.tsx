"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hojeISO } from "@/lib/data";

// Cancelar a própria visita e, se quiser, já escolher outro horário com
// o mesmo corretor — espelha VisitaAcoes (painel-negocios), que faz o
// mesmo do lado do corretor. RLS (migração 0080) é o que de fato permite
// esse update: antes só o corretor podia mudar o status da visita.
export function VisitaClienteAcoes({
  visitaId,
  status,
  dataHora,
  corretorId,
  corretorNome,
}: {
  visitaId: string;
  status: string;
  dataHora: string;
  corretorId: string;
  corretorNome: string;
}) {
  const router = useRouter();
  const [statusAtual, setStatusAtual] = useState(status);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [cancelando, setCancelando] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  const [avisoPendente, setAvisoPendente] = useState<string | null>(null);

  const [reagendando, setReagendando] = useState(false);
  const [dataNova, setDataNova] = useState(hojeISO());
  const [horarioNovo, setHorarioNovo] = useState<string | null>(null);
  const [horariosLivres, setHorariosLivres] = useState<string[]>([]);
  const [buscandoHorarios, setBuscandoHorarios] = useState(false);
  const [novaConfirmacao, setNovaConfirmacao] = useState<string | null>(null);
  const [novaConfirmacaoSemWhatsapp, setNovaConfirmacaoSemWhatsapp] = useState(false);

  // Mesmo motivo do painel do corretor: o componente não desmonta entre
  // visitas da lista (mesma key), então sem isso o status ficaria preso
  // no valor antigo depois de um router.refresh() feito por outra ação.
  useEffect(() => {
    setStatusAtual(status);
  }, [status]);

  useEffect(() => {
    if (!reagendando) return;
    let cancelado = false;
    setBuscandoHorarios(true);
    setHorarioNovo(null);
    fetch(`/api/visitas/horarios-disponiveis?corretor_id=${corretorId}&data=${dataNova}`)
      .then((r) => r.json())
      .then((dados: { configurado: boolean; horarios: string[] }) => {
        if (cancelado) return;
        setHorariosLivres(dados.configurado ? dados.horarios : []);
      })
      .catch(() => {
        if (!cancelado) setHorariosLivres([]);
      })
      .finally(() => {
        if (!cancelado) setBuscandoHorarios(false);
      });
    return () => {
      cancelado = true;
    };
  }, [reagendando, corretorId, dataNova]);

  async function cancelar() {
    setSalvando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/visitas/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visita_id: visitaId, motivo: motivoCancelamento.trim() || undefined }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as {
        erro?: string;
        precisaAvisarManualmente?: boolean;
      };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível cancelar a visita.");
        setSalvando(false);
        return;
      }

      setSalvando(false);
      setStatusAtual("cancelada");
      setCancelando(false);
      setMotivoCancelamento("");

      // Vai direto pra escolha de outro horário com o mesmo corretor —
      // sem isso, cancelar e reagendar seriam duas idas separadas à tela.
      if (dados.precisaAvisarManualmente) {
        setAvisoPendente(
          `⚠️ Visita cancelada, mas não conseguimos avisar ${corretorNome} por WhatsApp — avise por fora.`,
        );
      } else {
        setReagendando(true);
        router.refresh();
      }
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setSalvando(false);
    }
  }

  async function agendarNovoHorario() {
    if (!horarioNovo) return;
    setSalvando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/visitas/agendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corretor_id: corretorId, data: dataNova, horario: horarioNovo }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as {
        erro?: string;
        precisaAvisarClienteManualmente?: boolean;
      };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível agendar.");
        setSalvando(false);
        return;
      }
      setSalvando(false);
      setNovaConfirmacao(`${dataNova.split("-").reverse().join("/")}, ${horarioNovo}`);
      setNovaConfirmacaoSemWhatsapp(Boolean(dados.precisaAvisarClienteManualmente));
      setReagendando(false);
      router.refresh();
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setSalvando(false);
    }
  }

  if (novaConfirmacao) {
    return (
      <div>
        <p className="hint" style={{ marginBottom: 0, color: "var(--primary-dark)" }}>
          ✓ Novo horário marcado com {corretorNome}: {novaConfirmacao}.
        </p>
        {novaConfirmacaoSemWhatsapp && (
          <p className="hint" style={{ color: "var(--coral)", marginBottom: 0 }}>
            ⚠️ Não conseguimos confirmar por WhatsApp — guarde esta confirmação.
          </p>
        )}
      </div>
    );
  }

  if (avisoPendente) {
    return (
      <div className="card-flat" style={{ padding: 12 }}>
        <p className="hint" style={{ color: "var(--coral)", marginBottom: 8 }}>
          {avisoPendente}
        </p>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => {
            setAvisoPendente(null);
            setReagendando(true);
            router.refresh();
          }}
        >
          OK, entendi
        </button>
      </div>
    );
  }

  if (statusAtual === "realizada" || statusAtual === "nao_compareceu") return null;

  if (statusAtual === "cancelada") {
    if (!reagendando) {
      return (
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setReagendando(true)}>
          📅 Agendar outro horário
        </button>
      );
    }
    return (
      <div className="card" style={{ padding: 12, minWidth: 240 }}>
        <div className="field" style={{ marginBottom: 8 }}>
          <label className="hint" style={{ marginBottom: 4 }}>
            Novo dia com {corretorNome}
          </label>
          <input
            type="date"
            value={dataNova}
            min={hojeISO()}
            onChange={(e) => setDataNova(e.target.value)}
          />
        </div>
        {buscandoHorarios ? (
          <p className="hint">Buscando horários livres…</p>
        ) : horariosLivres.length > 0 ? (
          <div className="flex gap-8" style={{ flexWrap: "wrap", marginBottom: 8 }}>
            {horariosLivres.map((h) => (
              <button
                key={h}
                type="button"
                className={horarioNovo === h ? "badge badge-primary" : "badge badge-outline"}
                style={{ cursor: "pointer", border: "none" }}
                onClick={() => setHorarioNovo(h)}
              >
                {h}
              </button>
            ))}
          </div>
        ) : (
          <p className="hint">Nenhum horário livre nesse dia — tente outra data.</p>
        )}
        <div className="flex gap-8">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={agendarNovoHorario}
            disabled={!horarioNovo || salvando}
          >
            {salvando ? "Agendando…" : "Confirmar"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setReagendando(false)}
            disabled={salvando}
          >
            Voltar
          </button>
        </div>
        {erro && (
          <p className="hint" style={{ color: "var(--coral)", marginBottom: 0 }}>
            {erro}
          </p>
        )}
      </div>
    );
  }

  // Só solicitada/confirmada chegam aqui. Uma visita já passada que o
  // corretor ainda não marcou como realizada/não-compareceu não tem
  // mais sentido cancelar — por isso o botão só aparece pra quem está
  // no futuro.
  const jaPassou = new Date(dataHora).getTime() < Date.now();
  if (jaPassou) return null;

  if (cancelando) {
    return (
      <div className="card" style={{ padding: 12, minWidth: 260 }}>
        <div className="field" style={{ marginBottom: 8 }}>
          <label className="hint" style={{ marginBottom: 4 }}>
            Motivo do cancelamento{" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              (opcional)
            </span>
          </label>
          <textarea
            rows={2}
            value={motivoCancelamento}
            onChange={(e) => setMotivoCancelamento(e.target.value)}
            placeholder="Ex.: imprevisto, prefiro outro horário…"
            autoFocus
          />
        </div>
        <p className="hint" style={{ marginBottom: 8 }}>
          {corretorNome} será avisado por e-mail/WhatsApp.
        </p>
        <div className="flex gap-8">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={cancelar}
            disabled={salvando}
          >
            {salvando ? "Cancelando…" : "Cancelar visita"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setCancelando(false);
              setMotivoCancelamento("");
            }}
            disabled={salvando}
          >
            Voltar
          </button>
        </div>
        {erro && (
          <p className="hint" style={{ color: "var(--coral)", marginBottom: 0 }}>
            {erro}
          </p>
        )}
      </div>
    );
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCancelando(true)}>
      Cancelar
    </button>
  );
}
