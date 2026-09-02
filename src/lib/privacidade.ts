/**
 * Modo privado: esconder todos os valores do app de uma vez.
 *
 * Serve para mostrar o Ameixa a outra pessoa sem expor quanto se tem e
 * quanto se deve. A escolha vive no navegador, como o tema — é preferência
 * de aparelho, não da conta: esconder no computador do escritório não
 * deveria esconder no celular de casa.
 */

export const CHAVE_OCULTAR = "ameixa:ocultar";

/** Atributo lido pelo CSS que faz o disfarce. */
export const ATRIBUTO = "data-ocultar";

/**
 * Roda antes da primeira pintura, junto com o script do tema.
 *
 * Sem isto o app pintaria os valores e só depois os esconderia. Num recurso
 * de privacidade esse instante é o problema inteiro.
 */
export const scriptAntiFlashValores = `
(function(){
  try{
    if(localStorage.getItem(${JSON.stringify(CHAVE_OCULTAR)}) === '1'){
      document.documentElement.setAttribute(${JSON.stringify(ATRIBUTO)},'1');
    }
  }catch(e){}
})();
`;

/** Lê a preferência do navegador. Falso quando não dá para ler. */
export function estaOculto(): boolean {
  try {
    return localStorage.getItem(CHAVE_OCULTAR) === "1";
  } catch {
    // Janela anônima ou armazenamento bloqueado: mostra os valores, que é
    // o comportamento normal do app.
    return false;
  }
}

/**
 * Avisa quem precisa reagir em JavaScript.
 *
 * O CSS resolve o texto na tela, mas há dois casos que ele não alcança: o
 * texto de dica que aparece ao passar o mouse (fica no atributo, não na
 * tela) e o relatório, que precisa nascer já com "ocultar valores" marcado.
 */
export const EVENTO = "ameixa:ocultar";

/** Aplica e guarda. Devolve o estado novo. */
export function definirOculto(oculto: boolean): boolean {
  const raiz = document.documentElement;
  if (oculto) raiz.setAttribute(ATRIBUTO, "1");
  else raiz.removeAttribute(ATRIBUTO);

  try {
    if (oculto) localStorage.setItem(CHAVE_OCULTAR, "1");
    else localStorage.removeItem(CHAVE_OCULTAR);
  } catch {
    // Sem armazenamento a escolha vale só para esta aba.
  }

  window.dispatchEvent(new CustomEvent(EVENTO, { detail: oculto }));
  return oculto;
}
