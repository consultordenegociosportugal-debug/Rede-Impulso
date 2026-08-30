"use client";

import { useEffect } from "react";

export function RolarParaHash() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const elemento = document.getElementById(hash.slice(1));
    if (!elemento) return;

    const id = requestAnimationFrame(() => {
      elemento.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return null;
}
