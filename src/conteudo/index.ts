/** A porta única do conteúdo.
 *
 *  Tudo o que a interface precisa do conteúdo entra por aqui: a lição que se
 *  está a fazer, as sondagens que a provam, e o registo de que lições existem.
 *  Nenhum ficheiro de `interface/` importa `esquema.ts` ou `sondas.ts`
 *  directamente, e por isso mudar a forma de uma sondagem é mexer num ficheiro
 *  só — e não em seis, cada um com a sua ideia do que era.
 */
export { FORMAS, FORMAS_POR_FAMILIA, FASES, FONTES, FAMILIAS } from './esquema';
export type { Bloco, Esperado, Fase, Forma, Fonte, Licao, Momento, Passo, Prova, Sonda } from './esquema';

export { CARREGAR, ErroDeAutoria, LICSOES, TEXTOS, temLicao } from './carregar';

export { executarSonda } from './sondas';
export type { ResultadoSonda } from './sondas';
