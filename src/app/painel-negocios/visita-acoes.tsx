"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    router.refresh();
  }

  if (status === "cancelada" || status === "realizada" || status === "nao_compareceu") return null;

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
            onClick={() => mudar("cancelada")}
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
