import { describe, expect, it } from 'vitest';
import { avaliador, pilhaDe, regraDeLinhas } from './avaliador';
import { MAX_ITERACOES, RANGE_INTEIROS } from './tipos';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Avaliador } from './avaliador';
import { identificador } from './blocos';
import { dizer, guardar, guardarTexto, log, pilha, repetir } from './testes/dados';

describe('identificador', () => {
  it('mantém um nome simples', () => {
    expect(identificador('total')).toBe('total');
  });
  it('remove acentos', () => {
    expect(identificador('música')).toBe('musica');
  });
  it('prefixa nomes que começam por dígito', () => {
    expect(identificador('1total')).toBe('v_1total');
  });
  it('sufixa palavras reservadas de Python', () => {
    expect(identificador('class')).toBe('class_');
  });
  it('substitui caracteres inválidos', () => {
    expect(identificador('meu-total')).toBe('meu_total');
  });
  it('devolve v_ para nome vazio', () => {
    expect(identificador('')).toBe('v_');
  });
});

describe('pilhaDe', () => {
  it('devolve lista vazia para null', () => {
    expect(pilhaDe(null)).toEqual([]);
  });
  it('desembrulha um bloco único', () => {
    expect(pilhaDe(guardar('total', 1))).toHaveLength(1);
  });
  it('desembrulha uma pilha', () => {
    expect(pilhaDe(pilha(guardar('total', 1), log(1)))).toHaveLength(2);
  });
});

describe('guardar', () => {
  it('guarda um número e deixa-o disponível pelo nome', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: 5 }, 1);
    const v = a.avaliar('dador_num', { VALOR: { ref: 'total' } }, 1);
    expect(v.tipo).toBe('número');
    expect(v.valor).toBe(5);
  });

  it('guardar texto guarda o texto, e não dá erro nenhum', () => {
    // Este nome já foi escrito duas vezes a mentir sobre o que o motor
    // fazia. Na primeira versão dizia «sem erro» num ficheiro em que o
    // teste seguinte provava que havia uma `Recusa`; na segunda dizia que
    // guardar texto «já é um erro». Nas duas o `guardar` recusava texto — e
    // a primeira lição, que diz «guarda um número com o nome total. Depois
    // guarda um texto com o nome nome», era impossível de fazer. Ninguém a
    // completava.
    //
    // A recusa vinha do avaliador de blocos, e um avaliador de blocos não
    // sabe em que linguagem vive: quem recusa é a linguagem (§6.4), e o
    // Python não recusa nada disto. O que rebenta, e rebenta mais tarde, é
    // o `log` de uma variável que nunca foi guardada — que é a história
    // que a lição conta, e o que a §10 diz do Python.
    const a = avaliador();
    const v = a.avaliar('guardar', { nome: 'nome', VALOR: { txt: 'olá' } }, 1);
    expect(v.tipo).toBe('texto');
    expect(v.valor).toBe('olá');
    expect(v.recusado).toBe(false);
    expect(a.trace.erros.length).toBe(0);
  });

  it('o texto guardado volta pelo nome, e continua a ser texto', () => {
    // A ida e a volta é o que interessa: uma variável que se lembra do que
    // ficou lá dentro, e de que tipo esse conteúdo é. Sem a volta, o teste
    // acima provava só que o `guardar` não se queixou — e não que o valor
    // ficou guardado.
    const a = avaliador();
    a.avaliar('guardar', { nome: 'nome', VALOR: { txt: 'olá' } }, 1);
    const v = a.avaliar('dador_num', { VALOR: { ref: 'nome' } }, 1);
    expect(v.tipo).toBe('texto');
    expect(v.valor).toBe('olá');
    expect(a.trace.erros.length).toBe(0);
  });
  it('a única recusa que o motor ainda faz é um número grande demais', () => {
    // Convém dizer isto em voz alta, porque é uma afirmação forte e é o
    // estado real do motor depois desta mudança: nos blocos, **nenhum** tipo
    // é recusado. Quem recusa é a linguagem (§6.4) — o Java escreve
    // `int total = 'olá';` e recusa, e o Python escreve `total = 'olá';` e
    // não recusa, e é essa diferença que o produto existe para mostrar. Um
    // avaliador de blocos que recusasse tipos estaria a decidir por conta
    // própria o que cada linguagem permite, e a lição passava a mentir
    // sobre as seis.
    //
    // A recusa que fica é a do tamanho: um número acima de `RANGE_INTEIROS`
    // não existe em nenhum número das linguagens, e recusá-lo é dizer a
    // verdade sobre todas.
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: 1_000_000 }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('Recusa');
    expect(e && e.classe === 'Recusa' && e.esperado).toBe('número');
    expect(e && e.remedio.length).toBeGreaterThan(0);
  });

  it('recusa guardar um número fora de RANGE_INTEIROS', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: 1_000_000 }, 1);
    expect(a.trace.erros[0]?.classe).toBe('Recusa');
  });

  it('nome de variável duplicado substitui e explica — nunca cria fantasma', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: 1 }, 1);
    a.avaliar('guardar', { nome: 'total', VALOR: 2 }, 1);
    const v = a.avaliar('dador_num', { VALOR: { ref: 'total' } }, 1);
    expect(v.valor).toBe(2);
    const avisos = a.trace.valores.filter((x) => x.explicacao.porque.includes('substitui'));
    expect(avisos.length).toBe(1);
  });

  it('guardar sem nome é FalhaRuntime com porque', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: '', VALOR: 1 }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e && e.porque.length).toBeGreaterThan(0);
  });

  it('guardar sem valor é FalhaRuntime com porque', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total' }, 1);
    expect(a.trace.erros[0]?.classe).toBe('FalhaRuntime');
  });

  it('uma variável só existe na linha em que foi guardada', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: 5 }, 1);
    a.avaliar('dador_num', { VALOR: { ref: 'total' } }, 2);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e && e.porque).toContain('total');
  });
});

