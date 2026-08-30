import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { RolarParaHash } from "@/components/rolar-para-hash";
import styles from "./page.module.css";

export const metadata = {
  title: "Visão global | Rede Impulso",
  description:
    "Uma ponte imobiliária entre Brasil, Portugal e Estados Unidos — a visão de expansão internacional da Rede Impulso.",
};

const TOPICOS = [
  {
    id: "visao",
    eyebrow: "A visão",
    titulo: "Uma ponte imobiliária entre Brasil, Portugal e Estados Unidos",
    texto:
      "Hoje, quem atravessa fronteiras como comprador ou investidor cai em mercados que não se falam — cada portal entende só o próprio país. A Rede Impulso nasce para ser a camada que conecta esses mundos: o mesmo padrão de confiança, do anúncio ao registro, em qualquer um dos três países.",
  },
  {
    id: "portugal",
    eyebrow: "Portugal",
    titulo: "Um mercado que acabou de dar o primeiro passo",
    texto:
      "Em 2025, o Sync MLS chegou a Portugal — o mercado português deu seu primeiro passo rumo à partilha estruturada de imóveis entre corretoras. É exatamente o tipo de infraestrutura que a Rede Impulso quer ajudar a espalhar, com um único fluxo de negócio do anúncio ao registro.",
    fonte: "Idealista/news, 2025",
  },
  {
    id: "florida",
    eyebrow: "Flórida",
    titulo: "Onde o Brasil já está de verdade",
    texto:
      "O Brasil é, ano após ano, uma das nacionalidades mais fiéis do mercado imobiliário da Flórida — 7% de todas as compras estrangeiras no estado em 2025. É o ponto de partida mais natural para conectar corretores brasileiros a quem já procura investir ou morar nos Estados Unidos.",
    fonte: "National Association of Realtors, 2025–26",
  },
  {
    id: "brasil",
    eyebrow: "Brasil",
    titulo: "A base que já prova que o modelo funciona",
    texto:
      "O MLSBrazil já mostrou que a partilha entre corretores funciona por aqui. A Rede Impulso constrói em cima dessa base — do primeiro contato ao cartório — e agora projeta essa mesma experiência para além das fronteiras do país.",
  },
  {
    id: "movimento",
    eyebrow: "Movimento",
    titulo: "Gente em busca de um novo lar, dos dois lados",
    texto:
      "Todo ano, milhares de brasileiros buscam uma nova vida em Portugal — e, do outro lado, portugueses e investidores olham o Brasil como oportunidade. Entre um lado e outro, sempre existe um imóvel esperando para virar lar.",
  },
  {
    id: "mercado",
    eyebrow: "Mercado",
    titulo: "Sem fronteiras deixou de ser exceção",
    texto:
      "Comprar, vender e alugar sem fronteiras deixou de ser exceção. O mercado imobiliário virou global — e a Rede Impulso quer ser a ponte confiável entre quem procura e quem já está lá.",
  },
];

export default function VisaoGlobalPage() {
  return (
    <>
      <Nav active="/visao-global" />
      <RolarParaHash />

      <header className={styles.hero}>
        <div className="wrap-narrow">
          <span className="eyebrow">Expansão internacional</span>
          <h1>Uma ponte imobiliária entre Brasil, Portugal e Estados Unidos</h1>
          <p className={styles.lead}>
            A Rede Impulso nasceu conectando corretores, imobiliárias, cartórios e clientes no
            Brasil. O próximo passo é fazer essa mesma conexão atravessar o Atlântico — para quem
            compra, vende ou investe dos dois lados.
          </p>
        </div>
      </header>

      <div className="wrap-narrow">
        {TOPICOS.map((topico) => (
          <section key={topico.id} id={topico.id} className={styles.topico}>
            <span className="eyebrow">{topico.eyebrow}</span>
            <h2>{topico.titulo}</h2>
            <p className="muted">{topico.texto}</p>
            {topico.fonte && <p className={styles.fonte}>Fonte: {topico.fonte}</p>}
          </section>
        ))}

        <div className={styles.voltar}>
          <Link href="/" className="btn btn-outline btn-sm">
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>

      <Footer />
    </>
  );
}
