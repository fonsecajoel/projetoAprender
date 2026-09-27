import type { BlocoLeigo } from '../nucleo/blocos';
import { corpoDe, campoDe, entradaDe, identificador } from '../nucleo/blocos';
import { pilhaDe } from '../nucleo/avaliador';
import { AMOSTRA, POLITICAS } from '../nucleo/semantica';
import type { EventoLido } from '../nucleo/semantica';
import { val } from '../nucleo/tipos';
import type { FalhaRuntime, Valor } from '../nucleo/tipos';
import { Emissor, textoDe } from './emissor';
import type { Gerado, LerResultado, Projection } from './tipos';

export const BLOCOS_IMPERATIVOS = ['guardar', 'repetir', 'dizer', 'log'];

// ---------------------------------------------------------------------------
// Escrever: blocos → Python
// ---------------------------------------------------------------------------

/** Escreve um texto como um literal Python.
 *
 *  A barra de fugar é tratada **primeiro**, sempre. Se o `\n` se transformasse
 *  numa fuga antes de a barra ser dobrada, cada fuga seria duplicada — e o
 *  texto `a\nb` (barra, n, b) sairia `a\\nb`, que o Python lê como barra
 *  seguida de n. Verificado contra o Python 3.14: uma linha nova escrita tal
 *  e qual dentro de aspas dá `unterminated string literal`, e o produto nunca
 *  mostra ao aluno uma linha que não corre. */
function fugar(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/'/g, "\\'");
}

function literal(entrada: unknown): string {
  if (typeof entrada === 'number') return String(entrada);
  if (typeof entrada === 'boolean') return entrada ? 'True' : 'False';
  if (entrada !== null && typeof entrada === 'object' && 'ref' in entrada) {
    return String((entrada as { ref: unknown }).ref);
  }
  if (entrada !== null && typeof entrada === 'object' && 'txt' in entrada) {
    return `'${fugar(String((entrada as { txt: unknown }).txt))}'`;
  }
  return `'${fugar(String(entrada))}'`;
}

function emitir(b: BlocoLeigo, e: Emissor): void {
  switch (b.type) {
    case 'pilha':
      for (const filho of pilhaDe(b)) emitir(filho, e);
      return;

    case 'guardar': {
      const nome = identificador(String(campoDe(b, 'nome')));
      e.linha(`${nome} = ${literal(entradaDe(b, 'VALOR'))}`, `Guarda ${nome} para o usar mais tarde.`);
      return;
    }

    case 'dizer': {
      e.linha(`print(${literal(entradaDe(b, 'VALOR'))})`, 'Mostra o valor no ecrã.');
      return;
    }

    case 'log': {
      e.linha(
        `log(${literal(entradaDe(b, 'VALOR'))})`,
        'Chama `log`, uma função que ainda não escreveste. Em Python isto só falha quando o código corre.',
      );
      return;
    }

    case 'repetir': {
      const vezes = String(entradaDe(b, 'PASSOS'));
      e.linha(`for _ in range(${vezes}):`, `Repete o que está indentado ${vezes} vezes.`);
      const dentro = e.entrar();
      const corpo = corpoDe(b);
      if (corpo.length === 0) {
        // Um `for` sem corpo não é Python. Verificado: `for _ in range(3):`
        // sozinho dá `expected an indented block`, e um corpo de um só
        // comentário dá o mesmo erro. A única coisa que diz "nada" e é
        // Python é `pass`. Emitir o `for` sozinho era mostrar ao aluno uma
        // linha que não corre, e o produto existe para nunca mostrar uma
        // linha errada sem dizer que está errada.
        dentro.linha('pass', 'Não há nada dentro do laço, e um laço vazio não é Python.');
      } else {
        for (const filho of corpo) emitir(filho, dentro);
      }
      e.absorver(dentro);
      return;
    }
    default:
      e.linha(`# bloco do v2: ${b.type}`, 'Este bloco ainda não está nesta lição.');
  }
}

// ---------------------------------------------------------------------------
// Ler: Python → fatos
// ---------------------------------------------------------------------------

