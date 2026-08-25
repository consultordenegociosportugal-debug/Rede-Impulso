import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { VincularButton } from "./vincular-button";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

type PerfilRow = {
  id: string;
  nome: string;
  role: string;
  corretor_perfis: {
    estrelas: number;
    total_negocios: number;
    imobiliaria_id: string | null;
    created_at: string;
  } | null;
};

type DepoimentoRow = {
  texto: string;
  estrelas: number;
  autor: { role: string } | null;
  negocios: { imoveis: { bairro: string } | null } | null;
};

function iniciais(nome: string) {
  return (
    nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "??"
  );
}

function renderStars(estrelas: number) {
  const cheias = Math.max(0, Math.min(5, Math.round(estrelas)));
  return "★".repeat(cheias) + "☆".repeat(5 - cheias);
}

export default async function PerfilCorretorPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; imovel_id?: string }>;
}) {
  const { id, imovel_id } = await searchParams;

  if (!id) {
    return (
      <>
        <Nav active="/perfil-corretor" />
        <div className="wrap">
          <div
            className={styles.layout}
            style={{ textAlign: "center", padding: "64px 0" }}
          >
            <p className="muted">Nenhum corretor selecionado.</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const supabase = await createClient();

  const [{ data: perfilData }, { data: depoimentosData }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, nome, role, corretor_perfis!profile_id(estrelas, total_negocios, imobiliaria_id, created_at)",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("depoimentos")
      .select(
        "texto, estrelas, autor:profiles!autor_id(role), negocios(imoveis(bairro))",
      )
      .eq("corretor_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const perfil = perfilData as unknown as PerfilRow | null;
  const depoimentos = (depoimentosData ?? []) as unknown as DepoimentoRow[];

  if (!perfil || perfil.role !== "corretor" || !perfil.corretor_perfis) {
    return (
      <>
        <Nav active="/perfil-corretor" />
        <div className="wrap">
          <div
            className={styles.layout}
            style={{ textAlign: "center", padding: "64px 0" }}
          >
            <p className="muted">Corretor não encontrado.</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const cp = perfil.corretor_perfis;

  let orgLabel = "Corretor autônomo";
  if (cp.imobiliaria_id) {
    const { data: imobiliaria } = await supabase
      .from("imobiliaria_perfis")
      .select("nome_fantasia")
      .eq("profile_id", cp.imobiliaria_id)
      .single();
    orgLabel = imobiliaria?.nome_fantasia ?? "Imobiliária";
  }

  // eslint-disable-next-line react-hooks/purity -- Server Component, runs once per request; needs wall-clock time
  const agora = Date.now();
  const anos = Math.floor(
    (agora - new Date(cp.created_at).getTime()) / (365.25 * 24 * 3600 * 1000),
  );

  const STATS = [
    { num: String(cp.total_negocios), label: "Negócios no total" },
    { num: cp.estrelas.toFixed(1), label: "Avaliação média" },
    {
      num: anos < 1 ? "novo" : `${anos} ano${anos > 1 ? "s" : ""}`,
      label: "Na Rede Impulso",
    },
  ];

  return (
    <>
      <Nav active="/perfil-corretor" />

      <div className="wrap">
        <div className={styles.layout}>
          <div className="card">
            <div className={styles.head}>
              <div className="avatar lg">{iniciais(perfil.nome)}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 17 }}>
                  {perfil.nome}
                </div>
                <div className="muted" style={{ fontSize: 13.5 }}>
                  Corretor · {orgLabel}
                </div>
                <div className="stars mt-8">
                  {renderStars(cp.estrelas)}{" "}
                  <span className="muted mono" style={{ marginLeft: 4 }}>
                    {cp.estrelas.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-3 mt-24">
              {STATS.map((stat) => (
                <div key={stat.label} className="stat">
                  <div className="num">{stat.num}</div>
                  <div className="label">{stat.label}</div>
                </div>
              ))}
            </div>

            <div
              className="mt-24"
              style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}
            >
              <span className="eyebrow">Depoimentos</span>
              <div className="mt-12">
                {depoimentos.length === 0 ? (
                  <p className="muted" style={{ fontSize: 13.5 }}>
                    Ainda não há depoimentos para este corretor.
                  </p>
                ) : (
                  depoimentos.map((d, i) => (
                    <div key={i} className={styles.testi}>
                      <p>&ldquo;{d.texto}&rdquo;</p>
                      <div className={styles.who}>
                        {d.autor?.role === "vendedor"
                          ? "Cliente vendedor"
                          : "Cliente comprador"}
                        {d.negocios?.imoveis?.bairro
                          ? ` · bairro ${d.negocios.imoveis.bairro}`
                          : ""}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {imovel_id && (
              <VincularButton
                imovelId={imovel_id}
                corretorId={perfil.id}
                corretorNome={perfil.nome}
                imobiliariaId={cp.imobiliaria_id}
              />
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
