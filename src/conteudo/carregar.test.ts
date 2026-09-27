import { describe, expect, it } from 'vitest';
import { dump } from 'js-yaml';
import { CARREGAR, ErroDeAutoria, LICSOES, TEXTOS, temLicao } from './carregar';
import { emitir } from '../projecoes/avaliar';
import { FORMAS_POR_FAMILIA } from './esquema';
import variavelPython from './python/variavel.yml?raw';

/** A lição mais pequena que o carregador aceita.
 *
 *  Vive aqui, montada a partir de um objeto, e não copiada do ficheiro real.
 *  A versão do plano fazia o contrário — pegava no `variavel.yml` e
 *  substituía com expressões regulares — e o resultado era uma dezena de
 *  testes presos à formatação do ficheiro: `momentos: []` só era alcançável
 *  porque a regex sabia onde estava a próxima `- fase:`, e mudar a
 *  indentação do YAML partia seis testes que deviam estar a testar o
 *  carregador.
 *
 *  Aqui a corrupção é **num campo**, não num texto. O teste continua a ser
 *  sobre a regra do carregador, e passa a ser sobre a regra do carregador
 *  mesmo que o ficheiro real mude de forma. */
function licaoMinima(): Record<string, unknown> {
  return {
    id: 'variavel',
    linguagem: 'python',
    titulo: 'A caixa que guarda o valor',
    porqueTitulo: 'Sem uma caixa, o número que contas desaparece no fim da linha.',
    blocos: [{ type: 'guardar' }, { type: 'dizer' }],
    passos: [
      {
        fase: 'explicar',
        porque:
          'Este bloco põe um número dentro de uma caixa com nome, e o nome é o que torna o número útil depois da linha.',
        bloco: {
          type: 'guardar',
          fields: { nome: { valor: 'total' } },
          inputs: { VALOR: { valor: 5 } },
        },
        sonda: 'guarda-um-numero',
        momentos: [
          {
            id: 'l1',
            texto: 'O que é que esta linha põe dentro da caixa?',
            palavras: ['guardar', 'número', 'total'],
            fonte: 'leitura',
          },
        ],
      },
      {
        fase: 'fazer',
        porque: 'Agora escreves tu a linha, e a sonda diz-te se o que fizeste é o que a linha diz.',
        bloco: {
          type: 'guardar',
          fields: { nome: { valor: 'total' } },
          inputs: { VALOR: { valor: 5 } },
        },
        sonda: 'guarda-um-numero',
        momentos: [
          {
            id: 'f1',
            texto: 'Escreve a linha que põe 5 dentro de uma caixa chamada total.',
            palavras: [],
            fonte: 'texto',
          },
        ],
      },
      {
        fase: 'nomear',
        porque: 'O nome desta coisa é metade do que a torna útil.',
        nomear: 'variável',
        bloco: {
          type: 'guardar',
          fields: { nome: { valor: 'total' } },
          inputs: { VALOR: { valor: 5 } },
        },
        sonda: 'guarda-um-numero',
        momentos: [
          {
            id: 'n1',
            texto: 'Como se chama a caixa que guarda o valor?',
            palavras: ['variável', 'caixa'],
            fonte: 'leitura',
          },
        ],
      },
    ],
    sondas: [
      {
        nome: 'guarda-um-numero',
        pergunta: 'O que é que este programa faz?',
        porque:
          'A sonda tem de estar na lição antes de o aluno mexer, para o ele tentar a experiência e ver o que acontece.',
        prova: {
          forma: 'programa',
          programa: {
            type: 'pilha',
            inputs: {
              CORPO: {
                stack: [
                  {
                    type: 'guardar',
                    fields: { nome: { valor: 'total' } },
                    inputs: { VALOR: { valor: 5 } },
                  },
                ],
              },
            },
          },
        },
        esperado: {
          classe: 'Observacao',
          porque:
            'O programa corre, guarda um número e não dá erro nenhum — e é por isso que a linha parece estar a fazer nada.',
        },
      },
    ],
    paraSaberQueFez:
      'Fizeste quando conseguiste dizer, sem ver a lição, o que a tua linha faz e o que a protege.',
  };
}

/** A mesma lição, com um campo mudado, sem tocar no resto. */
function com(mudanca: (l: Record<string, unknown>) => void): string {
  const l = licaoMinima();
  mudanca(l);
  return dump(l);
}

function primeiroPasso(l: Record<string, unknown>): Record<string, unknown> {
  return (l.passos as Array<Record<string, unknown>>)[0]!;
}

