import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Você escreve descrições curtas de anúncio de imóvel para a Rede Impulso, uma
plataforma imobiliária brasileira. Recebe os dados estruturados que a pessoa já preencheu no
formulário e escreve um parágrafo natural, direto e convidativo em português do Brasil — 3 a 5
frases. Use só as informações fornecidas: nunca invente comodidades, distância de pontos de
interesse, estado de conservação ou qualquer detalhe que não esteja nos dados recebidos. Se faltar
informação (ex: sem comodidades listadas), não mencione o que falta — escreva com o que existe.
Responda só com o texto da descrição, sem aspas, sem título, sem comentários.`;

type Payload = {
  finalidade?: string;
  tipo?: string;
  bairro?: string;
  cidade?: string;
  quartos?: number;
  banheiros?: number;
  vagas?: number;
  areaM2?: number;
  comodidades?: string[];
  preco?: number;
};

function montarResumo(dados: Payload) {
  const linhas: string[] = [];
  if (dados.finalidade) linhas.push(`Finalidade: ${dados.finalidade}`);
  if (dados.tipo) linhas.push(`Tipo: ${dados.tipo}`);
  if (dados.bairro || dados.cidade) linhas.push(`Localização: ${dados.bairro ?? ""}, ${dados.cidade ?? ""}`);
  if (dados.quartos) linhas.push(`Quartos: ${dados.quartos}`);
  if (dados.banheiros) linhas.push(`Banheiros: ${dados.banheiros}`);
  if (dados.vagas) linhas.push(`Vagas de garagem: ${dados.vagas}`);
  if (dados.areaM2) linhas.push(`Área: ${dados.areaM2}m²`);
  if (dados.comodidades && dados.comodidades.length > 0) linhas.push(`Comodidades: ${dados.comodidades.join(", ")}`);
  if (dados.preco) linhas.push(`Preço: R$ ${dados.preco}`);
  return linhas.join("\n");
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { erro: "Geração de descrição indisponível no momento." },
      { status: 503 },
    );
  }

  const dados = (await request.json()) as Payload;
  const resumo = montarResumo(dados);

  if (!resumo) {
    return NextResponse.json(
      { erro: "Preencha ao menos tipo, localização ou quartos antes de gerar a descrição." },
      { status: 400 },
    );
  }

  const resposta = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: resumo }],
  });

  const descricao = resposta.content
    .filter((bloco) => bloco.type === "text")
    .map((bloco) => bloco.text)
    .join("\n")
    .trim();

  return NextResponse.json({ descricao });
}
