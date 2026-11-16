"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Corretor = { profile_id: string; nome: string };

// Formato simples de propósito: uma linha por lead, campos separados
// por vírgula, cabeçalho obrigatório "nome,telefone,email,origem" (os
// 3 últimos podem vir vazios, mas a vírgula tem que estar lá). Sem
// parser de CSV "de verdade" — não tem campo que use vírgula aqui
// (nome, telefone, e-mail, origem curta), então não vale a complicação
// de suportar aspas/escapes pra um formato tão simples.
function parsearCsv(texto: string): { nome: string; telefone: string; email: string; origem: string }[] {
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (linhas.length === 0) return [];

  const primeira = linhas[0].toLowerCase();
  const temCabecalho = primeira.startsWith("nome");
  const linhasDeDados = temCabecalho ? linhas.slice(1) : linhas;

  return linhasDeDados
    .map((linha) => {
      const [nome = "", telefone = "", email = "", origem = ""] = linha.split(",").map((c) => c.trim());
      return { nome, telefone, email, origem };
    })
    .filter((l) => l.nome);
}

export function ImportarLeadsForm({
  organizacaoId,
  corretores,
}: {
  organizacaoId: string;
  corretores: Corretor[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [corretorId, setCorretorId] = useState(corretores[0]?.profile_id ?? "");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setTexto(await arquivo.text());
  }

  async function importar(e: React.FormEvent) {
    e.preventDefault();
    const leadsParaImportar = parsearCsv(texto);
    if (leadsParaImportar.length === 0 || !corretorId) {
      setErro("Cole ou escolha um arquivo com pelo menos um lead, e escolha o corretor.");
      return;
    }

    setEnviando(true);
    setErro(null);
    setResultado(null);

    const supabase = createClient();
    const { error, count } = await supabase
      .from("leads")
      .insert(
        leadsParaImportar.map((l) => ({
          organizacao_catalogo_id: organizacaoId,
          corretor_id: corretorId,
          nome: l.nome,
          telefone: l.telefone || null,
          email: l.email || null,
          origem: l.origem || null,
        })),
        { count: "exact" },
      );

    setEnviando(false);

    if (error) {
      setErro("Não foi possível importar — confira se o arquivo está no formato certo.");
      return;
    }

    setResultado(`${count ?? leadsParaImportar.length} lead(s) importado(s).`);
    setTexto("");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  if (corretores.length === 0) return null;

  return (
    <form onSubmit={importar} className="card">
      <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Importar lista (CSV)</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Uma linha por lead: <code>nome,telefone,email,origem</code>. Todos os leads do arquivo vão
        pro mesmo corretor escolhido abaixo.
      </p>
      <div className="field">
        <label htmlFor="leads-arquivo">Arquivo .csv</label>
        <input ref={fileRef} id="leads-arquivo" type="file" accept=".csv,text/csv" onChange={escolherArquivo} />
      </div>
      <div className="field">
        <label htmlFor="leads-texto">Ou cole aqui</label>
        <textarea
          id="leads-texto"
          rows={4}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"nome,telefone,email,origem\nAna Souza,98999990000,ana@email.com,Facebook Ads"}
        />
      </div>
      <div className="field">
        <label htmlFor="leads-corretor">Entregar todos para</label>
        <select
          id="leads-corretor"
          value={corretorId}
          onChange={(e) => setCorretorId(e.target.value)}
        >
          {corretores.map((c) => (
            <option key={c.profile_id} value={c.profile_id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
      {resultado && !erro && <p className="hint">{resultado}</p>}
      <button type="submit" className="btn btn-outline btn-sm" disabled={enviando}>
        {enviando ? "Importando…" : "Importar leads"}
      </button>
    </form>
  );
}
