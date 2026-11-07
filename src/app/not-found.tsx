import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

// Sem isto, um link quebrado ou uma URL digitada errada caía na tela
// genérica e sem marca nenhuma do Next.js — "404 This page could not
// be found." — justamente o tipo de coisa que mina a credibilidade de
// quem está vendo o app pela primeira vez.
export default function NotFound() {
  return (
    <>
      <Nav active="" />
      <div className="wrap" style={{ padding: "80px 0", textAlign: "center" }}>
        <span className="eyebrow">404</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Essa página não existe</h1>
        <p className="muted mb-24">
          O link pode estar errado ou a página pode ter mudado de lugar.
        </p>
        <Link href="/" className="btn btn-primary btn-sm">
          Voltar para o início
        </Link>
      </div>
      <Footer />
    </>
  );
}
