import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ProvedorTema, scriptAntiFlash } from "@/components/provedor-tema";
import { scriptAntiFlashValores } from "@/lib/privacidade";
import { RegistrarSW } from "@/components/registrar-sw";

const inter = Inter({
  variable: "--fonte-inter",
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
      { url: "/favicon-32-v3.png", sizes: "32x32", type: "image/png" },
      { url: "/icone-192-v3.png", sizes: "192x192", type: "image/png" },
      { url: "/icone-512-v3.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon-v3.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Acompanha o tema para a barra de status do celular não destoar.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#151116" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
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
