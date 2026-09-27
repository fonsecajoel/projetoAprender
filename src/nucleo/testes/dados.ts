import type { BlocoLeigo } from '../blocos';

/** Um bloco `guardar` com um valor cru: número, texto ou referência. */
export function guardar(nome: string, valor: unknown): BlocoLeigo {
  return { type: 'guardar', fields: { nome: { valor: nome } }, inputs: { VALOR: { valor } } };
}

/** O mesmo bloco, com o valor já embrulhado em `texto()` — a saída do robô. */
export function guardarTexto(nome: string, valor: unknown): BlocoLeigo {
  return {
    type: 'guardar',
    fields: { nome: { valor: nome } },
    inputs: { VALOR: { valor: { txt: String(valor) } } },
  };
}

export function repetir(vezes: unknown, corpo: BlocoLeigo[]): BlocoLeigo {
  return { type: 'repetir', fields: {}, inputs: { PASSOS: { valor: vezes }, CORPO: { stack: corpo } } };
}

export function dizer(valor: unknown): BlocoLeigo {
  return { type: 'dizer', fields: {}, inputs: { VALOR: { valor } } };
}

export function log(valor: unknown): BlocoLeigo {
  return { type: 'log', fields: {}, inputs: { VALOR: { valor } } };
}

export function pilha(...blocos: BlocoLeigo[]): BlocoLeigo {
  return { type: 'pilha', inputs: { CORPO: { stack: blocos } } };
}
