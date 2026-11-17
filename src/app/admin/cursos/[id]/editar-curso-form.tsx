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

type Curso = {
  id: string;
  titulo: string;
  descricao: string | null;
  instrutor: string | null;
  publico: string;
  carga_horaria: number | null;
  preco: number;
  liberacao_imediata: boolean;
};

export function EditarCursoForm({ curso }: { curso: Curso }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(curso.titulo);
  const [descricao, setDescricao] = useState(curso.descricao ?? "");
  const [instrutor, setInstrutor] = useState(curso.instrutor ?? "");
  const [publico, setPublico] = useState(curso.publico);
  const [cargaHoraria, setCargaHoraria] = useState(curso.carga_horaria?.toString() ?? "");
  const [preco, setPreco] = useState(curso.preco.toString());
  const [liberacaoImediata, setLiberacaoImediata] = useState(curso.liberacao_imediata);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      setErro("Informe o título do curso.");
      return;
    }

    setSalvando(true);
    setErro(null);
    setSalvo(false);

    const supabase = createClient();
    const { error } = await supabase
      .from("cursos")
      .update({
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        instrutor: instrutor.trim() || null,
        publico,
        carga_horaria: cargaHoraria ? Number(cargaHoraria) : null,
        preco: preco ? Number(preco) : 0,
        liberacao_imediata: liberacaoImediata,
      })
      .eq("id", curso.id);

    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar as alterações.");
      return;
    }

    setSalvo(true);
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="card">
      <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Dados do curso</h2>
      <div className="field">
        <label htmlFor="curso-titulo">Título</label>
        <input id="curso-titulo" type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="curso-descricao">Descrição</label>
        <textarea
          id="curso-descricao"
          rows={2}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
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
      <label className="flex items-center gap-8" style={{ cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={liberacaoImediata}
          onChange={(e) => setLiberacaoImediata(e.target.checked)}
        />
        <span>
          Liberação imediata{" "}
          <span className="muted" style={{ fontWeight: 400 }}>
            (infoproduto — matrícula já nasce liberada, sem esperar confirmação de pagamento)
          </span>
        </span>
      </label>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
      {salvo && !erro && <p className="hint">Salvo.</p>}
      <button type="submit" className="btn btn-primary btn-sm" disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  );
}
