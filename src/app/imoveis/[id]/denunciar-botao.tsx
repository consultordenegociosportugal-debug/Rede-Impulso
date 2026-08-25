"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MOTIVOS = [
  "Anúncio suspeito ou golpe",
  "Imóvel não existe ou já foi vendido",
  "Preço ou dados incorretos",
  "Conteúdo ofensivo",
  "Outro",
];

export function DenunciarBotao({ imovelId }: { imovelId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [detalhes, setDetalhes] = useState("");
  const [status, setStatus] = useState<"idle" | "enviando" | "enviado" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

    const { error } = await supabase.from("denuncias_imovel").insert({
      imovel_id: imovelId,
      denunciante_id: user.id,
      motivo,
      detalhes: detalhes || null,
    });

    if (error) {
      setErro(error.message);
      setStatus("erro");
      return;
    }

    setStatus("enviado");
  }

  if (status === "enviado") {
    return <p className="hint">Denúncia enviada. Obrigado por ajudar a manter a rede segura.</p>;
  }

  if (!aberto) {
    return (
      <button
        type="button"
        className="hint"
        style={{ background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
        onClick={() => setAberto(true)}
      >
        Denunciar anúncio
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-flat mt-8">
      <div className="field">
        <label htmlFor="motivo">Motivo</label>
        <select id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
          {MOTIVOS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="detalhes">
          Detalhes <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span>
        </label>
        <textarea
          id="detalhes"
          value={detalhes}
          onChange={(e) => setDetalhes(e.target.value)}
          rows={3}
        />
      </div>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
      <div className="flex gap-8">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAberto(false)}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-outline btn-sm" disabled={status === "enviando"}>
          {status === "enviando" ? "Enviando…" : "Enviar denúncia"}
        </button>
      </div>
    </form>
  );
}
