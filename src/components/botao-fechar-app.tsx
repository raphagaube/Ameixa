"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/ui/botao";
import { Folha } from "@/components/ui/folha";

/**
 * Botão de fechar o app.
 *
 * Página da web não fecha a si mesma por regra do navegador: só o
 * `window.close()` de uma janela aberta por script costuma funcionar. Em
 * app instalado ele funciona em parte dos aparelhos. Então a tentativa é
 * feita de verdade e, quando o sistema recusa, o app diz o caminho em vez
 * de fingir que fechou.
 */
export function BotaoFecharApp() {
  const [explicando, setExplicando] = useState(false);

  function fechar() {
    // Fecha a aba se o navegador permitir.
    window.close();

    // Ainda aqui depois de um instante significa que o sistema recusou.
    setTimeout(() => {
      if (!window.closed) setExplicando(true);
    }, 350);
  }

  return (
    <>
      <button
        type="button"
        onClick={fechar}
        aria-label="Fechar o aplicativo"
        className="grid place-items-center rounded-xl border"
        style={{
          width: 38,
          height: 38,
          minHeight: 38,
          borderColor: "var(--ln)",
          color: "var(--mut)",
          background: "var(--sf)",
        }}
      >
        <X size={18} strokeWidth={1.5} aria-hidden />
      </button>

      <Folha
        aberta={explicando}
        aoFechar={() => setExplicando(false)}
        titulo="Fechar a Ameixa"
      >
        <div className="flex flex-col" style={{ gap: 14, paddingBottom: 8 }}>
          <p style={{ fontSize: 14, color: "var(--mut)" }}>
            O Android não deixa um aplicativo se fechar sozinho — quem faz
            isso é o sistema. Dá para fechar assim:
          </p>

          <ul className="flex flex-col" style={{ gap: 10 }}>
            {[
              ["Gesto de voltar", "Deslize da borda da tela para dentro, ou toque no botão voltar."],
              ["Apps recentes", "Toque no botão de quadrado e deslize a Ameixa para cima."],
              ["Botão de início", "Leva você para a tela inicial; a Ameixa fica em segundo plano."],
            ].map(([titulo, texto]) => (
              <li
                key={titulo}
                style={{
                  borderRadius: "var(--r)",
                  border: "1px solid var(--ln2)",
                  padding: 12,
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 600 }}>{titulo}</p>
                <p style={{ fontSize: 13, color: "var(--mut)", marginTop: 2 }}>
                  {texto}
                </p>
              </li>
            ))}
          </ul>

          <p style={{ fontSize: 12, color: "var(--mut)" }}>
            Seus dados ficam salvos de qualquer jeito. Você continua conectado
            quando voltar.
          </p>

          <Botao variante="contorno" onClick={() => setExplicando(false)}>
            Entendi
          </Botao>
        </div>
      </Folha>
    </>
  );
}
