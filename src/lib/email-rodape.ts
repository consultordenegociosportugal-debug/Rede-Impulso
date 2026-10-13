// Identificação legal da empresa em e-mail (CDC — transparência de
// quem está cobrando/contatando) e link de descadastro em e-mail de
// MARKETING especificamente (LGPD + CDC). EMPRESA_CNPJ e
// EMPRESA_ENDERECO vêm de env var — ainda não configurados nesta
// instalação (ver .env.local). Sem eles o rodapé sai incompleto, mas
// o e-mail ainda é enviado: preencher antes de qualquer campanha real.

function linhaIdentidade(): string[] {
  const linhas = ["Rede Impulso"];
  if (process.env.EMPRESA_CNPJ) linhas.push(`CNPJ ${process.env.EMPRESA_CNPJ}`);
  if (process.env.EMPRESA_ENDERECO) linhas.push(process.env.EMPRESA_ENDERECO);
  return linhas;
}

// Para e-mail TRANSACIONAL (confirmação, aviso de cobrança, recibo…) —
// identifica a empresa, sem link de descadastro: não faz sentido deixar
// alguém "descadastrar" um aviso de que a própria assinatura dele vai
// ser cobrada.
export function rodapeTransacionalHtml(): string {
  return `<p style="font-size:12px;color:#8891a8;margin-top:24px;border-top:1px solid #2a3350;padding-top:12px;">${linhaIdentidade().join(" · ")}</p>`;
}

// Para e-mail de MARKETING (newsletter, promoção, novidade de
// produto) — identidade da empresa + link de descadastro obrigatório.
export function rodapeMarketingHtml(linkDescadastro: string): string {
  const linhas = [...linhaIdentidade(), `<a href="${linkDescadastro}" style="color:#8891a8;">Não quero mais receber estes e-mails</a>`];
  return `<p style="font-size:12px;color:#8891a8;margin-top:24px;border-top:1px solid #2a3350;padding-top:12px;">${linhas.join(" · ")}</p>`;
}
