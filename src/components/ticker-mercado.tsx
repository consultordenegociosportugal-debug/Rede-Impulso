import styles from "./ticker-mercado.module.css";

const NOTICIAS = [
  {
    tag: "Portugal",
    texto: "Sync MLS chega a Portugal em 2025 — mercado entra na era da partilha entre corretores.",
  },
  {
    tag: "Flórida",
    texto:
      "Brasil é uma das nacionalidades mais fiéis do mercado imobiliário da Flórida: 7% das compras estrangeiras em 2025.",
  },
  {
    tag: "Brasil",
    texto: "MLSBrazil já conecta corretores em todo o país — a partilha de imóveis chegou por aqui também.",
  },
  {
    tag: "Visão",
    texto: "Rede Impulso: a ponte imobiliária entre Brasil, Portugal e Estados Unidos.",
  },
  {
    tag: "Movimento",
    texto: "Todo ano, milhares de brasileiros buscam uma nova vida em Portugal — e um imóvel para chamar de lar.",
  },
  {
    tag: "Mercado",
    texto: "Comprar, vender e alugar sem fronteiras: o mercado imobiliário virou global.",
  },
];

export function TickerMercado() {
  const itens = [...NOTICIAS, ...NOTICIAS];

  return (
    <aside className={styles.ticker} aria-hidden="true">
      <div className={styles.cabecalho}>Radar do mercado</div>
      <div className={styles.janela}>
        <div className={styles.trilho}>
          {itens.map((item, i) => (
            <div key={i} className={styles.item}>
              <span className={styles.tag}>{item.tag}</span>
              <p className={styles.texto}>{item.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
