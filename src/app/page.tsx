import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { BuscaHome } from "./busca-home";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

export default async function Home() {
  const supabase = await createClient();
  const [{ count: imoveisCount }, { count: negociosCount }] = await Promise.all([
    supabase.from("imoveis").select("id", { count: "exact", head: true }).eq("status", "publicado"),
    supabase.from("negocios").select("id", { count: "exact", head: true }).eq("status", "concluido"),
  ]);

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

      <Footer />
    </>
  );
}
