"use client";

import Link from "next/link";

// Boundary de erro raiz — sem isto, qualquer exceção não tratada em
// qualquer página mostrava a tela genérica do Next.js ("Application
// error: a client-side exception has occurred"), sem marca nenhuma e
// sem nenhum jeito de voltar além de recarregar manualmente. De
// propósito sem <Nav>/<Footer> aqui: esses componentes fazem suas
// próprias buscas de dados, e o fallback de erro precisa continuar de
// pé mesmo que algo mais no app esteja quebrado.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wrap" style={{ padding: "80px 0", textAlign: "center" }}>
      <span className="eyebrow">Ops</span>
      <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Algo deu errado</h1>
      <p className="muted mb-24">
        Não conseguimos carregar esta página agora. Pode ser algo passageiro.
      </p>
      <div className="flex gap-8" style={{ justifyContent: "center" }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => reset()}>
          Tentar de novo
        </button>
        <Link href="/" className="btn btn-outline btn-sm">
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}
