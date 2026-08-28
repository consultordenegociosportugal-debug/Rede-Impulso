"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/client";
import { CameraCapture } from "./camera-capture";
import { Footer } from "@/components/footer";

type ImovelProximo = {
  id: string;
  titulo: string;
  bairro: string;
  cidade: string;
  preco: number | null;
  finalidade: "venda" | "aluguel";
};

type AnaliseIA = {
  tipo_construcao: string;
  padrao: string;
  estado_aparente: string;
  caracteristicas: string[];
  descricao_completa: string;
};

type Status =
  | "aguardando_foto"
  | "obtendo_localizacao"
  | "analisando"
  | "encontrados"
  | "sem_resultado"
  | "erro";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const PLATAFORMAS = [
  { nome: "OLX", dominio: "olx.com.br" },
  { nome: "ZAP Imóveis", dominio: "zapimoveis.com.br" },
  { nome: "Viva Real", dominio: "vivareal.com.br" },
  { nome: "QuintoAndar", dominio: "quintoandar.com.br" },
];

function arquivoParaBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = leitor.result as string;
      const base64 = resultado.split(",")[1] ?? "";
      resolve({ base64, mediaType: file.type || "image/jpeg" });
    };
    leitor.onerror = reject;
    leitor.readAsDataURL(file);
  });
}

