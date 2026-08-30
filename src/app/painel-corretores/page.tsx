import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type CorretorRow = {
  profile_id: string;
  creci: string;
  estrelas: number;
  total_negocios: number;
  meta_mensal: number | null;
  ativo: boolean;
  profiles: { nome: string } | null;
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

export default async function PainelCorretoresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const [{ data: perfil }, { data: corretoresData }, { data: negociosData }] =
    await Promise.all([
      supabase.from("profiles").select("nome, role").eq("id", user.id).single(),
      supabase
        .from("corretor_perfis")
        .select(
          "profile_id, creci, estrelas, total_negocios, meta_mensal, ativo, profiles!profile_id(nome)",
        )
        .eq("imobiliaria_id", user.id)
        .order("total_negocios", { ascending: false }),
      supabase
        .from("negocios")
        .select("corretor_id, comissao_prevista")
        .eq("imobiliaria_id", user.id),
    ]);

  const corretores = (corretoresData ?? []) as unknown as CorretorRow[];
  const negocios = negociosData ?? [];

  const comissaoPorCorretor = new Map<string, number>();
  for (const n of negocios) {
    if (!n.corretor_id) continue;
    comissaoPorCorretor.set(
      n.corretor_id,
      (comissaoPorCorretor.get(n.corretor_id) ?? 0) + (n.comissao_prevista ?? 0),
    );
  }

  return (
    <>
      <Nav active="/painel-corretores" />

      <div className="wrap">
        <div className={styles.topBar}>
          <div>
            <span className="eyebrow">{perfil?.nome ?? "Imobiliária"}</span>
            <h1 style={{ fontSize: 24, margin: "6px 0 0" }}>
              Gestão de corretores
            </h1>
          </div>
          <div className="flex items-center gap-8" style={{ flexWrap: "wrap" }}>
            <Link href="/editar-perfil" className="btn btn-outline btn-sm">
              ✏️ Editar perfil
            </Link>
            <Link href="/modelos-contratos" className="btn btn-outline btn-sm">
              📄 Modelos de contrato e checklist
            </Link>
            <Link href="/planos" className="btn btn-outline btn-sm">
              🏅 Plano Profissional
            </Link>
            <button className="btn btn-outline btn-sm" disabled title="Em breve">
              + Convidar corretor
            </button>
          </div>
        </div>

        {perfil?.role !== "imobiliaria" ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Esta área é para imobiliárias gerenciarem os corretores
              vinculados.
            </p>
            <p className="hint" style={{ marginTop: 8 }}>
              Sua conta atual não está cadastrada como imobiliária.
            </p>
          </div>
        ) : corretores.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum corretor vinculado ainda.
            </p>
            <p className="hint" style={{ marginTop: 8 }}>
              Corretores aparecem aqui assim que se associam à sua
              imobiliária.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: "8px 20px" }}>
            <div className="list-row">
              <div className={styles.brokerRow} style={{ width: "100%" }}>
                <div className={styles.col} style={{ width: 24 }}>
                  <span className="mono muted">#</span>
                </div>
                <div className={styles.who}>
                  <span className="mono muted">CORRETOR</span>
                </div>
                <div className={`${styles.col} ${styles.meta}`}>
                  <span className="mono muted">META DO MÊS</span>
                </div>
                <div className={`${styles.col} ${styles.meta}`}>
                  <span className="mono muted">COMISSÃO</span>
                </div>
                <div className={`${styles.col} ${styles.actions}`}>
                  <span className="mono muted">ACESSO</span>
                </div>
              </div>
            </div>

            {corretores.map((corretor, i) => {
              const nome = corretor.profiles?.nome ?? "Corretor";
              const comissao = comissaoPorCorretor.get(corretor.profile_id) ?? 0;
              const progresso = corretor.meta_mensal
                ? Math.min(100, Math.round((comissao / corretor.meta_mensal) * 100))
                : null;

              return (
                <div key={corretor.profile_id} className="list-row">
                  <div className={styles.brokerRow} style={{ width: "100%" }}>
                    <div
                      className={styles.col}
                      style={{
                        width: 24,
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        color: i === 0 ? "var(--amber)" : "var(--ink-soft)",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className={styles.who}>
                      <div className="flex items-center gap-8">
                        <div className="avatar sm">{iniciais(nome)}</div>
                        <div>
                          <div className={styles.name}>{nome}</div>
                          <div className={styles.sub}>
                            ★ {corretor.estrelas.toFixed(1)} ·{" "}
                            {corretor.total_negocios} negócios
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={`${styles.col} ${styles.meta}`}>
                      {progresso === null ? (
                        <span className="hint" style={{ margin: 0 }}>
                          sem meta definida
                        </span>
                      ) : (
                        <>
                          <div className={styles.progress}>
                            <div style={{ width: `${progresso}%` }} />
                          </div>
                          <div className="hint" style={{ margin: "4px 0 0" }}>
                            {progresso}% da meta
                          </div>
                        </>
                      )}
                    </div>
                    <div
                      className={`${styles.col} ${styles.meta} mono`}
                      style={{ fontSize: 13 }}
                    >
                      {formatoMoeda.format(comissao)}
                    </div>
                    <div className={`${styles.col} ${styles.actions}`}>
                      <span
                        className={`${styles.switch} ${corretor.ativo ? "" : styles.switchOff}`}
                      >
                        <span className={styles.track} />
                        {corretor.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="hint mt-16">
          Distribuição de leads e edição de permissões chegam em uma próxima
          etapa.
        </p>
      </div>

      <Footer />
    </>
  );
}
