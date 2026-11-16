"use client";

export function ImprimirBotao() {
  return (
    <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
      🖨️ Imprimir / salvar PDF
    </button>
  );
}
