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

  valor(passo: number, v: Valor): void {
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
