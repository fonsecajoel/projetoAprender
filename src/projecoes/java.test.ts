import { describe, expect, it } from 'vitest';
import { java } from './java';
import { python } from './python';
import { POLITICAS, interpretar } from '../nucleo/semantica';
import type { EventoLido } from '../nucleo/semantica';
import { val } from '../nucleo/tipos';
import type { Tipo, Valor } from '../nucleo/tipos';
import { dizer, guardar, guardarTexto, log, pilha, repetir } from '../nucleo/testes/dados';
import { linhasDe } from './emissor';

/** O que `emit` aceita. `ReturnType<typeof java.emit>` seria o `Gerado` que ele
 *  devolve — e o que se quer escrever aqui é o bloco que se lhe dá. */
type Programa = Parameters<typeof java.emit>[0];

const AMOSTRA = { porque: 'aqui', remedio: 'aqui' } as const;

function v(tipo: Tipo, valor: unknown, passo = 1): Valor {
  return val(tipo, valor, AMOSTRA, { bloco: 'texto', ranhura: 0, passo });
}

function eventoDe(texto: string, i = 0): EventoLido {
  const ev = java.ler(texto).eventos[i];
  if (ev === undefined) throw new Error(`a linha "${texto}" não produziu evento ${i}`);
  return ev;
}

