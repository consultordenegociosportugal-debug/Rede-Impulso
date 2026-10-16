"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "preenchendo" | "buscando-horarios" | "enviando" | "sucesso";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

const formatoDataLonga = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

// Cadastro de cliente "de balcão" (sem login) + agendamento na mesma
// tela — o corretor digita nome e telefone, escolhe um horário livre
// na própria agenda, e a visita já nasce confirmada. Mesmo modelo de
// slot do AgendarVisitaButton, só que quem está logado é o corretor,
// não o cliente.
export function NovoClienteForm() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [data, setData] = useState(hojeISO());
  const [horario, setHorario] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [configurado, setConfigurado] = useState(true);
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState<Status>("preenchendo");
  const [erro, setErro] = useState<string | null>(null);
  const [corretorId, setCorretorId] = useState<string | null>(null);

  useEffect(() => {
    if (!corretorId) return;
    setStatus("buscando-horarios");
    fetch(`/api/visitas/horarios-disponiveis?corretor_id=${corretorId}&data=${data}`)
      .then((r) => r.json())
      .then((dados: { configurado: boolean; horarios: string[] }) => {
        setConfigurado(dados.configurado);
        setHorarios(dados.configurado ? dados.horarios : []);
      })
      .catch(() => setConfigurado(false))
      .finally(() => setStatus("preenchendo"));
  }, [corretorId, data]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !horario || !corretorId) return;

    setErro(null);
    setStatus("enviando");

    try {
      const resposta = await fetch("/api/visitas/agendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corretor_id: corretorId,
          data,
          horario,
          observacoes,
          cliente_avulso: { nome: nome.trim(), telefone: telefone.trim() || undefined },
        }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível agendar.");
        setStatus("preenchendo");
        return;
      }

      setStatus("sucesso");
      router.refresh();
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setStatus("preenchendo");
    }
  }

  if (status === "sucesso") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "32px 20px" }}>
        <span className="badge badge-primary">Cliente cadastrado e visita confirmada</span>
        <p className="hint" style={{ marginBottom: 12 }}>
          {nome} agora está na sua lista de clientes, com a visita marcada para{" "}
          {horario ? `${formatoDataLonga.format(new Date(`${data}T${horario}`))}, ${horario}` : ""}
          .
        </p>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => {
            setNome("");
            setTelefone("");
            setHorario(null);
            setObservacoes("");
            setStatus("preenchendo");
          }}
        >
          Cadastrar outro cliente
        </button>
      </div>
    );
  }

  return (
    <form className="card" style={{ padding: 20 }} onSubmit={enviar}>
      <CorretorIdFetcher onId={setCorretorId} />

      <div className="grid grid-2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="cliente-nome">Nome do cliente</label>
          <input
            id="cliente-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Ana Souza"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="cliente-telefone">
            Telefone <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span>
          </label>
          <input
            id="cliente-telefone"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(98) 9 9999-9999"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="cliente-data">Quando é a visita?</label>
        <input
          id="cliente-data"
          type="date"
          value={data}
          min={hojeISO()}
          onChange={(e) => {
            setData(e.target.value);
            setHorario(null);
          }}
        />
      </div>

      {!configurado ? (
        <p className="hint">
          Configure sua{" "}
          <a href="/painel-negocios/disponibilidade">disponibilidade semanal</a> antes de
          agendar para um cliente.
        </p>
      ) : status === "buscando-horarios" ? (
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

      <div className="field">
        <label htmlFor="cliente-obs">
          Observações <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span>
        </label>
        <textarea
          id="cliente-obs"
          rows={2}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>

      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={!nome.trim() || !horario || status === "enviando"}
      >
        {status === "enviando" ? "Agendando…" : "Cadastrar e agendar"}
      </button>
    </form>
  );
}

// Pega o id do corretor logado uma vez, sem puxar o client do Supabase
// pro componente inteiro — mantém o resto do form simples de ler.
function CorretorIdFetcher({ onId }: { onId: (id: string) => void }) {
  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) onId(data.user.id);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
