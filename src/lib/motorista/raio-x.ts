// Raio-X do lucro real do motorista de aplicativo (migração 0034).
// Cálculo puro, sem banco: roda no navegador enquanto o motorista digita.
// Toda estimativa usada aparece em `premissas` para a página mostrar —
// o motorista precisa ver de onde veio cada número.

export type EntradaRaioX = {
  kmPorDia: number;
  horasPorDia: number;
  diasPorMes: number;
  faturamentoMensal: number;
  // % que as plataformas ficam de cada corrida (0–100). 0 = o faturamento
  // informado já é o líquido, o que elas depositaram.
  taxaPlataforma: number;
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

export type ChaveCusto = "plataforma" | "energia" | "parcela" | "seguro" | "manutencao" | "depreciacao" | "outros";

// "fixo" = chega mesmo com o carro parado (parcela, seguro…).
// "variavel" = cresce com cada km rodado (energia, manutenção).
// "plataforma" = a taxa, que cresce com o faturamento e não com o km.
export type TipoCusto = "fixo" | "variavel" | "plataforma";

export type CustoLinha = {
  chave: ChaveCusto;
  rotulo: string;
  valor: number;
  estimado: boolean;
  tipo: TipoCusto;
};

export type ResultadoRaioX = {
  kmMes: number;
  horasMes: number;
  custos: CustoLinha[];
  custoTotal: number;
  lucro: number;
  lucroPorKm: number;
  lucroPorHora: number;
  custoPorKm: number;
  margem: number; // 0–1
  premissas: string[];

  // Para enxergar o custo de outros ângulos.
  custoFixo: number; // por mês
  custoVariavel: number; // por mês
  custoPlataforma: number; // por mês: a taxa que as plataformas ficam
  custoFixoPorDia: number; // o que o dia já custa antes da primeira corrida
  custoVariavelPorKm: number; // o que cada km rodado acrescenta
  // Quanto a corrida precisa pagar por km (valor bruto, antes da taxa) para
  // cobrir os custos. Com taxa, é maior que custoPorKm.
  ganhoMinimoPorKm: number;
  custoPorHora: number;
  faturamentoPorKm: number;
  faturamentoPorDia: number;
  custoPorDia: number;
  lucroPorDia: number;
  // Quantos dias de trabalho do mês só pagam os custos. null = sem dados;
  // maior que diasPorMes = nem trabalhando todos os dias cobre.
  diasParaCobrirCustos: number | null;
  // Parte dos custos que é estimativa ou desgaste (não sai do bolso hoje,
  // mas chega: oficina, venda do carro).
  custosEstimados: number;
  // Desgaste do carro que NÃO entrou na soma porque a parcela já o cobre.
  desgasteForaDaSoma: number;
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
  const desgasteMensal = depreciacaoMensal(e.valorVeiculo, taxa);
  // Quem paga parcela ou aluguel já está pagando o carro todo mês; somar a
  // depreciação por cima contaria o mesmo carro duas vezes. Nesse caso o
  // desgaste vira só um aviso. Carro quitado: o desgaste é o custo do carro.
  const temParcela = e.parcelaOuAluguel > 0;
  const depreciacao = temParcela ? 0 : desgasteMensal;

  if (e.valorVeiculo && temParcela) {
    premissas.push(
      `O carro perde cerca de ${moeda(desgasteMensal)}/mês de valor (${Math.round(taxa * 100)}% ao ano sobre ${moeda(e.valorVeiculo)}). ` +
        "Como você já paga parcela ou aluguel, isso não foi somado de novo nos custos — aparece só como aviso.",
    );
  } else if (e.valorVeiculo) {
    premissas.push(
      `Depreciação de ${Math.round(taxa * 100)}% ao ano sobre ${moeda(e.valorVeiculo)} — ` +
        "é dinheiro que você perde quando for vender o carro, mesmo sem sair do bolso hoje.",
    );
  } else if (!temParcela) {
    premissas.push(
      "Sem parcela e sem o valor do carro, o custo do carro ficou de fora — o lucro real é menor do que o mostrado.",
    );
  }

  const taxa100 = Math.min(100, Math.max(0, e.taxaPlataforma));
  const taxaDasPlataformas = (e.faturamentoMensal * taxa100) / 100;
  if (taxaDasPlataformas > 0) {
    premissas.push(
      `Taxa das plataformas de ${taxa100}% sobre ${moeda(e.faturamentoMensal)} de faturamento bruto = ` +
        `${moeda(taxaDasPlataformas)}/mês. Confira no extrato dos apps — a taxa varia por plataforma e por corrida.`,
    );
  }

  const custos: CustoLinha[] = (
    [
      { chave: "plataforma", rotulo: "Taxa das plataformas", valor: taxaDasPlataformas, estimado: false, tipo: "plataforma" },
      { chave: "energia", rotulo: "Combustível / energia", valor: custoEnergia, estimado: false, tipo: "variavel" },
      { chave: "parcela", rotulo: "Parcela ou aluguel do carro", valor: e.parcelaOuAluguel, estimado: false, tipo: "fixo" },
      { chave: "seguro", rotulo: "Seguro", valor: e.seguro, estimado: false, tipo: "fixo" },
      { chave: "manutencao", rotulo: "Manutenção", valor: manutencao, estimado: manutencaoEstimada, tipo: "variavel" },
      { chave: "depreciacao", rotulo: "Depreciação", valor: depreciacao, estimado: true, tipo: "fixo" },
      { chave: "outros", rotulo: "Outros (IPVA, celular, lavagem…)", valor: e.outrosCustos, estimado: false, tipo: "fixo" },
    ] satisfies CustoLinha[]
  ).filter((c) => c.valor > 0);

  const soma = (lista: CustoLinha[]) => lista.reduce((total, c) => total + c.valor, 0);
  const custoTotal = soma(custos);
  const custoFixo = soma(custos.filter((c) => c.tipo === "fixo"));
  const custoVariavel = soma(custos.filter((c) => c.tipo === "variavel"));
  const custoPlataforma = soma(custos.filter((c) => c.tipo === "plataforma"));
  const custosEstimados = soma(custos.filter((c) => c.estimado));
  const lucro = e.faturamentoMensal - custoTotal;

  const faturamentoPorDia = e.diasPorMes > 0 ? e.faturamentoMensal / e.diasPorMes : 0;

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

    custoFixo,
    custoVariavel,
    custoPlataforma,
    custoFixoPorDia: e.diasPorMes > 0 ? custoFixo / e.diasPorMes : 0,
    custoVariavelPorKm: kmMes > 0 ? custoVariavel / kmMes : 0,
    // Só o que não depende da taxa, dividido pelo que sobra de cada R$ 1
    // de corrida depois dela.
    ganhoMinimoPorKm: kmMes > 0 && taxa100 < 100 ? (custoTotal - custoPlataforma) / kmMes / (1 - taxa100 / 100) : 0,
    custoPorHora: horasMes > 0 ? custoTotal / horasMes : 0,
    faturamentoPorKm: kmMes > 0 ? e.faturamentoMensal / kmMes : 0,
    faturamentoPorDia,
    custoPorDia: e.diasPorMes > 0 ? custoTotal / e.diasPorMes : 0,
    lucroPorDia: e.diasPorMes > 0 ? lucro / e.diasPorMes : 0,
    diasParaCobrirCustos: faturamentoPorDia > 0 ? custoTotal / faturamentoPorDia : null,
    custosEstimados,
    desgasteForaDaSoma: temParcela ? desgasteMensal : 0,
  };
}

