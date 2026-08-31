"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/client";
import { formatarTelefone } from "@/lib/mascaras";
import { Footer } from "@/components/footer";

type Status = "idle" | "enviando" | "sucesso" | "erro";

const TIPOS_SERVICO = [
  "Pintor",
  "Eletricista",
  "Encanador",
  "Instalacao de ar-condicionado",
  "Consorcio",
  "Financiamento",
  "Corretor de credito",
  "Seguro residencial",
  "Mudanca e frete",
  "Outro",
];

export function OferecerServicoForm() {
  const router = useRouter();
  const [tipo, setTipo] = useState(TIPOS_SERVICO[0]);
  const [nomeOutro, setNomeOutro] = useState("");
  const [contato, setContato] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [parceiroId, setParceiroId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("enviando");
    setErro(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/entrar");
      return;
    }

    const nome = tipo === "Outro" ? nomeOutro.trim() : tipo;

    const { data, error } = await supabase
      .from("parceiros_servico")
      .insert({
        profile_id: user.id,
        categoria: "comprador",
        nome,
        contato,
        ativo: true,
      })
      .select("id")
      .single();

    if (error) {
      setErro(error.message);
      setStatus("erro");
      return;
    }

    setParceiroId(data.id);
    setStatus("sucesso");
  }

  if (status === "sucesso") {
    return (
      <>
        <Nav active="/oferecer-servico" />
        <div className="wrap">
          <div style={{ maxWidth: 480, margin: "64px auto" }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div className="celebra-icone">✓</div>
              <span className="badge badge-primary">Serviço cadastrado</span>
              <h1 style={{ fontSize: 24, margin: "12px 0 4px" }}>
                {tipo === "Outro" ? nomeOutro : tipo} já está no diretório!
              </h1>
              <p className="muted">
                A partir de agora você aparece pra clientes que concluírem um
                negócio pela Rede Impulso.
              </p>
              <div className="flex gap-8 mt-16" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => router.push("/servicos")}
                >
                  Ver diretório de serviços
                </button>
                {parceiroId && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => router.push(`/servicos/${parceiroId}/destacar`)}
                  >
                    🚀 Destacar meu serviço
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav active="/oferecer-servico" />

      <div className="wrap">
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">Oferecer serviço</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
            Cadastre seu serviço na Rede Impulso
          </h1>
          <p className="muted">
            Clientes que concluírem um negócio pela plataforma veem seu
            serviço na lista de parceiros.
          </p>

          <form className="card mt-24" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="tipo">Tipo de serviço</label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                {TIPOS_SERVICO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <p className="hint">
                Consórcio, financiamento e corretagem de crédito também têm
                lugar aqui — não é só serviço de casa.
              </p>
            </div>
            {tipo === "Outro" && (
              <div className="field">
                <label htmlFor="nomeOutro">Qual serviço?</label>
                <input
                  type="text"
                  id="nomeOutro"
                  placeholder="Descreva o serviço"
                  value={nomeOutro}
                  onChange={(e) => setNomeOutro(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="contato">WhatsApp</label>
              <input
                type="tel"
                id="contato"
                placeholder="(98) 9 9999-9999"
                value={contato}
                onChange={(e) => setContato(formatarTelefone(e.target.value))}
                pattern="\(\d{2}\)\s?9\s?\d{4}-?\d{4}"
                title="Celular com DDD, ex: (98) 9 9999-9999"
                required
              />
            </div>

            {erro && (
              <p className="hint" style={{ color: "var(--coral)" }}>
                {erro}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block mt-16"
              disabled={status === "enviando"}
            >
              {status === "enviando" ? "Enviando…" : "Cadastrar serviço"}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
