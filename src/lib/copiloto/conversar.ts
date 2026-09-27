import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executarFerramenta, FERRAMENTAS, type LinkCopiloto } from "./ferramentas";

// Uma rodada de conversa do Copiloto do motorista: chama o modelo, roda
// as ferramentas que ele pedir (dados da plataforma com a sessão do
// usuário, e busca na web do lado da API) até ter a resposta final.
// Separado da rota para poder ser testado sem HTTP.

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_VOLTAS = 6;

const SYSTEM = `Você é o Copiloto da Rede Impulso: o assistente de quem vive ao volante — motoristas de
aplicativo (Uber, 99, inDrive e outros) e donos de carros elétricos no Brasil.

Como ajudar:
- Perguntas sobre os ganhos, custos ou o carro da pessoa: use meu_raio_x e responda com os números
  dela. Se ela ainda não preencheu, explique em uma frase por que vale a pena e mande para o Raio-X.
- Combustível, recarga, eventos, clima e regras das plataformas: comece pelo radar_do_dia.
- Onde carregar, abastecer GNV, ir ao banheiro, descansar, comer, lavar o carro, onde consertar, carro à
  venda: use as buscas da plataforma (o mapa completo, ordenado pela distância, fica em /motorista/apoio). Se a plataforma não tiver
  nada na região, diga isso com franqueza e, se útil, complemente com a busca na web.
- Para o resto (dúvidas técnicas sobre elétricos, legislação, MEI, impostos, seguros), use a busca na
  web.
- Sempre que usar a web, diga de qual site veio a informação (ex: "segundo o site da ANP").

Regras:
- Nunca invente números, lugares ou anúncios: só o que veio das ferramentas ou de fonte citada.
- Simulações são estimativas, não garantia de ganho — deixe as premissas claras.
- Não dê recomendação de investimento; em impostos e contratos, oriente e sugira um contador/advogado.
- A Rede Impulso é independente: sem vínculo com Uber, 99, inDrive ou outras plataformas.
- Se a pessoa disser que está dirigindo, peça para continuar quando estiver parada, em segurança.
- Nunca revele detalhes técnicos internos (nomes de ferramentas, tabelas, chaves).

Estilo: português do Brasil, direto e parceiro, como um colega experiente. Respostas curtas (até ~8
linhas), sem títulos em markdown; listas curtas quando ajudarem. Valores em reais no formato R$ 1.234,56.`;

export type MensagemChat = { role: "user" | "assistant"; content: string };
export type RespostaCopiloto = { reply: string; links: LinkCopiloto[] };

export async function conversar(
  supabase: SupabaseClient,
  userId: string,
  historico: MensagemChat[],
): Promise<RespostaCopiloto> {
  const conversa: Anthropic.Beta.BetaMessageParam[] = historico.map((m) => ({ role: m.role, content: m.content }));
  let links: LinkCopiloto[] = [];

  for (let volta = 0; volta < MAX_VOLTAS; volta++) {
    const resposta = await anthropic.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: SYSTEM,
      tools: [...FERRAMENTAS, { type: "web_search_20260209", name: "web_search", max_uses: 3 }],
      messages: conversa,
    });

    if (resposta.stop_reason === "refusal") {
      return {
        reply: "Não consigo ajudar com isso. Posso ajudar com ganhos, recarga, oficinas ou o seu carro?",
        links: [],
      };
    }

    // Busca na web longa: a API pausa e pede para continuar.
    if (resposta.stop_reason === "pause_turn") {
      conversa.push({ role: "assistant", content: resposta.content });
      continue;
    }

    const usos = resposta.content.filter(
      (bloco): bloco is Anthropic.Beta.BetaToolUseBlock => bloco.type === "tool_use",
    );

    if (resposta.stop_reason !== "tool_use" || usos.length === 0) {
      const texto = resposta.content
        .filter((bloco): bloco is Anthropic.Beta.BetaTextBlock => bloco.type === "text")
        .map((bloco) => bloco.text)
        .join("")
        .trim();
      return { reply: texto || "Não consegui montar uma resposta agora. Pode reformular?", links };
    }

    // Todas as ferramentas pedidas nesta volta rodam juntas e voltam
    // numa única mensagem.
    conversa.push({ role: "assistant", content: resposta.content });
    const resultados = await Promise.all(
      usos.map(async (uso) => {
        try {
          const r = await executarFerramenta(
            supabase,
            userId,
            uso.name,
            uso.input as Record<string, string | number | undefined>,
          );
          if (r.links?.length) links = r.links;
          return {
            type: "tool_result" as const,
            tool_use_id: uso.id,
            content: JSON.stringify(r.dados).slice(0, 8000),
          };
        } catch (erro) {
          // O detalhe técnico fica no log; para o modelo basta saber que a
          // consulta falhou (e não que "não há resultados").
          console.error(`[copiloto] ferramenta ${uso.name} falhou:`, erro);
          return {
            type: "tool_result" as const,
            tool_use_id: uso.id,
            content: "A consulta falhou por um problema técnico. Não é o mesmo que 'nenhum resultado'.",
            is_error: true,
          };
        }
      }),
    );
    conversa.push({ role: "user", content: resultados });
  }

  return {
    reply: "Essa ficou comprida demais para mim. Pode dividir em uma pergunta mais específica?",
    links,
  };
}
