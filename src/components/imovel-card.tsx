import Link from "next/link";
import styles from "./imovel-card.module.css";

export type ImovelCardData = {
  id: string;
  titulo: string;
  bairro: string;
  cidade: string;
  preco: number | null;
  finalidade: "venda" | "aluguel";
  tipoLabel?: string;
  specs?: string;
  fotoUrl?: string | null;
};

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function ImovelCard({
  imovel,
  favoritoSlot,
}: {
  imovel: ImovelCardData;
  favoritoSlot?: React.ReactNode;
}) {
  return (
    <Link href={`/imoveis/${imovel.id}`} className={`card ${styles.imovelCard}`}>
      <div style={{ position: "relative" }}>
        {imovel.fotoUrl ? (
          <div
            className={styles.imovelFoto}
            style={{ backgroundImage: `url(${imovel.fotoUrl})` }}
          />
        ) : (
          <div className="photo-slot">sem foto</div>
        )}
        {favoritoSlot}
      </div>
      <div className={styles.imovelBody}>
        <span
          className={`badge ${imovel.finalidade === "venda" ? "badge-primary" : "badge-amber"}`}
        >
          {imovel.finalidade === "venda" ? "Venda" : "Aluguel"}
        </span>{" "}
        {imovel.tipoLabel && (
          <span className="hint" style={{ margin: 0 }}>
            {imovel.tipoLabel}
          </span>
        )}
        <div style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>{imovel.titulo}</div>
        <div className="muted" style={{ fontSize: 13 }}>
          {imovel.bairro}, {imovel.cidade}
        </div>
        {imovel.specs && (
          <div className="hint mono" style={{ margin: "6px 0 0" }}>
            {imovel.specs}
          </div>
        )}
        <div className="mono" style={{ marginTop: 8, fontSize: 14 }}>
          {imovel.preco ? formatoMoeda.format(imovel.preco) : "Preço a combinar"}
        </div>
      </div>
    </Link>
  );
}
