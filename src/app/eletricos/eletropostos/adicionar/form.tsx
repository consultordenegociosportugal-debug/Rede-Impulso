"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/client";
import { LocalizacaoImovel } from "@/components/localizacao-imovel";

type Conector = "tipo2" | "ccs2" | "chademo" | "tesla" | "j1772";
type Status = "idle" | "enviando" | "erro";

const CONECTORES: { value: Conector; label: string }[] = [
  { value: "tipo2", label: "Tipo 2" },
  { value: "ccs2", label: "CCS2" },
  { value: "chademo", label: "CHAdeMO" },
  { value: "tesla", label: "Tesla" },
  { value: "j1772", label: "J1772" },
];

export function AdicionarEletropostoForm() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [operadora, setOperadora] = useState("");
  const [potenciaKw, setPotenciaKw] = useState("");
  const [precoKwh, setPrecoKwh] = useState("");
  const [conectores, setConectores] = useState<Conector[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);

  function alternarConector(item: Conector) {
    setConectores((atual) =>
      atual.includes(item) ? atual.filter((c) => c !== item) : [...atual, item],
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
      router.push("/entrar?depois=/eletricos/eletropostos/adicionar");
      return;
    }

    const { error } = await supabase.from("ev_eletropostos").insert({
      criado_por: user.id,
      nome,
      endereco,
      cidade,
      estado: estado.toUpperCase(),
      operadora: operadora || null,
      potencia_kw: potenciaKw ? Number(potenciaKw) : null,
      preco_kwh: precoKwh ? Number(precoKwh) : null,
      conectores,
      observacoes: observacoes || null,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
    });

    if (error) {
      setErro(error.message);
      setStatus("erro");
      return;
    }

    router.push("/eletricos/eletropostos");
  }

  return (
    <>
      <Nav active="/eletricos/eletropostos" />

      <div className="wrap">
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">Recarga</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Cadastrar eletroposto</h1>
          <p className="muted mb-16">Ajude a comunidade a encontrar onde carregar.</p>

          <form className="card mt-16" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="nome">Nome do local</label>
              <input
                type="text"
                id="nome"
                placeholder="Shopping da Ilha"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="endereco">Endereço</label>
              <input
                type="text"
                id="endereco"
                placeholder="Av. dos Holandeses, 1000"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="cidade">Cidade</label>
                <input
                  type="text"
                  id="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  required
                />
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
            <LocalizacaoImovel coords={coords} onChange={setCoords} />

            <div className="field">
              <label htmlFor="operadora">
                Operadora{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <input
                type="text"
                id="operadora"
                placeholder="EDP, Ipiranga, ZLET…"
                value={operadora}
                onChange={(e) => setOperadora(e.target.value)}
              />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="potencia">
                  Potência (kW){" "}
                  <span className="muted" style={{ fontWeight: 400 }}>
                    (opcional)
                  </span>
                </label>
                <input
                  type="number"
                  id="potencia"
                  value={potenciaKw}
                  onChange={(e) => setPotenciaKw(e.target.value)}
                  min={0}
                />
              </div>
              <div className="field">
                <label htmlFor="preco">
                  Preço por kWh{" "}
                  <span className="muted" style={{ fontWeight: 400 }}>
                    (opcional)
                  </span>
                </label>
                <input
                  type="number"
                  id="preco"
                  step="0.01"
                  value={precoKwh}
                  onChange={(e) => setPrecoKwh(e.target.value)}
                  min={0}
                />
              </div>
            </div>
            <div className="field">
              <label>
                Conectores{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
                {CONECTORES.map((c) => {
                  const ativo = conectores.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      className={ativo ? "badge badge-primary" : "badge badge-outline"}
                      style={{ cursor: "pointer", border: "none" }}
                      onClick={() => alternarConector(c.value)}
                    >
                      {ativo ? "✓ " : "+ "}
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="field">
              <label htmlFor="observacoes">
                Observações{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <textarea
                id="observacoes"
                placeholder="Horário de funcionamento, se precisa de app específico…"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
              />
            </div>

            {erro && (
              <p className="hint" style={{ color: "var(--coral)" }}>
                {erro}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block mt-16" disabled={status === "enviando"}>
              {status === "enviando" ? "Cadastrando…" : "Cadastrar eletroposto"}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
