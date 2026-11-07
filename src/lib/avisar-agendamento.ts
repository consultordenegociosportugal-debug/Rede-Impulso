import { createClient } from "@/lib/supabase/server";
import { getResend, resendConfigurado, EMAIL_REMETENTE } from "@/lib/resend";
import { rodapeTransacionalHtml } from "@/lib/email-rodape";
import { enviarConfirmacaoWhatsapp } from "@/lib/whatsapp";
import { escaparHtml } from "@/lib/escapar-html";

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
const formatoData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeZone: "America/Sao_Paulo",
});
const formatoHora = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

// Aviso de agendamento — roda pros três jeitos de confirmar uma visita
// (cliente logado agenda sozinho, corretor cadastra um cliente avulso e
// agenda por ele, ou corretor reagenda uma visita cancelada). Manda
// e-mail (cliente + cópia pro corretor, pra Rede Impulso e, se o
// corretor estiver vinculado a uma imobiliária/construtora do catálogo,
// pro gestor dela) e WhatsApp (cliente e corretor, cada um com seu
// próprio número) — os dois lados da visita ficam sabendo.
export async function avisarAgendamento(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dados: {
    clienteNome: string;
    clienteEmail: string | null;
    clienteTelefone: string | null;
    corretorId: string;
    dataHoraIso: string;
  },
): Promise<{ precisaAvisarClienteManualmente: boolean }> {
  const [{ data: corretor }, { data: corretorPerfil }] = await Promise.all([
    supabase.from("profiles").select("nome, email, telefone").eq("id", dados.corretorId).single(),
    supabase
      .from("corretor_perfis")
      .select("organizacao:organizacao_catalogo_id(nome, email_gestor)")
      .eq("profile_id", dados.corretorId)
      .single(),
  ]);

  const organizacao = (
    corretorPerfil as unknown as {
      organizacao: { nome: string; email_gestor: string | null } | null;
    } | null
  )?.organizacao;

  const quandoIso = new Date(dados.dataHoraIso);
  const dataFormatada = formatoData.format(quandoIso);
  const horaFormatada = formatoHora.format(quandoIso);

  if (resendConfigurado()) {
    const copias = [
      corretor?.email,
      process.env.EMAIL_COPIA_REDE_IMPULSO,
      organizacao?.email_gestor,
    ].filter((e): e is string => Boolean(e));

    if (dados.clienteEmail || copias.length > 0) {
      const quando = formatoDataHora.format(quandoIso);
      const resend = getResend()!;
      try {
        await resend.emails.send({
          from: EMAIL_REMETENTE,
          to: dados.clienteEmail || copias[0],
          cc: dados.clienteEmail ? copias : copias.slice(1),
          subject: `Agendamento confirmado com ${corretor?.nome ?? "seu corretor"}`,
          html: `
            <p>Olá, ${escaparHtml(dados.clienteNome)}.</p>
            <p>Seu agendamento com <strong>${escaparHtml(corretor?.nome ?? "o corretor")}</strong>${
              organizacao ? ` (${escaparHtml(organizacao.nome)})` : ""
            } está confirmado para <strong>${quando}</strong>.</p>
            ${rodapeTransacionalHtml()}
          `,
        });
      } catch {
        // Mesmo padrão do resto do app: falha de e-mail não derruba o
        // agendamento, que já está confirmado no banco.
      }
    }
  }

  // Resultado do envio pro CLIENTE é o que importa pra quem chamou: se
  // falhar, é o corretor que precisa ligar/mandar mensagem por conta
  // própria. Sem telefone cadastrado não é falha — não tinha pra onde
  // mandar, então não vira aviso. A confirmação pro corretor é sempre
  // best-effort: ele já vê a visita no próprio painel, então uma falha
  // nela não precisa de aviso adicional na tela.
  const [whatsappCliente] = await Promise.all([
    dados.clienteTelefone
      ? enviarConfirmacaoWhatsapp({
          telefone: dados.clienteTelefone,
          nomeDestinatario: dados.clienteNome,
          nomeContraparte: corretor?.nome ?? "o corretor",
          dataFormatada,
          horaFormatada,
        })
      : Promise.resolve(true),
    corretor?.telefone
      ? enviarConfirmacaoWhatsapp({
          telefone: corretor.telefone,
          nomeDestinatario: corretor.nome ?? "Corretor",
          nomeContraparte: dados.clienteNome,
          dataFormatada,
          horaFormatada,
        })
      : Promise.resolve(true),
  ]);

  return { precisaAvisarClienteManualmente: Boolean(dados.clienteTelefone) && !whatsappCliente };
}
