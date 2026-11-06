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
 * Converte um telefone em qualquer formatação comum pro E.164 que a API do
 * WhatsApp exige.
 *
 * Nenhum cadastro tem campo de país — quem digita o telefone de um cliente
 * estrangeiro só tem como indicar isso escrevendo o "+" e o código do país
 * na frente (ex.: "+1 212 555 0100"). Por isso: com "+" explícito, o código
 * de país é o que a pessoa escreveu, sem mexer; sem "+", assume Brasil
 * (+55) e aceita DDD+número (10-11 dígitos) ou o mesmo número já com "55"
 * na frente (12-13 dígitos — comum de quem copia do próprio WhatsApp, que
 * mostra o "+55" mesmo sem o "+").
 *
 * Antes desta função reconhecer o "+", um número estrangeiro de 10-11
 * dígitos (sem "+") virava um +55 errado em vez de ser rejeitado — pior que
 * simplesmente falhar, porque tentava mandar pra um número que não existe.
 */
export function paraE164(telefone: string): string | null {
  const temPrefixoInternacional = telefone.trim().startsWith("+");
  const digitos = telefone.replace(/\D/g, "");

  if (temPrefixoInternacional) {
    // Faixa do próprio padrão E.164: de 8 (país + número bem curto) a 15
    // dígitos no total — só uma checagem de sanidade, não valida o país.
    if (digitos.length < 8 || digitos.length > 15) return null;
    return `+${digitos}`;
  }

  let digitosBrasil = digitos;
  if (digitosBrasil.length === 12 || digitosBrasil.length === 13) {
    if (!digitosBrasil.startsWith("55")) return null;
    digitosBrasil = digitosBrasil.slice(2);
  }
  if (digitosBrasil.length < 10 || digitosBrasil.length > 11) return null;
  return `+55${digitosBrasil}`;
}

// Devolve se a mensagem realmente saiu — não derruba a ação que motivou o
// aviso (agendar, cancelar, pedir nota), que já está gravada no banco antes
// disto rodar, mas quem chamou pode usar o retorno pra avisar o corretor
// "liga pro cliente, o WhatsApp não saiu" em vez de deixar a falha muda.
async function enviarTemplateWhatsapp(
  telefone: string,
  nomeTemplate: string,
  parametros: string[],
): Promise<boolean> {
  if (!whatsappConfigurado()) return false;

  const numero = paraE164(telefone);
  if (!numero) return false;

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
      return false;
    }
    return true;
  } catch (erro) {
    console.error(`Erro ao enviar WhatsApp (${nomeTemplate}):`, erro);
    return false;
  }
}

type EnvioConfirmacao = {
  telefone: string;
  nomeDestinatario: string;
  nomeContraparte: string;
  dataFormatada: string;
  horaFormatada: string;
};

export async function enviarConfirmacaoWhatsapp(params: EnvioConfirmacao): Promise<boolean> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_CONFIRMACAO || "confirmacao_visita";
  return enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
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

export async function enviarLembreteWhatsapp(params: EnvioLembrete): Promise<boolean> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_LEMBRETE || "lembrete_visita";
  return enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
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

export async function enviarCancelamentoWhatsapp(params: EnvioCancelamento): Promise<boolean> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_CANCELAMENTO || "cancelamento_visita";
  return enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
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

export async function enviarPedidoAvaliacaoWhatsapp(params: EnvioPedidoAvaliacao): Promise<boolean> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_AVALIACAO || "pedido_avaliacao";
  return enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
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

export async function enviarResumoSemanalWhatsapp(params: EnvioResumoSemanal): Promise<boolean> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_RESUMO_SEMANAL || "resumo_semanal_corretor";
  return enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
    params.nomeCorretor,
    String(params.totalVisitas),
    String(params.confirmadas),
  ]);
}
