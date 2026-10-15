import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Blog | Rede Impulso",
  description:
    "Conteúdo sobre o mercado imobiliário, agendamento de visitas e dicas para corretores, imobiliárias e construtoras.",
};

export default function BlogPage() {
  return (
    <>
      <Nav active="/blog" />

      <div className="wrap-narrow" style={{ padding: "64px 0 80px", textAlign: "center" }}>
        <span className="eyebrow">Blog</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Em breve</h1>
        <p className="muted">
          Estamos preparando conteúdo sobre mercado imobiliário, agendamento de visitas
          e dicas para corretores, imobiliárias e construtoras. Volte em breve.
        </p>
        <Link href="/" className="btn btn-primary mt-24">
          Voltar para a home
        </Link>
      </div>

      <Footer />
    </>
  );
}
