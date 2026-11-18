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
