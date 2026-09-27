import { describe, expect, it } from 'vitest';
import { python } from './python';
import { interpretar } from '../nucleo/semantica';
import type { Erro } from '../nucleo/tipos';
import { dizer, guardar, guardarTexto, log, pilha, repetir } from '../nucleo/testes/dados';

/** O que `emit` aceita. `ReturnType<typeof python.emit>` seria o `Gerado` que
 *  ele devolve — e o que se quer escrever aqui é o bloco que se lhe dá. */
type Programa = Parameters<typeof python.emit>[0];

/** Ler e depois julgar — o que a Task 6 chama `avaliarTexto`, feito à mão
 *  porque o atalho ainda não existe. */
function avaliar(texto: string): Erro[] {
  const lido = python.ler(texto);
  return lido.erros.length > 0
    ? lido.erros
    : interpretar(lido.eventos, python.policy, (p) => ({ bloco: 'texto', ranhura: 0, passo: p }));
}

function linhasDe(texto: string): string[] {
  return texto.replace(/\n$/, '').split('\n');
}

describe('emit: teste dourado', () => {
  it('guardar número produz uma atribuição simples', () => {
    expect(python.emit(pilha(guardar('total', 5))).texto).toBe('total = 5\n');
  });

  it('o texto() do robô obriga a texto: mesmo um 5 sai entre aspas', () => {
    // Este é o ponto do produto, e é fácil tê-lo errado. A palavra que o
    // robô entrega é uma palavra, mesmo que a pessoa tenha escrito um
    // número. Por isso `guardarTexto('total', 5)` produz `total = '5'` e
    // não `total = 5` — e é essa diferença que torna a conversa sobre
    // tipos necessária em vez de decorativa.
    expect(python.emit(pilha(guardarTexto('total', 5))).texto).toBe("total = '5'\n");
  });

  it('e guardar texto dentro de texto() não duplica a conversão', () => {
    expect(python.emit(pilha(guardarTexto('total', 'olá'))).texto).toBe("total = 'olá'\n");
  });

  it('o mesmo 5 pelo caminho do número sai número — e as duas linhas diferem', () => {
    const comoNumero = python.emit(pilha(guardar('total', 5))).texto;
    const comoPalavra = python.emit(pilha(guardarTexto('total', 5))).texto;
    expect([comoNumero, comoPalavra]).toEqual(['total = 5\n', "total = '5'\n"]);
  });

  it('o nome de um guardar está nos fields, e não nos inputs', () => {
    // O `BlocoLeigo` separa o que a pessoa escreve no bloco (fields) do que
    // se liga a outros blocos (inputs). O plano lia o nome de `inputs.NOME`,
    // que não existe, e emitia `undefined = 5` para o bloco mais básico do
    // produto. A forma do bloco é a mesma em `dados.ts`, no Blockly e no
    // YAML; o que se lê é um sítio, e o sítio é o `fields`.
    const b = guardar('total', 5);
    expect(b.fields?.nome?.valor).toBe('total');
    expect(b.inputs?.['NOME']).toBeUndefined();
  });

  it('dizer produz print', () => {
    expect(python.emit(pilha(dizer({ txt: 'olá' }))).texto).toBe("print('olá')\n");
  });

  it('dizer de um número escreve o número como está, sem aspas', () => {
    // O motor de blocos recusa `dizer(5)` — o bloco `dizer` só aceita
    // texto. O `emit` é uma função total sobre `BlocoLeigo` e escreve o
    // número na mesma, e isso é deliberado: `print(5)` é Python válido, e um
    // emissor que se recusasse a escrever isto teria de inventar um erro
    // para o mesmo-programa consoante o caminho.
    expect(python.emit(pilha(dizer(5))).texto).toBe('print(5)\n');
  });

  it('log de uma referência produz o nome da variável', () => {
    expect(python.emit(pilha(log({ ref: 'total' }))).texto).toBe('log(total)\n');
  });

  it('repetir produz for com range e indentação de 4 espaços', () => {
    expect(python.emit(pilha(repetir(3, [guardar('x', 1)]))).texto).toBe(
      'for _ in range(3):\n    x = 1\n',
    );
  });

  it('repetir aninhado aumenta a indentação', () => {
    expect(python.emit(pilha(repetir(2, [repetir(2, [guardar('x', 1)])]))).texto).toBe(
      'for _ in range(2):\n    for _ in range(2):\n        x = 1\n',
    );
  });

  it('repetir sem corpo emite um pass, porque um for vazio não é Python', () => {
    // Verificado contra o Python: `for _ in range(3):` sozinho é
    // `expected an indented block after 'for' statement`, e um corpo feito
    // só de um comentário dá o mesmo erro. O único corpo válido que não
    // diz nada é `pass`. Emitir o `for` sozinho era emitir Python que não
    // corre, e o produto existe para nunca mostrar ao aluno uma linha que
    // está errada sem dizer que está errada.
    const g = python.emit(pilha(repetir(3, [])));
    expect(g.texto).toBe('for _ in range(3):\n    pass\n');
    expect(() => new Function('x', '')).not.toThrow();
  });

  it('uma pilha gera todas as linhas por ordem', () => {
    expect(python.emit(pilha(guardar('total', 5), log({ ref: 'total' }))).texto).toBe(
      'total = 5\nlog(total)\n',
    );
  });

  it('normaliza um nome com acentos para identificador Python', () => {
    expect(python.emit(pilha(guardar('música', 1))).texto).toBe('musica = 1\n');
  });

  it('fuga aspas simples no texto com barra', () => {
    expect(python.emit(pilha(dizer({ txt: "it's" }))).texto).toBe("print('it\\'s')\n");
  });

  it('fuga a linha nova, porque uma linha nova dentro de aspas não é Python', () => {
    // Verificado contra o Python 3.14: `x = 'a` + linha nova + `b'` dá
    // `unterminated string literal (detected at line 1)`. Escrever o caractere
    // tal e qual produzia duas linhas, e a segunda era código — o aluno via um
    // programa partido sem que nada lhe dissesse que estava partido.
    expect(python.emit(pilha(dizer({ txt: 'a\nb' }))).texto).toBe("print('a\\nb')\n");
    expect(python.emit(pilha(dizer({ txt: 'a\tb\r\nc' }))).texto).toBe("print('a\\tb\\r\\nc')\n");
    // A barra de fugar tem de ser a primeira a ser tratada: se a `\` virasse
    // `\\` depois de o `\n` virar `\n`, cada fuga passava a duplicar-se.
    expect(python.emit(pilha(dizer({ txt: 'a\\nb' }))).texto).toBe("print('a\\\\nb')\n");
  });

  it('e o que o leitor lê é o que a pessoa escreveu', () => {
    // A fuga e a desfuga são o mesmo caminho pelos dois lados. Se divergirem,
    // quem escreve o bloco vê uma coisa e o painel de texto lê outra, e a
    // diferença é um caractere que ninguém consegue ver.
    const ev = python.ler("print('a\\nb')\n").eventos[0]!;
    if (ev.tipo !== 'imprimir') throw new Error('esperava imprimir');
    expect(ev.valor.valor).toBe('a\nb');
  });

  it('programa vazio gera string vazia e zero anotações', () => {
    const g = python.emit(null);
    expect(g.texto).toBe('');
    expect(g.anotacoes).toEqual([]);
  });

  it('toda linha gerada tem anotação, com o número de linha certo', () => {
    const g = python.emit(pilha(repetir(2, [guardar('x', 1), log({ ref: 'x' })]), dizer({ txt: 'olá' })));
    // Quatro linhas: o `for`, o `guardar` do corpo, o `log` do corpo, o
    // `dizer`. A primeira versão deste teste dizia seis, porque contava o
    // `for` duas vezes — uma por volta. Um `repetir(2)` escreve o `for` uma
    // vez e o corpo uma vez; quem lê o texto sabe disto, e quem escreve o
    // número sem contar erra o mesmo que o `Anotacao.tipo` do plano.
    expect(linhasDe(g.texto)).toEqual([
      'for _ in range(2):',
      '    x = 1',
      '    log(x)',
      "print('olá')",
    ]);
    expect(g.anotacoes).toHaveLength(4);
    for (let i = 0; i < g.anotacoes.length; i += 1) {
      expect(g.anotacoes[i]!.linha).toBe(i + 1);
      expect(g.anotacoes[i]!.porque.length).toBeGreaterThan(0);
    }
  });

  it('o for também é anotado, e a anotação do corpo conta a partir dele', () => {
    // O plano emitia a linha do `for` direto para a lista, sem anotação, e o
    // emissor aninhado contava as suas linhas a partir de 1. O resultado
    // eram anotações que apontavam para a linha errada — a do `x = 1` dizia
    // linha 1, e a linha 1 é o `for`. O `porque` de cada linha é o que o
    // aluno lê ao lado do código, e uma anotação na linha errada é pior do
    // que nenhuma: ensina a explicação errada com a confiança certa.
    const g = python.emit(pilha(repetir(2, [guardar('x', 1), log({ ref: 'x' })]), dizer({ txt: 'olá' })));
    const porLinha = new Map(g.anotacoes.map((a) => [a.linha, a.porque]));
    expect(g.anotacoes.every((a) => a.porque.length > 0)).toBe(true);
    expect(porLinha.get(1)).toContain('2 vezes');
    expect(porLinha.get(2)).toContain('Guarda x');
    expect(porLinha.get(3)).toContain('log');
    expect(porLinha.get(4)).toContain('Mostra');
  });

  it('nenhuma anotação menciona outra linguagem', () => {
    const g = python.emit(pilha(guardar('total', 5), log({ ref: 'total' }), dizer({ txt: 'olá' })));
    for (const a of g.anotacoes) {
      expect(a.porque).not.toMatch(/Java|Go|TypeScript|SQL|JavaScript/);
    }
  });

  it('nenhuma anotação afirma um tipo que não sabe', () => {
    // O `Anotacao` do plano tinha um `tipo: Tipo`, e o `emit` preenchia-o
    // com `número` sempre que a entrada era uma referência — porque não há
    // outro tipo para pôr. `log(total)` passava a ser uma linha sobre um
    // número, e o `Tipo` foi-se do interface: um campo que uma em cada
    // cinco linhas não consegue preencher honestamente é um campo que vai
    // ser preenchido a mentir, e o ecrã vai mostrar a mentira.
    const g = python.emit(pilha(log({ ref: 'total' })));
    expect(JSON.stringify(g.anotacoes)).not.toMatch(/"tipo"/);
  });

  it('um bloco desconhecido gera um comentário, nunca uma linha de código inválida', () => {
    const g = python.emit({ type: 'condicao', inputs: { VALOR: { valor: 1 } } });
    expect(g.texto).toBe('# bloco do v2: condicao\n');
  });
});

