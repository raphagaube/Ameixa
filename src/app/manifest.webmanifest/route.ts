/**
 * Manifesto do PWA. Serve por rota em vez de arquivo estático para o
 * Next cuidar do cabeçalho de tipo — alguns navegadores recusam o
 * manifesto quando o content-type vem errado.
 */
export function GET() {
  const manifesto = {
    name: "Ameixa — gestão financeira",
    short_name: "Ameixa",
    description: "Suas contas do mês, no bolso.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    dir: "ltr",
    background_color: "#f4f4f3",
    theme_color: "#f4f4f3",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icone-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icone-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icone-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Extrato", url: "/extrato" },
      { name: "Relatórios", url: "/relatorios" },
      { name: "Metas", url: "/metas" },
    ],
  };

  return new Response(JSON.stringify(manifesto), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
