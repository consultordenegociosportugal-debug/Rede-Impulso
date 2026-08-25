import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.redeimpulso.app",
  appName: "Rede Impulso",
  webDir: "public",
  server: {
    // Aponta o app para o servidor Next.js rodando no seu PC, na rede
    // Wi-Fi local. Funciona enquanto o celular estiver na mesma rede e
    // "npm run dev" estiver rodando. Trocar por uma URL de produção
    // (ex: Vercel) quando o app for além de teste local.
    url: "http://192.168.15.12:3001",
    cleartext: true,
  },
};

export default config;
