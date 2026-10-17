"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Exclusão definitiva da própria conta — exige digitar "EXCLUIR" antes
// de liberar o botão, pra não apagar por engano com um clique duplo.
export function ExcluirConta() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    setExcluindo(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/conta/excluir", { method: "POST" });
      if (!resposta.ok) {
        const dados = (await resposta.json().catch(() => ({}))) as { erro?: string };
        setErro(dados.erro ?? "Não foi possível excluir a conta. Tente de novo.");
        setExcluindo(false);
        return;
      }
    } catch {
      setErro("Não conseguimos falar com o servidor. Tente de novo.");
      setExcluindo(false);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="card mt-24"
      style={{ borderColor: "var(--coral)", borderWidth: 1, borderStyle: "solid" }}
    >
      <h2 style={{ fontSize: 16, margin: "0 0 4px", color: "var(--coral)" }}>Excluir conta</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Apaga sua conta e todos os seus dados da Rede Impulso — cadastro, agenda, clientes e
        histórico de visitas. Não tem como desfazer.
      </p>

      {!aberto ? (
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setAberto(true)}>
          Excluir minha conta
        </button>
      ) : (
        <>
          <div className="field">
            <label htmlFor="confirmar-exclusao">
              Digite <strong>EXCLUIR</strong> para confirmar
            </label>
            <input
              id="confirmar-exclusao"
              type="text"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder="EXCLUIR"
              autoComplete="off"
            />
          </div>
          {erro && (
            <p className="hint" style={{ color: "var(--coral)" }}>
              {erro}
            </p>
          )}
          <div className="flex gap-8">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setAberto(false);
                setConfirmacao("");
                setErro(null);
              }}
              disabled={excluindo}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: "var(--coral)", color: "#fff" }}
              onClick={excluir}
              disabled={confirmacao !== "EXCLUIR" || excluindo}
            >
              {excluindo ? "Excluindo…" : "Excluir definitivamente"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
