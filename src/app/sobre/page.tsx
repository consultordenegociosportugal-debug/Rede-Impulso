import Link from "next/link";
import { Nav } from "@/components/nav";
import { ComoVaiUsar } from "@/components/como-vai-usar";
import { SOBRE_PARAGRAFOS, SOBRE_MODULOS, OBJETIVOS } from "@/lib/conteudo-institucional";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Sobre | Rede Impulso",
  description:
    "A Rede Impulso é o sistema de agendamento e gestão para corretores, imobiliárias e construtoras.",
};

export default function SobrePage() {
  return (
    <>
      <Nav active="/sobre" />

      <header className={styles.hero}>
        <div className="wrap-narrow">
          <span className="eyebrow">Sobre a Rede Impulso</span>
          <h1>Agendamento e gestão, num só sistema.</h1>
          <p className={styles.lead}>
            {SOBRE_PARAGRAFOS[0]}
          </p>
          <div className={styles.ctaRow}>
            <Link href="/cadastro-cliente" className="btn btn-primary">
              Sou cliente
            </Link>
            <Link href="/comece-agora" className="btn btn-outline">
              Sou profissional
            </Link>
          </div>
        </div>
      </header>

      <section style={{ background: "var(--surface-2)" }}>
        <div className="wrap-narrow">
          <div className={styles.sectionHead}>
            <span className="eyebrow">Como o sistema é dividido</span>
            <h2>Dois módulos, um só negócio</h2>
          </div>
          <div className="grid grid-2">
            {SOBRE_MODULOS.map((m) => (
              <div key={m.titulo} className="card">
                <h3 style={{ fontSize: 17, marginTop: 0 }}>{m.titulo}</h3>
                <p className="muted" style={{ marginBottom: 0 }}>{m.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className={styles.sectionHead}>
            <span className="eyebrow">Nosso objetivo</span>
            <h2>Feito pra quem vive de visita e negócio fechado</h2>
          </div>
          <div className="grid grid-3">
            {OBJETIVOS.map((o) => (
              <div key={o.titulo} className="card">
                <div style={{ fontSize: 22 }}>{o.icone}</div>
                <strong style={{ fontSize: 15, display: "block", margin: "8px 0 4px" }}>
                  {o.titulo}
                </strong>
                <p className="hint" style={{ marginBottom: 0 }}>{o.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--surface-2)" }}>
        <div className="wrap">
          <div className={styles.sectionHead}>
            <span className="eyebrow">Como você vai usar a Rede Impulso?</span>
            <h2>Escolha a opção que melhor te descreve</h2>
          </div>
          <ComoVaiUsar />
        </div>
      </section>

      <Footer />
    </>
  );
}
