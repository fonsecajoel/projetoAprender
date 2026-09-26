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

/** Ids de bloco. Slugs ASCII em minúsculas: são a identidade do bloco, e
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
} as const;

export const CORES: Record<string, string> = {
  guardar: '#2563eb',
  repetir: '#7c3aed',
  dizer: '#059669',
  log: '#0d9488',
  pressionar: '#ea580c',
  dador_num: '#3b82f6',
  texto: '#10b981',
  logico: '#f59e0b',
  acts: '#a855f7',
};

const PALAVRAS_PYTHON = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'True', 'try', 'while', 'with', 'yield',
]);

/** Converte um nome escrito por uma pessoa num identificador Python válido. */
export function identificador(nome: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_');
  const limpo = base.length === 0 || /^[0-9]/.test(base) ? `v_${base}` : base;
  return PALAVRAS_PYTHON.has(limpo) ? `${limpo}_` : limpo;
}

export const TIPO_DE_BLOCO: Record<string, Tipo> = {
  dador_num: 'número',
  texto: 'texto',
  logico: 'lógico',
  acts: 'actor',
};
