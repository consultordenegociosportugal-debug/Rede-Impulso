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
  googleEventId,
  googleConfigurado,
}: {
  visitaId: string;
  status: string;
  dataHora: string;
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
  const [reagendando, setReagendando] = useState(false);
  const [dataNova, setDataNova] = useState(hojeISO());
  const [horarioNovo, setHorarioNovo] = useState<string | null>(null);
  const [horariosLivres, setHorariosLivres] = useState<string[]>([]);
  const [buscandoHorarios, setBuscandoHorarios] = useState(false);
  const [corretorId, setCorretorId] = useState<string | null>(null);

  useEffect(() => {
    if (!reagendando || corretorId) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCorretorId(data.user.id);
    });
  }, [reagendando, corretorId]);

  useEffect(() => {
    if (!reagendando || !corretorId) return;
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

  async function mudar(novoStatus: "confirmada" | "cancelada" | "realizada" | "nao_compareceu") {
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
          body: JSON.stringify({ visita_id: visitaId }),
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
    if (precisaAvisarClienteManualmente) {
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
            router.refresh();
          }}
        >
          OK, entendi
        </button>
      </div>
    );
  }

  if (status === "realizada" || status === "nao_compareceu") return null;

  if (status === "cancelada") {
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

  return (
    <div>
      <div className="flex gap-8 items-center">
        {status === "solicitada" && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => mudar("confirmada")}
            disabled={salvando}
          >
            {salvando ? "Salvando…" : "Confirmar"}
          </button>
        )}
        {status === "confirmada" && !jaPassou && !googleEventId && googleConfigurado && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={sincronizarGoogle}
            disabled={salvando}
          >
            {salvando ? "Sincronizando…" : "📅 Sincronizar com Google"}
          </button>
        )}
        {status === "confirmada" && jaPassou ? (
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
            onClick={() => {
              if (window.confirm("Cancelar essa visita? O cliente será avisado por e-mail/WhatsApp.")) {
                mudar("cancelada");
              }
            }}
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
