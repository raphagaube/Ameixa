"use client";

import { Pencil, Plus, Tags } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CabecalhoVoltar } from "@/components/cabecalho-voltar";
import { Botao } from "@/components/ui/botao";
import { IconeCategoria } from "@/components/icone-categoria";
import type { Categoria } from "@/lib/tipos/categorias";
import { FolhaCategoria } from "./folha-categoria";
import s from "./painel-categorias.module.css";

export function PainelCategorias({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter();
  const [emEdicao, setEmEdicao] = useState<Categoria | "nova" | null>(null);

  function fechar(salvou: boolean) {
    setEmEdicao(null);
    if (salvou) router.refresh();
  }

  return (
    <div className={s.pagina}>
      <CabecalhoVoltar titulo="Categorias" />
      <div className={s.introducao}>
        <p>Organize seus lançamentos com cores, ícones e subcategorias.</p>
        <Botao onClick={() => setEmEdicao("nova")} className={s.criar}>
          <Plus size={18} strokeWidth={1.5} aria-hidden />
          Nova categoria
        </Botao>
      </div>

      {categorias.length === 0 ? (
        <div className={s.vazio}>
          <span className={s.iconeVazio}><Tags size={26} strokeWidth={1.5} aria-hidden /></span>
          <h2>Nenhuma categoria ainda</h2>
          <p>Crie sua primeira categoria para organizar o extrato do seu jeito.</p>
        </div>
      ) : (
        <section aria-label="Suas categorias" className={s.colecao}>
          <div className={s.tituloLista}>
            <h2>Suas categorias</h2>
            <span>{categorias.length} {categorias.length === 1 ? "categoria" : "categorias"}</span>
          </div>
          <ul className={s.lista}>
            {categorias.map((c) => (
              <li key={c.id} className={s.cartao}>
                <div className={s.cabecalhoCartao}>
                  <span aria-hidden className={s.emblema} style={{ background: c.cor, color: c.cor_texto }}>
                    {c.icone ? <IconeCategoria icone={c.icone} tamanho={30} /> : c.nome.slice(0, 1).toUpperCase()}
                  </span>
                  <div className={s.identificacao}>
                    <h3>{c.nome}</h3>
                    <p>
                      {c.tipo === "despesa" ? "Despesa" : "Receita"} ·{" "}
                      {c.subcategorias.length === 1 ? "1 subcategoria" : c.subcategorias.length + " subcategorias"}
                    </p>
                  </div>
                  <button type="button" className={s.editar} onClick={() => setEmEdicao(c)}>
                    <Pencil size={15} strokeWidth={1.5} aria-hidden />
                    Editar
                  </button>
                </div>
                {c.subcategorias.length > 0 ? (
                  <ul className={s.subcategorias}>
                    {c.subcategorias.map((sub) => <li key={sub.id}>{sub.nome}</li>)}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {emEdicao ? <FolhaCategoria categoria={emEdicao === "nova" ? null : emEdicao} aoFechar={fechar} /> : null}
    </div>
  );
}
