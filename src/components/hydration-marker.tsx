"use client";

import { useEffect } from "react";

// Marca <html data-hidratado="sim"> assim que o React liga de verdade.
// O script inline em layout.tsx usa essa marca pra saber se deve mostrar
// o aviso de "JavaScript bloqueado" (ver HYDRATION_WATCHDOG).
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.setAttribute("data-hidratado", "sim");
  }, []);

  return null;
}
