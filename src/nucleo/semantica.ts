import type { Erro, Language, Origem, Tipo, Valor } from './tipos';
import { E, MAX_ITERACOES, restricao } from './tipos';

/** Quando uma violação de tipo é reportada. São três epistemologias
 *  distintas, e a diferença entre elas é a lição. */
export type Quando = 'antes de correr' | 'ao usar' | 'quando o dado entra';

export interface Policy {
  /** Verdadeiro quando a linguagem recusa um tipo errado sem esperar pela
   *  execução. Java, Go, TypeScript e SQL sim. Python e JavaScript nunca — e
   *  isto é a única coisa que o avaliador de texto precisa de saber para não
   *  estar a mentir sobre Python. */
  recusaNoTipo: boolean;
  /** Quando é que a recusa aparece, para a projeção escrever a frase certa.
   *  `recusaNoTipo` decide *se* há recusa; `quando` decide *como se fala*
   *  dela. São decisões separadas porque as duas nem sempre coincidem: SQL
   *  recusa, como as outras quatro, mas a limitação não se resolve quando o
   *  programa corre — fica escrita no dado. */
  quando: Quando;
}

export const POLITICAS: Record<Language, Policy> = {
  python: { recusaNoTipo: false, quando: 'ao usar' },
  javascript: { recusaNoTipo: false, quando: 'ao usar' },
  go: { recusaNoTipo: true, quando: 'antes de correr' },
  typescript: { recusaNoTipo: true, quando: 'antes de correr' },
  java: { recusaNoTipo: true, quando: 'antes de correr' },
  sql: { recusaNoTipo: true, quando: 'quando o dado entra' },
};

/** Explicação neutra, para valores que não vêm da lição. */
export const AMOSTRA = {
  porque: 'valor calculado',
  remedio: 'mete aqui um valor do tipo certo',
} as const;

/** O que uma linha diz, depois de lida. A projeção sabe; o núcleo julga.
 *
 *  Este é o contrato entre as três camadas e vale a pena ler duas vezes: o
 *  núcleo nunca vê texto, e a projeção nunca decide se um tipo é aceitável.
 *  Cada `EventoLido` é um fato já lido — "a linha 2 atribui o nome `total` a um
 *  texto" — e o núcleo responde "isso é um erro, e a partir de quando". */
export type EventoLido =
  | {
      passo: number;
      tipo: 'atribuir';
      nome: string;
      tipoValor: Tipo;
      valor: Valor;
      /** O tipo que este sítio aceita, quando é mais estreito do que o que
       *  chegou. `int total = …` em Java tem ambos. */
      restricao?: Tipo;
    }
  /** `usar` num sítio que **não declara** tipo é `tipoValor` a omisso.
   *
   *  A omissão não é falta de informação — é informação: `print(total)` em
   *  Python aceita qualquer coisa, e um evento que chega a dizer "este sítio
   *  precisa de texto" faz o produto inventar um erro que o Python não tem.
   *  E é o pior tipo de erro possível num produto que ensina: o aluno lê
   *  `print(total)`, o produto diz que está errado, e o aluno conclui que
   *  o professor também se engana. `x = total` é o mesmo caso — uma cópia
   *  não impõe tipo ao destino.
   *
   *  O que se perde é pouco: um sítio sem tipo declarado também não dá um
   *  erro de incompatibilidade para reportar, que é a única coisa que este
   *  campo servia. */
  | { passo: number; tipo: 'usar'; nome: string; tipoValor?: Tipo }
  /** `operar` com um operando a `null` é uma conta de que a projeção só leu
   *  um lado: `total = total + 1` tem `total` à esquerda, e o valor de
   *  `total` só existe quando o programa corre. O `usar` que acompanha o
   *  `operar` é que carrega o tipo exigido, e é dele que sai o erro.
   *
   *  A alternativa — pôr um `0` no lugar do nome — é o que o plano fazia, e
   *  produz um erro sobre `número` com `número` numa linha que é válida, ou
   *  um "não se pode juntar texto com número" numa conta de dois números. */
  | { passo: number; tipo: 'operar'; operacao: '+' | '-' | '*' | '/'; a: Valor | null; b: Valor | null }
  | { passo: number; tipo: 'imprimir'; valor: Valor }
  | { passo: number; tipo: 'ciclo'; iteracoes: number }
  | { passo: number; tipo: 'texto'; texto: string };

