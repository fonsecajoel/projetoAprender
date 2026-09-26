export const RANGE_INTEIROS = 1000;

/** Quantas voltas um laço pode dar. Vive aqui, e não em `avaliador.ts`, porque
 *  é um fato do produto e não do motor de blocos: o `interpretar` do texto
 *  tem de respeitar o mesmo limite, e dois limites escritos à mão divergem no
 *  primeiro dia em que alguém muda um deles. `RANGE_INTEIROS` é o fato
 *  vizinho — e note-se que `MAX_ITERACOES` é maior, porque um laço de 5000
 *  voltas repete 5000 valores que vão todos caber no mesmo número. */
export const MAX_ITERACOES = 10_000;

/** As seis linguagens do produto. O núcleo sabe os *nomes*; não sabe sintaxe. */
export type Language = 'python' | 'java' | 'go' | 'typescript' | 'javascript' | 'sql';

export const LINGUAGENS: readonly Language[] = [
  'python', 'java', 'go', 'typescript', 'javascript', 'sql',
];

/** Como cada linguagem se escreve para quem lê. Vive no núcleo porque três
 *  ecrãs precisam dele — o painel de texto, o seletor e a sonda — e porque
 *  escrevê-lo à mão em cada um deles é como um aluno de Java acaba a ler
 *  "O teu código em Python". Não é sintaxe: é o nome da coisa. */
export const NOMES: Record<Language, string> = {
  python: 'Python',
  java: 'Java',
  go: 'Go',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  sql: 'SQL',
};

/** `função` existe no tipo mas nenhum bloco a produz no Plano A: o primeiro
 *  conceito é variável e tipo, e `função` chega com o conceito de função
 *  (Plano B). Está aqui para que a união não cresça por baixo das sondas. */
export type Tipo = 'número' | 'texto' | 'lógico' | 'lista' | 'função' | 'actor';

export interface Explicacao {
  /** Texto para quem não sabe programar, em português europeu. */
  porque: string;
  /** O que fazer em vez disto, nos termos desta linguagem. */
  remedio: string;
}

export const EXPLICACAO_VAZIA: Explicacao = { porque: '', remedio: '' };

export interface Origem {
  bloco: string;
  ranhura: number;
  passo: number;
}

export interface Valor {
  readonly tipo: Tipo;
  readonly valor: unknown;
  readonly explicacao: Explicacao;
  readonly origem: Origem;
  /** Verdadeiro quando este valor já foi recusado. Nenhuma ranhura o aceita
   *  em silêncio depois disso, mesmo que o tipo encaixe. */
  readonly recusado: boolean;
}

export interface RestricaoDeTipo {
  tipo: Tipo;
  nome: string;
  cabeEm(v: Valor): boolean;
}

export interface Recusa {
  classe: 'Recusa';
  porque: string;
  esperado: Tipo;
  obtido: Tipo;
  remedio: string;
  origem: Origem;
}

export interface FalhaRuntime {
  classe: 'FalhaRuntime';
  porque: string;
  passo: number;
  remedio: string;
  origem: Origem;
}

export interface QuebraEquivalencia {
  classe: 'QuebraEquivalencia';
  porque: string;
  linha: number;
  esperado: string;
  obtido: string;
  remedio: string;
  origem: Origem;
}

export type Erro = Recusa | FalhaRuntime | QuebraEquivalencia;

// `nome: string = tipo` e não `nome = tipo`. Sem a anotação, o TypeScript
// infere o tipo do parâmetro a partir do valor por omissão — e o valor por
// omissão é um `Tipo`, portanto `restricao('número', 'total')` deixava de
// compilar. O nome de um sítio é uma `string` que o suele ser `Tipo`; não é
// um `Tipo` que às vezes seja uma frase.
export function restricao(tipo: Tipo, nome: string = tipo): RestricaoDeTipo {
  return {
    tipo,
    nome,
    cabeEm(v: Valor): boolean {
      if (v.recusado) return false;
      if (v.tipo !== tipo) return false;
      if (tipo === 'número') {
        if (typeof v.valor !== 'number') return false;
        if (!Number.isFinite(v.valor)) return false;
        if (Math.abs(v.valor) > RANGE_INTEIROS) return false;
      }
      return true;
    },
  };
}

export function val(
  tipo: Tipo,
  valor: unknown,
  explicacao: Explicacao,
  origem: Origem,
  recusado = false,
): Valor {
  return { tipo, valor, explicacao, origem, recusado };
}

/** Marca um `Valor` como recusado depois de o transformar. */
export function valorEm(v: Valor, transformar: (valor: unknown) => unknown): Valor {
  return { ...v, valor: transformar(v.valor), recusado: true };
}

export function E(raio: RestricaoDeTipo, v: Valor): Recusa {
  return {
    classe: 'Recusa',
    porque: `Este sítio só aceita ${raio.tipo}. Recebeste ${v.tipo}.`,
    esperado: raio.tipo,
    obtido: v.tipo,
    remedio: `Guarda lá um ${raio.tipo} em vez de ${v.tipo}.`,
    origem: v.origem,
  };
}
