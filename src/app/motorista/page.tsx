import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import type { ItemRadar } from "@/lib/motorista/radar";

// Radar do motorista (migração 0034): o resumo diário gerado pelo agente,
// filtrado pela UF do motorista (a do Raio-X salvo, ou a escolhida aqui).

const CATEGORIA: Record<string, { rotulo: string; icone: string }> = {
  combustivel: { rotulo: "Combustível", icone: "⛽" },
  recarga: { rotulo: "Recarga", icone: "⚡" },
  demanda: { rotulo: "Demanda", icone: "📈" },
  clima: { rotulo: "Clima", icone: "🌧️" },
  plataformas: { rotulo: "Plataformas", icone: "📱" },
  dica: { rotulo: "Dica do dia", icone: "💡" },
};

const ORDEM = ["demanda", "combustivel", "recarga", "clima", "plataformas", "dica"];

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Precos = {
  gasolina: number | null;
  etanol: number | null;
  diesel: number | null;
  gnv: number | null;
  fonte: string | null;
};

export default async function MotoristaPage({ searchParams }: { searchParams: Promise<{ uf?: string }> }) {
  const { uf: ufParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: radar }, { data: perfil }] = await Promise.all([
    supabase
      .from("motorista_radar")
      .select("data_referencia, itens, precos_referencia")
      .order("data_referencia", { ascending: false })
      .limit(1)
      .maybeSingle(),
    user
      ? supabase.from("motorista_perfis").select("estado").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const uf = (ufParam ?? perfil?.estado ?? "").toUpperCase();
  const todos = (radar?.itens ?? []) as ItemRadar[];
  const itens = todos
    .filter((item) => !uf || !item.estado || item.estado.toUpperCase() === uf)
    .sort((a, b) => ORDEM.indexOf(a.categoria) - ORDEM.indexOf(b.categoria));
  const precos = (radar?.precos_referencia ?? null) as Precos | null;
  const etanolCompensa =
    precos?.etanol && precos?.gasolina ? precos.etanol / precos.gasolina <= 0.7 : null;

  return (
    <>
      <Nav active="/motorista" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <span className="eyebrow">Rede Impulso Motorista</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Radar do motorista</h1>
        <p className="muted mb-24">
          Tudo o que muda o seu dia na rua — combustível, recarga, eventos que aumentam as corridas, clima e
          regras das plataformas — num resumo só, atualizado todo dia. Dúvida? Pergunte ao copiloto 🧭 no canto
          da tela.
        </p>

        <div className="grid grid-2" style={{ gap: 16 }}>
          <Link href="/motorista/raio-x" className="card" style={{ display: "block" }}>
            <strong>🔎 Raio-X do lucro real</strong>
            <p className="hint" style={{ margin: "6px 0 0" }}>
              Descubra quanto sobra de verdade por hora e por km — e quanto você ganharia com um elétrico.
            </p>
          </Link>
          <div className="card">
            <strong>⛽ Preço médio da semana</strong>
            {precos && (precos.gasolina || precos.etanol) ? (
              <>
                <p className="mono" style={{ margin: "6px 0 0", fontSize: 14 }}>
                  {precos.gasolina ? `Gasolina ${moeda(precos.gasolina)}` : ""}
                  {precos.etanol ? ` · Etanol ${moeda(precos.etanol)}` : ""}
                  {precos.diesel ? ` · Diesel ${moeda(precos.diesel)}` : ""}
                  {precos.gnv ? ` · GNV ${moeda(precos.gnv)}/m³` : ""}
                </p>
                <p className="hint" style={{ margin: "4px 0 0" }}>
                  {etanolCompensa === null
                    ? ""
                    : etanolCompensa
                      ? "Na média nacional, o etanol está compensando (até 70% da gasolina). "
                      : "Na média nacional, a gasolina está compensando mais que o etanol. "}
                  {precos.fonte ? `Fonte: ${precos.fonte}.` : ""}
                </p>
              </>
            ) : (
              <p className="hint" style={{ margin: "6px 0 0" }}>
                Aparece aqui assim que o primeiro radar for gerado.
              </p>
            )}
          </div>
        </div>

        <div className="flex between items-center mt-24" style={{ flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>
            {radar
              ? `Radar de ${new Date(`${radar.data_referencia}T12:00:00`).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}`
              : "Radar de hoje"}
          </h2>
          <form className="flex items-center gap-8">
            <label htmlFor="uf" className="hint" style={{ margin: 0 }}>
              Sua região
            </label>
            <select id="uf" name="uf" defaultValue={uf} style={{ width: "auto" }}>
              <option value="">Brasil todo</option>
              {UFS.map((sigla) => (
                <option key={sigla} value={sigla}>
                  {sigla}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-outline btn-sm">
              Filtrar
            </button>
          </form>
        </div>

        {itens.length === 0 ? (
          <div className="card mt-16" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              {radar ? "Nada específico para a sua região hoje." : "O primeiro radar ainda está sendo preparado."}
            </p>
          </div>
        ) : (
          <div className="mt-16" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {itens.map((item, i) => {
              const cat = CATEGORIA[item.categoria] ?? { rotulo: item.categoria, icone: "•" };
              return (
                <div key={i} className="card">
                  <div className="flex items-center gap-8" style={{ flexWrap: "wrap" }}>
                    <span className="badge badge-outline">
                      {cat.icone} {cat.rotulo}
                    </span>
                    <span className="hint" style={{ margin: 0 }}>
                      {item.cidade ? `${item.cidade}${item.estado ? `/${item.estado}` : ""}` : item.estado ?? "Brasil"}
                    </span>
                  </div>
                  <strong style={{ display: "block", marginTop: 8 }}>{item.titulo}</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.6 }}>{item.texto}</p>
                  {item.fonte && (
                    <a href={item.fonte} target="_blank" rel="noopener noreferrer" className="hint">
                      Fonte: {item.fonte.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="hint mt-24">
          Guia independente, sem vínculo com Uber, 99, inDrive ou outras plataformas. Informações geradas com
          pesquisa automática e fonte citada — confira antes de decidir. Não use o celular enquanto dirige.
        </p>
      </div>

      <Footer />
    </>
  );
}
