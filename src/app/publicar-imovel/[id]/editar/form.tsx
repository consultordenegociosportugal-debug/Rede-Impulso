"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/client";
import { Footer } from "@/components/footer";
import { LocalizacaoImovel } from "@/components/localizacao-imovel";
import { MelhorarTexto } from "@/components/melhorar-texto";
import { GerarDescricao } from "@/components/gerar-descricao";
import styles from "./page.module.css";

type Finalidade = "venda" | "aluguel";
type Tipo = "apartamento" | "casa" | "kitnet" | "terreno" | "comercial" | "outro";
type Status = "idle" | "enviando" | "sucesso" | "erro";

export type ImovelEdicao = {
  id: string;
  vendedor_id: string;
  titulo: string;
  bairro: string;
  cidade: string;
  descricao: string | null;
  preco: number | null;
  finalidade: Finalidade;
  tipo: Tipo;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  area_m2: number | null;
  comodidades: string[];
  latitude: number | null;
  longitude: number | null;
  status: string;
};

export type FotoExistente = {
  id: string;
  arquivo_url: string;
  ordem: number;
};

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

const BUCKET = "imovel-fotos";
const FOTOS_RECOMENDADAS = 3;

// A URL pública do Supabase Storage é
// {projeto}/storage/v1/object/public/imovel-fotos/{vendedor}/{imovel}/{arquivo};
// para apagar o objeto precisamos do caminho relativo ao bucket de volta.
function caminhoDoArquivo(url: string): string | null {
  const marcador = `/${BUCKET}/`;
  const corte = url.indexOf(marcador);
  if (corte === -1) return null;
  return decodeURIComponent(url.slice(corte + marcador.length).split("?")[0]);
}

// Mantém a convenção `{indice}-{nome}` do fluxo de publicação, mas sem
// acento/espaço — nome de objeto no Storage aceita bem menos que um nome
// de arquivo do celular.
function nomeSeguro(nome: string) {
  const limpo = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  return limpo || "foto.jpg";
}

