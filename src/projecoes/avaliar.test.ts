import { describe, expect, it } from 'vitest';
import { avaliarTexto, bate, classificar, divergir, emitir } from './avaliar';
import { guardar, log, pilha, repetir } from '../nucleo/testes/dados';

describe('emitir', () => {
  it('delega na projeção da linguagem', () => {
    expect(emitir('python', pilha(guardar('total', 5))).texto).toBe('total = 5\n');
    expect(emitir('java', pilha(guardar('total', 5))).texto).toBe('int total = 5;\n');
  });

  it('e uma linguagem sem projeção diz que não tem, em vez de devolver nada', () => {
    expect(() => emitir('sql', pilha(guardar('total', 5)))).toThrow(/sql/);
  });

  it('aceita um programa vazio, como o `emit` da projeção', () => {
    expect(emitir('java', null).texto).toBe('');
  });
});

describe('avaliarTexto: Review Focus 1 — texto de outra linguagem', () => {
  it('Python escrito como Java é recusado, e o porque diz porquê', () => {
    const erros = avaliarTexto('java', 'total = 5\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('Java');
  });

  it('e o inverso: Java escrito como Python também', () => {
    const erros = avaliarTexto('python', 'int total = 5;\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('Python');
  });

  it('a linguagem certa passa', () => {
    expect(avaliarTexto('java', 'int total = 5;\n')).toEqual([]);
    expect(avaliarTexto('python', 'total = 5\n')).toEqual([]);
  });

  it('nenhum erro de texto-outra-linguagem menciona a outra linguagem por nome no remedio', () => {
    // A regra de §0: nenhuma mensagem aponta para outra linguagem. A pessoa
    // escolheu uma, e ser-lhe mostrada outra pelo nome é exatamente a
    // referência cruzada que a spec removeu.
    const erros = avaliarTexto('java', 'total = 5\n');
    expect(erros[0]!.remedio).not.toMatch(/Python/);
  });

  it('e nenhum dos dois lados usa o nome da linguagem errada no porque', () => {
    expect(avaliarTexto('java', 'total = 5\n')[0]!.porque).not.toMatch(/Python/);
    expect(avaliarTexto('python', 'int total = 5;\n')[0]!.porque).not.toMatch(/Java/);
  });
});

describe('avaliarTexto: Review Focus 3 — variável antes de existir', () => {
  it('nomeia a variável e o passo', () => {
    const erros = avaliarTexto('python', 'total = total + 1\n');
    expect(erros.length).toBeGreaterThan(0);
    expect(erros[0]!.porque).toContain('total');
    expect(erros[0]!.porque).toContain('antes');
  });

  it('vale igual em Java', () => {
    const erros = avaliarTexto('java', 'int total = total + 1;\n');
    expect(erros.length).toBeGreaterThan(0);
    expect(erros[0]!.porque).toContain('total');
  });
});

describe('avaliarTexto: a mesma linha, linguagens diferentes', () => {
  it('guardar texto onde se quer número: Java recusa, Python adia', () => {
    const emJava = avaliarTexto('java', 'int total = "olá";\n');
    const emPython = avaliarTexto('python', "total = 'olá'\n");
    expect(emJava.some((e) => e.classe === 'Recusa')).toBe(true);
    expect(emPython).toEqual([]);
  });

  it('em Python a dívida paga-se no uso, e aí sim é FalhaRuntime', () => {
    // A dívida paga-se **numa conta**, e não num `print`. O `print` aceita
    // qualquer tipo — o `tipoValor` fica de fora de propósito, senão o produto
    // inventava um erro de tipo onde a linguagem não tem nenhum — e por isso
    // `print(total)` não acusa nada. A primeira versão deste teste escrevia
    // `print(total)` e esperava um erro: um teste que só passa se a projeção
    // mentir sobre o `print`.
    //
    // E o `porque` é exigido **pelo conteúdo**: a primeira versão deste teste
    // passava com o erro de leitura errado, porque também era
    // `FalhaRuntime` e também estava no passo 2. Passava a testar outra coisa.
    const erros = avaliarTexto('python', "total = 'olá'\nprint(total + 1)\n");
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('FalhaRuntime');
    if (erros[0]!.classe !== 'FalhaRuntime') throw new Error('esperava FalhaRuntime');
    expect(erros[0]!.passo).toBe(2);
    expect(erros[0]!.porque).toContain('precisa de número');
  });

  it('e a mesma dívida, em Java, não chega a ser dívida', () => {
    const emJava = avaliarTexto('java', 'int total = "olá";\nSystem.out.println(total + 1);\n');
    expect(emJava[0]!.classe).toBe('Recusa');
    expect(emJava[0]!.classe).not.toBe('FalhaRuntime');
  });
});

describe('a leitura de texto é em duas fases, e a ordem importa', () => {
  it('uma linha que nem se lê não chega a ser julgada', () => {
    // Primeiro a projeção diz o que a linha diz. Se o núcleo a julgasse
    // primeiro, o produto ensinaria Python a recusar coisas que não recusa —
    // que é a falha mais cara que esta divisão de trabalho evita.
    //
    // A segunda linha **recusa um tipo**, e é para isso que o teste existe: a
    // `Recusa` dela não aparece. Se aparecesse, o núcleo estaria a julgar
    // eventos lidos de uma linha que não se leu, e não há nada a julgar.
    const erros = avaliarTexto('java', 'total = 5;\nint total = "olá";\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.origem.passo).toBe(1);
    expect(erros[0]!.classe).not.toBe('Recusa');
  });

  it('e a segunda linha é julgada quando a primeira lê-se', () => {
    // O mesmo texto sem o ponto-e-vírgula: a linha 1 passa, e é a linha 2 que
    // dá a `Recusa`. Um teste só com o caso de cima passa mesmo com o
    // curto-circuito a acontecer ao contrário.
    const erros = avaliarTexto('java', 'int total = 5;\nint total = "olá";\n');
    expect(erros.length).toBeGreaterThan(0);
    expect(erros.some((e) => e.classe === 'Recusa')).toBe(true);
  });
});

describe('a classe é que género de erro foi, e a mensagem é quando', () => {
  it('uma falta de ; numa linguagem compilada é FalhaRuntime, e a mensagem diz antes', () => {
    // Aqui está a decisão, e é uma decisão e não um acidente. **A classe
    // responde a "que genre de coisa está errada", e não a "quando".** Um `;`
    // em falta não é um tipo trocado, e pôr-lo em `Recusa` obrigaria a inventar
    // um `esperado` e um `obtido` que não são tipos — e um `Recusa` com tipos
    // inventados é pior do que um `FalhaRuntime` honesto. **Quando** é a
    // mensagem que diz, e a projeção de Java diz que o compilador recusa antes
    // de o código correr.
    const erros = avaliarTexto('java', 'int total = 5\n');
    expect(erros[0]!.classe).toBe('FalhaRuntime');
    expect(erros[0]!.porque).toMatch(/ponto-e-vírgula/);
  });

  it('e a mesma linha, na linguagem que não recusa, é FalhaRuntime sem mais', () => {
    const emPython = avaliarTexto('python', "total = 'olá'\nprint(total + 1)\n");
    expect(emPython[0]!.classe).toBe('FalhaRuntime');
    expect(emPython[0]!.porque).toMatch(/quando este valor é usado/);
  });

  it('a classe observada nunca é QuebraEquivalencia', () => {
    // Que há três classes observadas, e QuebraEquivalencia não é uma delas: a
    // divergência entre blocos e texto é um erro de comparação, não do
    // programa. Uma sonda que espera `Recusa` nunca pode ser satisfeita por
    // alguém que escreveu a linha de outra maneira.
    const casos = [
      avaliarTexto('java', 'int total = 5\n'),
      avaliarTexto('java', 'int total = "olá";\n'),
      avaliarTexto('python', "total = 'olá'\nprint(total + 1)\n"),
      avaliarTexto('python', 'total = 5\n'),
    ];
    for (const erros of casos) {
      expect(['Observacao', 'Recusa', 'FalhaRuntime']).toContain(classificar(erros));
    }
  });
});

describe('classificar e bate', () => {
  it('sem erros é Observacao', () => {
    expect(classificar([])).toBe('Observacao');
  });

  it('com Recusa é Recusa', () => {
    expect(classificar(avaliarTexto('java', 'int total = "olá";\n'))).toBe('Recusa');
  });

  it('com FalhaRuntime é FalhaRuntime', () => {
    expect(classificar(avaliarTexto('python', "total = 'olá'\nprint(total + 1)\n"))).toBe(
      'FalhaRuntime',
    );
  });

  it('a Recusa ganha à FalhaRuntime, porque é a primeira a acontecer', () => {
    // E é a primeira mesmo: numa linguagem que recusa, a atribuição errada
    // aparece antes de o uso errado. Ordenar por classe em vez de por ordem
    // de acontecimento daria o mesmo resultado por sorte, e o próximo caso em
    // que não desse seria o primeiro a enganar.
    const erros = avaliarTexto('java', 'int total = "olá";\nSystem.out.println(total + 1);\n');
    expect(erros.length).toBeGreaterThan(1);
    expect(classificar(erros)).toBe('Recusa');
  });

  it('bate aceita quando a classe observada é a esperada', () => {
    expect(bate('Observacao', avaliarTexto('python', 'total = 5\n'))).toBe(true);
    expect(bate('Recusa', avaliarTexto('python', 'total = 5\n'))).toBe(false);
  });

  it('bate não diz o que viu, e isso é trabalho de quem pergunta', () => {
    // `bate` devolve sim ou não, e é o que uma sondagem precisa para passar ou
    // falhar. Dizer "esperavas Recusa, viste FalhaRuntime" é trabalho da
    // sondagem, que tem o esperado à mão — e que, em Portugal, se escreve
    // `sondas.ts` na T7. Uma função que devolvesse a frase faria o núcleo
    // saber o formato da lição, e é o que ele não pode saber.
    expect(bate('Recusa', avaliarTexto('python', "total = 'olá'\nprint(total + 1)\n"))).toBe(
      false,
    );
  });
});

describe('divergir: os blocos contra o texto, na linguagem escolhida', () => {
  it('o texto que o programa gera bate com ele', () => {
    expect(divergir('python', pilha(repetir(2, [guardar('x', 1)])), 'for _ in range(2):\n    x = 1\n').ok).toBe(
      true,
    );
  });

  it('e o mesmo programa escrito à maneira de outra linguagem não bate', () => {
    const programa = pilha(guardar('total', 5), log({ ref: 'total' }));
    expect(divergir('java', programa, 'int total = 5;\nlog(total);\n').ok).toBe(true);
    expect(divergir('java', programa, 'total = 5\nlog(total)\n').ok).toBe(false);
  });

  it('a divergência diz a linha e as duas versões', () => {
    const programa = pilha(guardar('total', 5), log({ ref: 'total' }));
    const r = divergir('java', programa, 'int total = 5;\nlog(total)\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias[0]!.linha).toBe(2);
    expect(r.divergencias[0]!.esperado).toBe('log(total);');
    expect(r.divergencias[0]!.obtido).toBe('log(total)');
  });
});
