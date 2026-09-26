import { describe, expect, it } from 'vitest';
import { AMOSTRA, POLITICAS, interpretar, interpretarEm } from './semantica';
import type { EventoLido } from './semantica';
import { MAX_ITERACOES, val } from './tipos';
import type { Language, Origem, Valor } from './tipos';

const ORIGEM: Origem = { bloco: 'linha', ranhura: 0, passo: 1 };

function n(v: number): Valor {
  return val('número', v, AMOSTRA, ORIGEM);
}
function t(v: string): Valor {
  return val('texto', v, AMOSTRA, ORIGEM);
}
function origemNo(passo: number): Origem {
  return { ...ORIGEM, passo };
}

const TODAS = Object.keys(POLITICAS) as Language[];

function atribuir(nome: string, valor: Valor, restricao?: 'número'): EventoLido {
  return { passo: 1, tipo: 'atribuir', nome, tipoValor: valor.tipo, valor, restricao };
}
function usar(nome: string, tipoValor: 'número' | 'texto'): EventoLido {
  return { passo: 2, tipo: 'usar', nome, tipoValor };
}
function operar(a: Valor, b: Valor, operacao: '+' | '/'): EventoLido {
  return { passo: 2, tipo: 'operar', operacao, a, b };
}
function ciclo(passo: number, iteracoes: number): EventoLido {
  return { passo, tipo: 'ciclo', iteracoes };
}

/** Interpreta um evento só e exige que produza um erro — para os testes em
 *  que a pergunta é *qual* erro, e não *quantos*. */
function umErro(ev: EventoLido, politica = POLITICAS.python) {
  const erros = interpretar([ev], politica, origemNo);
  expect(erros).toHaveLength(1);
  return erros[0]!;
}

describe('as seis políticas', () => {
  it('existe uma para cada linguagem, e só uma', () => {
    expect(Object.keys(POLITICAS).sort()).toEqual([
      'go',
      'java',
      'javascript',
      'python',
      'sql',
      'typescript',
    ]);
  });

  it('python e javascript nunca recusam no tipo', () => {
    expect(POLITICAS.python.recusaNoTipo).toBe(false);
    expect(POLITICAS.javascript.recusaNoTipo).toBe(false);
  });

  it('java, go, typescript e sql recusam no tipo', () => {
    expect(POLITICAS.java.recusaNoTipo).toBe(true);
    expect(POLITICAS.go.recusaNoTipo).toBe(true);
    expect(POLITICAS.typescript.recusaNoTipo).toBe(true);
    expect(POLITICAS.sql.recusaNoTipo).toBe(true);
  });

  it('o quando distingue as três epistemologias', () => {
    expect(POLITICAS.python.quando).toBe('ao usar');
    expect(POLITICAS.javascript.quando).toBe('ao usar');
    expect(POLITICAS.java.quando).toBe('antes de correr');
    expect(POLITICAS.go.quando).toBe('antes de correr');
    expect(POLITICAS.typescript.quando).toBe('antes de correr');
    expect(POLITICAS.sql.quando).toBe('quando o dado entra');
  });
});

