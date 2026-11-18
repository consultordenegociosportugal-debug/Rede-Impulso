"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Contato = { nome: string; telefone?: string; email?: string };

const PLACEHOLDER = `Ana Souza, 98 99999-9999
Carlos Lima, 98 98888-8888, carlos@email.com
Maria Costa`;

// Um contato por linha, campos separados por vírgula, ponto e vírgula
// ou tab (cobre colar direto de uma planilha, que normalmente usa tab,
// ou de um .csv aberto como texto, que usa vírgula). Nome é o único
// campo obrigatório.
function parseLinha(linha: string): Contato | null {
  const campos = linha
    .split(/[,;\t]/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  if (campos.length === 0) return null;

  const [nome, ...resto] = campos;
  if (!nome) return null;

  let telefone: string | undefined;
  let email: string | undefined;
  for (const campo of resto) {
    if (campo.includes("@")) email = campo;
    else if (!telefone) telefone = campo;
  }
  return { nome, telefone, email };
}

export function ImportarClientesForm() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{
    importados: number;
    duplicados: number;
    sem_nome: number;
    telefone_invalido: number;
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const contatos = useMemo(
    () =>
      texto
        .split("\n")
        .map(parseLinha)
        .filter((c): c is Contato => c !== null),
    [texto],
  );
  const linhasTotais = texto.split("\n").filter((l) => l.trim()).length;

  async function importar() {
    if (contatos.length === 0) return;
    setEnviando(true);
    setErro(null);
    setResultado(null);

    try {
      const resposta = await fetch("/api/clientes/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contatos }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível importar.");
        setEnviando(false);
        return;
      }
      setResultado(dados);
      setTexto("");
      setEnviando(false);
      router.refresh();
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <button type="button" className="btn btn-outline btn-sm mt-8" onClick={() => setAberto(true)}>
        📋 Importar minha base de clientes
      </button>
    );
  }

  return (
    <div className="card mt-8" style={{ padding: 16 }}>
      <div className="flex between items-center">
        <strong style={{ fontSize: 14 }}>Importar clientes</strong>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAberto(false)}>
          Fechar
        </button>
      </div>
      <p className="hint">
        Cole sua lista abaixo — um cliente por linha, com nome e, se tiver, telefone e
        e-mail (separados por vírgula). Não agenda nada, só cadastra os contatos.
      </p>
      <textarea
        rows={6}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={PLACEHOLDER}
        style={{ fontFamily: "monospace", fontSize: 13 }}
      />
      {linhasTotais > 0 && (
        <p className="hint" style={{ margin: "4px 0 0" }}>
          {contatos.length} de {linhasTotais} linha(s) reconhecida(s) como contato.
        </p>
      )}
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
      {resultado && (
        <>
          <p className="hint" style={{ color: "var(--primary)" }}>
            {resultado.importados} importado(s)
            {resultado.duplicados > 0 ? `, ${resultado.duplicados} já cadastrado(s) ignorado(s)` : ""}
            {resultado.sem_nome > 0 ? `, ${resultado.sem_nome} linha(s) sem nome ignorada(s)` : ""}.
          </p>
          {resultado.telefone_invalido > 0 && (
            <p className="hint" style={{ color: "var(--amber)" }}>
              ⚠️ {resultado.telefone_invalido} contato(s) importado(s) sem telefone — o texto nessa posição
              não parecia um número válido (confira se a ordem das colunas coladas está certa).
            </p>
          )}
        </>
      )}
      <button
        type="button"
        className="btn btn-primary btn-sm mt-8"
        onClick={importar}
        disabled={contatos.length === 0 || enviando}
      >
        {enviando ? "Importando…" : `Importar ${contatos.length || ""} contato(s)`}
      </button>
    </div>
  );
}
