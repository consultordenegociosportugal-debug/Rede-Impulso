import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { InstalarTabs } from "./instalar-tabs";

export const metadata = {
  title: "Instale a Rede Impulso no seu celular",
  description:
    "Passo a passo pra adicionar a Rede Impulso na tela inicial do seu celular, com ícone próprio e tela cheia.",
};

export default function InstalarAppPage() {
  return (
    <>
      <Nav active="/instalar-app" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <span className="eyebrow">Tela inicial do celular</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
            Instale a Rede Impulso no seu celular
          </h1>
          <p className="muted mb-24">
            Em menos de um minuto você adiciona um atalho com ícone próprio na tela
            inicial — abre em tela cheia, sem a barra do navegador, como um aplicativo
            de verdade. Não precisa baixar nada de loja nenhuma.
          </p>

          <InstalarTabs />

          <div className="card mt-24" style={{ padding: "14px 16px" }}>
            <p style={{ margin: 0, fontSize: 13.5 }}>
              <strong>Por que não tem na Play Store/App Store?</strong> Ainda não
              publicamos lá — por enquanto, esse atalho na tela inicial é o jeito de
              usar a Rede Impulso como app no celular, e funciona igualmente bem.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
