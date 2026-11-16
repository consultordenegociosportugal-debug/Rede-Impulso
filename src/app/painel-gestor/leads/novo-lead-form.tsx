"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Corretor = { profile_id: string; nome: string };

export function NovoLeadForm({
  organizacaoId,
  corretores,
}: {
  organizacaoId: string;
  corretores: Corretor[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [origem, setOrigem] = useState("");
  const [corretorId, setCorretorId] = useState(corretores[0]?.profile_id ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !corretorId) {
      setErro("Informe o nome do lead e escolha o corretor.");
      return;
    }

    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.from("leads").insert({
      organizacao_catalogo_id: organizacaoId,
      corretor_id: corretorId,
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      email: email.trim() || null,
      origem: origem.trim() || null,
    });

    setEnviando(false);

    if (error) {
      setErro("Não foi possível cadastrar o lead.");
      return;
    }

    setNome("");
    setTelefone("");
    setEmail("");
    setOrigem("");
    router.refresh();
  }

  if (corretores.length === 0) {
    return (
      <p className="hint">
        Nenhum corretor vinculado a esta organização ainda — peça pra alguém se vincular em
        "Editar perfil" antes de entregar leads.
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="card">
      <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Cadastrar lead</h2>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="lead-nome">Nome</label>
          <input id="lead-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="lead-telefone">Telefone (opcional)</label>
          <input
            id="lead-telefone"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="lead-email">E-mail (opcional)</label>
          <input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="lead-origem">Origem (opcional)</label>
          <input
            id="lead-origem"
            type="text"
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            placeholder="Ex.: Facebook Ads, indicação"
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="lead-corretor">Entregar para</label>
        <select id="lead-corretor" value={corretorId} onChange={(e) => setCorretorId(e.target.value)}>
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
      <button type="submit" className="btn btn-primary btn-sm" disabled={enviando}>
        {enviando ? "Cadastrando…" : "+ Cadastrar lead"}
      </button>
    </form>
  );
}
