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

type Status =
  | "aguardando_foto"
  | "obtendo_localizacao"
  | "buscando"
  | "encontrados"
  | "sem_resultado"
  | "erro";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export default function FotoDoImovelPage() {
  const [status, setStatus] = useState<Status>("aguardando_foto");
  const [erro, setErro] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [imoveis, setImoveis] = useState<ImovelProximo[]>([]);

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
        setStatus("buscando");

        const supabase = createClient();
        const { data, error } = await supabase.rpc("imoveis_proximos", {
          p_lat: lat,
          p_lng: lng,
          p_raio_metros: 150,
        });

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
      foto_url: fotoUrl,
    });

    setEnviando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setInteresseEnviado(true);
  }

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
            Tire uma foto do prédio ou da fachada — usamos sua localização
            no momento da foto pra ver se esse imóvel já está anunciado na
            Rede Impulso.
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

          {status === "buscando" && (
            <div className="card mt-16" style={{ textAlign: "center" }}>
              <p className="muted" style={{ margin: 0 }}>
                Buscando imóveis perto de você…
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

          {status === "encontrados" && (
            <div className="mt-16">
              <div className={"card"} style={{ background: "var(--surface-2)", marginBottom: 16 }}>
                <p className="hint" style={{ margin: 0 }}>
                  🔬 Identificação visual do prédio pela foto está em
                  configuração — por enquanto, o resultado é pela sua
                  localização no momento da foto.
                </p>
              </div>
              <p className="muted">
                Encontramos {imoveis.length} imóvel(is) publicado(s) perto de
                você:
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
            </div>
          )}

          {status === "sem_resultado" && (
            <div className="mt-16">
              <div className="card" style={{ background: "var(--surface-2)" }}>
                <p className="muted" style={{ margin: 0 }}>
                  Não encontramos nenhum imóvel publicado nessa localização.
                </p>
                <p className="hint" style={{ marginTop: 8, marginBottom: 0 }}>
                  🔬 Identificação visual do prédio pela foto está em
                  configuração — buscamos pela sua localização no momento da
                  foto: {coords?.lat.toFixed(5)}, {coords?.lng.toFixed(5)}
                </p>
              </div>

              {interesseEnviado ? (
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
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
