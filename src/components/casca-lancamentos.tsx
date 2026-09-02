"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { BarraAbas } from "@/components/barra-abas";
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
  const caminho = usePathname();
  // O botão flutuante fica só no Início. Nas outras telas ele acabava por
  // cima do rodapé — a barra de "Organizar em lote", o salvar dos Ajustes.
  // Lá o caminho para lançar é a aba Início, a um toque de distância.
  const mostrarFlutuante = caminho === "/";

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
      <main
        className="mx-auto w-full"
        style={{
          maxWidth: "var(--largura)",
          paddingLeft: "var(--pad-lateral)",
          paddingRight: "var(--pad-lateral)",
          // Só a tela com botão flutuante precisa do respiro grande; nas
          // outras, sobrar espaço vazio no fim da página é desleixo.
          paddingBottom: mostrarFlutuante
            ? "var(--pad-inferior)"
            : "var(--pad-inferior-sem-botao)",
        }}
      >
        {children}
      </main>

      <BarraAbas />

      {mostrarFlutuante ? (
        <BotaoRegistroFacil onClick={() => setRegistroAberto(true)} />
      ) : null}

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