describe('a palavra do robô', () => {
  it('guardar guarda 5 como número, e ninguém se queixa', () => {
    const a = avaliador();
    a.executar(pilha(guardar('total', 5)));
    const v = a.avaliar('dador_num', { VALOR: { ref: 'total' } }, 1);
    expect(v.tipo).toBe('número');
    expect(v.valor).toBe(5);
    expect(a.trace.erros.length).toBe(0);
  });

  it('guardarTexto guarda o mesmo 5 como palavra, e lê-se de volta uma palavra', () => {
    // `guardarTexto` embrulha em `{txt: '5'}`. O `5` que a pessoa escreveu e
    // uma palavra com dois algarismos dentro. Uma variável que guarda uma
    // palavra guarda uma palavra, e o que muda quando se lê de volta é
    // exatamente o que a pessoa escreveu: o valor, não o tipo de quem o
    // escreveu. Este é o parágrafo do ficheiro de leitura que diz que em
    // Python `5` e `'5'` são coisas diferentes, e é o que a sonda
    // `texto-que-nao-e-numero` acaba por mostrar.
    const a = avaliador();
    a.executar(pilha(guardarTexto('total', 5)));
    const guardado = a.trace.valores.find((v) => v.origem.bloco === 'guardar');
    expect(guardado?.tipo).toBe('texto');
    expect(guardado?.valor).toBe('5');
    expect(a.trace.erros.length).toBe(0);
  });
});

