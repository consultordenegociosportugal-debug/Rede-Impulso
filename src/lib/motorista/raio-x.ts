// Raio-X do lucro real do motorista de aplicativo (migração 0034).
// Cálculo puro, sem banco: roda no navegador enquanto o motorista digita.
// Toda estimativa usada aparece em `premissas` para a página mostrar —
// o motorista precisa ver de onde veio cada número.

export type EntradaRaioX = {
  kmPorDia: number;
  horasPorDia: number;
  diasPorMes: number;
  faturamentoMensal: number;
  combustivel: string;
  consumo: number; // km por litro / m³ / kWh
  precoEnergia: number; // R$ por litro / m³ / kWh
  valorVeiculo: number | null;
  parcelaOuAluguel: number;
  seguro: number;
  manutencao: number | null; // null = estimar por km
  outrosCustos: number;
};

export type PremissasEletrico = {
  consumoKmKwh: number;
  precoKwhCasa: number;
  precoKwhRua: number;
  percentualCasa: number; // 0–100
  // null = mesmos da situação atual, para a comparação isolar só o que
  // muda de fato (energia e manutenção) em vez de "carro de graça".
  parcelaEletrico: number | null;
  valorEletrico: number | null;
};

// Valores de referência — editáveis na página. Revisar quando o radar
// trouxer dado melhor.
export const PREMISSAS_PADRAO: PremissasEletrico = {
  consumoKmKwh: 6.5, // compacto elétrico em uso urbano
  precoKwhCasa: 0.95, // tarifa residencial média com impostos
  precoKwhRua: 2.2, // recarga rápida (DC) pública
  percentualCasa: 70,
  parcelaEletrico: null,
  valorEletrico: null,
};

const MANUTENCAO_POR_KM_COMBUSTAO = 0.12; // óleo, filtros, pastilhas, pneus
const FATOR_MANUTENCAO_ELETRICO = 0.5; // sem óleo/embreagem/escape; freio dura mais
const DEPRECIACAO_ANUAL_COMBUSTAO = 0.12;
const DEPRECIACAO_ANUAL_ELETRICO = 0.15; // usado elétrico ainda desvaloriza mais no Brasil

export type ResultadoRaioX = {
  kmMes: number;
  horasMes: number;
  custos: { rotulo: string; valor: number; estimado: boolean }[];
  custoTotal: number;
  lucro: number;
  lucroPorKm: number;
  lucroPorHora: number;
  custoPorKm: number;
  margem: number; // 0–1
  premissas: string[];
};

export type SimulacaoEletrico = {
  custoEnergia: number;
  custoTotal: number;
  lucro: number;
  diferencaMensal: number;
  premissas: string[];
};

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function depreciacaoMensal(valor: number | null, taxaAnual: number) {
  return valor ? (valor * taxaAnual) / 12 : 0;
}

