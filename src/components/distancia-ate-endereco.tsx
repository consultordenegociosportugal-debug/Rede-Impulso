"use client";

import { useState } from "react";
import { distanciaKm } from "@/lib/distancia";

type Status = "idle" | "buscando" | "calculado" | "erro";

// Geolocalização do NAVEGADOR (gratuita, sem chave de API) — só roda se
// o cliente clicar e autorizar; nunca pede sozinho ao carregar a
// página. Distância em linha reta (Haversine), não é rota de carro/a
// pé — é só uma referência rápida de "é longe daqui?" antes de marcar.
export function DistanciaAteEndereco({
  latitudeDestino,
  longitudeDestino,
}: {
  latitudeDestino: number;
  longitudeDestino: number;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [distancia, setDistancia] = useState<number | null>(null);

  function calcular() {
    if (!navigator.geolocation) {
      setStatus("erro");
      return;
    }
    setStatus("buscando");
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const km = distanciaKm(
          { latitude: posicao.coords.latitude, longitude: posicao.coords.longitude },
          { latitude: latitudeDestino, longitude: longitudeDestino },
        );
        setDistancia(km);
        setStatus("calculado");
      },
      () => setStatus("erro"),
      { timeout: 10_000 },
    );
  }

  if (status === "calculado" && distancia !== null) {
    return (
      <p className="hint" style={{ margin: "4px 0 0" }}>
        📏 Cerca de {distancia < 1 ? `${Math.round(distancia * 1000)} m` : `${distancia.toFixed(1)} km`}{" "}
        daqui (linha reta).
      </p>
    );
  }

  return (
    <div style={{ margin: "4px 0 0" }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={calcular}
        disabled={status === "buscando"}
        style={{ paddingLeft: 0 }}
      >
        {status === "buscando" ? "Calculando…" : "📍 Ver distância até você"}
      </button>
      {status === "erro" && (
        <p className="hint" style={{ margin: 0 }}>
          Não conseguimos acessar sua localização — confira a permissão do navegador.
        </p>
      )}
    </div>
  );
}