async function buscarEndereco(
  lat: number,
  lng: number,
): Promise<{ enderecoCompleto: string; bairro: string; cidade: string } | null> {
  const chave = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!chave) return null;

  try {
    const resposta = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${chave}&language=pt-BR`,
    );
    const dados = await resposta.json();
    const resultado = dados.results?.[0];
    if (!resultado) return null;

    const componentes: { long_name: string; types: string[] }[] = resultado.address_components ?? [];
    const bairro =
      componentes.find((c) => c.types.includes("sublocality") || c.types.includes("neighborhood"))
        ?.long_name ?? "";
    const cidade =
      componentes.find((c) => c.types.includes("administrative_area_level_2") || c.types.includes("locality"))
        ?.long_name ?? "";

    return { enderecoCompleto: resultado.formatted_address ?? "", bairro, cidade };
  } catch {
    return null;
  }
}

export default function FotoDoImovelPage() {
  const [status, setStatus] = useState<Status>("aguardando_foto");
  const [erro, setErro] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [imoveis, setImoveis] = useState<ImovelProximo[]>([]);

  const [endereco, setEndereco] = useState<{ enderecoCompleto: string; bairro: string; cidade: string } | null>(
    null,
  );
  const [analiseIA, setAnaliseIA] = useState<AnaliseIA | null>(null);
  const [analiseIndisponivel, setAnaliseIndisponivel] = useState(false);

  const [finalidade, setFinalidade] = useState<"venda" | "aluguel">("venda");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [interesseEnviado, setInteresseEnviado] = useState(false);
  const [precisaLogin, setPrecisaLogin] = useState(false);

  function handleFoto(file: File | null) {
    setFoto(file);
    setFotoPreview(file ? URL.createObjectURL(file) : null);
    if (!file) return;

    setStatus("obtendo_localizacao");
    setErro(null);
    setAnaliseIA(null);
    setAnaliseIndisponivel(false);
    setEndereco(null);

    if (!navigator.geolocation) {
      setErro("Seu navegador não suporta geolocalização.");
      setStatus("erro");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ lat, lng });
        setStatus("analisando");

        const supabase = createClient();
        const enderecoPromise = buscarEndereco(lat, lng);

        const [rpcResultado, enderecoResultado, analiseResultado] = await Promise.all([
          supabase.rpc("imoveis_proximos", { p_lat: lat, p_lng: lng, p_raio_metros: 150 }),
          enderecoPromise,
          (async () => {
            try {
              const [{ base64, mediaType }, enderecoResolvido] = await Promise.all([
                arquivoParaBase64(file),
                enderecoPromise,
              ]);
              const resp = await fetch("/api/identificar-imovel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  imagemBase64: base64,
                  mediaType,
                  endereco: enderecoResolvido?.enderecoCompleto ?? null,
                }),
              });
              if (!resp.ok) return null;
              const dados = await resp.json();
              return dados.analise as AnaliseIA;
            } catch {
              return null;
            }
          })(),
        ]);

        setEndereco(enderecoResultado);

        if (analiseResultado) {
          setAnaliseIA(analiseResultado);
        } else {
          setAnaliseIndisponivel(true);
        }

        const { data, error } = rpcResultado;
        if (error) {
          setErro(error.message);
          setStatus("erro");
          return;
        }

        const encontrados = (data ?? []) as ImovelProximo[];
        if (encontrados.length > 0) {
          setImoveis(encontrados);
          setStatus("encontrados");
        } else {
          setStatus("sem_resultado");
        }
      },
      (geoError) => {
        setErro(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Você precisa permitir o acesso à localização para usar esse recurso."
            : "Não foi possível obter sua localização.",
        );
        setStatus("erro");
      },
    );
  }

  async function handleRegistrarInteresse(e: React.FormEvent) {
    e.preventDefault();
    if (!coords) return;
    setEnviando(true);
    setErro(null);
    setPrecisaLogin(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPrecisaLogin(true);
      setEnviando(false);
      return;
    }

    let fotoUrl: string | null = null;
    if (foto) {
      const caminho = `${user.id}/${Date.now()}-${foto.name}`;
      const { error: uploadError } = await supabase.storage
        .from("manifestacoes-fotos")
        .upload(caminho, foto);
      if (!uploadError) {
        fotoUrl = caminho;
      }
    }

    const { error } = await supabase.from("manifestacoes_interesse").insert({
      interessado_id: user.id,
      finalidade,
      latitude: coords.lat,
      longitude: coords.lng,
      endereco_aproximado: endereco?.enderecoCompleto ?? null,
      foto_url: fotoUrl,
    });

    setEnviando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setInteresseEnviado(true);
  }

  const buscaTexto = endereco?.bairro
    ? `${endereco.bairro} ${endereco.cidade}`.trim()
    : (endereco?.cidade ?? "");

  return (
    <>
      <Nav active="/foto-do-imovel" />

      <div className="wrap">
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">Buscar por foto</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
            Viu um imóvel que te interessou?
          </h1>
          <p className="muted">
            Tire uma foto do prédio ou da fachada — nossa IA descreve o imóvel
            e usamos sua localização no momento da foto pra ver se ele já
            está anunciado na Rede Impulso ou em outras plataformas.
          </p>

          {status === "aguardando_foto" && (
            <div className="mt-24">
              <CameraCapture onFoto={handleFoto} />
            </div>
          )}

          {fotoPreview && status !== "aguardando_foto" && (
            <div
              className="mt-24"
              style={{
                aspectRatio: "16 / 10",
                borderRadius: "var(--radius)",
                backgroundImage: `url(${fotoPreview})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}

          {status === "obtendo_localizacao" && (
            <div className="card mt-16" style={{ textAlign: "center" }}>
              <p className="muted" style={{ margin: 0 }}>
                Obtendo sua localização…
              </p>
            </div>
          )}

          {status === "analisando" && (
            <div className="card mt-16" style={{ textAlign: "center" }}>
              <p className="muted" style={{ margin: 0 }}>
                Analisando a foto e buscando imóveis perto de você…
              </p>
            </div>
          )}

          {status === "erro" && (
            <div className="card mt-16" style={{ textAlign: "center" }}>
              <p className="hint" style={{ color: "var(--coral)", margin: 0 }}>
                {erro}
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm mt-12"
                onClick={() => {
                  setStatus("aguardando_foto");
                  setFoto(null);
                  setFotoPreview(null);
                }}
              >
                Tentar de novo
              </button>
            </div>
          )}

          {(status === "encontrados" || status === "sem_resultado") && (
            <div className="mt-16">
              {analiseIA && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <span className="eyebrow">🔬 O que nossa IA viu na foto</span>
                  <div className="flex gap-8 mt-8" style={{ flexWrap: "wrap" }}>
                    <span className="badge badge-primary">{analiseIA.tipo_construcao}</span>
                    <span className="badge badge-outline">{analiseIA.padrao}</span>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
                    {analiseIA.descricao_completa}
                  </p>
                  {analiseIA.caracteristicas?.length > 0 && (
                    <div className="flex gap-8 mt-8" style={{ flexWrap: "wrap" }}>
                      {analiseIA.caracteristicas.map((item) => (
                        <span key={item} className="badge badge-outline">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
                    Estado aparente: {analiseIA.estado_aparente}
                  </p>
                </div>
              )}

              {analiseIndisponivel && (
                <div className={"card"} style={{ background: "var(--surface-2)", marginBottom: 16 }}>
                  <p className="hint" style={{ margin: 0 }}>
                    Não conseguimos analisar a foto pela IA agora — o resultado
                    abaixo é só pela sua localização no momento da foto.
                  </p>
                </div>
              )}

              {status === "encontrados" ? (
                <>
                  <p className="muted">
                    Encontramos {imoveis.length} imóvel(is) publicado(s) na Rede
                    Impulso perto de você:
                  </p>
                  {imoveis.map((imovel) => (
                    <div key={imovel.id} className="card mt-12">
                      <span
                        className={`badge ${imovel.finalidade === "aluguel" ? "badge-amber" : "badge-primary"}`}
                      >
                        {imovel.finalidade === "aluguel" ? "Aluguel" : "Venda"}
                      </span>
                      <h3 style={{ marginTop: 8, fontSize: 17 }}>
                        {imovel.titulo}
                      </h3>
                      <p className="muted" style={{ margin: "2px 0 0" }}>
                        {imovel.bairro}, {imovel.cidade}
                      </p>
                      {imovel.preco != null && (
                        <p className="mono" style={{ marginTop: 8 }}>
                          {formatoMoeda.format(imovel.preco)}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="card" style={{ background: "var(--surface-2)" }}>
                  <p className="muted" style={{ margin: 0 }}>
                    Não encontramos nenhum imóvel publicado na Rede Impulso
                    nessa localização.
                  </p>
                  {!endereco && (
                    <p className="hint" style={{ marginTop: 8, marginBottom: 0 }}>
                      Localização: {coords?.lat.toFixed(5)}, {coords?.lng.toFixed(5)}
                    </p>
                  )}
                </div>
              )}

              <div className="card mt-16">
                <p style={{ fontWeight: 600, marginBottom: 4 }}>
                  Buscar esse imóvel em outras plataformas
                </p>
                <p className="hint" style={{ marginTop: 0 }}>
                  {endereco?.enderecoCompleto
                    ? `Perto de ${endereco.enderecoCompleto}`
                    : "Buscamos pelo endereço aproximado da foto."}
                </p>
                <div className="flex gap-8 mt-12" style={{ flexWrap: "wrap" }}>
                  {PLATAFORMAS.map((plataforma) => (
                    <a
                      key={plataforma.dominio}
                      href={`https://www.google.com/search?q=${encodeURIComponent(
                        `site:${plataforma.dominio} ${buscaTexto || `${coords?.lat},${coords?.lng}`}`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                    >
                      {plataforma.nome} ↗
                    </a>
                  ))}
                </div>
              </div>

              <div className="card mt-16" style={{ background: "var(--amber-tint)" }}>
                <p style={{ margin: 0, fontSize: 13.5 }}>
                  ⚠️ <strong>Se você encontrar esse imóvel em outro site,</strong>{" "}
                  ao entrar em contato com o anunciante mencione que conheceu
                  essa oportunidade através da Rede Impulso — é assim que
                  garantimos que corretores parceiros da nossa rede possam te
                  atender nessa negociação.
                </p>
              </div>

              {status === "sem_resultado" &&
                (interesseEnviado ? (
                  <div className="card mt-16" style={{ textAlign: "center" }}>
                    <span className="badge badge-primary">
                      Interesse registrado
                    </span>
                    <p className="muted" style={{ marginTop: 12 }}>
                      Assim que esse imóvel for publicado ou um corretor da
                      região tiver novidades, você vai saber.
                    </p>
                  </div>
                ) : (
                  <form className="card mt-16" onSubmit={handleRegistrarInteresse}>
                    <p style={{ fontWeight: 600, marginBottom: 12 }}>
                      Registrar interesse nesse imóvel
                    </p>
                    <div className="segmented mb-16">
                      <button
                        type="button"
                        className={finalidade === "venda" ? "active" : undefined}
                        onClick={() => setFinalidade("venda")}
                      >
                        Quero comprar
                      </button>
                      <button
                        type="button"
                        className={finalidade === "aluguel" ? "active" : undefined}
                        onClick={() => setFinalidade("aluguel")}
                      >
                        Quero alugar
                      </button>
                    </div>

                    {precisaLogin && (
                      <p className="hint" style={{ color: "var(--coral)" }}>
                        Você precisa{" "}
                        <Link href="/entrar" style={{ textDecoration: "underline" }}>
                          entrar
                        </Link>{" "}
                        ou{" "}
                        <Link
                          href="/cadastro-cliente"
                          style={{ textDecoration: "underline" }}
                        >
                          criar uma conta
                        </Link>{" "}
                        para registrar esse interesse.
                      </p>
                    )}
                    {erro && (
                      <p className="hint" style={{ color: "var(--coral)" }}>
                        {erro}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary btn-block mt-16"
                      disabled={enviando}
                    >
                      {enviando ? "Enviando…" : "Registrar interesse"}
                    </button>
                  </form>
                ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
