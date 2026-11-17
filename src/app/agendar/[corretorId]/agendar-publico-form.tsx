"use client";

import { useEffect, useState } from "react";
import { TelefoneComPaisInput } from "@/components/telefone-com-pais-input";
import { hojeISO } from "@/lib/data";

type Status = "preenchendo" | "enviando" | "sucesso";

const formatoDataLonga = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

export function AgendarPublicoForm({
  corretorId,
  corretorNome,
}: {
  corretorId: string;
  corretorNome: string;
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [data, setData] = useState(hojeISO());
  const [horario, setHorario] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [configurado, setConfigurado] = useState(true);
  const [carregandoHorarios, setCarregandoHorarios] = useState(true);
  const [status, setStatus] = useState<Status>("preenchendo");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<string | null>(null);
  const [endereco, setEndereco] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregandoHorarios(true);
    setHorario(null);
    fetch(`/api/publico/visitas/horarios-disponiveis?corretor_id=${corretorId}&data=${data}`)
      .then((r) => r.json())
      .then((dados: { configurado: boolean; horarios: string[] }) => {
        if (!ativo) return;
        setConfigurado(dados.configurado);
        setHorarios(dados.configurado ? dados.horarios : []);
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
  }, [corretorId, data]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !telefone || !horario) return;

    setErro(null);
    setStatus("enviando");

    try {
      const resposta = await fetch("/api/publico/visitas/agendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corretor_id: corretorId,
          nome: nome.trim(),
          telefone,
          data,
          horario,
        }),
      });
      const dados = (await resposta.json()) as { erro?: string; endereco?: string | null };

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível agendar.");
        setStatus("preenchendo");
        return;
      }

      setConfirmacao(`${formatoDataLonga.format(new Date(`${data}T${horario}`))}, ${horario}`);
      setEndereco(dados.endereco ?? null);
      setStatus("sucesso");
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setStatus("preenchendo");
    }
  }

  if (status === "sucesso") {
    return (
      <div style={{ textAlign: "center" }}>
        <div className="celebra-icone">✓</div>
        <span className="badge badge-primary">Visita confirmada</span>
        <p className="hint" style={{ marginTop: 12, marginBottom: endereco ? 8 : 0 }}>
          Combinado! Sua visita com {corretorNome} está confirmada para {confirmacao}.
        </p>
        {endereco && <p className="hint">📍 Local: {endereco}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={enviar}>
      <div className="field">
        <label htmlFor="pub-nome">Seu nome</label>
        <input
          id="pub-nome"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Ana Souza"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="pub-telefone">WhatsApp</label>
        <TelefoneComPaisInput id="pub-telefone" onChange={setTelefone} placeholder="9 9999-9999" />
      </div>
      <div className="field">
        <label htmlFor="pub-data">Quando você quer agendar?</label>
        <input
          id="pub-data"
          type="date"
          value={data}
          min={hojeISO()}
          onChange={(e) => setData(e.target.value)}
        />
      </div>

      {!configurado ? (
        <p className="hint">Esse corretor ainda não configurou disponibilidade.</p>
      ) : carregandoHorarios ? (
        <p className="hint">Buscando horários livres…</p>
      ) : horarios.length > 0 ? (
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

      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-block mt-16"
        disabled={!nome.trim() || !telefone || !horario || status === "enviando"}
      >
        {status === "enviando" ? "Agendando…" : "Confirmar agendamento"}
      </button>
    </form>
  );
}
