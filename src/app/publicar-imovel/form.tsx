"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/client";
import { Footer } from "@/components/footer";
import { LocalizacaoImovel } from "@/components/localizacao-imovel";
import { MelhorarTexto } from "@/components/melhorar-texto";
import { GerarDescricao } from "@/components/gerar-descricao";

type Finalidade = "venda" | "aluguel";
type Tipo = "apartamento" | "casa" | "kitnet" | "terreno" | "comercial" | "outro";
type Status = "idle" | "enviando" | "sucesso" | "erro";

const TIPOS: { value: Tipo; label: string }[] = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "kitnet", label: "Kitnet" },
  { value: "terreno", label: "Terreno" },
  { value: "comercial", label: "Comercial" },
  { value: "outro", label: "Outro" },
];

const COMODIDADES = [
  "Piscina",
  "Churrasqueira",
  "Ar condicionado",
  "Mobiliado",
  "Portaria 24h",
  "Elevador",
  "Área de serviço",
  "Aceita animais",
];

const TOTAL_PASSOS = 3;

export function PublicarImovelForm() {
  const router = useRouter();
  const [passo, setPasso] = useState(1);
  const [finalidade, setFinalidade] = useState<Finalidade>("venda");
  const [tipo, setTipo] = useState<Tipo>("apartamento");
  const [titulo, setTitulo] = useState("");
  const [quartos, setQuartos] = useState("");
  const [banheiros, setBanheiros] = useState("");
  const [vagas, setVagas] = useState("");
  const [areaM2, setAreaM2] = useState("");
  const [comodidades, setComodidades] = useState<string[]>([]);
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [imovelId, setImovelId] = useState<string | null>(null);
  const [fotos, setFotos] = useState<File[]>([]);

  function alternarComodidade(item: string) {
    setComodidades((atual) =>
      atual.includes(item) ? atual.filter((c) => c !== item) : [...atual, item],
    );
  }

  function avancar() {
    if (passo === 1 && (!titulo || !bairro || !cidade)) {
      setErro("Preencha título, bairro e cidade para continuar.");
      return;
    }
    setErro(null);
    setPasso((p) => Math.min(p + 1, TOTAL_PASSOS));
  }

  function voltar() {
    setErro(null);
    setPasso((p) => Math.max(p - 1, 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (passo < TOTAL_PASSOS) {
      avancar();
      return;
    }

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

    const { data: imovel, error } = await supabase
      .from("imoveis")
      .insert({
        vendedor_id: user.id,
        titulo,
        bairro,
        cidade,
        descricao: descricao || null,
        preco: preco ? Number(preco) : null,
        finalidade,
        tipo,
        quartos: quartos ? Number(quartos) : null,
        banheiros: banheiros ? Number(banheiros) : null,
        vagas: vagas ? Number(vagas) : null,
        area_m2: areaM2 ? Number(areaM2) : null,
        comodidades,
        status: "publicado",
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      })
      .select("id")
      .single();

    if (error) {
      setErro(error.message);
      setStatus("erro");
      return;
    }

    for (let i = 0; i < fotos.length; i++) {
      const arquivo = fotos[i];
      const caminho = `${user.id}/${imovel.id}/${i}-${arquivo.name}`;
      const { error: uploadError } = await supabase.storage
        .from("imovel-fotos")
        .upload(caminho, arquivo);

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("imovel-fotos").getPublicUrl(caminho);
        await supabase
          .from("imovel_fotos")
          .insert({ imovel_id: imovel.id, arquivo_url: publicUrl, ordem: i });
      }
    }

    await supabase.rpc("gerar_sugestoes_corretor", { p_imovel_id: imovel.id });

    setImovelId(imovel.id);
    setStatus("sucesso");
  }

  if (status === "sucesso") {
    return (
      <>
        <Nav active="/publicar-imovel" />
        <div className="wrap">
          <div style={{ maxWidth: 480, margin: "64px auto" }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div className="celebra-icone">✓</div>
              <span className="badge badge-primary">Imóvel publicado</span>
              <h1 style={{ fontSize: 24, margin: "12px 0 4px" }}>
                {titulo} já está na vitrine!
              </h1>
              <p className="muted">
                A partir de agora, qualquer pessoa buscando por perto pode
                encontrar seu anúncio — e corretores da região já foram
                notificados.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm mt-16"
                onClick={() =>
                  router.push(`/sugestao-corretores?imovel_id=${imovelId}`)
                }
              >
                Ver corretores sugeridos →
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm mt-8"
                onClick={() => router.push("/painel-negocios")}
              >
                Ver meus negócios
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
      <Nav active="/publicar-imovel" />

      <div className="wrap">
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">Publicar imóvel</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
            Anuncie seu imóvel na vitrine
          </h1>
          <p className="muted mb-16">
            {passo === 1 && "Sobre o imóvel"}
            {passo === 2 && "Preço e fotos"}
            {passo === 3 && "Localização e confirmação"}
          </p>

          <div className="progresso-etapas">
            {Array.from({ length: TOTAL_PASSOS }, (_, i) => (
              <div key={i} className={`seg ${i < passo ? "done" : ""}`} />
            ))}
          </div>

          <form className="card mt-16" onSubmit={handleSubmit}>
            {passo === 1 && (
              <>
                <div className="segmented mb-16">
                  <button
                    type="button"
                    className={finalidade === "venda" ? "active" : undefined}
                    onClick={() => setFinalidade("venda")}
                  >
                    Vender
                  </button>
                  <button
                    type="button"
                    className={finalidade === "aluguel" ? "active" : undefined}
                    onClick={() => setFinalidade("aluguel")}
                  >
                    Alugar
                  </button>
                </div>
                <div className="field">
                  <label htmlFor="tipo">Tipo do imóvel</label>
                  <select
                    id="tipo"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as Tipo)}
                  >
                    {TIPOS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="titulo">Título do anúncio</label>
                  <input
                    type="text"
                    id="titulo"
                    placeholder="Apartamento 3 quartos"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-2">
                  <div className="field">
                    <label htmlFor="bairro">Bairro</label>
                    <input
                      type="text"
                      id="bairro"
                      placeholder="Jóquei"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      required
                    />
                  </div>
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
                </div>
              </>
            )}

            {passo === 2 && (
              <>
                <div className="field">
                  <label htmlFor="preco">
                    {finalidade === "venda" ? "Preço de venda" : "Valor do aluguel (mensal)"}
                  </label>
                  <input
                    type="number"
                    id="preco"
                    placeholder="450000"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    min={0}
                  />
                </div>
                {tipo !== "terreno" && (
                  <div className="grid grid-3">
                    <div className="field">
                      <label htmlFor="quartos">Quartos</label>
                      <input
                        type="number"
                        id="quartos"
                        placeholder="2"
                        value={quartos}
                        onChange={(e) => setQuartos(e.target.value)}
                        min={0}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="banheiros">Banheiros</label>
                      <input
                        type="number"
                        id="banheiros"
                        placeholder="1"
                        value={banheiros}
                        onChange={(e) => setBanheiros(e.target.value)}
                        min={0}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="vagas">Vagas</label>
                      <input
                        type="number"
                        id="vagas"
                        placeholder="1"
                        value={vagas}
                        onChange={(e) => setVagas(e.target.value)}
                        min={0}
                      />
                    </div>
                  </div>
                )}
                <div className="field">
                  <label htmlFor="areaM2">
                    Área{" "}
                    <span className="muted" style={{ fontWeight: 400 }}>
                      (m², opcional)
                    </span>
                  </label>
                  <input
                    type="number"
                    id="areaM2"
                    placeholder="65"
                    value={areaM2}
                    onChange={(e) => setAreaM2(e.target.value)}
                    min={0}
                  />
                </div>
                <div className="field">
                  <label>
                    Comodidades{" "}
                    <span className="muted" style={{ fontWeight: 400 }}>
                      (opcional)
                    </span>
                  </label>
                  <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
                    {COMODIDADES.map((item) => {
                      const ativo = comodidades.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          className={ativo ? "badge badge-primary" : "badge badge-outline"}
                          style={{ cursor: "pointer", border: "none" }}
                          onClick={() => alternarComodidade(item)}
                        >
                          {ativo ? "✓ " : "+ "}
                          {item}
                        </button>
                      );
                    })}
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
                    placeholder="Detalhes do imóvel, condições, diferenciais…"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={4}
                  />
                  {descricao.trim() ? (
                    <MelhorarTexto texto={descricao} onAplicar={setDescricao} />
                  ) : (
                    <GerarDescricao
                      dados={{
                        finalidade,
                        tipo,
                        bairro,
                        cidade,
                        quartos: quartos ? Number(quartos) : undefined,
                        banheiros: banheiros ? Number(banheiros) : undefined,
                        vagas: vagas ? Number(vagas) : undefined,
                        areaM2: areaM2 ? Number(areaM2) : undefined,
                        comodidades,
                        preco: preco ? Number(preco) : undefined,
                      }}
                      onAplicar={setDescricao}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="fotos">
                    Fotos do imóvel{" "}
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
              </>
            )}

            {passo === 3 && (
              <>
                <LocalizacaoImovel coords={coords} onChange={setCoords} />
                <div className="card-flat" style={{ fontSize: 13.5 }}>
                  <strong>{titulo}</strong>
                  <div className="muted">
                    {TIPOS.find((t) => t.value === tipo)?.label} · {bairro},{" "}
                    {cidade} · {finalidade === "venda" ? "venda" : "aluguel"}
                    {preco ? ` · R$ ${preco}` : ""}
                    {quartos ? ` · ${quartos}q` : ""}
                  </div>
                </div>
              </>
            )}

            {erro && (
              <p className="hint" style={{ color: "var(--coral)" }}>
                {erro}
              </p>
            )}

            <div className="flex gap-8 mt-16">
              {passo > 1 && (
                <button type="button" className="btn btn-ghost" onClick={voltar}>
                  ← Voltar
                </button>
              )}
              {passo < TOTAL_PASSOS ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={avancar}
                >
                  Continuar →
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={status === "enviando"}
                >
                  {status === "enviando" ? "Publicando…" : "Publicar imóvel"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