describe('CARREGAR: a lição mínima é aceite', () => {
  it('carrega e devolve os campos tal como estão', () => {
    const l = CARREGAR(dump(licaoMinima()), 'python');
    expect(l.id).toBe('variavel');
    expect(l.linguagem).toBe('python');
    expect(l.titulo).toBe('A caixa que guarda o valor');
    expect(l.paraSaberQueFez.length).toBeGreaterThan(0);
  });

  it('e o tipo da linguagem é o do núcleo, e não `string`', () => {
    // `linguagem: string` no esquema é uma porta aberta: a lição de Go
    // passava a validar como se fosse a de Python, e o erro só aparecia
    // quando o aluno carregava. O esquema tem de fechar a lista.
    const l = CARREGAR(dump(licaoMinima()), 'python');
    expect(l.linguagem satisfies 'python' | 'java' | 'go' | 'typescript' | 'javascript' | 'sql').toBe('python');
  });

  it('o YAML partido é recusado com a linha, e a linha é a do ficheiro e não a do analisador', () => {
    // O `mark.line` do analisador conta a partir do zero. Passá-lo como
    // estava dá a linha 1 a quem está na linha 2, e um erro de autoria
    // que aponta para a linha errada é um erro de autoria que se arrasta.
    try {
      CARREGAR('id: variavel\n  id: [quebrado', 'python');
      throw new Error('devia ter sido recusado');
    } catch (e) {
      expect(e).toBeInstanceOf(ErroDeAutoria);
      expect((e as ErroDeAutoria).razao).toMatch(/linha 2/);
    }
  });

  it('e a mensagem diz o que o analisador disse, para o autor não ficar às cegas', () => {
    // A mensagem do analisador está em inglês. Fica, e fica por uma razão que
    // vale mais do que a língua: quem escreve a lição é quem vai corrigir a
    // lição, e um `bad indentation of a mapping entry` aponta para o sítio e
    // o analisador é quem sabe o sítio. **Esta mensagem nunca vai para o
    // ecrã de um aluno** — é um erro de autoria, e o aluno não escreve lições.
    try {
      CARREGAR('id: variavel\n  id: [quebrado', 'python');
    } catch (e) {
      expect((e as ErroDeAutoria).razao).toMatch(/analisador/);
    }
  });
});

