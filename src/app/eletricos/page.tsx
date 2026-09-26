import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const PILARES = [
  {
    eyebrow: "Marketplace",
    titulo: "Compre e venda carros elétricos",
    detalhe:
      "Anuncie seu elétrico ou híbrido, ou encontre o próximo direto com quem está vendendo — sem intermediário obrigatório.",
    href: "/eletricos/veiculos",
    cta: "Ver veículos →",
  },
  {
    eyebrow: "Recarga",
    titulo: "Eletropostos perto de você",
    detalhe:
      "Diretório alimentado pela comunidade: onde carregar, que conector, potência e preço do kWh.",
    href: "/eletricos/eletropostos",
    cta: "Ver eletropostos →",
  },
  {
    eyebrow: "Assistência técnica",
    titulo: "Oficinas especializadas",
    detalhe:
      "Manutenção de elétrico ainda é difícil de achar. Encontre quem já atende — ou cadastre a sua.",
    href: "/eletricos/oficinas",
    cta: "Ver oficinas →",
  },
  {
    eyebrow: "Comunidade",
    titulo: "Dúvidas, comparações e experiências",
    detalhe:
      "Quem já tem elétrico, quem está pesquisando, e notícias do setor — tudo num só lugar.",
    href: "/eletricos/comunidade",
    cta: "Ver comunidade →",
  },
];

export default function EletricosPage() {
  return (
    <>
      <Nav active="/eletricos" />

      <header style={{ padding: "56px 0 32px" }}>
        <div className="wrap" style={{ maxWidth: 720 }}>
          <span className="eyebrow">Um novo braço da Rede Impulso</span>
          <h1 style={{ fontSize: 32, margin: "8px 0 4px" }}>
            Conectando o mundo dos elétricos no Brasil
          </h1>
          <p className="muted" style={{ fontSize: 15.5 }}>
            Compra e venda, recarga, assistência técnica e comunidade — tudo
            num só lugar, começando pelo Brasil e crescendo pro mundo, do
            mesmo jeito que a Rede Impulso já faz no imobiliário.
          </p>
        </div>
      </header>

      <section>
        <div className="wrap">
          <div className="grid grid-2">
            {PILARES.map((pilar) => (
              <Link key={pilar.href} href={pilar.href} className="card">
                <span className="eyebrow">{pilar.eyebrow}</span>
                <h2 style={{ fontSize: 19, margin: "8px 0 4px" }}>{pilar.titulo}</h2>
                <p className="muted" style={{ fontSize: 13.5 }}>{pilar.detalhe}</p>
                <span className="btn btn-ghost btn-sm mt-12" style={{ display: "inline-flex" }}>
                  {pilar.cta}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--surface-2)" }}>
        <div className="wrap-narrow" style={{ textAlign: "center" }}>
          <span className="eyebrow">Início de tudo</span>
          <h2 style={{ fontSize: 22 }}>Ainda no começo — e é assim mesmo</h2>
          <p className="muted">
            Os diretórios de eletroposto e oficina começam vazios e crescem
            com quem usa, igual todo diretório de comunidade começa. Cadastre
            o que você já conhece — o próximo elétrico que passar por aqui
            agradece.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
