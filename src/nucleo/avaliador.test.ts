import { describe, expect, it } from 'vitest';
import { avaliador, MAX_ITERACOES, pilhaDe, regraDeLinhas } from './avaliador';
import { RANGE_INTEIROS } from './tipos';
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

  it('guardar texto dá um valor de texto, e isso já é um erro', () => {
    // O nome antigo deste teste dizia "sem erro", e o teste seguinte — que
    // existe — diz que é uma `Recusa`. O nome mentia sobre o comportamento
    // que o ficheiro está a descrever. Um teste cujo nome é falso ensina o
    // leitor a ignorar o teste, e é o primeiro sítio onde se aprende a não
    // confiar em testes.
    const a = avaliador();
    const v = a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
    expect(v.tipo).toBe('texto');
    expect(v.recusado).toBe(true);
    expect(a.trace.erros.length).toBe(1);
  });

  it('recusa guardar texto, com porque não vazio', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('Recusa');
    expect(e && e.porque.length).toBeGreaterThan(0);
    expect(e && e.classe === 'Recusa' && e.esperado).toBe('número');
    expect(e && e.classe === 'Recusa' && e.obtido).toBe('texto');
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

  it('guardarTexto guarda o mesmo 5 como palavra, e isso é recusado', () => {
    // `guardarTexto` embrulha em `{txt: '5'}`. O `5` que a pessoa escreveu e
    // o `5` que o robô disse não são o mesmo valor: um é número, o outro é
    // uma palavra com dois algarismos dentro. Uma variável de número não
    // aceita a segunda forma, e é essa recusa — não um erro qualquer — que a
    // lição da variável precisa de mostrar. A versão anterior deste par
    // dizia o contrário, e o `vitest` apanhou-o.
    const a = avaliador();
    a.executar(pilha(guardarTexto('total', 5)));
    const v = a.avaliar('dador_num', { VALOR: { ref: 'total' } }, 1);
    expect(v.tipo).toBe('texto');
    expect(v.valor).toBe('5');
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('Recusa');
    expect(e && e.classe === 'Recusa' && e.esperado).toBe('número');
    expect(e && e.classe === 'Recusa' && e.obtido).toBe('texto');
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

  it('recusa um número, com porque não vazio', () => {
    const a = avaliador();
    a.avaliar('dizer', { VALOR: 5 }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('Recusa');
    expect(e && e.classe === 'Recusa' && e.esperado).toBe('texto');
    expect(e && e.classe === 'Recusa' && e.obtido).toBe('número');
  });

  it('recusa um valor que já tinha sido recusado a chegar a dizer', () => {
    // São dois erros, não um: o do `guardar` (palavra num slot de número) e o
    // do `dizer` (a variável recusada a chegar a um sítio de texto). A
    // versão anterior lia `erros[0]` — o do `guardar` — e por isso passava
    // mesmo que o `dizer` aceitasse o valor. Lê o último.
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
    a.avaliar('dizer', { VALOR: { ref: 'total' } }, 1);
    expect(a.trace.erros.length).toBe(2);
    const e = a.trace.erros[1];
    expect(e?.classe).toBe('Recusa');
    expect(e?.origem.bloco).toBe('dizer');
    expect(e && e.porque.length).toBeGreaterThan(0);
  });
});

describe('valores de entrada', () => {
  it('{txt} é texto', () => {
    expect(avaliador().avaliar('dador_num', { VALOR: { txt: 'x' } }, 1).tipo).toBe('texto');
  });
  it('um número é número', () => {
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
  it('uma forma desconhecida é Recusa com porque', () => {
    const a = avaliador();
    a.avaliar('dador_num', { VALOR: { qqq: 1 } }, 1);
    expect(a.trace.erros[0]?.classe).toBe('Recusa');
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
    const a = avaliador();
    a.executar(pilha(guardar('total', 1), dizer(5), log({ ref: 'total' })));
    const guardou = a.trace.valores.filter((v) => v.origem.bloco === 'guardar');
    expect(guardou.length).toBe(1);
    expect(a.trace.erros.length).toBe(1);
    expect(a.trace.erros[0]?.origem.bloco).toBe('dizer');
  });

  it('o bloco depois do erro não corre', () => {
    const a = avaliador();
    a.executar(pilha(guardar('total', 1), dizer(5), guardar('outro', 2)));
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
      ['guardar texto num slot de número', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
        return a;
      }],
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
      ['dizer um número', () => {
        const a = avaliador();
        a.avaliar('dizer', { VALOR: 5 }, 1);
        return a;
      }],
      ['dizer um valor já recusado', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
        a.avaliar('dizer', { VALOR: { ref: 'total' } }, 1);
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
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
    for (const e of a.trace.erros) {
      expect(e.porque.length).toBeGreaterThan(0);
      if ('remedio' in e) expect(e.remedio.length).toBeGreaterThan(0);
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
