"use client";

import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Folha } from "@/components/ui/folha";
import { Segmentos } from "@/components/ui/segmentos";
import { BotaoExcluir } from "@/components/ui/botao-excluir";
import { IconeCategoria } from "@/components/icone-categoria";
import { ICONES_CATEGORIAS } from "@/lib/icones-categorias";
import { corTextoCategoria, tintaCategoria, type ModoCorCategoria } from "@/lib/cores-categoria";
import type { Categoria } from "@/lib/tipos/categorias";
import { excluirCategoria, salvarCategoria } from "./acoes";
import s from "./categoria.module.css";

const ATALHOS = ["#8FB3D9", "#E9A28E", "#A9A0D8", "#8FCFC4", "#E7A8C4", "#E3C879", "#BDA8E0", "#93C9A8"];
const TIPOS = [{ valor: "despesa", texto: "Despesa" }, { valor: "receita", texto: "Receita" }] as const;
const TINTAS = [{ valor: "auto", texto: "Automático" }, { valor: "branco", texto: "Branco" }, { valor: "preto", texto: "Preto" }] as const;
const normalizarBusca = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export function FolhaCategoria({ categoria, aoFechar }: {
  categoria: Categoria | null; aoFechar: (salvou: boolean) => void;
}) {
  const id = useId();
  const [nome, setNome] = useState(categoria?.nome ?? "");
  const [tipo, setTipo] = useState<"despesa" | "receita">(categoria?.tipo ?? "despesa");
  const [cor, setCor] = useState(categoria?.cor ?? ATALHOS[0]);
  // Categorias antigas conservam a tinta salva; as novas começam no automático.
  const [modoTinta, setModoTinta] = useState<ModoCorCategoria>(
    categoria?.cor_texto_modo ?? (categoria ? (categoria.cor_texto.toLowerCase() === "#ffffff" ? "branco" : "preto") : "auto"),
  );
  const [icone, setIcone] = useState<string | null>(categoria?.icone ?? null);
  const [escolhendoIcone, setEscolhendoIcone] = useState(false);
  const [busca, setBusca] = useState("");
  const [subs, setSubs] = useState<string[]>(categoria?.subcategorias.map(s => s.nome) ?? []);
  const [novaSub, setNovaSub] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarSalvar] = useTransition();
  const corTexto = corTextoCategoria(cor, modoTinta);
  const escolhido = ICONES_CATEGORIAS.find(i => i.id === icone);
  const termo = normalizarBusca(busca.trim());
  const filtrados = ICONES_CATEGORIAS.filter(i => normalizarBusca(i.id + " " + i.nome + " " + i.grupo).includes(termo));

  function escolherIcone(valor: string | null) {
    setIcone(valor);
    setEscolhendoIcone(false);
    setBusca("");
  }
  function adicionarSub() {
    const limpo = novaSub.trim();
    if (!limpo) return;
    if (!subs.some(s => s.toLowerCase() === limpo.toLowerCase())) setSubs([...subs, limpo]);
    setNovaSub("");
  }
  function salvar() {
    setErro(null);
    iniciarSalvar(async () => {
      const r = await salvarCategoria({
        id: categoria?.id, nome, tipo, cor, cor_texto: corTexto,
        cor_texto_modo: modoTinta, icone, subcategorias: subs,
      });
      if (r.ok) aoFechar(true); else setErro(r.erro);
    });
  }
  function excluir() {
    if (!categoria) return;
    setErro(null);
    iniciarSalvar(async () => {
      const r = await excluirCategoria(categoria.id);
      if (r.ok) aoFechar(true); else setErro(r.erro);
    });
  }

  return <Folha aberta aoFechar={() => aoFechar(false)} titulo={categoria ? "Editar categoria" : "Nova categoria"} alturaMaxima="92vh">
    <div className={s.formulario}>
      <div className={s.previa} aria-label="Prévia da categoria">
        <span className={s.emblema} style={{ background: cor, color: corTexto }}>
          {icone ? <IconeCategoria icone={icone} tamanho={32} /> : (nome.trim() || "C").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <span className={s.legenda}>Assim aparece no extrato</span>
          <strong className={s.nomePrevia}>{nome.trim() || "Nome da categoria"}</strong>
          <span className={s.detalhe}>{tipo === "despesa" ? "Despesa" : "Receita"}</span>
        </div>
      </div>

      <Campo rotulo="Nome" value={nome} onChange={e => setNome(e.target.value)} maxLength={40} placeholder="Ex.: Alimentação" />
      <Segmentos rotulo="Tipo" opcoes={TIPOS} valor={tipo} aoEscolher={setTipo} />

      <section className={s.aparencia} aria-label="Aparência da categoria">
        <div className={s.campo}>
          <span className="rotulo" id={id + "-icone-rotulo"}>Ícone</span>
          <button type="button" className={s.seletorIcone} aria-labelledby={id + "-icone-rotulo " + id + "-icone-valor"}
            aria-expanded={escolhendoIcone} aria-controls={id + "-icones"} onClick={() => setEscolhendoIcone(!escolhendoIcone)}>
            <span className={s.amostraIcone} style={{ background: cor, color: corTexto }}>
              {icone ? <IconeCategoria icone={icone} tamanho={26} /> : <span className={s.semIcone}>—</span>}
            </span>
            <span className={s.valorIcone} id={id + "-icone-valor"}>{escolhido?.nome ?? "Sem ícone"}</span>
            <span className={s.trocar}>{icone ? "Trocar" : "Escolher"}</span>
            <ChevronDown size={17} aria-hidden style={{ transform: escolhendoIcone ? "rotate(180deg)" : undefined }} />
          </button>
          {escolhendoIcone ? <div className={s.escolha} id={id + "-icones"} role="region" aria-label="Escolher ícone da categoria">
            <div className={s.busca}>
              <Search size={17} aria-hidden />
              <input aria-label="Buscar ícone" placeholder="Buscar por nome ou número" value={busca} onChange={e => setBusca(e.target.value)} />
              {busca ? <button type="button" aria-label="Limpar busca de ícones" onClick={() => setBusca("")}><X size={16} aria-hidden /></button> : null}
            </div>
            <button type="button" className={s.opcaoSemIcone} aria-pressed={!icone} onClick={() => escolherIcone(null)}>
              Sem ícone {!icone ? <Check size={16} aria-hidden /> : null}
            </button>
            <div className={s.gradeIcones}>
              {filtrados.map(i => <button type="button" key={i.id}
                className={s.opcaoIcone} aria-pressed={icone === i.id} title={i.nome}
                aria-label={"Ícone " + i.id + ": " + i.nome}
                onClick={() => escolherIcone(i.id)}>
                <span style={{ background: cor, color: corTexto }}><IconeCategoria icone={i.id} tamanho={30} /></span>
              </button>)}
            </div>
            <p className={s.detalhe} role="status">{filtrados.length ? filtrados.length + (filtrados.length === 1 ? " ícone" : " ícones") : "Nenhum ícone encontrado."}</p>
          </div> : null}
        </div>

        <div className={s.campo}>
          <span className="rotulo">Cor da categoria</span>
          <div className={s.paleta} role="group" aria-label="Cores da categoria">
            {ATALHOS.map(a => <button key={a} type="button" className={s.corAtalho}
              onClick={() => setCor(a)} aria-label={"Usar a cor " + a} aria-pressed={cor.toLowerCase() === a.toLowerCase()}>
              <span style={{ background: a, color: tintaCategoria(a) }}>{cor.toLowerCase() === a.toLowerCase() ? <Check size={17} strokeWidth={2.5} aria-hidden /> : null}</span>
            </button>)}
          </div>
          <label className={s.corLivre}>
            <input type="color" value={cor} onChange={e => setCor(e.target.value)} aria-label="Escolher cor da categoria" />
            <span>Cor personalizada</span><span className={s.hex}>{cor.toUpperCase()}</span>
          </label>
        </div>

        <div className={s.campo}>
          <Segmentos rotulo="Cor do texto e ícone" opcoes={TINTAS} valor={modoTinta} aoEscolher={setModoTinta} />
          <p className={s.detalhe}>{modoTinta === "auto" ? "O contraste se ajusta à cor da categoria." : "Sua escolha vale para o texto e para o ícone."}</p>
          <div className={s.chipPrevia}>
            <span style={{ background: cor, color: corTexto }} data-previa-cor>
              <IconeCategoria icone={icone} tamanho={20} />{nome.trim() || "Nome da categoria"}
            </span>
          </div>
        </div>
      </section>

      <div className={s.campo}>
        <span className="rotulo">Subcategorias</span>
        {subs.length ? <ul className={s.subcategorias}>{subs.map(sub => <li key={sub}>
          {sub}<button type="button" aria-label={"Remover " + sub} onClick={() => setSubs(subs.filter(x => x !== sub))}><X size={15} aria-hidden /></button>
        </li>)}</ul> : null}
        <div className={s.novaSub}>
          <input value={novaSub} onChange={e => setNovaSub(e.target.value)} onKeyDown={e => { if(e.key === "Enter") { e.preventDefault(); adicionarSub(); } }}
            placeholder="Nova subcategoria" aria-label="Nova subcategoria" />
          <Botao variante="contorno" type="button" onClick={adicionarSub} style={{ width: "auto", paddingInline: 14 }}><Plus size={17} aria-hidden /><span>Adicionar</span></Botao>
        </div>
      </div>
      {erro ? <p className={s.erro} role="alert">{erro}</p> : null}
      <div className={s.acoes}>
        <Botao onClick={salvar} carregando={salvando}>Salvar</Botao>
        {categoria ? <BotaoExcluir rotulo="Excluir categoria" oQueSePerde="A categoria e as subcategorias dela. Os lançamentos continuam existindo, mas ficam sem classificação nos relatórios." aoConfirmar={excluir} carregando={salvando} /> : null}
      </div>
    </div>
  </Folha>;
}
