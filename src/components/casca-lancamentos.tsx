"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { BotaoRegistroFacil } from "@/components/botao-registro-facil";
import { FolhaLancamento, type ValoresIniciais } from "@/components/folha-lancamento";
import { RegistroFacil } from "@/components/registro-facil";
import type { DadosDeApoio } from "@/lib/tipos/apoio";
import type { LancamentoNaLista } from "@/lib/tipos/lancamentos";

type Abrir = {
  /** Abre o formulário completo já preenchido com um lançamento existente. */
  editar: (l: LancamentoNaLista) => void;
  /** Abre o formulário completo em branco. */
  novo: () => void;
};

const Ctx = createContext<Abrir | null>(null);

/** Permite que qualquer tela peça para abrir o formulário de lançamento. */
export function useFormularioLancamento() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Fora da CascaLancamentos");
  return ctx;
}

export function CascaLancamentos({
  dados,
  children,
}: {
  dados: DadosDeApoio;
  children: React.ReactNode;
}) {
  const [registroAberto, setRegistroAberto] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<LancamentoNaLista | null>(null);
  const [iniciais, setIniciais] = useState<ValoresIniciais | undefined>();
  // Força o formulário a remontar do zero a cada abertura: sem isso o estado
  // do lançamento anterior fica pendurado nos campos.
  const [geracao, setGeracao] = useState(0);

  const editar = useCallback((l: LancamentoNaLista) => {
    setEmEdicao(l);
    setIniciais(undefined);
    setGeracao((g) => g + 1);
    setFormAberto(true);
  }, []);

  const novo = useCallback(() => {
    setEmEdicao(null);
    setIniciais(undefined);
    setGeracao((g) => g + 1);
    setFormAberto(true);
  }, []);

  const api = useMemo(() => ({ editar, novo }), [editar, novo]);

  function detalharAgora(
    valor: number,
    tipo: "despesa" | "receita",
    contaId: string | null,
  ) {
    setRegistroAberto(false);
    setEmEdicao(null);
    setIniciais({ valor, tipo, contaId });
    setGeracao((g) => g + 1);
    setFormAberto(true);
  }

  return (
    <Ctx.Provider value={api}>
      {children}

      <BotaoRegistroFacil onClick={() => setRegistroAberto(true)} />

      <RegistroFacil
        aberta={registroAberto}
        aoFechar={() => setRegistroAberto(false)}
        contas={dados.contas}
        aoDetalhar={detalharAgora}
      />

      {formAberto ? (
        <FolhaLancamento
          key={geracao}
          aberta
          aoFechar={() => setFormAberto(false)}
          dados={dados}
          lancamento={emEdicao}
          iniciais={iniciais}
        />
      ) : null}
    </Ctx.Provider>
  );
}