describe('repetir', () => {
  it('repete o corpo o número de vezes pedido', () => {
    const a = avaliador();
    a.executar(pilha(repetir(3, [guardar('x', 1)])));
    const guardou = a.trace.valores.filter((v) => v.origem.bloco === 'guardar');
    expect(guardou.length).toBe(3);
  });

  it('aceita zero repetições e não executa o corpo', () => {
    const a = avaliador();
    a.executar(pilha(repetir(0, [guardar('x', 1)])));
    expect(a.trace.valores.filter((v) => v.origem.bloco === 'guardar').length).toBe(0);
    expect(a.trace.erros.length).toBe(0);
  });

  it('um número de repetições acima do limite é FalhaRuntime com porque', () => {
    const a = avaliador();
    a.executar(pilha(repetir(MAX_ITERACOES + 1, [guardar('x', 1)])));
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e && e.porque).toContain(String(MAX_ITERACOES));
  });

  it('um número de repetições não inteiro é FalhaRuntime com porque', () => {
    const a = avaliador();
    a.executar(pilha(repetir(1.5, [guardar('x', 1)])));
    expect(a.trace.erros[0]?.classe).toBe('FalhaRuntime');
  });

  it('não entra no ciclo quando o número de repetições é inválido', () => {
    const a = avaliador();
    a.executar(pilha(repetir(MAX_ITERACOES + 1, [guardar('x', 1)])));
    expect(a.trace.valores.filter((v) => v.origem.bloco === 'guardar').length).toBe(0);
  });

  it('um número de repetições grande demais dá o erro do laço, não o do valor', () => {
    // Dois limites, dois fatos. `RANGE_INTEIROS` diz que nenhum número
    // acima de 1000 existe; `MAX_ITERACOES` diz que um laço não repete mais
    // de 10000 vezes. Se o `repetir` decidisse pelo `valorDe`, quem escrevesse
    // `repetir(10001)` lia "este número é grande demais" e nunca soube que o
    // problema era o número de repetições. O teste abaixo é a razão de o
    // `repetir` olhar para o valor cru antes de o converter.
    const a = avaliador();
    a.executar(pilha(repetir(MAX_ITERACOES + 1, [guardar('x', 1)])));
    expect(a.trace.erros.length).toBe(1);
    expect(a.trace.erros[0]?.classe).toBe('FalhaRuntime');
    expect(a.trace.erros[0]?.porque).toContain('repetições');
  });

  it('repetir(1000) é aceite: está no alcance do número e dentro do laço', () => {
    const a = avaliador();
    a.executar(pilha(repetir(RANGE_INTEIROS, [guardar('x', 1)])));
    expect(a.trace.erros.length).toBe(0);
    expect(a.trace.valores.filter((v) => v.origem.bloco === 'guardar').length).toBe(
      RANGE_INTEIROS,
    );
  });

  it('um número de repetições negativo é FalhaRuntime', () => {
    const a = avaliador();
    a.executar(pilha(repetir(-1, [guardar('x', 1)])));
    expect(a.trace.erros[0]?.classe).toBe('FalhaRuntime');
  });

  it('repetir aninhado executa o corpo interno vezes × vezes', () => {
    const a = avaliador();
    a.executar(pilha(repetir(2, [repetir(3, [guardar('x', 1)])])));
    expect(a.trace.valores.filter((v) => v.origem.bloco === 'guardar').length).toBe(6);
  });
});

