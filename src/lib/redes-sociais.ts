// Monta a URL clicável a partir do que foi salvo em profiles.rede_social
// (handle do Instagram, sempre com @) e profiles.facebook (o corretor
// pode colar várias formas — "facebook.com/x", "www.facebook.com/x",
// a URL completa com https, ou só o nome da página).
export function instagramUrl(handle: string) {
  return `https://instagram.com/${handle.replace(/^@/, "")}`;
}

export function facebookUrl(valor: string) {
  const limpo = valor.trim().replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (limpo.startsWith("facebook.com/") || limpo.startsWith("fb.com/")) {
    return `https://${limpo}`;
  }
  return `https://facebook.com/${limpo}`;
}
