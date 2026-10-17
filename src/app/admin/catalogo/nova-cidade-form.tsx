"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function NovaCidadeForm() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [uf, setUf] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || uf.trim().length !== 2) {
      setErro("Informe o nome da cidade e a UF (2 letras).");
      return;
    }

    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("cidades_catalogo")
      .insert({ nome: nome.trim(), uf: uf.trim().toUpperCase() });

    setEnviando(false);

    if (error) {
      setErro(error.code === "23505" ? "Essa cidade já está cadastrada." : "Não foi possível cadastrar.");
      return;
    }

    setNome("");
    setUf("");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="flex gap-8" style={{ flexWrap: "wrap" }}>
      <input
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome da cidade"
        style={{ flex: 1, minWidth: 160 }}
      />
      <input
        type="text"
        value={uf}
        onChange={(e) => setUf(e.target.value)}
        placeholder="UF"
        maxLength={2}
        style={{ width: 64 }}
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={enviando}>
        {enviando ? "Salvando…" : "+ Cidade"}
      </button>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)", width: "100%", margin: 0 }}>
          {erro}
        </p>
      )}
    </form>
  );
}