describe('emit: o mesmo bloco, outra linguagem', () => {
  it('o mesmo programa dá texto diferente nas duas projeções', () => {
    // A prova de que a costura é real e não um rótulo: um `BlocoLeigo`, dois
    // textos, e a diferença entre eles não está em nenhum `if` — está na
    // projeção, que é a única camada que conhece sintaxe.
    const programa = pilha(guardar('total', 5), log({ ref: 'total' }));
    expect(python.emit(programa).texto).toBe('total = 5\nlog(total)\n');
    expect(java.emit(programa).texto).toBe('int total = 5;\nlog(total);\n');
  });

  it('guardar número escreve o tipo à mão', () => {
    // Em Java o tipo escreve-se antes do nome, sempre. É a linha inteira da
    // lição: o mesmo bloco que em Python dá `total = 5` dá aqui `int total = 5;`.
    expect(java.emit(pilha(guardar('total', 5))).texto).toBe('int total = 5;\n');
  });

  it('o tipo escrito depende do valor, e não só do genre', () => {
    // `int` não aceita casas decimais e `double` aceita. Um `Record<Tipo, string>`
    // — um nome por tipo — escreveria `int` para o 1.5 e produziria Java que
    // não compila. O `Tipo` deste produto só tem um `número`, e é a projeção
    // que sabe que em Java esse número tem duas palavras.
    expect(java.emit(pilha(guardar('total', 1.5))).texto).toBe('double total = 1.5;\n');
    expect(java.emit(pilha(guardarTexto('total', 5))).texto).toBe('String total = "5";\n');
    expect(java.emit(pilha(guardar('pronto', true))).texto).toBe('boolean pronto = true;\n');
  });

  it('um guardar de outra variável escreve var, e diz porquê', () => {
    // O tipo de `contagem` só existe quando o programa corre, e um `int` escrito
    // aqui seria uma adivinhação: se `contagem` for um texto, `int total =
    // contagem;` não compila. `var` existe em Java, deixa o compilador
    // descobrir, e por isso é a única palavra honesta para este caso — que a
    // anotação tem de explicar, porque a palavra sozinha ensina o contrário da
    // lição.
    const g = java.emit(pilha(guardar('total', { ref: 'contagem' })));
    expect(g.texto).toBe('var total = contagem;\n');
    expect(g.anotacoes[0]!.porque).toContain('var');
  });

  it('dizer é o System.out.println, e aceita qualquer tipo', () => {
    expect(java.emit(pilha(dizer({ txt: 'olá' }))).texto).toBe('System.out.println("olá");\n');
    expect(java.emit(pilha(dizer(5))).texto).toBe('System.out.println(5);\n');
    expect(java.emit(pilha(dizer({ ref: 'total' }))).texto).toBe('System.out.println(total);\n');
  });

  it('fuga a barra e a linha nova, porque uma linha nova fecha a string', () => {
    // `System.out.println("a` + linha nova + `b");` é uma string por terminar.
    // Verificado: é a mesma armadilha do Python, e a correção é a mesma.
    expect(java.emit(pilha(dizer({ txt: 'a\nb' }))).texto).toBe('System.out.println("a\\nb");\n');
    expect(java.emit(pilha(dizer({ txt: 'diz "olá"' }))).texto)
      .toBe('System.out.println("diz \\"olá\\"");\n');
    // A barra de fugar primeiro, sempre: `a\nb` com barra sai `a\\nb`, que o
    // Java lê como barra seguida de n.
    expect(java.emit(pilha(dizer({ txt: 'a\\nb' }))).texto)
      .toBe('System.out.println("a\\\\nb");\n');
  });

  it('repetir escreve o for clássico, e a chaveta fecha depois do corpo', () => {
    // A ordem das linhas é o que decide se o Java é válido. A primeira versão
    // desta projeção empurrava o `}` para antes do corpo — abria, fechava, e o
    // corpo ficava escrito lá fora.
    expect(java.emit(pilha(repetir(3, [guardar('x', 1)]))).texto)
      .toBe('for (int i = 0; i < 3; i++) {\n    int x = 1;\n}\n');
  });

  it('dois laços aninhados não podem usar o mesmo nome de contador', () => {
    // O nome do contador não pode ser um contador de módulo: com dois laços
    // aninhados, o mesmo nome é uma variável repetida em Java.
    expect(java.emit(pilha(repetir(2, [repetir(2, [guardar('x', 1)])]))).texto)
      .toBe('for (int i = 0; i < 2; i++) {\n    for (int j = 0; j < 2; j++) {\n        int x = 1;\n    }\n}\n');
  });

  it('dois laços irmãos podem usar o mesmo nome, e o texto lê-se melhor', () => {
    expect(java.emit(pilha(repetir(2, [guardar('x', 1)]), repetir(2, [guardar('y', 2)]))).texto)
      .toBe(
        'for (int i = 0; i < 2; i++) {\n    int x = 1;\n}\n' +
          'for (int i = 0; i < 2; i++) {\n    int y = 2;\n}\n',
      );
  });

  it('e duas emissões não se baralham entre si', () => {
    // Um contador de módulo seria reposto no início de cada `emit` e por isso
    // pareceria funcionar — até dois `emit` intercalados, o que um ecrã React
    // faz sem querer. O `Set` de nomes é por emissão.
    const primeiro = java.emit(pilha(repetir(2, [repetir(2, [guardar('x', 1)])]))).texto;
    const meio = java.emit(pilha(repetir(9, [guardar('y', 1)]))).texto;
    const segundo = java.emit(pilha(repetir(2, [repetir(2, [guardar('x', 1)])]))).texto;
    expect(meio).toContain('int i = 0; i < 9;');
    expect(segundo).toBe(primeiro);
  });

  it('um laço sem corpo fecha a chaveta na mesma, porque em Java isso é legal', () => {
    // Um bloco vazio entre chavetas é Java válido. Em Python o `for` sem corpo
    // não é — e é a diferença que a anotação tem de fazer, se é que a faz.
    expect(java.emit(pilha(repetir(3, []))).texto)
      .toBe('for (int i = 0; i < 3; i++) {\n}\n');
  });

  it('toda linha gerada tem anotação, com o número de linha certo', () => {
    // Quatro linhas: o `for`, os dois blocos do corpo, e o `}`. A primeira
    // versão deste teste dizia cinco, e a contagem certa está a dois testes
    // acima — um número escrito sem contar passa porque ninguém o confere.
    const g = java.emit(pilha(repetir(2, [guardar('x', 1), log({ ref: 'x' })])));
    expect(linhasDe(g.texto)).toEqual([
      'for (int i = 0; i < 2; i++) {',
      '    int x = 1;',
      '    log(x);',
      '}',
    ]);
    expect(g.anotacoes).toHaveLength(4);
    for (let i = 0; i < g.anotacoes.length; i += 1) {
      expect(g.anotacoes[i]!.linha).toBe(i + 1);
      expect(g.anotacoes[i]!.porque.length).toBeGreaterThan(0);
    }
  });

  it('a anotação do corpo conta a partir do for, e a da chaveta aponta para a chaveta', () => {
    const g = java.emit(pilha(repetir(2, [guardar('x', 1), log({ ref: 'x' })])));
    const porLinha = new Map(g.anotacoes.map((a) => [a.linha, a.porque]));
    expect(porLinha.get(1)).toContain('2');
    expect(porLinha.get(2)).toContain('Guarda x');
    expect(porLinha.get(3)).toContain('log');
    expect(porLinha.get(4)).toContain('chaveta');
  });

  it('o que o emit escreve, o ler lê — e com o mesmo tipo', () => {
    // A promessa da T4 escrita de forma a não depender de alguém a lembrar
    // dela: cada linha que o `emit` produz, o `ler` tem de devolver com o tipo
    // que a linha declara. Se os dois lados divergirem, o painel de texto passa
    // a discordar do ecrã de blocos, e o aluno vê as duas coisas ao mesmo
    // tempo sem saber qual é a errada.
    const casos: Array<[Programa, Tipo]> = [
      [pilha(guardar('total', 5)), 'número'],
      [pilha(guardar('total', 1.5)), 'número'],
      [pilha(guardarTexto('total', 5)), 'texto'],
      [pilha(guardar('pronto', false)), 'lógico'],
      [pilha(repetir(3, [guardar('x', 1)])), 'número'],
    ];
    for (const [programa, tipo] of casos) {
      const linhas = linhasDe(java.emit(programa).texto);
      for (const linha of linhas) {
        if (linha.trim() === '}' || linha.startsWith('for')) continue;
        const r = java.ler(`${linha}\n`);
        expect(r.erros, linha).toEqual([]);
        const ev = r.eventos[0]!;
        if (ev.tipo === 'atribuir') {
          expect(ev.tipoValor, linha).toBe(tipo);
          expect(ev.restricao, linha).toBe(tipo);
        }
      }
    }
  });

  it('nenhuma anotação menciona outra linguagem', () => {
    const g = java.emit(pilha(guardar('total', 5), log({ ref: 'total' })));
    expect(g.anotacoes.length).toBeGreaterThan(0);
    for (const a of g.anotacoes) {
      expect(a.porque).not.toMatch(/Python|Go|TypeScript|SQL|JavaScript/);
    }
  });

  it('nenhuma anotação diz que o programa vai correr bem, porque em Java não se sabe', () => {
    const g = java.emit(pilha(guardar('total', 5), log({ ref: 'total' })));
    for (const a of g.anotacoes) {
      expect(a.porque).not.toMatch(/vai correr|funciona|corre bem|não dá erro/);
    }
  });

  it('um bloco desconhecido gera um comentário, nunca código inválido', () => {
    expect(java.emit({ type: 'condicao', inputs: { VALOR: { valor: 1 } } }).texto)
      .toBe('// bloco do v2: condicao\n');
  });

  it('programa vazio gera string vazia e zero anotações', () => {
    const g = java.emit(null);
    expect(g.texto).toBe('');
    expect(g.anotacoes).toEqual([]);
  });
});