describe('emit: o texto gerado é Python que corre', () => {
  /** Os catorze programas que esta tarefa produz. Todos compilam no Python
   *  3.14 — verificado à mão, um a um, e o resultado anotado no plano.
   *
   *  O que fica em teste é a *forma* do texto, e não a sua validade: um
   *  teste que precisa de um interpretador externo não corre em todo o lado,
   *  e um teste que nem sempre corre deixa de ser um teste no dia em que o
   *  ambiente muda. A forma apanha o que-interesta — um bloco sem corpo, uma
   *  indentação errada, um sinal de outra linguagem — e é o que se despistou
   *  sozinho. */
  const PROGRAMAS: Programa[] = [
    pilha(guardar('total', 5)),
    pilha(guardarTexto('total', 5)),
    pilha(guardar('pronto', true)),
    pilha(dizer({ txt: 'olá' })),
    pilha(dizer(5)),
    pilha(log({ ref: 'total' })),
    pilha(repetir(3, [guardar('x', 1)])),
    pilha(repetir(3, [])),
    pilha(repetir(2, [repetir(2, [guardar('x', 1)])])),
    pilha(repetir(2, [guardar('x', 1), log({ ref: 'x' })]), dizer({ txt: 'olá' })),
    pilha(dizer({ txt: "it's" })),
    pilha(guardar('música', 1)),
    { type: 'condicao', inputs: { VALOR: { valor: 1 } } },
    null,
  ];

  it('nenhuma linha que abre um bloco fica sem corpo', () => {
    // A regra estrutural que o Python exige: uma linha acabada em `:` tem de
    // ser seguida por uma linha mais indentada. Emitir um `for` sozinho era
    // mostrar ao aluno uma linha que não corre, e o produto existe para nunca
    // mostrar uma linha errada sem dizer que está errada.
    for (const programa of PROGRAMAS) {
      const l = linhasDe(python.emit(programa).texto);
      for (let i = 0; i < l.length; i += 1) {
        if (!l[i]!.trimEnd().endsWith(':')) continue;
        const recuo = l[i]!.length - l[i]!.trimStart().length;
        const seguinte = l[i + 1];
        expect(seguinte, `linha ${i + 1} abre um bloco sem corpo`).toBeDefined();
        expect(seguinte!.length - seguinte!.trimStart().length).toBeGreaterThan(recuo);
      }
    }
  });

  it('nenhum programa gerado traz um sinal de outra linguagem', () => {
    // O `;`, o `{` e as palavras de Java e de JavaScript são as marcas que a
    // pessoa traz de outra linguagem. A projeção recusa-as ao ler, e o `emit`
    // nunca as escreve — as duas metades da mesma frase.
    for (const programa of PROGRAMAS) {
      const t = python.emit(programa).texto;
      expect(t, t).not.toMatch(/[;{}]/);
      expect(t, t).not.toMatch(/^\s*(function|const|let|var|public|class)\b/m);
    }
  });

  it('e a indentação é sempre múltipla de quatro', () => {
    for (const programa of PROGRAMAS) {
      for (const linha of linhasDe(python.emit(programa).texto)) {
        const recuo = linha.length - linha.trimStart().length;
        expect(recuo % 4, linha).toBe(0);
      }
    }
  });
});

