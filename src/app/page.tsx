import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { BuscaHome } from "./busca-home";
import { ImovelCard } from "@/components/imovel-card";
import { TickerMercado } from "@/components/ticker-mercado";
import { EstatisticasRede } from "@/components/estatisticas-rede";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

type ImovelDestaque = {
  id: string;
  titulo: string;
  bairro: string;
  cidade: string;
  preco: number | null;
  finalidade: "venda" | "aluguel";
  quartos: number | null;
  destaque_ate: string | null;
  imovel_fotos: { arquivo_url: string; ordem: number }[];
};

const LIMITE_HOME = 6;
const COLUNAS_HOME =
  "id, titulo, bairro, cidade, preco, finalidade, quartos, destaque_ate, imovel_fotos(arquivo_url, ordem)";

export default async function Home() {
  const supabase = await createClient();
  const { data: dadosDestaque } = await supabase
    .from("imoveis")
    .select(COLUNAS_HOME)
    .eq("status", "publicado")
    .gt("destaque_ate", new Date().toISOString())
    .order("destaque_ate", { ascending: true })
    .limit(LIMITE_HOME);

  const destacados = (dadosDestaque ?? []) as unknown as ImovelDestaque[];
  const idsDestacados = destacados.map((i) => i.id);

  let queryResto = supabase
    .from("imoveis")
    .select(COLUNAS_HOME)
    .eq("status", "publicado")
    .order("created_at", { ascending: false })
    .limit(LIMITE_HOME);
  if (idsDestacados.length > 0) {
    queryResto = queryResto.not("id", "in", `(${idsDestacados.join(",")})`);
  }
  const { data: dadosResto } = await queryResto;
  const resto = (dadosResto ?? []) as unknown as ImovelDestaque[];

  const imoveisRecentes = [...destacados, ...resto].slice(0, LIMITE_HOME);

  return (
    <>
      <Nav active="/" />

      <TickerMercado />

      <main className={styles.centro}>
        <div className={styles.wordmark}>
          <span className="node" />
          Rede Impulso
        </div>
        <h1 className={styles.headline}>
          Todo negócio fechado começa com{" "}
          <span className={styles.accent}>um impulso</span>.
        </h1>
        <p className={styles.tagline}>O que podemos fazer por você hoje?</p>

        <BuscaHome />

        <div className={styles.provaSocial}>
          <EstatisticasRede />
        </div>

        <div className={styles.linksSecundarios}>
          <Link href="/sobre">Como funciona</Link>
        </div>
      </main>

      {imoveisRecentes.length > 0 && (
        <div className="wrap" style={{ padding: "0 0 64px" }}>
          <div className="flex between items-center mb-16" style={{ flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ fontSize: 20, margin: 0 }}>Imóveis publicados agora</h2>
            <Link href="/imoveis" className="btn btn-ghost btn-sm">
              Ver todos os imóveis →
            </Link>
          </div>
          <div className="grid grid-3">
            {imoveisRecentes.map((imovel) => {
              const foto = [...imovel.imovel_fotos].sort((a, b) => a.ordem - b.ordem)[0];
              return (
                <ImovelCard
                  key={imovel.id}
                  imovel={{
                    id: imovel.id,
                    titulo: imovel.titulo,
                    bairro: imovel.bairro,
                    cidade: imovel.cidade,
                    preco: imovel.preco,
                    finalidade: imovel.finalidade,
                    specs: imovel.quartos ? `${imovel.quartos}q` : undefined,
                    fotoUrl: foto?.arquivo_url ?? null,
                    destaque: Boolean(
                      imovel.destaque_ate && new Date(imovel.destaque_ate) > new Date(),
                    ),
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