describe('CARREGAR: recusas de autoria, campo a campo', () => {
  it('linguagem que não é a do ficheiro é recusada, e a mensagem diz as duas', () => {
    try {
      CARREGAR(dump(licaoMinima()), 'java');
      throw new Error('devia ter sido recusado');
    } catch (e) {
      expect((e as Error).message).toMatch(/python/);
      expect((e as Error).message).toMatch(/java/);
    }
  });

  it('a sonda que um passo aponta tem de existir, e a mensagem diz os nomes', () => {
    const razao = razaoDe(com((l) => {
      primeiroPasso(l).sonda = 'nao-existe';
    }));
    expect(razao).toMatch(/nao-existe/);
    expect(razao).toMatch(/guarda-um-numero/);
  });

  it('uma classe esperada que não existe é recusada com a lista das que existem', () => {
    const razao = razaoDe(com((l) => {
      ((l.sondas as Array<Record<string, unknown>>)[0]!.esperado as Record<string, unknown>).classe =
        'Explosao';
    }));
    expect(razao).toMatch(/Explosao/);
    expect(razao).toMatch(/Observacao/);
  });

  it('um passo sem porque é recusado: nenhuma mensagem sem razão', () => {
    const razao = razaoDe(com((l) => {
      primeiroPasso(l).porque = '   ';
    }));
    expect(razao).toMatch(/porque/);
  });

  it('um passo sem momentos é recusado, porque nunca se completaria', () => {
    // A regra não é interface: é aritmética. `momentos[momento]` de uma lista
    // vazia dá `undefined` para sempre, e o aluno ficava preso num passo que
    // não avança nem recusa.
    const razao = razaoDe(com((l) => {
      primeiroPasso(l).momentos = [];
    }));
    expect(razao).toMatch(/momentos/);
  });

  it('um passo de fase nomear sem palavra é recusado', () => {
    // A regra protege a vista `nomear`. Sem uma palavra, o aluno lia o mesmo
    // parágrafo que lia na vista `explicar`, e a lição perdia um terço do
    // método.
    const razao = razaoDe(com((l) => {
      const p = (l.passos as Array<Record<string, unknown>>)[2]!;
      delete p.nomear;
    }));
    expect(razao).toMatch(/nomear/);
  });

  it('uma palavra nomeada num passo que não é de fase nomear é recusada', () => {
    // A palavra nomeada é o conteúdo da vista `nomear`. Num passo de fase
    // `fazer` seria uma segunda fonte de verdade: o `porque` e a palavra
    // nomeada poderiam dizer coisas diferentes, e o aluno veria as duas.
    const razao = razaoDe(com((l) => {
      primeiroPasso(l).nomear = 'variável';
    }));
    expect(razao).toMatch(/não dá nome a nada/);
  });

  it('e a recusa diz a palavra que está fora do sítio, e não só o campo', () => {
    const razao = razaoDe(com((l) => {
      primeiroPasso(l).nomear = 'variável';
    }));
    expect(razao).toMatch(/variável/);
  });

  it('uma sonda sem pergunta é recusada: é a primeira coisa que o aluno lê', () => {
    // O `porque` da sonda é sobre a lição e nunca aparece no ecrã. A
    // `pergunta` é o inverso: aparece primeiro e sem mais nada à volta. Uma
    // sonda que só tem `porque` obriga o aluno a ler a nota de rodapé do
    // currículo antes de adivinhar o que a experiência vai fazer.
    const razao = razaoDe(com((l) => {
      delete (l.sondas as Array<Record<string, unknown>>)[0]!.pergunta;
    }));
    expect(razao).toMatch(/pergunta/);
  });

  it('uma fonte de momento que não existe é recusada com a lista', () => {
    const razao = razaoDe(com((l) => {
      ((primeiroPasso(l).momentos as Array<Record<string, unknown>>)[0]!).fonte = 'palpite';
    }));
    expect(razao).toMatch(/palpite/);
    expect(razao).toMatch(/leitura/);
  });

  it('dois momentos com o mesmo id são recusados: o id é a chave dentro do passo', () => {
    const razao = razaoDe(com((l) => {
      const momentos = primeiroPasso(l).momentos as Array<Record<string, unknown>>;
      momentos.push({ ...momentos[0]! });
    }));
    expect(razao).toMatch(/mesmo id/);
  });

  it('dois passos com o mesmo id de momento são aceites, porque o id é do passo', () => {
    // O mesmo `id` em dois passos diferentes é o mesmo sítio lógico —
    // `l1` é a leitura em qualquer passo. Recusá-lo obrigaria a inventar nomes
    // globais para cada passo, e o ficheiro a crescer sem o aluno ver nada.
    const l = com((bruta) => {
      const passos = bruta.passos as Array<Record<string, unknown>>;
      passos[1]!.momentos = [
        { id: 'l1', texto: 'A mesma pergunta, noutro passo.', palavras: ['guardar'], fonte: 'leitura' },
      ];
    });
    expect(() => CARREGAR(l, 'python')).not.toThrow();
  });

  it('o nome de uma sonda tem de ser um identificador em minúsculas', () => {
    const razao = razaoDe(com((l) => {
      const s = (l.sondas as Array<Record<string, unknown>>)[0]!;
      s.nome = 'Guarda Um Número';
    }));
    expect(razao).toMatch(/minúsculas/);
  });

  it('uma prova com os dois, `programa` e `texto`, é recusada', () => {
    const razao = razaoDe(com((l) => {
      ((l.sondas as Array<Record<string, unknown>>)[0]!.prova as Record<string, unknown>).texto = 'total = 5\n';
    }));
    expect(razao).toMatch(/nunca os dois/);
  });

  it('uma prova sem nenhum dos dois é recusada', () => {
    const razao = razaoDe(com((l) => {
      delete (l.sondas as Array<Record<string, unknown>>)[0]!.prova;
    }));
    expect(razao).toMatch(/prova/);
  });

  it('um programa de prova que não é um bloco é recusado pelo sítio, e não por um `as never`', () => {
    // O plano fazia `prova.programa as never` e dizia que validava. Não
    // validava: `as never` cala o compilador e não olha para o dado. Um
    // `programa: 5` passava a validação e rebentava no `emitir`, em código de
    // projeção, com um erro que não aponta para o YAML.
    const razao = razaoDe(com((l) => {
      ((l.sondas as Array<Record<string, unknown>>)[0]!.prova as Record<string, unknown>).programa = 5;
    }));
    expect(razao).toMatch(/programa/);
  });

  it('um bloco do vocabulario que não é desta linguagem é recusado com a lista', () => {
    const razao = razaoDe(com((l) => {
      (l.blocos as Array<Record<string, unknown>>)[0]!.type = 'enquanto';
    }));
    expect(razao).toMatch(/enquanto/);
    expect(razao).toMatch(/guardar/);
  });
});

