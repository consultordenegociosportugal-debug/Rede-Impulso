// Avisos de visita via WhatsApp (Meta Cloud API) — mesmo padrão opcional do
// resend.ts/mercadopago.ts: sem as variáveis de ambiente, whatsappConfigurado()
// devolve false e ninguém tenta enviar, nenhuma rota quebra, só deixa de mandar.
//
// Mensagem de negócio pra um número que não iniciou a conversa exige um
// "message template" pré-aprovado pela Meta (WhatsApp Manager → Modelos de
// mensagem), categoria Utilidade, idioma pt_BR, um por tipo de aviso abaixo.
// Cada corpo precisa ser criado com EXATAMENTE esse texto e esses nomes de
// variável — a ordem dos {{N}} é a ordem dos parâmetros que o código manda.
//
// confirmacao_visita (já em análise):
//   "Olá {{1}}! Sua visita com {{2}} ficou confirmada para {{3}} às {{4}}
//    pela Rede Impulso."
//   {{1}} nome de quem recebe · {{2}} nome da contraparte · {{3}} data · {{4}} hora
//
// lembrete_visita (em análise na Meta):
//   "Olá {{1}}! Lembrete: sua visita com {{2}} é hoje às {{3}}, pela Rede
//    Impulso."
//   {{1}} nome de quem recebe · {{2}} nome da contraparte · {{3}} hora
//
// cancelamento_visita (em análise na Meta):
//   "Olá {{1}}! Sua visita com {{2}}, marcada para {{3}} às {{4}}, foi
//    cancelada pela Rede Impulso."
//   {{1}} nome de quem recebe · {{2}} nome da contraparte · {{3}} data · {{4}} hora
//
// pedido_avaliacao (em análise na Meta):
//   "Olá {{1}}! Sua visita com {{2}} já aconteceu. Pode avaliar o
//    atendimento? Leva menos de um minuto: {{3}} Obrigado!"
//   {{1}} nome de quem recebe · {{2}} nome do corretor · {{3}} link da avaliação
//   (termina com "Obrigado!" porque a Meta não aceita variável como último
//   caractere do corpo do modelo)
//
// resumo_semanal_corretor (a submeter):
//   "Olá {{1}}! Aqui vai o resumo da sua semana na Rede Impulso: você tem
//    {{2}} visita(s) agendada(s), sendo {{3}} já confirmada(s) com os
//    clientes. Continue assim!"
//   {{1}} nome do corretor · {{2}} total de visitas na semana · {{3}} confirmadas

const VERSAO_GRAPH = "v21.0";

export function whatsappConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Converte um telefone brasileiro em qualquer formatação comum (com DDD,
 * com ou sem máscara) pro E.164 que a API do WhatsApp exige. Assume Brasil
 * (+55) — não há telefone de outro país coletado em nenhum cadastro hoje.
 */
export function paraE164Brasil(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 11) return null;
  return `+55${digitos}`;
}

async function enviarTemplateWhatsapp(
  telefone: string,
  nomeTemplate: string,
  parametros: string[],
): Promise<void> {
  if (!whatsappConfigurado()) return;

  const numero = paraE164Brasil(telefone);
  if (!numero) return;

  try {
    const resposta = await fetch(
      `https://graph.facebook.com/${VERSAO_GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: numero,
          type: "template",
          template: {
            name: nomeTemplate,
            language: { code: "pt_BR" },
            components: [
              {
                type: "body",
                parameters: parametros.map((texto) => ({ type: "text", text: texto })),
              },
            ],
          },
        }),
      },
    );

    if (!resposta.ok) {
      console.error(
        `Falha ao enviar WhatsApp (${nomeTemplate}):`,
        resposta.status,
        await resposta.text(),
      );
    }
  } catch (erro) {
    // A ação que motivou o aviso (agendar, cancelar, pedir nota) já está
    // gravada no banco antes desse envio rodar — uma falha aqui (template
    // não aprovado, número inválido, Meta fora do ar) nunca pode derrubar
    // a ação em si.
    console.error(`Erro ao enviar WhatsApp (${nomeTemplate}):`, erro);
  }
}

type EnvioConfirmacao = {
  telefone: string;
  nomeDestinatario: string;
  nomeContraparte: string;
  dataFormatada: string;
  horaFormatada: string;
};

export async function enviarConfirmacaoWhatsapp(params: EnvioConfirmacao): Promise<void> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_CONFIRMACAO || "confirmacao_visita";
  await enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
    params.nomeDestinatario,
    params.nomeContraparte,
    params.dataFormatada,
    params.horaFormatada,
  ]);
}

type EnvioLembrete = {
  telefone: string;
  nomeDestinatario: string;
  nomeContraparte: string;
  horaFormatada: string;
};

export async function enviarLembreteWhatsapp(params: EnvioLembrete): Promise<void> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_LEMBRETE || "lembrete_visita";
  await enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
    params.nomeDestinatario,
    params.nomeContraparte,
    params.horaFormatada,
  ]);
}

type EnvioCancelamento = {
  telefone: string;
  nomeDestinatario: string;
  nomeContraparte: string;
  dataFormatada: string;
  horaFormatada: string;
};

export async function enviarCancelamentoWhatsapp(params: EnvioCancelamento): Promise<void> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_CANCELAMENTO || "cancelamento_visita";
  await enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
    params.nomeDestinatario,
    params.nomeContraparte,
    params.dataFormatada,
    params.horaFormatada,
  ]);
}

type EnvioPedidoAvaliacao = {
  telefone: string;
  nomeDestinatario: string;
  nomeCorretor: string;
  link: string;
};

export async function enviarPedidoAvaliacaoWhatsapp(params: EnvioPedidoAvaliacao): Promise<void> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_AVALIACAO || "pedido_avaliacao";
  await enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
    params.nomeDestinatario,
    params.nomeCorretor,
    params.link,
  ]);
}

type EnvioResumoSemanal = {
  telefone: string;
  nomeCorretor: string;
  totalVisitas: number;
  confirmadas: number;
};

export async function enviarResumoSemanalWhatsapp(params: EnvioResumoSemanal): Promise<void> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_RESUMO_SEMANAL || "resumo_semanal_corretor";
  await enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
    params.nomeCorretor,
    String(params.totalVisitas),
    String(params.confirmadas),
  ]);
}
