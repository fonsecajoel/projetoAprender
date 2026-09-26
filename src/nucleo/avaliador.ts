import { construir } from './trace';
import type { TraceBuilder } from './trace';
import { E, EXPLICACAO_VAZIA, RANGE_INTEIROS, restricao } from './tipos';
import type { Erro, FalhaRuntime, Origem, Tipo, Valor } from './tipos';
import { identificador } from './blocos';

export interface CampoLeigo {
  valor: unknown;
}

export interface EntradaLeiga {
  valor?: unknown;
  stack?: BlocoLeigo[];
}

export interface BlocoLeigo {
  type: string;
  fields?: Record<string, CampoLeigo>;
  inputs?: Record<string, EntradaLeiga>;
}

export const MAX_ITERACOES = 10_000;

/** Contrato para persistir valores entre avaliações. O `passo` é explícito
 *  porque o mesmo objeto é partilhado por vários avaliadores. */
export interface Regra {
  inicializa(passo: number): void;
  obtém(nome: string, passo: number): Valor | null;
  define(nome: string, passo: number, v: Valor): void;
  existe(nome: string, passo: number): boolean;
}

export function regraDeLinhas(): Regra {
  const linhas = new Map<number, Map<string, Valor>>();
  return {
    inicializa(passo) {
      linhas.set(passo, new Map());
    },
    obtém(nome, passo) {
      return linhas.get(passo)?.get(nome) ?? null;
    },
    define(nome, passo, v) {
      // Atribuir **cria** a linha se ela não existir. A versão anterior
      // ignorava a atribuição quando `inicializa` não tinha corrido, e isso
      // tornava `avaliar('guardar', …)` avulso um no-op silencioso: o bloco
      // "guardava" e nada ficava guardado, sem erro nenhum. Atribuir cria e
      // ler o que não foi atribuído falha — que é a regra de toda a vida, e
      // é a regra que o `executor` implementa chamando `inicializa` por linha.
      const linha = linhas.get(passo) ?? new Map<string, Valor>();
      linha.set(nome, v);
      linhas.set(passo, linha);
    },
    existe(nome, passo) {
      return linhas.get(passo)?.has(nome) ?? false;
    },
  };
}

export interface Entradas {
  nome?: unknown;
  ATOR?: unknown;
  NOME?: unknown;
  VALOR?: unknown;
  PASSOS?: unknown;
  CORPO?: BlocoLeigo[];
}

function origemDe(bloco: string, ranhura: number, passo: number): Origem {
  return { bloco, ranhura, passo };
}

/** O valor mais cru que existe: um tipo, um `unknown` e nada mais. O nome
 *  acaba em `Cru` porque `valorDe` é também o nome do método que resolve um
 *  valor de entrada; dois nomes e um método com o mesmo nome obrigam quem lê
 *  a parar em cada chamada para ver qual dos dois é que está a correr. */
function valorCru(tipo: Tipo, valor: unknown, bloco: string, ranhura: number, passo: number): Valor {
  return {
    tipo,
    valor,
    explicacao: EXPLICACAO_VAZIA,
    origem: origemDe(bloco, ranhura, passo),
    recusado: false,
  };
}

/** Um erro do motor. `remedio` é obrigatório e não pode ser vazio: a
 *  linguagem que explica *quando* este programa rebenta é escrita pela
 *  projeção, e o núcleo só diz o que fazer — porque o núcleo não conhece
 *  nenhuma linguagem. */
function falhar(passo: number, porque: string, remedio: string, bloco: string): FalhaRuntime {
  return {
    classe: 'FalhaRuntime',
    porque,
    passo,
    remedio,
    origem: origemDe(bloco, 0, passo),
  };
}

function entradasDe(b: BlocoLeigo): Entradas {
  return {
    nome: b.fields?.nome?.valor,
    ATOR: b.fields?.ATOR?.valor,
    NOME: b.fields?.NOME?.valor,
    VALOR: b.inputs?.VALOR?.valor,
    PASSOS: b.inputs?.PASSOS?.valor,
    CORPO: b.inputs?.CORPO?.stack,
  };
}

export function pilhaDe(raiz: BlocoLeigo | null): BlocoLeigo[] {
  if (!raiz) return [];
  if (raiz.type === 'pilha') return raiz.inputs?.CORPO?.stack ?? [];
  return [raiz];
}

export interface Avaliador {
  readonly trace: TraceBuilder;
  readonly regra: Regra;
  executar(raiz: BlocoLeigo | null): void;
  avaliar(tipo: string, e: Entradas, passo: number): Valor;
}

class AvaliadorImpl implements Avaliador {
  readonly trace: TraceBuilder = construir();
  readonly regra: Regra;

  constructor(regra?: Regra) {
    this.regra = regra ?? regraDeLinhas();
  }

  executar(raiz: BlocoLeigo | null): void {
    const pilha = pilhaDe(raiz);
    for (let i = 0; i < pilha.length; i += 1) {
      const passo = i + 1;
      const b = pilha[i]!;
      this.regra.inicializa(passo);
      this.trace.passo(passo, b.type);
      this.avaliar(b.type, entradasDe(b), passo);
      if (this.trace.erros.length > 0) break;
    }
    this.trace.fim();
  }

