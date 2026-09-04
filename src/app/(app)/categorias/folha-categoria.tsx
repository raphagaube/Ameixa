"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Folha } from "@/components/ui/folha";
import type { Categoria } from "@/lib/tipos/categorias";
import { tintaSobreAcento } from "@/lib/theme";
import { excluirCategoria, salvarCategoria } from "./acoes";
import { BotaoExcluir } from "@/components/ui/botao-excluir";

/** Os oito atalhos de cor do handoff. */
const ATALHOS = [
  "#8FB3D9",
  "#E9A28E",
  "#A9A0D8",
  "#8FCFC4",
  "#E7A8C4",
  "#E3C879",
  "#BDA8E0",
  "#93C9A8",
];

type ModoTinta = "auto" | "claro" | "escuro";

export function FolhaCategoria({
  categoria,
  aoFechar,
}: {
  categoria: Categoria | null;
  aoFechar: (salvou: boolean) => void;
}) {
  const [nome, setNome] = useState(categoria?.nome ?? "");
  const [tipo, setTipo] = useState<"despesa" | "receita">(
    categoria?.tipo ?? "despesa",
  );
  const [cor, setCor] = useState(categoria?.cor ?? ATALHOS[0]);
  const [modoTinta, setModoTinta] = useState<ModoTinta>("auto");
  const [tintaManual, setTintaManual] = useState(categoria?.cor_texto ?? "#14161a");
  const [subs, setSubs] = useState<string[]>(
    categoria?.subcategorias.map((s) => s.nome) ?? [],
  );
  const [novaSub, setNovaSub] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarSalvar] = useTransition();

  // "Automático" escolhe a tinta por luminância — o mesmo cálculo do tema.
  const corTexto =
    modoTinta === "auto"
      ? tintaSobreAcento(cor)
      : modoTinta === "claro"
        ? "#ffffff"
        : "#14161a";

  function adicionarSub() {
    const limpo = novaSub.trim();
    if (!limpo) return;
    if (subs.some((s) => s.toLowerCase() === limpo.toLowerCase())) {
      setNovaSub("");
      return;
    }
    setSubs([...subs, limpo]);
    setNovaSub("");
  }

  function salvar() {
    setErro(null);
    iniciarSalvar(async () => {
      const r = await salvarCategoria({
        id: categoria?.id,
        nome,
        tipo,
        cor,
        cor_texto: modoTinta === "auto" ? corTexto : tintaManual,
        subcategorias: subs,
      });
      if (r.ok) aoFechar(true);
      else setErro(r.erro);
    });
  }

  function excluir() {
    if (!categoria) return;
    setErro(null);
    iniciarSalvar(async () => {
      const r = await excluirCategoria(categoria.id);
      if (r.ok) aoFechar(true);
      else setErro(r.erro);
    });
  }

  const segmento = (ativo: boolean): React.CSSProperties => ({
    flex: 1,
    height: 44,
    borderRadius: "var(--rs)",
    border: `1px solid ${ativo ? "var(--deep)" : "var(--ln)"}`,
    background: ativo ? "var(--tint)" : "transparent",
    color: ativo ? "var(--deep)" : "var(--color-text)",
    fontSize: 14,
    fontWeight: ativo ? 700 : 500,
  });

  return (
    <Folha
      aberta
      aoFechar={() => aoFechar(false)}
      titulo={categoria ? "Editar categoria" : "Nova categoria"}
      alturaMaxima="92vh"
    >
      <div className="flex flex-col" style={{ gap: 16, paddingBottom: 8 }}>
        <Campo
          rotulo="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={40}
        />

        <div className="flex flex-col" style={{ gap: 6 }}>
          <span className="rotulo">Tipo</span>
          <div className="flex" style={{ gap: 8 }}>
            <button type="button" onClick={() => setTipo("despesa")} style={segmento(tipo === "despesa")}>
              Despesa
            </button>
            <button type="button" onClick={() => setTipo("receita")} style={segmento(tipo === "receita")}>
              Receita
            </button>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 6 }}>
          <span className="rotulo">Cor</span>
          <div className="flex items-center" style={{ gap: 10 }}>
            <input
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              aria-label="Escolher cor da categoria"
              style={{
                width: 52,
                height: 44,
                minHeight: 44,
                padding: 2,
                border: "1px solid var(--ln)",
                borderRadius: "var(--rs)",
                background: "var(--sf)",
              }}
            />
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {ATALHOS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setCor(a)}
                  aria-label={`Usar a cor ${a}`}
                  aria-pressed={cor.toLowerCase() === a.toLowerCase()}
                  style={{
                    width: 44,
                    height: 44,
                    minHeight: 44,
                    borderRadius: 999,
                    background: a,
                    border:
                      cor.toLowerCase() === a.toLowerCase()
                        ? "2px solid var(--color-text)"
                        : "1px solid var(--ln)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 6 }}>
          <span className="rotulo">Cor do texto</span>
          <div className="flex" style={{ gap: 8 }}>
            {(["auto", "claro", "escuro"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setModoTinta(m);
                  if (m !== "auto") setTintaManual(m === "claro" ? "#ffffff" : "#14161a");
                }}
                style={segmento(modoTinta === m)}
              >
                {m === "auto" ? "Automático" : m === "claro" ? "Claro" : "Escuro"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 6 }}>
          <span className="rotulo">Prévia</span>
          <div
            style={{
              borderRadius: "var(--r)",
              border: "1px solid var(--ln2)",
              padding: 14,
            }}
          >
            <span
              style={{
                background: cor,
                color: corTexto,
                borderRadius: 999,
                padding: "4px 12px",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {nome.trim() || "Nome da categoria"}
            </span>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 6 }}>
          <span className="rotulo">Subcategorias</span>
          {subs.length > 0 ? (
            <ul className="flex flex-wrap" style={{ gap: 6 }}>
              {subs.map((s) => (
                <li
                  key={s}
                  className="flex items-center"
                  style={{
                    gap: 4,
                    minHeight: 44,
                    fontSize: 13,
                    border: "1px solid var(--ln)",
                    borderRadius: 999,
                    padding: "3px 4px 3px 12px",
                  }}
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => setSubs(subs.filter((x) => x !== s))}
                    aria-label={`Remover ${s}`}
                    className="grid place-items-center"
                    style={{
                      // Estreito mas da altura do chip: o dedo acerta a
                      // faixa inteira, sem o X virar uma bola de 44px ao
                      // lado de um texto de 13.
                      width: 34,
                      height: 38,
                      minHeight: 38,
                      borderRadius: 999,
                      color: "var(--mut)",
                      background: "transparent",
                    }}
                  >
                    <X size={15} strokeWidth={2} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex" style={{ gap: 8 }}>
            <input
              value={novaSub}
              onChange={(e) => setNovaSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionarSub();
                }
              }}
              placeholder="Nova subcategoria"
              aria-label="Nova subcategoria"
              style={{
                flex: 1,
                padding: 12,
                fontSize: 15,
                borderRadius: "var(--rs)",
                border: "1px solid var(--ln)",
                background: "var(--sf)",
                color: "var(--color-text)",
              }}
            />
            <Botao
              variante="contorno"
              type="button"
              onClick={adicionarSub}
              style={{ width: "auto", paddingInline: 18 }}
            >
              Adicionar
            </Botao>
          </div>
        </div>

        {erro ? (
          <p
            role="alert"
            style={{
              fontSize: 13,
              color: "var(--bad)",
              borderLeft: "3px solid var(--bad)",
              paddingLeft: 10,
            }}
          >
            {erro}
          </p>
        ) : null}

        <Botao onClick={salvar} carregando={salvando}>
          Salvar
        </Botao>

        {categoria ? (
          <BotaoExcluir
            rotulo="Excluir categoria"
            oQueSePerde="A categoria e as subcategorias dela. Os lançamentos continuam existindo, mas ficam sem classificação nos relatórios."
            aoConfirmar={excluir}
            carregando={salvando}
          />
        ) : null}
      </div>
    </Folha>
  );
}
