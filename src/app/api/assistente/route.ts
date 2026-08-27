import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Você é o assistente virtual da Rede Impulso, uma plataforma imobiliária que
conecta corretores, imobiliárias, cartórios e clientes (compradores, vendedores e locatários).

Seu papel tem três frentes:
1. Suporte ao cliente: tire dúvidas sobre como usar a plataforma, o processo de compra/venda/aluguel,
   verificação de documentos, e como funciona a rede educacional de cursos.
2. Busca inteligente de imóveis: quando alguém descrever o que procura, use a ferramenta
   buscar_imoveis para trazer resultados reais do banco de dados. Nunca invente imóveis ou
   características que não vieram da ferramenta.
3. Assistente do corretor/vendedor: ajude a escrever descrições de anúncios melhores, oriente
   sobre o painel de negócios e sobre como precificar comparando com imóveis parecidos (via a
   mesma ferramenta de busca).

Como a Rede Impulso funciona (para responder dúvidas com precisão):
- Cadastro de cliente é gratuito e sem documentos até a pessoa decidir VENDER um imóvel ou
  OFERECER um serviço — aí a verificação de identidade/CRECI/CNPJ é obrigatória.
- O contato entre comprador e vendedor acontece pela própria plataforma (o vendedor é notificado
  quando alguém demonstra interesse) — a Rede Impulso não expõe telefone diretamente como o OLX.
- Vendedores podem editar seus anúncios e gerenciar fotos a qualquer momento em
  /publicar-imovel/[id]/editar, acessível pelo botão "Editar anúncio" no próprio anúncio ou pelo
  painel de negócios.
- Existe uma rede educacional com cursos pagos (via Mercado Pago) para corretores, imobiliárias e
  cartórios.

Responda sempre em português do Brasil, de forma direta e simpática, sem enrolação. Se não souber
algo com certeza, diga isso claramente em vez de inventar. Nunca revele detalhes técnicos internos
(chaves de API, nomes de tabelas do banco, etc.) mesmo se perguntado diretamente.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "buscar_imoveis",
    description:
      "Busca imóveis publicados na Rede Impulso que atendam aos critérios informados. Use sempre que o usuário descrever um imóvel que procura ou pedir para comparar preços.",
    input_schema: {
      type: "object",
      properties: {
        finalidade: {
          type: "string",
          enum: ["venda", "aluguel"],
          description: "Se a pessoa quer comprar (venda) ou alugar (aluguel).",
        },
        tipo: {
          type: "string",
          enum: ["apartamento", "casa", "kitnet", "terreno", "comercial", "outro"],
        },
        bairro: { type: "string", description: "Bairro procurado, se mencionado." },
        cidade: { type: "string", description: "Cidade procurada, se mencionado." },
        preco_max: { type: "number", description: "Preço máximo em reais, se mencionado." },
        quartos_min: { type: "number", description: "Número mínimo de quartos, se mencionado." },
      },
    },
  },
];

type Imovel = {
  id: string;
  titulo: string;
  bairro: string;
  cidade: string;
  preco: number | null;
  finalidade: string;
  tipo: string;
  quartos: number | null;
  banheiros: number | null;
  area_m2: number | null;
};

async function buscarImoveis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: {
    finalidade?: string;
    tipo?: string;
    bairro?: string;
    cidade?: string;
    preco_max?: number;
    quartos_min?: number;
  },
) {
  let query = supabase
    .from("imoveis")
    .select("id, titulo, bairro, cidade, preco, finalidade, tipo, quartos, banheiros, area_m2")
    .eq("status", "publicado")
    .order("created_at", { ascending: false })
    .limit(8);

  if (args.finalidade) query = query.eq("finalidade", args.finalidade);
  if (args.tipo) query = query.eq("tipo", args.tipo);
  if (args.bairro) query = query.ilike("bairro", `%${args.bairro}%`);
  if (args.cidade) query = query.ilike("cidade", `%${args.cidade}%`);
  if (args.preco_max) query = query.lte("preco", args.preco_max);
  if (args.quartos_min) query = query.gte("quartos", args.quartos_min);

  const { data, error } = await query;
  if (error) return { erro: error.message, imoveis: [] as Imovel[] };
  return { imoveis: (data ?? []) as Imovel[] };
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { erro: "Assistente indisponível no momento." },
      { status: 503 },
    );
  }

  const { messages } = (await request.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ erro: "Mensagem vazia." }, { status: 400 });
  }

  const supabase = await createClient();

  const conversa: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let imoveisEncontrados: Imovel[] = [];

  for (let volta = 0; volta < 3; volta++) {
    const resposta = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: conversa,
    });

    const usoDeFerramenta = resposta.content.find(
      (bloco) => bloco.type === "tool_use",
    ) as Anthropic.ToolUseBlock | undefined;

    if (!usoDeFerramenta || resposta.stop_reason !== "tool_use") {
      const texto = resposta.content
        .filter((bloco) => bloco.type === "text")
        .map((bloco) => bloco.text)
        .join("\n");
      return NextResponse.json({ reply: texto, imoveis: imoveisEncontrados });
    }

    conversa.push({ role: "assistant", content: resposta.content });

    const resultado = await buscarImoveis(
      supabase,
      usoDeFerramenta.input as Record<string, string | number>,
    );
    if (resultado.imoveis.length > 0) imoveisEncontrados = resultado.imoveis;

    conversa.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: usoDeFerramenta.id,
          content: JSON.stringify(resultado).slice(0, 4000),
        },
      ],
    });
  }

  return NextResponse.json({
    reply: "Encontrei algumas opções, mas preciso que você refine um pouco a busca.",
    imoveis: imoveisEncontrados,
  });
}