  avaliar(tipo: string, e: Entradas, passo: number): Valor {
    switch (tipo) {
      case 'guardar':
        return this.guardar(e, passo);
      case 'repetir':
        return this.repetir(e, passo);
      case 'dizer':
        return this.dizer(e, passo);
      case 'log':
        return this.registar(e, passo);
      case 'pressionar':
        return this.pressionar(e, passo);
      case 'dador_num':
      case 'texto':
      case 'logico':
      case 'acts':
        return this.valorDe(e.VALOR, passo, tipo, 0);
      default:
        this.trace.falha(
          falhar(
            passo,
            `O bloco "${tipo}" ainda não faz nada. A lição 1 só usa "guardar" e "repetir".`,
            `Usa um bloco que esta lição ensinou, ou espera pela lição que traz o bloco "${tipo}".`,
            tipo,
          ),
        );
        return { ...valorCru('número', undefined, tipo, 0, passo), recusado: true };
    }
  }

  /** Resolve um valor de entrada: literal, referência, ou bloco aninhado. */
  private valorDe(bruto: unknown, passo: number, bloco: string, ranhura: number): Valor {
    const origem = origemDe(bloco, ranhura, passo);
    if (bruto === null || bruto === undefined) {
      this.trace.falha(
        falhar(
          passo,
          'Falta o valor deste sítio.',
          'Arrasta um valor para dentro deste sítio, ou escreve o número directamente no sítio.',
          bloco,
        ),
      );
      return { ...valorCru('número', undefined, bloco, ranhura, passo), recusado: true };
    }
    if (typeof bruto === 'number') {
      if (Number.isFinite(bruto) && Math.abs(bruto) <= RANGE_INTEIROS) {
        return valorCru('número', bruto, bloco, ranhura, passo);
      }
      const v: Valor = { ...valorCru('número', bruto, bloco, ranhura, passo), recusado: true };
      this.trace.recusa({
        ...E(restricao('número', 'o número'), v),
        origem,
        // O `remedio` do `E` é escrito a partir do par (esperado, obtido), e
        // aqui os dois são `número`: "guarda lá um número em vez de número" não
        // é um consolo, é uma frase sem sentido. O problema não é o tipo, é o
        // tamanho, e o consolo tem de falar do tamanho.
        remedio: `Este sítio só trabalha com números de ${RANGE_INTEIROS} para baixo, em qualquer sentido. Arranca o número para um valor mais pequeno, ou deixa de usar números tão grandes.`,
      });
      return v;
    }
    if (typeof bruto === 'boolean') {
      return valorCru('lógico', bruto, bloco, ranhura, passo);
    }
    if (typeof bruto === 'object') {
      const o = bruto as { txt?: unknown; ref?: unknown; bloco?: BlocoLeigo };
      if (typeof o.txt === 'string') return valorCru('texto', o.txt, bloco, ranhura, passo);
      if (typeof o.ref === 'string') {
        const chave = identificador(o.ref);
        const v = this.regra.obtém(chave, passo);
        if (v) return { ...v, origem };
        this.trace.falha(
          falhar(
            passo,
            `A variável "${o.ref}" ainda não tem valor nesta linha.`,
            `Guarda o valor de "${o.ref}" numa linha **antes** desta, ou escreve o valor directamente aqui em vez do nome.`,
            bloco,
          ),
        );
        return { ...valorCru('número', undefined, bloco, ranhura, passo), recusado: true };
      }
      if (o.bloco) return this.avaliar(o.bloco.type, entradasDe(o.bloco), passo);
    }
    const v: Valor = { ...valorCru('número', bruto, bloco, ranhura, passo), recusado: true };
    this.trace.recusa({
      ...E(restricao('número', 'o valor'), v),
      origem,
      remedio:
        'O que chegou a este sítio não é um número, nem uma palavra, nem o nome de uma variável que já tenha valor.',
    });
    return v;
  }

  private guardar(e: Entradas, passo: number): Valor {
    const bruto = String(e.nome ?? '').trim();
    if (bruto.length === 0) {
      this.trace.falha(
        falhar(
          passo,
          'A tua variável não tem nome. O nome é o que te permite voltar a ela depois.',
          'Escreve um nome para a tua variável. Um nome só, sem espaços, e que diga o que lá está guardado.',
          'guardar',
        ),
      );
      return { ...valorCru('número', undefined, 'guardar', 0, passo), recusado: true };
    }
    const nome = identificador(bruto);
    const recebido = this.valorDe(e.VALOR, passo, 'guardar', 0);
    if (recebido.recusado) {
      this.regra.define(nome, passo, recebido);
      return recebido;
    }
    if (recebido.tipo !== 'número') {
      this.trace.recusa({
        ...E(restricao('número', 'o que guardas'), recebido),
        origem: origemDe('guardar', 0, passo),
        remedio: `Uma variável que guarda um número não pode receber a palavra "${String(recebido.valor)}". Ou guardas um número, ou mudas o valor que entra — e uma palavra é uma palavra escrita entre aspas, não um número.`,
      });
      const guardado: Valor = { ...recebido, recusado: true };
      this.regra.define(nome, passo, guardado);
      return guardado;
    }
    const final: Valor = this.regra.existe(nome, passo)
      ? {
          ...recebido,
          explicacao: {
            ...recebido.explicacao,
            porque: `Isto substitui o valor que "${bruto}" já tinha. Uma variável tem um só valor de cada vez.`,
          },
        }
      : recebido;
    this.regra.define(nome, passo, final);
    this.trace.registar(passo, final);
    return final;
  }

