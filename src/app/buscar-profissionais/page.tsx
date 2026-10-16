import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { BuscaProfissionais } from "./busca";

export const metadata = {
  title: "Buscar profissionais | Rede Impulso",
  description:
    "Encontre um corretor autônomo, imobiliária ou construtora por nome, por cidade ou perto de você.",
};

export default function BuscarProfissionaisPage() {
  return (
    <>
      <Nav active="/buscar-profissionais" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <span className="eyebrow">Buscar</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
          Encontre um corretor, imobiliária ou construtora
        </h1>
        <p className="muted">Por nome, por cidade ou perto de você.</p>

        <BuscaProfissionais />
      </div>

      <Footer />
    </>
  );
}
