import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.redeimpulso.app",
  appName: "Rede Impulso",
  webDir: "public",
  server: {
    // App aponta direto pro site em produção — o app nativo é uma casca
    // que carrega o mesmo site que roda no navegador. Deploy novo no
    // Vercel já atualiza o app, sem passar por loja nem novo build.
    url: "https://www.redeimpulso.com.br",
  },
};

export default config;
