import type { Erro, QuebraEquivalencia, Recusa, Valor, FalhaRuntime } from './tipos';

export type Evento =
  | { tipo: 'passo'; passo: number; bloco: string }
  | { tipo: 'valor'; passo: number; valor: Valor }
  | { tipo: 'erro'; passo: number; erro: Erro }
  | { tipo: 'fim'; passos: number };

export interface Trace {
  eventos: Evento[];
  valores: Valor[];
  erros: Erro[];
  passos: number;
}

export function registar(passo: number, valor: Valor): Evento {
  return { tipo: 'valor', passo, valor };
}

export class TraceBuilder {
  readonly eventos: Evento[] = [];
  readonly valores: Valor[] = [];
  readonly erros: Erro[] = [];
  passos = 0;

  passo(passo: number, bloco: string): void {
    this.passos = passo;
    this.eventos.push({ tipo: 'passo', passo, bloco });
  }

  /** Chama o `registar` de módulo em vez de repetir o literal: o evento de
   *  valor é construído num sítio só, e o `registar` livre é a coisa que os
   *  testes importam. Chamá-lo por um nome diferente do que tem aqui — era
   *  `valor`, um substantivo entre verbos — é a razão pela qual o
   *  `avaliador.ts` da T2, escrito contra este ficheiro, chamava
   *  `trace.registar` e recebia `is not a function` em quinze sítios. */
  registar(passo: number, v: Valor): void {
    this.valores.push(v);
    this.eventos.push(registar(passo, v));
  }

  recusa(r: Recusa, passo = r.origem.passo): void {
    this.erros.push(r);
    this.eventos.push({ tipo: 'erro', passo, erro: r });
  }

  falha(f: FalhaRuntime): void {
    this.erros.push(f);
    this.eventos.push({ tipo: 'erro', passo: f.passo, erro: f });
  }

  divergencia(q: QuebraEquivalencia): void {
    this.erros.push(q);
    this.eventos.push({ tipo: 'erro', passo: q.linha, erro: q });
  }

  fim(): void {
    this.eventos.push({ tipo: 'fim', passos: this.passos });
  }
}

export function construir(): TraceBuilder {
  return new TraceBuilder();
}
