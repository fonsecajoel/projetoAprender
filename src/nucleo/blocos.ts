import type { Tipo } from './tipos';

export interface CampoLeigo {
  valor: unknown;
}

export interface EntradaLeiga {
  valor?: unknown;
  stack?: BlocoLeigo[];
}

/** A forma de um bloco, tal como vem do Blockly e do YAML — e nada mais.
 *
 *  Vive aqui, no vocabulário, e não em `avaliador.ts`, porque este tipo
 *  descreve *dados* e não comportamento: o ecrã de blocos (Task 9), o
 *  carregador de lições (Task 7) e as projeções (Task 4) todos precisam de
 *  o nomear, e nenhum deles deve ter de importar o motor para isso. O motor
 *  é que caminha estes blocos; eles não precisam de saber que ele existe.
 *
 *  `fields` é o que a pessoa vê escrito no bloco — o nome de uma variável,
 *  o texto de um botão — e `inputs` é o que se liga a outros blocos. A
 *  distinção não é cosmética: um nome é um valor escrito à mão e um valor
 *  pode ser um bloco, e uma função de emissão que os trocasse emitiria
 *  `undefined` no sítio onde ia o nome. */
export interface BlocoLeigo {
  type: string;
  fields?: Record<string, CampoLeigo>;
  inputs?: Record<string, EntradaLeiga>;
}

/** Os ids de bloco. Slugs ASCII em minúsculas: são a identidade do bloco, e
 *  nunca o texto que o utilizador lê. O texto vive no Blockly e no YAML. */
export const BLOCOS = {
  guardar: 'guardar',
  repetir: 'repetir',
  dizer: 'dizer',
  log: 'log',
  pressionar: 'pressionar',
  executar: 'executar',
  atribuir: 'atribuir',
  mostrar: 'mostrar',
  variavel: 'variavel',
} as const;

/** As cores, e a tabela é `as const` por uma razão que o compilador
 *  impôs e que se provou ser a certa: com `Record<string, string>` e o
 *  `noUncheckedIndexedAccess` ligado, `CORES.guardar` é `string | undefined`, e
 *  uma cor em falta passava a ser uma cor qualquer — ou, pior, um `undefined`
 *  entregue ao Blockly. Uma tabela de cores cujas chaves se podem perder não
 *  é uma tabela de cores. */
export const CORES = {
  guardar: '#2563eb',
  repetir: '#7c3aed',
  dizer: '#059669',
  log: '#0d9488',
  pressionar: '#ea580c',
  dador_num: '#3b82f6',
  texto: '#10b981',
  logico: '#f59e0b',
  acts: '#a855f7',
  variavel: '#0891b2',
} as const;

const PALAVRAS_PYTHON = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'True', 'try', 'while', 'with', 'yield',
]);

const PALAVRAS_JAVA = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'float', 'for', 'goto', 'if', 'implements', 'import',
  'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package',
  'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
  'try', 'void', 'volatile', 'while',
]);

/** Converte um nome escrito por uma pessoa num identificador que não choca
 *  com a linguagem. Os acentos saem, o que não é ASCII vira `_`, e um nome
 *  que começa por número ganha um `v_` à frente.
 *
 *  As palavras reservadas entram no fim e **por linguagem**: `int` é palavra em
 *  Java e não é em Python, e `class` é palavra nas duas. Uma lista só — a da
 *  primeira linguagem — produz `int int = 5;`, que não é Java, e o aluno
 *  recebe um erro de sintaxe numa linha em que só escreveu o nome da variável.
 *  Uma palavra reservada que não apanhe é o mesmo tipo de erro que uma
 *  palavra que apanha a mais: nos dois, o produto escreveu uma coisa que não
 *  quereva escrever. */
function identificadorDe(nome: string, reservadas: Set<string>): string {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_');
  const limpo = base.length === 0 || /^[0-9]/.test(base) ? `v_${base}` : base;
  return reservadas.has(limpo) ? `${limpo}_` : limpo;
}

/** Um identificador Python válido. */
export function identificador(nome: string): string {
  return identificadorDe(nome, PALAVRAS_PYTHON);
}

/** Um identificador Java válido. */
export function identificadorJava(nome: string): string {
  return identificadorDe(nome, PALAVRAS_JAVA);
}

/**
 * O tipo *declarado* de um bloco, e só esse.
 *
 *  A palavra «declarado» está no nome por uma razão que a Task 11 vai pagar:
 *  um bloco que traz o valor dentro de si — um número, um texto, um sim ou
 *  não, um ator — tem um tipo antes de o programa correr. Uma referência a
 *  uma variável **não tem**, e por isso `variavel` não está nesta tabela.
 *
 *  A ausência não é uma falha de preenchimento: é a resposta certa. O tipo de
 *  `total` só existe depois da primeira atribuição, e quem a preenchesse com
 *  «número» estaria a mentir ao aluno sobre a linguagem que ele escolheu.
 */
export const TIPO_DE_BLOCO: Record<string, Tipo> = {
  dador_num: 'número',
  texto: 'texto',
  logico: 'lógico',
  acts: 'actor',
};

// ---------------------------------------------------------------------------
// Ler um bloco
// ---------------------------------------------------------------------------
//
// Estas três funções vivem ao lado de `BlocoLeigo` — e não em cada projeção —
// porque todas as projeções precisam delas e porque uma delas já foi escrita
// duas vezes com o mesmo erro. `corpoDe` é o caso: o corpo de um `repetir`
// vive em `inputs.CORPO.stack`, e `pilhaDe` também abre uma pilha de um
// `CORPO`. Confundir os dois dá um `for` repetido até a pilha estourar, e o
// erro que aparece ao aluno fala da pilha e não dos blocos.

/** O valor de uma ranhura, ou `undefined` se não houver. */
export function entradaDe(b: BlocoLeigo, chave: string): unknown {
  const i = b.inputs?.[chave];
  return i !== undefined && 'valor' in i ? i.valor : undefined;
}

/** O que a pessoa escreveu no bloco.
 *
 *  O nome de uma variável é um `campo`, não uma entrada. Ler o nome de um
 *  `guardar` de `inputs.NOME` — que não existe — produz `undefined = 5` para o
 *  bloco mais básico do produto, e esse é o tipo de bug que só aparece quando
 *  se vê o texto gerado, nunca num teste que só verifique tipos. */
export function campoDe(b: BlocoLeigo, chave: string): unknown {
  return b.fields?.[chave]?.valor;
}

/** O corpo de um `repetir`, e não `pilhaDe(b)`. */
export function corpoDe(b: BlocoLeigo): BlocoLeigo[] {
  return b.inputs?.CORPO?.stack ?? [];
}
