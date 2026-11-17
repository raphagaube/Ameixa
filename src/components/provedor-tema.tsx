"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Modo } from "@/lib/theme";

const CHAVE_MODO = "ameixa:modo";

type ContextoTema = {
  modo: Modo;
  definirModo: (m: Modo) => void;
  alternarModo: () => void;
};

const Ctx = createContext<ContextoTema | null>(null);

export function useTema() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTema precisa estar dentro de ProvedorTema");
  return ctx;
}

/**
 * Script que roda ANTES da primeira pintura. Sem isso o app abre claro e
 * pisca para escuro — o flash é bem visível no celular.
 */
export const scriptAntiFlash = `
(function(){
  try{
    var m = localStorage.getItem(${JSON.stringify(CHAVE_MODO)});
    if(m !== 'light' && m !== 'dark') m = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-mode', m);
    document.documentElement.style.colorScheme = m;
  }catch(e){
    document.documentElement.setAttribute('data-mode','light');
  }
})();
`;

export function ProvedorTema({ children }: { children: React.ReactNode }) {
  // Começa alinhado ao que o script anti-flash já escreveu, para não repintar.
  const [modo, setModo] = useState<Modo>("light");
  const [montado, setMontado] = useState(false);
  const timerCores = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerCores.current !== null) window.clearTimeout(timerCores.current);
    document.documentElement.classList.remove("tema-em-troca");
  }, []);

  useEffect(() => {
    // Leitura única na montagem. O servidor não tem localStorage, então o
    // valor real só existe aqui — não dá para inicializar o useState com ele
    // sem quebrar a hidratação. É um efeito de inicialização, não um laço.
    /* eslint-disable react-hooks/set-state-in-effect */
    let salvoModo: Modo | null = null;
    try {
      salvoModo = localStorage.getItem(CHAVE_MODO) as Modo | null;
    } catch {
      // Janela anônima ou armazenamento bloqueado: cai no tema do sistema.
    }
    const doSistema = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    setModo(salvoModo === "light" || salvoModo === "dark" ? salvoModo : doSistema);
    setMontado(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // As duas paletas fixas ficam no CSS, disponíveis desde a primeira pintura.
  useEffect(() => {
    if (!montado) return;
    const raiz = document.documentElement;
    raiz.setAttribute("data-mode", modo);
    raiz.style.colorScheme = modo;
  }, [modo, montado]);

  const definirModo = useCallback((m: Modo) => {
    const raiz = document.documentElement;
    if (timerCores.current !== null) window.clearTimeout(timerCores.current);
    const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animar = !reduzirMovimento && raiz.dataset.mode !== m;
    raiz.classList.toggle("tema-em-troca", animar);
    // As cores mudam sem fotografar nem bloquear a página.
    raiz.setAttribute("data-mode", m);
    raiz.style.colorScheme = m;
    setModo(m);
    try {
      localStorage.setItem(CHAVE_MODO, m);
    } catch {
      // Sem armazenamento, a escolha vale somente nesta sessão.
    }
    if (animar) {
      timerCores.current = window.setTimeout(() => {
        raiz.classList.remove("tema-em-troca");
        timerCores.current = null;
      }, 450);
    }
  }, []);

  const alternarModo = useCallback(() => {
    definirModo(modo === "dark" ? "light" : "dark");
  }, [modo, definirModo]);

  const valor = useMemo(
    () => ({ modo, definirModo, alternarModo }),
    [modo, definirModo, alternarModo],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
