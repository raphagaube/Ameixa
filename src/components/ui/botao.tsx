"use client";

type Comum = {
  variante?: "primario" | "contorno" | "texto";
  carregando?: boolean;
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> &
  Comum & {
    /**
     * Vira um link com a mesma aparência. Existe para o OAuth do Google,
     * que precisa de navegação de topo: um `fetch` ou Server Action engole
     * o redirecionamento e nada acontece na tela.
     */
    href?: string;
  };

/**
 * Botão primário do handoff: fundo --deep, texto --on-ac, 14px de padding,
 * maiúsculo com letter-spacing .1em. Usa --deep e nunca --ac puro.
 */
export function Botao({
  variante = "primario",
  carregando = false,
  children,
  disabled,
  style,
  href,
  ...resto
}: Props) {
  const base: React.CSSProperties = {
    padding: 14,
    fontSize: 16,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".1em",
    borderRadius: "var(--rs)",
    width: "100%",
    transition: "opacity 150ms ease-out",
    opacity: disabled || carregando ? 0.55 : 1,
  };

  const porVariante: Record<string, React.CSSProperties> = {
    primario: { background: "var(--deep)", color: "var(--on-ac)", border: "none" },
    contorno: {
      background: "transparent",
      color: "var(--color-text)",
      border: "1px solid var(--ln)",
    },
    texto: {
      background: "transparent",
      color: "var(--deep)",
      border: "none",
      textTransform: "none",
      letterSpacing: "normal",
      fontSize: 14,
      fontWeight: 600,
      padding: 8,
    },
  };

  const aparencia = { ...base, ...porVariante[variante], ...style };
  const conteudo = carregando ? "Aguarde…" : children;

  if (href) {
    return (
      <a
        href={href}
        aria-disabled={disabled || carregando || undefined}
        style={{
          ...aparencia,
          display: "grid",
          placeItems: "center",
          textDecoration: "none",
        }}
      >
        {conteudo}
      </a>
    );
  }

  return (
    <button
      {...resto}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      style={aparencia}
    >
      {conteudo}
    </button>
  );
}
