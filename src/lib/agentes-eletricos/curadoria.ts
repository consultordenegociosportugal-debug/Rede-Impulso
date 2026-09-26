import type { SupabaseClient } from "@supabase/supabase-js";
import { alvosPendentes, estruturar, listaDeTexto, objeto, pesquisar, texto, type Sugestao } from "./comum";

// Agente de curadoria do marketplace: avalia até 8 anúncios publicados
// que nunca foram avaliados (ou cuja avaliação tem mais de 30 dias),
// comparando o preço com a FIPE e anúncios parecidos. O selo aparece no
// anúncio; "suspeito" fica só para o admin.

const SELOS = ["preco_ok", "preco_acima", "preco_abaixo", "suspeito"];

type Resultado = {
  avaliacoes: {
    veiculo_id: string;
    selo: "preco_ok" | "preco_acima" | "preco_abaixo" | "suspeito";
    nota: string;
    justificativa: string;
    fontes: string[];
  }[];
};

const SCHEMA = objeto({
  avaliacoes: {
    type: "array",
    items: objeto({
      veiculo_id: texto,
      selo: { type: "string", enum: SELOS },
      nota: {
        type: "string",
        description:
          "Uma frase curta e neutra para mostrar no anúncio, com o preço de referência e a data da fonte.",
      },
      justificativa: texto,
      fontes: listaDeTexto,
    }),
  },
});

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export async function executarCuradoria(supabase: SupabaseClient): Promise<Sugestao[]> {
  const limite = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const { data } = await supabase
    .from("ev_veiculos")
    .select("id, marca, modelo, ano, km, preco, tipo, condicao, cidade, estado, descricao")
    .eq("status", "publicado")
    .not("preco", "is", null)
    .or(`curadoria_em.is.null,curadoria_em.lt.${limite}`)
    .order("created_at", { ascending: true })
    .limit(20);

  const pendentes = await alvosPendentes(supabase, "avaliar_veiculo");
  const veiculos = (data ?? []).filter((v) => !pendentes.has(v.id)).slice(0, 8);
  if (veiculos.length === 0) return [];

  const pesquisa = await pesquisar(
    `Você faz a curadoria dos anúncios de carros elétricos e híbridos do marketplace. Para cada
anúncio, encontre o preço de referência atual (Tabela FIPE do modelo/ano e anúncios comparáveis em
Webmotors, OLX, Mobiauto) e avalie: preço dentro do mercado (até ~10% de diferença), acima ou abaixo.
Marque como suspeito só com sinais concretos de golpe (preço muito abaixo do mercado junto com
descrição incoerente, pedido de sinal antecipado, modelo/ano inexistente).`,
    `Anúncios para avaliar:

${veiculos
  .map(
    (v) =>
      `### veiculo_id ${v.id}\n${v.marca} ${v.modelo} ${v.ano} · ${v.tipo} · ${v.condicao} · ` +
      `${v.km ?? "?"} km · ${formatoMoeda.format(v.preco)} · ${v.cidade}/${v.estado}\n${v.descricao ?? ""}`,
  )
  .join("\n\n")}`,
  );

  const resultado = await estruturar<Resultado>(
    "Use o veiculo_id exato de cada anúncio. Só inclua anúncios para os quais a pesquisa achou referência de preço.",
    pesquisa,
    SCHEMA,
  );

  const porId = new Map(veiculos.map((v) => [v.id, v]));

  return resultado.avaliacoes
    .filter((a) => porId.has(a.veiculo_id) && a.fontes.length > 0)
    .map((a) => {
      const v = porId.get(a.veiculo_id)!;
      return {
        acao: "avaliar_veiculo" as const,
        alvo_id: a.veiculo_id,
        payload: { selo: a.selo, nota: a.nota },
        resumo: `${v.marca} ${v.modelo} ${v.ano} (${formatoMoeda.format(v.preco)}): ${a.selo}`,
        justificativa: a.justificativa,
        fontes: a.fontes,
      };
    });
}
