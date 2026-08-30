import Link from "next/link";
import styles from "./ticker-mercado.module.css";

const NOTICIAS = [
  {
    id: "portugal",
    tag: "Portugal",
    texto: "Sync MLS chega a Portugal em 2025 — mercado entra na era da partilha entre corretores.",
  },
  {
    id: "florida",
    tag: "Flórida",
    texto:
      "Brasil é uma das nacionalidades mais fiéis do mercado imobiliário da Flórida: 7% das compras estrangeiras em 2025.",
  },
  {
    id: "brasil",
    tag: "Brasil",
    texto: "MLSBrazil já conecta corretores em todo o país — a partilha de imóveis chegou por aqui também.",
  },
  {
    id: "visao",
    tag: "Visão",
    texto: "Rede Impulso: a ponte imobiliária entre Brasil, Portugal e Estados Unidos.",
  },
  {
    id: "movimento",
    tag: "Movimento",
    texto: "Todo ano, milhares de brasileiros buscam uma nova vida em Portugal — e um imóvel para chamar de lar.",
  },
  {
    id: "mercado",
    tag: "Mercado",
    texto: "Comprar, vender e alugar sem fronteiras: o mercado imobiliário virou global.",
  },
];

export function TickerMercado() {
  return (
    <aside className={styles.ticker}>
      <div className={styles.cabecalho}>Radar do mercado</div>
      <div className={styles.janela}>
        <div className={styles.trilho}>
          {NOTICIAS.map((item) => (
            <Link key={item.id} href={`/visao-global#${item.id}`} className={styles.item}>
              <span className={styles.tag}>{item.tag}</span>
              <p className={styles.texto}>{item.texto}</p>
            </Link>
          ))}
          {NOTICIAS.map((item) => (
            <Link
              key={`dup-${item.id}`}
              href={`/visao-global#${item.id}`}
              className={styles.item}
              aria-hidden="true"
              tabIndex={-1}
            >
              <span className={styles.tag}>{item.tag}</span>
              <p className={styles.texto}>{item.texto}</p>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
