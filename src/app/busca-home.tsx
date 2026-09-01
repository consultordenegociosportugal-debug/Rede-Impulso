"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const TABS = [
  { value: "venda", label: "Comprar" },
  { value: "aluguel", label: "Alugar" },
  { value: "vender", label: "Vender" },
] as const;

export function BuscaHome() {
  const router = useRouter();
  const [finalidade, setFinalidade] = useState<"venda" | "aluguel" | "vender">("venda");
  const [bairro, setBairro] = useState("");
  const [buscando, setBuscando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (finalidade === "vender") {
      router.push("/publicar-imovel");
      return;
    }

    const params = new URLSearchParams();
    params.set("finalidade", finalidade);

    const texto = bairro.trim();
    if (texto) {
      setBuscando(true);
      try {
        const resposta = await fetch("/api/busca/interpretar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texto }),
        });
        const filtros = resposta.ok ? await resposta.json() : { bairro: texto };

        if (filtros.bairro) params.set("bairro", filtros.bairro);
        if (filtros.cidade) params.set("cidade", filtros.cidade);
        if (filtros.tipo) params.set("tipo", filtros.tipo);
        if (filtros.quartos_min) params.set("quartos", String(filtros.quartos_min));
        if (filtros.preco_max) params.set("precoMax", String(filtros.preco_max));
      } catch {
        // Camada opcional: se a interpretação falhar, busca pelo texto
        // literal como bairro — o mesmo que sempre funcionou.
        params.set("bairro", texto);
      }
    }

    router.push(`/imoveis?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className={styles.buscaCard}>
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={finalidade === tab.value ? styles.tabActive : styles.tab}
            onClick={() => setFinalidade(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.searchRow}>
        <svg
          className={styles.searchIcon}
          width="17"
          height="17"
          viewBox="0 0 17 17"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="7.2" cy="7.2" r="5.7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11.5 11.5L15.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
          placeholder={
            finalidade === "vender"
              ? "Anuncie seu imóvel em minutos"
              : "Ex: apê 2 quartos até 400 mil na Savassi"
          }
          aria-label="O que você procura"
          disabled={finalidade === "vender" || buscando}
        />
        {finalidade !== "vender" && (
          <Link
            href="/foto-do-imovel"
            className={styles.cameraBtn}
            aria-label="Buscar por foto"
            title="Buscar por foto"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 8h2.5l1.3-2h8.4l1.3 2H20a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="14" r="3.3" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Link>
        )}
        <button type="submit" className="btn btn-primary" disabled={buscando}>
          {finalidade === "vender" ? "Anunciar" : buscando ? "Buscando…" : "Buscar"}
        </button>
      </div>
    </form>
  );
}
