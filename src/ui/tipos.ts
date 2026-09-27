import type { Fase } from '../conteudo';

export const ROTULOS: Record<Fase, string> = {
  explicar: 'Lê primeiro',
  fazer: 'Agora faz',
  nomear: 'Isto tem nome',
};

/** Não há uma vista `leitura`. Havia, e foi tirada. A vista era um ecrã
 *  independente do passo, o que produzia estados que não se podem preencher:
 *  o passo 0 na vista `nomear`, onde não há palavra nenhuma para nomear, e o
 *  passo 0 na vista `leitura`, onde não há ficheiro nenhum para ler. Um
 *  desenho que permite chega a estados vazios está a descrever três coisas
 *  quando quer descrever uma.
 *
 *  O que a vista `leitura` fazia — mostrar o ficheiro e perguntar linha a
 *  linha — é o que um passo com `referencia` faz, sempre, e só esse. A
 *  palavra que a vista `nomear` mostra — a palavra nomeada, grande — é o
 *  que um passo de fase `nomear` mostra, e a Task 7 recusa um passo de fase
 *  `nomear` sem palavra. Portanto a vista **é** a fase do passo, e não há
 *  nada para escolher.
 *
 *  A fase vem do `esquema` da Task 7 e não é redefinida aqui: um `Record`
 *  com as três fases é uma segunda lista, e uma segunda lista diverge. */
