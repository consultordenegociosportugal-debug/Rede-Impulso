import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { FavoritoButton } from "../imoveis/favorito-button";
import styles from "../imoveis/page.module.css";
import { Footer } from "@/components/footer";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type FavoritoRow = {
  imoveis: {
    id: string;
    titulo: string;
    bairro: string;
    cidade: string;
    preco: number | null;
    finalidade: "venda" | "aluguel";
    imovel_fotos: { arquivo_url: string; ordem: number }[];
  } | null;
};

export default async function FavoritosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/favoritos");
  }

  const { data } = await supabase
    .from("favoritos")
    .select(
      "imoveis(id, titulo, bairro, cidade, preco, finalidade, imovel_fotos(arquivo_url, ordem))",
    )
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false });

  const favoritos = (data ?? []) as unknown as FavoritoRow[];
  const imoveis = favoritos
    .map((f) => f.imoveis)
    .filter((i): i is NonNullable<typeof i> => i !== null);

  return (
    <>
      <Nav active="/favoritos" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <span className="eyebrow">Favoritos</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
          Imóveis que você salvou
        </h1>
        <p className="muted mb-24">
          Anúncios que ainda estão publicados aparecem aqui até você decidir.
        </p>

        {imoveis.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Você ainda não favoritou nenhum imóvel.
            </p>
            <Link href="/imoveis" className="btn btn-primary btn-sm mt-16">
              Ver imóveis disponíveis
            </Link>
          </div>
        ) : (
          <div className="grid grid-3">
            {imoveis.map((imovel) => {
              const foto = [...imovel.imovel_fotos].sort((a, b) => a.ordem - b.ordem)[0];
              return (
                <Link
                  key={imovel.id}
                  href={`/imoveis/${imovel.id}`}
                  className={`card ${styles.imovelCard}`}
                >
                  <div style={{ position: "relative" }}>
                    {foto ? (
                      <div
                        className={styles.imovelFoto}
                        style={{ backgroundImage: `url(${foto.arquivo_url})` }}
                      />
                    ) : (
                      <div className="photo-slot">sem foto</div>
                    )}
                    <FavoritoButton
                      imovelId={imovel.id}
                      favoritadoInicial
                      logado
                      variant="icon"
                    />
                  </div>
                  <div className={styles.imovelBody}>
                    <span
                      className={`badge ${imovel.finalidade === "venda" ? "badge-primary" : "badge-amber"}`}
                    >
                      {imovel.finalidade === "venda" ? "Venda" : "Aluguel"}
                    </span>
                    <div style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>
                      {imovel.titulo}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {imovel.bairro}, {imovel.cidade}
                    </div>
                    <div className="mono" style={{ marginTop: 8, fontSize: 14 }}>
                      {imovel.preco ? formatoMoeda.format(imovel.preco) : "Preço a combinar"}
                    </div>
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
