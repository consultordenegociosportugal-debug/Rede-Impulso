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
// confirmacao_visita (aprovado de novo em 2026-11-19 — editado em
// 2026-11-17 pra corrigir espaço faltando antes de cada variável,
// tipo "OláAna!", e ficou PENDING um dia inteiro sem nenhuma versão
// aprovada em paralelo: editar um template aprovado nesta conta
// substitui ele por completo, não existe "o antigo continua valendo
// até aprovar". Não repetir esse susto sem avisar antes.):
//   "Olá {{1}}! Passamos aqui para confirmar que sua visita com {{2}}
//    está confirmada para o dia {{3}}, às {{4}}. Qualquer alteração, é
//    só nos avisar por aqui mesmo. Até breve, equipe Rede Impulso!"
//   {{1}} nome de quem recebe · {{2}} nome da contraparte · {{3}} data · {{4}} hora
//
// lembrete_visita (aprovado de novo em 2026-11-19, ver nota acima;
// mesma correção de espaçamento + ganhou dois botões de resposta
// rápida — "Confirmar presença" e "Preciso reagendar" — pra base da
// confirmação interativa):
//   "Olá {{1}}! Passando aqui para lembrar que sua visita com {{2}} é
//    hoje às {{3}}. Contamos com você! Equipe Rede Impulso."
//   {{1}} nome de quem recebe · {{2}} nome da contraparte · {{3}} hora
//   A resposta a um desses botões chega no webhook (src/app/api/
//   webhooks/whatsapp/route.ts), casada com a visita via
//   lembrete_whatsapp_message_id (migração 0095).
//
// cancelamento_visita (aprovado de novo em 2026-11-19, ver nota
// acima; mesma correção de espaçamento):
//   "Olá {{1}}! Passando para avisar que sua visita com {{2}}, marcada
//    para {{3}} às {{4}}, foi cancelada. Qualquer dúvida, é só nos
//    chamar. Equipe Rede Impulso."
//   {{1}} nome de quem recebe · {{2}} nome da contraparte · {{3}} data · {{4}} hora
//
// pedido_avaliacao (aprovado de novo em 2026-11-19, ver nota acima;
// mesma correção de espaçamento):
//   "Olá {{1}}! Sua visita com {{2}} já aconteceu. Pode avaliar o
//    atendimento? Leva menos de um minuto: {{3}} Obrigado!"
//   {{1}} nome de quem recebe · {{2}} nome do corretor · {{3}} link da avaliação
//   (termina com "Obrigado!" porque a Meta não aceita variável como último
//   caractere do corpo do modelo)
//
// resumo_semanal_corretor (aprovado):
//   "Olá {{1}}! Aqui vai o resumo da sua semana na Rede Impulso: você tem
//    {{2}} visita(s) agendada(s), sendo {{3}} já confirmada(s) com os
//    clientes. Continue assim!"
//   {{1}} nome do corretor · {{2}} total de visitas na semana · {{3}} confirmadas
//
// Os três abaixo (migração 0089, aprovação de vínculo corretor↔organização)
// foram submetidos em 2026-11-17 e aprovados em 2026-11-18 — ficam
// prontos no código, mas enviarTemplateWhatsapp() nunca derruba nada: sem o
// template aprovado a Meta só devolve erro, logado e ignorado — a
// aprovação/recusa já foi gravada no banco antes de tentar mandar o aviso.
//
// solicitacao_vinculo_pendente (aprovado):
//   "Olá {{1}}! {{2}} pediu {{3}} na {{4}}, pela Rede Impulso. Acesse seu
//    painel para aprovar ou recusar."
//   {{1}} nome do gestor · {{2}} nome do corretor ·
//   {{3}} "para se vincular" ou "para virar gestor também" ·
//   {{4}} nome da organização
//
// resposta_vinculo_organizacao (aprovado):
//   "Olá {{1}}! Seu pedido de vínculo com a {{2}} foi {{3}} na Rede
//    Impulso."
//   {{1}} nome do corretor · {{2}} nome da organização ·
//   {{3}} "aprovado" ou "recusado"
//
// resposta_pedido_gestor (aprovado):
//   "Olá {{1}}! Seu pedido para virar gestor da {{2}} foi {{3}} na Rede
//    Impulso."
//   {{1}} nome do corretor · {{2}} nome da organização ·
//   {{3}} "aprovado" ou "recusado"
//
// aviso_novidade (migração nenhuma, submetido direto pela Graph API
// em 2026-11-19 — categoria MARKETING, não Utilidade como os outros:
// não é sobre uma visita de ninguém, é aviso de funcionalidade nova
// do produto. Pensado pra ser reaproveitado em futuros lançamentos,
// não só o das notas. Enviado manualmente hoje (não tem rota nem
// botão no app ainda — é usado direto via enviarAvisoNovidadeWhatsapp,
// chamado de um script quando o usuário pede pra avisar os
// corretores de alguma coisa nova):
//   "Olá {{1}}! Tem novidade no seu painel Rede Impulso: {{2}} Dá uma
//    olhada quando puder!"
//   {{1}} nome do corretor · {{2}} descrição curta da novidade

