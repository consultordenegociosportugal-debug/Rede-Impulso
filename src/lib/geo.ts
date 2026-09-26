export type Coords = { lat: number; lng: number };

// Fórmula de Haversine — distância em linha reta (não é rota de trânsito,
// mas é o suficiente pra ordenar "o que está mais perto" sem depender de
// uma API paga de rotas.
export function distanciaKm(a: Coords, b: Coords) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function formatarDistancia(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function urlRota(destino: Coords) {
  return `https://www.google.com/maps/dir/?api=1&destination=${destino.lat},${destino.lng}`;
}
