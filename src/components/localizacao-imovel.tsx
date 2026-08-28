"use client";

import { useState } from "react";

type Coords = { lat: number; lng: number };

export function LocalizacaoImovel({
  coords,
  onChange,
}: {
  coords: Coords | null;
  onChange: (coords: Coords | null) => void;
}) {
  const [endereco, setEndereco] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function usarLocalizacaoAtual() {
    if (!navigator.geolocation) {
      setErro("Seu navegador não suporta geolocalização.");
      return;
    }
    setBuscando(true);
    setErro(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({ lat: position.coords.latitude, lng: position.coords.longitude });
        setBuscando(false);
      },
      (geoError) => {
        setErro(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Você precisa permitir o acesso à localização para marcar o imóvel no mapa."
            : "Não foi possível obter sua localização.",
        );
        setBuscando(false);
      },
    );
  }

  async function buscarPorEndereco(e: React.FormEvent) {
    e.preventDefault();
    if (!endereco.trim()) return;

    setBuscando(true);
    setErro(null);

    try {
      const resposta = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco)}&region=br&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
      );
      const dados = await resposta.json();
      const local = dados.results?.[0]?.geometry?.location;

      if (dados.status !== "OK" || !local) {
        setErro(
          "Não encontramos esse endereço. Tente incluir cidade e estado, ou use o CEP.",
        );
        return;
      }

      onChange({ lat: local.lat, lng: local.lng });
    } catch {
      setErro("Não foi possível buscar esse endereço agora. Tente de novo.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="field">
      <label>Localização no mapa</label>

      {coords ? (
        <>
          <img
            src={`https://maps.googleapis.com/maps/api/staticmap?center=${coords.lat},${coords.lng}&zoom=15&size=640x200&scale=2&markers=color:0x00e6a8%7C${coords.lat},${coords.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
            alt="Localização marcada no mapa"
            width={640}
            height={200}
            style={{
              width: "100%",
              height: "auto",
              borderRadius: 12,
              display: "block",
              marginBottom: 8,
            }}
          />
          <div className="upload-slot">
            <div className="ic">📍</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                Localização marcada
              </div>
              <div className="hint" style={{ margin: 0 }}>
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm mt-8"
            onClick={() => onChange(null)}
          >
            Trocar localização
          </button>
        </>
      ) : (
        <>
          <form className="flex gap-8" onSubmit={buscarPorEndereco}>
            <input
              type="text"
              placeholder="Endereço, bairro ou CEP"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn btn-outline btn-sm"
              disabled={buscando || !endereco.trim()}
            >
              {buscando ? "Buscando…" : "Buscar"}
            </button>
          </form>
          <p className="hint" style={{ textAlign: "center", margin: "8px 0" }}>
            ou
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={usarLocalizacaoAtual}
            disabled={buscando}
          >
            {buscando ? "Obtendo localização…" : "📍 Marcar localização atual"}
          </button>
        </>
      )}

      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}

      <p className="hint">
        Estar no imóvel ao publicar ajuda quem passar perto a encontrá-lo
        depois — mas buscar pelo endereço funciona igual.
      </p>
    </div>
  );
}
