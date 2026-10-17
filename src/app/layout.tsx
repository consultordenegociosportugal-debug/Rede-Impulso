import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { HydrationMarker } from "@/components/hydration-marker";

// Inline de propósito (não um arquivo .js externo): se um bloqueador de
// anúncios, antivírus ou extensão de privacidade impedir os chunks do
// Next.js de carregar, a página fica com HTML mas nenhum botão reage, sem
// nenhum erro visível — foi exatamente o que um usuário relatou travar
// repetidamente em /cadastro-profissional. Como este script está embutido
// no próprio documento HTML (que sempre carrega), ele sobrevive a esse
// bloqueio e avisa quem está vendo a página em vez de deixá-la "morta".
const HYDRATION_WATCHDOG = `
(function () {
  setTimeout(function () {
    if (document.documentElement.getAttribute("data-hidratado") === "sim") return;
    var aviso = document.createElement("div");
    aviso.setAttribute("role", "alert");
    aviso.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;" +
      "color:#fff;padding:12px 16px;font:14px/1.4 -apple-system,Segoe UI,Arial,sans-serif;" +
      "text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.3)";
    aviso.textContent =
      "Esta página não terminou de carregar — algo no seu navegador (bloqueador de anúncios, antivírus " +
      "com proteção de navegação, ou uma extensão) impediu uma parte dela de rodar, por isso os botões " +
      "não respondem. Tente abrir em uma janela anônima, desativar extensões, ou usar outro navegador.";
    document.body.prepend(aviso);
  }, 5000);
})();
`;

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
        <script dangerouslySetInnerHTML={{ __html: HYDRATION_WATCHDOG }} />
        <HydrationMarker />
        {children}
      </body>
    </html>
  );
}
