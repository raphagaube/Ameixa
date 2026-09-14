import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // A planilha do Ameixa vai inteira para a prévia da importação. O
      // padrão de 1 MB não comportava ~2.300 lançamentos e a importação
      // falhava antes de chegar ao servidor. 4 MB fica abaixo do teto de
      // 4,5 MB que a Vercel aceita no corpo da requisição.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
