import { comparar } from '../nucleo/divergencia';
import type { Relatorio } from '../nucleo/divergencia';
import { interpretar } from '../nucleo/semantica';
import type { BlocoLeigo } from '../nucleo/blocos';
import type { Erro, Language } from '../nucleo/tipos';
import { obter } from './registo';
import type { Gerado } from './tipos';

export function emitir(linguagem: Language, programa: BlocoLeigo | null): Gerado {
  return obter(linguagem).emit(programa);
}

/** O texto da pessoa, lido e julgado — em duas fases, e a ordem é tudo.
 *
 *  Primeiro a projeção da linguagem escolhida diz o que cada linha diz, e
 *  recusa o que não é da linguagem dela. Só depois o núcleo julga o que foi
 *  dito, com a política dessa mesma linguagem.
 *
 *  Inverter a ordem é a falha mais cara que esta divisão de trabalho evita: o
 *  núcleo de Python a julgar uma linha de Java ensinaria Python a recusar
 *  coisas que não recusa, e o aluno levaria para a vida a ideia errada sobre
 *  a linguagem que escolheu. E, por isso, quando a linha nem se lê, o erro é o
 *  da leitura e o núcleo **não é chamado** — não há nada para julgar. */
export function avaliarTexto(linguagem: Language, texto: string): Erro[] {
  const projecao = obter(linguagem);
  const lido = projecao.ler(texto);
  if (lido.erros.length > 0) return lido.erros;
  return interpretar(lido.eventos, projecao.policy, (passo) => ({
    bloco: 'texto',
    ranhura: 0,
    passo,
  }));
}

/** As três coisas que uma sondagem pode ver acontecer.
 *
 *  A classe responde a **que género de erro é**, e não a *quando*. Um `;` em
 *  falta é `FalhaRuntime` mesmo em Java, porque não é um tipo trocado: pô-lo
 *  em `Recusa` obrigaria a inventar um `esperado` e um `obtido` que não são
 *  tipos, e um `Recusa` com tipos inventados é pior do que um `FalhaRuntime`
 *  honesto. *Quando* é a mensagem que diz, e a projeção de Java diz que o
 *  compilador recusa a linha antes de o código correr.
 *
 *  `QuebraEquivalencia` **não** está aqui, e a ausência é uma decisão: a
 *  divergência entre blocos e texto é um erro de comparação, não do programa.
 *  O programa está certo e o texto é que diverge, e uma sondagem que espera
 *  `Recusa` nunca pode ser satisfeita por alguém que escreveu a linha de outra
 *  maneira — seria dar a nota a uma coisa que não se estava a perguntar. */
export type ClassesObservadas = 'Observacao' | 'Recusa' | 'FalhaRuntime';

export function classificar(erros: readonly Erro[]): ClassesObservadas {
  if (erros.some((e) => e.classe === 'Recusa')) return 'Recusa';
  if (erros.some((e) => e.classe === 'FalhaRuntime')) return 'FalhaRuntime';
  return 'Observacao';
}

export function bate(esperado: ClassesObservadas, erros: readonly Erro[]): boolean {
  return classificar(erros) === esperado;
}

/** O programa e o que a pessoa escreveu, na linguagem escolhida. */
export function divergir(
  linguagem: Language,
  programa: BlocoLeigo | null,
  texto: string,
): Relatorio {
  return comparar(emitir(linguagem, programa).texto, texto);
}
