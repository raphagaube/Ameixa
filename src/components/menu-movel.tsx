"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { LogoAmeixa } from "@/components/logo-ameixa";
import { MenuPrincipal } from "@/components/menu-principal";

/** O dialog nativo mantém o foco no menu e devolve ao botão que o abriu. */
export function MenuMovel({ aoFechar, aoLancar, pendencias, botaoOrigem }: {
  aoFechar: () => void; aoLancar: () => void; pendencias: number; botaoOrigem: React.RefObject<HTMLButtonElement | null>;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialogo.current;
    const origem = botaoOrigem.current;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    el?.showModal();
    return () => {
      el?.close();
      document.body.style.overflow = anterior;
      // React já removeu o dialog quando este cleanup roda; o navegador
      // perde a referência de foco que guardou ao abrir o modal.
      origem?.focus();
    };
  }, [botaoOrigem]);
  return (
    <dialog id="menu-movel" ref={dialogo} className="menu-movel" aria-label="Menu do Ameixa"
      onCancel={(e) => { e.preventDefault(); aoFechar(); }}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        if (e.target === e.currentTarget && (e.clientX < r.left || e.clientX >= r.right || e.clientY < r.top || e.clientY >= r.bottom)) aoFechar();
      }}>
      <header className="flex items-center justify-between">
        <div className="menu-marca"><LogoAmeixa tamanho={30} /><span>Ameixa</span></div>
        <button type="button" onClick={aoFechar} aria-label="Fechar menu" className="menu-fechar"><X size={22} strokeWidth={1.5} aria-hidden /></button>
      </header>
      <button type="button" className="menu-novo" onClick={() => { aoFechar(); aoLancar(); }}><Plus size={18} strokeWidth={1.5} aria-hidden />Novo lançamento</button>
      <nav aria-label="Navegação do menu"><MenuPrincipal pendencias={pendencias} aoNavegar={aoFechar} /></nav>
    </dialog>
  );
}