export function calcularRaioX(e: EntradaRaioX): ResultadoRaioX {
  const kmMes = e.kmPorDia * e.diasPorMes;
  const horasMes = e.horasPorDia * e.diasPorMes;
  const eletrico = e.combustivel === "eletrico";
  const premissas: string[] = [];

  const custoEnergia = e.consumo > 0 ? (kmMes / e.consumo) * e.precoEnergia : 0;

  const manutencaoEstimada = e.manutencao === null;
  const manutencao = manutencaoEstimada
    ? kmMes * MANUTENCAO_POR_KM_COMBUSTAO * (eletrico ? FATOR_MANUTENCAO_ELETRICO : 1)
    : e.manutencao!;
  if (manutencaoEstimada) {
    premissas.push(
      `Manutenção estimada em ${moeda(MANUTENCAO_POR_KM_COMBUSTAO * (eletrico ? FATOR_MANUTENCAO_ELETRICO : 1))}/km ` +
        "(óleo, filtros, freios, pneus). Informe o seu gasto real para ficar exato.",
    );
  }

  const taxa = eletrico ? DEPRECIACAO_ANUAL_ELETRICO : DEPRECIACAO_ANUAL_COMBUSTAO;
  const depreciacao = depreciacaoMensal(e.valorVeiculo, taxa);
  if (e.valorVeiculo) {
    premissas.push(
      `Depreciação de ${Math.round(taxa * 100)}% ao ano sobre ${moeda(e.valorVeiculo)} — ` +
        "é dinheiro que você perde quando for vender o carro, mesmo sem sair do bolso hoje.",
    );
  } else {
    premissas.push("Sem o valor do carro, a depreciação ficou de fora — o lucro real é menor do que o mostrado.");
  }

  const custos = [
    { rotulo: "Combustível / energia", valor: custoEnergia, estimado: false },
    { rotulo: "Parcela ou aluguel do carro", valor: e.parcelaOuAluguel, estimado: false },
    { rotulo: "Seguro", valor: e.seguro, estimado: false },
    { rotulo: "Manutenção", valor: manutencao, estimado: manutencaoEstimada },
    { rotulo: "Depreciação", valor: depreciacao, estimado: true },
    { rotulo: "Outros (IPVA, celular, lavagem…)", valor: e.outrosCustos, estimado: false },
  ].filter((c) => c.valor > 0);

  const custoTotal = custos.reduce((soma, c) => soma + c.valor, 0);
  const lucro = e.faturamentoMensal - custoTotal;

  return {
    kmMes,
    horasMes,
    custos,
    custoTotal,
    lucro,
    lucroPorKm: kmMes > 0 ? lucro / kmMes : 0,
    lucroPorHora: horasMes > 0 ? lucro / horasMes : 0,
    custoPorKm: kmMes > 0 ? custoTotal / kmMes : 0,
    margem: e.faturamentoMensal > 0 ? lucro / e.faturamentoMensal : 0,
    premissas,
  };
}

// "E se o carro fosse elétrico?" — mesma rotina e mesmo faturamento,
// trocando energia, manutenção, depreciação e parcela.
export function simularEletrico(e: EntradaRaioX, p: PremissasEletrico): SimulacaoEletrico {
  const atual = calcularRaioX(e);
  const precoMedioKwh = (p.precoKwhCasa * p.percentualCasa + p.precoKwhRua * (100 - p.percentualCasa)) / 100;
  const custoEnergia = p.consumoKmKwh > 0 ? (atual.kmMes / p.consumoKmKwh) * precoMedioKwh : 0;

  const manutencaoAtual = atual.custos.find((c) => c.rotulo === "Manutenção")?.valor ?? 0;
  const manutencao = manutencaoAtual * FATOR_MANUTENCAO_ELETRICO;
  const parcela = p.parcelaEletrico ?? e.parcelaOuAluguel;
  const valor = p.valorEletrico ?? e.valorVeiculo;
  const depreciacao = depreciacaoMensal(valor, DEPRECIACAO_ANUAL_ELETRICO);

  const custoTotal = custoEnergia + parcela + e.seguro + manutencao + depreciacao + e.outrosCustos;
  const lucro = e.faturamentoMensal - custoTotal;

  return {
    custoEnergia,
    custoTotal,
    lucro,
    diferencaMensal: lucro - atual.lucro,
    premissas: [
      `Consumo de ${p.consumoKmKwh} km/kWh; ${p.percentualCasa}% da recarga em casa a ${moeda(p.precoKwhCasa)}/kWh ` +
        `e o resto na rua a ${moeda(p.precoKwhRua)}/kWh (média ${moeda(precoMedioKwh)}/kWh).`,
      `Manutenção ${Math.round(FATOR_MANUTENCAO_ELETRICO * 100)}% da atual (sem óleo, embreagem nem escapamento).`,
      "Seguro e outros custos iguais aos de hoje — confira a cotação do seguro do elétrico, costuma ser mais caro.",
      p.parcelaEletrico === null
        ? "Parcela igual à de hoje — informe a parcela real do elétrico em \"Ajustar a simulação\"; ela costuma ser maior."
        : `Parcela do elétrico: ${moeda(p.parcelaEletrico)}.`,
      valor
        ? `Depreciação de ${Math.round(DEPRECIACAO_ANUAL_ELETRICO * 100)}% ao ano sobre ${moeda(valor)}` +
          (p.valorEletrico === null ? " (valor do seu carro atual — informe o do elétrico)." : ".")
        : "Sem o valor do carro, a depreciação ficou de fora.",
    ],
  };
}
