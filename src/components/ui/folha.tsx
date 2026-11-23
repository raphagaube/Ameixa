"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Folha inferior (bottom sheet). Padrão do handoff: raio 20px no topo,
 * entrada de translateY(14px) para 0 com fade em 180ms, backdrop escuro que
 * fecha ao clique e overscroll contido.
 */
export function Folha({
  aberta,
  aoFechar,
  titulo,
  alturaMaxima = "88vh",
  className = "",
  children,
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  alturaMaxima?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const painel = useRef<HTMLDivElement>(null);

  /**
   * Guarda a função de fechar numa ref.
   *
   * Quem abre a gaveta passa `() => aoFechar(false)`, que é uma função nova
   * a cada renderização. Com ela na lista de dependências, o efeito rodava a
   * cada tecla digitada — e o `painel.focus()` lá dentro tirava o cursor do
   * campo já na primeira letra. A ref mantém a função sempre atual sem
   * fazer o efeito rodar de novo.
   */
  const fechar = useRef(aoFechar);
  useEffect(() => {
    fechar.current = aoFechar;
  });

  // Esc fecha, e o fundo trava a rolagem enquanto a folha está aberta.
  // Depende só de `aberta`: roda uma vez ao abrir e desfaz ao fechar.
  /**
   * Quanto o teclado do Android está cobrindo.
   *
   * O viewport de layout não encolhe quando o teclado sobe, então o rodapé
   * da folha — onde ficam o erro e o "Salvar" — some atrás dele. Terminar
   * de digitar a observação e não alcançar o Salvar sem antes fechar o
   * teclado era o caminho normal, toda vez.
   *
   * O botão flutuante já media isto para se desviar; a folha, que é onde
   * se digita, não media.
   */
  const [alturaTeclado, setAlturaTeclado] = useState(0);

  useEffect(() => {
    if (!aberta) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const medir = () => {
      const escondido = window.innerHeight - vv.height - vv.offsetTop;
      // 120px separa teclado de barra de endereço encolhendo.
      setAlturaTeclado(escondido > 120 ? escondido : 0);
    };
    medir();
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
    };
  }, [aberta]);

  useEffect(() => {
    const elemento = painel.current;
    if (!aberta || !elemento) return;

    const focoAnterior = document.activeElement;

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        fechar.current();
        return;
      }
      if (e.key !== "Tab") return;

      const focaveis = Array.from(elemento.querySelectorAll<HTMLElement>(
        "a[href], button, input, select, textarea, [tabindex]",
      )).filter((el) => el.tabIndex >= 0 && !el.matches(":disabled") && el.getClientRects().length > 0);
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;
      const foraDoPainel = !elemento.contains(atual);
      if (!primeiro || foraDoPainel || (e.shiftKey ? atual === primeiro || atual === elemento : atual === ultimo)) {
        e.preventDefault();
        (e.shiftKey ? ultimo ?? elemento : primeiro ?? elemento).focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);

    const rolagemAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    elemento.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = rolagemAnterior;
      if (focoAnterior instanceof HTMLElement && focoAnterior.isConnected) {
        focoAnterior.focus({ preventScroll: true });
      }
    };
  }, [aberta]);

  if (!aberta) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={-1}
        onClick={aoFechar}
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,.45)", minHeight: 0 }}
      />

      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={`folha-entra folha-painel absolute inset-x-0 bottom-0 mx-auto w-full outline-none ${className}`}
        style={{
          // No notebook a folha vira janela no meio da tela: largura e raio
          // passam por variáveis que só o CSS de tela grande redefine.
          maxWidth: "var(--folha-largura, var(--largura))",
          maxHeight: alturaTeclado
            ? `calc(${alturaMaxima} - ${alturaTeclado}px)`
            : alturaMaxima,
          // Ergue a folha acima do teclado, em vez de deixá-la atrás dele.
          transform: alturaTeclado ? `translateY(-${alturaTeclado}px)` : undefined,
          overflowY: "auto",
          overscrollBehavior: "contain",
          background: "var(--sf)",
          borderRadius: "var(--folha-raio, var(--rf) var(--rf) 0 0)",
          paddingBottom: "calc(var(--folha-pad-inferior, 16px) + env(safe-area-inset-bottom))",
        }}
      >
        <header
          className="sticky top-0 flex items-center justify-between"
          style={{
            gap: 12,
            padding: "var(--folha-pad-cabecalho, 16px 16px 12px)",
            background: "var(--sf)",
            borderRadius: "var(--rf) var(--rf) 0 0",
          }}
        >
          <h2 style={{ fontSize: 21 }}>{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="grid place-items-center rounded-xl"
            style={{
              width: "var(--folha-tamanho-fechar, 38px)",
              height: "var(--folha-tamanho-fechar, 38px)",
              minHeight: "var(--folha-tamanho-fechar, 38px)",
              color: "var(--mut)",
              background: "transparent",
            }}
          >
            <X size={20} strokeWidth={1.5} aria-hidden />
          </button>
        </header>

        <div className="folha-conteudo" style={{ padding: "0 16px" }}>{children}</div>
      </div>
    </div>
  );
}