export function EditarImovelForm({
  imovel,
  fotosIniciais,
}: {
  imovel: ImovelEdicao;
  fotosIniciais: FotoExistente[];
}) {
  const router = useRouter();

  const [finalidade, setFinalidade] = useState<Finalidade>(imovel.finalidade);
  const [tipo, setTipo] = useState<Tipo>(imovel.tipo);
  const [titulo, setTitulo] = useState(imovel.titulo);
  const [quartos, setQuartos] = useState(imovel.quartos?.toString() ?? "");
  const [banheiros, setBanheiros] = useState(imovel.banheiros?.toString() ?? "");
  const [vagas, setVagas] = useState(imovel.vagas?.toString() ?? "");
  const [areaM2, setAreaM2] = useState(imovel.area_m2?.toString() ?? "");
  const [comodidades, setComodidades] = useState<string[]>(imovel.comodidades ?? []);
  const [bairro, setBairro] = useState(imovel.bairro);
  const [cidade, setCidade] = useState(imovel.cidade);
  const [descricao, setDescricao] = useState(imovel.descricao ?? "");
  const [preco, setPreco] = useState(imovel.preco?.toString() ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    imovel.latitude != null && imovel.longitude != null
      ? { lat: imovel.latitude, lng: imovel.longitude }
      : null,
  );
  const [fotos, setFotos] = useState<FotoExistente[]>(fotosIniciais);
  const [fotosOcupado, setFotosOcupado] = useState(false);
  const [erroFotos, setErroFotos] = useState<string | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);

  const etapas = [
    { chave: "dados", ok: Boolean(titulo && bairro && cidade), label: "dados básicos" },
    { chave: "preco", ok: Boolean(preco), label: "preço" },
    {
      chave: "fotos",
      ok: fotos.length >= FOTOS_RECOMENDADAS,
      label: `${FOTOS_RECOMENDADAS} fotos`,
    },
    { chave: "local", ok: coords !== null, label: "localização" },
  ];
  const pendentes = etapas.filter((e) => !e.ok);

  function alternarComodidade(item: string) {
    setComodidades((atual) =>
      atual.includes(item) ? atual.filter((c) => c !== item) : [...atual, item],
    );
  }

  // ---------- fotos ----------

  // Grava `ordem` = posição na lista para todas as fotos que mudaram de
  // lugar. A vitrine e a página do imóvel já ordenam por `ordem`, então a
  // primeira da lista vira a capa automaticamente.
  async function persistirOrdem(lista: FotoExistente[]) {
    const supabase = createClient();
    await Promise.all(
      lista.map(async (foto, indice) => {
        if (foto.ordem === indice) return;
        await supabase
          .from("imovel_fotos")
          .update({ ordem: indice })
          .eq("id", foto.id);
      }),
    );
  }

  async function reordenar(lista: FotoExistente[]) {
    setFotosOcupado(true);
    setErroFotos(null);
    await persistirOrdem(lista);
    setFotos(lista.map((foto, indice) => ({ ...foto, ordem: indice })));
    setFotosOcupado(false);
    router.refresh();
  }

  function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= fotos.length) return;
    const lista = [...fotos];
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    void reordenar(lista);
  }

  function tornarCapa(indice: number) {
    if (indice === 0) return;
    const lista = [...fotos];
    const [escolhida] = lista.splice(indice, 1);
    lista.unshift(escolhida);
    void reordenar(lista);
  }

  async function removerFoto(foto: FotoExistente) {
    if (
      !window.confirm(
        "Remover esta foto do anúncio? Essa ação não pode ser desfeita.",
      )
    ) {
      return;
    }

    setFotosOcupado(true);
    setErroFotos(null);
    const supabase = createClient();

    const caminho = caminhoDoArquivo(foto.arquivo_url);
    if (caminho) {
      await supabase.storage.from(BUCKET).remove([caminho]);
    }

    const { error } = await supabase.from("imovel_fotos").delete().eq("id", foto.id);

    if (error) {
      setErroFotos(`Não foi possível remover a foto: ${error.message}`);
      setFotosOcupado(false);
      return;
    }

    const restantes = fotos.filter((f) => f.id !== foto.id);
    await persistirOrdem(restantes);
    setFotos(restantes.map((f, indice) => ({ ...f, ordem: indice })));
    setFotosOcupado(false);
    router.refresh();
  }

  async function adicionarFotos(arquivos: File[]) {
    if (arquivos.length === 0) return;

    setFotosOcupado(true);
    setErroFotos(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/entrar?depois=/publicar-imovel/${imovel.id}/editar`);
      return;
    }

    const novas: FotoExistente[] = [];
    let falhas = 0;
    let proximaOrdem = fotos.length;

    for (const arquivo of arquivos) {
      const base = nomeSeguro(arquivo.name);
      let caminho = `${user.id}/${imovel.id}/${proximaOrdem}-${base}`;

      let { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, arquivo);

      // Um índice pode se repetir depois de remoções; nesse caso o objeto
      // antigo ainda ocupa o caminho, então tenta de novo com sufixo único.
      if (uploadError) {
        caminho = `${user.id}/${imovel.id}/${proximaOrdem}-${Date.now()}-${base}`;
        ({ error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(caminho, arquivo));
      }

      if (uploadError) {
        falhas += 1;
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

      const { data: linha, error: insertError } = await supabase
        .from("imovel_fotos")
        .insert({
          imovel_id: imovel.id,
          arquivo_url: publicUrl,
          ordem: proximaOrdem,
        })
        .select("id, arquivo_url, ordem")
        .single();

      if (insertError || !linha) {
        await supabase.storage.from(BUCKET).remove([caminho]);
        falhas += 1;
        continue;
      }

      novas.push(linha as FotoExistente);
      proximaOrdem += 1;
    }

    if (novas.length > 0) {
      setFotos((atual) => [...atual, ...novas]);
    }
    if (falhas > 0) {
      setErroFotos(
        `${falhas} foto${falhas > 1 ? "s não puderam" : " não pôde"} ser enviada${
          falhas > 1 ? "s" : ""
        }. Tente novamente com arquivos de imagem menores.`,
      );
    }
    setFotosOcupado(false);
    router.refresh();
  }

  // ---------- salvar ----------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!titulo.trim()) {
      setErro("O anúncio precisa de um título.");
      return;
    }
    if (!bairro.trim() || !cidade.trim()) {
      setErro("Preencha bairro e cidade — é assim que compradores encontram o imóvel.");
      return;
    }

    setStatus("enviando");
    setErro(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/entrar?depois=/publicar-imovel/${imovel.id}/editar`);
      return;
    }

    const { error } = await supabase
      .from("imoveis")
      .update({
        titulo: titulo.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        descricao: descricao || null,
        preco: preco ? Number(preco) : null,
        finalidade,
        tipo,
        quartos: quartos ? Number(quartos) : null,
        banheiros: banheiros ? Number(banheiros) : null,
        vagas: vagas ? Number(vagas) : null,
        area_m2: areaM2 ? Number(areaM2) : null,
        comodidades,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      })
      .eq("id", imovel.id);

    if (error) {
      setErro(error.message);
      setStatus("erro");
      return;
    }

    router.refresh();
    setStatus("sucesso");
  }

  if (status === "sucesso") {
    return (
      <>
        <Nav active="/painel-negocios" />
        <div className="wrap">
          <div style={{ maxWidth: 480, margin: "64px auto" }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div className="celebra-icone">✓</div>
              <span className="badge badge-primary">Anúncio atualizado</span>
              <h1 style={{ fontSize: 24, margin: "12px 0 4px" }}>
                {titulo} está com as informações novas!
              </h1>
              <p className="muted">
                Quem abrir seu anúncio a partir de agora já vê os dados e as
                fotos atualizados.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm mt-16"
                onClick={() => router.push(`/imoveis/${imovel.id}`)}
              >
                Ver anúncio →
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm mt-8"
                onClick={() => setStatus("idle")}
              >
                Continuar editando
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
      <Nav active="/painel-negocios" />

      <div className="wrap">
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0 80px" }}>
          <Link href={`/imoveis/${imovel.id}`} className="hint">
            ← Voltar para o anúncio
          </Link>

          <span className="eyebrow">Editar anúncio</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>{imovel.titulo}</h1>
          <p className="muted mb-16">
            Atualize os dados, troque as fotos e escolha a capa — tudo entra na
            vitrine na hora.
          </p>

          <div className="progresso-etapas">
            {etapas.map((etapa) => (
              <div key={etapa.chave} className={`seg ${etapa.ok ? "done" : ""}`} />
            ))}
          </div>
          <p className="hint">
            {pendentes.length === 0
              ? "Anúncio completo — é assim que ele aparece melhor na busca."
              : `Para um anúncio mais forte, falta: ${pendentes
                  .map((e) => e.label)
                  .join(", ")}.`}
          </p>

          {/* ---------- Fotos ---------- */}
          <div className="card mt-16">
            <div className="flex between items-center mb-12">
              <strong style={{ fontSize: 15 }}>Fotos do anúncio</strong>
              <span className="badge badge-outline">
                {fotos.length} foto{fotos.length === 1 ? "" : "s"}
              </span>
            </div>

            {fotos.length === 0 && (
              <p className="hint" style={{ marginTop: 0 }}>
                Este anúncio ainda não tem nenhuma foto. Anúncios com foto são
                muito mais procurados — comece adicionando a fachada.
              </p>
            )}

            <div className={styles.grade}>
              {fotos.map((foto, indice) => (
                <div
                  key={foto.id}
                  className={`${styles.foto} ${indice === 0 ? styles.fotoCapa : ""}`}
                  style={{ backgroundImage: `url(${foto.arquivo_url})` }}
                >
                  {indice === 0 && (
                    <span className={`badge badge-primary ${styles.selo}`}>Capa</span>
                  )}
                  <div className={styles.acoes}>
                    <button
                      type="button"
                      className={styles.acao}
                      onClick={() => mover(indice, -1)}
                      disabled={fotosOcupado || indice === 0}
                      aria-label="Mover foto para trás"
                      title="Mover para trás"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className={styles.acao}
                      onClick={() => mover(indice, 1)}
                      disabled={fotosOcupado || indice === fotos.length - 1}
                      aria-label="Mover foto para frente"
                      title="Mover para frente"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      className={styles.acao}
                      onClick={() => tornarCapa(indice)}
                      disabled={fotosOcupado || indice === 0}
                      aria-label="Usar esta foto como capa"
                      title="Usar como capa"
                    >
                      ★
                    </button>
                    <button
                      type="button"
                      className={`${styles.acao} ${styles.acaoRemover}`}
                      onClick={() => removerFoto(foto)}
                      disabled={fotosOcupado}
                      aria-label="Remover foto"
                      title="Remover foto"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}

              <label className={styles.adicionar}>
                <span className={styles.adicionarIcone}>＋</span>
                {fotosOcupado ? "Enviando…" : "Adicionar fotos"}
                <input
                  type="file"
                  className={styles.entradaArquivo}
                  accept="image/*"
                  multiple
                  disabled={fotosOcupado}
                  onChange={(e) => {
                    const arquivos = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    void adicionarFotos(arquivos);
                  }}
                />
              </label>
            </div>

            <p className="hint">
              A primeira foto é a capa — é ela que aparece na vitrine e nos
              favoritos. Use ← → para reordenar ou ★ para promover a capa.
            </p>

            {erroFotos && (
              <p className="hint" style={{ color: "var(--coral)" }}>
                {erroFotos}
              </p>
            )}
          </div>

          {/* ---------- Dados ---------- */}
          <form className="card mt-16" onSubmit={handleSubmit}>
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

            <div className="field">
              <label htmlFor="preco">
                {finalidade === "venda"
                  ? "Preço de venda"
                  : "Valor do aluguel (mensal)"}
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

            <LocalizacaoImovel coords={coords} onChange={setCoords} />

            {erro && (
              <p className="hint" style={{ color: "var(--coral)" }}>
                {erro}
              </p>
            )}

            <div className="flex gap-8 mt-16">
              <Link href={`/imoveis/${imovel.id}`} className="btn btn-ghost">
                Cancelar
              </Link>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={status === "enviando"}
              >
                {status === "enviando" ? "Salvando…" : "Salvar alterações"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
