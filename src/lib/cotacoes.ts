// Cotação de câmbio em tempo real via AwesomeAPI (economia.awesomeapi.com.br)
// — gratuita, sem chave. Usada direto aqui, nunca via busca da IA: um
// número errado de dólar/euro no ticker é o tipo de erro que ninguém
// perdoa. Falha silenciosamente (array vazio) em vez de derrubar a
// página — o ticker simplesmente mostra menos itens naquele load.

export type ManchetaCotacao = { tag: string; texto: string };

const formatoReal = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

type ParCambio = { bid: string; pctChange: string };

function formatarManchete(tag: string, par: ParCambio): ManchetaCotacao {
  const variacao = Number(par.pctChange);
  const seta = variacao > 0 ? "↑" : variacao < 0 ? "↓" : "";
  return {
    tag,
    texto: `${formatoReal.format(Number(par.bid))} ${seta} ${Math.abs(variacao).toFixed(2)}% hoje`,
  };
}

export async function buscarCotacoes(): Promise<ManchetaCotacao[]> {
  try {
    const resposta = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL", {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 300 },
    });
    if (!resposta.ok) return [];

    const dados = (await resposta.json()) as Record<string, ParCambio | undefined>;
    const manchetes: ManchetaCotacao[] = [];

    if (dados.USDBRL) manchetes.push(formatarManchete("Dólar", dados.USDBRL));
    if (dados.EURBRL) manchetes.push(formatarManchete("Euro", dados.EURBRL));

    return manchetes;
  } catch {
    return [];
  }
}
