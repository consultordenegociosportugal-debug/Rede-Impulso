"use client";

import { useEffect, useRef, useState } from "react";

// Campo de bairros em "tags": digita e aperta Enter (ou vírgula) pra
// adicionar, com sugestões dos bairros que outros corretores já
// cadastraram — dá pra ir combinando sugestão + texto livre, sem se
// preocupar com formatação de vírgula.
export function BairrosInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string[];
  onChange: (bairros: string[]) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState("");
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [aberto, setAberto] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!texto.trim()) {
      setSugestoes([]);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetch(`/api/bairros-sugeridos?q=${encodeURIComponent(texto.trim())}`)
        .then((r) => r.json())
        .then((dados: { sugestoes?: string[] }) => {
          setSugestoes((dados.sugestoes ?? []).filter((s) => !value.includes(s)));
        })
        .catch(() => setSugestoes([]));
    }, 200);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [texto, value]);

  function adicionar(bairro: string) {
    const limpo = bairro.trim();
    if (!limpo || value.includes(limpo)) {
      setTexto("");
      return;
    }
    onChange([...value, limpo]);
    setTexto("");
    setSugestoes([]);
  }

  function remover(bairro: string) {
    onChange(value.filter((b) => b !== bairro));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      adicionar(texto);
    } else if (e.key === "Backspace" && !texto && value.length > 0) {
      remover(value[value.length - 1]);
    }
  }

  return (
    <div className="tags-input">
      <div className="tags-input-chips">
        {value.map((bairro) => (
          <span key={bairro} className="tag-chip">
            {bairro}
            <button
              type="button"
              onClick={() => remover(bairro)}
              aria-label={`Remover ${bairro}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setAberto(true)}
          onBlur={() => {
            window.setTimeout(() => setAberto(false), 150);
          }}
          placeholder={value.length === 0 ? placeholder : "Adicionar outro…"}
        />
      </div>
      {aberto && sugestoes.length > 0 && (
        <div className="tags-suggestions">
          {sugestoes.map((s) => (
            <button
              type="button"
              key={s}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => adicionar(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