describe('dizer', () => {
  it('aceita texto', () => {
    const a = avaliador();
    const v = a.avaliar('dizer', { VALOR: { txt: 'olá' } }, 1);
    expect(v.tipo).toBe('texto');
    expect(a.trace.erros.length).toBe(0);
  });

  it('aceita um número, porque o print do Python também aceita', () => {
    // A recusa antiga dizia «O que dizes tem de ser uma palavra», e isso é
    // falso: `print(5)` é legal em Python. A primeira lição conta
    // precisamente a história de um `print` a imprimir um número — o
    // ficheiro de leitura tem `print(total)` na sétima linha, e `total`
    // vale 5 na segunda. Um motor que recusa aquele gesto ensina que o
    // Python é uma linguagem que não o deixa.
    const a = avaliador();
    const v = a.avaliar('dizer', { VALOR: 5 }, 1);
    expect(v.tipo).toBe('número');
    expect(v.valor).toBe(5);
    expect(a.trace.erros.length).toBe(0);
  });

  it('um valor que já falhou não ganha uma segunda mensagem pelo caminho', () => {
    // Este teste já existia, e o que afirmava era o contrário do que devia:
    // esperava **dois** erros e dizia que dois era a resposta certa, com um
    // comentário a explicar que lia o último para não passar por engano.
    // Não era engano: era a especificação do defeito.
    //
    // Um `{ref}` que ainda não tem valor já diz o seu erro dentro de
    // `valorDe`, e o `dizer` acrescentava uma `Recusa` por cima. Um gesto, um
    // erro, e no ecrã duas frases ao mesmo tempo: «a variável "fantasma" não
    // tem valor» e «este sítio só aceita texto». Quem lê as duas aprende que
    // são dois problemas, e são um — e a segunda frase era falsa, porque o
    // que chegou não era um número nem uma palavra: era nada.
    const a = avaliador();
    a.avaliar('dizer', { VALOR: { ref: 'fantasma' } }, 1);
    expect(a.trace.erros.length).toBe(1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e?.porque).toContain('fantasma');
  });


describe('valores de entrada', () => {
  it('{txt} é texto', () => {
    expect(avaliador().avaliar('dador_num', { VALOR: { txt: 'x' } }, 1).tipo).toBe('texto');
  });
  it('uma palavra escrita a direito é um literal de texto', () => {
    // É assim que a lição escreve um texto: `valor: olá`, e não
    // `valor: {txt: olá}`. A projeção já tratava a palavra solta como
    // texto — emitia `total = 'olá'` — e o avaliador não: o mesmo programa
    // recebia `Observacao` quando vinha do texto e `Recusa` quando vinha
    // dos blocos. Duas implementações da mesma semântica a discordar uma da
    // outra é a forma mais cara de um produto ter sondas que não podem
    // estar erradas, e foi o que a Task 12 encontrou ao correr a lição da
    // Task 8 pelos blocos.
    const a = avaliador();
    const v = a.avaliar('dador_num', { VALOR: 'olá' }, 1);
    expect(v.tipo).toBe('texto');
    expect(v.valor).toBe('olá');
    expect(a.trace.erros.length).toBe(0);
  });

    expect(avaliador().avaliar('dador_num', { VALOR: 3 }, 1).tipo).toBe('número');
  });
  it('um booleano é lógico', () => {
    expect(avaliador().avaliar('dador_num', { VALOR: true }, 1).tipo).toBe('lógico');
  });
  it('{bloco} é avaliado recursivamente', () => {
    const a = avaliador();
    const v = a.avaliar('dador_num', { VALOR: { bloco: { type: 'dador_num', inputs: { VALOR: { valor: 9 } } } } }, 1);
    expect(v.valor).toBe(9);
  });
  it('uma referência a variável inexistente é FalhaRuntime com porque', () => {
    const a = avaliador();
    a.avaliar('dador_num', { VALOR: { ref: 'fantasma' } }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e && e.porque).toContain('fantasma');
  });
  it('uma forma que o motor não sabe ler é FalhaRuntime, e diz que não sabe', () => {
    // Não é um tipo errado: é uma forma que nenhuma das quatro formas de
    // valor resolve. A versão antiga dizia «Este sítio só aceita número.
    // Recebeste número» — uma frase que se nega a si mesma, e uma frase que
    // se nega a si mesma não ensina o tipo de lado nenhum. O produto inteiro
    // existe para trocar adivinhação por razão, e uma razão que se nega a si
    // mesma é a pior das duas.
    const a = avaliador();
    a.avaliar('dador_num', { VALOR: { qqq: 1 } }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e && e.classe === 'FalhaRuntime' && e.porque.length).toBeGreaterThan(0);
    expect(a.trace.erros.length).toBe(1);
  });
});

