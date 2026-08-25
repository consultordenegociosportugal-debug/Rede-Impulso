import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { FavoritoButton } from "./favorito-button";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type ImovelRow = {
  id: string;
  titulo: string;
  bairro: string;
  cidade: string;
  preco: number | null;
  finalidade: "venda" | "aluguel";
  tipo: string;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  area_m2: number | null;
  imovel_fotos: { arquivo_url: string; ordem: number }[];
};

const TIPO_LABEL: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  kitnet: "Kitnet",
  terreno: "Terreno",
  comercial: "Comercial",
  outro: "Outro",
};

export default async function ImoveisPage({
  searchParams,
}: {
  searchParams: Promise<{ finalidade?: string; bairro?: string; tipo?: string; quartos?: string }>;
}) {
  const { finalidade, bairro, tipo, quartos } = await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("imoveis")
    .select(
      "id, titulo, bairro, cidade, preco, finalidade, tipo, quartos, banheiros, vagas, area_m2, imovel_fotos(arquivo_url, ordem)",
    )
    .eq("status", "publicado")
    .order("created_at", { ascending: false })
    .limit(24);

  if (finalidade === "venda" || finalidade === "aluguel") {
    query = query.eq("finalidade", finalidade);
  }
  if (bairro) {
    query = query.ilike("bairro", `%${bairro}%`);
  }
  if (tipo) {
    query = query.eq("tipo", tipo);
  }
  if (quartos) {
    query = query.gte("quartos", Number(quartos));
  }

  const { data } = await query;
  const imoveis = (data ?? []) as unknown as ImovelRow[];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let favoritados = new Set<string>();
  if (user) {
    const { data: favoritosData } = await supabase
      .from("favoritos")
      .select("imovel_id")
      .eq("usuario_id", user.id);
    favoritados = new Set((favoritosData ?? []).map((f) => f.imovel_id));
  }

  const paramsFinalidade = (f?: string) => {
    const p = new URLSearchParams();
    if (f) p.set("finalidade", f);
    if (bairro) p.set("bairro", bairro);
    return `/imoveis?${p.toString()}`;
  };

  return (
    <>
      <Nav active="/imoveis" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <span className="eyebrow">Vitrine</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
          Imóveis publicados na Rede Impulso
        </h1>
        <p className="muted mb-24">
          Todos os anúncios ativos, para comprar ou alugar.
        </p>

        <div
          className="flex items-center gap-16 mb-24"
          style={{ flexWrap: "wrap" }}
        >
          <div className="segmented">
            <Link href={paramsFinalidade(undefined)} className={!finalidade ? "active" : undefined}>
              Todos
            </Link>
            <Link href={paramsFinalidade("venda")} className={finalidade === "venda" ? "active" : undefined}>
              Vender
            </Link>
            <Link href={paramsFinalidade("aluguel")} className={finalidade === "aluguel" ? "active" : undefined}>
              Alugar
            </Link>
          </div>

          <form method="get" className="flex gap-8" style={{ flexWrap: "wrap" }}>
            {finalidade && <input type="hidden" name="finalidade" value={finalidade} />}
            <input
              type="text"
              name="bairro"
              placeholder="Buscar por bairro"
              defaultValue={bairro ?? ""}
              style={{ width: 180 }}
            />
            <select name="tipo" defaultValue={tipo ?? ""} style={{ width: 150 }}>
              <option value="">Qualquer tipo</option>
              {Object.entries(TIPO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select name="quartos" defaultValue={quartos ?? ""} style={{ width: 130 }}>
              <option value="">Quartos</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
            <button type="submit" className="btn btn-outline btn-sm">
              Buscar
            </button>
            <Link
              href="/foto-do-imovel"
              className="btn btn-ghost btn-sm"
              title="Buscar por foto"
              aria-label="Buscar por foto"
            >
              📷
            </Link>
          </form>
        </div>

        {!user && (
          <div className={`card mb-24 ${styles.sugestaoCadastro}`}>
            <span>💬</span>
            <p style={{ margin: 0, flex: 1 }}>
              Continue buscando à vontade — se quiser salvar imóveis e falar
              com quem anuncia,{" "}
              <Link href="/cadastro-cliente" style={{ textDecoration: "underline" }}>
                crie uma conta grátis
              </Link>
              .
            </p>
          </div>
        )}

        {imoveis.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum imóvel encontrado com esses filtros.
            </p>
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
                      favoritadoInicial={favoritados.has(imovel.id)}
                      logado={Boolean(user)}
                      variant="icon"
                    />
                  </div>
                  <div className={styles.imovelBody}>
                    <span
                      className={`badge ${imovel.finalidade === "venda" ? "badge-primary" : "badge-amber"}`}
                    >
                      {imovel.finalidade === "venda" ? "Venda" : "Aluguel"}
                    </span>{" "}
                    <span className="hint" style={{ margin: 0 }}>
                      {TIPO_LABEL[imovel.tipo] ?? imovel.tipo}
                    </span>
                    <div style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>
                      {imovel.titulo}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {imovel.bairro}, {imovel.cidade}
                    </div>
                    {(imovel.quartos || imovel.banheiros || imovel.vagas || imovel.area_m2) && (
                      <div className="hint mono" style={{ margin: "6px 0 0" }}>
                        {imovel.quartos ? `${imovel.quartos}q` : null}
                        {imovel.banheiros ? ` · ${imovel.banheiros}ban` : null}
                        {imovel.vagas ? ` · ${imovel.vagas}vg` : null}
                        {imovel.area_m2 ? ` · ${imovel.area_m2}m²` : null}
                      </div>
                    )}
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
