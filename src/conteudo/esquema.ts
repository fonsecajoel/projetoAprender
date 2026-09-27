import type { BlocoLeigo } from '../nucleo/blocos';
import type { Language } from '../nucleo/tipos';
import type { ClassesObservadas } from '../projecoes/avaliar';
import type { Familia } from '../projecoes/tipos';

/** As três fases do método, e a ordem em que aparecem.
 *
 *  Não são três ecrãs: são três perguntas ao mesmo programa. `explicar` lê,
 *  `fazer` escreve, `nomear` dá o nome. Uma lição que saltasse a `nomear`
 *  ensinaria a executar sem nunca saber o que se está a executar — que é
 *  exatamente o que a maioria faz com um computador alheio. */
export type Fase = 'explicar' | 'fazer' | 'nomear';

export const FASES: readonly Fase[] = ['explicar', 'fazer', 'nomear'];

/** A forma de um bloco no YAML. **Não** é um tipo novo: é o `BlocoLeigo` do
 *  núcleo, com o nome que o formato usa.
 *
 *  A primeira versão do esquema declarava a forma outra vez, campo a campo, e
 *  a duplicação pagou-se assim que o núcleo ganhou um campo: os dois tipos
 *  deixaram de descrever a mesma coisa e o `emitir` deixou de aceitar o que o
 *  YAML escrevia, com um erro que só aparecia em runtime. Uma forma, um
 *  nome, dois sítios onde se pode escrever. */
export type Bloco = BlocoLeigo;

/** As duas formas de uma sondagem.
 *
 *  `programa` é um programa imperativo, escrito com blocos, e é o que a
 *  maioria das sondagens é. `consulta` é uma pergunta feita aos dados, e só
 *  o SQL a usa.
 *
 *  A forma **não** decide o que está dentro da prova: uma sondagem em forma
 *  de programa pode provar-se com blocos (`programa`) ou com um excerto de
 *  código que o aluno tem de ler (`texto`). São duas perguntas differentes —
 *  «isto corre?» e «isto quer dizer o que tu pensas?» — e a segunda é a que
 *  ensina a ler código. */
export type Forma = 'programa' | 'consulta';

export const FORMAS: readonly Forma[] = ['programa', 'consulta'];

/** Que forma de sondagem é a de cada família de linguagem.
 *
 *  Mora aqui, e não no carregador nem no runner, porque era escrita nos dois
 *  sítios e duas tabelas divergem no primeiro caso em que uma delas muda.
 *  A tabela é a *regra*, e a regra é uma coisa só. */
export const FORMAS_POR_FAMILIA: Record<Familia, Forma> = {
  imperativa: 'programa',
  declarativa: 'consulta',
};

/** As famílias, e a de cada linguagem.
 *
 *  Vive no esquema para que quem escreve uma lição não tenha de saber de
 * família: escreve `forma: consulta` e o carregador descobre o resto. A
 *  projeção continua a ser a única que sabe disto — o esquema só aponta para
 *  lá. */
export const FAMILIAS: Record<Language, Familia> = {
  python: 'imperativa',
  java: 'imperativa',
  go: 'imperativa',
  typescript: 'imperativa',
  javascript: 'imperativa',
  sql: 'declarativa',
};

/** A prova de uma sondagem. */
export interface Prova {
  forma: Forma;
  /** Preenchido quando a prova são blocos. */
  programa?: Bloco;
  /** Preenchido quando a prova é um excerto de código ou de consulta, que o
   *  aluno tem de ler e dizer o que faz. */
  texto?: string;
}

/** O que se espera que aconteça.
 *
 *  `classe` é o **único** campo comparado com o motor. `porque` é prosa de
 *  autoria e nunca é comparada com nada — se fosse, cada reescrita de uma
 *  frase faria o CI falhar e a lição passaria a ser um teste de escrita. */
export interface Esperado {
  classe: ClassesObservadas;
  porque: string;
}

export interface Sonda {
  nome: string;
  /** A pergunta que se faz ao aluno antes de ele fazer a experiência. É a
   *  primeira coisa do ecrã que ele lê, e por isso é um campo próprio e não
   *  uma frase dentro do `porque`. */
  pergunta: string;
  /** Porque é que esta sonda está na lição. É sobre a lição, não sobre o
   *  aluno: nunca aparece no ecrã. */
  porque: string;
  prova: Prova;
  esperado: Esperado;
}

/** De onde vem a resposta a um momento. */
export type Fonte = 'blocos' | 'texto' | 'leitura';

export const FONTES: readonly Fonte[] = ['blocos', 'texto', 'leitura'];

/** Uma pergunta de um passo.
 *
 *  `fonte: leitura` é a única cujas palavras são conferidas, e mesmo aí
 *  nenhuma resposta é errada: uma resposta que não tem as palavras não conta
 *  como resposta, e o produto **nunca** diz que está errada. Uma sondagem que
 *  dissesse «errado» seria uma sondagem sobre a vontade do autor, não sobre
 *  a leitura de quem responde. */
export interface Momento {
  id: string;
  texto: string;
  /** Palavras que a resposta pode conter. Vazio significa que não se avalia. */
  palavras: string[];
  fonte: Fonte;
}

export interface Passo {
  fase: Fase;
  /** Porque esta linha existe, nos termos desta linguagem. Explica, não
   *  instrui: um `porque` que dá ordens é uma ordem disfarçada de
   *  explicação, e o aluno deixa de pensar. */
  porque: string;
  /** A linha que este passo mostra. Vem sempre do bloco que o aluno vê, e
   *  é a mesma coisa que a sondagem prova. */
  bloco: Bloco;
  /** O nome da sondagem que prova este passo. Tem de existir: um passo sem
   *  sondagem é um passo em que o aluno faz e não sabe se acertou. */
  sonda: string;
  momentos: Momento[];
  /** A palavra a nomear. Só pode existir em `fase: nomear`, e é obrigatória
   *  em `fase: nomear`. */
  nomear?: string;
  /** O ficheiro que este passo manda ler. Tem um nome e **nada mais**: as
   *  linhas estão na sonda deste passo, e um segundo sítio seria uma segunda
   *  versão do ficheiro — a que divergiria sem ninguém dar por isso, e a
   *  lição deixaria de ser sobre o ficheiro que o aluno está a ler. */
  referencia?: { nome: string };
}

export interface Licao {
  id: string;
  /** O `Language` do núcleo, e não `string`. Uma `string` aqui é uma porta
   *  aberta: a lição de Go passava a validar como se fosse a de Python, e o
   *  erro só aparecia quando o aluno carregava. */
  linguagem: Language;
  titulo: string;
  porqueTitulo: string;
  /** O vocabulário que esta lição usa. Cada entrada tem de ser um bloco que
   *  a projeção desta linguagem sabe escrever. */
  blocos: Bloco[];
  passos: Passo[];
  sondas: Sonda[];
  /** Como se sabe que a lição foi feita. Não é uma nota, e não é um
   * Baremo: é a frase que o produto mostra quando a pessoa pergunta se
   *  aprendeu. */
  paraSaberQueFez: string;
}
