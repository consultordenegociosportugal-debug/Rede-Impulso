import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { VeiculoCard } from "@/components/veiculo-card";
import { createClient } from "@/lib/supabase/server";
import type { ItemRadar } from "@/lib/motorista/radar";
import styles from "./page.module.css";

// Home da Rede Impulso focada em quem vive ao volante: motoristas de
// aplicativo e donos de elétricos (mudança de foco de 2026-09, ver
// src/lib/modulos.ts).

const FERRAMENTAS = [
  {
    href: "/motorista/raio-x",
    icone: "🔎",
    titulo: "Raio-X do lucro real",
    texto: "Quanto sobra de verdade por hora e por km — e se um elétrico compensa para você.",
  },
  {
    href: "/motorista",
    icone: "📡",
    titulo: "Radar do motorista",
    texto: "Combustível, recarga, eventos que aumentam as corridas, clima e regras das plataformas.",
  },
  {
    href: "/eletricos/eletropostos",
    icone: "⚡",
    titulo: "Eletropostos",
    texto: "Onde carregar, com conector, potência e preço — mantido pela comunidade e por IA.",
  },
  {
    href: "/eletricos/oficinas",
    icone: "🔧",
    titulo: "Oficinas especializadas",
    texto: "Quem entende de elétrico e híbrido na sua cidade.",
  },
  {
    href: "/eletricos/veiculos",
    icone: "🚗",
    titulo: "Comprar e vender elétricos",
    texto: "Anúncios com selo de preço comparado à FIPE.",
  },
  {
    href: "/eletricos/comunidade",
    icone: "💬",
    titulo: "Comunidade",
    texto: "Tire dúvidas com outros motoristas — e com o assistente da Rede.",
  },
];

const TIPO_LABEL: Record<string, string> = {
  eletrico: "100% elétrico",
  hibrido: "Híbrido",
  hibrido_plugin: "Híbrido plug-in",
};

type VeiculoRow = {
  id: string;
  marca: string;
  modelo: string;
  ano: number;
  km: number | null;
  preco: number | null;
  tipo: string;
  cidade: string;
  estado: string;
  ev_veiculo_fotos: { arquivo_url: string; ordem: number }[];
};

export async function HomeMotorista() {
  const supabase = await createClient();

  const [{ data: radar }, { data: veiculosData }] = await Promise.all([
    supabase
      .from("motorista_radar")
      .select("itens")
      .order("data_referencia", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ev_veiculos")
      .select("id, marca, modelo, ano, km, preco, tipo, cidade, estado, ev_veiculo_fotos(arquivo_url, ordem)")
      .eq("status", "publicado")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  // Na home, só o que vale para o Brasil todo — o filtro por região fica
  // na página do radar.
  const destaquesRadar = ((radar?.itens ?? []) as ItemRadar[]).filter((i) => !i.estado && !i.cidade).slice(0, 3);
  const veiculos = (veiculosData ?? []) as VeiculoRow[];

  return (
    <>
      <Nav active="/" />

      <main className={styles.centro}>
        <div className={styles.wordmark}>
          <span className="node" />
          Rede Impulso
        </div>
        <h1 className={styles.headline}>
          Apoio total para quem <span className={styles.accent}>vive ao volante</span>.
        </h1>
        <p className={styles.tagline} style={{ maxWidth: 560 }}>
          Motorista de aplicativo ou dono de elétrico: seu lucro real, o radar do dia, onde carregar, quem
          conserta e uma comunidade que entende a sua rotina — num lugar só.
        </p>
        <div className="flex gap-8" style={{ justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/motorista/raio-x" className="btn btn-primary">
            Fazer meu Raio-X grátis
          </Link>
          <Link href="/motorista" className="btn btn-outline">
            Ver o radar de hoje
          </Link>
        </div>
      </main>

      <div className="wrap" style={{ paddingBottom: 64 }}>
        <div className="grid grid-3" style={{ gap: 16 }}>
          {FERRAMENTAS.map((f) => (
            <Link key={f.href} href={f.href} className="card" style={{ display: "block" }}>
              <div style={{ fontSize: 22 }} aria-hidden="true">
                {f.icone}
              </div>
              <strong style={{ display: "block", marginTop: 8 }}>{f.titulo}</strong>
              <p className="hint" style={{ margin: "4px 0 0" }}>
                {f.texto}
              </p>
            </Link>
          ))}
        </div>

        {destaquesRadar.length > 0 && (
          <>
            <div className="flex between items-center mt-24 mb-16" style={{ flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ fontSize: 20, margin: 0 }}>No radar de hoje</h2>
              <Link href="/motorista" className="btn btn-ghost btn-sm">
                Radar completo →
              </Link>
            </div>
            <div className="grid grid-3" style={{ gap: 16 }}>
              {destaquesRadar.map((item, i) => (
                <div key={i} className="card">
                  <strong>{item.titulo}</strong>
                  <p className="hint" style={{ margin: "4px 0 0" }}>
                    {item.texto}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {veiculos.length > 0 && (
          <>
            <div className="flex between items-center mt-24 mb-16" style={{ flexWrap: "wrap", gap: 12 }}>
              <h2 style={{ fontSize: 20, margin: 0 }}>Elétricos anunciados agora</h2>
              <Link href="/eletricos/veiculos" className="btn btn-ghost btn-sm">
                Ver todos →
              </Link>
            </div>
            <div className="grid grid-3">
              {veiculos.map((v) => {
                const foto = [...v.ev_veiculo_fotos].sort((a, b) => a.ordem - b.ordem)[0];
                return (
                  <VeiculoCard
                    key={v.id}
                    veiculo={{
                      id: v.id,
                      marca: v.marca,
                      modelo: v.modelo,
                      ano: v.ano,
                      km: v.km,
                      preco: v.preco,
                      tipoLabel: TIPO_LABEL[v.tipo] ?? v.tipo,
                      cidade: v.cidade,
                      estado: v.estado,
                      fotoUrl: foto?.arquivo_url ?? null,
                    }}
                  />
                );
              })}
            </div>
          </>
        )}

        <p className="hint mt-24" style={{ textAlign: "center" }}>
          Guia independente, sem vínculo com Uber, 99, inDrive ou outras plataformas.
        </p>
      </div>

      <Footer />
    </>
  );
}
