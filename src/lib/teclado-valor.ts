/**
 * O que cada tecla faz no teclado numérico do Registro Fácil.
 *
 * Separado do componente porque a regra tem armadilhas que só aparecem no
 * uso: Enter sobre um botão precisa acionar aquele botão, e não salvar o
 * lançamento; e atalho do navegador (Ctrl+R, ⌘+L) não pode virar dígito.
 */

export type AcaoTeclado =
  | { tipo: "digito"; valor: string }
  | { tipo: "apagar" }
  | { tipo: "salvar" }
  | null;

export type TeclaRecebida = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  /** Nome da tag onde o foco está, em maiúsculas: "BUTTON", "INPUT"… */
  alvo?: string;
};

/** Onde o navegador já sabe o que fazer com a tecla, a gente não se mete. */
const FOCO_PROPRIO = ["INPUT", "TEXTAREA", "SELECT"];

export function acaoDaTecla(e: TeclaRecebida): AcaoTeclado {
  // Atalho do sistema: deixa passar.
  if (e.metaKey || e.ctrlKey || e.altKey) return null;

  // Digitando dentro de um campo: as teclas são do campo.
  if (e.alvo && FOCO_PROPRIO.includes(e.alvo)) return null;

  if (/^[0-9]$/.test(e.key)) return { tipo: "digito", valor: e.key };

  if (e.key === "Backspace" || e.key === "Delete") return { tipo: "apagar" };

  if (e.key === "Enter") {
    // Enter com um botão em foco é para apertar aquele botão — pode ser
    // "escolher a conta Nubank", e salvar aí seria um lançamento errado.
    if (e.alvo === "BUTTON") return null;
    return { tipo: "salvar" };
  }

  // A vírgula é decorativa no teclado da tela: o valor é montado em
  // centavos, então "1250" já significa 12,50. Aceitá-la não faria nada,
  // e ignorar em silêncio é menos confuso que parecer que travou.
  return null;
}
