"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hojeISO } from "@/lib/data";

// Confirmar/cancelar uma visita. A gravação no Supabase é o que vale:
// a chamada de sincronia com o Google Agenda vem depois, é
// best-effort e qualquer falha dela nunca desfaz a mudança de status.
export function VisitaAcoes({
  visitaId,
  status,
  dataHora,
  corretorId,
  googleEventId,
  googleConfigurado,
}: {
  visitaId: string;
  status: string;
  dataHora: string;
  corretorId: string;
  googleEventId?: string | null;
  googleConfigurado?: boolean;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Mostrado ANTES do router.refresh() — depois do refresh esta visita
  // pode virar outra linha (reagendar cria uma visita nova) ou sumir da
  // lista (cancelar), então um aviso que esperasse o refresh pra aparecer
  // nunca seria visto. Fica parado na tela até o corretor confirmar que
  // leu, só então atualiza a lista.
  const [avisoPendente, setAvisoPendente] = useState<string | null>(null);
  // O que fazer quando o corretor confirma que leu o avisoPendente —
  // depende de qual ação gerou o aviso (cancelar leva pro reagendamento
  // direto; reagendar só precisa atualizar a lista).
  const [avisoPendenteContinuacao, setAvisoPendenteContinuacao] = useState<(() => void) | null>(
    null,
  );
  const [statusAtual, setStatusAtual] = useState(status);
  const [cancelando, setCancelando] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [reagendando, setReagendando] = useState(false);
  const [dataNova, setDataNova] = useState(hojeISO());
  const [horarioNovo, setHorarioNovo] = useState<string | null>(null);
  const [horariosLivres, setHorariosLivres] = useState<string[]>([]);
  const [buscandoHorarios, setBuscandoHorarios] = useState(false);

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

  async function confirmarReagendamento() {
    if (!horarioNovo) return;
    setSalvando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/visitas/reagendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visita_id: visitaId, data: dataNova, horario: horarioNovo }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as {
        erro?: string;
        precisaAvisarClienteManualmente?: boolean;
      };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível reagendar.");
        setSalvando(false);
        return;
      }
      setSalvando(false);
      setReagendando(false);
      if (dados.precisaAvisarClienteManualmente) {
        setAvisoPendente(
          "⚠️ Visita reagendada, mas não conseguimos confirmar por WhatsApp — avise o cliente manualmente.",
        );
      } else {
        router.refresh();
      }
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setSalvando(false);
    }
  }

  async function sincronizarGoogle() {
    setSalvando(true);
    setErro(null);
    setAviso(null);

    try {
      const resposta = await fetch("/api/google-calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visita_id: visitaId, acao: "confirmar" }),
      });
      const dados = (await resposta.json()) as { sincronizado?: boolean; motivo?: string };

      if (dados.sincronizado) {
        setAviso("Evento criado na sua Google Agenda.");
      } else if (dados.motivo === "reconectar") {
        setAviso("Reconecte sua Google Agenda para sincronizar.");
      } else if (dados.motivo === "sem_conexao") {
        setAviso("Conecte sua Google Agenda para sincronizar visitas.");
      }
    } catch {
      // Sem internet, Google fora do ar: ignora, best-effort.
    }

    setSalvando(false);
    router.refresh();
  }

  async function mudar(
    novoStatus: "confirmada" | "cancelada" | "realizada" | "nao_compareceu",
    motivo?: string,
  ) {
    setSalvando(true);
    setErro(null);
    setAviso(null);
    let precisaAvisarClienteManualmente = false;

    // Cancelar passa pela API em vez de um update direto — não é só
    // mudar o status, também avisa o cliente por e-mail/WhatsApp, o que
    // exige a service role.
    if (novoStatus === "cancelada") {
      try {
        const resposta = await fetch("/api/visitas/cancelar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visita_id: visitaId, motivo }),
        });
        const dados = (await resposta.json().catch(() => ({}))) as {
          erro?: string;
          precisaAvisarClienteManualmente?: boolean;
        };
        if (!resposta.ok) {
          setErro(dados.erro ?? "Não foi possível cancelar a visita.");
          setSalvando(false);
          return;
        }
        precisaAvisarClienteManualmente = Boolean(dados.precisaAvisarClienteManualmente);
      } catch {
        setErro("Sem conexão no momento. Tente de novo.");
        setSalvando(false);
        return;
      }
    } else {
      const supabase = createClient();
      const { error } = await supabase
        .from("visitas")
        .update({ status: novoStatus })
        .eq("id", visitaId);

      if (error) {
        setErro(error.message);
        setSalvando(false);
        return;
      }
    }

    // Daqui pra baixo nada pode derrubar a operação — a visita já está
    // com o novo status na Rede Impulso. Realizada/não compareceu são
    // marcadas depois que a visita já aconteceu — não mexem na agenda.
    if (novoStatus === "confirmada" || novoStatus === "cancelada") {
      try {
        const resposta = await fetch("/api/google-calendar/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visita_id: visitaId,
            acao: novoStatus === "confirmada" ? "confirmar" : "cancelar",
          }),
        });

        if (resposta.ok) {
          const dados = (await resposta.json()) as {
            sincronizado?: boolean;
            motivo?: string;
          };
          if (dados.sincronizado && novoStatus === "confirmada") {
            setAviso("Evento criado na sua Google Agenda.");
          } else if (dados.motivo === "reconectar") {
            setAviso("Reconecte sua Google Agenda para sincronizar.");
          }
        }
      } catch {
        // Sem internet, Google fora do ar, rota indisponível: ignora.
      }
    }

    setSalvando(false);

    if (novoStatus === "cancelada") {
      // Vai direto pro reagendamento com o mesmo cliente — sem isso o
      // corretor precisava esperar a lista recarregar e achar a visita
      // cancelada de novo só pra clicar em "Reagendar".
      setStatusAtual("cancelada");
      setCancelando(false);
      setMotivoCancelamento("");
      if (precisaAvisarClienteManualmente) {
        setAvisoPendenteContinuacao(() => () => {
          setReagendando(true);
          router.refresh();
        });
        setAvisoPendente(
          "⚠️ Visita cancelada, mas não conseguimos avisar por WhatsApp — avise o cliente manualmente.",
        );
      } else {
        setReagendando(true);
        router.refresh();
      }
      return;
    }

    if (precisaAvisarClienteManualmente) {
      setAvisoPendenteContinuacao(() => () => router.refresh());
      setAvisoPendente(
        "⚠️ Visita cancelada, mas não conseguimos avisar por WhatsApp — avise o cliente manualmente.",
      );
    } else {
      router.refresh();
    }
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
            const continuacao = avisoPendenteContinuacao;
            setAvisoPendenteContinuacao(null);
            if (continuacao) continuacao();
            else router.refresh();
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
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setReagendando(true)}
        >
          🔁 Reagendar
        </button>
      );
    }
    return (
      <div className="card" style={{ padding: 12, minWidth: 220 }}>
        <div className="field" style={{ marginBottom: 8 }}>
          <label className="hint" style={{ marginBottom: 4 }}>
            Novo dia
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
            onClick={confirmarReagendamento}
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
            Cancelar
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

  const jaPassou = new Date(dataHora).getTime() < Date.now();

  if (cancelando) {
    return (
      <div className="card" style={{ padding: 12, minWidth: 260 }}>
        <div className="field" style={{ marginBottom: 8 }}>
          <label className="hint" style={{ marginBottom: 4 }}>
            Motivo do cancelamento
          </label>
          <textarea
            rows={2}
            value={motivoCancelamento}
            onChange={(e) => setMotivoCancelamento(e.target.value)}
            placeholder="Ex.: cliente pediu para remarcar, imprevisto do corretor…"
            autoFocus
          />
        </div>
        <p className="hint" style={{ marginBottom: 8 }}>
          O cliente será avisado por e-mail/WhatsApp. Depois de cancelar, você já pode reagendar
          com o mesmo cliente.
        </p>
        <div className="flex gap-8">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => mudar("cancelada", motivoCancelamento.trim() || undefined)}
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
    <div>
      <div className="flex gap-8 items-center">
        {statusAtual === "solicitada" && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => mudar("confirmada")}
            disabled={salvando}
          >
            {salvando ? "Salvando…" : "Confirmar"}
          </button>
        )}
        {statusAtual === "confirmada" && !jaPassou && !googleEventId && googleConfigurado && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={sincronizarGoogle}
            disabled={salvando}
          >
            {salvando ? "Sincronizando…" : "📅 Sincronizar com Google"}
          </button>
        )}
        {statusAtual === "confirmada" && jaPassou ? (
          <>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => mudar("realizada")}
              disabled={salvando}
            >
              {salvando ? "Salvando…" : "Realizada"}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => mudar("nao_compareceu")}
              disabled={salvando}
            >
              Cliente não apareceu
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setCancelando(true)}
            disabled={salvando}
          >
            Cancelar
          </button>
        )}
      </div>
      {aviso && (
        <p className="hint" style={{ marginBottom: 0 }}>
          {aviso}
        </p>
      )}
      {erro && (
        <p className="hint" style={{ color: "var(--coral)", marginBottom: 0 }}>
          {erro}
        </p>
      )}
    </div>
  );
}
