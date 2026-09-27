import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

// Peças comuns aos quatro agentes do braço de elétricos (migração 0033):
// uma etapa de pesquisa com busca na web de verdade, uma etapa que
// estrutura essa pesquisa em JSON validado por schema, e o registro das
// sugestões na fila — aplicando na hora quando o agente está em modo
// autônomo.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODELO = "claude-opus-5";
// Se o modelo recusar por política, a API reexecuta o mesmo pedido num
// modelo de fallback dentro da mesma chamada, em vez de só parar.
const BETAS = ["server-side-fallback-2026-07-01"];

export type AcaoSugestao =
  | "criar_eletroposto"
  | "atualizar_eletroposto"
  | "criar_oficina"
  | "responder_post"
  | "avaliar_veiculo"
  | "criar_ponto_apoio";

export type Sugestao = {
  acao: AcaoSugestao;
  alvo_id?: string | null;
  payload: Record<string, unknown>;
  resumo: string;
  justificativa: string;
  fontes: string[];
};

export type ResultadoAgente = {
  sugestoes: number;
  aplicadas: number;
  ignoradas: number;
  erros: string[];
};

const REGRAS_GERAIS = `Você é um agente da Rede Impulso Elétricos, plataforma que conecta o mundo
dos carros elétricos no Brasil. Use SEMPRE a busca na web — nunca conhecimento estático — e cite a
URL de cada informação. Se não encontrar evidência confiável, não invente: deixe de fora. Português
do Brasil.`;

// Etapa 1: pesquisa livre com busca na web. Devolve o texto final com
// as URLs citadas. Trata pause_turn (a API pausa buscas longas e pede
// para continuar mandando o conteúdo de volta). `regras` troca o
// contexto geral — o radar do motorista usa o dele.
export async function pesquisar(
  instrucoes: string,
  pedido: string,
  regras: string = REGRAS_GERAIS,
): Promise<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: pedido }];
  const textos: string[] = [];

  for (let rodada = 0; rodada < 5; rodada++) {
    const resposta = await anthropic.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: BETAS,
      fallbacks: "default",
      output_config: { effort: "high" },
      system: `${regras}\n\n${instrucoes}`,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 15 }],
      messages,
    });

    if (resposta.stop_reason === "refusal") {
      throw new Error("O modelo recusou a pesquisa.");
    }

    for (const bloco of resposta.content) {
      if (bloco.type === "text") textos.push(bloco.text);
    }

    if (resposta.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: resposta.content });
  }

  const texto = textos.join("").trim();
  if (!texto) throw new Error("A pesquisa não retornou conteúdo.");
  return texto;
}

// Etapa 2: transforma a pesquisa em JSON no formato do schema, sem
// acrescentar nada que não esteja nela.
export async function estruturar<T>(
  instrucoes: string,
  pesquisa: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const resposta = await anthropic.beta.messages.create({
    model: MODELO,
    max_tokens: 16000,
    betas: BETAS,
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    system:
      "Você converte uma pesquisa já pronta em dados estruturados. Não invente nada: use só o " +
      "que está na pesquisa, mantendo as URLs das fontes. Se um campo não aparece na pesquisa, use null. " +
      instrucoes,
    messages: [{ role: "user", content: `Pesquisa:\n\n${pesquisa}` }],
  });

  if (resposta.stop_reason === "refusal") {
    throw new Error("O modelo recusou estruturar a pesquisa.");
  }

  const texto = resposta.content.find((bloco) => bloco.type === "text");
  if (!texto || texto.type !== "text") {
    throw new Error("Não foi possível estruturar o resultado.");
  }
  return JSON.parse(texto.text) as T;
}

// Grava as sugestões na fila e, se o agente estiver em modo autônomo,
// aplica cada uma na hora com a mesma function que o admin usa.
export async function registrarSugestoes(
  supabase: SupabaseClient,
  agenteId: string,
  autonomo: boolean,
  sugestoes: Sugestao[],
): Promise<ResultadoAgente> {
  const resultado: ResultadoAgente = { sugestoes: 0, aplicadas: 0, ignoradas: 0, erros: [] };

  for (const s of sugestoes) {
    const { data, error } = await supabase
      .from("ev_agente_sugestoes")
      .insert({
        agente_id: agenteId,
        acao: s.acao,
        alvo_id: s.alvo_id ?? null,
        payload: s.payload,
        resumo: s.resumo,
        justificativa: s.justificativa,
        // Só links http(s) — a página do admin renderiza isso como <a href>.
        fontes: s.fontes.filter((url) => /^https?:\/\//.test(url)),
      })
      .select("id")
      .single();

    if (error) {
      // 23505 = já existe uma sugestão pendente igual — não é erro.
      if (error.code === "23505") resultado.ignoradas++;
      else resultado.erros.push(error.message);
      continue;
    }
    resultado.sugestoes++;

    if (!autonomo) continue;

    const { error: erroAplicar } = await supabase.rpc("aplicar_sugestao_agente", {
      p_sugestao_id: data.id,
    });
    if (erroAplicar) {
      resultado.erros.push(erroAplicar.message);
      await supabase
        .from("ev_agente_sugestoes")
        .update({ status: "erro", erro: erroAplicar.message })
        .eq("id", data.id);
    } else {
      resultado.aplicadas++;
    }
  }

  return resultado;
}

// Alvos que já têm sugestão pendente dessa ação — o agente pula esses
// para não gastar pesquisa com algo que ainda espera o admin.
export async function alvosPendentes(supabase: SupabaseClient, acao: AcaoSugestao) {
  const { data } = await supabase
    .from("ev_agente_sugestoes")
    .select("alvo_id")
    .eq("acao", acao)
    .eq("status", "pendente");
  return new Set((data ?? []).map((s) => s.alvo_id as string));
}

// Nome normalizado para comparar "já temos esse?" sem depender de
// acento/caixa/espaços.
export function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Rodízio determinístico por dia: cada execução diária cobre um pedaço
// diferente da lista (estados, cidades), sem precisar guardar estado.
export function doDia<T>(lista: T[], quantos: number): T[] {
  const dia = Math.floor(Date.now() / 86_400_000);
  const inicio = (dia * quantos) % lista.length;
  return Array.from({ length: Math.min(quantos, lista.length) }, (_, i) => lista[(inicio + i) % lista.length]);
}

// Helpers de schema — structured outputs exige additionalProperties
// false e todas as propriedades em `required`; opcional vira nullable.
export const texto = { type: "string" };
export const textoOuNulo = { type: ["string", "null"] };
export const numeroOuNulo = { type: ["number", "null"] };
export const listaDeTexto = { type: "array", items: { type: "string" } };

export function objeto(propriedades: Record<string, unknown>) {
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(propriedades),
    properties: propriedades,
  };
}