describe('ler: o que a Java aceita', () => {
  it('atribuição com tipo', () => {
    const r = java.ler('int total = 5;\n');
    expect(r.erros).toEqual([]);
    expect(r.eventos).toHaveLength(1);
  });

  it('a atribuição declara a restrição, e é isso que faz a recusa ao parse', () => {
    // `int total = "olá";` é recusado em Java antes de o programa correr, e a
    // recusa vem do `restricao` que este evento traz. A mesma linha em Python
    // não tem onde declarar nada, e por isso não pode ser recusada.
    const ev = eventoDe('int total = 5;\n');
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('número');
    expect(ev.restricao).toBe('número');
  });

  it('int e double são ambos número, e ambos declaram número', () => {
    for (const linha of ['int total = 5;', 'double total = 5;', 'double total = 1.5;']) {
      const ev = eventoDe(`${linha}\n`);
      if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
      expect(ev.tipoValor, linha).toBe('número');
      expect(ev.restricao, linha).toBe('número');
    }
  });

  it('String declarado', () => {
    const ev = eventoDe('String nome = "olá";\n');
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('texto');
    expect(ev.restricao).toBe('texto');
  });

  it('boolean declarado', () => {
    const ev = eventoDe('boolean pronto = true;\n');
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('lógico');
  });

  it('var não declara tipo a ninguém, e a atribuição não impõe um', () => {
    // `var` é o único sítio de Java onde o tipo não se escreve, e por isso é o
    // único onde a atribuição não impõe um tipo. Tratar o `var` como se
    // declarasse `int` faria o produto recusar `var total = "olá";`, que é Java
    // válido.
    const ev = eventoDe('var total = "olá";\n');
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('texto');
    expect(ev.restricao).toBeUndefined();
  });

  it('System.out.println conta como uso, e sem tipo declarado', () => {
    // O `println` é sobrecarregado: em Java aceita qualquer tipo. Um `usar` com
    // `tipoValor: 'texto'` faria o núcleo dizer "total guarda número, e este
    // sítio precisa de texto" — um erro que o Java não tem.
    const r = java.ler('int total = 5;\nSystem.out.println(total);\n');
    expect(r.erros).toEqual([]);
    const usar = r.eventos[1]!;
    if (usar.tipo !== 'usar') throw new Error('esperava usar');
    expect(usar.nome).toBe('total');
    expect(usar.tipoValor).toBeUndefined();
  });

  it('o for clássico conta as voltas', () => {
    const r = java.ler('for (int i = 0; i < 3; i++) {\n}\n');
    expect(r.erros).toEqual([]);
    const ciclo = r.eventos.find((e) => e.tipo === 'ciclo');
    if (!ciclo || ciclo.tipo !== 'ciclo') throw new Error('esperava um ciclo');
    expect(ciclo.iteracoes).toBe(3);
  });

  it('linhas em branco são ignoradas', () => {
    expect(java.ler('\n\n  \n').erros).toEqual([]);
  });

  it('as chavetas e os comentários não são erro', () => {
    expect(java.ler('// um comentário\n{\n}\n').erros).toEqual([]);
  });

  it('o texto lido é o texto que foi escrito', () => {
    const ev = eventoDe('String nome = "a\\nb";\n');
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.valor.valor).toBe('a\nb');
  });
});

