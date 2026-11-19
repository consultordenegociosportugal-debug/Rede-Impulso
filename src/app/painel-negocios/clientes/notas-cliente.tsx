"use client";

import { useState } from "react";

type Nota = { id: string; texto: string; created_at: string };

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

// Primeira peça do CRM (migração 0098) — timeline simples de
// anotações livres por cliente. Carrega sob demanda (só quando o
// corretor abre), não junto com a lista inteira de clientes, pra não
// pesar a página principal com uma base grande.
export function NotasCliente({ clienteId }: { clienteId: string }) {
  const [aberto, setAberto] = useState(false);
  const [notas, setNotas] = useState<Nota[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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
        body: JSON.stringify({ texto }),
      });
      const dados = (await resposta.json()) as { erro?: string; nota?: Nota };
      if (!resposta.ok || !dados.nota) {
        setErro(dados.erro ?? "Não foi possível salvar a nota.");
        return;
      }
      setNotas((atual) => [dados.nota!, ...(atual ?? [])]);
      setTexto("");
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
    } finally {
      setEnviando(false);
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
          <form onSubmit={salvar} className="flex gap-8" style={{ flexWrap: "wrap" }}>
            <textarea
              rows={2}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Alguma coisa pra lembrar sobre esse cliente?"
              style={{ flex: 1, minWidth: 220, fontSize: 13 }}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!texto.trim() || enviando}
            >
              {enviando ? "Salvando…" : "Salvar nota"}
            </button>
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
                  <p className="hint" style={{ margin: "4px 0 0" }}>
                    {formatoData.format(new Date(nota.created_at))}
                  </p>
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