describe('interpretar: o mesmo programa, seis políticas', () => {
  it('python deixa passar a atribuição errada — é este o ponto da lição', () => {
    expect(interpretar([atribuir('total', t('olá'), 'número')], POLITICAS.python, origemNo)).toEqual([]);
  });

  it('python reporta ao usar, e o porque nomeia o texto e a variável', () => {
    const erros = interpretar(
      [atribuir('total', t('olá'), 'número'), usar('total', 'número')],
      POLITICAS.python,
      origemNo,
    );
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('FalhaRuntime');
    expect(erros[0]!.porque).toContain('texto');
    expect(erros[0]!.porque).toContain('total');
    // O passo vive em `origem`, e é lá que vive nos *três* erros. Uma `Recusa`
    // não tem `passo` no topo — só `origem` — e dar-lhe um `passo` seria pôr
    // o mesmo fato em dois sítios, para depois divergirem. O `passo` que a
    // `FalhaRuntime` tem no topo é o que a Task 1 escreveu, e não se mexe.
    expect(erros[0]!.origem.passo).toBe(2);
  });

  it('java recusa logo na atribuição, e o passo é o da atribuição', () => {
    const erros = interpretar(
      [atribuir('total', t('olá'), 'número'), usar('total', 'número')],
      POLITICAS.java,
      origemNo,
    );
    // Dois erros, não um — e este é o mesmo programa que o teste "depois de
    // uma Recusa" usa, que exige dois. A primeira versão deste teste pedia
    // um, e as duas exigências não podem ser verdade ao mesmo tempo. São
    // dois: a recusa da linha 1, e o fato de a linha 2 usar um valor
    // recusado. O segundo não é redundância — é o que impede um programa
    // recusado de continuar em silêncio e parecer que funciona.
    expect(erros).toHaveLength(2);
    expect(erros[0]!.classe).toBe('Recusa');
    // O passo da atribuição, não o da linha 2 que a usou. É a diferença
    // entre "a linha 1 está errada" e "a linha 2 está errada" — a mesma
    // diferença que a spec §7 pede à lição, e que um teste com `.passo`
    // inexistente nunca ia ver.
    expect(erros[0]!.origem.passo).toBe(1);
    if (erros[0]!.classe !== 'Recusa') throw new Error('esperava Recusa');
    expect(erros[0]!.esperado).toBe('número');
    expect(erros[0]!.obtido).toBe('texto');
  });

  it('sql recusa na entrada do dado e diz que a limitação fica para sempre', () => {
    const erros = interpretar([atribuir('total', t('olá'), 'número')], POLITICAS.sql, origemNo);
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('Recusa');
    expect(erros[0]!.remedio).toContain('para sempre');
  });

  it('nenhuma das seis produz um erro sem porque nem sem remedio', () => {
    for (const nome of TODAS) {
      const erros = interpretar(
        [atribuir('total', t('olá'), 'número'), usar('total', 'número'), operar(n(1), n(0), '/')],
        POLITICAS[nome],
        origemNo,
      );
      expect(erros.length).toBeGreaterThan(0);
      for (const e of erros) {
        expect(e.porque.length).toBeGreaterThan(0);
        expect(e.remedio.length).toBeGreaterThan(0);
      }
    }
  });

  it('nenhum erro nomeia uma linguagem, em nenhum ramo do interpretador', () => {
    // A lista cobre os quatro ramos que escrevem texto — atribuir, usar,
    // operar, ciclo — mais um `imprimir` e um `texto` inocuos, para que a
    // lista não cresça a cada ramo novo sem ninguém reparar. Um erro que
    // dissesse "em Python isto rebenta mais tarde" seria útil e seria
    // exatamente o que este ficheiro proíbe: a prosa por linguagem é da
    // projeção, e é a Task 4 que a escreve.
    for (const nome of TODAS) {
      const eventos: EventoLido[] = [
        atribuir('total', t('olá'), 'número'),
        usar('total', 'número'),
        usar('inexistente', 'número'),
        operar(t('olá'), n(1), '+'),
        ciclo(3, MAX_ITERACOES + 1),
        { passo: 4, tipo: 'imprimir', valor: n(5) },
        { passo: 5, tipo: 'texto', texto: 'olá' },
      ];
      for (const e of interpretar(eventos, POLITICAS[nome], origemNo)) {
        expect(JSON.stringify(e), nome).not.toMatch(/Python|Java|JavaScript|Go|TypeScript|SQL/);
      }
    }
  });
});

describe('interpretar: uma variável recusada não volta a ser utilizável', () => {
  it('depois de uma Recusa, usar o valor é FalhaRuntime e não silêncio', () => {
    const erros = interpretar(
      [atribuir('total', t('olá'), 'número'), usar('total', 'número')],
      POLITICAS.java,
      origemNo,
    );
    expect(erros).toHaveLength(2);
    expect(erros[0]!.classe).toBe('Recusa');
    expect(erros[1]!.classe).toBe('FalhaRuntime');
    expect(erros[1]!.porque).toContain('recusado');
  });

  it('mas uma atribuição certa ao mesmo nome cura o nome', () => {
    // Uma `Recusa` é um erro *daquela linha*, não uma nódoa permanente no
    // nome. Se corrigir a linha 1 fizesse a 2 passar, e se não fizesse, o
    // aluno levava a lição errada: que em Java um nome fica podre para
    // sempre. Não fica. E o teste existe porque a implementação natural —
    // marcar `recusado` e nunca mais o desmarcar — dá o resultado errado
    // sem dar erro nenhum.
    const erros = interpretar(
      [
        atribuir('total', t('olá'), 'número'),
        { passo: 3, tipo: 'atribuir', nome: 'total', tipoValor: 'número', valor: n(5) },
        usar('total', 'número'),
      ],
      POLITICAS.java,
      origemNo,
    );
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('Recusa');
    expect(erros[0]!.origem.passo).toBe(1);
  });
});

