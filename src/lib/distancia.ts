// Em módulo próprio (não dentro de geocodificar.ts) porque é seguro
// chamar do navegador — geocodificar.ts faz fetch pro Nominatim com um
// User-Agent customizado, header que o navegador bloqueia um script de
// sobrescrever, então aquele arquivo só pode rodar no servidor.

// Distância em linha reta entre dois pontos (km) — fórmula de Haversine.
// Não é a distância de rota real (não considera ruas), só uma
// referência rápida de "quão perto" pro cliente decidir, sem precisar
// de nenhuma API de rotas.
export function distanciaKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const RAIO_TERRA_KM = 6371;
  const paraRad = (graus: number) => (graus * Math.PI) / 180;

  const deltaLat = paraRad(b.latitude - a.latitude);
  const deltaLon = paraRad(b.longitude - a.longitude);
  const lat1 = paraRad(a.latitude);
  const lat2 = paraRad(b.latitude);

  const h =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return RAIO_TERRA_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
