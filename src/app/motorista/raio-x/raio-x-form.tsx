"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/client";
import {
  calcularRaioX,
  PREMISSAS_PADRAO,
  simularEletrico,
  type EntradaRaioX,
  type PremissasEletrico,
} from "@/lib/motorista/raio-x";

export type PerfilSalvo = {
  cidade: string | null;
  estado: string | null;
  km_por_dia: number | null;
  horas_por_dia: number | null;
  dias_por_mes: number | null;
  faturamento_mensal: number | null;
  veiculo: string | null;
  combustivel: string | null;
  consumo: number | null;
  preco_energia: number | null;
  valor_veiculo: number | null;
  parcela_ou_aluguel: number | null;
  seguro: number | null;
  manutencao: number | null;
  outros_custos: number | null;
};

export type PrecosReferencia = {
  gasolina: number | null;
  etanol: number | null;
  diesel: number | null;
  gnv: number | null;
  fonte: string | null;
};

const COMBUSTIVEIS = [
  { value: "gasolina", label: "Gasolina", unidade: "litro" },
  { value: "etanol", label: "Etanol", unidade: "litro" },
  { value: "flex", label: "Flex (gasolina)", unidade: "litro" },
  { value: "diesel", label: "Diesel", unidade: "litro" },
  { value: "gnv", label: "GNV", unidade: "m³" },
  { value: "hibrido", label: "Híbrido", unidade: "litro" },
  { value: "eletrico", label: "Elétrico", unidade: "kWh" },
];

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Campos do formulário ficam como string (o que o input devolve) e viram
// número só na hora do cálculo — assim o campo vazio continua vazio.
type Campos = Record<string, string>;

function paraTexto(v: number | string | null | undefined) {
  return v === null || v === undefined ? "" : String(v);
}

function num(v: string) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function numOuNulo(v: string) {
  return v.trim() === "" ? null : num(v);
}

function precoSugerido(combustivel: string, precos: PrecosReferencia | null) {
  if (!precos) return null;
  if (combustivel === "etanol") return precos.etanol;
  if (combustivel === "diesel") return precos.diesel;
  if (combustivel === "gnv") return precos.gnv;
  if (combustivel === "eletrico") return null;
  return precos.gasolina;
}

