import type { ChaveCusto, CustoLinha, ResultadoRaioX } from "@/lib/motorista/raio-x";

// Formas de enxergar o custo do Raio-X (migração 0034): de cada R$ 100 para
// onde vai, o dia de trabalho, o que existe antes de rodar e o que cada km
// acrescenta. Só apresentação — os números vêm de calcularRaioX.

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const percentual = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

// Cada custo tem sua cor na barra — a legenda traz o nome e o valor, então a
// cor nunca é a única informação.
const COR_CUSTO: Record<ChaveCusto, string> = {
  plataforma: "#ff8fb1",
  energia: "#ffb020",
  parcela: "#ff6b5b",
  seguro: "#7aa2ff",
  manutencao: "#b58cff",
  depreciacao: "#8891a8",
  outros: "#5ad1c1",
};
const COR_LUCRO = "var(--primary)";

function Bolinha({ cor }: { cor: string }) {
  return (
    <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: cor, display: "inline-block" }} />
  );
}

// "De cada R$ 100, quanto vai pra onde": o número que o motorista guarda.
export function ResumoDeCusto({ resultado, faturamento }: { resultado: ResultadoRaioX; faturamento: number }) {
  const prejuizo = resultado.lucro < 0;
  const custoPor100 = Math.round((resultado.custoTotal / faturamento) * 100);
  // A barra cobre o maior entre o que entra e o que sai: se o custo passa do
  // faturamento, ela inteira é custo.
  const base = Math.max(faturamento, resultado.custoTotal);
  const segmentos = [
    ...resultado.custos.map((c) => ({
      chave: c.chave as string,
      rotulo: c.rotulo,
      valor: c.valor,
      cor: COR_CUSTO[c.chave],
    })),
    ...(resultado.lucro > 0
      ? [{ chave: "lucro", rotulo: "Sobra pra você", valor: resultado.lucro, cor: COR_LUCRO }]
      : []),
  ];

  return (
    <div className="mt-16">
      <p style={{ fontSize: 16, margin: 0, lineHeight: 1.4 }}>
        {prejuizo ? (
          <>
            Para cada <strong>R$ 100</strong> que entram, você gasta{" "}
            <strong style={{ color: "var(--coral)" }}>R$ {custoPor100}</strong>. No fim do mês{" "}
            <strong style={{ color: "var(--coral)" }}>faltam {moeda(-resultado.lucro)}</strong>.
          </>
        ) : (
          <>
            De cada <strong>R$ 100</strong> que entram,{" "}
            <strong style={{ color: "var(--coral)" }}>R$ {custoPor100}</strong> vão para custos e{" "}
            <strong style={{ color: "var(--primary)" }}>R$ {100 - custoPor100}</strong> sobram.
          </>
        )}
      </p>
      <div
        role="img"
        aria-label={`Para onde vai o faturamento: ${segmentos
          .map((s) => `${s.rotulo} ${percentual(s.valor, faturamento)}%`)
          .join(", ")}`}
        style={{
          display: "flex",
          height: 14,
          borderRadius: 7,
          overflow: "hidden",
          background: "var(--surface-2)",
          marginTop: 12,
        }}
      >
        {segmentos.map((s) => (
          <div
            key={s.chave}
            title={`${s.rotulo}: ${moeda(s.valor)}`}
            style={{ width: `${(s.valor / base) * 100}%`, background: s.cor }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10 }}>
        {segmentos.map((s) => (
          <span key={s.chave} className="hint" style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Bolinha cor={s.cor} />
            {s.rotulo} · {percentual(s.valor, faturamento)}%
          </span>
        ))}
      </div>
    </div>
  );
}

// O mês em escala de um dia, o custo que existe antes de rodar e o que cada
// km acrescenta — mais fácil de sentir do que um total mensal.
export function PercepcaoDoDia({ resultado, diasPorMes }: { resultado: ResultadoRaioX; diasPorMes: number }) {
  const dias = resultado.diasParaCobrirCustos;
  const diasQuePagamContas = dias === null ? null : Math.ceil(dias);

  let linhaDeVirada: string | null = null;
  if (dias !== null && diasQuePagamContas !== null && diasPorMes > 0) {
    if (dias > diasPorMes) {
      linhaDeVirada = `Nem trabalhando os ${diasPorMes} dias o faturamento cobre os custos.`;
    } else if (diasQuePagamContas >= diasPorMes) {
      linhaDeVirada = "O mês inteiro de trabalho mal cobre os custos — quase nada sobra.";
    } else {
      linhaDeVirada =
        `Os primeiros ${diasQuePagamContas} dias trabalhados do mês (de ${diasPorMes}) só pagam as contas. ` +
        `O lucro começa no dia ${diasQuePagamContas + 1}.`;
    }
  }

  const partesVariaveis = resultado.custos.filter((c) => c.tipo === "variavel").map((c) => c.rotulo.toLowerCase());

  return (
    <div className="mt-24">
      <strong style={{ fontSize: 14 }}>Um dia de trabalho</strong>
      <div className="grid grid-3 mt-8">
        <div className="stat">
          <div className="num">{moeda(resultado.faturamentoPorDia)}</div>
          <div className="label">entra</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: "var(--coral)" }}>
            {moeda(resultado.custoPorDia)}
          </div>
          <div className="label">custa</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: resultado.lucroPorDia < 0 ? "var(--coral)" : "var(--primary)" }}>
            {moeda(resultado.lucroPorDia)}
          </div>
          <div className="label">sobra</div>
        </div>
      </div>

      <ul className="hint" style={{ margin: "12px 0 0", paddingLeft: 18 }}>
        <li>
          <strong>Custos fixos: {moeda(resultado.custoFixoPorDia)} por dia</strong> ({moeda(resultado.custoFixo)}/mês). O
          dia já começa devendo isso, antes da primeira corrida.
        </li>
        <li>
          <strong>Cada km rodado custa mais {moeda(resultado.custoVariavelPorKm)}</strong>
          {partesVariaveis.length > 0 && ` (${partesVariaveis.join(" + ")})`}.
        </li>
        <li>
          Você fatura {moeda(resultado.faturamentoPorKm)} por km.{" "}
          {resultado.custoPlataforma > 0 ? (
            <>
              Para não ter prejuízo, a corrida precisa pagar pelo menos{" "}
              <strong>{moeda(resultado.ganhoMinimoPorKm)} por km</strong> (valor bruto, antes da taxa da plataforma).
            </>
          ) : (
            <>
              Cada km custa {moeda(resultado.custoPorKm)} no total: corrida que paga menos que isso por km dá prejuízo.
            </>
          )}
        </li>
        {linhaDeVirada && <li>{linhaDeVirada}</li>}
        {resultado.custosEstimados > 0 && resultado.custoTotal > 0 && (
          <li>
            {percentual(resultado.custosEstimados, resultado.custoTotal)}% dos custos ({moeda(resultado.custosEstimados)})
            são estimativa ou desgaste: não saem do bolso hoje, mas chegam na oficina ou na hora de vender o carro.
          </li>
        )}
      </ul>
    </div>
  );
}

