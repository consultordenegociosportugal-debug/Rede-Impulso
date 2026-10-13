"use client";

import { useState } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "enviando" | "sucesso" | "erro";

export default function DireitosAutoraisPage() {
  const [urlConteudo, setUrlConteudo] = useState("");
  const [descricaoObra, setDescricaoObra] = useState("");
  const [titularNome, setTitularNome] = useState("");
  const [titularEmail, setTitularEmail] = useState("");
  const [detalhes, setDetalhes] = useState("");
  const [declaracaoBoaFe, setDeclaracaoBoaFe] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("enviando");
    setErro(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("denuncias_direitos_autorais").insert({
      url_conteudo: urlConteudo.trim(),
      descricao_obra: descricaoObra.trim(),
      titular_nome: titularNome.trim(),
      titular_email: titularEmail.trim(),
      detalhes: detalhes.trim() || null,
      declaracao_boa_fe: declaracaoBoaFe,
      denunciante_id: user?.id ?? null,
    });

    if (error) {
      setErro("Não foi possível enviar sua notificação agora. Tente de novo em instantes.");
      setStatus("erro");
      return;
    }

    setStatus("sucesso");
  }

  if (status === "sucesso") {
    return (
      <>
        <Nav active="/direitos-autorais" />
        <div className="wrap">
          <div style={{ maxWidth: 560, margin: "64px auto" }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div className="celebra-icone">✓</div>
              <span className="badge badge-primary">Notificação recebida</span>
              <h1 style={{ fontSize: 22, margin: "12px 0 4px" }}>
                Vamos analisar sua notificação
              </h1>
              <p className="muted">
                Nossa equipe revisa o conteúdo indicado e, se procedente, remove
                o material do ar. Se você informou um e-mail, podemos entrar em
                contato para mais detalhes.
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav active="/direitos-autorais" />

      <div className="wrap">
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">Direitos autorais</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
            Notificar violação de direitos autorais
          </h1>
          <p className="muted">
            Se você é titular de direitos autorais (ou representa o titular) e
            encontrou na Rede Impulso um conteúdo — foto, texto ou outro
            material — publicado sem autorização, use este canal para nos
            notificar. Você não precisa ter conta na plataforma para denunciar.
          </p>

          <form className="card mt-16" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="urlConteudo">Link do conteúdo denunciado</label>
              <input
                type="url"
                id="urlConteudo"
                placeholder="https://rede-impulso.vercel.app/imoveis/..."
                value={urlConteudo}
                onChange={(e) => setUrlConteudo(e.target.value)}
                required
              />
              <p className="hint">Cole o endereço exato da página com o conteúdo.</p>
            </div>
            <div className="field">
              <label htmlFor="descricaoObra">Descrição da obra protegida</label>
              <textarea
                id="descricaoObra"
                placeholder="O que é a obra original, e onde ela foi publicada primeiro"
                value={descricaoObra}
                onChange={(e) => setDescricaoObra(e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="titularNome">Seu nome (ou da empresa)</label>
                <input
                  type="text"
                  id="titularNome"
                  value={titularNome}
                  onChange={(e) => setTitularNome(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="titularEmail">Seu e-mail de contato</label>
                <input
                  type="email"
                  id="titularEmail"
                  value={titularEmail}
                  onChange={(e) => setTitularEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="detalhes">
                Detalhes adicionais{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <textarea
                id="detalhes"
                value={detalhes}
                onChange={(e) => setDetalhes(e.target.value)}
                rows={3}
              />
            </div>

            <label className="hint" style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={declaracaoBoaFe}
                onChange={(e) => setDeclaracaoBoaFe(e.target.checked)}
                style={{ marginTop: 2 }}
                required
              />
              <span>
                Declaro, de boa-fé, que sou o titular dos direitos autorais
                descritos acima (ou estou autorizado a agir em seu nome) e que
                as informações desta notificação são verdadeiras.
              </span>
            </label>

            {erro && (
              <p className="hint" style={{ color: "var(--coral)" }}>
                {erro}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block mt-16"
              disabled={status === "enviando" || !declaracaoBoaFe}
            >
              {status === "enviando" ? "Enviando…" : "Enviar notificação"}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