export function RaioXForm({
  logado,
  perfil,
  precos,
}: {
  logado: boolean;
  perfil: PerfilSalvo | null;
  precos: PrecosReferencia | null;
}) {
  const router = useRouter();
  const combustivelInicial = perfil?.combustivel ?? "flex";

  const [c, setC] = useState<Campos>({
    cidade: paraTexto(perfil?.cidade),
    estado: paraTexto(perfil?.estado),
    kmPorDia: paraTexto(perfil?.km_por_dia ?? 200),
    horasPorDia: paraTexto(perfil?.horas_por_dia ?? 10),
    diasPorMes: paraTexto(perfil?.dias_por_mes ?? 24),
    faturamentoMensal: paraTexto(perfil?.faturamento_mensal),
    veiculo: paraTexto(perfil?.veiculo),
    combustivel: combustivelInicial,
    consumo: paraTexto(perfil?.consumo ?? 11),
    precoEnergia: paraTexto(perfil?.preco_energia ?? precoSugerido(combustivelInicial, precos)),
    valorVeiculo: paraTexto(perfil?.valor_veiculo),
    parcelaOuAluguel: paraTexto(perfil?.parcela_ou_aluguel),
    seguro: paraTexto(perfil?.seguro),
    manutencao: paraTexto(perfil?.manutencao),
    outrosCustos: paraTexto(perfil?.outros_custos),
  });
  const [p, setP] = useState<Campos>({
    consumoKmKwh: String(PREMISSAS_PADRAO.consumoKmKwh),
    precoKwhCasa: String(PREMISSAS_PADRAO.precoKwhCasa),
    precoKwhRua: String(PREMISSAS_PADRAO.precoKwhRua),
    percentualCasa: String(PREMISSAS_PADRAO.percentualCasa),
    parcelaEletrico: "",
    valorEletrico: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const unidade = COMBUSTIVEIS.find((x) => x.value === c.combustivel)?.unidade ?? "litro";

  const entrada: EntradaRaioX = useMemo(
    () => ({
      kmPorDia: num(c.kmPorDia),
      horasPorDia: num(c.horasPorDia),
      diasPorMes: num(c.diasPorMes),
      faturamentoMensal: num(c.faturamentoMensal),
      combustivel: c.combustivel,
      consumo: num(c.consumo),
      precoEnergia: num(c.precoEnergia),
      valorVeiculo: numOuNulo(c.valorVeiculo),
      parcelaOuAluguel: num(c.parcelaOuAluguel),
      seguro: num(c.seguro),
      manutencao: numOuNulo(c.manutencao),
      outrosCustos: num(c.outrosCustos),
    }),
    [c],
  );

  const premissas: PremissasEletrico = useMemo(
    () => ({
      consumoKmKwh: num(p.consumoKmKwh),
      precoKwhCasa: num(p.precoKwhCasa),
      precoKwhRua: num(p.precoKwhRua),
      percentualCasa: Math.min(100, Math.max(0, num(p.percentualCasa))),
      parcelaEletrico: numOuNulo(p.parcelaEletrico),
      valorEletrico: numOuNulo(p.valorEletrico),
    }),
    [p],
  );

  const resultado = useMemo(() => calcularRaioX(entrada), [entrada]);
  const simulacao = useMemo(() => simularEletrico(entrada, premissas), [entrada, premissas]);
  const temFaturamento = entrada.faturamentoMensal > 0;
  const jaEletrico = c.combustivel === "eletrico";

  function mudar(campo: string, valor: string) {
    setC((atual) => {
      const novo = { ...atual, [campo]: valor };
      // Trocou de combustível: sugere o preço médio da semana, se tiver.
      if (campo === "combustivel") {
        const sugerido = precoSugerido(valor, precos);
        novo.precoEnergia = sugerido ? String(sugerido) : "";
        if (valor === "eletrico") novo.consumo = "6.5";
      }
      return novo;
    });
    setMensagem(null);
  }

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/entrar?depois=/motorista/raio-x");
      return;
    }

    const { error } = await supabase.from("motorista_perfis").upsert({
      id: user.id,
      cidade: c.cidade || null,
      estado: c.estado ? c.estado.toUpperCase() : null,
      km_por_dia: numOuNulo(c.kmPorDia),
      horas_por_dia: numOuNulo(c.horasPorDia),
      dias_por_mes: numOuNulo(c.diasPorMes),
      faturamento_mensal: numOuNulo(c.faturamentoMensal),
      veiculo: c.veiculo || null,
      combustivel: c.combustivel,
      consumo: numOuNulo(c.consumo),
      preco_energia: numOuNulo(c.precoEnergia),
      valor_veiculo: numOuNulo(c.valorVeiculo),
      parcela_ou_aluguel: numOuNulo(c.parcelaOuAluguel),
      seguro: numOuNulo(c.seguro),
      manutencao: numOuNulo(c.manutencao),
      outros_custos: numOuNulo(c.outrosCustos),
    });

    setSalvando(false);
    setMensagem(error ? `Erro ao salvar: ${error.message}` : "Salvo! Da próxima vez seus números já estarão aqui.");
  }

  const campo = (id: string, rotulo: string, opcoes: { dica?: string; passo?: string; opcional?: boolean } = {}) => (
    <div className="field">
      <label htmlFor={id}>
        {rotulo}
        {opcoes.opcional && (
          <span className="muted" style={{ fontWeight: 400 }}>
            {" "}
            (opcional)
          </span>
        )}
      </label>
      <input
        type="number"
        inputMode="decimal"
        id={id}
        min={0}
        step={opcoes.passo ?? "any"}
        value={c[id]}
        onChange={(e) => mudar(id, e.target.value)}
      />
      {opcoes.dica && (
        <p className="hint" style={{ margin: "4px 0 0" }}>
          {opcoes.dica}
        </p>
      )}
    </div>
  );

  const premissa = (id: string, rotulo: string) => (
    <div className="field">
      <label htmlFor={`p-${id}`}>{rotulo}</label>
      <input
        type="number"
        inputMode="decimal"
        id={`p-${id}`}
        min={0}
        step="any"
        value={p[id]}
        onChange={(e) => setP((atual) => ({ ...atual, [id]: e.target.value }))}
      />
    </div>
  );

  return (
    <>
      <Nav active="/motorista/raio-x" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <Link href="/motorista" className="hint">
          ← Radar do motorista
        </Link>
        <span className="eyebrow" style={{ display: "block", marginTop: 16 }}>
          Rede Impulso Motorista
        </span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Raio-X do lucro real</h1>
        <p className="muted mb-24">
          O app mostra quanto você faturou. Aqui você vê quanto <strong>sobrou</strong> — depois de combustível,
          carro, manutenção e desgaste. Tudo calculado no seu aparelho; só é salvo se você pedir.
        </p>

        <div className="grid grid-2" style={{ alignItems: "start", gap: 24 }}>
          {/* ---------- Entrada ---------- */}
          <div>
            <div className="card">
              <strong>Sua rotina</strong>
              <div className="grid grid-2 mt-16">
                {campo("kmPorDia", "Km rodados por dia")}
                {campo("horasPorDia", "Horas online por dia")}
                {campo("diasPorMes", "Dias trabalhados no mês", { passo: "1" })}
                {campo("faturamentoMensal", "Faturamento no mês (R$)", {
                  dica: "Somando todas as plataformas, já sem a taxa delas.",
                })}
              </div>
            </div>

            <div className="card mt-16">
              <strong>Seu carro</strong>
              <div className="field mt-16">
                <label htmlFor="veiculo">
                  Modelo{" "}
                  <span className="muted" style={{ fontWeight: 400 }}>
                    (opcional)
                  </span>
                </label>
                <input
                  type="text"
                  id="veiculo"
                  placeholder="Onix 1.0 2022"
                  value={c.veiculo}
                  onChange={(e) => mudar("veiculo", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="combustivel">Combustível</label>
                <select id="combustivel" value={c.combustivel} onChange={(e) => mudar("combustivel", e.target.value)}>
                  {COMBUSTIVEIS.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-2">
                {campo("consumo", `Consumo (km por ${unidade})`)}
                {campo("precoEnergia", `Preço por ${unidade} (R$)`, {
                  dica:
                    precos?.fonte && precoSugerido(c.combustivel, precos)
                      ? `Sugestão: média nacional da semana (${precos.fonte}).`
                      : undefined,
                })}
              </div>
              {campo("valorVeiculo", "Valor do carro hoje (R$)", {
                opcional: true,
                dica: "Pela FIPE. Serve para calcular a depreciação.",
              })}
            </div>

            <div className="card mt-16">
              <strong>Custos por mês</strong>
              <div className="grid grid-2 mt-16">
                {campo("parcelaOuAluguel", "Parcela ou aluguel (R$)")}
                {campo("seguro", "Seguro (R$)")}
                {campo("manutencao", "Manutenção (R$)", {
                  opcional: true,
                  dica: "Em branco, a gente estima pelo km rodado.",
                })}
                {campo("outrosCustos", "Outros (R$)", {
                  dica: "IPVA/12, celular, lavagem, alimentação na rua…",
                })}
              </div>
            </div>

            <div className="card mt-16">
              <strong>Onde você roda</strong>
              <div className="grid grid-2 mt-16">
                <div className="field">
                  <label htmlFor="cidade">Cidade</label>
                  <input type="text" id="cidade" value={c.cidade} onChange={(e) => mudar("cidade", e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="estado">UF</label>
                  <input
                    type="text"
                    id="estado"
                    maxLength={2}
                    value={c.estado}
                    onChange={(e) => mudar("estado", e.target.value)}
                  />
                </div>
              </div>
              <p className="hint" style={{ margin: 0 }}>
                Usamos para filtrar o Radar do motorista pela sua região.
              </p>
            </div>

            <div className="mt-16">
              <button type="button" className="btn btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando…" : logado ? "Salvar meus números" : "Entrar para salvar"}
              </button>
              {mensagem && (
                <p className="hint" style={{ margin: "8px 0 0" }}>
                  {mensagem}
                </p>
              )}
              <p className="hint" style={{ margin: "8px 0 0" }}>
                Seus números de renda são privados: só você vê.
              </p>
            </div>
          </div>

          {/* ---------- Resultado ---------- */}
          <div style={{ position: "sticky", top: 16 }}>
            <div className="card">
              <strong>Resultado do mês</strong>
              {!temFaturamento ? (
                <p className="muted" style={{ margin: "12px 0 0" }}>
                  Preencha o faturamento para ver o seu lucro real.
                </p>
              ) : (
                <>
                  <div className="grid grid-2 mt-16">
                    <div className="stat">
                      <div className="num" style={{ color: resultado.lucro < 0 ? "var(--coral)" : undefined }}>
                        {moeda(resultado.lucro)}
                      </div>
                      <div className="label">lucro real no mês</div>
                    </div>
                    <div className="stat">
                      <div className="num">{Math.round(resultado.margem * 100)}%</div>
                      <div className="label">do faturamento fica com você</div>
                    </div>
                    <div className="stat">
                      <div className="num">{moeda(resultado.lucroPorHora)}</div>
                      <div className="label">por hora online</div>
                    </div>
                    <div className="stat">
                      <div className="num">{moeda(resultado.lucroPorKm)}</div>
                      <div className="label">por km rodado</div>
                    </div>
                  </div>

                  <p className="hint" style={{ margin: "16px 0 4px" }}>
                    Cada km custa {moeda(resultado.custoPorKm)}. Corrida que paga menos que isso por km dá prejuízo.
                  </p>

                  <div className="mt-16">
                    {resultado.custos.map((custo) => (
                      <div key={custo.rotulo} className="list-row">
                        <span>
                          {custo.rotulo}
                          {custo.estimado && <span className="hint"> · estimado</span>}
                        </span>
                        <span className="mono">{moeda(custo.valor)}</span>
                      </div>
                    ))}
                    <div className="list-row">
                      <strong>Total de custos</strong>
                      <strong className="mono">{moeda(resultado.custoTotal)}</strong>
                    </div>
                  </div>
                </>
              )}
            </div>

            {temFaturamento && !jaEletrico && (
              <div className="card mt-16">
                <strong>E se o seu carro fosse elétrico?</strong>
                <p className="hint" style={{ margin: "4px 0 12px" }}>
                  Mesma rotina e mesmo faturamento, trocando só o carro.
                </p>
                <div className="stat">
                  <div
                    className="num"
                    style={{ color: simulacao.diferencaMensal < 0 ? "var(--coral)" : "var(--primary)" }}
                  >
                    {simulacao.diferencaMensal >= 0 ? "+" : ""}
                    {moeda(simulacao.diferencaMensal)}
                  </div>
                  <div className="label">
                    por mês ({simulacao.diferencaMensal >= 0 ? "a mais" : "a menos"} no seu bolso)
                  </div>
                </div>
                <p className="hint" style={{ margin: "12px 0 0" }}>
                  Energia: {moeda(simulacao.custoEnergia)}/mês no elétrico vs.{" "}
                  {moeda(resultado.custos.find((x) => x.rotulo === "Combustível / energia")?.valor ?? 0)} hoje.
                </p>

                <details className="mt-16">
                  <summary className="hint" style={{ cursor: "pointer" }}>
                    Ajustar a simulação
                  </summary>
                  <div className="grid grid-2 mt-16">
                    {premissa("parcelaEletrico", "Parcela do elétrico (R$)")}
                    {premissa("valorEletrico", "Valor do elétrico (R$)")}
                    {premissa("consumoKmKwh", "Consumo (km/kWh)")}
                    {premissa("percentualCasa", "% da recarga em casa")}
                    {premissa("precoKwhCasa", "kWh em casa (R$)")}
                    {premissa("precoKwhRua", "kWh na rua (R$)")}
                  </div>
                </details>

                <ul className="hint" style={{ margin: "12px 0 0", paddingLeft: 18 }}>
                  {simulacao.premissas.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <Link href="/eletricos/veiculos" className="btn btn-outline btn-sm mt-16">
                  Ver elétricos à venda
                </Link>
              </div>
            )}

            {temFaturamento && resultado.premissas.length > 0 && (
              <div className="card mt-16">
                <strong>Como calculamos</strong>
                <ul className="hint" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {resultado.premissas.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                  <li>Estimativa para orientar decisões — não é garantia de ganho.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
