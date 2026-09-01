import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import styles from "./ticker-mercado.module.css";

type ItemTicker = { id: string; tag: string; texto: string; href?: string };

const NOTICIAS_FIXAS: ItemTicker[] = [
  {
    id: "portugal",
    tag: "Portugal",
    texto: "Sync MLS chega a Portugal em 2025 — mercado entra na era da partilha entre corretores.",
    href: "/visao-global#portugal",
  },
  {
    id: "florida",
    tag: "Flórida",
    texto:
      "Brasil é uma das nacionalidades mais fiéis do mercado imobiliário da Flórida: 7% das compras estrangeiras em 2025.",
    href: "/visao-global#florida",
  },
  {
    id: "visao",
    tag: "Visão",
    texto: "Rede Impulso: a ponte imobiliária entre Brasil, Portugal e Estados Unidos.",
    href: "/visao-global#visao",
  },
  {
    id: "movimento",
    tag: "Movimento",
    texto: "Todo ano, milhares de brasileiros buscam uma nova vida em Portugal — e um imóvel para chamar de lar.",
    href: "/visao-global#movimento",
  },
];

// Fallback pré-cron: enquanto o job diário (/api/radar-mercado/atualizar)
// nunca rodou ou a migração 0030 ainda não foi aplicada, o ticker mostra
// isto no lugar das manchetes do dia — nunca aparece vazio.
const FALLBACK_BRASIL: ItemTicker[] = [
  {
    id: "brasil",
    tag: "Brasil",
    texto: "MLSBrazil já conecta corretores em todo o país — a partilha de imóveis chegou por aqui também.",
  },
  {
    id: "mercado",
    tag: "Mercado",
    texto: "Comprar, vender e alugar sem fronteiras: o mercado imobiliário virou global.",
  },
];

async function buscarManchetesDoDia(): Promise<ItemTicker[] | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("radar_mercado_diario")
      .select("manchetes")
      .order("data_referencia", { ascending: false })
      .limit(1)
      .maybeSingle();

    const manchetes = data?.manchetes as { tag: string; texto: string }[] | undefined;
    if (!manchetes || manchetes.length === 0) return null;

    return manchetes.map((m, i) => ({ id: `hoje-${i}`, tag: m.tag, texto: m.texto }));
  } catch {
    return null;
  }
}

export async function TickerMercado() {
  const doDia = await buscarManchetesDoDia();
  const itens = [...(doDia ?? FALLBACK_BRASIL), ...NOTICIAS_FIXAS];

  return (
    <aside className={styles.ticker}>
      <div className={styles.cabecalho}>Radar do mercado</div>
      <div className={styles.janela}>
        <div className={styles.trilho}>
          {itens.map((item) => (
            <ItemLink key={item.id} item={item} />
          ))}
          {itens.map((item) => (
            <ItemLink key={`dup-${item.id}`} item={item} oculto />
          ))}
        </div>
      </div>
    </aside>
  );
}

function ItemLink({ item, oculto }: { item: ItemTicker; oculto?: boolean }) {
  const conteudo = (
    <>
      <span className={styles.tag}>{item.tag}</span>
      <p className={styles.texto}>{item.texto}</p>
    </>
  );

  if (!item.href) {
    return (
      <div className={styles.item} aria-hidden={oculto || undefined}>
        {conteudo}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${styles.item} ${styles.itemLink}`}
      aria-hidden={oculto || undefined}
      tabIndex={oculto ? -1 : undefined}
    >
      {conteudo}
    </Link>
  );
}
