import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";

type PostRow = {
  id: string;
  categoria: string;
  titulo: string;
  conteudo: string;
  created_at: string;
  autor: { nome: string } | null;
};

const CATEGORIA_LABEL: Record<string, { label: string; className: string }> = {
  duvida: { label: "Dúvida", className: "badge-amber" },
  comparacao: { label: "Comparação", className: "badge-outline" },
  experiencia: { label: "Experiência", className: "badge-primary" },
  noticia: { label: "Notícia", className: "badge-coral" },
};

export default async function ComunidadePage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("ev_posts")
    .select("id, categoria, titulo, conteudo, created_at, autor:autor_id(nome)")
    .order("created_at", { ascending: false })
    .limit(30);

  if (categoria && categoria in CATEGORIA_LABEL) query = query.eq("categoria", categoria);

  const { data } = await query;
  const posts = (data ?? []) as unknown as PostRow[];

  return (
    <>
      <Nav active="/eletricos/comunidade" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <span className="eyebrow">Comunidade</span>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Dúvidas, comparações e experiências</h1>
            <p className="muted mb-24">Quem tem, quem está pesquisando, e notícias do setor.</p>
          </div>
          <Link href="/eletricos/comunidade/nova" className="btn btn-primary btn-sm">
            + Nova publicação
          </Link>
        </div>

        <div className="flex gap-8 mb-24" style={{ flexWrap: "wrap" }}>
          <Link href="/eletricos/comunidade" className={!categoria ? "badge badge-primary" : "badge badge-outline"}>
            Todas
          </Link>
          {Object.entries(CATEGORIA_LABEL).map(([value, meta]) => (
            <Link
              key={value}
              href={`/eletricos/comunidade?categoria=${value}`}
              className={categoria === value ? "badge badge-primary" : "badge badge-outline"}
            >
              {meta.label}
            </Link>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhuma publicação ainda. Seja o primeiro a{" "}
              <Link href="/eletricos/comunidade/nova" style={{ textDecoration: "underline" }}>
                postar
              </Link>
              .
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {posts.map((post) => {
              const meta = CATEGORIA_LABEL[post.categoria] ?? { label: post.categoria, className: "badge-outline" };
              return (
                <Link key={post.id} href={`/eletricos/comunidade/${post.id}`} className="card">
                  <span className={`badge ${meta.className}`}>{meta.label}</span>
                  <div style={{ fontWeight: 600, fontSize: 16, marginTop: 8 }}>{post.titulo}</div>
                  <p className="muted" style={{ fontSize: 13.5, margin: "4px 0 0" }}>
                    {post.conteudo.length > 160 ? `${post.conteudo.slice(0, 160)}…` : post.conteudo}
                  </p>
                  <div className="hint" style={{ marginTop: 8 }}>
                    {post.autor?.nome ?? "Alguém"} ·{" "}
                    {new Date(post.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
