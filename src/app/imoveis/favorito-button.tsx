"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function FavoritoButton({
  imovelId,
  favoritadoInicial,
  logado,
  variant = "full",
}: {
  imovelId: string;
  favoritadoInicial: boolean;
  logado: boolean;
  variant?: "full" | "icon";
}) {
  const router = useRouter();
  const [favoritado, setFavoritado] = useState(favoritadoInicial);
  const [carregando, setCarregando] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!logado) {
      router.push(`/entrar?depois=/imoveis/${imovelId}`);
      return;
    }

    setCarregando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/entrar?depois=/imoveis/${imovelId}`);
      return;
    }

    if (favoritado) {
      await supabase
        .from("favoritos")
        .delete()
        .eq("usuario_id", user.id)
        .eq("imovel_id", imovelId);
      setFavoritado(false);
    } else {
      await supabase
        .from("favoritos")
        .insert({ usuario_id: user.id, imovel_id: imovelId });
      setFavoritado(true);
    }
    setCarregando(false);
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={carregando}
        aria-label={favoritado ? "Remover dos favoritos" : "Favoritar"}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "none",
          background: "rgba(0,0,0,0.45)",
          color: favoritado ? "var(--coral)" : "#fff",
          fontSize: 16,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {favoritado ? "♥" : "♡"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-block"
      onClick={handleClick}
      disabled={carregando}
    >
      {favoritado ? "♥ Salvo nos favoritos" : "♡ Favoritar"}
    </button>
  );
}
