import { describe, expect, it } from 'vitest';
import { avaliarTexto, emitir } from '../projecoes/avaliar';
import { FORMAS_POR_FAMILIA } from './esquema';
import type { Sonda } from './esquema';
import { executarSonda } from './sondas';

function sonda(extra: Partial<Sonda> = {}): Sonda {
  return {
    nome: 'guarda-um-numero',
    pergunta: 'O que é que este programa faz?',
    porque: 'A sonda está aqui para a pessoa dizer o que espera antes de ver o que acontece.',
    prova: {
      forma: 'programa',
      programa: {
        type: 'pilha',
        inputs: {
          CORPO: {
            stack: [
              { type: 'guardar', fields: { nome: { valor: 'total' } }, inputs: { VALOR: { valor: 5 } } },
            ],
          },
        },
      },
    },
    esperado: {
      classe: 'Observacao',
      porque: 'Corre e não dá erro, e é por isso que a linha parece não estar a fazer nada.',
    },
    ...extra,
  };
}

/** Uma sondagem montada à mão, com o que se quiser dentro.
 *
 *  Existe porque o `CARREGAR` recusa sondagens malformadas **e é suposto
 *  recusá-las**: o runner nunca é chamado com uma sondagem assim. Mas quem
 *  escreve uma sondagem em memória — o painel de texto da Task 10 faz isso —
 *  pode, e o runner tem de responder com um relatório e não com um
 *  `TypeError`, que é a diferença entre uma ferramenta que ensina e uma que
 *  baralha.
 *
 *  A conversão é `as Sonda` e está **numa função**, com a razão escrita. A
 *  versão do plano punha `// @ts-expect-error` numa linha que não era a linha
 *  do erro, o que o `tsc` apanha a dizer que não. */
function sondaEmMaos(bruta: unknown): Sonda {
  return bruta as Sonda;
}

function sondaDeTexto(corpo: string): Sonda {
  return sonda({ nome: 'linha-escrita-a-mao', prova: { forma: FORMAS_POR_FAMILIA.imperativa, texto: corpo } });
}

describe('executarSonda: o que o relatório diz', () => {
  it('passa quando o motor vê o que a sondagem esperava', () => {
    const r = executarSonda(sonda(), 'python');
    expect(r.ok).toBe(true);
    expect(r.esperada).toBe('Observacao');
    expect(r.observada).toBe('Observacao');
    expect(r.nome).toBe('guarda-um-numero');
    expect(r.erro).toBeNull();
  });

  it('falha quando não passa, e o relatório traz as duas classes', () => {
    const r = executarSonda(sondaDeTexto('int total = "olá";\n'), 'java');
    expect(r.ok).toBe(false);
    expect(r.esperada).toBe('Observacao');
    expect(r.observada).toBe('Recusa');
  });

  it('o porque esperado nunca é comparado, só a classe', () => {
    // Escrever outra frase na lição não pode partir o CI. Este teste é a
    // garantia disso, e é o que impede a lição de virar um teste de escrita.
    const a = executarSonda(sonda(), 'python');
    const b = executarSonda(
      sonda({ esperado: { classe: 'Observacao', porque: 'Uma frase completamente diferente, com mais palavras.' } }),
      'python',
    );
    expect(a.ok).toBe(b.ok);
    expect(b.ok).toBe(true);
  });

  it('o relatório tem porque, mesmo quando falha', () => {
    const r = executarSonda(sondaDeTexto('isto nao e python\n'), 'python');
    expect(r.ok).toBe(false);
    expect(r.porque.length).toBeGreaterThan(0);
  });

  it('o relatório tem o mesmo porque quando passa, para o `git diff` mostrar a mudança', () => {
    expect(executarSonda(sonda(), 'python').porque).toBe(sonda().porque);
  });

  it('e quando falha o porque é o da sondagem mais o que aconteceu', () => {
    // A regra do produto: a lição não muda de texto porque alguém errou. O
    // porque da sondagem escreve-se uma vez e continua igual; o que muda é o
    // que o relatório acrescenta em cima.
    const r = executarSonda(sondaDeTexto('isto nao e python\n'), 'python');
    expect(r.porque.startsWith(sonda().porque)).toBe(true);
    expect(r.porque.length).toBeGreaterThan(sonda().porque.length);
  });

  it('o erro de uma falha começa por dizer que foi o motor que viu aquilo', () => {
    const r = executarSonda(sondaDeTexto('isto nao e python\n'), 'python');
    expect(r.erro).toMatch(/^o motor viu/);
  });
});

