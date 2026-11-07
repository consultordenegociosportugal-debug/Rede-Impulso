"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hojeISO } from "@/lib/data";

type Status = "idle" | "abrindo" | "enviando" | "sucesso";

const formatoDataLonga = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

// Mesma lógica de AgendarVisitaButton (src/app/imoveis/[id]/), mas
// agenda direto com o corretor — sem passar por um imóvel. É o botão
// "cliente agenda sozinho" do pivô para agendamento, igual o AppBarber.
export function AgendarComCorretorButton({
  corretorId,
  corretorNome,
  logado,
}: {
  corretorId: string;
  corretorNome: string;
  logado: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState(hojeISO());
  const [horario, setHorario] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [configurado, setConfigurado] = useState(true);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<string | null>(null);
  const [avisoWhatsapp, setAvisoWhatsapp] = useState(false);

  useEffect(() => {
    if (status !== "abrindo") return;
    let ativo = true;

    fetch(`/api/visitas/horarios-disponiveis?corretor_id=${corretorId}&data=${data}`)
      .then((r) => r.json())
      .then((dados: { configurado: boolean; horarios: string[] }) => {
        if (!ativo) return;
        setConfigurado(dados.configurado);
        setHorarios(dados.configurado ? dados.horarios : null);
      })
      .catch(() => {
        if (ativo) setConfigurado(false);
      })
      .finally(() => {
        if (ativo) setCarregandoHorarios(false);
      });

    return () => {
      ativo = false;
    };
  }, [status, data, corretorId]);

  function abrir() {
    if (!logado) {
      router.push(`/entrar?depois=/perfil-corretor?id=${corretorId}`);
      return;
    }
    setCarregandoHorarios(true);
    setHorario(null);
    setStatus("abrindo");
  }

  async function agendarSlot() {
    if (!horario) return;
    setErro(null);
    setStatus("enviando");

    try {
      const resposta = await fetch("/api/visitas/agendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corretor_id: corretorId, data, horario, observacoes }),
      });
      const dados = (await resposta.json()) as {
        erro?: string;
        precisaAvisarClienteManualmente?: boolean;
      };

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível agendar.");
        setStatus("abrindo");
        return;
      }

      setConfirmacao(
        `${formatoDataLonga.format(new Date(`${data}T${horario}`))}, ${horario}`,
      );
      setAvisoWhatsapp(Boolean(dados.precisaAvisarClienteManualmente));
      setStatus("sucesso");
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setStatus("abrindo");
    }
  }

  if (status === "sucesso" && confirmacao) {
    return (
      <div className="card-flat" style={{ textAlign: "center" }}>
        <span className="badge badge-primary">Visita confirmada</span>
        <p className="hint" style={{ marginBottom: avisoWhatsapp ? 8 : 0 }}>
          Combinado! Sua visita com {corretorNome} está confirmada para {confirmacao}.
        </p>
        {avisoWhatsapp && (
          <p className="hint" style={{ color: "var(--coral)", marginBottom: 0 }}>
            ⚠️ Não conseguimos te avisar por WhatsApp — guarde esta confirmação.
          </p>
        )}
      </div>
    );
  }

  if (status === "idle") {
    return (
      <button type="button" className="btn btn-primary btn-block" onClick={abrir}>
        📅 Agendar com {corretorNome}
      </button>
    );
  }

  return (
    <div>
      <div className="field">
        <label htmlFor="agendar-data">Quando você quer agendar?</label>
        <input
          type="date"
          id="agendar-data"
          value={data}
          min={hojeISO()}
          onChange={(e) => {
            setData(e.target.value);
            setCarregandoHorarios(true);
            setHorario(null);
          }}
        />
      </div>

      {carregandoHorarios ? (
        <p className="hint">Buscando horários livres…</p>
      ) : configurado && horarios && horarios.length > 0 ? (
        <div className="field">
          <label>Horários livres nesse dia</label>
          <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
            {horarios.map((h) => (
              <button
                key={h}
                type="button"
                className={horario === h ? "badge badge-primary" : "badge badge-outline"}
                style={{ cursor: "pointer", border: "none" }}
                onClick={() => setHorario(h)}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="hint">Nenhum horário livre nesse dia — tente outra data.</p>
      )}

      <div className="field">
        <label htmlFor="agendar-obs">
          Observações{" "}
          <span className="muted" style={{ fontWeight: 400 }}>
            (opcional)
          </span>
        </label>
        <textarea
          id="agendar-obs"
          rows={2}
          placeholder="Algo que o corretor devia saber antes do atendimento?"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>

      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}

      <div className="flex gap-8">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={agendarSlot}
          disabled={!horario || status === "enviando"}
        >
          {status === "enviando" ? "Confirmando…" : "Confirmar agendamento"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setStatus("idle")}
          disabled={status === "enviando"}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
