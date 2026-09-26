"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "enviando" | "erro";

const ESPECIALIDADES_SUGERIDAS = ["Bateria", "Eletrônica embarcada", "Mecânica geral", "Funilaria/pintura", "Pneus e suspensão"];

export function CadastrarOficinaForm() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [telefone, setTelefone] = useState("");
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [atendeMarcas, setAtendeMarcas] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);

  function alternarEspecialidade(item: string) {
    setEspecialidades((atual) =>
      atual.includes(item) ? atual.filter((e) => e !== item) : [...atual, item],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("enviando");
    setErro(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/entrar?depois=/eletricos/oficinas/cadastrar");
      return;
    }

    const { error } = await supabase.from("ev_oficinas").insert({
      criado_por: user.id,
      nome,
      endereco: endereco || null,
      cidade,
      estado: estado.toUpperCase(),
      telefone: telefone || null,
      especialidades,
      atende_marcas: atendeMarcas
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
      descricao: descricao || null,
    });

    if (error) {
      setErro(error.message);
      setStatus("erro");
      return;
    }

    router.push("/eletricos/oficinas");
  }

  return (
    <>
      <Nav active="/eletricos/oficinas" />

      <div className="wrap">
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">Assistência técnica</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Cadastrar oficina</h1>
          <p className="muted mb-16">Ajude outros donos de elétrico a encontrar assistência de confiança.</p>

          <form className="card mt-16" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="nome">Nome da oficina</label>
              <input type="text" id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="endereco">
                Endereço{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <input type="text" id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="cidade">Cidade</label>
                <input type="text" id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="estado">UF</label>
                <input
                  type="text"
                  id="estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  maxLength={2}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="telefone">
                Telefone/WhatsApp{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <input
                type="tel"
                id="telefone"
                placeholder="98999999999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
            <div className="field">
              <label>
                Especialidades{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
                {ESPECIALIDADES_SUGERIDAS.map((item) => {
                  const ativo = especialidades.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      className={ativo ? "badge badge-primary" : "badge badge-outline"}
                      style={{ cursor: "pointer", border: "none" }}
                      onClick={() => alternarEspecialidade(item)}
                    >
                      {ativo ? "✓ " : "+ "}
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="field">
              <label htmlFor="marcas">
                Marcas atendidas{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional, separe por vírgula)
                </span>
              </label>
              <input
                type="text"
                id="marcas"
                placeholder="BYD, Tesla, Volvo"
                value={atendeMarcas}
                onChange={(e) => setAtendeMarcas(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="descricao">
                Descrição{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
            </div>

            {erro && (
              <p className="hint" style={{ color: "var(--coral)" }}>
                {erro}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block mt-16" disabled={status === "enviando"}>
              {status === "enviando" ? "Cadastrando…" : "Cadastrar oficina"}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
