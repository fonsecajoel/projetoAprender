import type { BlocoLeigo } from '../nucleo/blocos';
import { corpoDe, campoDe, entradaDe, identificadorJava } from '../nucleo/blocos';
import { pilhaDe } from '../nucleo/avaliador';
import { AMOSTRA, POLITICAS } from '../nucleo/semantica';
import type { EventoLido } from '../nucleo/semantica';
import { val } from '../nucleo/tipos';
import type { FalhaRuntime, Tipo, Valor } from '../nucleo/tipos';
import { BLOCOS_IMPERATIVOS } from './python';
import { Emissor, textoDe } from './emissor';
import { eNome, eventosDeConta, ladoCulpado } from './termos';
import type { Gerado, LerResultado, Projection } from './tipos';

// ---------------------------------------------------------------------------
// Os fatos de Java que esta projeção sabe
// ---------------------------------------------------------------------------
//
// **Não havia um compilador de Java à mão quando esta projeção foi escrita, e
// por isso ela não afirma nada que não fosse preciso para a lição.** Cada
// afirmação abaixo é uma que sei e que consigo defender; o que não sei, o
// `ler` recusa por não saber em vez de chutar. A regra vale mais do que a
// lista: um produto que recusa texto indevidamente ensina a pessoa a
// desconfiar do produto, e essa é a única coisa que este produto não pode
// fazer — passou a vida a dizer "confia no que te digo, e eu digo porquê".
//
// **Um erro que não é dado é muito mais barato do que um erro que é dado à
// cosa.** A recusa tem de ser verdadeira, e o silêncio sobre o que não se
// sabe fica escrito como uma nota neste ficheiro, e não escondido.

// ---------------------------------------------------------------------------
// Escrever: blocos → Java
// ---------------------------------------------------------------------------

/** A palavra de tipo que a Java escreve antes do nome, para um valor dado.
 *
 *  Um `Record<Tipo, string>` não chega, e a razão é a lição e não a
 *  conveniência: **em Java o número tem duas palavras**. `int` não aceita
 *  casas decimais e `double` aceita. Um nome-por-tipo escreve `int` para o
 *  `1.5` e produz Java que não compila — e o aluno recebe um erro de Java
 *  numa linha que ele não escreveu assim, que é a pior forma de errar.
 *
 *  E há um quinto caso, o `var`: quando o valor é o nome de outra variável, o
 *  tipo só existe quando o programa corre, e nenhum destes quatro o sabe. */
export function declaracaoDe(entrada: unknown): string {
  if (typeof entrada === 'number') return Number.isInteger(entrada) ? 'int' : 'double';
  if (typeof entrada === 'boolean') return 'boolean';
  if (entrada !== null && typeof entrada === 'object' && 'ref' in entrada) return 'var';
  return 'String';
}

/** De palavra de Java para o `Tipo` do produto, para o `ler`.
 *
 *  O `var` está de fora de propósito: é a única palavra que não declara tipo a
 *  ninguém, e o `ler` diz isso omitindo a restrição em vez de a pôr a
 *  `número`. */
const TIPO_DE_PALAVRA: Record<string, Tipo> = {
  int: 'número',
  double: 'número',
  String: 'texto',
  boolean: 'lógico',
};

