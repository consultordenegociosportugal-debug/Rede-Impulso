"use client";

import { useState } from "react";
import { formatarTelefone } from "@/lib/mascaras";

const PAISES = [
  { codigo: "55", bandeira: "🇧🇷", nome: "Brasil" },
  { codigo: "351", bandeira: "🇵🇹", nome: "Portugal" },
  { codigo: "1", bandeira: "🇺🇸", nome: "EUA/Canadá" },
  { codigo: "44", bandeira: "🇬🇧", nome: "Reino Unido" },
  { codigo: "34", bandeira: "🇪🇸", nome: "Espanha" },
  { codigo: "54", bandeira: "🇦🇷", nome: "Argentina" },
];

// Países com código de mais dígitos primeiro — "351" tem que ser
// conferido antes de um "35" hipotético, senão corta errado.
const PAISES_POR_TAMANHO_DE_CODIGO = [...PAISES].sort(
  (a, b) => b.codigo.length - a.codigo.length,
);

function dividirValorInicial(valor: string): { pais: string; numero: string } {
  const texto = valor.trim();
  if (texto.startsWith("+")) {
    for (const p of PAISES_POR_TAMANHO_DE_CODIGO) {
      if (texto.slice(1).startsWith(p.codigo)) {
        const numero = texto.slice(1 + p.codigo.length);
        return { pais: p.codigo, numero: p.codigo === "55" ? formatarTelefone(numero) : numero };
      }
    }
  }
  // Sem "+" reconhecido: trata como telefone brasileiro já digitado antes
  // desta tela existir (formatado ou não) — não dá pra saber o país.
  return { pais: PAISES[0].codigo, numero: formatarTelefone(texto) || texto };
}

// Seletor de país + número. Usado onde um contato pode não ter conta
// brasileira por trás (cliente avulso, ou cliente/comprador se
// cadastrando — corretor sempre exige CPF/CRECI, então fica de fora
// disso). O valor que sai no onChange já vem pronto pro paraE164()
// entender ("+<código><número>"), ou "" se nada foi digitado — assim um
// campo opcional continua opcional de verdade, sem mandar um "+55"
// fantasma.
export function TelefoneComPaisInput({
  id,
  valorInicial,
  onChange,
  placeholder,
  required,
  className,
  ariaInvalid,
  ariaDescribedby,
}: {
  id?: string;
  valorInicial?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  ariaInvalid?: boolean;
  ariaDescribedby?: string;
}) {
  const [{ pais, numero }, setEstado] = useState(() =>
    dividirValorInicial(valorInicial ?? ""),
  );

  function atualizar(novoPais: string, novoNumeroDigitado: string) {
    const novoNumero = novoPais === "55" ? formatarTelefone(novoNumeroDigitado) : novoNumeroDigitado;
    setEstado({ pais: novoPais, numero: novoNumero });
    onChange(novoNumero.trim() ? `+${novoPais}${novoNumero}` : "");
  }

  return (
    <div className="flex gap-8">
      <select
        aria-label="Código do país"
        value={pais}
        onChange={(e) => atualizar(e.target.value, numero)}
        style={{ maxWidth: 122, flexShrink: 0 }}
      >
        {PAISES.map((p) => (
          <option key={p.codigo} value={p.codigo}>
            {p.bandeira} +{p.codigo}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        value={numero}
        onChange={(e) => atualizar(pais, e.target.value)}
        placeholder={placeholder}
        required={required}
        className={className}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        style={{ flex: 1 }}
      />
    </div>
  );
}
