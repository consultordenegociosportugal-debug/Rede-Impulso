// Integração com portais imobiliários de Portugal (Idealista, OLX
// Portugal, Imovirtual...) — camada OPCIONAL, mesmo padrão de
// mercadopago.ts e google-calendar.ts. Sem credenciais de parceiro
// configuradas, portaisExternosConfigurado() devolve false e nenhuma
// chamada de rede é feita.
//
// Por que isto é só uma interface, sem adapter real ainda: o acesso
// de parceiro precisa ser pedido e aprovado comercialmente antes de
// existir qualquer contrato de API pra seguir — ver
// developers.idealista.com/access-request e a seção "próximos
// passos" do memo "Rede Impulso 2030". O request/response exato de
// cada portal (Idealista, OLX Portugal, Imovirtual) só pode ser
// fechado depois de ter documentação de parceiro de verdade na mão.
// O que existe aqui é o contrato que o resto do app usa — trocar só
// a implementação de sincronizarImovel quando a parceria sair do
// papel, nunca esse contrato.

export type ImovelParaSincronizar = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  finalidade: "venda" | "aluguel";
  bairro: string;
  cidade: string;
  preco: number | null;
  quartos: number | null;
  banheiros: number | null;
  areaM2: number | null;
  fotos: string[];
};

export type ResultadoSincronizacao =
  | { ok: true; idExterno: string }
  | { ok: false; erro: string };

export function portaisExternosConfigurado(): boolean {
  return Boolean(process.env.IDEALISTA_API_KEY || process.env.OLX_PORTUGAL_API_KEY);
}

/** Envia (ou atualiza) o anúncio no portal parceiro ativo. Sem parceria fechada, sempre falha com uma mensagem honesta. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do futuro adapter real; sem parceria fechada ainda não há o que enviar
export async function sincronizarImovel(_imovel: ImovelParaSincronizar): Promise<ResultadoSincronizacao> {
  if (!portaisExternosConfigurado()) {
    return {
      ok: false,
      erro: "Integração com portais de Portugal ainda não está configurada nesta instalação.",
    };
  }

  // Nenhum adapter real implementado ainda — chega aqui só depois que
  // uma parceria comercial (Idealista, OLX Portugal ou Imovirtual)
  // tiver sido fechada e as credenciais reais configuradas.
  return { ok: false, erro: "Nenhum portal parceiro está ativo ainda." };
}

/** Remove o anúncio do portal parceiro. Mesma degradação honesta de sincronizarImovel. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura do futuro adapter real; sem parceria fechada ainda não há o que remover
export async function removerImovelExterno(_idExterno: string): Promise<ResultadoSincronizacao> {
  if (!portaisExternosConfigurado()) {
    return {
      ok: false,
      erro: "Integração com portais de Portugal ainda não está configurada nesta instalação.",
    };
  }

  return { ok: false, erro: "Nenhum portal parceiro está ativo ainda." };
}
