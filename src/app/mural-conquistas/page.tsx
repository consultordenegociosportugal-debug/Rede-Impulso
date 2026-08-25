import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

const PAGE_SIZE = 9;

type DealRow = {
  id: string;
  texto: string;
  estrelas: number;
  corretor: { nome: string } | null;
  negocios: { imoveis: { titulo: string; bairro: string } | null } | null;
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

export default async function MuralConquistasPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const { offset: offsetParam } = await searchParams;
  const offset = Number(offsetParam ?? 0) || 0;

  const supabase = await createClient();
  const { data } = await supabase
    .from("depoimentos")
    .select(
      "id, texto, estrelas, corretor:profiles!corretor_id(nome), negocios(imoveis(titulo, bairro))",
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const deals = (data ?? []) as unknown as DealRow[];
  const hasMore = deals.length === PAGE_SIZE;

  return (
    <>
      <Nav active="/mural-conquistas" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <span className="eyebrow">Mural de conquistas</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
          Negócios que já passaram pela Rede
        </h1>
        <p className="muted mb-24">
          Fotos, estrelas de carreira e depoimentos de quem comprou e vendeu.
        </p>

        {deals.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum negócio concluído com depoimento ainda.
            </p>
          </div>
        ) : (
          <div className="grid grid-3">
            {deals.map((deal, i) => {
              const imovel = deal.negocios?.imoveis;
              const nome = deal.corretor?.nome ?? "Corretor";
              return (
                <div key={deal.id} className={`card ${styles.dealCard}`}>
                  <div className={styles.dealPhoto}>
                    {imovel
                      ? `${imovel.titulo.toLowerCase()} · ${imovel.bairro}`
                      : "imóvel"}
                  </div>
                  <div className={styles.dealBody}>
                    <div className="flex between items-center">
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {imovel?.titulo ?? "Imóvel"}
                      </div>
                      <span className="stars" style={{ fontSize: 12 }}>
                        {renderStars(deal.estrelas)}
                      </span>
                    </div>
                    <p className={styles.dealQuote}>&ldquo;{deal.texto}&rdquo;</p>
                    <div className={styles.dealWho}>
                      <div
                        className="avatar sm"
                        style={
                          i % 2 === 1
                            ? { background: "var(--surface-2)", color: "var(--ink-soft)" }
                            : undefined
                        }
                      >
                        {iniciais(nome)}
                      </div>
                      <div style={{ fontSize: 12 }}>
                        <strong>{nome}</strong>
                        <div className="muted mono">
                          {imovel ? `bairro ${imovel.bairro}` : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <Link
            href={`/mural-conquistas?offset=${offset + PAGE_SIZE}`}
            className="btn btn-ghost mt-24"
          >
            Carregar mais negócios
          </Link>
        )}
      </div>

      <Footer />
    </>
  );
}
