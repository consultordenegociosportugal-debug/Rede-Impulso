import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { InteresseButton } from "./interesse-button";
import { AgendarVisitaButton } from "./agendar-visita-button";
import { DenunciarBotao } from "./denunciar-botao";
import { FavoritoButton } from "../favorito-button";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type ImovelDetalhe = {
  id: string;
  vendedor_id: string;
  status: string;
  titulo: string;
  bairro: string;
  cidade: string;
  descricao: string | null;
  preco: number | null;
  finalidade: "venda" | "aluguel";
  tipo: string;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  area_m2: number | null;
  comodidades: string[];
  latitude: number | null;
  longitude: number | null;
  imovel_fotos: { arquivo_url: string; ordem: number }[];
  vendedor: { nome: string; role: string; verification_status: string } | null;
  destaque_ate: string | null;
};

const TIPO_LABEL: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  kitnet: "Kitnet",
  terreno: "Terreno",
  comercial: "Comercial",
  outro: "Outro",
};

const STATUS_ANUNCIO: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "badge-outline" },
  publicado: { label: "Publicado", className: "badge-primary" },
  em_negociacao: { label: "Em negociação", className: "badge-amber" },
  vendido: { label: "Vendido", className: "badge-amber" },
  arquivado: { label: "Pausado", className: "badge-outline" },
};

