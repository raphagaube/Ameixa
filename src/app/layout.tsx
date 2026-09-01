import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { ProvedorTema, scriptAntiFlash } from "@/components/provedor-tema";

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
      </head>
      <body>
        <ProvedorTema>{children}</ProvedorTema>
      </body>
    </html>
  );
}
