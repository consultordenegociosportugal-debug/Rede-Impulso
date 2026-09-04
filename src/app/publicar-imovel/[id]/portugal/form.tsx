"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SincronizarPortugalForm({ imovelId }: { imovelId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "enviando" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleSincronizar() {
    setStatus("enviando");
    setErro(null);

    try {
      const resposta = await fetch("/api/portugal/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imovelId }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível sincronizar agora.");
        setStatus("erro");
        return;
      }

      router.refresh();
      setStatus("idle");
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setStatus("erro");
    }
  }

  return (
    <div className="card mt-24">
      {erro && (
        <p className="hint" style={{ color: "var(--coral)", marginBottom: 12 }}>
          {erro}
        </p>
      )}
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={handleSincronizar}
        disabled={status === "enviando"}
      >
        {status === "enviando" ? "Sincronizando…" : "🇵🇹 Sincronizar com Portugal"}
      </button>
    </div>
  );
}