function fugar(s: string): string {
  // A barra de fugar primeiro, sempre — e a ordem importa: se o `\n` virasse
  // fuga antes de a barra ser dobrada, cada fuga seria duplicada.
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function literal(entrada: unknown): string {
  if (typeof entrada === 'number') return String(entrada);
  if (typeof entrada === 'boolean') return entrada ? 'true' : 'false';
  if (entrada !== null && typeof entrada === 'object' && 'ref' in entrada) {
    return String((entrada as { ref: unknown }).ref);
  }
  if (entrada !== null && typeof entrada === 'object' && 'txt' in entrada) {
    return `"${fugar(String((entrada as { txt: unknown }).txt))}"`;
  }
  return `"${fugar(String(entrada))}"`;
}

function emitir(b: BlocoLeigo, e: Emissor): void {
  switch (b.type) {
    case 'pilha':
      for (const filho of pilhaDe(b)) emitir(filho, e);
      return;

    case 'guardar': {
      const nome = identificadorJava(String(campoDe(b, 'nome')));
      const entrada = entradaDe(b, 'VALOR');
      const palavra = declaracaoDe(entrada);
      // A anotação é a lição inteira quando a palavra tem um tipo, e é uma
      // ressalva honesta quando é `var`. Uma anotação igual nos dois casos
      // diria "o tipo escreve-se sempre" ao lado de uma linha onde o tipo não
      // se escreve, e quem lê as duas coisas aprende uma delas e ignora a outra.
      const porque =
        palavra === 'var'
          ? `O tipo de ${String((entrada as { ref: unknown }).ref)} só se sabe quando o código corre, e o \`var\` deixa o compilador descobri-lo.`
          : `Guarda ${nome} como ${palavra}, e o tipo escreve-se aqui à mão.`;
      e.linha(`${palavra} ${nome} = ${literal(entrada)};`, porque);
      return;
    }

    case 'dizer': {
      e.linha(
        `System.out.println(${literal(entradaDe(b, 'VALOR'))});`,
        'Mostra o valor no ecrã. O `println` aceita qualquer tipo, por isso aqui não há tipo a escrever.',
      );
      return;
    }

    case 'log': {
      e.linha(
        `log(${literal(entradaDe(b, 'VALOR'))});`,
        'Chama `log`, uma função que ainda não escreveste. Enquanto não a escreveres, o compilador recusa esta linha antes de o código correr.',
      );
      return;
    }

    case 'repetir': {
      const vezes = String(entradaDe(b, 'PASSOS'));
      const c = e.nomeDeContador();
      e.linha(
        `for (int ${c} = 0; ${c} < ${vezes}; ${c}++) {`,
        `Repete o que está entre chavetas ${vezes} vezes, a contar com ${c}.`,
      );
      // `absorver` **antes** da linha de fecho. Ao contrário, o `for` abre, o
      // `}` fecha, e o corpo fica escrito lá fora — Java que não compila, com
      // as anotações do corpo a apontar para linhas que não existem.
      const dentro = e.entrar(c);
      for (const filho of corpoDe(b)) emitir(filho, dentro);
      e.absorver(dentro);
      // Uma `{` e uma `}` vazias são Java válido. Um `for` vazio não é Python,
      // e a diferença é o que faz a projeção de Python emitir um `pass`: duas
      // linguagens, o mesmo bloco vazio, e uma delas obriga a dizer alguma
      // coisa e a outra não.
      e.linha('}', 'Fecha o ciclo: a chaveta a fechar é o fim daquilo que repete.');
      return;
    }

    default:
      e.linha(`// bloco do v2: ${b.type}`, 'Este bloco ainda não está nesta lição.');
  }
}

// ---------------------------------------------------------------------------
// Ler: Java → fatos
// ---------------------------------------------------------------------------

// O `;` faz parte do padrão, e é a sua ausência que dá a mensagem do ponto-e-
// vírgula. Se ficasse de fora, o `ler` não distinguiria "falta o ponto" de
// "falta o tipo", e a pessoa corrigia uma coisa e recebia o erro da outra.
const ATRIBUIR = /^(int|double|String|boolean|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+);$/;
const IMPRIMIR = /^System\.out\.println\(\s*(.+?)\s*\);$/;
const CICLO = /^for\s*\(\s*int\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*0;\s*[A-Za-z_][A-Za-z0-9_]*\s*<\s*(\d+);\s*[A-Za-z_][A-Za-z0-9_]*\s*\+\+\s*\)\s*\{$/;
// Uma atribuição sem a palavra de tipo. Serve só para a mensagem: `total = 5;`
// é isto, e o que falta é o tipo.
const SEM_TIPO = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/;
// Um literal numérico de Java. Sem sinal: o `-` é uma operação, não parte do
// número, e `1.5` é o único formato com ponto que a Java aceita.
const NÚMERO = /^\d+(\.\d+)?$/;
const TEXTO = /^"((?:[^"\\]|\\.)*)"$/;

function erro(passo: number, porque: string, remedio: string): FalhaRuntime {
  return {
    classe: 'FalhaRuntime',
    porque,
    passo,
    remedio,
    origem: { bloco: 'texto', ranhura: 0, passo },
  };
}

