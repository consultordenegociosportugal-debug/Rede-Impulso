import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { ComentarioForm } from "./comentario-form";

type PostDetalhe = {
  id: string;
  categoria: string;
  titulo: string;
  conteudo: string;
  created_at: string;
  autor: { nome: string } | null;
};

type ComentarioRow = {
  id: string;
  texto: string;
  created_at: string;
  autor_agente: string | null;
  autor: { nome: string } | null;
};

const CATEGORIA_LABEL: Record<string, { label: string; className: string }> = {
  duvida: { label: "Dúvida", className: "badge-amber" },
  comparacao: { label: "Comparação", className: "badge-outline" },
  experiencia: { label: "Experiência", className: "badge-primary" },
  noticia: { label: "Notícia", className: "badge-coral" },
};

export default async function PostDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: post }, { data: comentarios }] = await Promise.all([
    supabase
      .from("ev_posts")
      .select("id, categoria, titulo, conteudo, created_at, autor:autor_id(nome)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ev_comentarios")
      .select("id, texto, created_at, autor_agente, autor:autor_id(nome)")
      .eq("post_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const publicacao = post as unknown as PostDetalhe | null;
  const lista = (comentarios ?? []) as unknown as ComentarioRow[];

  if (!publicacao) {
    return (
      <>
        <Nav active="/eletricos/comunidade" />
        <div className="wrap">
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p className="muted">Publicação não encontrada.</p>
            <Link href="/eletricos/comunidade" className="btn btn-primary btn-sm mt-16">
              Ver comunidade
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const meta = CATEGORIA_LABEL[publicacao.categoria] ?? { label: publicacao.categoria, className: "badge-outline" };

  return (
    <>
      <Nav active="/eletricos/comunidade" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <Link href="/eletricos/comunidade" className="hint">
          ← Voltar para a comunidade
        </Link>

        <div className="card mt-16">
          <span className={`badge ${meta.className}`}>{meta.label}</span>
          <h1 style={{ fontSize: 24, margin: "10px 0 4px" }}>{publicacao.titulo}</h1>
          <p className="hint" style={{ margin: "0 0 16px" }}>
            {publicacao.autor?.nome ?? "Alguém"} ·{" "}
            {new Date(publicacao.created_at).toLocaleDateString("pt-BR")}
          </p>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{publicacao.conteudo}</p>
        </div>

        <div className="card mt-16">
          <strong>{lista.length} comentário{lista.length === 1 ? "" : "s"}</strong>
          {lista.length > 0 && (
            <div className="mt-16" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {lista.map((c) => (
                <div key={c.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <p className="hint" style={{ margin: "0 0 4px" }}>
                    {c.autor_agente ? "⚡ Assistente Rede Impulso (IA)" : (c.autor?.nome ?? "Alguém")} ·{" "}
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  <p style={{ margin: 0, fontSize: 14 }}>{c.texto}</p>
                </div>
              ))}
            </div>
          )}
          <ComentarioForm postId={publicacao.id} />
        </div>
      </div>

      <Footer />
    </>
  );
}
