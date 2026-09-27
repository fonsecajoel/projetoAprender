import type { BlocoLeigo } from '../nucleo/blocos';
import type { EventoLido, Policy } from '../nucleo/semantica';
import type { FalhaRuntime, Language } from '../nucleo/tipos';

export type Familia = 'imperativa' | 'declarativa';

export interface Anotacao {
  linha: number;
  /** Porque é que esta linha existe, nos termos desta linguagem. Nunca
   *  menciona outra linguagem — a spec §0 removeu as referências cruzadas.
   *
   *  Não há um `tipo` aqui, e a ausência é uma decisão. A anotação é lida ao
   *  lado de uma linha gerada, e o tipo dessa linha nem sempre é conhecido:
   *  `log(total)` fala de uma variável cujo tipo só existe quando o programa
   *  corre. Um campo que uma em cada cinco linhas não consegue preencher
   *  honestamente acaba preenchido a mentir, e o ecrã mostra a mentira com
   *  a mesma confiança com que mostra o `porque`. O `Tipo` de uma linha
   *  gerada, quando for preciso, lê-se do `EventoLido` do caminho do
   *  `ler` — que é onde o tipo é um fato e não uma previsão. */
  porque: string;
}

export interface Gerado {
  texto: string;
  anotacoes: Anotacao[];
}

export interface LerResultado {
  eventos: EventoLido[];
  /** Erros de leitura: texto que não é desta linguagem.
   *
   *  O tipo é `FalhaRuntime[]` e não `Erro[]` por uma razão que vale mais do
   *  que o compilador: uma falha de leitura é sempre uma falha a correr,
   *  nunca uma recusa de tipo. Quem recusa o tipo é o núcleo, e um `ler` que
   *  devolvesse uma `Recusa` estaria a decidir uma coisa que não é sua — e a
   *  dizer ao aluno que Java recusa antes de correr e Python não, quando a
   *  diferença entre as duas está na `Policy` e em mais lado nenhum. */
  erros: FalhaRuntime[];
}

export interface Projection {
  linguagem: Language;
  familia: Familia;
  policy: Policy;
  /** Vocabulário de blocos desta linguagem. As cinco imperativas declaram o
   *  mesmo conjunto; o SQL declara o seu. */
  blocos: string[];
  /** Blocos → texto. Aceita `null` porque um programa vazio é um programa,
   *  e `pilhaDe(null)` é a forma de dizer isso sem inventar um bloco. */
  emit(programa: BlocoLeigo | null): Gerado;
  /** Texto desta linguagem → fatos tipados. */
  ler(texto: string): LerResultado;
}