function desescapar(s: string): string {
  return s.replace(/\\(["\\nrt])/g, (_m, c: string) =>
    c === 'n' ? '\n' : c === 'r' ? '\r' : c === 't' ? '\t' : c,
  );
}

function valorDe(termo: string, passo: number): Valor | null {
  const origem = { bloco: 'texto', ranhura: 0, passo };
  if (NÚMERO.test(termo)) return val('número', Number(termo), AMOSTRA, origem);
  const txt = TEXTO.exec(termo);
  if (txt) return val('texto', desescapar(txt[1]!), AMOSTRA, origem);
  if (termo === 'true') return val('lógico', true, AMOSTRA, origem);
  if (termo === 'false') return val('lógico', false, AMOSTRA, origem);
  return null;
}

/** A mesma regra de Python, com o sinal trocado.
 *
 *  Em Python o ponto-e-vírgula é o que estraga a linha; aqui é o que falta.
 *  Nos dois casos só se toca nele **depois** de a linha ter falhado por outra
 *  razão, e porque a linha com o `;` lê bem. Sem essa segunda condição,
 *  `String s = "a;b";` — Java válido — era recusada por causa de um
 *  ponto-e-vírgula que estava dentro de uma palavra. */
function lerLinha(bruta: string, passo: number): LerResultado {
  const t = bruta.trim();
  if (t.length === 0 || t === '{' || t === '}' || t.startsWith('//')) {
    return { eventos: [], erros: [] };
  }

  const r = tentarLer(t, passo);
  if (r.erros.length === 0) return r;

  const semPonto = !t.endsWith(';');
  if (semPonto && tentarLer(`${t};`, passo).erros.length === 0) {
    return {
      eventos: [],
      erros: [
        erro(
          passo,
          'Em Java cada linha acaba em ponto-e-vírgula, e esta acaba sem.',
          'Acrescenta o ";" no fim da linha.',
        ),
      ],
    };
  }
  return semTipo(t.replace(/;$/, '').trim(), passo, semPonto);
}

/** A linha parece uma atribuição e não tem a palavra de tipo.
 *
 *  `total = 5;` não é Java porque o tipo não está lá. Mas `int total;` seguido
 *  de `total = 5;` **é** Java, e dizer que a segunda linha nunca é válida
 *  ensina uma coisa falsa — que a pessoa encontra mais tarde, quando escrever
 *  a primeira. Por isso a honestidade cabe numa frase, e a frase é a lição: em
 *  Java o tipo escreve-se uma vez, na declaração. */
function semTipo(corpo: string, passo: number, faltaPonto: boolean): LerResultado {
  const m = SEM_TIPO.exec(corpo);
  if (m) {
    const porque =
      'Em Java o tipo escreve-se antes do nome, e esta linha não tem tipo nenhum. ' +
      'Se o nome já tivesse sido declarado numa linha antes, esta linha era válida — ' +
      'e é por isso que o tipo se escreve uma vez só, na declaração.';
    return {
      eventos: [],
      erros: [
        erro(
          passo,
          faltaPonto ? `${porque} E falta também o ponto-e-vírgula no fim da linha.` : porque,
          `Escreve o tipo antes do nome, como em "${sugestaoDe(m[1]!, m[2]!)}".`,
        ),
      ],
    };
  }
  return {
    eventos: [],
    erros: [
      erro(
        passo,
        `Esta linha não é Java: "${corpo}".`,
        'Uma linha de Java é uma declaração com tipo, um System.out.println, ou um for.',
      ),
    ],
  };
}

/** A linha que a pessoa queria escrever, com o tipo que a Java exige. */
function sugestaoDe(nome: string, resto: string): string {
  const v = valorDe(resto, 1);
  if (v === null) return `var ${nome} = ${resto};`;
  return `${declaracaoDe(v.valor)} ${nome} = ${literal(v.valor)};`;
}

function tentarLer(t: string, passo: number): LerResultado {
  const ci = CICLO.exec(t);
  if (ci) {
    return { eventos: [{ passo, tipo: 'ciclo', iteracoes: Number(ci[1]) }], erros: [] };
  }

  const im = IMPRIMIR.exec(t);
  if (im) return lerImprimir(im[1]!, passo);

  const at = ATRIBUIR.exec(t);
  if (at) return lerAtribuir(at[1]!, at[2]!, at[3]!, passo);

  return naoEhJava(t, passo);
}

function naoEhJava(t: string, passo: number): LerResultado {
  return {
    eventos: [],
    erros: [
      erro(
        passo,
        `Esta linha não é Java: "${t}".`,
        'Uma linha de Java é uma declaração com tipo, um System.out.println, ou um for.',
      ),
    ],
  };
}

function lerImprimir(dentro: string, passo: number): LerResultado {
  const valor = valorDe(dentro, passo);
  if (valor !== null) {
    return { eventos: [{ passo, tipo: 'imprimir', valor }], erros: [] };
  }
  if (eNome(dentro)) {
    // O `println` é sobrecarregado e aceita qualquer tipo. Um `usar` com
    // `tipoValor` viria dizer "total guarda número, e este sítio precisa de
    // texto" — um erro que a Java não tem, na linha que a Java aceita, e o
    // aluno concluiria que o produto também se engana.
    return { eventos: [{ passo, tipo: 'usar', nome: dentro }], erros: [] };
  }

  // Uma conta dentro do `println`. **Faltava aqui**, e a segunda projeção
  // foi o que mostrou: as duas percebiam uma conta depois de um `=` e nenhuma
  // dentro de um `println`, e `println(total + 1)` é a linha com que a lição
  // de Java mostra que usar um valor recusado também é erro.
  //
  // O `tipoDosNomes` é `undefined`, e é a diferença real entre as duas
  // linguagens: **`"olá" + 1` dá `"olá1"` em Java e compila**, e `1 + "olá"`
  // dá `"1olá"`. Qual dos lados é número decide, e o tipo guardado só existe
  // quando o programa corre, portanto este sítio não pode exigir nada. No
  // Python é o contrário — `'olá' + 1` é erro logo a correr — e por isso o
  // Python passa `'número'` no mesmo sítio. A mesma conta, a mesma forma, e o
  // que muda é uma palavra.
  const conta = eventosDeConta(dentro, passo, (t) => valorDe(t, passo), undefined);
  if (conta !== null) return { eventos: conta, erros: [] };
  return {
    eventos: [],
    erros: [
      erro(
        passo,
        `Java não sabe o que mostrar: "${dentro}".`,
        'Dentro do println só pode estar um nome, um número ou um texto.',
      ),
    ],
  };
}

function lerAtribuir(
  palavra: string,
  nome: string,
  resto: string,
  passo: number,
): LerResultado {
  if (resto.startsWith('=')) {
    return {
      eventos: [],
      erros: [
        erro(
          passo,
          'Em Java "==" são dois sinais de igual, e é comparação: serve para perguntar, não põe nada em lado nenhum.',
          'Para guardar um valor usa um sinal de igual só: "=" em vez de "==".',
        ),
      ],
    };
  }

  const valor = valorDe(resto, passo);
  if (valor !== null) {
    return {
      eventos: [
        {
          passo,
          tipo: 'atribuir',
          nome,
          tipoValor: valor.tipo,
          valor,
          // O `restricao` é a palavra escrita na linha, e é o que dá a recusa
          // *antes de correr*. O `var` não tem: é a única palavra de Java que
          // não declara tipo a ninguém, e a omissão é a informação.
          restricao: TIPO_DE_PALAVRA[palavra],
        },
      ],
      erros: [],
    };
  }

  if (eNome(resto)) {
    return { eventos: [{ passo, tipo: 'usar', nome: resto }], erros: [] };
  }

  // A leitura da conta é a do leitor partilhado, e a diferença entre exigir
  // número e não exigir está escrita num sítio só — não em dois, que é como
  // os dois ficheiros divergiam.
  const conta = eventosDeConta(resto, passo, (t) => valorDe(t, passo), undefined);
  if (conta !== null) return { eventos: conta, erros: [] };
  const culpado = ladoCulpado(resto, (t) => valorDe(t, passo));
  if (culpado !== null) {
    return {
      eventos: [],
      erros: [
        erro(
          passo,
          `Esta conta ainda não sei ler: "${resto}". Numa conta, cada lado tem de ser um número, um texto, true/false, ou o nome de outra variável.`,
          `Nesta lição as contas são de dois termos, e cada termo tem de ser um número, um texto, true/false, ou o nome de outra variável. O termo "${culpado}" não é nenhum dos quatro.`,
        ),
      ],
    };
  }

  return naoEhJava(resto, passo);
}

export const java: Projection = {
  linguagem: 'java',
  familia: 'imperativa',
  policy: POLITICAS.java,
  blocos: BLOCOS_IMPERATIVOS,

  emit(programa: BlocoLeigo | null): Gerado {
    const e = new Emissor();
    for (const bloco of pilhaDe(programa)) emitir(bloco, e);
    return { texto: textoDe(e), anotacoes: e.anotacoes };
  },

  ler(texto: string): LerResultado {
    const eventos: EventoLido[] = [];
    const erros: FalhaRuntime[] = [];
    const linhas = texto.split('\n');
    for (let i = 0; i < linhas.length; i += 1) {
      const passo = i + 1;
      const t = linhas[i]!.trim();
      // O `log` é o bloco que existe para mostrar a diferença entre as duas
      // epistemologias. Aqui o `ler` recusa-o e a mensagem diz que é o
      // compilador que recusa; a do Python recusa o mesmo `log` e a mensagem
      // diz que só se descobre a correr. Duas frases para a mesma linha, e a
      // diferença entre elas é a lição da costura.
      if (t.startsWith('log(')) {
        erros.push(
          erro(
            passo,
            'Em Java não existe nada que se chame log, e o compilador recusa esta linha antes de o código correr.',
            'Escreve a função log antes de a chamares, ou usa System.out.println.',
          ),
        );
        continue;
      }
      const r = lerLinha(linhas[i]!, passo);
      eventos.push(...r.eventos);
      erros.push(...r.erros);
    }
    return { eventos, erros };
  },
};
