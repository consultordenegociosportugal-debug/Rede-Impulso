import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

type SugestaoRow = {
  score: number;
  corretor: {
    id: string;
    nome: string;
    corretor_perfis: {
      estrelas: number;
      total_negocios: number;
      imobiliaria_id: string | null;
    } | null;
  } | null;
};

function renderStars(estrelas: number) {
  const cheias = Math.max(0, Math.min(5, Math.round(estrelas)));
  return "★".repeat(cheias) + "☆".repeat(5 - cheias);
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export default async function SugestaoCorretoresPage({
  searchParams,
}: {
  searchParams: Promise<{ imovel_id?: string }>;
}) {
  const { imovel_id } = await searchParams;

  if (!imovel_id) {
    return (
      <>
        <Nav active="/sugestao-corretores" />
        <div className="wrap">
          <div
            className={styles.layout}
            style={{ textAlign: "center", padding: "64px 0" }}
          >
            <p className="muted">
              Publique um imóvel para ver corretores sugeridos para a região.
            </p>
            <Link
              href="/publicar-imovel"
              className="btn btn-primary btn-sm mt-16"
            >
              Publicar imóvel
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const supabase = await createClient();

  const { data: imovel } = await supabase
    .from("imoveis")
    .select("id, titulo, bairro")
    .eq("id", imovel_id)
    .single();

  const { data: sugestoesData } = await supabase
    .from("sugestoes_corretor")
    .select(
      "score, corretor:profiles!corretor_id(id, nome, corretor_perfis!profile_id(estrelas, total_negocios, imobiliaria_id))",
    )
    .eq("imovel_id", imovel_id)
    .order("score", { ascending: false })
    .limit(5);

  const sugestoes = (sugestoesData ?? []) as unknown as SugestaoRow[];

  const imobiliariaIds = Array.from(
    new Set(
      sugestoes
        .map((s) => s.corretor?.corretor_perfis?.imobiliaria_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let nomesFantasia: Record<string, string> = {};
  if (imobiliariaIds.length > 0) {
    const { data: imobiliarias } = await supabase
      .from("imobiliaria_perfis")
      .select("profile_id, nome_fantasia")
      .in("profile_id", imobiliariaIds);
    nomesFantasia = Object.fromEntries(
      (imobiliarias ?? []).map((i) => [i.profile_id, i.nome_fantasia]),
    );
  }

  return (
    <>
      <Nav active="/sugestao-corretores" />

      <div className="wrap">
        <div className={styles.layout}>
          <span className="badge badge-primary">Imóvel publicado</span>
          <h1 style={{ fontSize: 26, margin: "10px 0 4px" }}>
            {imovel ? `${imovel.titulo}, bairro ${imovel.bairro}` : "Imóvel"}
          </h1>
          <p className="muted">
            {sugestoes.length > 0
              ? "Encontramos corretores com bom histórico nessa região."
              : "Ainda não há corretores cadastrados nessa região."}
          </p>

          {sugestoes.map((s, i) => {
            const corretor = s.corretor;
            if (!corretor) return null;
            const perfil = corretor.corretor_perfis;
            const org = perfil?.imobiliaria_id
              ? (nomesFantasia[perfil.imobiliaria_id] ?? "Imobiliária")
              : "Corretor autônomo";

            return (
              <div
                key={corretor.id}
                className={`card mt-24 ${styles.corretorCard}`}
              >
                <div className={styles.matchRow}>
                  <div className={styles.matchLeft}>
                    <div className="avatar">{iniciais(corretor.nome)}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{corretor.nome}</div>
                      <div className={styles.matchMeta}>{org}</div>
                      <div className="flex items-center gap-8 mt-8">
                        <span className="stars">
                          {renderStars(perfil?.estrelas ?? 0)}
                        </span>
                        <span className={styles.matchMeta}>
                          {(perfil?.estrelas ?? 0).toFixed(1)} ·{" "}
                          {perfil?.total_negocios ?? 0} negócios no bairro
                        </span>
                      </div>
                    </div>
                  </div>
                  {i === 0 && (
                    <span className="badge badge-amber">Melhor match</span>
                  )}
                </div>
                <Link
                  href={`/perfil-corretor?id=${corretor.id}&imovel_id=${imovel_id}`}
                  className={`btn ${i === 0 ? "btn-primary" : "btn-ghost"} btn-block btn-sm mt-16`}
                >
                  Ver perfil ↗
                </Link>
              </div>
            );
          })}

          <div className={styles.footerNote}>
            <p
              className="muted"
              style={{ margin: 0, fontSize: 13.5, maxWidth: "38ch" }}
            >
              {sugestoes.length > 0
                ? "Prefere não escolher agora? Seu imóvel já está publicado e visível na vitrine."
                : "Seu imóvel já está publicado e visível na vitrine, mesmo sem corretor vinculado."}
            </p>
            <Link href="/painel-negocios" className="btn btn-outline btn-sm">
              Ver meus negócios
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
