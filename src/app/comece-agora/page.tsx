import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ComoVaiUsar } from "@/components/como-vai-usar";
import styles from "./page.module.css";

export const metadata = {
  title: "Comece agora | Rede Impulso",
  description: "Escolha como você vai usar a Rede Impulso: corretor ou cliente.",
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
            Escolha a opção que melhor te descreve. Cadastro, agendamento e lembrete por
            e-mail são sempre grátis — sem cartão, sem prazo pra acabar.
          </p>
          <p className="hint">
            Já tem conta?{" "}
            <a href="/entrar" style={{ textDecoration: "underline" }}>
              Entrar
            </a>
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
              <strong style={{ fontSize: 14.5 }}>Configure sua disponibilidade</strong>
              <p className="hint" style={{ marginBottom: 0 }}>
                Dias e horários em que você atende visitas — leva poucos minutos.
              </p>
            </div>
            <div className="card">
              <div style={{ fontSize: 20 }}>3️⃣</div>
              <strong style={{ fontSize: 14.5 }}>Configure e agende</strong>
              <p className="hint" style={{ marginBottom: 0 }}>
                Defina sua disponibilidade e comece a receber agendamentos confirmados.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
