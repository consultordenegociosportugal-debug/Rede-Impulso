/**
 * Converte um telefone em qualquer formatação comum pro E.164 que a API do
 * WhatsApp exige. Em módulo próprio (não dentro de whatsapp.ts) porque
 * também é usado em componentes client-side pra validar o campo de telefone
 * — importar de whatsapp.ts traria junto `enviarTemplateWhatsapp` e as
 * referências a `process.env.WHATSAPP_ACCESS_TOKEN`, que não tem por que
 * estar num bundle de cliente.
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