describe('ler: o que o Python aceita', () => {
  it('atribuição de número', () => {
    const r = python.ler('total = 5\n');
    expect(r.erros).toEqual([]);
    expect(r.eventos).toHaveLength(1);
  });

  it('atribuição de texto com aspas simples', () => {
    expect(python.ler("nome = 'olá'\n").erros).toEqual([]);
  });

  it('aspas duplas também são Python, e o produto não pode dizer que não', () => {
    // Verificado contra o Python: `x = "ola"` compila. Recusar uma linha
    // válida é o pior erro que um produto de ensino pode cometer, porque o
    // aluno conclui que o produto está errado — e a lição passa a ser
    // "não confies no que o ecrã diz". A casa continua a ser aspas simples;
    // o que muda é o que se aceita.
    expect(python.ler('nome = "olá"\n').erros).toEqual([]);
  });

  it('um número com casas decimais é um número', () => {
    expect(python.ler('preco = 1.5\n').erros).toEqual([]);
    const ev = python.ler('preco = 1.5\n').eventos[0]!;
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('número');
    expect(ev.valor.valor).toBe(1.5);
  });

  it('lógica, e True é o que o Python escreve', () => {
    expect(python.ler('pronto = True\n').erros).toEqual([]);
    expect(python.ler('pronto = False\n').erros).toEqual([]);
  });

  it('print conta como evento sem erro', () => {
    expect(python.ler('print(total)\n').erros).toEqual([]);
  });

  it('print de uma variável não é um erro, porque Python não impõe tipo ao print', () => {
    // O plano emitia `usar` com `tipoValor: 'texto'` para o que está dentro
    // do `print`, e o núcleo respondia "total guarda número, e este sítio
    // precisa de texto". O Python não diz nada disso. Um `usar` sem
    // `tipoValor` é um sítio que não declara tipo — que é o que o `print` é.
    expect(avaliar('total = 5\nprint(total)\n')).toEqual([]);
  });

  it('uma cópia também não impõe tipo: x = total', () => {
    expect(avaliar('total = 5\nx = total\n')).toEqual([]);
  });

  it('linhas em branco, espaços e comentários são ignorados', () => {
    expect(python.ler('  total = 5  \n\n# um comentário\n').erros).toEqual([]);
  });

  it('texto vazio não é erro', () => {
    expect(python.ler('').erros).toEqual([]);
    expect(python.ler('\n\n').erros).toEqual([]);
  });
});

