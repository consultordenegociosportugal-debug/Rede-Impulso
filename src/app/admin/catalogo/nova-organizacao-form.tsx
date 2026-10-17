"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Cidade = { id: string; nome: string; uf: string };

export function NovaOrganizacaoForm({ cidades }: { cidades: Cidade[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"imobiliaria" | "construtora">("imobiliaria");
  const [cidadeId, setCidadeId] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [emailGestor, setEmailGestor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro("Informe o nome.");
      return;
    }

    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.from("organizacoes_catalogo").insert({
      nome: nome.trim(),
      tipo,
      cidade_id: cidadeId || null,
      cnpj: cnpj.trim() || null,
      email_gestor: emailGestor.trim() || null,
    });

    setEnviando(false);

    if (error) {
      setErro("Não foi possível cadastrar.");
      return;
    }

    setNome("");
    setCnpj("");
    setEmailGestor("");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="card" style={{ padding: 16 }}>
      <div className="grid grid-2" style={{ gap: 8 }}>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da empresa"
        />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
          <option value="imobiliaria">Imobiliária</option>
          <option value="construtora">Construtora</option>
        </select>
        <select value={cidadeId} onChange={(e) => setCidadeId(e.target.value)}>
          <option value="">Sem cidade</option>
          {cidades.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}/{c.uf}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          placeholder="CNPJ (opcional)"
        />
        <input
          type="email"
          value={emailGestor}
          onChange={(e) => setEmailGestor(e.target.value)}
          placeholder="E-mail do gestor de vendas (opcional)"
        />
      </div>
      <button type="submit" className="btn btn-primary btn-sm mt-12" disabled={enviando}>
        {enviando ? "Salvando…" : "+ Cadastrar"}
      </button>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
    </form>
  );
}
