// Service worker minimalista — o único objetivo aqui é satisfazer o
// critério de instalabilidade do Android/Chrome (que exige um service
// worker com um handler de fetch registrado, além do manifest). Esta NÃO
// é uma estratégia de cache agressiva de propósito: Rede Impulso é um
// app transacional (disponibilidade, agendamentos) onde servir uma
// versão em cache de uma página dinâmica seria pior que não ter cache
// nenhum — mostraria horário livre que já foi reservado, por exemplo.
//
// Só os ícones (verdadeiramente estáticos, nunca mudam de conteúdo pelo
// mesmo nome de arquivo) passam por cache-first. Tudo mais vai direto
// pra rede, sem fallback de cache.
const CACHE_ESTATICO = "rede-impulso-estatico-v1";
const ARQUIVOS_ESTATICOS = [
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_ESTATICO).then((cache) => cache.addAll(ARQUIVOS_ESTATICOS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((c) => c !== CACHE_ESTATICO).map((c) => caches.delete(c))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  if (ARQUIVOS_ESTATICOS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((resposta) => resposta || fetch(event.request)),
    );
  }
  // Tudo mais (páginas, API, dados): sem interceptar, vai direto pra rede.
});
