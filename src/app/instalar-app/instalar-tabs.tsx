"use client";

import { useState } from "react";

type Passo = { titulo: string; detalhe: string };

const PASSOS_ANDROID: Passo[] = [
  {
    titulo: "Abra www.redeimpulso.com.br no Chrome",
    detalhe: "Precisa ser o navegador Chrome — em outros navegadores o passo a passo muda.",
  },
  {
    titulo: "Toque no menu (⋮) no canto superior direito",
    detalhe: "Os três pontinhos, ao lado da barra de endereço.",
  },
  {
    titulo: 'Toque em "Instalar aplicativo" ou "Adicionar à tela inicial"',
    detalhe: "O nome exato varia um pouco conforme a versão do Chrome.",
  },
  {
    titulo: 'Confirme tocando em "Instalar"',
    detalhe: "Pode levar alguns segundos.",
  },
  {
    titulo: "Pronto — o ícone da Rede Impulso aparece na tela inicial",
    detalhe: "Abre em tela cheia, sem a barra de endereço do navegador, como um app de verdade.",
  },
];

const PASSOS_IPHONE: Passo[] = [
  {
    titulo: "Abra www.redeimpulso.com.br no Safari",
    detalhe: "Precisa ser o Safari — no Chrome ou outro navegador do iPhone essa opção não aparece.",
  },
  {
    titulo: "Toque no ícone de compartilhar",
    detalhe: "O quadrado com uma seta pra cima, na barra inferior da tela.",
  },
  {
    titulo: 'Role as opções e toque em "Adicionar à Tela de Início"',
    detalhe: "Pode estar um pouco mais abaixo na lista, dependendo da versão do iOS.",
  },
  {
    titulo: 'Toque em "Adicionar" no canto superior direito',
    detalhe: "Dá pra ajustar o nome que aparece embaixo do ícone antes de confirmar.",
  },
  {
    titulo: "Pronto — o ícone da Rede Impulso aparece na tela inicial",
    detalhe: "Abre em tela cheia, sem a barra do Safari, como um app de verdade.",
  },
];

export function InstalarTabs() {
  const [sistema, setSistema] = useState<"android" | "iphone">("android");
  const passos = sistema === "android" ? PASSOS_ANDROID : PASSOS_IPHONE;

  return (
    <div>
      <div className="flex gap-8 mb-16">
        <button
          type="button"
          className={`btn btn-sm ${sistema === "android" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setSistema("android")}
        >
          📱 Android
        </button>
        <button
          type="button"
          className={`btn btn-sm ${sistema === "iphone" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setSistema("iphone")}
        >
          📱 iPhone
        </button>
      </div>

      <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {passos.map((passo, i) => (
          <li key={passo.titulo} className="card mb-8" style={{ padding: "14px 16px" }}>
            <div className="flex gap-8" style={{ alignItems: "flex-start" }}>
              <span
                className="badge badge-primary"
                style={{ flexShrink: 0, minWidth: 24, textAlign: "center" }}
              >
                {i + 1}
              </span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14.5 }}>{passo.titulo}</p>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13.5 }}>
                  {passo.detalhe}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
