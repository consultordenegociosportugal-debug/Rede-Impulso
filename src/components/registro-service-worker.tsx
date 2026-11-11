"use client";

import { useEffect } from "react";

// Registra o service worker só o necessário pra instalabilidade do PWA
// (ver public/sw.js — ele não guarda cache de nada dinâmico). Sem
// suporte a service worker (navegadores antigos), simplesmente não
// registra nada — o site continua funcionando normal, só sem o botão
// de instalar.
export function RegistroServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort — instalar como PWA é um extra, nunca pode quebrar o site.
    });
  }, []);

  return null;
}
