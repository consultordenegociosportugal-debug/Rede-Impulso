"use client";

import { useState } from "react";
import { hojeISO } from "@/lib/data";

type Nota = {
  id: string;
  texto: string;
  created_at: string;
  lembrar_em: string | null;
  lembrete_concluido_em: string | null;
};

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
const formatoDataCurta = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

// Primeira e segunda peça do CRM (migrações 0098 e 0099) — timeline
// simples de anotações livres por cliente, com lembrete de follow-up
// opcional em cima da nota. Carrega sob demanda (só quando o corretor
// abre), não junto com a lista inteira de clientes, pra não pesar a
// página principal com uma base grande.
export function NotasCliente({ clienteId }: { clienteId: string }) {
  const [aberto, setAberto] = useState(false);
  const [notas, setNotas] = useState<Nota[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [texto, setTexto] = useState("");
  const [lembrarEm, setLembrarEm] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluindo, setConcluindo] = useState<string | null>(null);

  async function abrir() {
    const novoAberto = !aberto;
    setAberto(novoAberto);
    if (novoAberto && notas === null) {
      setCarregando(true);
      try {
        const resposta = await fetch(`/api/clientes/${clienteId}/notas`);
        const dados = (await resposta.json()) as { notas?: Nota[] };
        setNotas(dados.notas ?? []);
      } catch {
        setErro("Não foi possível carregar as notas agora.");
      } finally {
        setCarregando(false);
      }
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/clientes/${clienteId}/notas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, lembrar_em: lembrarEm || undefined }),
      });
      const dados = (await resposta.json()) as { erro?: string; nota?: Nota };
      if (!resposta.ok || !dados.nota) {
        setErro(dados.erro ?? "Não foi possível salvar a nota.");
        return;
      }
      setNotas((atual) => [dados.nota!, ...(atual ?? [])]);
      setTexto("");
      setLembrarEm("");
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function concluirLembrete(notaId: string) {
    setConcluindo(notaId);
    try {
      const resposta = await fetch(`/api/notas/${notaId}/concluir`, { method: "PATCH" });
      if (!resposta.ok) return;
      setNotas(
        (atual) =>
          atual?.map((n) =>
            n.id === notaId ? { ...n, lembrete_concluido_em: new Date().toISOString() } : n,
          ) ?? null,
      );
    } finally {
      setConcluindo(null);
    }
  }

  return (
    <div style={{ width: "100%", marginTop: 8 }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={abrir}
        style={{ paddingLeft: 0 }}
      >
        📝 Notas{notas && notas.length > 0 ? ` (${notas.length})` : ""} {aberto ? "▲" : "▼"}
      </button>

      {aberto && (
        <div style={{ paddingLeft: 4 }}>
          <form onSubmit={salvar}>
            <textarea
              rows={2}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Alguma coisa pra lembrar sobre esse cliente?"
              style={{ width: "100%", fontSize: 13 }}
            />
            <div className="flex gap-8 items-center mt-8" style={{ flexWrap: "wrap" }}>
              <label className="hint" htmlFor={`lembrete-${clienteId}`} style={{ margin: 0 }}>
                🔔 Me lembra em
              </label>
              <input
                id={`lembrete-${clienteId}`}
                type="date"
                value={lembrarEm}
                min={hojeISO()}
                onChange={(e) => setLembrarEm(e.target.value)}
                style={{ width: 160 }}
              />
              <span className="hint" style={{ margin: 0 }}>
                (opcional)
              </span>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ marginLeft: "auto" }}
                disabled={!texto.trim() || enviando}
              >
                {enviando ? "Salvando…" : "Salvar nota"}
              </button>
            </div>
          </form>

          {erro && (
            <p className="hint" style={{ color: "var(--coral)", margin: "4px 0 0" }}>
              {erro}
            </p>
          )}

          {carregando ? (
            <p className="hint" style={{ margin: "8px 0 0" }}>
              Carregando notas…
            </p>
          ) : notas && notas.length > 0 ? (
            <div style={{ marginTop: 8 }}>
              {notas.map((nota) => (
                <div
                  key={nota.id}
                  style={{
                    borderTop: "1px solid var(--line)",
                    padding: "8px 0",
                    fontSize: 13.5,
                  }}
                >
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{nota.texto}</p>
                  <div className="flex items-center gap-8" style={{ flexWrap: "wrap", marginTop: 4 }}>
                    <span className="hint" style={{ margin: 0 }}>
                      {formatoData.format(new Date(nota.created_at))}
                    </span>
                    {nota.lembrar_em &&
                      (nota.lembrete_concluido_em ? (
                        <span className="badge badge-outline" style={{ fontSize: 11 }}>
                          ✓ Lembrete resolvido
                        </span>
                      ) : (
                        <>
                          <span className="badge badge-amber" style={{ fontSize: 11 }}>
                            🔔 {formatoDataCurta.format(new Date(`${nota.lembrar_em}T12:00:00`))}
                          </span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: "2px 8px", fontSize: 11, minHeight: "auto" }}
                            onClick={() => concluirLembrete(nota.id)}
                            disabled={concluindo === nota.id}
                          >
                            {concluindo === nota.id ? "…" : "Marcar resolvido"}
                          </button>
                        </>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            notas !== null && (
              <p className="hint" style={{ margin: "8px 0 0" }}>
                Nenhuma nota ainda.
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}