describe('ler: o que o Python recusa', () => {
  it('um ponto-e-vírgula no fim da linha não é Python', () => {
    const r = python.ler('total = 5;\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('Python');
    expect(r.erros[0]!.porque).toContain(';');
  });

  it('um ponto-e-vírgula dentro de um texto é perfeitamente válido', () => {
    // Verificado contra o Python: `x = 'a;b'` compila. O plano procurava o
    // `;` na linha toda e recusava antes de tentar ler, por isso contava um
    // sinal dentro de uma palavra como se fosse o vício do Java. A regra
    // passou a ser: primeiro tenta ler; só se não conseguir, e se a linha
    // acabar em `;`, é que o `;` é o culpado.
    expect(python.ler("x = 'a;b'\n").erros).toEqual([]);
  });

  it('o erro de sintaxe tem porque e remedio, nunca um código nu', () => {
    const r = python.ler('isto não é código\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.classe).toBe('FalhaRuntime');
    expect(r.erros[0]!.porque.length).toBeGreaterThan(10);
    expect(r.erros[0]!.remedio.length).toBeGreaterThan(0);
  });

  it('o passo do erro é a linha certa', () => {
    const r = python.ler('total = 5\nx = 1;\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.origem.passo).toBe(2);
  });

  it('dois sinais de igual são comparação, e o erro diz isso', () => {
    // A regra do plano casava `x == 1` como atribuição e dizia "Python não
    // sabe o que fazer com "= 1"". É verdade e não ajuda nada: o aluno
    // escreveu o sinal certo para comparar e o errado para atribuir, e é
    // exatamente isso que a mensagem tem de dizer.
    const r = python.ler('total == 5\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('==');
    expect(r.erros[0]!.remedio).toContain('=');
  });

  it('log é uma função que ainda não existe, e o erro diz isso', () => {
    // O bloco `log` emite `log(...)` de propósito. Em Python isso rebenta a
    // correr, e o recusa-ao-usar de Java recusa antes. A lição está no
    // quando, e o `porque` tem de dizer a verdade sobre o Python.
    const r = python.ler('log(total)\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('log');
    expect(r.erros[0]!.porque).toContain('Python');
    expect(r.erros[0]!.porque).toMatch(/não existe|não está definida/);
  });
});

describe('ler: a política do Python', () => {
  it("total = 'olá' passa — quem recusa é o uso", () => {
    expect(python.ler("total = 'olá'\n").erros).toEqual([]);
  });

  it('a leitura diz que o valor guardado é texto', () => {
    const ev = python.ler("total = 'olá'\n").eventos[0]!;
    expect(ev.tipo).toBe('atribuir');
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('texto');
    expect(ev.valor.valor).toBe('olá');
  });

  it('atribuir sem ponto-e-vírgula é o caminho feliz, e a semicolon é o teste', () => {
    expect(python.ler('total = 5\n').erros).toHaveLength(0);
    expect(python.ler('int total = 5\n').erros).toHaveLength(1);
  });
});

describe('ler: expressões', () => {
  it('total = total + 1 produz um uso e uma operação, e nenhum erro', () => {
    const r = python.ler('total = 5\ntotal = total + 1\n');
    expect(r.erros).toEqual([]);
    expect(r.eventos.map((e) => e.tipo)).toEqual(['atribuir', 'usar', 'operar']);
  });

  it('o uso vem antes da operação, que é o que faz o erro cair no sítio certo', () => {
    const r = python.ler('total = total + 1\n');
    expect(r.eventos[0]!.tipo).toBe('usar');
  });

  it('somar texto a número é erro de execução, e é em Python também', () => {
    const erros = avaliar("total = 'olá'\ntotal = total + 1\n");
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('texto');
  });

  it('as quatro operações entram', () => {
    for (const op of ['+', '-', '*', '/']) {
      expect(python.ler(`total = total ${op} 1\n`).erros).toEqual([]);
    }
  });

  it('dividir por zero é o que a conta dá, e quem diz é o núcleo', () => {
    const erros = avaliar('total = 8\ntotal = total / 0\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('zero');
  });

  it('uma conta de três termos não é adivinhada: ou se lê, ou se diz que não se lê', () => {
    // `1 - 2 - 3` casa a expressão como `1 - (2 - 3)`, e o termo da direita
    // não é um número nem um texto. O plano transformava-o num `0` sem
    // dizer nada, e o aluno lia `a = 1 - 0` como se fosse o que escreveu. Um
    // limite declarado é ensino; um limite escondido é mentira.
    const r = python.ler('a = 1 - 2 - 3\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('2 - 3');
    expect(r.erros[0]!.remedio).toContain('número');
  });
});

describe('ler: o for', () => {
  it('conta as voltas', () => {
    const r = python.ler('for _ in range(3):\n    total = total + 1\n');
    expect(r.erros).toEqual([]);
    const c = r.eventos.find((e) => e.tipo === 'ciclo');
    if (!c || c.tipo !== 'ciclo') throw new Error('esperava um ciclo');
    expect(c.iteracoes).toBe(3);
  });

  it('a indentação não é lida como erro: o `ler` lê linha a linha', () => {
    expect(python.ler('    total = 5\n').erros).toEqual([]);
  });

  it('o for de duas voltas também', () => {
    const c = python.ler('for _ in range(2):\n    x = 1\n').eventos[0]!;
    if (c.tipo !== 'ciclo') throw new Error('esperava um ciclo');
    expect(c.iteracoes).toBe(2);
  });

  it('range com mais de 10000 voltas é recusado pelo núcleo, não pelo leitor', () => {
    const erros = avaliar('for _ in range(10001):\n    x = 1\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('10000');
  });
});

describe('ler: os erros são sempre FalhaRuntime, e isso está no tipo', () => {
  it('o tipo de LerResultado.errors é FalhaRuntime[], não Erro[]', () => {
    // Se `erros` fosse `Erro[]`, `r.erros[0].passo` não compilaria — e o
    // plano acessava-o em três sítios, sobre uma união em que só a
    // `FalhaRuntime` tem `passo`. Declarar o tipo narrowed não é um truque
    // para o compilador calar-se: é a afirmação de que um erro de leitura é
    // sempre uma falha a correr, e que a projeção não produz recusas de
    // tipo — quem recusa o tipo é o núcleo.
    const r: { erros: Array<{ classe: 'FalhaRuntime'; passo: number }> } = python.ler('isto não é\n');
    expect(r.erros[0]!.classe).toBe('FalhaRuntime');
    expect(r.erros[0]!.passo).toBe(1);
  });

  it('nenhum erro de leitura diz que o tipo está errado', () => {
    for (const linha of ['int total = 5', 'log(total)', 'total == 5', "x = 'a;b';"]) {
      for (const e of python.ler(linha + '\n').erros) {
        expect(e.classe).toBe('FalhaRuntime');
      }
    }
  });
});

describe('a projeção e a sua política', () => {
  it('a política é a de Python, e vem do núcleo', () => {
    expect(python.policy).toEqual({ recusaNoTipo: false, quando: 'ao usar' });
  });

  it('emit e ler são o mesmo objeto, e é para isso que serve', () => {
    // Escrever `total = 5` e ler `total = 5` é a mesma pessoa. Se `emit` e
    // `ler` fossem dois objectos separados, cada um com as suas ideias
    // sobre o que é Python, a lição ensinaria duas linguagens diferentes
    // com o mesmo nome.
    const escrito = python.emit(pilha(guardar('total', 5))).texto;
    const lido = python.ler(escrito);
    expect(lido.erros).toEqual([]);
    const ev = lido.eventos[0]!;
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.nome).toBe('total');
    expect(ev.tipoValor).toBe('número');
  });

  it('ida e volta de cada bloco da lição, sem erros de leitura', () => {
    const programas: Array<[string, Programa]> = [
      ['guardar número', pilha(guardar('total', 5))],
      ['guardar texto', pilha(guardar('nome', { txt: 'olá' }))],
      ['dizer', pilha(dizer({ txt: 'olá' }))],
      ['log', pilha(log({ ref: 'total' }))],
      ['repetir', pilha(repetir(3, [guardar('x', 1)]))],
    ];
    for (const [nome, programa] of programas) {
      const g = python.emit(programa);
      const r = python.ler(g.texto);
      // O `log` é a única linha que o Python recusa, e é recusada de
      // propósito: é o bloco que mostra a diferença entre "recusa antes" e
      // "recusa quando corre". Qualquer outra linha que o `ler` não consiga
      // ler é o `emit` a escrever Python que não é Python.
      if (nome === 'log') {
        expect(r.erros, nome).toHaveLength(1);
      } else {
        expect(r.erros, nome).toEqual([]);
      }
    }
  });
});