describe('blocos não implementados', () => {
  it('um bloco desconhecido é FalhaRuntime com porque e diz o que fazer', () => {
    const a = avaliador();
    a.avaliar('condicao', { VALOR: 1 }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e && e.porque).toContain('condicao');
    expect(e && e.porque).toContain('lição 1');
  });
});

describe('executar', () => {
  it('uma pilha corre os blocos por ordem e para no primeiro erro', () => {
    // O bloco que falha passou a ser um `log` de uma variável que nunca foi
    // guardada. Era um `dizer` com um número dentro, e deixou de ser quando
    // o `dizer` deixou de recusar números — que é o comportamento certo, e
    // por isso o gatilho deste teste tinha de mudar. Um teste cujo gatilho
    // desapareceu não se apaga: muda de gatilho, ou deixa de provar que a
    // pilha para.
    const a = avaliador();
    a.executar(pilha(guardar('total', 1), log({ ref: 'fantasma' }), log(2)));
    const guardou = a.trace.valores.filter((v) => v.origem.bloco === 'guardar');
    expect(guardou.length).toBe(1);
    expect(a.trace.erros.length).toBe(1);
    expect(a.trace.erros[0]?.origem.bloco).toBe('log');
  });

  it('o bloco depois do erro não corre', () => {
    const a = avaliador();
    a.executar(pilha(guardar('total', 1), log({ ref: 'fantasma' }), guardar('outro', 2)));
    const guardou = a.trace.valores.filter((v) => v.origem.bloco === 'guardar');
    expect(guardou.length).toBe(1);
  });

  it('programa vazio não produz erros nem valores', () => {
    const a = avaliador();
    a.executar(null);
    expect(a.trace.erros.length).toBe(0);
    expect(a.trace.valores.length).toBe(0);
  });

  it('cada bloco de topo é uma linha nova, e as variáveis não atravessam linhas', () => {
    const a = avaliador();
    a.executar(pilha(guardar('total', 5), log({ ref: 'total' })));
    expect(a.trace.erros.length).toBe(1);
  });
});

describe('partilha de Regra', () => {
  it('dois avaliadores com a mesma Regra veem as mesmas linhas', () => {
    // A linha tem de ser escrita por um `executar`, não por um `avaliar`
    // avulso: `inicializa` é o que abre a linha, e é o `avaliar` directo que
    // a deixa por abrir. A versão anterior deste teste escrevia a linha com
    // dois `avaliar` e depois jurava que os dois avaliadores a partilhavam —
    // e passava a testar que a `Regra` não partilha nada.
    const primeiro = avaliador();
    const segundo = avaliador(primeiro.regra);
    primeiro.executar(pilha(guardar('total', 5)));
    const v = segundo.avaliar('dador_num', { VALOR: { ref: 'total' } }, 1);
    expect(v.valor).toBe(5);
  });

  it('atribuir abre uma linha que ninguém inicializou', () => {
    // Atribuir cria; ler o que não foi atribuído falha. Se `define`
    // ignorasse a linha por não existir, `avaliar('guardar', …)` avulso
    // seria um no-op silencioso — e é assim que nasce um teste que passa
    // sem estar a testar nada.
    const r = regraDeLinhas();
    const a = avaliador(r);
    a.avaliar('guardar', { nome: 'total', VALOR: 7 }, 1);
    expect(r.obtém('total', 1)?.valor).toBe(7);
  });

  it('inicializar a mesma linha de novo apaga o que lá estava', () => {
    const r = regraDeLinhas();
    const a = avaliador(r);
    a.avaliar('guardar', { nome: 'total', VALOR: 7 }, 1);
    r.inicializa(1);
    expect(r.existe('total', 1)).toBe(false);
  });
});

