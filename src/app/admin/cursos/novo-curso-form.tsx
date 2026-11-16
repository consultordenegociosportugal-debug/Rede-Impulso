"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PUBLICOS = [
  { value: "todos", label: "Todos os perfis" },
  { value: "corretor", label: "Corretores" },
  { value: "imobiliaria", label: "Imobiliárias" },
  { value: "cartorio", label: "Cartórios" },
];

export function NovoCursoForm() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [instrutor, setInstrutor] = useState("");
  const [publico, setPublico] = useState("todos");
  const [cargaHoraria, setCargaHoraria] = useState("");
  const [preco, setPreco] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      setErro("Informe o título do curso.");
      return;
    }

    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.from("cursos").insert({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      instrutor: instrutor.trim() || null,
      publico,
      carga_horaria: cargaHoraria ? Number(cargaHoraria) : null,
      preco: preco ? Number(preco) : 0,
    });

    setEnviando(false);

    if (error) {
      setErro("Não foi possível cadastrar o curso.");
      return;
    }

    setTitulo("");
    setDescricao("");
    setInstrutor("");
    setPublico("todos");
    setCargaHoraria("");
    setPreco("");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="card">
      <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Novo curso</h2>
      <div className="field">
        <label htmlFor="curso-titulo">Título</label>
        <input
          id="curso-titulo"
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Negociação avançada para corretores"
        />
      </div>
      <div className="field">
        <label htmlFor="curso-descricao">Descrição</label>
        <textarea
          id="curso-descricao"
          rows={2}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Do que se trata o curso, em uma ou duas frases."
        />
      </div>
      <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label htmlFor="curso-instrutor">Instrutor (opcional)</label>
          <input
            id="curso-instrutor"
            type="text"
            value={instrutor}
            onChange={(e) => setInstrutor(e.target.value)}
          />
        </div>
        <div className="field" style={{ minWidth: 160 }}>
          <label htmlFor="curso-publico">Público</label>
          <select id="curso-publico" value={publico} onChange={(e) => setPublico(e.target.value)}>
            {PUBLICOS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
        <div className="field" style={{ width: 140 }}>
          <label htmlFor="curso-carga">Carga horária (h)</label>
          <input
            id="curso-carga"
            type="number"
            min="0"
            value={cargaHoraria}
            onChange={(e) => setCargaHoraria(e.target.value)}
          />
        </div>
        <div className="field" style={{ width: 160 }}>
          <label htmlFor="curso-preco">Preço (R$)</label>
          <input
            id="curso-preco"
            type="number"
            min="0"
            step="0.01"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
          />
        </div>
      </div>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-sm" disabled={enviando}>
        {enviando ? "Salvando…" : "+ Cadastrar curso"}
      </button>
    </form>
  );
}