describe('CARREGAR: Review Focus 2, a forma tem de bater com a família', () => {
  it('uma forma que não existe é recusada com a lista das que existem', () => {
    const razao = razaoDe(com((l) => {
      ((l.sondas as Array<Record<string, unknown>>)[0]!.prova as Record<string, unknown>).forma = 'diagrama';
    }));
    expect(razao).toMatch(/diagrama/);
    expect(razao).toMatch(/programa/);
  });

  it('uma forma que existe mas é de outra família é recusada, e a mensagem diz as duas', () => {
    // O ponto 2 do `Review Focus` é este: uma sonda de SQL provada com um
    // programa é um erro de autoria e aparece como recusa com razão, e não
    // como um `TypeError` algures dentro da projeção. `consulta` existe no
    // esquema porque o Plano C precisa dela, e é exatamente por isso que
    // este teste é preciso agora: uma forma válida noutra família não é uma
    // forma válida aqui.
    const razao = razaoDe(com((l) => {
      ((l.sondas as Array<Record<string, unknown>>)[0]!.prova as Record<string, unknown>).forma = 'consulta';
    }));
    expect(razao).toMatch(/consulta/);
    expect(razao).toMatch(/imperativa/);
  });

  it('e a regra mora num sítio só, o esquema, e as duas metades do runner leem de lá', () => {
    // A tabela da família estava escrita duas vezes — no carregador e no
    // runner — e duas tabelas divergem no primeiro caso em que uma delas é
    // mudada. `FORMAS_POR_FAMILIA` vive no esquema, que é o contrato.
    expect(FORMAS_POR_FAMILIA.imperativa).toBe('programa');
    expect(FORMAS_POR_FAMILIA.declarativa).toBe('consulta');
  });
});

describe('o registo de lições', () => {
  it('Python tem lição; as outras ainda não', () => {
    expect(temLicao('python')).toBe(true);
    expect(temLicao('java')).toBe(false);
    expect(LICSOES).toEqual(['python']);
  });

  it('o registo é derivado dos ficheiros, e não escrito à mão', () => {
    // A primeira versão dizia `['python', 'java']` e o teste dizia
    // `['python']`. Um array escrito à mão é uma lista de intenções; este é
    // uma lista de ficheiros, e por isso não pode ficar para trás.
    expect(Object.keys(TEXTOS)).toEqual(LICSOES.map((l) => `${l}/variavel`));
  });

  it('e a chave do registo é a mesma que `temLicao` pergunta', () => {
    for (const l of LICSOES) expect(TEXTOS[`${l}/variavel`]).toBeDefined();
  });
});

describe('a lição de Python que está no repositório', () => {
  it('carrega sem nenhuma recusa de autoria', () => {
    expect(() => CARREGAR(variavelPython, 'python')).not.toThrow();
  });

  it('é a mesma lição que a do registo', () => {
    expect(TEXTOS['python/variavel']).toBe(variavelPython);
  });

  it('cada passo aponta para uma sonda que existe', () => {
    const l = CARREGAR(variavelPython, 'python');
    const nomes = l.sondas.map((s) => s.nome);
    for (const p of l.passos) expect(nomes).toContain(p.sonda);
  });

  it('cada sonda tem os dois campos de prosa, e nenhum dos dois é opcional', () => {
    const l = CARREGAR(variavelPython, 'python');
    for (const s of l.sondas) {
      expect(s.pergunta.length).toBeGreaterThan(0);
      expect(s.porque.length).toBeGreaterThan(20);
    }
  });

  it('só `fonte: leitura` tem palavras, e as outras não', () => {
    // Uma palavra numa fonte que não é `leitura` é um campo morto: ninguém a
    // confere, e quem a escreveu pensou que alguém ia. A regra do produto é
    // que não há respostas erradas — só há palavras que contam e palavras
    // que são decoração.
    const l = CARREGAR(variavelPython, 'python');
    for (const p of l.passos) {
      for (const m of p.momentos) {
        if (m.fonte === 'leitura') expect(m.palavras.length).toBeGreaterThan(0);
        else expect(m.palavras).toEqual([]);
      }
    }
  });

  it('o `porque` de um passo explica e não instrui, e é por isso que é comprido', () => {
    const l = CARREGAR(variavelPython, 'python');
    for (const p of l.passos) expect(p.porque.length).toBeGreaterThan(20);
  });

  it('o título não é um slug', () => {
    expect(CARREGAR(variavelPython, 'python').titulo).not.toMatch(/^[a-z0-9-]+$/);
  });

  it('cada programa de prova é escrito de verdade pela projeção da linguagem', () => {
    const l = CARREGAR(variavelPython, 'python');
    for (const s of l.sondas) {
      if (s.prova.programa === undefined) continue;
      expect(emitir('python', s.prova.programa).texto.length).toBeGreaterThan(0);
    }
  });
});

function razaoDe(yaml: string): string {
  try {
    CARREGAR(yaml, 'python');
  } catch (e) {
    if (e instanceof ErroDeAutoria) return e.message;
    throw e;
  }
  throw new Error('a lição devia ter sido recusada e não foi');
}