import { paraE164 } from "@/lib/telefone";

const VERSAO_GRAPH = "v21.0";

export function whatsappConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

// Devolve se a mensagem realmente saiu — não derruba a ação que motivou o
// aviso (agendar, cancelar, pedir nota), que já está gravada no banco antes
// disto rodar, mas quem chamou pode usar o retorno pra avisar o corretor
// "liga pro cliente, o WhatsApp não saiu" em vez de deixar a falha muda.
type EnvioTemplateResultado = { enviado: boolean; messageId: string | null };

async function enviarTemplateWhatsapp(
  telefone: string,
  nomeTemplate: string,
  parametros: string[],
): Promise<EnvioTemplateResultado> {
  if (!whatsappConfigurado()) return { enviado: false, messageId: null };

  const numero = paraE164(telefone);
  if (!numero) return { enviado: false, messageId: null };

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
      return { enviado: false, messageId: null };
    }
    const corpo = (await resposta.json()) as { messages?: { id?: string }[] };
    return { enviado: true, messageId: corpo.messages?.[0]?.id ?? null };
  } catch (erro) {
    console.error(`Erro ao enviar WhatsApp (${nomeTemplate}):`, erro);
    return { enviado: false, messageId: null };
  }
}

// Resposta de SESSÃO (texto livre, sem template) — só é permitida pela
// Meta dentro de 24h da última mensagem recebida DO cliente, o que é
// exatamente o caso aqui: isto só roda de dentro do webhook, respondendo
// a uma mensagem que acabou de chegar.
export async function enviarTextoLivreWhatsapp(telefone: string, texto: string): Promise<boolean> {
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
          type: "text",
          text: { body: texto },
        }),
      },
    );
    if (!resposta.ok) {
      console.error("Falha ao enviar texto livre WhatsApp:", resposta.status, await resposta.text());
      return false;
    }
    return true;
  } catch (erro) {
    console.error("Erro ao enviar texto livre WhatsApp:", erro);
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
  const { enviado } = await enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
    params.nomeDestinatario,
    params.nomeContraparte,
    params.dataFormatada,
    params.horaFormatada,
  ]);
  return enviado;
}

type EnvioLembrete = {
  telefone: string;
  nomeDestinatario: string;
  nomeContraparte: string;
  horaFormatada: string;
};

// Diferente dos outros envios: quem chama precisa do messageId pra
// gravar em visitas.lembrete_whatsapp_message_id — é com ele que o
// webhook (src/app/api/webhooks/whatsapp/route.ts) acha a visita certa
// quando o cliente aperta "Confirmar presença"/"Preciso reagendar".
export async function enviarLembreteWhatsapp(
  params: EnvioLembrete,
): Promise<{ enviado: boolean; messageId: string | null }> {
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
  const { enviado } = await enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
    params.nomeDestinatario,
    params.nomeContraparte,
    params.dataFormatada,
    params.horaFormatada,
  ]);
  return enviado;
}

type EnvioPedidoAvaliacao = {
  telefone: string;
  nomeDestinatario: string;
  nomeCorretor: string;
  link: string;
};

export async function enviarPedidoAvaliacaoWhatsapp(params: EnvioPedidoAvaliacao): Promise<boolean> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_AVALIACAO || "pedido_avaliacao";
  const { enviado } = await enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
    params.nomeDestinatario,
    params.nomeCorretor,
    params.link,
  ]);
  return enviado;
}

