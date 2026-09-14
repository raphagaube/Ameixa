import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Voltar a uma tela vista há pouco não vai ao servidor de novo: o
    // navegador reaproveita a cópia por 30 segundos. Salvar qualquer coisa
    // chama revalidatePath ou router.refresh, que descartam essas cópias —
    // a tela nunca fica atrás do que o próprio dono acabou de fazer.
    staleTimes: { dynamic: 30 },
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
