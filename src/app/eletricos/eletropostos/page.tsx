import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { EletropostosMaisProximos } from "./mais-proximos";

type EletropostoRow = {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  conectores: string[];
  potencia_kw: number | null;
  preco_kwh: number | null;
  operadora: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "badge-primary" },
  em_manutencao: { label: "Em manutenção", className: "badge-amber" },
  inativo: { label: "Inativo", className: "badge-coral" },
};

const CONECTOR_LABEL: Record<string, string> = {
  tipo2: "Tipo 2",
  ccs2: "CCS2",
  chademo: "CHAdeMO",
  tesla: "Tesla",
  j1772: "J1772",
};

export default async function EletropostosPage({
  searchParams,
}: {
  searchParams: Promise<{ cidade?: string }>;
}) {
  const { cidade } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("ev_eletropostos")
    .select(
      "id, nome, endereco, cidade, estado, conectores, potencia_kw, preco_kwh, operadora, status, latitude, longitude",
    )
    .order("created_at", { ascending: false })
    .limit(48);

  if (cidade) query = query.ilike("cidade", `%${cidade}%`);

  const { data } = await query;
  const eletropostos = (data ?? []) as EletropostoRow[];

  return (
    <>
      <Nav active="/eletricos/eletropostos" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <span className="eyebrow">Recarga</span>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Eletropostos</h1>
            <p className="muted mb-24">Diretório de pontos de recarga, alimentado pela comunidade.</p>
          </div>
          <Link href="/eletricos/eletropostos/adicionar" className="btn btn-primary btn-sm">
            + Cadastrar eletroposto
          </Link>
        </div>

        <form method="get" className="flex gap-8 mb-24">
          <input
            type="text"
            name="cidade"
            placeholder="Buscar por cidade"
            defaultValue={cidade ?? ""}
            style={{ width: 220 }}
          />
          <button type="submit" className="btn btn-outline btn-sm">
            Buscar
          </button>
        </form>

        {eletropostos.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum eletroposto cadastrado ainda. Seja o primeiro a{" "}
              <Link href="/eletricos/eletropostos/adicionar" style={{ textDecoration: "underline" }}>
                cadastrar um
              </Link>
              .
            </p>
          </div>
        ) : cidade ? (
          <div className="grid grid-3">
            {eletropostos.map((posto) => {
              const st = STATUS_LABEL[posto.status] ?? { label: posto.status, className: "badge-outline" };
              return (
                <div key={posto.id} className="card">
                  <span className={`badge ${st.className}`}>{st.label}</span>
                  <div style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>{posto.nome}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {posto.endereco} · {posto.cidade}/{posto.estado}
                  </div>
                  {posto.operadora && (
                    <div className="hint" style={{ marginTop: 6 }}>Operadora: {posto.operadora}</div>
                  )}
                  {posto.conectores.length > 0 && (
                    <div className="flex gap-8 mt-8" style={{ flexWrap: "wrap" }}>
                      {posto.conectores.map((c) => (
                        <span key={c} className="badge badge-outline">
                          {CONECTOR_LABEL[c] ?? c}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mono mt-8" style={{ fontSize: 13.5 }}>
                    {posto.potencia_kw ? `${posto.potencia_kw} kW` : "Potência não informada"}
                    {posto.preco_kwh ? ` · R$ ${posto.preco_kwh}/kWh` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EletropostosMaisProximos postos={eletropostos} />
        )}
      </div>

      <Footer />
    </>
  );
}
