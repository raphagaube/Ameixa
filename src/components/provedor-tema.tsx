"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ACENTO_PADRAO, derivarTokens, type Modo } from "@/lib/theme";

const CHAVE_MODO = "ameixa:modo";
const CHAVE_ACENTO = "ameixa:acento";

type ContextoTema = {
  modo: Modo;
  acento: string;
  definirModo: (m: Modo) => void;
  definirAcento: (hex: string) => void;
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
    if(!m) m = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-mode', m);
  }catch(e){
    document.documentElement.setAttribute('data-mode','light');
  }
})();
`;

export function ProvedorTema({ children }: { children: React.ReactNode }) {
  // Começa alinhado ao que o script anti-flash já escreveu, para não repintar.
  const [modo, setModo] = useState<Modo>("light");
  const [acento, setAcento] = useState<string>(ACENTO_PADRAO);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    // Leitura única na montagem. O servidor não tem localStorage, então o
    // valor real só existe aqui — não dá para inicializar o useState com ele
    // sem quebrar a hidratação. É um efeito de inicialização, não um laço.
    /* eslint-disable react-hooks/set-state-in-effect */
    let salvoModo: Modo | null = null;
    let salvoAcento: string | null = null;
    try {
      salvoModo = localStorage.getItem(CHAVE_MODO) as Modo | null;
      salvoAcento = localStorage.getItem(CHAVE_ACENTO);
    } catch {
      // Janela anônima ou armazenamento bloqueado: cai no tema do sistema.
    }
    const doSistema = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    setModo(salvoModo ?? doSistema);
    if (salvoAcento) setAcento(salvoAcento);
    setMontado(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Aplica os tokens no <html> sempre que modo ou acento mudam.
  useEffect(() => {
    if (!montado) return;
    const raiz = document.documentElement;
    raiz.setAttribute("data-mode", modo);
    const t = derivarTokens(acento, modo);
    raiz.style.setProperty("--ac", t.ac);
    raiz.style.setProperty("--on-ac", t.onAc);
    raiz.style.setProperty("--deep", t.deep);
    raiz.style.setProperty("--tint", t.tint);
    raiz.style.setProperty("--chart2", t.chart2);
    raiz.style.colorScheme = modo;
  }, [modo, acento, montado]);

  const definirModo = useCallback((m: Modo) => {
    setModo(m);
    try {
      localStorage.setItem(CHAVE_MODO, m);
    } catch {
      // Navegador com armazenamento bloqueado: o tema vale só para esta sessão.
    }
  }, []);

  const definirAcento = useCallback((hex: string) => {
    setAcento(hex);
    try {
      localStorage.setItem(CHAVE_ACENTO, hex);
    } catch {
      // idem
    }
  }, []);

  const alternarModo = useCallback(() => {
    definirModo(modo === "dark" ? "light" : "dark");
  }, [modo, definirModo]);

  const valor = useMemo(
    () => ({ modo, acento, definirModo, definirAcento, alternarModo }),
    [modo, acento, definirModo, definirAcento, alternarModo],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
