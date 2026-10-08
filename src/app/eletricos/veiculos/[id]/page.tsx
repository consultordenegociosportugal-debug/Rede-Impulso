import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { StatusVeiculo } from "./status-veiculo";
import styles from "./page.module.css";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

type VeiculoDetalhe = {
  id: string;
  vendedor_id: string;
  status: string;
  marca: string;
  modelo: string;
  ano: number;
  km: number | null;
  preco: number | null;
  tipo: string;
  condicao: string;
  cor: string | null;
  cambio: string | null;
  autonomia_km: number | null;
  unico_dono: boolean;
  aceita_troca: boolean;
  cidade: string;
  estado: string;
  descricao: string | null;
  curadoria_selo: string | null;
  curadoria_nota: string | null;
  ev_veiculo_fotos: { arquivo_url: string; ordem: number }[];
  vendedor: { nome: string; telefone: string | null; email: string | null } | null;
};

const TIPO_LABEL: Record<string, string> = {
  eletrico: "100% elétrico",
  hibrido: "Híbrido",
  hibrido_plugin: "Híbrido plug-in",
};

const CAMBIO_LABEL: Record<string, string> = {
  automatico: "Automático",
  direto: "Direto (1 marcha)",
  cvt: "CVT",
  manual: "Manual",
};

// Selo do agente de curadoria (migração 0033). "suspeito" não aparece
// aqui — fica só no painel do admin.
const SELO_CURADORIA: Record<string, { label: string; className: string }> = {
  preco_ok: { label: "✓ Preço dentro do mercado", className: "badge-primary" },
  preco_acima: { label: "Preço acima do mercado", className: "badge-amber" },
  preco_abaixo: { label: "Preço abaixo do mercado", className: "badge-outline" },
};

const CONDICAO_LABEL: Record<string, string> = {
  novo: "Novo (0 km)",
  seminovo: "Seminovo",
  usado: "Usado",
};

export default async function VeiculoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("ev_veiculos")
    .select(
      "id, vendedor_id, status, marca, modelo, ano, km, preco, tipo, condicao, cor, cambio, autonomia_km, unico_dono, aceita_troca, cidade, estado, descricao, curadoria_selo, curadoria_nota, ev_veiculo_fotos(arquivo_url, ordem), vendedor:vendedor_id(nome, telefone, email)",
    )
    .eq("id", id)
    .maybeSingle();

  const veiculo = data as unknown as VeiculoDetalhe | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ehDono = Boolean(user && veiculo && user.id === veiculo.vendedor_id);

  if (!veiculo) {
    return (
      <>
        <Nav active="/eletricos/veiculos" />
        <div className="wrap">
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p className="muted">Anúncio não encontrado ou não está mais publicado.</p>
            <Link href="/eletricos/veiculos" className="btn btn-primary btn-sm mt-16">
              Ver outros veículos
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const fotos = [...veiculo.ev_veiculo_fotos].sort((a, b) => a.ordem - b.ordem);
  const whatsapp = veiculo.vendedor?.telefone?.replace(/\D/g, "");

  return (
    <>
      <Nav active="/eletricos/veiculos" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <Link href="/eletricos/veiculos" className="hint">
          ← Voltar para o marketplace
        </Link>

        {ehDono && (
          <div className="card mt-16 mb-16">
            <div style={{ fontWeight: 600, fontSize: 14 }}>Este anúncio é seu</div>
            <p className="hint" style={{ margin: "2px 0 10px" }}>
              Altere o status conforme a negociação avança.
            </p>
            <StatusVeiculo veiculoId={veiculo.id} statusAtual={veiculo.status} />
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
            <span className="badge badge-primary">{TIPO_LABEL[veiculo.tipo] ?? veiculo.tipo}</span>
            <span className="hint" style={{ marginLeft: 6 }}>
              {CONDICAO_LABEL[veiculo.condicao] ?? veiculo.condicao}
            </span>
            {veiculo.unico_dono && (
              <span className="badge badge-outline" style={{ marginLeft: 6 }}>
                Único dono
              </span>
            )}
            {veiculo.aceita_troca && (
              <span className="badge badge-outline" style={{ marginLeft: 6 }}>
                Aceita troca
              </span>
            )}
            <h1 style={{ fontSize: 24, margin: "10px 0 4px" }}>
              {veiculo.marca} {veiculo.modelo} · {veiculo.ano}
            </h1>
            <p className="muted" style={{ margin: 0 }}>
              {veiculo.cidade}/{veiculo.estado}
              {veiculo.km != null ? ` · ${veiculo.km.toLocaleString("pt-BR")} km` : ""}
              {veiculo.cor ? ` · ${veiculo.cor}` : ""}
              {veiculo.cambio ? ` · ${CAMBIO_LABEL[veiculo.cambio] ?? veiculo.cambio}` : ""}
            </p>
            {veiculo.autonomia_km != null && (
              <p className="hint" style={{ margin: "4px 0 0" }}>
                🔋 Até {veiculo.autonomia_km} km por carga
              </p>
            )}

            <div className="mono" style={{ fontSize: 20, margin: "12px 0" }}>
              {veiculo.preco ? formatoMoeda.format(veiculo.preco) : "Preço a combinar"}
            </div>

            {veiculo.curadoria_selo && SELO_CURADORIA[veiculo.curadoria_selo] && (
              <p className="hint" style={{ margin: "0 0 12px" }}>
                <span className={`badge ${SELO_CURADORIA[veiculo.curadoria_selo].className}`}>
                  {SELO_CURADORIA[veiculo.curadoria_selo].label}
                </span>
                {veiculo.curadoria_nota && <span style={{ marginLeft: 6 }}>{veiculo.curadoria_nota}</span>}
              </p>
            )}

            {veiculo.descricao && (
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>{veiculo.descricao}</p>
            )}

            {!ehDono && (
              <div className="card mt-16">
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  Anunciado por {veiculo.vendedor?.nome ?? "vendedor"}
                </div>
                <p className="hint" style={{ margin: "4px 0 10px" }}>
                  O contato é direto com quem está vendendo.
                </p>
                {whatsapp ? (
                  <a
                    href={`https://wa.me/55${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-block"
                  >
                    Falar no WhatsApp
                  </a>
                ) : veiculo.vendedor?.email ? (
                  <a href={`mailto:${veiculo.vendedor.email}`} className="btn btn-primary btn-block">
                    Enviar e-mail
                  </a>
                ) : (
                  <p className="hint" style={{ margin: 0 }}>
                    Vendedor ainda não cadastrou um contato público.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
