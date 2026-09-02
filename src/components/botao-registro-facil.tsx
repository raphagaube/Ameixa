"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAVE_POSICAO,
  PADRAO,
  foiArrasto,
  ladoMaisProximo,
  ler,
  prender,
  type Posicao,
} from "@/lib/posicao-flutuante";

const ALTURA = 52;
const MARGEM = 16;

/**
 * Botão flutuante "Registro fácil".
 *
 * Pode ser arrastado com o dedo e lembra onde foi deixado. Existe por um
 * motivo prático: sendo fixo na tela, ele acabava por cima de botões no
 * rodapé de algumas telas — a barra de "Organizar em lote", por exemplo.
 * Em vez de adivinhar um canto que nunca atrapalhe, quem decide é o dono.
 */
export function BotaoRegistroFacil({ onClick }: { onClick?: () => void }) {
  const [pos, setPos] = useState<Posicao>(PADRAO);
  const [arrastando, setArrastando] = useState(false);
  const [alturaTeclado, setAlturaTeclado] = useState(0);

  // Ref para o arrasto: mexer em estado a cada movimento do dedo engasga.
  const inicio = useRef<{ x: number; y: number; deBaixo: number } | null>(null);
  const moveu = useRef(false);

  useEffect(() => {
    // Leitura única na montagem. localStorage não existe no servidor, então
    // não dá para inicializar o useState com ele sem quebrar a hidratação.
    // É inicialização, não um laço de renderização.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      setPos(ler(localStorage.getItem(CHAVE_POSICAO)));
    } catch {
      // Armazenamento bloqueado: fica no canto padrão nesta sessão.
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Acompanha o teclado, para o botão não ficar escondido atrás dele.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const medir = () => {
      const escondido = window.innerHeight - vv.height - vv.offsetTop;
      setAlturaTeclado(escondido > 120 ? escondido : 0);
    };
    medir();
    vv.addEventListener("resize", medir);
    vv.addEventListener("scroll", medir);
    return () => {
      vv.removeEventListener("resize", medir);
      vv.removeEventListener("scroll", medir);
    };
  }, []);

  const guardar = useCallback((p: Posicao) => {
    try {
      localStorage.setItem(CHAVE_POSICAO, JSON.stringify(p));
    } catch {
      // idem
    }
  }, []);

  function aoPegar(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    inicio.current = { x: e.clientX, y: e.clientY, deBaixo: pos.deBaixo };
    moveu.current = false;
  }

  function aoMover(e: React.PointerEvent<HTMLButtonElement>) {
    const i = inicio.current;
    if (!i) return;

    const dx = e.clientX - i.x;
    const dy = e.clientY - i.y;

    if (!moveu.current && foiArrasto(dx, dy)) {
      moveu.current = true;
      setArrastando(true);
    }
    if (!moveu.current) return;

    // dy negativo é dedo subindo, que aumenta a distância do rodapé.
    setPos((p) => ({
      ...p,
      deBaixo: prender(i.deBaixo - dy, window.innerHeight, ALTURA),
      lado: ladoMaisProximo(e.clientX, window.innerWidth),
    }));
  }

  function aoSoltar(e: React.PointerEvent<HTMLButtonElement>) {
    const arrastou = moveu.current;
    inicio.current = null;
    moveu.current = false;
    setArrastando(false);

    if (arrastou) {
      const finalizada: Posicao = {
        lado: ladoMaisProximo(e.clientX, window.innerWidth),
        deBaixo: prender(pos.deBaixo, window.innerHeight, ALTURA),
      };
      setPos(finalizada);
      guardar(finalizada);
      return;
    }

    onClick?.();
  }

  const comTeclado = alturaTeclado > 0;
  // Com o teclado aberto, o botão sobe o suficiente para não ficar atrás
  // dele — mesmo que o usuário o tenha deixado bem embaixo.
  const deBaixo = comTeclado
    ? Math.max(pos.deBaixo, alturaTeclado + MARGEM)
    : pos.deBaixo;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center"
      style={{
        bottom: `calc(${deBaixo}px + env(safe-area-inset-bottom))`,
        transition: arrastando ? "none" : "bottom 140ms ease-out",
      }}
    >
      <div
        className="pointer-events-auto flex w-full px-4"
        style={{
          maxWidth: "var(--largura)",
          justifyContent: pos.lado === "esquerda" ? "flex-start" : "flex-end",
        }}
      >
        <button
          type="button"
          onPointerDown={aoPegar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          aria-label="Registro fácil — lançar um valor rápido. Arraste para mover o botão."
          className="flex items-center gap-2 rounded-full shadow-lg"
          style={{
            background: "var(--deep)",
            color: "var(--on-ac)",
            height: ALTURA,
            paddingInline: 20,
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            // Sem isto, o navegador rola a página em vez de deixar arrastar.
            touchAction: "none",
            opacity: arrastando ? 0.88 : 1,
            transform: arrastando ? "scale(1.06)" : "scale(1)",
            transition: "transform 120ms ease-out, opacity 120ms ease-out",
          }}
        >
          <Plus size={20} strokeWidth={2} aria-hidden />
          Registro fácil
        </button>
      </div>
    </div>
  );
}
