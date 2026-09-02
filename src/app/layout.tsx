import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { ProvedorTema, scriptAntiFlash } from "@/components/provedor-tema";
import { scriptAntiFlashValores } from "@/lib/privacidade";
import { RegistrarSW } from "@/components/registrar-sw";

const openSans = Open_Sans({
  variable: "--fonte-open-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ameixa",
  description: "Gestão financeira pessoal",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Ameixa", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icone-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Acompanha o tema para a barra de status do celular não destoar.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f3" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={openSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptAntiFlash }} />
        <script dangerouslySetInnerHTML={{ __html: scriptAntiFlashValores }} />
      </head>
      <body>
        <ProvedorTema>{children}</ProvedorTema>
        <RegistrarSW />
      </body>
    </html>
  );
}
