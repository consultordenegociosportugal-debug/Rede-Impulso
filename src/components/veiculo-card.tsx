import Link from "next/link";
import styles from "./veiculo-card.module.css";

export type VeiculoCardData = {
  id: string;
  marca: string;
  modelo: string;
  ano: number;
  km: number | null;
  preco: number | null;
  tipoLabel: string;
  cidade: string;
  estado: string;
  fotoUrl?: string | null;
};

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function VeiculoCard({ veiculo }: { veiculo: VeiculoCardData }) {
  return (
    <Link href={`/eletricos/veiculos/${veiculo.id}`} className={`card ${styles.veiculoCard}`}>
      {veiculo.fotoUrl ? (
        <div
          className={styles.veiculoFoto}
          style={{ backgroundImage: `url(${veiculo.fotoUrl})` }}
        />
      ) : (
        <div className="photo-slot">sem foto</div>
      )}
      <div className={styles.veiculoBody}>
        <span className="badge badge-primary">{veiculo.tipoLabel}</span>
        <div style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>
          {veiculo.marca} {veiculo.modelo}
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          {veiculo.ano} {veiculo.km != null ? `· ${veiculo.km.toLocaleString("pt-BR")} km` : ""} ·{" "}
          {veiculo.cidade}/{veiculo.estado}
        </div>
        <div className="mono" style={{ marginTop: 8, fontSize: 14 }}>
          {veiculo.preco ? formatoMoeda.format(veiculo.preco) : "Preço a combinar"}
        </div>
      </div>
    </Link>
  );
}