export default async function ImovelDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("imoveis")
    .select(
      "id, vendedor_id, status, titulo, bairro, cidade, descricao, preco, finalidade, tipo, quartos, banheiros, vagas, area_m2, comodidades, latitude, longitude, destaque_ate, imovel_fotos(arquivo_url, ordem), vendedor:vendedor_id(nome, role, verification_status)",
    )
    .eq("id", id)
    .maybeSingle();

  const imovel = data as unknown as ImovelDetalhe | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ehDono = Boolean(user && imovel && user.id === imovel.vendedor_id);

  let favoritado = false;
  if (user && imovel && !ehDono) {
    const { data: favorito } = await supabase
      .from("favoritos")
      .select("id")
      .eq("usuario_id", user.id)
      .eq("imovel_id", imovel.id)
      .maybeSingle();
    favoritado = Boolean(favorito);
  }

  if (!imovel) {
    return (
      <>
        <Nav active="/imoveis" />
        <div className="wrap">
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p className="muted">Imóvel não encontrado ou não está mais publicado.</p>
            <Link href="/imoveis" className="btn btn-primary btn-sm mt-16">
              Ver outros imóveis
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const fotos = [...imovel.imovel_fotos].sort((a, b) => a.ordem - b.ordem);

  return (
    <>
      <Nav active="/imoveis" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <Link href="/imoveis" className="hint">
          ← Voltar para a vitrine
        </Link>

        {ehDono && (
          <div
            className="card flex between items-center gap-16 mb-16"
            style={{ flexWrap: "wrap", marginTop: 12 }}
          >
            <div>
              <span
                className={`badge ${
                  (STATUS_ANUNCIO[imovel.status] ?? STATUS_ANUNCIO.publicado)
                    .className
                }`}
              >
                {(STATUS_ANUNCIO[imovel.status] ?? { label: imovel.status }).label}
              </span>
              <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>
                Este anúncio é seu
              </div>
              <p className="hint" style={{ margin: 0 }}>
                {fotos.length === 0
                  ? "Ele ainda não tem nenhuma foto — anúncios com foto recebem muito mais contatos."
                  : "Você pode atualizar os dados, trocar as fotos e escolher a capa a qualquer momento."}
              </p>
            </div>
            <div className="flex gap-8">
              <Link
                href={`/publicar-imovel/${imovel.id}/editar`}
                className="btn btn-primary btn-sm"
              >
                ✏️ Editar anúncio
              </Link>
              <Link href="/painel-negocios" className="btn btn-ghost btn-sm">
                Meus anúncios
              </Link>
            </div>
          </div>
        )}

        <div className={styles.layout}>
          <div>
            {fotos.length > 0 ? (
              <div className={styles.galeria}>
                {fotos.map((foto) => (
                  <div
                    key={foto.arquivo_url}
                    className={styles.foto}
                    style={{ backgroundImage: `url(${foto.arquivo_url})` }}
                  />
                ))}
              </div>
            ) : (
              <div className="photo-slot" style={{ aspectRatio: "16 / 10" }}>
                sem fotos
              </div>
            )}
          </div>

          <div>
            <span
              className={`badge ${imovel.finalidade === "venda" ? "badge-primary" : "badge-amber"}`}
            >
              {imovel.finalidade === "venda" ? "Venda" : "Aluguel"}
            </span>
            <span className="hint" style={{ marginLeft: 6 }}>
              {TIPO_LABEL[imovel.tipo] ?? imovel.tipo}
            </span>
            {imovel.destaque_ate && new Date(imovel.destaque_ate) > new Date() && (
              <span className="badge badge-amber" style={{ marginLeft: 6 }}>
                🚀 Destaque
              </span>
            )}
            <h1 style={{ fontSize: 24, margin: "10px 0 4px" }}>{imovel.titulo}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {imovel.bairro}, {imovel.cidade}
            </p>

            {imovel.vendedor?.verification_status === "aprovado" && (
              <p
                className="hint"
                style={{
                  margin: "6px 0 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--primary)",
                }}
              >
                <span aria-hidden="true">✓</span>
                Anunciante com identidade verificada
              </p>
            )}

            {(imovel.quartos || imovel.banheiros || imovel.vagas || imovel.area_m2) && (
              <div className="flex gap-16 mt-12" style={{ fontSize: 13.5 }}>
                {imovel.quartos ? <span>🛏️ {imovel.quartos} quartos</span> : null}
                {imovel.banheiros ? <span>🚿 {imovel.banheiros} banheiros</span> : null}
                {imovel.vagas ? <span>🚗 {imovel.vagas} vagas</span> : null}
                {imovel.area_m2 ? <span>📐 {imovel.area_m2}m²</span> : null}
              </div>
            )}

            <div className="mono" style={{ fontSize: 20, margin: "12px 0" }}>
              {imovel.preco ? formatoMoeda.format(imovel.preco) : "Preço a combinar"}
            </div>

            {imovel.descricao && (
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>{imovel.descricao}</p>
            )}

            {imovel.comodidades.length > 0 && (
              <div className="flex gap-8 mb-16" style={{ flexWrap: "wrap" }}>
                {imovel.comodidades.map((item) => (
                  <span key={item} className="badge badge-outline">
                    {item}
                  </span>
                ))}
              </div>
            )}

            {ehDono ? (
              <div className="card mt-16">
                <Link
                  href={`/publicar-imovel/${imovel.id}/editar`}
                  className="btn btn-primary btn-block"
                >
                  ✏️ Editar anúncio
                </Link>
                <p className="hint" style={{ textAlign: "center", marginBottom: 0 }}>
                  Esta é a visão pública do seu anúncio. Quem se interessar vai
                  aparecer no seu painel de negócios.
                </p>
              </div>
            ) : (
              <div className="card mt-16">
                <InteresseButton imovelId={imovel.id} />
                <div className="mt-8">
                  <AgendarVisitaButton
                    imovelId={imovel.id}
                    logado={Boolean(user)}
                  />
                </div>
                <div className="mt-8">
                  <FavoritoButton
                    imovelId={imovel.id}
                    favoritadoInicial={favoritado}
                    logado={Boolean(user)}
                  />
                </div>
                <p className="hint" style={{ textAlign: "center", marginBottom: 0 }}>
                  O contato acontece pela Rede Impulso — o vendedor é notificado
                  quando você demonstra interesse.
                </p>
              </div>
            )}

            {imovel.latitude && imovel.longitude && (
              <div className="mt-16">
                <p className="hint" style={{ marginBottom: 6 }}>Localização aproximada</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${imovel.latitude},${imovel.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={`https://maps.googleapis.com/maps/api/staticmap?center=${imovel.latitude},${imovel.longitude}&zoom=15&size=640x240&scale=2&markers=color:0x00e6a8%7C${imovel.latitude},${imovel.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                    alt={`Mapa de localização de ${imovel.titulo}`}
                    width={640}
                    height={240}
                    style={{ width: "100%", height: "auto", borderRadius: 12, display: "block" }}
                  />
                </a>
              </div>
            )}

            {!ehDono && (
              <div className="mt-16" style={{ textAlign: "center" }}>
                <DenunciarBotao imovelId={imovel.id} />
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
