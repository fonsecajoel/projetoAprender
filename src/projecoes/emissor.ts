import type { Anotacao } from './tipos';

/** Os nomes de contador disponíveis para os laços, por ordem de preferência. */
export const NOMES_DE_CONTADOR = ['i', 'j', 'k', 'm', 'n'] as const;

/** Acumula linhas e anotações, sabendo em que linha do programa está.
 *
 *  Vive aqui, e não em cada projeção, porque é a *mesma* em todas: o que muda
 *  entre linguagens é o texto que se escreve e a frase que o explica — e isso
 *  é o `emitir` de cada uma. O que não muda é a contagem das linhas, e a
 *  contagem é a parte em que a primeira projeção tinha o bug: o emissor de um
 *  corpo de laço contava a partir de 1 e a anotação do `x = 1` dizia "linha
 *  1", sendo que a linha 1 é o `for`. **Uma anotação que aponta para a linha
 *  errada é pior do que nenhuma**: o aluno lê a explicação ao lado da linha
 *  errada e aprende a explicação errada, com a confiança de quem a leu no sítio
 *  certo.
 *
 *  Duas cópias desta classe teriam o bug duas vezes, e corrigir uma deixaria a
 *  outra a dizer que a coisa está bem.
 *
 *  Os nomes de contador são escolhidos **por nível de aninhamento** e não por
 *  emissão, e a diferença importa em Java: um laço dentro de outro não pode
 *  repetir o nome — `for (int i…) { for (int i…) }` não compila, porque a
 *  variável já está declarada — mas dois laços irmãos **podem**, e devem: é o
 *  que se escreve à mão, e um `j` que aparece sem um `i` antes dele confunde
 *  quem está a ler. Um `Set` partilhado pela emissão dava `i` e `j` a dois
 *  irmãos; um `Set` novo por nível dava `i` aos dois e `i` outra vez ao
 *  aninhado, que também não compila. Cada nível vê os nomes dos níveis que o
 *  cercam e os seus, e é daí que sai `i`, `j`, e outra vez `i`. */
export class Emissor {
  readonly linhas: string[] = [];
  readonly anotacoes: Anotacao[] = [];

  private readonly nomesPorNivel: Map<number, string[]>;

  constructor(
    private nivel = 0,
    private base = 0,
    nomesPorNivel?: Map<number, string[]>,
  ) {
    this.nomesPorNivel = nomesPorNivel ?? new Map<number, string[]>();
  }

  recuo(): string {
    return '    '.repeat(this.nivel);
  }

  linha(texto: string, porque: string): void {
    this.linhas.push(this.recuo() + texto);
    this.anotacoes.push({ linha: this.base + this.linhas.length, porque });
  }

  /** O emissor do corpo de um bloco que abre uma linha — um laço.
   *
   *  As linhas do pai já contadas são a base, e é isso que faz a primeira
   *  linha do corpo ser a linha a seguir à do laço. O `nome` é o contador que
   *  o laço vai usar, e ele desce **numa cópia** do mapa: o corpo não pode
   *  repetir o nome, e os laços que vierem a seguir deste laço no mesmo sítio
   *  podem — que é o que se escreve à mão, e o que a cópia dá. */
  entrar(nome?: string): Emissor {
    const nomes = new Map(this.nomesPorNivel);
    if (nome !== undefined) {
      nomes.set(this.nivel, [...(nomes.get(this.nivel) ?? []), nome]);
    }
    return new Emissor(this.nivel + 1, this.base + this.linhas.length, nomes);
  }

  /** Pega nas linhas de um corpo e junta-as às deste, por ordem.
   *
   *  Chamar isto **antes** de escrever a linha de fecho é o que põe a
   *  chaveta a seguir ao corpo. Ao contrário, o laço abre, o fecho fecha, e o
   *  corpo fica escrito lá fora — código que não compila, com a anotação de
   *  cada linha do corpo a apontar para uma linha que não existe. */
  absorver(outro: Emissor): void {
    this.linhas.push(...outro.linhas);
    this.anotacoes.push(...outro.anotacoes);
  }

  /** Um nome de contador que nenhum laço à volta esteja a usar.
   *
   *  Não reserva nada: quem reserva é o `entrar`, e só para o corpo. Guardar o
   *  nome aqui atava os laços irmãos — o segundo `for` sairia `j`, e um `j` sem
   *  um `i` antes dele é uma coisa que ninguém escreve à mão. */
  nomeDeContador(): string {
    const tomados = new Set<string>();
    for (const nomes of this.nomesPorNivel.values()) {
      for (const nome of nomes) tomados.add(nome);
    }
    for (const nome of NOMES_DE_CONTADOR) {
      if (!tomados.has(nome)) return nome;
    }
    // Cinco laços aninhados já são absurdo para uma lição, e um nome novo é o
    // que o Java faria com `var`. O erro — se algum dia aparecer — diz o que
    // aconteceu, em vez de virar um `undefined` no meio do texto.
    return `c${this.nivel}_${tomados.size}`;
  }
}

/** O programa inteiro, como texto: uma linha por linha emitida, com `\n`. */
export function textoDe(e: Emissor): string {
  return e.linhas.map((l) => `${l}\n`).join('');
}

/** As linhas de um texto gerado, sem a linha a mais do fim. */
export function linhasDe(texto: string): string[] {
  return texto.replace(/\n$/, '').split('\n');
}