type EnvioResumoSemanal = {
  telefone: string;
  nomeCorretor: string;
  totalVisitas: number;
  confirmadas: number;
};

export async function enviarResumoSemanalWhatsapp(params: EnvioResumoSemanal): Promise<boolean> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_RESUMO_SEMANAL || "resumo_semanal_corretor";
  const { enviado } = await enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
    params.nomeCorretor,
    String(params.totalVisitas),
    String(params.confirmadas),
  ]);
  return enviado;
}

type EnvioSolicitacaoVinculoPendente = {
  telefone: string;
  nomeGestor: string;
  nomeCorretor: string;
  tipo: "corretor" | "gestor";
  nomeOrganizacao: string;
};

export async function enviarSolicitacaoVinculoPendenteWhatsapp(
  params: EnvioSolicitacaoVinculoPendente,
): Promise<boolean> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_SOLICITACAO_VINCULO || "solicitacao_vinculo_pendente";
  const { enviado } = await enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
    params.nomeGestor,
    params.nomeCorretor,
    params.tipo === "gestor" ? "para virar gestor também" : "para se vincular",
    params.nomeOrganizacao,
  ]);
  return enviado;
}

type EnvioRespostaVinculo = {
  telefone: string;
  nomeCorretor: string;
  nomeOrganizacao: string;
  tipo: "corretor" | "gestor";
  aprovado: boolean;
};

export async function enviarRespostaVinculoWhatsapp(params: EnvioRespostaVinculo): Promise<boolean> {
  const status = params.aprovado ? "aprovado" : "recusado";
  if (params.tipo === "gestor") {
    const nomeTemplate = process.env.WHATSAPP_TEMPLATE_RESPOSTA_GESTOR || "resposta_pedido_gestor";
    const { enviado } = await enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
      params.nomeCorretor,
      params.nomeOrganizacao,
      status,
    ]);
    return enviado;
  }
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_RESPOSTA_VINCULO || "resposta_vinculo_organizacao";
  const { enviado } = await enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
    params.nomeCorretor,
    params.nomeOrganizacao,
    status,
  ]);
  return enviado;
}

type EnvioAvisoNovidade = {
  telefone: string;
  nomeCorretor: string;
  descricaoNovidade: string;
};

// Uso manual (script/console), não tem rota nem botão no app — pra
// quando o usuário pede pra avisar os corretores de alguma coisa nova
// que lançou. Categoria MARKETING na Meta (ver comentário acima),
// diferente dos outros templates: pede aprovação própria, só funciona
// depois que aviso_novidade sair de PENDING.
export async function enviarAvisoNovidadeWhatsapp(params: EnvioAvisoNovidade): Promise<boolean> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_AVISO_NOVIDADE || "aviso_novidade";
  const { enviado } = await enviarTemplateWhatsapp(params.telefone, nomeTemplate, [
    params.nomeCorretor,
    params.descricaoNovidade,
  ]);
  return enviado;
}

type EnvioMensagemClienteParaCorretor = {
  telefoneCorretor: string;
  nomeCorretor: string;
  nomeCliente: string;
  textoCliente: string;
};

// Encaminha pro WhatsApp do próprio corretor uma mensagem de texto que
// um cliente mandou (ver processarMensagemTexto no webhook) — além do
// push e do card em /painel-negocios, porque WhatsApp é o canal
// prioritário do produto (não o push, que depende do corretor ter
// ativado e do navegador/SO dele cooperar). Reaproveita aviso_novidade
// (MARKETING, já aprovado) por não existir ainda um template dedicado
// pra isso — o corpo genérico cabe bem aqui.
export async function enviarMensagemClienteParaCorretorWhatsapp(
  params: EnvioMensagemClienteParaCorretor,
): Promise<boolean> {
  const nomeTemplate = process.env.WHATSAPP_TEMPLATE_AVISO_NOVIDADE || "aviso_novidade";
  const textoTruncado =
    params.textoCliente.length > 300 ? `${params.textoCliente.slice(0, 300)}…` : params.textoCliente;
  const { enviado } = await enviarTemplateWhatsapp(params.telefoneCorretor, nomeTemplate, [
    params.nomeCorretor,
    `${params.nomeCliente} mandou uma mensagem: "${textoTruncado}"`,
  ]);
  return enviado;
}