describe('interpretar: variável usada antes de existir', () => {
  it('nomeia a variável e o passo', () => {
    const erros = interpretar([usar('total', 'número')], POLITICAS.python, origemNo);
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('FalhaRuntime');
    expect(erros[0]!.porque).toContain('total');
    expect(erros[0]!.porque).toContain('antes');
    expect(erros[0]!.origem.passo).toBe(2);
  });

  it('vale igual em Java, porque o compilador também não adivinha', () => {
    expect(interpretar([usar('total', 'número')], POLITICAS.java, origemNo)).toHaveLength(1);
  });
});

describe('interpretar: aritmética', () => {
  it('somar dois números é silencioso nas seis', () => {
    for (const nome of TODAS) {
      expect(interpretar([operar(n(5), n(1), '+')], POLITICAS[nome], origemNo)).toEqual([]);
    }
  });

  it('uma operação com tipos diferentes é FalhaRuntime mesmo em Java', () => {
    // Um compilador não avalia aritmética, por isso nunca recusa uma soma de
    // tipos errados: recusa a correr, não antes. Este teste é o que impede a
    // política de virar "recusa-e-basta".
    const erros = interpretar([operar(t('olá'), n(1), '+')], POLITICAS.java, origemNo);
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('FalhaRuntime');
    expect(erros[0]!.porque).toContain('texto');
  });

  it('juntar dois textos com + é o que a linguagem faz, e não é erro', () => {
    expect(interpretar([operar(t('olá'), t(' mundo'), '+')], POLITICAS.python, origemNo)).toEqual([]);
  });

  it('dividir por zero é FalhaRuntime com porque, nas seis', () => {
    for (const nome of TODAS) {
      const erros = interpretar([operar(n(8), n(0), '/')], POLITICAS[nome], origemNo);
      expect(erros).toHaveLength(1);
      expect(erros[0]!.classe).toBe('FalhaRuntime');
      expect(erros[0]!.porque).toContain('zero');
    }
  });

  it('a origem de um erro de operação é o passo do evento', () => {
    expect(umErro(operar(n(8), n(0), '/')).origem.passo).toBe(2);
  });

  it('um operando que é um nome não se julga: o uso é que sabe o tipo', () => {
    // `total = total + 1` tem `total` à esquerda, e o valor de `total` só
    // existe quando o programa corre. O plano punha um `0` no lugar do nome,
    // e com isso uma conta de dois números podia ser recusada por uma
    // incompatibilidade que não existe. O `usar` do mesmo passo é que
    // declara o tipo exigido, e é dele que sai o erro.
    const semNome = interpretar(
      [operar(n(1), n(2), '+')],
      POLITICAS.python,
      origemNo,
    );
    expect(semNome).toEqual([]);

    const comNome = interpretar(
      [{ passo: 2, tipo: 'operar', operacao: '+', a: null, b: n(1) }],
      POLITICAS.python,
      origemNo,
    );
    expect(comNome).toEqual([]);
  });

  it('mas o divisor zero diz-se mesmo com o outro lado a ser um nome', () => {
    const e = umErro({ passo: 2, tipo: 'operar', operacao: '/', a: null, b: n(0) });
    expect(e.porque).toContain('zero');
  });

  it('e o tipo que o uso exige é o que apanha o texto numa conta', () => {
    // A linha mais importante da lição: `total = 'olá'` passa, e é a linha
    // seguinte que rebenta. O `usar` da conta declara `número`, e o núcleo
    // responde que `total` guarda texto. Se a conta não declarasse nada, o
    // produto não teria como dizer ao aluno a coisa mais importante que
    // sabe sobre Python.
    const erros = interpretar(
      [
        atribuir('total', t('olá')),
        { passo: 2, tipo: 'usar', nome: 'total', tipoValor: 'número' },
        { passo: 2, tipo: 'operar', operacao: '+', a: null, b: n(1) },
      ],
      POLITICAS.python,
      origemNo,
    );
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('texto');
    expect(erros[0]!.porque).toContain('número');
  });
});