interface Guardada {
  tipo: Tipo;
  recusado: boolean;
}

/** Dois tipos juntam-se se forem o mesmo. Não há um segundo tipo numérico a
 *  absorver aqui: `number` é o único, e uma função que parece que vai tratar
 *  de dois números que na verdade só trata de um esconde a decisão de que
 *  `2.0` e `2` são o mesmo número. */
function coerencia(a: Tipo, b: Tipo): boolean {
  return a === b;
}

function operacaoDiz(operacao: '+' | '-' | '*' | '/'): string {
  return { '+': 'juntar', '-': 'subtrair', '*': 'multiplicar', '/': 'dividir' }[operacao];
}

function erroDePasso(passo: number, porque: string, remedio: string, origem: Origem): Erro {
  return { classe: 'FalhaRuntime', porque, passo, remedio, origem };
}

export function interpretar(
  eventos: readonly EventoLido[],
  politica: Policy,
  origemDe: (passo: number) => Origem,
): Erro[] {
  const erros: Erro[] = [];
  const guardadas = new Map<string, Guardada>();

  for (const ev of eventos) {
    switch (ev.tipo) {
      case 'atribuir': {
        const alvo = ev.restricao ?? ev.tipoValor;
        // Grava *antes* de decidir. Numa linguagem que recusa no tipo, o
        // nome fica reservado e fica recusado — não desaparece. É o que
        // permite dizer "esta linha foi recusada" quando a linha 2 o usa, em
        // vez de "não existe nada com esse nome", que seria mentira: em Java
        // o nome existe no código, o que não existe é o valor.
        guardadas.set(ev.nome, { tipo: ev.tipoValor, recusado: false });

        if (politica.recusaNoTipo && !coerencia(alvo, ev.tipoValor)) {
          const recusada = guardadas.get(ev.nome)!;
          recusada.recusado = true;
          erros.push({
            ...E(restricao(alvo, 'o que guardas'), ev.valor),
            porque: `Um sítio de ${alvo} não guarda ${ev.tipoValor}.`,
            remedio:
              politica.quando === 'quando o dado entra'
                ? `Guarda aqui um ${alvo}. A limitação fica escrita no dado e vale para sempre.`
                : `Guarda aqui um ${alvo}, que é o que este sítio aceita.`,
            origem: origemDe(ev.passo),
          });
        }
        break;
      }

      case 'usar': {
        const guardado = guardadas.get(ev.nome);
        if (guardado === undefined) {
          erros.push(
            erroDePasso(
              ev.passo,
              `Usaste ${ev.nome} antes de a guardares. Não existe nada guardado com esse nome.`,
              `Guarda ${ev.nome} numa linha antes desta.`,
              origemDe(ev.passo),
            ),
          );
          break;
        }
        // A recusa vem antes da incompatibilidade. São coisas diferentes: uma
        // é "esta linha está errada", a outra é "este nome não serve aqui".
        // Se a incompatibilidade viesse primeiro, quem corrigisse a linha 1
        // ouviria um erro diferente do que ouviu antes, e não saberia que o
        // primeiro tinha sido resolvido.
        if (guardado.recusado) {
          erros.push(
            erroDePasso(
              ev.passo,
              `${ev.nome} foi recusado, e um valor recusado não pode ser usado.`,
              `Corrige a linha onde ${ev.nome} foi guardado.`,
              origemDe(ev.passo),
            ),
          );
          break;
        }
        // `tipoValor` a omisso é um sítio que não declara tipo: `print(total)`,
        // `x = total`. Não há o que comparar, e comparar na mesma confrontaria
        // `undefined` com o tipo guardado — que nunca são iguais, e o produto
        // passaria a recusar Python válido.
        if (ev.tipoValor !== undefined && !coerencia(ev.tipoValor, guardado.tipo)) {
          erros.push(
            erroDePasso(
              ev.passo,
              `${ev.nome} guarda ${guardado.tipo}, e este sítio precisa de ${ev.tipoValor}.`,
              `Guarda ${ev.nome} como ${ev.tipoValor}.`,
              origemDe(ev.passo),
            ),
          );
        }
        break;
      }

      case 'operar': {
        // Só se julga o que se sabe. Se um dos lados é um nome, o `usar` que
        // vem antes no mesmo passo é que sabe que tipo esse nome tinha, e
        // é dele que sai o erro. Julgar aqui seria julgar um `null` como se
        // fosse um tipo, e `null` não é um tipo que ninguém guardou.
        if (ev.a !== null && ev.b !== null && !coerencia(ev.a.tipo, ev.b.tipo)) {
          erros.push(
            erroDePasso(
              ev.passo,
              `Não se pode ${operacaoDiz(ev.operacao)} ${ev.a.tipo} com ${ev.b.tipo}.`,
              'Junta coisas do mesmo tipo.',
              origemDe(ev.passo),
            ),
          );
          break;
        }
        // A divisão por zero só precisa do divisor, e o divisor é um número
        // escrito na linha. Logo dá para dizer, mesmo que o outro lado da
        // conta seja um nome — que é o caso de `total = total / 0`, a linha
        // que a lição precisa de conseguir dizer que está errada.
        if (ev.operacao === '/' && ev.b !== null && ev.b.valor === 0) {
          erros.push(
            erroDePasso(
              ev.passo,
              'Dividir por zero não dá resultado. Não há número que seja a resposta.',
              'Confirma o divisor antes de dividir.',
              origemDe(ev.passo),
            ),
          );
        }
        break;
      }

      case 'ciclo': {
        // Três fatos, três frases. Um só "passou do limite" para os três
        // diria a quem escreveu 2.5 que o problema é a magnitude, e a lição
        // seria errada: o problema é que 2.5 não é um número de voltas.
        if (!Number.isInteger(ev.iteracoes)) {
          erros.push(
            erroDePasso(
              ev.passo,
              `Um laço corre um número inteiro de voltas, e ${ev.iteracoes} não é um número inteiro.`,
              'Mete as voltas inteiras.',
              origemDe(ev.passo),
            ),
          );
          break;
        }
        if (ev.iteracoes < 0) {
          erros.push(
            erroDePasso(
              ev.passo,
              `Um laço não corre um número negativo de voltas, e ${ev.iteracoes} é negativo.`,
              'Mete um número de voltas de 0 para cima.',
              origemDe(ev.passo),
            ),
          );
          break;
        }
        if (ev.iteracoes > MAX_ITERACOES) {
          erros.push(
            erroDePasso(
              ev.passo,
              `Um laço corre ${ev.iteracoes} vezes, e o limite são ${MAX_ITERACOES}. O laço não entra.`,
              `Mete um número de voltas entre 0 e ${MAX_ITERACOES}.`,
              origemDe(ev.passo),
            ),
          );
        }
        break;
      }

      case 'imprimir':
        // `print(5)` é legal em cinco das seis. O motor de blocos é mais
        // estrito — o bloco `dizer` só aceita texto — e essa diferença é uma
        // lição, não um defeito: quem aprendeu nos blocos escreve
        // `print('5')` e depois descobre que a linguagem também aceitava
        // `print(5)`. Julgar o texto pela regra do bloco faria o produto
        // mentir sobre a linguagem.
        break;

      case 'texto':
        // Texto cru, sem `Valor` e sem tipo. Quem o leu foi a projeção, e se
        // a aspa ficou aberta a projeção é que recusa — o núcleo não tem
        // nada para julgar aqui, e inventar um erro seria inventar sintaxe.
        break;
    }
  }

  return erros;
}

/** Interpretar já tendo lido. Atalho para as sondas e para os testes. */
export function interpretarEm(
  texto: string,
  linguagem: Language,
  ler: (t: string) => EventoLido[],
): Erro[] {
  return interpretar(ler(texto), POLITICAS[linguagem], (passo) => ({
    bloco: 'linha',
    ranhura: 0,
    passo,
  }));
}
