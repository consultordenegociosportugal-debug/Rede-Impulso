"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function VincularButton({
  imovelId,
  corretorId,
  corretorNome,
  imobiliariaId,
}: {
  imovelId: string;
  corretorId: string;
  corretorNome: string;
  imobiliariaId: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "enviando" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleClick() {
    setStatus("enviando");
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.from("negocios").insert({
      imovel_id: imovelId,
      corretor_id: corretorId,
      imobiliaria_id: imobiliariaId,
      status: "negociacao",
    });

    if (error) {
      setErro(error.message);
      setStatus("erro");
      return;
    }

    router.push("/painel-negocios");
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-block mt-24"
        onClick={handleClick}
        disabled={status === "enviando"}
      >
        {status === "enviando"
          ? "Vinculando…"
          : `Vincular imóvel a ${corretorNome} ↗`}
      </button>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
    </>
  );
}
