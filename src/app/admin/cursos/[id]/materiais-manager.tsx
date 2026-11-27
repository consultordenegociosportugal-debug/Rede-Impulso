"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Material = { id: string; titulo: string; arquivo_url: string; ordem: number };

// Bucket privado (curso-materiais) — quem baixa precisa de matrícula
// não cancelada naquele curso, ou ser admin (ver migração 0087). Por
// isso o link de "Abrir" é um signed URL de alguns minutos, gerado na
// hora, não a URL pública que um bucket aberto teria.
export function MateriaisManager({ cursoId, materiais }: { cursoId: string; materiais: Material[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);

  async function enviarArquivo(e: React.FormEvent) {
    e.preventDefault();
    const arquivo = inputRef.current?.files?.[0];
    if (!titulo.trim() || !arquivo) {
      setErro("Dê um título e escolha o arquivo PDF.");
      return;
    }
    if (arquivo.type !== "application/pdf") {
      setErro("Só é aceito arquivo PDF.");
      return;
    }

    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const caminho = `${cursoId}/${Date.now()}-${arquivo.name.replace(/[^\w.\-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("curso-materiais")
      .upload(caminho, arquivo, { contentType: "application/pdf" });

    if (uploadError) {
      setEnviando(false);
      setErro("Não foi possível enviar o arquivo.");
      return;
    }

    const { error: insertError } = await supabase.from("curso_materiais").insert({
      curso_id: cursoId,
      titulo: titulo.trim(),
      arquivo_url: caminho,
      ordem: materiais.length,
    });

    setEnviando(false);

    if (insertError) {
      setErro("Arquivo enviado, mas não deu pra registrar. Tente de novo.");
      return;
    }

    setTitulo("");
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function abrir(material: Material) {
    setAbrindo(material.id);
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("curso-materiais")
      .createSignedUrl(material.arquivo_url, 300);
    setAbrindo(null);
    if (!error && data) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function remover(material: Material) {
    if (!confirm(`Remover o material "${material.titulo}"? Essa ação não pode ser desfeita.`)) return;

    setRemovendo(material.id);
    setErro(null);

    const supabase = createClient();
    // Apaga a linha primeiro: se isso falhar, o arquivo no storage
    // continua intacto e nada muda pra quem usa o curso. Se fosse ao
    // contrário (storage primeiro), uma falha no delete da linha deixava
    // um material "fantasma" apontando pra um arquivo que já não existe
    // mais — o botão "Abrir" quebrava sem nenhum aviso.
    const { error: deleteError } = await supabase.from("curso_materiais").delete().eq("id", material.id);
    if (deleteError) {
      setRemovendo(null);
      setErro("Não foi possível remover o material. Tente de novo.");
      return;
    }

    await supabase.storage.from("curso-materiais").remove([material.arquivo_url]);
    setRemovendo(null);
    router.refresh();
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Material em PDF</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Visível só pra quem tem matrícula não cancelada neste curso.
      </p>

      {materiais.length === 0 ? (
        <p className="muted" style={{ fontSize: 13.5 }}>Nenhum material enviado ainda.</p>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {materiais.map((m) => (
            <div key={m.id} className="list-row">
              <div className="flex between items-center" style={{ width: "100%", gap: 8 }}>
                <span style={{ fontSize: 14 }}>{m.titulo}</span>
                <div className="flex gap-8">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => abrir(m)}
                    disabled={abrindo === m.id}
                  >
                    {abrindo === m.id ? "…" : "Abrir"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => remover(m)}
                    disabled={removendo === m.id}
                  >
                    {removendo === m.id ? "…" : "Remover"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={enviarArquivo} className="flex gap-8" style={{ flexWrap: "wrap" }}>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título do material"
          style={{ flex: 1, minWidth: 160 }}
        />
        <input ref={inputRef} type="file" accept="application/pdf" />
        <button type="submit" className="btn btn-primary btn-sm" disabled={enviando}>
          {enviando ? "Enviando…" : "+ Enviar PDF"}
        </button>
      </form>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