describe('interpretar: limites de ciclo', () => {
  it('aceita o limite exato e recusa o limite mais um, nas seis', () => {
    for (const nome of TODAS) {
      expect(interpretar([ciclo(1, MAX_ITERACOES)], POLITICAS[nome], origemNo)).toEqual([]);
      const erros = interpretar([ciclo(1, MAX_ITERACOES + 1)], POLITICAS[nome], origemNo);
      expect(erros).toHaveLength(1);
      expect(erros[0]!.porque).toContain(String(MAX_ITERACOES));
    }
  });

  it('o valor do limite é 10000, e o teste acima não o descobre sozinho', () => {
    // Se alguém baixar `MAX_ITERACOES` para 5, o teste anterior continua a
    // passar: lê a constante, compara com a constante, e prova que a
    // comparação existe. O número em si fica preso aqui, à mão, que é o
    // sítio onde um fato tem de ficar preso para o teste valer alguma coisa.
    expect(MAX_ITERACOES).toBe(10_000);
  });

  it('um número de voltas fracionário tem mensagem própria', () => {
    // Não é o mesmo erro que "a mais". Um laço de duas voltas e meia não
    // existe, e dizer a quem escreveu 2.5 que o limite são 10000 ensina a
    // coisa errada: a resposta seria "então 2.5 é menos que 10000, porque foi
    // recusado?".
    const e = umErro(ciclo(1, 2.5));
    expect(e.porque).toContain('inteiro');
    expect(e.porque).not.toContain('10000');
  });

  it('um número de voltas negativo tem a sua mensagem, e não é o limite', () => {
    const e = umErro(ciclo(1, -1));
    expect(e.porque).toContain('negativo');
    expect(e.porque).not.toContain('10000');
  });
});

describe('interpretar: imprimir e texto', () => {
  it('um sítio sem tipo declarado aceita o que chegar', () => {
    // `print(total)` em Python não quer texto: quer o que houver. Se a
    // projeção mandasse um `usar` com `tipoValor: 'texto'`, o núcleo
    // responderia "total guarda número, e este sítio precisa de texto" — um
    // erro que o Python não tem, numa linha que o Python aceita. O aluno
    // leria isso e concluiria que o produto se engana, que é a pior coisa
    // que um professor de sintaxe pode ensinar. A omissão é a informação.
    const erros = interpretar(
      [
        atribuir('total', n(5)),
        { passo: 2, tipo: 'usar', nome: 'total' },
        usar('total', 'texto'),
      ],
      POLITICAS.python,
      origemNo,
    );
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('texto');
  });

  it('e a diferença entre omisso e declarado é a diferença entre nada e tudo', () => {
    const soOmisso = interpretar(
      [atribuir('total', n(5)), { passo: 2, tipo: 'usar', nome: 'total' }],
      POLITICAS.python,
      origemNo,
    );
    expect(soOmisso).toEqual([]);

    // O mesmo `usar` com o tipo declarado é o bloco `dizer`, que é mais
    // estrito do que a linguagem. A costura é real e é a Task 6 que a mostra.
    const declarado = interpretar(
      [atribuir('total', n(5)), usar('total', 'texto')],
      POLITICAS.python,
      origemNo,
    );
    expect(declarado).toHaveLength(1);
  });

  it('imprimir aceita qualquer tipo, porque print(5) é legal em cinco das seis', () => {
    // O motor de blocos é *mais* estrito: o bloco `dizer` só aceita texto.
    // A diferença é deliberada e é uma lição — quem aprendeu nos blocos
    // escreve `print('5')` e depois descobre que a linguagem também aceitava
    // `print(5)`. É a costura que a Task 6 vai ter de mostrar. O que não pode
    // é o texto ser julgado por uma regra que o bloco não tem.
    for (const nome of TODAS) {
      expect(
        interpretar([{ passo: 1, tipo: 'imprimir', valor: n(5) }], POLITICAS[nome], origemNo),
      ).toEqual([]);
    }
  });

  it('um texto é texto cru e não se julga: quem o leu foi a projeção', () => {
    expect(interpretar([{ passo: 1, tipo: 'texto', texto: "'aberta" }], POLITICAS.python, origemNo)).toEqual(
      [],
    );
  });
});

describe('interpretarEm', () => {
  it('repassa a política da linguagem ao interpretador', () => {
    const ler = (): EventoLido[] => [atribuir('total', t('olá'), 'número')];
    expect(interpretarEm('qualquer', 'python', ler)).toEqual([]);
    expect(interpretarEm('qualquer', 'java', ler)).toHaveLength(1);
  });
});