describe('o motor não conhece linguagens', () => {
  it('nenhum erro do motor nomeia uma linguagem', () => {
    // A spec §6.4: uma linguagem é a sua sintaxe, e a sintaxe é o que a
    // projeção escreve. O `E`, o `restricao` e o `valor` vivem no núcleo e
    // não podem trazer um nome de linguagem — quem aprende Go não há de ler
    // "Python" numa mensagem sobre um número.
    //
    // Cada caso devolve o avaliador que usou, para que a leitura do `trace`
    // seja feita no mesmo objeto que produziu o erro. Um caso que corre
    // `avaliador()` internamente e devolve `void` obriga a refazer a mesma
    // execução para poder olhar para o resultado — e um teste que repete a
    // execução é um teste que pode passar na segunda vez e falhar na
    // primeira.
    const casos: Array<[string, () => Avaliador]> = [
      ['guardar sem nome', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: '', VALOR: 1 }, 1);
        return a;
      }],
      ['guardar fora de RANGE_INTEIROS', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'total', VALOR: 1_000_000 }, 1);
        return a;
      }],
      ['guardar sem valor', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'total' }, 1);
        return a;
      }],
      ['referência a uma variável que não existe', () => {
        const a = avaliador();
        a.avaliar('dador_num', { VALOR: { ref: 'fantasma' } }, 1);
        return a;
      }],
      ['forma de valor desconhecida', () => {
        const a = avaliador();
        a.avaliar('dador_num', { VALOR: { qqq: 1 } }, 1);
        return a;
      }],
      ['bloco não implementado', () => {
        const a = avaliador();
        a.avaliar('condicao', { VALOR: 1 }, 1);
        return a;
      }],
      ['repetição não inteira', () => {
        const a = avaliador();
        a.executar(pilha(repetir(1.5, [guardar('x', 1)])));
        return a;
      }],
      ['repetição acima do limite', () => {
        const a = avaliador();
        a.executar(pilha(repetir(MAX_ITERACOES + 1, [guardar('x', 1)])));
        return a;
      }],
    ];

    for (const [nome, caso] of casos) {
      const a = caso();
      expect(a.trace.erros.length, nome).toBeGreaterThan(0);
      for (const e of a.trace.erros) {
        const texto = e.porque + '\n' + ('remedio' in e ? e.remedio : '');
        expect(texto, nome).not.toMatch(/Python|Java|Go|TypeScript|JavaScript|SQL/);
      }
    }
  });

  it('todo erro do motor tem porque e remedio não vazios', () => {
    // A regra que a Task 1 fixou para `Recusa`, aplicada agora a todos os
    // sítios onde o motor decide falhar. Um erro sem `remedio` é um erro
    // que obriga o aluno a adivinhar, e o produto inteiro existe para
    // trocar adivinhação por razão.
    //
    // O `expect` do meio não é decoração. Este teste itera uma lista de
    // erros; se o motor deixar de dar erro nenhum, o `for` corre zero vezes
    // e o teste passa a medir o nada. Passou a passar por cima de uma lista
    // vazia até a Task 12 o fazer, e é o mesmo defecto que se viu três
    // vezes nos testes de ecrã.
    const a = avaliador();
    a.avaliar('guardar', { nome: '', VALOR: 1 }, 1);
    a.avaliar('dizer', { VALOR: { ref: 'fantasma' } }, 1);
    a.avaliar('dador_num', { VALOR: { qqq: 1 } }, 1);
    expect(a.trace.erros.length).toBeGreaterThan(0);
    for (const e of a.trace.erros) {
      expect(e.porque.length).toBeGreaterThan(0);
      if ('remedio' in e) expect(e.remedio.length).toBeGreaterThan(0);
    }
  });

  it('nenhum destes gestos inventa um erro', () => {
    // A lista de cima é a lista do que **tem** de dar erro. Esta é a lista
    // do que **não** pode dar, e é tão importante como a outra: um motor
    // que inventa recusas recusa a lição inteira, e o aluno nunca chega ao
    // fim de um passo. Guardar texto, dizer um número e imprimir o que ficou
    // guardado são gestos normais em Python, e nenhum deles pode ser uma
    // recusa — e a palavra escrita a direito é a forma como a lição escreve
    // um texto, que é a forma que a projeção também aceita.
    const gestos: Array<[string, () => Avaliador]> = [
      ['guardar um texto', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'nome', VALOR: { txt: 'olá' } }, 1);
        return a;
      }],
      ['guardar um texto escrito a direito', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'nome', VALOR: 'olá' }, 1);
        return a;
      }],
      ['dizer um número', () => {
        const a = avaliador();
        a.avaliar('dizer', { VALOR: 5 }, 1);
        return a;
      }],
      ['dizer o que ficou guardado', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 't', VALOR: 5 }, 1);
        a.avaliar('dizer', { VALOR: { ref: 't' } }, 1);
        return a;
      }],
      ['três voltas a guardar e a dizer, o programa da ficha em blocos', () => {
        // Um `guardar` e um `dizer` que não se olham um para o outro, porque
        // cada bloco é a sua linha: o âmbito do motor é por bloco, não por
        // pilha (a Task 2 fixou isso, e a ficha de leitura é lida e não
        // executada). Este caso existe para cubrir o laço, a atribuição e o
        // `dizer` ao mesmo tempo — e para que uma mudança futura no âmbito
        // apareça aqui e não na lição.
        const a = avaliador();
        a.executar(repetir(3, [guardar('total', 5), dizer(5)]));
        return a;
      }],
    ];

    for (const [nome, gesto] of gestos) {
      const a = gesto();
      expect(a.trace.erros.length, nome).toBe(0);
    }
  });
});

