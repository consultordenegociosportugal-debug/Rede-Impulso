"use client";

import { useState, type ReactNode } from "react";

// Alterna entre a lista (uma visita por linha, em sequência) e o quadro
// semanal (um dia por coluna) sem recarregar nada — as duas vêm prontas
// do server, só trocamos qual fica visível.
export function ViewToggle({ lista, semana }: { lista: ReactNode; semana: ReactNode }) {
  const [view, setView] = useState<"lista" | "semana">("lista");

  return (
    <div>
      <div className="flex gap-8 mb-12">
        <button
          type="button"
          className={`btn btn-sm ${view === "lista" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setView("lista")}
        >
          Lista
        </button>
        <button
          type="button"
          className={`btn btn-sm ${view === "semana" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setView("semana")}
        >
          Semana
        </button>
      </div>
      {view === "lista" ? lista : semana}
    </div>
  );
}
