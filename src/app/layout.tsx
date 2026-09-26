import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { AssistenteIA } from "@/components/assistente-ia";
import { Copiloto } from "@/components/copiloto";
import { IMOBILIARIO_ATIVO } from "@/lib/modulos";
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

export const metadata: Metadata = IMOBILIARIO_ATIVO
  ? {
      title: "Rede Impulso — Um sistema só, cinco pontas conectadas",
      description:
        "A plataforma que conecta corretores, imobiliárias, cartórios e clientes em um único ecossistema imobiliário.",
    }
  : {
      title: "Rede Impulso — Apoio total para quem vive ao volante",
      description:
        "Tecnologia para motoristas de aplicativo e donos de carros elétricos: lucro real, radar do dia, " +
        "eletropostos, oficinas, compra e venda de elétricos e comunidade.",
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
        {/* Assistente de imóveis só com o módulo imobiliário ativo; no foco
            atual, o Copiloto do motorista ocupa o lugar dele. */}
        {IMOBILIARIO_ATIVO ? <AssistenteIA /> : <Copiloto />}
      </body>
    </html>
  );
}
