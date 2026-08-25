import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { OfertaCard } from "./oferta-card";
import { DepoimentoForm } from "./depoimento-form";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

type ParceiroRow = { id: string; categoria: string; nome: string };

const DESCRICOES: Record<string, string> = {
  Pintor: "Orçamento em 24h",
  Eletricista: "Instalações e reparos",
  Encanador: "Revisão hidráulica",
  "Instalacao de ar-condicionado": "Parceiros avaliados",
  Consorcio: "Simule condições com parceiros da Rede Impulso",
};

export default async function OfertaPosNegocioPage({
  searchParams,
}: {
  searchParams: Promise<{ negocio_id?: string }>;
}) {
  const { negocio_id } = await searchParams;

  if (!negocio_id) {
    return (
      <>
        <Nav active="/oferta-pos-negocio" />
        <div className="wrap">
          <div
            className={styles.layout}
            style={{ textAlign: "center", padding: "64px 0" }}
          >
            <p className="muted">
              Selecione um negócio concluído no painel para ver as ofertas
              pós-negócio.
            </p>
            <Link
              href="/painel-negocios"
              className="btn btn-primary btn-sm mt-16"
            >
              Ver meus negócios
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: negocio }, { data: parceirosData }, { data: ofertasData }, { data: meuDepoimento }] =
    await Promise.all([
      supabase
        .from("negocios")
        .select("id, status, corretor_id, imoveis(titulo)")
        .eq("id", negocio_id)
        .single(),
      supabase.from("parceiros_servico").select("id, categoria, nome").eq("ativo", true),
      supabase.from("ofertas_pos_negocio").select("parceiro_id").eq("negocio_id", negocio_id),
      user
        ? supabase
            .from("depoimentos")
            .select("id")
            .eq("negocio_id", negocio_id)
            .eq("autor_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const parceiros = (parceirosData ?? []) as ParceiroRow[];
  const solicitados = new Set((ofertasData ?? []).map((o) => o.parceiro_id));
  const parceirosComprador = parceiros.filter((p) => p.categoria === "comprador");
  const parceirosVendedor = parceiros.filter((p) => p.categoria === "vendedor");
  const imovelTitulo = (negocio as { imoveis?: { titulo: string } | null } | null)
    ?.imoveis?.titulo;

  return (
    <>
      <Nav active="/oferta-pos-negocio" />

      <div className="wrap">
        <div className={styles.layout}>
          <div className={styles.celebrate}>
            <span className="badge badge-primary">
              {negocio?.status === "concluido" ? "Negócio concluído" : "Negócio"}
            </span>
            <h1 style={{ fontSize: 26, margin: "12px 0 4px" }}>
              As chaves são suas. E agora?
            </h1>
            <p className="muted">
              {imovelTitulo
                ? `Separamos parceiros pra ajudar na próxima etapa de ${imovelTitulo} — sem compromisso.`
                : "Separamos parceiros pra ajudar na próxima etapa — sem compromisso."}
            </p>
          </div>

          {parceirosComprador.length > 0 && (
            <>
              <span className="eyebrow">Para comprador</span>
              <div className="grid grid-2 mt-12 mb-24">
                {parceirosComprador.map((p) => (
                  <OfertaCard
                    key={p.id}
                    negocioId={negocio_id}
                    parceiroId={p.id}
                    nome={p.nome}
                    desc={DESCRICOES[p.nome] ?? ""}
                    jaSolicitado={solicitados.has(p.id)}
                  />
                ))}
              </div>
            </>
          )}

          {parceirosVendedor.length > 0 && (
            <>
              <span className="eyebrow">Para vendedor</span>
              <div className="mt-12" style={{ display: "grid", gap: 12 }}>
                {parceirosVendedor.map((p) => (
                  <OfertaCard
                    key={p.id}
                    negocioId={negocio_id}
                    parceiroId={p.id}
                    nome={p.nome}
                    desc={DESCRICOES[p.nome] ?? ""}
                    jaSolicitado={solicitados.has(p.id)}
                    amber
                  />
                ))}
              </div>
            </>
          )}

          {negocio?.status === "concluido" && user && !meuDepoimento && (
            <DepoimentoForm negocioId={negocio_id} corretorId={negocio.corretor_id} />
          )}

          <Link
            href="/mural-conquistas"
            className="btn btn-primary btn-block mt-24"
          >
            Ver mural de conquistas →
          </Link>
        </div>
      </div>

      <Footer />
    </>
  );
}
