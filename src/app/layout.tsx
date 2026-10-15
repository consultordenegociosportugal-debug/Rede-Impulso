import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { AssistenteIA } from "@/components/assistente-ia";
import { Copiloto } from "@/components/copiloto";
import { MOBILIDADE_ATIVA } from "@/lib/modulos";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "Rede Impulso — Agendamento direto entre você e seu corretor",
  description:
    "A plataforma que conecta corretores, imobiliárias e construtoras aos seus clientes, com agendamento de visitas e atendimento em um só lugar.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}
    >
      <body>
        {children}
        {/* Copiloto do motorista só volta com o módulo de mobilidade
            acordado (ver src/lib/modulos.ts); o padrão é o assistente de
            imóveis, que é o núcleo atual da plataforma. */}
        {MOBILIDADE_ATIVA ? <Copiloto /> : <AssistenteIA />}
      </body>
    </html>
  );
}