const ATRIBUIR = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/;
const IMPRIMIR = /^print\(\s*(.+?)\s*\)$/;
const CICLO = /^for\s+_\s+in\s+range\(\s*(\d+)\s*\)\s*:$/;
// Um inteiro, ou um inteiro com casas decimais. `x = 1.5` é Python e
// compila; recusá-lo é dizer ao aluno que está a escrever uma coisa que não
// é Python, e ele acredita.
const NUMERO = /^[-+]?\d+(\.\d+)?$/;
// Texto entre aspas simples **ou duplas** — e nada mais. A casa é a das
// simples; o que se aceita são as duas. Recusar `x = "olá"` seria ensinar o
// aluno a desconfiar do produto, que é o pior que um professor de sintaxe
// pode fazer. E a barra-crua ficou de fora *de propósito*: verifyi contra o
// Python que `x = \`olá\`` é erro de sintaxe, e aceitar aqui seria trocar um
// erro que o aluno cometia por um que o produto inventava.
const TEXTO = /^(['"])([\s\S]*?)\1$/;
const NOME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const EXPRESSAO = /^(.+?)\s*([+\-*/])\s*(.+)$/;

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
  return s.replace(/\\([\\'"nrt])/g, (_m, c: string) =>
    c === 'n' ? '\n' : c === 'r' ? '\r' : c === 't' ? '\t' : c,
  );
}

function valorDe(termo: string, passo: number): Valor | null {
  const origem = { bloco: 'texto', ranhura: 0, passo };
  if (NUMERO.test(termo)) return val('número', Number(termo), AMOSTRA, origem);
  const txt = TEXTO.exec(termo);
  if (txt) return val('texto', desescapar(txt[2]!), AMOSTRA, origem);
  if (termo === 'True') return val('lógico', true, AMOSTRA, origem);
  if (termo === 'False') return val('lógico', false, AMOSTRA, origem);
  return null;
}

/** O que uma linha diz, ou o que tem de errar. */
function lerLinha(bruta: string, passo: number): LerResultado {
  const t = bruta.trim();
  if (t.length === 0 || t.startsWith('#')) return { eventos: [], erros: [] };

  const r = tentarLer(t, passo);
  if (r.erros.length === 0) return r;

  // O `;` só é culpado depois de a linha ter falhado por outra razão. A
  // regra antiga procurava o `;` na linha toda e recusava antes de tentar
  // ler, por isso contava `x = 'a;b'` — que é Python válido, e compila —
  // como se fosse o vício do Java. Um sintoma que só aparece dentro de uma
  // palavra é o sinal de que se está a procurar o sintoma no sítio errado.
  if (t.endsWith(';')) {
    const semPonto = tentarLer(t.slice(0, -1).trim(), passo);
    if (semPonto.erros.length === 0) {
      return {
        eventos: [],
        erros: [
          erro(
            passo,
            'Esta linha não é Python: acaba em ";", e Python não usa ponto-e-vírgula para separar linhas.',
            'Apaga o ponto-e-vírgula do fim da linha.',
          ),
        ],
      };
    }
  }
  return r;
}

function tentarLer(t: string, passo: number): LerResultado {
  const ciclo = CICLO.exec(t);
  if (ciclo) {
    return { eventos: [{ passo, tipo: 'ciclo', iteracoes: Number(ciclo[1]) }], erros: [] };
  }

  const imp = IMPRIMIR.exec(t);
  if (imp) return lerImprimir(imp[1]!, passo);

  const at = ATRIBUIR.exec(t);
  if (at) return lerAtribuir(at[1]!, at[2]!.trim(), passo);

  return {
    eventos: [],
    erros: [
      erro(
        passo,
        `Esta linha não é Python: "${t}".`,
        'Uma linha de Python é uma atribuição, um print, um for, ou nada.',
      ),
    ],
  };
}

function lerImprimir(dentro: string, passo: number): LerResultado {
  if (NUMERO.test(dentro)) {
    return {
      eventos: [{ passo, tipo: 'imprimir', valor: valorDe(dentro, passo)! }],
      erros: [],
    };
  }
  const txt = TEXTO.exec(dentro);
  if (txt) {
    return { eventos: [{ passo, tipo: 'imprimir', valor: valorDe(dentro, passo)! }], erros: [] };
  }
  if (NOME.test(dentro)) {
    // `print(total)` não declara tipo. Emitir aqui um `usar` com
    // `tipoValor: 'texto'` fazia o núcleo responder "total guarda número, e
    // este sítio precisa de texto" — um erro que o Python não tem, numa
    // linha que o Python aceita. A omissão é a informação: este sítio não
    // impõe tipo a nada.
    return { eventos: [{ passo, tipo: 'usar', nome: dentro }], erros: [] };
  }
  return {
    eventos: [],
    erros: [
      erro(
        passo,
        `Python não sabe o que mostrar: "${dentro}".`,
        'Dentro do print só pode estar um nome, um número ou um texto.',
      ),
    ],
  };
}

function lerAtribuir(nome: string, resto: string, passo: number): LerResultado {
  if (resto.startsWith('=')) {
    // O `ATRIBUIR` casa `total == 5` como atribuição de `= 5`, e dizer
    // "Python não sabe o que fazer com "= 1"" é verdade e não ajuda nada.
    // A pessoa escreveu o sinal certo para comparar e o errado para
    // atribuir, e a mensagem tem de dizer exatamente isso — com os dois
    // caracteres à vista, porque a diferença entre eles é um traço e é
    // nisso que a pessoa se enganou.
    return {
      eventos: [],
      erros: [
        erro(
          passo,
          'Em Python "==" são dois sinais de igual, e é comparação: serve para perguntar, não põe nada em lado nenhum.',
          'Para guardar um valor usa um sinal de igual só: "=" em vez de "==".',
        ),
      ],
    };
  }

  const valor = valorDe(resto, passo);
  if (valor !== null) {
    return {
      eventos: [{ passo, tipo: 'atribuir', nome, tipoValor: valor.tipo, valor }],
      erros: [],
    };
  }

  if (NOME.test(resto)) {
    // Uma cópia não impõe tipo ao destino. `x = total` é válido com
    // qualquer coisa em `total`.
    return { eventos: [{ passo, tipo: 'usar', nome: resto }], erros: [] };
  }

  const expressao = EXPRESSAO.exec(resto);
  if (expressao) {
    const esquerda = expressao[1]!;
    const direita = expressao[3]!;
    // Um termo de uma conta é um número, um texto, True/False — ou o nome
    // de outra variável. Um nome não é um termo inválido: é o termo mais
    // comum, e é o que faz `total = total + 1` ser a linha da lição. O que
    // não é um termo é `2 - 3` escrito do lado direito de um `1 -`.
    const legivel = (t: string): boolean => valorDe(t, passo) !== null || NOME.test(t);
    if (legivel(esquerda) && legivel(direita)) {
      const eventos: EventoLido[] = [];
      // Um nome do lado esquerdo é um uso, e o uso vem **antes** da
      // operação: `total = total + 1` com `total` por guardar tem de falhar
      // em `total`, não na soma. A ordem dos eventos é o que decide isso.
      //
      // O uso declara `número` porque é isso que o sítio exige: em Python
      // `+ - * /` são operações numéricas. E é este `tipoValor` que dá a
      // linha mais importante da lição — `total = 'olá'` passa, e a linha
      // seguinte é que rebenta com "total guarda texto, e este sítio
      // precisa de número". Se a conta não declarasse nada, o produto não
      // teria como dizer ao aluno a coisa mais importante que sabe sobre
      // Python: que o texto entra em silêncio e rebenta em baixo.
      for (const t of [esquerda, direita]) {
        if (NOME.test(t)) eventos.push({ passo, tipo: 'usar', nome: t, tipoValor: 'número' });
      }
      eventos.push({
        passo,
        tipo: 'operar',
        operacao: expressao[2] as '+' | '-' | '*' | '/',
        a: valorDe(esquerda, passo),
        b: valorDe(direita, passo),
      });
      return { eventos, erros: [] };
    }
    // A expressão é válida para o Python e não se sabe ler. Dizer isso é
    // ensino; transformar o termo em `0` sem dizer nada é fazer o aluno
    // ler `a = 1 - 0` e pensar que foi o que escreveu.
    return {
      eventos: [],
      erros: [
        erro(
          passo,
          `Esta conta ainda não sei ler: "${resto}". Numa conta, cada lado tem de ser um número, um texto, True/False, ou o nome de outra variável.`,
          `Nesta lição as contas são de dois termos, e cada termo tem de ser um número, um texto, True/False, ou o nome de outra variável. O termo "${legivel(esquerda) ? direita : esquerda}" não é nenhum dos quatro.`,
        ),
      ],
    };
  }

  return {
    eventos: [],
    erros: [
      erro(
        passo,
        `Python não sabe o que fazer com "${resto}".`,
        'À direita do = só pode estar um número, um texto entre aspas, True, False, o nome de outra variável, ou uma conta.',
      ),
    ],
  };
}

function lerLog(passo: number): LerResultado {
  return {
    eventos: [],
    erros: [
      erro(
        passo,
        'Em Python não existe nada que se chame log. A função não existe, e isso só se descobre quando o código corre.',
        'Escreve a função log antes de a chamares, ou usa print.',
      ),
    ],
  };
}

export const python: Projection = {
  linguagem: 'python',
  familia: 'imperativa',
  policy: POLITICAS.python,
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
      // epistemologias: em Java é recusado antes de correr, em Python só
      // quando corre. O `ler` recusa-o, e a mensagem diz que a função não
      // existe — que é a verdade, e é a altura em que a Python a descobre.
      if (t.startsWith('log(')) {
        erros.push(...lerLog(passo).erros);
        continue;
      }
      const r = lerLinha(linhas[i]!, passo);
      eventos.push(...r.eventos);
      erros.push(...r.erros);
    }
    return { eventos, erros };
  },
};