  /** O que decide se um número pode contar repetições: inteiro, não
   *  negativo, e dentro de `MAX_ITERACOES`. */
  private cabeComoContagem(n: number): boolean {
    return Number.isInteger(n) && n >= 0 && n <= MAX_ITERACOES;
  }

  private repeticoesInvalidas(passo: number): FalhaRuntime {
    return falhar(
      passo,
      `O número de repetições tem de ser um número inteiro de 0 a ${MAX_ITERACOES}.`,
      'Escreve neste sítio um número redondo. Um número de repetições conta vezes inteiras: 3 ou 5, nunca 1,5 — ninguém repete uma coisa uma vez e meio.',
      'repetir',
    );
  }

  private repetir(e: Entradas, passo: number): Valor {
    const bruto = e.PASSOS;

    // A contagem de repetições é o único sítio do motor que olha para o
    // número **antes** de o converter, e a razão não é performance: são dois
    // limites diferentes. `RANGE_INTEIROS` diz que nenhum número acima de
    // 1000 existe; `MAX_ITERACOES` diz que um laço não repete mais de 10000
    // vezes. Se a decisão passasse por `valorDe`, quem escrevesse
    // `repetir(10001)` lia "este número é grande demais" e nunca ficava a
    // saber que o problema era o número de repetições. Cada limite tem a sua
    // frase, e a do laço é a que ensina alguma coisa.
    if (typeof bruto === 'number' && !this.cabeComoContagem(bruto)) {
      this.trace.falha(this.repeticoesInvalidas(passo));
      return { ...valorCru('lógico', undefined, 'repetir', 0, passo), recusado: true };
    }

    const valor = this.valorDe(bruto, passo, 'repetir', 0);
    if (valor.recusado) {
      // O `valorDe` já escreveu no `trace` a razão pela qual o valor não
      // serve. Escrever um segundo erro para o mesmo número seria mostrar
      // à mesma pessoa duas queixas sobre uma coisa só.
      return { ...valorCru('lógico', undefined, 'repetir', 0, passo), recusado: true };
    }
    if (valor.tipo !== 'número' || typeof valor.valor !== 'number' || !this.cabeComoContagem(valor.valor)) {
      this.trace.falha(this.repeticoesInvalidas(passo));
      return { ...valorCru('lógico', undefined, 'repetir', 0, passo), recusado: true };
    }
    const vezes = valor.valor;

    const corpo = e.CORPO ?? [];
    for (let i = 0; i < vezes; i += 1) {
      for (const filho of corpo) {
        const passoInterno = passo + 1;
        this.regra.inicializa(passoInterno);
        this.trace.passo(passoInterno, filho.type);
        this.avaliar(filho.type, entradasDe(filho), passoInterno);
        if (this.trace.erros.length > 0) {
          return valorCru('lógico', true, 'repetir', 0, passo);
        }
      }
    }
    return valorCru('lógico', true, 'repetir', 0, passo);
  }

  private dizer(e: Entradas, passo: number): Valor {
    const recebido = this.valorDe(e.VALOR, passo, 'dizer', 0);
    if (recebido.recusado || recebido.tipo !== 'texto') {
      this.trace.recusa({
        ...E(restricao('texto', 'o que dizes'), recebido),
        origem: origemDe('dizer', 0, passo),
        remedio: `O que dizes tem de ser uma palavra. Se tens um número e queres dizê-lo, escreve-o entre aspas — é assim que se escreve uma palavra que tem algarismos dentro.`,
      });
      return { ...recebido, recusado: true };
    }
    this.trace.registar(passo, recebido);
    return recebido;
  }

  private registar(e: Entradas, passo: number): Valor {
    const recebido = this.valorDe(e.VALOR, passo, 'log', 0);
    this.trace.registar(passo, recebido);
    return recebido;
  }

  private pressionar(e: Entradas, passo: number): Valor {
    const ator = typeof e.ATOR === 'string' && e.ATOR.length > 0 ? e.ATOR : 'coelho';
    const nome = typeof e.NOME === 'string' && e.NOME.length > 0 ? e.NOME : 'executar';
    const v = valorCru('actor', ator, 'pressionar', 0, passo);
    return {
      ...v,
      explicacao: { porque: `O ${ator} vai ${nome}.`, remedio: '' },
    };
  }
}

export function avaliador(regra?: Regra): Avaliador {
  return new AvaliadorImpl(regra);
}

export function errosDe(a: Avaliador): Erro[] {
  return a.trace.erros;
}