// "E se o carro fosse elétrico?" — mesma rotina e mesmo faturamento,
// trocando energia, manutenção, depreciação e parcela.
export function simularEletrico(e: EntradaRaioX, p: PremissasEletrico): SimulacaoEletrico {
  const atual = calcularRaioX(e);
  const precoMedioKwh = (p.precoKwhCasa * p.percentualCasa + p.precoKwhRua * (100 - p.percentualCasa)) / 100;
  const custoEnergia = p.consumoKmKwh > 0 ? (atual.kmMes / p.consumoKmKwh) * precoMedioKwh : 0;

  const manutencaoAtual = atual.custos.find((c) => c.chave === "manutencao")?.valor ?? 0;
  const manutencao = manutencaoAtual * FATOR_MANUTENCAO_ELETRICO;
  const parcela = p.parcelaEletrico ?? e.parcelaOuAluguel;
  const valor = p.valorEletrico ?? e.valorVeiculo;
  // Mesma regra do cálculo atual: com parcela, o desgaste não entra na soma.
  const depreciacao = parcela > 0 ? 0 : depreciacaoMensal(valor, DEPRECIACAO_ANUAL_ELETRICO);

  // Mesmo faturamento, mesma taxa das plataformas.
  const custoTotal =
    custoEnergia + parcela + e.seguro + manutencao + depreciacao + e.outrosCustos + atual.custoPlataforma;
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
      parcela > 0
        ? "Com parcela, o desgaste do carro não é somado de novo (a parcela já é o custo do carro)."
        : valor
          ? `Depreciação de ${Math.round(DEPRECIACAO_ANUAL_ELETRICO * 100)}% ao ano sobre ${moeda(valor)}` +
            (p.valorEletrico === null ? " (valor do seu carro atual — informe o do elétrico)." : ".")
          : "Sem parcela e sem o valor do carro, o custo do carro ficou de fora.",
    ],
  };
}
