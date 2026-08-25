import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export default function TermosDeUsoPage() {
  return (
    <>
      <Nav active="/termos-de-uso" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <span className="eyebrow">Documento legal</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Termos de Uso</h1>
          <p className="hint">Última atualização: a definir na publicação</p>

          <div className="card" style={{ background: "var(--amber-tint)", marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 13.5 }}>
              ⚠️ <strong>Rascunho de trabalho.</strong> Este texto foi redigido
              como ponto de partida e ainda não passou por revisão de um
              advogado. Não publique nem trate como vinculante antes dessa
              validação.
            </p>
          </div>

          <div style={{ fontSize: 14.5, lineHeight: 1.7 }}>
            <h2 style={{ fontSize: 18, marginTop: 28 }}>1. Aceitação</h2>
            <p>
              Ao criar uma conta ou usar a Rede Impulso, você concorda com
              estes Termos de Uso e com a nossa{" "}
              <a href="/privacidade" style={{ textDecoration: "underline" }}>
                Política de Privacidade
              </a>
              . Se não concordar, não utilize a plataforma.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>2. O que é a Rede Impulso</h2>
            <p>
              A Rede Impulso é uma plataforma que conecta clientes
              (compradores, vendedores, locatários), corretores,
              imobiliárias e cartórios, além de oferecer cursos de
              capacitação e um diretório de serviços parceiros. A Rede
              Impulso <strong>intermedia o contato</strong> entre as partes,
              mas não é parte na negociação, na compra, na venda, no aluguel
              ou em qualquer contrato firmado entre usuários.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>3. Cadastro</h2>
            <p>
              Você é responsável pela veracidade dos dados informados no
              cadastro, incluindo documentos enviados para verificação (RG,
              CNH, CNPJ, CRECI). Cadastros com informações falsas podem ser
              suspensos ou encerrados.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>
              4. Publicação de imóveis e serviços
            </h2>
            <p>
              Quem publica um imóvel ou serviço declara ter autorização para
              anunciá-lo e se responsabiliza pela exatidão das informações
              (preço, características, fotos). A Rede Impulso pode remover
              anúncios denunciados ou que violem estes Termos.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>5. Verificação de documentos</h2>
            <p>
              Alguns papéis (vendedor, corretor, imobiliária, cartório)
              exigem o envio de documentos antes da liberação plena do
              perfil. A análise é feita pela equipe da Rede Impulso e pode
              levar tempo; a publicação de imóveis ou serviços pode ocorrer
              antes da aprovação final, sujeita a remoção caso o documento
              seja rejeitado.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>6. Cursos e pagamentos</h2>
            <p>
              Matrículas em cursos reservam a vaga; o pagamento é processado
              por um provedor externo (Mercado Pago). Condições de reembolso
              e cancelamento serão detalhadas na tela de cada curso.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>7. Condutas proibidas</h2>
            <ul>
              <li>Publicar informações falsas ou enganosas</li>
              <li>Assediar, ameaçar ou discriminar outros usuários</li>
              <li>Usar a plataforma para fins fraudulentos</li>
              <li>Tentar acessar dados de outros usuários sem autorização</li>
            </ul>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>8. Limitação de responsabilidade</h2>
            <p>
              A Rede Impulso não garante a conclusão de nenhum negócio e não
              se responsabiliza por prejuízos decorrentes de negociações
              entre usuários. Recomendamos cautela e verificação
              independente antes de qualquer pagamento ou assinatura de
              contrato.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>9. Encerramento de conta</h2>
            <p>
              Você pode encerrar sua conta a qualquer momento entrando em
              contato conosco. Podemos suspender contas que violem estes
              Termos.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>10. Alterações</h2>
            <p>
              Podemos atualizar estes Termos periodicamente. Mudanças
              relevantes serão comunicadas pela plataforma.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>11. Lei aplicável</h2>
            <p>
              Estes Termos são regidos pelas leis do Brasil, com foro a ser
              definido na versão final revisada por advogado.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>12. Contato</h2>
            <p>Dúvidas sobre estes Termos: e-mail de contato a definir.</p>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
