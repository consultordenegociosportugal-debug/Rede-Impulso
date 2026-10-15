"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "abrindo" | "enviando" | "sucesso";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

const formatoDataLonga = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

export function AgendarVisitaButton({
  imovelId,
  logado,
}: {
  imovelId: string;
  logado: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState(hojeISO());
  const [horario, setHorario] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [configurado, setConfigurado] = useState(true);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [dataHoraLivre, setDataHoraLivre] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<{ instantanea: boolean; quando: string } | null>(
    null,
  );

  useEffect(() => {
    if (status !== "abrindo") return;
    let ativo = true;

    fetch(`/api/visitas/horarios-disponiveis?imovel_id=${imovelId}&data=${data}`)
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
  }, [status, data, imovelId]);

  function abrir() {
    if (!logado) {
      router.push(`/entrar?depois=/imoveis/${imovelId}`);
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
        body: JSON.stringify({ imovel_id: imovelId, data, horario, observacoes }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível agendar.");
        setStatus("abrindo");
        return;
      }

      setConfirmacao({ instantanea: true, quando: `${formatoDataLonga.format(new Date(`${data}T${horario}`))}, ${horario}` });
      setStatus("sucesso");
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setStatus("abrindo");
    }
  }

  async function pedirSemHorarioFixo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const quando = new Date(dataHoraLivre);
    if (Number.isNaN(quando.getTime())) {
      setErro("Escolha uma data e um horário válidos.");
      return;
    }
    if (quando.getTime() <= Date.now()) {
      setErro("Escolha uma data no futuro.");
      return;
    }

    setStatus("enviando");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/entrar?depois=/imoveis/${imovelId}`);
      return;
    }

    const { error } = await supabase.from("visitas").insert({
      imovel_id: imovelId,
      comprador_id: user.id,
      data_hora: quando.toISOString(),
      observacoes: observacoes.trim() || null,
    });

    if (error) {
      setErro(error.message);
      setStatus("abrindo");
      return;
    }

    setConfirmacao({ instantanea: false, quando: "" });
    setStatus("sucesso");
  }

  if (status === "sucesso" && confirmacao) {
    return (
      <div className="card-flat" style={{ textAlign: "center" }}>
        <span className="badge badge-primary">
          {confirmacao.instantanea ? "Visita confirmada" : "Visita solicitada"}
        </span>
        <p className="hint" style={{ marginBottom: 0 }}>
          {confirmacao.instantanea
            ? `Combinado! Sua visita está confirmada para ${confirmacao.quando}.`
            : "O responsável pelo imóvel recebeu seu pedido e vai confirmar o horário. Acompanhe pelo painel de negócios."}
        </p>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <button type="button" className="btn btn-outline btn-block" onClick={abrir}>
        📅 Agendar visita
      </button>
    );
  }

  if (!configurado) {
    return (
      <form onSubmit={pedirSemHorarioFixo}>
        <div className="field">
          <label htmlFor="visita-data">Quando você quer visitar?</label>
          <input
            type="datetime-local"
            id="visita-data"
            value={dataHoraLivre}
            onChange={(e) => setDataHoraLivre(e.target.value)}
            required
          />
          <p className="hint">
            Este anunciante ainda não configurou horários de atendimento — peça um
            horário e aguarde a confirmação.
          </p>
        </div>
        <div className="field">
          <label htmlFor="visita-obs">Observações (opcional)</label>
          <textarea
            id="visita-obs"
            rows={2}
            placeholder="Ex.: prefiro no fim da tarde, posso remarcar se precisar."
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
            type="submit"
            className="btn btn-primary btn-block"
            disabled={status === "enviando"}
          >
            {status === "enviando" ? "Enviando…" : "Pedir visita"}
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
      </form>
    );
  }

  return (
    <div>
      <div className="field">
        <label htmlFor="visita-data-slot">Quando você quer visitar?</label>
        <input
          type="date"
          id="visita-data-slot"
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
      ) : horarios && horarios.length > 0 ? (
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
        <label htmlFor="visita-obs-slot">
          Observações{" "}
          <span className="muted" style={{ fontWeight: 400 }}>
            (opcional)
          </span>
        </label>
        <textarea
          id="visita-obs-slot"
          rows={2}
          placeholder="Algo que o corretor devia saber antes da visita?"
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
          {status === "enviando" ? "Confirmando…" : "Confirmar visita"}
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