describe('executarSonda: a mesma linha em duas linguagens', () => {
  it('guardar uma palavra passa em Python e é recusado em Java, e é a recusa que é o produto', () => {
    // A linha é a mesma ideia: pôr um valor dentro de uma caixa. Em Python a
    // caixa aceita o que lhe derem; em Java a caixa é de um tipo só, e um
    // `int` não aceita uma palavra. **Nenhuma das duas está errada.** A
    // resposta muda porque a pergunta muda, e é isso que a lição tem de
    // ensinar.
    const py = executarSonda(sondaDeTexto("total = 'olá'\n"), 'python');
    const ja = executarSonda(sondaDeTexto('int total = "olá";\n'), 'java');
    expect(py.ok).toBe(true);
    expect(ja.ok).toBe(false);
    expect(ja.observada).toBe('Recusa');
  });

  it('a sondagem de Java não pode ser a de Python com o texto trocado', () => {
    // É este teste que diz à próxima tarefa que a lição de Java precisa de
    // sondagens próprias. A lição é o conteúdo, e o conteúdo não se copia.
    const py = executarSonda(sondaDeTexto("total = 'olá'\n"), 'python');
    const emJava = executarSonda(sondaDeTexto("total = 'olá'\n"), 'java');
    // O mesmo texto, lido por Java, nem é lido: tem aspas simples onde a Java
    // só aceita duplas. E o erro tem de ser **da leitura**, não da política,
    // porque é a leitura que não reconhece a linha.
    expect(py.ok).toBe(true);
    expect(emJava.ok).toBe(false);
    expect(emJava.observada).toBe('FalhaRuntime');
    expect(emJava.erro).toMatch(/Java/);
  });

  it('nenhum programa de blocos dá uma recusa de tipo, e isso é uma fatura da estrutura', () => {
    // Os blocos são tipados: um `guardar` com `{ txt: 'olá' }` escreve
    // `String total = "olá";` em Java, que é Java bem escrito. **Não há
    // caminho de blocos para uma `Recusa` em Java.** A lição de Java tem de
    // provar as recusas com texto escrito à mão, e este teste é o que o diz
    // em vez de o descobrir à quinta tarefa quando a lição não fecha.
    const escrito = emitir('java', {
      type: 'pilha',
      inputs: {
        CORPO: {
          stack: [
            { type: 'guardar', fields: { nome: { valor: 'total' } }, inputs: { VALOR: { valor: { txt: 'olá' } } } },
          ],
        },
      },
    }).texto;
    expect(escrito).toBe('String total = "olá";\n');
    expect(avaliarTexto('java', escrito)).toEqual([]);
  });
});

describe('executarSonda: o Review Focus 1, texto de outra linguagem', () => {
  it('texto de Java lido por Python é recusado com uma razão', () => {
    const r = executarSonda(sondaDeTexto('int total = 5;\n'), 'python');
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/Python/i);
  });

  it('e o relatório diz que o texto não é desta linguagem, e não que o programa falhou', () => {
    // A diferença é o que o aluno aprende. «Isto não é Python» é uma porta
    // fechada com uma razão; «o programa falhou» faz o aluno pensar que
    // escreveu Python mal, que é uma coisa diferente — e errada.
    const r = executarSonda(sondaDeTexto('int total = 5;\n'), 'python');
    // A metade que importa: a recusa **nomeia a linguagem** e diz o que uma
    // linha dela é. Um relatório que dissesse «o programa falhou» faria o
    // aluno procurar um erro no programa, e o programa estava bem — a linha é
    // que é de outra linguagem.
    expect(r.erro).toMatch(/não é Python/i);
    expect(r.erro).toMatch(/atribuição, um print, um for/);
    expect(r.erro).not.toMatch(/o programa falhou/i);
  });
});

describe('executarSonda: sondagens malformadas dão relatório, não exceção', () => {
  it('uma forma que não existe dá relatório a dizer quais existem', () => {
    const r = executarSonda(sondaEmMaos({ ...sonda(), prova: { forma: 'diagrama', texto: 'x' } }), 'python');
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/diagrama/);
    expect(r.erro).toMatch(/programa/);
    expect(r.observada).toBe('Observacao');
  });

  it('uma forma de outra família dá relatório a dizer a família', () => {
    const r = executarSonda(sondaEmMaos({ ...sonda(), prova: { forma: 'consulta', texto: 'SELECT 1' } }), 'python');
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/consulta/);
    expect(r.erro).toMatch(/imperativa/);
  });

  it('uma prova com os dois, ou com nenhum, dá relatório', () => {
    for (const prova of [{ forma: 'programa' }, { forma: 'programa', texto: 'x = 1\n', programa: sonda().prova.programa }]) {
      const r = executarSonda(sondaEmMaos({ ...sonda(), prova }), 'python');
      expect(r.ok).toBe(false);
      expect(r.erro).toMatch(/nunca os dois|nenhum/);
    }
  });

  it('um programa que não é um bloco dá relatório, e não rebenta dentro da projeção', () => {
    // O `CARREGAR` recusa isto, e o painel de texto da Task 10 pode construí-
    // lo sem passar pelo carregador. Um `throw` aqui seria um ecrã branco
    // com a lição a meio.
    // `programa: 5` **não** rebenta: `pilhaDe(5)` devolve uma lista vazia, o
    // emissor escreve um programa vazio, e um programa vazio corre sem erro.
    // O relatório dizia que a sondagem tinha passado, e o que tinha passado
    // era uma sondagem sem programa. O runner é a última linha: tem de
    // olhar para o programa antes de o escrever.
    const r = executarSonda(sondaEmMaos({ ...sonda(), prova: { forma: 'programa', programa: 5 } }), 'python');
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/o motor viu/);
    expect(r.erro).toMatch(/não é um bloco/);
  });
});
