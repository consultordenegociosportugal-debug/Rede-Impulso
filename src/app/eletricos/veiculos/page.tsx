import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { VeiculoCard } from "@/components/veiculo-card";
import { createClient } from "@/lib/supabase/server";

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

const TIPO_LABEL: Record<string, string> = {
  eletrico: "100% elétrico",
  hibrido: "Híbrido",
  hibrido_plugin: "Híbrido plug-in",
};

export default async function VeiculosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; cidade?: string; precoMax?: string }>;
}) {
  const { tipo, cidade, precoMax } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("ev_veiculos")
    .select("id, marca, modelo, ano, km, preco, tipo, cidade, estado, ev_veiculo_fotos(arquivo_url, ordem)")
    .eq("status", "publicado")
    .order("created_at", { ascending: false })
    .limit(24);

  if (tipo && tipo in TIPO_LABEL) query = query.eq("tipo", tipo);
  if (cidade) query = query.ilike("cidade", `%${cidade}%`);
  if (precoMax) query = query.lte("preco", Number(precoMax));

  const { data } = await query;
  const veiculos = (data ?? []) as unknown as VeiculoRow[];

  return (
    <>
      <Nav active="/eletricos/veiculos" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <span className="eyebrow">Marketplace</span>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Veículos elétricos e híbridos</h1>
            <p className="muted mb-24">Anúncios publicados direto por quem está vendendo.</p>
          </div>
          <Link href="/eletricos/veiculos/publicar" className="btn btn-primary btn-sm">
            + Anunciar meu veículo
          </Link>
        </div>

        <form method="get" className="flex gap-8 mb-24" style={{ flexWrap: "wrap" }}>
          <select name="tipo" defaultValue={tipo ?? ""} style={{ width: 170 }}>
            <option value="">Qualquer tipo</option>
            {Object.entries(TIPO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="cidade"
            placeholder="Cidade"
            defaultValue={cidade ?? ""}
            style={{ width: 180 }}
          />
          <input
            type="number"
            name="precoMax"
            placeholder="Preço máximo"
            defaultValue={precoMax ?? ""}
            style={{ width: 160 }}
          />
          <button type="submit" className="btn btn-outline btn-sm">
            Buscar
          </button>
        </form>

        {veiculos.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum veículo encontrado. Seja o primeiro a{" "}
              <Link href="/eletricos/veiculos/publicar" style={{ textDecoration: "underline" }}>
                anunciar
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid grid-3">
            {veiculos.map((veiculo) => {
              const foto = [...veiculo.ev_veiculo_fotos].sort((a, b) => a.ordem - b.ordem)[0];
              return (
                <VeiculoCard
                  key={veiculo.id}
                  veiculo={{
                    id: veiculo.id,
                    marca: veiculo.marca,
                    modelo: veiculo.modelo,
                    ano: veiculo.ano,
                    km: veiculo.km,
                    preco: veiculo.preco,
                    tipoLabel: TIPO_LABEL[veiculo.tipo] ?? veiculo.tipo,
                    cidade: veiculo.cidade,
                    estado: veiculo.estado,
                    fotoUrl: foto?.arquivo_url ?? null,
                  }}
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
