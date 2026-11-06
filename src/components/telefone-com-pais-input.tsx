"use client";

import { useState } from "react";

const PAISES = [
  { codigo: "55", bandeira: "🇧🇷", nome: "Brasil" },
  { codigo: "351", bandeira: "🇵🇹", nome: "Portugal" },
  { codigo: "1", bandeira: "🇺🇸", nome: "EUA/Canadá" },
  { codigo: "44", bandeira: "🇬🇧", nome: "Reino Unido" },
  { codigo: "34", bandeira: "🇪🇸", nome: "Espanha" },
  { codigo: "54", bandeira: "🇦🇷", nome: "Argentina" },
];

// Seletor de país + número, só pro telefone do cliente avulso — é o
// único campo do sistema sem uma conta brasileira (CPF/CRECI ou
// cadastro com WhatsApp nacional obrigatório) por trás, então é o
// único onde um cliente estrangeiro realmente aparece. O valor que sai
// no onChange já vem pronto pro paraE164() entender ("+<código><número>"),
// ou "" se nada foi digitado — o campo continua opcional de verdade, sem
// mandar um "+55" fantasma quando o corretor deixa em branco.
export function TelefoneComPaisInput({
  id,
  onChange,
  placeholder,
}: {
  id?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [pais, setPais] = useState(PAISES[0].codigo);
  const [numero, setNumero] = useState("");

  function atualizar(novoPais: string, novoNumero: string) {
    setPais(novoPais);
    setNumero(novoNumero);
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
        style={{ flex: 1 }}
      />
    </div>
  );
}
