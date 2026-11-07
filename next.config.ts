import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Sem X-Frame-Options, qualquer site podia carregar a Rede Impulso
  // dentro de um iframe invisível/disfarçado e enganar alguém a clicar
  // em "Confirmar agendamento" ou "Excluir minha conta" sem perceber
  // (clickjacking) — nenhum header de segurança estava configurado.
  // geolocation=(self) continua liberado: a busca "Próximas" em
  // /buscar-profissionais usa navigator.geolocation; câmera/microfone
  // não são usados em lugar nenhum do app.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