// O `verificar-arvore.ts` já garante que `nucleo/` não *importa* `projecoes/`.
// Isto é a outra metade: que o núcleo não *chame* para dentro de uma
// projeção, nem pelo nome de uma função dela. A tentação é concreta e
// silenciosa — `avaliarTexto` é o nome que toda a gente dá à função que
// converte texto numa linguagem, e um dia um ficheiro do núcleo vai
// `import { avaliarTexto } from '../projecoes/…'` e passar a tratar
// sintaxe, que é a coisa que a spec §6.4 proíbe ao núcleo.
//
// Só os ficheiros de produção são lidos. Este ficheiro de teste menciona
// `projecoes` e `avaliarTexto` nas próprias expressões regulares, e um
// teste que se apanha a si próprio não verifica nada.
describe('o núcleo não fala com as projeções', () => {
  function producaoEm(raiz: string): string[] {
    return readdirSync(raiz, { withFileTypes: true }).flatMap((e) => {
      const caminho = join(raiz, e.name);
      if (e.isDirectory()) return producaoEm(caminho);
      if (!/\.tsx?$/.test(e.name)) return [];
      return e.name.includes('.test.') ? [] : [caminho];
    });
  }

  // O `cwd` do vitest é a raiz do projecto, que é onde a npm correu o
  // comando. `import.meta.url` não serve: depois da transformação do
  // vitest deixa de ser um URL `file:` e `fileURLToPath` rebenta — o que
  // é um bom motivo para um teste de caminho de ficheiro não confiar em
  // magia de bundler.
  const NUCLEO = join(process.cwd(), 'src', 'nucleo');

  it('nenhum ficheiro de produção menciona uma projeção ou chama o leitor de texto', () => {
    const ficheiros = producaoEm(NUCLEO);
    expect(ficheiros.length).toBeGreaterThan(0);
    for (const f of ficheiros) {
      // Os comentários saem antes do casamento. Um ficheiro do núcleo vai
      // ter uma linha a explicar *porquê* que não chama `emitir` — e um
      // teste que proíbe a palavra transformava a documenting do
      // invariante numa razão para o invariante desaparecer. O que se
      // proíbe é a chamada, não a lembrança dela.
      const codigo = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      expect(codigo, f).not.toMatch(/projecoes/);
      expect(codigo, f).not.toMatch(/avaliarTexto|\.ler\(|\bemitir\b/);
    }
  });
});