describe('ler: o que a Java recusa, e o que diz', () => {
  it('falta o ponto-e-vírgula é dito como falta de ponto-e-vírgula', () => {
    // O ponto de revisão da spec: uma falta de `;` em Java tem de ser
    // reportada como falta de `;`, e não como "função desconhecida". A regra é
    // simétrica à do Python e faz a mesma coisa: só se culpa o `;` depois de a
    // linha ter falhado por outra razão, e porque sem ele a linha lê bem.
    const r = java.ler('int total = 5\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('ponto-e-vírgula');
    expect(r.erros[0]!.porque).not.toMatch(/função|funcao|não conhece/);
    expect(r.erros[0]!.remedio).toContain(';');
  });

  it('falta o ponto-e-vírgula numa atribuição com tipo', () => {
    expect(java.ler('String nome = "olá"\n').erros[0]!.porque).toContain('ponto-e-vírgula');
  });

  it('e a falta de ponto-e-vírgula não é inventada onde o ponto-e-vírgula está dentro de um texto', () => {
    expect(java.ler('String nome = "a;b";\n').erros).toEqual([]);
  });

  it('falta o tipo é dito como falta de tipo, e o mesmo erro não se repete', () => {
    const r = java.ler('total = 5;\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('tipo');
    expect(r.erros[0]!.porque).not.toContain('ponto-e-vírgula');
    expect(r.erros[0]!.remedio).toContain('int');
  });

  it('quando faltam as duas coisas, o erro diz as duas', () => {
    // Dizer "falta o tipo" a quem também falta o `;` é meio mentira, e a
    // pessoa vai corrigir o tipo, correr, e receber outro erro sobre a mesma
    // linha. Um erro, com as duas partes visíveis, resolve a linha de uma vez.
    const r = java.ler('total = 5\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('tipo');
    expect(r.erros[0]!.porque).toContain('ponto-e-vírgula');
  });

  it('a mensagem do tipo não afirma que um nome sem tipo é sempre errado', () => {
    // Numa linha já declarada o tipo não se repete: `int total; total = 5;` é
    // Java válido. Dizer que esta linha nunca é válida ensina uma coisa falsa
    // sobre a linguagem, e a pessoa encontra a linha mais tarde.
    expect(java.ler('total = 5;\n').erros[0]!.porque).toMatch(/declarado|declara/);
  });

  it('log é recusado antes de correr, e a mensagem diz que é o compilador que recusa', () => {
    // A linha mais importante da lição de Java. A mesma linha em Python só
    // falha quando o código corre, e a diferença entre as duas frases é a
    // costura a fazer-se.
    const r = java.ler('log(total);\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toMatch(/compilador|compilar|correr/);
  });

  it('e o Python dá a mesma linha um erro que só aparece a correr', () => {
    const emPython = python.ler('log(total);\n');
    expect(emPython.erros).toHaveLength(1);
    expect(emPython.erros[0]!.porque).toContain('corre');
  });

  it('texto de outra linguagem é recusado com o motivo, não com "não percebo"', () => {
    const r = java.ler("print('olá')\n");
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque.length).toBeGreaterThan(10);
    expect(r.erros[0]!.remedio.length).toBeGreaterThan(0);
  });

  it('e a mesma linha é recusada pelas duas linguagens, por motivos diferentes', () => {
    // A mesma pessoa escreve `total = 5;` a achar que é Python. Em Python o
    // problema é o `;`; em Java é o tipo. A lição não é "isto está errado" — é
    // que o que falta depende da linguagem, e é por isso que a sintaxe se
    // escreve à mão.
    expect(python.ler('total = 5;\n').erros[0]!.porque).toContain('ponto-e-vírgula');
    expect(java.ler('total = 5;\n').erros[0]!.porque).toContain('tipo');
  });

  it('e o inverso: uma linha de Java é recusada em Python', () => {
    expect(python.ler('int total = 5;\n').erros).toHaveLength(1);
  });

  it('o erro tem porque e remedio, nunca um código nu', () => {
    const r = java.ler('total = 5;\n');
    expect(r.erros[0]!.porque.length).toBeGreaterThan(10);
    expect(r.erros[0]!.remedio.length).toBeGreaterThan(0);
  });

  it('o passo do erro é a linha certa', () => {
    const r = java.ler('int total = 5;\n\n\ntotal = 5;\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.passo).toBe(4);
  });
});

describe('a costura: a mesma pergunta, as duas políticas', () => {
  it('o mesmo programa dá Recusa em Java e silêncio em Python', () => {
    // A diferença vem da `Policy` e de mais lado nenhum: os mesmos eventos
    // entram nos dois núcleos. Se este teste precisasse de um `if` sobre a
    // linguagem, era porque a costura tinha pasado para o meio.
    const eventos: EventoLido[] = [
      { passo: 1, tipo: 'atribuir', nome: 'total', tipoValor: 'número', valor: v('número', 5) },
      {
        passo: 1,
        tipo: 'atribuir',
        nome: 'total',
        tipoValor: 'texto',
        valor: v('texto', 'olá'),
        restricao: 'número',
      },
    ];
    const origem = (passo: number) => ({ bloco: 'texto', ranhura: 0, passo });

    const emJava = interpretar(eventos, POLITICAS.java, origem);
    const emPython = interpretar(eventos, POLITICAS.python, origem);

    expect(emJava).toHaveLength(1);
    expect(emJava[0]!.classe).toBe('Recusa');
    expect(emPython).toEqual([]);
  });

  it('e a diferença é o momento, não a classe', () => {
    // A `Policy` tem duas decisões separadas: `recusaNoTipo` diz *se* há
    // recusa, `quando` diz *como se fala* dela. Um produto que metesse a
    // segunda dentro da primeira diria "antes de correr" a uma linguagem que
    // recusa a meio da execução.
    const eventos: EventoLido[] = [
      {
        passo: 1,
        tipo: 'atribuir',
        nome: 'total',
        tipoValor: 'texto',
        valor: v('texto', 'olá'),
        restricao: 'número',
      },
    ];
    const origem = (passo: number) => ({ bloco: 'texto', ranhura: 0, passo });
    const antes = interpretar(eventos, POLITICAS.java, origem);
    const noDado = interpretar(eventos, POLITICAS.sql, origem);
    expect(antes[0]!.classe).toBe('Recusa');
    expect(noDado[0]!.classe).toBe('Recusa');
    expect((noDado[0] as { remedio: string }).remedio).toContain('dado');
    expect((antes[0] as { remedio: string }).remedio).not.toContain('dado');
  });

  it('o mesmo nome usado antes de existir é o mesmo erro nas duas', () => {
    // A revisão da spec pede este teste pelo nome da variável e pelo passo. E é
    // igual nas duas porque um nome que não existe não é um problema de tipo:
    // é um nome, e o núcleo é quem sabe os nomes.
    const eventos: EventoLido[] = [{ passo: 3, tipo: 'usar', nome: 'total' }];
    for (const linguagem of ['python', 'java'] as const) {
      const erros = interpretar(eventos, POLITICAS[linguagem], (passo) => ({
        bloco: 'texto',
        ranhura: 0,
        passo,
      }));
      expect(erros, linguagem).toHaveLength(1);
      expect(erros[0]!.porque, linguagem).toContain('total');
      expect((erros[0] as { passo: number }).passo, linguagem).toBe(3);
    }
  });
});
