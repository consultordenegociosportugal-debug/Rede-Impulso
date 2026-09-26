"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/client";

type Tipo = "eletrico" | "hibrido" | "hibrido_plugin";
type Condicao = "novo" | "seminovo" | "usado";
type Status = "idle" | "enviando" | "sucesso" | "erro";

const TIPOS: { value: Tipo; label: string }[] = [
  { value: "eletrico", label: "100% elétrico" },
  { value: "hibrido", label: "Híbrido" },
  { value: "hibrido_plugin", label: "Híbrido plug-in" },
];

const CONDICOES: { value: Condicao; label: string }[] = [
  { value: "novo", label: "Novo (0 km)" },
  { value: "seminovo", label: "Seminovo" },
  { value: "usado", label: "Usado" },
];

export function PublicarVeiculoForm() {
  const router = useRouter();
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [km, setKm] = useState("");
  const [preco, setPreco] = useState("");
  const [tipo, setTipo] = useState<Tipo>("eletrico");
  const [condicao, setCondicao] = useState<Condicao>("usado");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [descricao, setDescricao] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
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
      router.push("/entrar?depois=/eletricos/veiculos/publicar");
      return;
    }

    const { data: veiculo, error } = await supabase
      .from("ev_veiculos")
      .insert({
        vendedor_id: user.id,
        marca,
        modelo,
        ano: Number(ano),
        km: km ? Number(km) : null,
        preco: preco ? Number(preco) : null,
        tipo,
        condicao,
        cidade,
        estado: estado.toUpperCase(),
        descricao: descricao || null,
      })
      .select("id")
      .single();

    if (error || !veiculo) {
      setErro(error?.message ?? "Não foi possível publicar o anúncio.");
      setStatus("erro");
      return;
    }

    for (let i = 0; i < fotos.length; i++) {
      const arquivo = fotos[i];
      const caminho = `${user.id}/${veiculo.id}/${i}-${arquivo.name}`;
      const { error: uploadError } = await supabase.storage
        .from("ev-veiculo-fotos")
        .upload(caminho, arquivo);

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("ev-veiculo-fotos").getPublicUrl(caminho);
        await supabase
          .from("ev_veiculo_fotos")
          .insert({ veiculo_id: veiculo.id, arquivo_url: publicUrl, ordem: i });
      }
    }

    router.push(`/eletricos/veiculos/${veiculo.id}`);
  }

  return (
    <>
      <Nav active="/eletricos/veiculos" />

      <div className="wrap">
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">Anunciar veículo</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
            Publique seu elétrico ou híbrido
          </h1>
          <p className="muted mb-16">Preencha os dados abaixo para entrar na vitrine.</p>

          <form className="card mt-16" onSubmit={handleSubmit}>
            <div className="segmented mb-16">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={tipo === t.value ? "active" : undefined}
                  onClick={() => setTipo(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="marca">Marca</label>
                <input
                  type="text"
                  id="marca"
                  placeholder="BYD"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="modelo">Modelo</label>
                <input
                  type="text"
                  id="modelo"
                  placeholder="Dolphin"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="ano">Ano</label>
                <input
                  type="number"
                  id="ano"
                  placeholder="2024"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  min={1990}
                  max={2100}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="km">Quilometragem</label>
                <input
                  type="number"
                  id="km"
                  placeholder="0"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  min={0}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="condicao">Condição</label>
              <select id="condicao" value={condicao} onChange={(e) => setCondicao(e.target.value as Condicao)}>
                {CONDICOES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="preco">
                Preço{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <input
                type="number"
                id="preco"
                placeholder="180000"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                min={0}
              />
            </div>

            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="cidade">Cidade</label>
                <input
                  type="text"
                  id="cidade"
                  placeholder="São Luís"
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
                  placeholder="MA"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  maxLength={2}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="descricao">
                Descrição{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <textarea
                id="descricao"
                placeholder="Autonomia, estado de conservação, itens inclusos…"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
              />
            </div>

            <div className="field">
              <label htmlFor="fotos">
                Fotos{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <input
                type="file"
                id="fotos"
                accept="image/*"
                multiple
                onChange={(e) => setFotos(Array.from(e.target.files ?? []))}
              />
              {fotos.length > 0 && (
                <p className="hint">
                  {fotos.length} foto{fotos.length > 1 ? "s" : ""} selecionada
                  {fotos.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {erro && (
              <p className="hint" style={{ color: "var(--coral)" }}>
                {erro}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block mt-16" disabled={status === "enviando"}>
              {status === "enviando" ? "Publicando…" : "Publicar anúncio"}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
