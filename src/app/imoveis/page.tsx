import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { FavoritoButton } from "./favorito-button";
import { ImovelCard } from "@/components/imovel-card";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

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
  destaque_ate: string | null;
  imovel_fotos: { arquivo_url: string; ordem: number }[];
};

const COLUNAS_IMOVEL =
  "id, titulo, bairro, cidade, preco, finalidade, tipo, quartos, banheiros, vagas, area_m2, destaque_ate, imovel_fotos(arquivo_url, ordem), vendedor:vendedor_id!inner(role)";

const TIPO_LABEL: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  kitnet: "Kitnet",
  terreno: "Terreno",
  comercial: "Comercial",
  outro: "Outro",
};

const ANUNCIANTE_LABEL: Record<string, string> = {
  vendedor: "Proprietário",
  corretor: "Corretor",
  imobiliaria: "Imobiliária",
};

export default async function ImoveisPage({
  searchParams,
}: {
  searchParams: Promise<{
    finalidade?: string;
    bairro?: string;
    tipo?: string;
    quartos?: string;
    anunciante?: string;
  }>;
}) {
  const { finalidade, bairro, tipo, quartos, anunciante } = await searchParams;
  const LIMITE = 24;

  const supabase = await createClient();

  // Anúncios em destaque (pagos) aparecem primeiro — mesmos filtros da
  // busca, só que restritos a quem tem destaque_ate no futuro. O resto
  // vem depois, ordenado por mais recente, excluindo quem já apareceu.
  let queryDestaque = supabase
    .from("imoveis")
    .select(COLUNAS_IMOVEL)
    .eq("status", "publicado")
    .gt("destaque_ate", new Date().toISOString())
    .order("destaque_ate", { ascending: true })
    .limit(LIMITE);

  let queryResto = supabase
    .from("imoveis")
    .select(COLUNAS_IMOVEL)
    .eq("status", "publicado")
    .order("created_at", { ascending: false })
    .limit(LIMITE);

  if (finalidade === "venda" || finalidade === "aluguel") {
    queryDestaque = queryDestaque.eq("finalidade", finalidade);
    queryResto = queryResto.eq("finalidade", finalidade);
  }
  if (bairro) {
    queryDestaque = queryDestaque.ilike("bairro", `%${bairro}%`);
    queryResto = queryResto.ilike("bairro", `%${bairro}%`);
  }
  if (tipo) {
    queryDestaque = queryDestaque.eq("tipo", tipo);
    queryResto = queryResto.eq("tipo", tipo);
  }
  if (quartos) {
    queryDestaque = queryDestaque.gte("quartos", Number(quartos));
    queryResto = queryResto.gte("quartos", Number(quartos));
  }
  if (anunciante && anunciante in ANUNCIANTE_LABEL) {
    queryDestaque = queryDestaque.eq("vendedor.role", anunciante);
    queryResto = queryResto.eq("vendedor.role", anunciante);
  }

  const { data: dadosDestaque } = await queryDestaque;
  const destacados = (dadosDestaque ?? []) as unknown as ImovelRow[];
  const idsDestacados = destacados.map((i) => i.id);

  if (idsDestacados.length > 0) {
    queryResto = queryResto.not("id", "in", `(${idsDestacados.join(",")})`);
  }
  const { data: dadosResto } = await queryResto;
  const resto = (dadosResto ?? []) as unknown as ImovelRow[];

  const imoveis = [...destacados, ...resto].slice(0, LIMITE);

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
            <select name="anunciante" defaultValue={anunciante ?? ""} style={{ width: 160 }}>
              <option value="">Qualquer anunciante</option>
              {Object.entries(ANUNCIANTE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
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
              const specs = [
                imovel.quartos ? `${imovel.quartos}q` : null,
                imovel.banheiros ? `${imovel.banheiros}ban` : null,
                imovel.vagas ? `${imovel.vagas}vg` : null,
                imovel.area_m2 ? `${imovel.area_m2}m²` : null,
              ]
                .filter(Boolean)
                .join(" · ");
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
                    tipoLabel: TIPO_LABEL[imovel.tipo] ?? imovel.tipo,
                    specs: specs || undefined,
                    fotoUrl: foto?.arquivo_url ?? null,
                    destaque: Boolean(
                      imovel.destaque_ate && new Date(imovel.destaque_ate) > new Date(),
                    ),
                  }}
                  favoritoSlot={
                    <FavoritoButton
                      imovelId={imovel.id}
                      favoritadoInicial={favoritados.has(imovel.id)}
                      logado={Boolean(user)}
                      variant="icon"
                    />
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
