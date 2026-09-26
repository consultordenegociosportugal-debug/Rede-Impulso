"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/client";

type Categoria = "duvida" | "comparacao" | "experiencia" | "noticia";
type Status = "idle" | "enviando" | "erro";

const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: "duvida", label: "Dúvida" },
  { value: "comparacao", label: "Comparação" },
  { value: "experiencia", label: "Experiência" },
  { value: "noticia", label: "Notícia" },
];

export function NovaPublicacaoForm() {
  const router = useRouter();
  const [categoria, setCategoria] = useState<Categoria>("duvida");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("enviando");
    setErro(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/entrar?depois=/eletricos/comunidade/nova");
      return;
    }

    const { data: post, error } = await supabase
      .from("ev_posts")
      .insert({ autor_id: user.id, categoria, titulo, conteudo })
      .select("id")
      .single();

    if (error || !post) {
      setErro(error?.message ?? "Não foi possível publicar.");
      setStatus("erro");
      return;
    }

    router.push(`/eletricos/comunidade/${post.id}`);
  }

  return (
    <>
      <Nav active="/eletricos/comunidade" />

      <div className="wrap">
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">Comunidade</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Nova publicação</h1>

          <form className="card mt-16" onSubmit={handleSubmit}>
            <div className="segmented mb-16" style={{ flexWrap: "wrap" }}>
              {CATEGORIAS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={categoria === c.value ? "active" : undefined}
                  onClick={() => setCategoria(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="titulo">Título</label>
              <input
                type="text"
                id="titulo"
                placeholder="Vale a pena trocar meu híbrido por 100% elétrico?"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="conteudo">Conteúdo</label>
              <textarea
                id="conteudo"
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                rows={8}
                required
              />
            </div>

            {erro && (
              <p className="hint" style={{ color: "var(--coral)" }}>
                {erro}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block mt-16" disabled={status === "enviando"}>
              {status === "enviando" ? "Publicando…" : "Publicar"}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
