// Geocodificação de endereço em texto livre pra lat/lng — via Nominatim
// (OpenStreetMap), gratuito e sem chave de API. Só pode rodar no
// servidor: a política de uso do Nominatim exige um User-Agent
// identificando a aplicação (navegador não deixa um app sobrescrever
// esse header) e um limite de 1 requisição por segundo — aqui o volume
// é baixíssimo (só quando um admin salva/edita um endereço), então não
// precisa de fila nem cache.
export async function geocodificarEndereco(
  endereco: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const enderecoLimpo = endereco.trim();
  if (!enderecoLimpo) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(enderecoLimpo)}`;
    const resposta = await fetch(url, {
      headers: { "User-Agent": "RedeImpulso/1.0 (contato@redeimpulso.com.br)" },
    });
    if (!resposta.ok) return null;

    const dados = (await resposta.json()) as { lat: string; lon: string }[];
    const primeiro = dados[0];
    if (!primeiro) return null;

    return { latitude: Number(primeiro.lat), longitude: Number(primeiro.lon) };
  } catch (erro) {
    console.error("Erro ao geocodificar endereço:", erro);
    return null;
  }
}

type Componente = { types: string[]; long_name: string };

async function cidadeViaGoogle(latitude: number, longitude: number): Promise<string | null> {
  const chave = process.env.GOOGLE_MAPS_API_KEY;
  if (!chave) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${chave}&language=pt-BR`;
  const resposta = await fetch(url);
  if (!resposta.ok) return null;

  const dados = (await resposta.json()) as { status: string; results?: { address_components: Componente[] }[] };
  if (dados.status !== "OK") return null;

  const componentes = dados.results?.[0]?.address_components ?? [];
  return (
    componentes.find((c) => c.types.includes("administrative_area_level_2"))?.long_name ??
    componentes.find((c) => c.types.includes("locality"))?.long_name ??
    null
  );
}

async function cidadeViaNominatim(latitude: number, longitude: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
  const resposta = await fetch(url, {
    headers: { "User-Agent": "RedeImpulso/1.0 (contato@redeimpulso.com.br)" },
  });
  if (!resposta.ok) return null;

  const dados = (await resposta.json()) as {
    address?: { city?: string; town?: string; municipality?: string; village?: string };
  };
  const endereco = dados.address;
  return endereco?.city ?? endereco?.town ?? endereco?.municipality ?? endereco?.village ?? null;
}

// Coordenadas -> nome da cidade, pra busca "perto de você" em
// /buscar-profissionais (sem distância real — ver comentário na rota
// da API). Google primeiro (mais preciso, mas precisa de
// GOOGLE_MAPS_API_KEY com a Geocoding API ativada no Cloud Console);
// se faltar a chave, a API não estiver ativada ou a chamada falhar,
// cai pro Nominatim (gratuito, sem chave) — assim a busca nunca fica
// de todo fora do ar por causa só da configuração do Google.
export async function cidadeDeCoordenadas(latitude: number, longitude: number): Promise<string | null> {
  try {
    const porGoogle = await cidadeViaGoogle(latitude, longitude);
    if (porGoogle) return porGoogle;
  } catch (erro) {
    console.error("Erro ao reverse-geocodificar via Google:", erro);
  }

  try {
    return await cidadeViaNominatim(latitude, longitude);
  } catch (erro) {
    console.error("Erro ao reverse-geocodificar via Nominatim:", erro);
    return null;
  }
}
