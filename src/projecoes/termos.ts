import type { EventoLido } from '../nucleo/semantica';
import type { Tipo, Valor } from '../nucleo/tipos';

/** As três coisas que uma linha tem por baixo, e que são as mesmas nas seis
 *  linguagens: um nome, uma conta de dois termos, e um literal.
 *
 *  Vivem aqui, e não em cada projeção, pela mesma razão que o `Emissor` vive
 *  uma vez só — e a prova é que estar escritas duas vezes **produziu um
 *  buraco**: as duas projeções percebiam uma conta depois de um `=`, e nenhuma a
 *  percebia dentro de um `print`. `print(total + 1)` — que é a linha de que a
 *  lição de Python precisa para mostrar a dívida a pagar-se no uso — era
 *  recusada pelas duas.
 *
 *  O que fica de fora é tudo o que é da linguagem: os delimitadores de texto,
 *  os lógicos, e a frase do erro. Cada uma dessas coisas é uma resposta
 *  diferente à pergunta "como se escreve isto aqui", e é a projeção que a tem. */
export const NOME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Uma conta de dois termos, se a houver. */
export const EXPRESSAO = /^(.+?)\s*([+\-*/])\s*(.+)$/;

export function eNome(termo: string): boolean {
  return NOME.test(termo);
}

/** O que uma conta produz: um uso por cada nome que apareça, e a operação.
 *
 *  `tipoDosNomes` é o que o sítio exige de cada nome, e pode ser `undefined` —
 *  e numa linguagem compilada é. **O `+` de Java não exige número**: `"olá" + 1`
 *  dá `"olá1"` e compila, e `1 + "olá"` dá `"1olá"`. Qual dos dois lados é
 *  número decide, e o tipo guardado só existe quando o programa corre, portanto
 *  aqui não há nada para exigir. Dizer que este sítio precisa de número faria o
 *  produto recusar uma linha que a Java aceita.
 *
 *  Em Python é o contrário, e é a diferença entre as duas: `'olá' + 1` é erro
 *  logo a correr, porque o Python não converte nada sozinho. A mesma conta, a
 *  mesma forma, e o que muda é uma palavra — que é exatamente o que a costura
 *  tem de mostrar.
 *
 *  Devolve `null` quando algum dos lados não é um termo legível, e quem escreve
 *  a frase do erro é a projeção: a frase é em termos da linguagem dela, e este
 *  ficheiro não conhece nenhuma. */
export function eventosDeConta(
  termo: string,
  passo: number,
  valorDeTermo: (t: string) => Valor | null,
  tipoDosNomes: Tipo | undefined,
): EventoLido[] | null {
  const conta = EXPRESSAO.exec(termo);
  if (conta === null) return null;
  const esquerda = conta[1]!;
  const direita = conta[3]!;
  if (!legivel(esquerda, valorDeTermo) || !legivel(direita, valorDeTermo)) return null;

  const eventos: EventoLido[] = [];
  for (const lado of [esquerda, direita]) {
    // O `tipoValor` a omitir é a informação. É a mesma omissão que o
    // `print(total)` faz, e por uma razão parecida: este sítio não declara
    // tipo a ninguém.
    if (eNome(lado)) eventos.push({ passo, tipo: 'usar', nome: lado, tipoValor: tipoDosNomes });
  }
  eventos.push({
    passo,
    tipo: 'operar',
    operacao: conta[2] as '+' | '-' | '*' | '/',
    a: valorDeTermo(esquerda),
    b: valorDeTermo(direita),
  });
  return eventos;
}

function legivel(termo: string, valorDeTermo: (t: string) => Valor | null): boolean {
  return valorDeTermo(termo) !== null || eNome(termo);
}

/** O lado da conta que não é um termo legível, para a frase dizer qual foi. */
export function ladoCulpado(
  termo: string,
  valorDeTermo: (t: string) => Valor | null,
): string | null {
  const conta = EXPRESSAO.exec(termo);
  if (conta === null) return null;
  for (const lado of [conta[1]!, conta[3]!]) {
    if (!legivel(lado, valorDeTermo)) return lado;
  }
  return null;
}
