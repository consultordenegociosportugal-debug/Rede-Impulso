import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  negociacao: { label: "Negociação", className: "badge-primary" },
  cartorio: { label: "Em cartório", className: "badge-coral" },
  fechado: { label: "Fechado", className: "badge-amber" },
  concluido: { label: "Concluído", className: "badge-amber" },
  cancelado: { label: "Cancelado", className: "badge-outline" },
};

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type NegocioRow = {
  id: string;
  status: string;
  valor_fechado: number | null;
  comissao_prevista: number | null;
  created_at: string;
  imoveis: { titulo: string; bairro: string } | null;
  comprador: { nome: string } | null;
  corretor: { nome: string } | null;
  imobiliaria: { nome: string } | null;
};

export default async function PainelNegociosPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const visaoImobiliaria = view === "imobiliaria";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: meusImoveis } = await supabase
    .from("imoveis")
    .select("id")
    .eq("vendedor_id", user.id);
  const meusImovelIds = (meusImoveis ?? []).map((i) => i.id);

  let query = supabase
    .from("negocios")
    .select(
      "id, status, valor_fechado, comissao_prevista, created_at, imoveis(titulo, bairro), comprador:comprador_id(nome), corretor:corretor_id(nome), imobiliaria:imobiliaria_id(nome)",
    )
    .order("created_at", { ascending: false });

  if (visaoImobiliaria) {
    query = query.eq("imobiliaria_id", user.id);
  } else {
    const condicoes = [`comprador_id.eq.${user.id}`, `corretor_id.eq.${user.id}`];
    if (meusImovelIds.length > 0) {
      condicoes.push(`imovel_id.in.(${meusImovelIds.join(",")})`);
    }
    query = query.or(condicoes.join(","));
  }

  const { data } = await query;
  const negocios = (data ?? []) as unknown as NegocioRow[];

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const emNegociacao = negocios.filter((n) => n.status === "negociacao").length;
  const emCartorio = negocios.filter((n) => n.status === "cartorio").length;
  const concluidosNoMes = negocios.filter(
    (n) =>
      (n.status === "concluido" || n.status === "fechado") &&
      new Date(n.created_at) >= inicioMes,
  ).length;
  const comissaoPrevista = negocios.reduce(
    (soma, n) => soma + (n.comissao_prevista ?? 0),
    0,
  );

  const STATS = [
    { num: String(emNegociacao), label: "Em negociação" },
    { num: String(emCartorio), label: "Em cartório" },
    { num: String(concluidosNoMes), label: "Concluídos no mês" },
    { num: formatoMoeda.format(comissaoPrevista), label: "Comissão prevista" },
  ];

  return (
    <>
      <Nav active="/painel-negocios" />

      <div className="wrap">
        <div className={styles.topBar}>
          <div>
            <span className="eyebrow">Painel de negócios</span>
            <h1 style={{ fontSize: 24, margin: "6px 0 0" }}>
              Seus negócios em andamento
            </h1>
          </div>
          <div className="segmented">
            <Link
              href="/painel-negocios"
              className={!visaoImobiliaria ? "active" : undefined}
            >
              Minha visão
            </Link>
            <Link
              href="/painel-negocios?view=imobiliaria"
              className={visaoImobiliaria ? "active" : undefined}
            >
              Visão da imobiliária
            </Link>
          </div>
        </div>

        <div className="grid grid-4 mb-24">
          {STATS.map((stat) => (
            <div key={stat.label} className="stat">
              <div className="num">{stat.num}</div>
              <div className="label">{stat.label}</div>
            </div>
          ))}
        </div>

        {negocios.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              {visaoImobiliaria
                ? "Nenhum negócio vinculado à imobiliária ainda."
                : "Você ainda não tem negócios em andamento."}
            </p>
            <p className="hint" style={{ marginTop: 8 }}>
              Negócios aparecem aqui assim que um imóvel publicado entra em
              negociação.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: "8px 20px" }}>
            <div className="list-row">
              <div className={styles.dealRow} style={{ width: "100%" }}>
                <div className={styles.imovel}>
                  <span className="mono muted">IMÓVEL</span>
                </div>
                <div className={styles.statusCol}>
                  <span className="mono muted">STATUS</span>
                </div>
                <div className={styles.linkCol}>
                  <span className="mono muted">VÍNCULO</span>
                </div>
              </div>
            </div>

            {negocios.map((negocio) => {
              const badge = STATUS_BADGE[negocio.status] ?? {
                label: negocio.status,
                className: "badge-outline",
              };
              const vinculo =
                negocio.imobiliaria?.nome ??
                negocio.corretor?.nome ??
                "Sem corretor vinculado";
              return (
                <div key={negocio.id} className="list-row">
                  <div className={styles.dealRow} style={{ width: "100%" }}>
                    <div className={styles.imovel}>
                      <div className={styles.addr}>
                        {negocio.imoveis?.titulo ?? "Imóvel"}
                        {negocio.imoveis?.bairro
                          ? `, ${negocio.imoveis.bairro}`
                          : ""}
                      </div>
                      <div className={styles.sub}>
                        Comprador: {negocio.comprador?.nome ?? "—"}
                      </div>
                    </div>
                    <div className={styles.statusCol}>
                      <span className={`badge ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className={styles.linkCol}>
                      {vinculo}
                      {negocio.status === "concluido" && (
                        <div>
                          <Link
                            href={`/oferta-pos-negocio?negocio_id=${negocio.id}`}
                          >
                            Ofertas pós-negócio →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="hint mt-16">
          Documentos por imóvel e histórico de vínculo corretor ↔ imobiliária
          chegam em uma próxima etapa.
        </p>
      </div>

      <Footer />
    </>
  );
}
