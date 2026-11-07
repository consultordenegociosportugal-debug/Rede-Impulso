"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { DocumentoTipo } from "@/lib/verificacao";

type DocumentoStatus = "pendente" | "em_analise" | "aprovado" | "rejeitado";

const LABELS: Record<DocumentoTipo, { titulo: string; hint: string; icone: string }> = {
  identidade: { titulo: "Documento de identidade", hint: "RG ou CNH", icone: "🪪" },
  creci: { titulo: "Comprovante do CRECI", hint: "Carteira ou certidão do CRECI", icone: "📋" },
};

// Mesma lista liberada no bucket documentos-verificacao (migração
// 0076) — SVG de propósito fora da lista de imagens aceitas: casa com
// accept="image/*" mas pode conter <script>.
const TIPOS_ACEITOS = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const TAMANHO_MAXIMO_DOCUMENTO = 10 * 1024 * 1024;

const STATUS_BADGE: Record<DocumentoStatus, { label: string; className: string }> = {
  pendente: { label: "Em fila de análise", className: "badge-primary" },
  em_analise: { label: "Em análise", className: "badge-amber" },
  aprovado: { label: "Aprovado", className: "badge-primary" },
  rejeitado: { label: "Rejeitado — reenvie", className: "badge-coral" },
};

export function VerificacaoForm({
  userId,
  tiposNecessarios,
  documentosExistentes,
  depois,
}: {
  userId: string;
  tiposNecessarios: DocumentoTipo[];
  documentosExistentes: { tipo: string; status: string }[];
  depois: string | null;
}) {
  const [status, setStatus] = useState<Record<string, "idle" | "enviando" | "erro">>({});
  const [enviados, setEnviados] = useState<Record<string, DocumentoStatus>>(() => {
    const map: Record<string, DocumentoStatus> = {};
    for (const doc of documentosExistentes) {
      map[doc.tipo] = doc.status as DocumentoStatus;
    }
    return map;
  });
  const [erro, setErro] = useState<string | null>(null);

  async function handleUpload(tipo: DocumentoTipo, file: File) {
    // accept="image/*,.pdf" no input é só uma dica da interface,
    // trivial de ignorar — sem checar de verdade aqui, qualquer
    // arquivo (inclusive um SVG com <script> embutido, que casa com
    // "image/*") virava um "documento de verificação", aberto depois
    // pelo admin na revisão.
    if (!TIPOS_ACEITOS.has(file.type)) {
      setErro("Envie uma imagem (JPG, PNG, WEBP) ou um PDF.");
      setStatus((s) => ({ ...s, [tipo]: "erro" }));
      return;
    }
    if (file.size > TAMANHO_MAXIMO_DOCUMENTO) {
      setErro("O arquivo precisa ter no máximo 10 MB.");
      setStatus((s) => ({ ...s, [tipo]: "erro" }));
      return;
    }

    setStatus((s) => ({ ...s, [tipo]: "enviando" }));
    setErro(null);

    const supabase = createClient();
    // eslint-disable-next-line react-hooks/purity -- inside an event handler, not render; needs a unique filename
    const caminho = `${userId}/${tipo}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("documentos-verificacao")
      .upload(caminho, file, { contentType: file.type });

    if (uploadError) {
      setErro(uploadError.message);
      setStatus((s) => ({ ...s, [tipo]: "erro" }));
      return;
    }

    const { error: insertError } = await supabase.from("documentos_verificacao").insert({
      profile_id: userId,
      tipo,
      arquivo_url: caminho,
    });

    if (insertError) {
      setErro(insertError.message);
      setStatus((s) => ({ ...s, [tipo]: "erro" }));
      return;
    }

    setEnviados((e) => ({ ...e, [tipo]: "pendente" }));
    setStatus((s) => ({ ...s, [tipo]: "idle" }));
  }

  return (
    <div className="card mt-24">
      {tiposNecessarios.map((tipo) => {
        const info = LABELS[tipo];
        const jaEnviado = enviados[tipo];
        const enviando = status[tipo] === "enviando";
        return (
          <div key={tipo} className="field">
            <label>{info.titulo}</label>
            {jaEnviado ? (
              <div className="upload-slot">
                <div className="ic">{info.icone}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{info.hint}</div>
                  <span className={`badge ${STATUS_BADGE[jaEnviado].className}`}>
                    {STATUS_BADGE[jaEnviado].label}
                  </span>
                </div>
                {jaEnviado === "rejeitado" && (
                  <label className="btn btn-ghost btn-sm" style={{ margin: 0 }}>
                    Reenviar
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.pdf"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(tipo, file);
                      }}
                    />
                  </label>
                )}
              </div>
            ) : (
              <label className="upload-slot" style={{ cursor: "pointer" }}>
                <div className="ic">{info.icone}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                    {enviando ? "Enviando…" : info.hint}
                  </div>
                  <div className="hint" style={{ margin: 0 }}>
                    Clique para escolher o arquivo
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.pdf"
                  style={{ display: "none" }}
                  disabled={enviando}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(tipo, file);
                  }}
                />
              </label>
            )}
          </div>
        );
      })}

      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}

      {depois && tiposNecessarios.every((tipo) => enviados[tipo] !== undefined) && (
        <Link href={depois} className="btn btn-primary btn-block mt-16">
          Continuar →
        </Link>
      )}
    </div>
  );
}