function LinhaDeCusto({ custo, faturamento }: { custo: CustoLinha; faturamento: number }) {
  return (
    <div className="list-row">
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Bolinha cor={COR_CUSTO[custo.chave]} />
        <span>
          {custo.rotulo}
          {custo.estimado && <span className="hint"> · estimado</span>}
        </span>
      </span>
      <span className="mono">
        {moeda(custo.valor)} <span className="hint">({percentual(custo.valor, faturamento)}%)</span>
      </span>
    </div>
  );
}

export function ListaDeCustos({ resultado, faturamento }: { resultado: ResultadoRaioX; faturamento: number }) {
  const grupo = (tipo: "fixo" | "variavel" | "plataforma", titulo: string, dica: string, subtotal: number) => {
    const linhas = resultado.custos.filter((c) => c.tipo === tipo);
    if (linhas.length === 0) return null;
    return (
      <div className="mt-16">
        <div className="flex between items-center">
          <strong style={{ fontSize: 13.5 }}>{titulo}</strong>
          <span className="mono">{moeda(subtotal)}</span>
        </div>
        <div className="hint" style={{ margin: "0 0 4px" }}>
          {dica}
        </div>
        {linhas.map((custo) => (
          <LinhaDeCusto key={custo.chave} custo={custo} faturamento={faturamento} />
        ))}
      </div>
    );
  };

  return (
    <div className="mt-24">
      <strong style={{ fontSize: 14 }}>Para onde vai o dinheiro</strong>
      {grupo("plataforma", "Antes de chegar a você", "As plataformas descontam isso de cada corrida.", resultado.custoPlataforma)}
      {grupo("fixo", "Custos fixos", "Chegam mesmo com o carro parado.", resultado.custoFixo)}
      {grupo("variavel", "Custos de rodar", "Crescem a cada km.", resultado.custoVariavel)}
      <div className="list-row mt-16">
        <strong>Total de custos</strong>
        <strong className="mono">{moeda(resultado.custoTotal)}</strong>
      </div>
      {resultado.desgasteForaDaSoma > 0 && (
        <p className="hint" style={{ margin: "8px 0 0" }}>
          Aviso: seu carro perde cerca de {moeda(resultado.desgasteForaDaSoma)}/mês de valor. Não foi somado acima porque
          a parcela ou o aluguel já é o custo do carro.
        </p>
      )}
    </div>
  );
}
