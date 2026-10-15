import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ComoVaiUsar } from "@/components/como-vai-usar";
import styles from "./page.module.css";

export const metadata = {
  title: "Comece agora | Rede Impulso",
  description:
    "Escolha como você vai usar a Rede Impulso: imobiliária, corretor, construtora/incorporadora ou cliente.",
};

export default async function ComeceAgoraPage() {
  return (
    <>
      <Nav active="/comece-agora" />

      <header className={styles.hero}>
        <div className="wrap-narrow">
          <span className="eyebrow">Comece agora</span>
          <h1>Como você vai usar a Rede Impulso?</h1>
          <p className={styles.lead}>
            Escolha a opção que melhor te descreve. O cadastro de cliente e os 2
            primeiros imóveis de qualquer corretor ou imobiliária são sempre
            grátis — sem cartão, sem prazo pra acabar.
          </p>
        </div>
      </header>

      <section>
        <div className="wrap">
          <ComoVaiUsar />
        </div>
      </section>

      <section style={{ background: "var(--surface-2)" }}>
        <div className="wrap-narrow" style={{ textAlign: "center" }}>
          <div className={styles.sectionHead}>
            <span className="eyebrow">Como começar</span>
            <h2>Três passos, sem complicação</h2>
          </div>
          <div className="grid grid-3">
            <div className="card">
              <div style={{ fontSize: 20 }}>1️⃣</div>
              <strong style={{ fontSize: 14.5 }}>Faça seu cadastro</strong>
              <p className="hint" style={{ marginBottom: 0 }}>
                Escolha a opção acima e informe os dados básicos.
              </p>
            </div>
            <div className="card">
              <div style={{ fontSize: 20 }}>2️⃣</div>
              <strong style={{ fontSize: 14.5 }}>Complete seu perfil</strong>
              <p className="hint" style={{ marginBottom: 0 }}>
                Documentos de verificação liberam a publicação e o perfil público.
              </p>
            </div>
            <div className="card">
              <div style={{ fontSize: 20 }}>3️⃣</div>
              <strong style={{ fontSize: 14.5 }}>Publique e negocie</strong>
              <p className="hint" style={{ marginBottom: 0 }}>
                2 imóveis ativos sempre grátis — amplie quando precisar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap-narrow" style={{ textAlign: "center" }}>
          <p className="muted">
            Já é corretor de uma imobiliária ou construtora cadastrada na Rede
            Impulso?{" "}
            <Link href="/cadastro-profissional?papel=corretor" style={{ textDecoration: "underline" }}>
              Crie seu cadastro de corretor
            </Link>{" "}
            normalmente — hoje cada profissional se cadastra com seu próprio
            CRECI, mesmo representando uma empresa.
          </p>
          <p className="muted">
            Dúvidas sobre planos e preços?{" "}
            <Link href="/planos" style={{ textDecoration: "underline" }}>
              Veja o Plano Profissional
            </Link>
            .
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
