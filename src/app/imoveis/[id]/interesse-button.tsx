"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function InteresseButton({ imovelId }: { imovelId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "enviando" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleClick() {
    setStatus("enviando");
    setErro(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/entrar?depois=/imoveis/${imovelId}`);
      return;
    }

    const { error } = await supabase.from("negocios").insert({
      imovel_id: imovelId,
      comprador_id: user.id,
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
        className="btn btn-primary btn-block"
        onClick={handleClick}
        disabled={status === "enviando"}
      >
        {status === "enviando" ? "Enviando…" : "Tenho interesse ↗"}
      </button>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
    </>
  );
}
