"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/client";
import { formatarTelefone } from "@/lib/mascaras";
import { Footer } from "@/components/footer";

type Status = "idle" | "enviando" | "sucesso" | "erro";

export function OferecerServicoForm() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
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

    if (!user) {
      router.push("/entrar");
      return;
    }

    const { error } = await supabase.from("parceiros_servico").insert({
      profile_id: user.id,
      categoria: "comprador",
      nome,
      contato,
      ativo: true,
    });

    if (error) {
      setErro(error.message);
      setStatus("erro");
      return;
    }

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
                {nome} já está no diretório!
              </h1>
              <p className="muted">
                A partir de agora você aparece pra clientes que concluírem um
                negócio pela Rede Impulso.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm mt-16"
                onClick={() => router.push("/servicos")}
              >
                Ver diretório de serviços
              </button>
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
              <label htmlFor="nome">Tipo de serviço</label>
              <input
                type="text"
                id="nome"
                placeholder="Pintor, eletricista, encanador…"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
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
