import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { BuscaHome } from "./busca-home";
import { ImovelCard } from "@/components/imovel-card";
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
  imovel_fotos: { arquivo_url: string; ordem: number }[];
};

export default async function Home() {
  const supabase = await createClient();
  const [{ count: imoveisCount }, { count: negociosCount }, { data: dadosRecentes }] =
    await Promise.all([
      supabase.from("imoveis").select("id", { count: "exact", head: true }).eq("status", "publicado"),
      supabase.from("negocios").select("id", { count: "exact", head: true }).eq("status", "concluido"),
      supabase
        .from("imoveis")
        .select("id, titulo, bairro, cidade, preco, finalidade, quartos, imovel_fotos(arquivo_url, ordem)")
        .eq("status", "publicado")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
  const imoveisRecentes = (dadosRecentes ?? []) as unknown as ImovelDestaque[];

  return (
    <>
      <Nav active="/" />

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

        {Boolean(imoveisCount) && (
          <p className={styles.provaSocial}>
            {imoveisCount} imóve{imoveisCount === 1 ? "l" : "is"} publicado
            {imoveisCount === 1 ? "" : "s"} na Rede Impulso
            {Boolean(negociosCount) &&
              ` · ${negociosCount} negócio${negociosCount === 1 ? "" : "s"} fechado${negociosCount === 1 ? "" : "s"}`}
          </p>
        )}

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
