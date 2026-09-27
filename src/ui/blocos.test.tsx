import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as Blockly from 'blockly';
import { Blocos } from './painel-blocos';
import { caixaComoOBlockly, criarToolbox, deBlocoLeigo, paraBlocoLeigo, registarBlocos } from './blocos';
import type { BlocoLeigo } from '../nucleo/avaliador';
import { avaliador } from '../nucleo/avaliador';
import { corpoDe } from '../nucleo/blocos';
import { emitir } from '../projecoes/avaliar';
import { obter } from '../projecoes/registo';
import { CARREGAR } from '../conteudo/carregar';
import variavelPython from '../conteudo/python/variavel.yml?raw';

/** O tecto de tempo deste ficheiro, escrito à mão e posto em todos os testes.
 *
 *  Montar o ecrã é montar o Blockly, e o Blockly não é rápido: regista
 *  blocos, mede um SVG que o jsdom não sabe medir, e monta a ferramenta.
 *  Sozinho este ficheiro corre em menos de dois segundos por teste; a correr
 *  ao lado dos outros, que é como o `npm test` o corre, passa dos cinco e o
 *  teste morre de tempo esgotado sem que nada esteja errado. Já aconteceu
 *  três vezes em três voltas, em três testes diferentes, e num commit que
 * eria verde.
 *
 *  O tecto escreve-se à mão em vez de se subir o global, porque subir o
 *  global é dizer que todos os testes são lentos quando estes são lentos por
 *  uma razão que só estes têm. E vai em **todos** os testes do ficheiro, e
 *  não numa lista dos lentos: essa lista seria uma segunda fonte de verdade
 *  que divergiria no primeiro teste novo, e o teste novo morreria de tempo
 *  esgotado sem ninguém saber porquê. */
const PASSO_A_PASSO = 20_000;


// ---------------------------------------------------------------------------
// O cenário
// ---------------------------------------------------------------------------
//
// Estes testes não escrevem blocos à mão. Montam um ecrã do Blockly a sério,
// ligam as peças como uma pessoa liga, e passam ao tradutor **a saída que o
// Blockly deu**.
//
// A primeira versão desta suite fazia o contrário: escrevia objetos com a
// forma que o tradutor esperava, e o tradutor passou tudo. A forma que o
// tradutor esperava e a forma que o Blockly dá diferem em três pontos —
// `workspaces.save` embrulha o estado, `fields` guarda o valor cru e as
// instruções ligam-se por `next` — e cada um deles dava `undefined` ou `null`
// em silêncio. O produto ficava morto, a suite toda verde, e nenhum teste
// vermelho em lado nenhum. A regra daqui é simples e não se negocia: **um
// teste que alimenta o tradutor com a forma que o tradutor inventou não
// prova que o tradutor funciona.**

interface Cenario {
  estado: unknown;
  espaco: Blockly.WorkspaceSvg;
  libertar: () => void;
}

let ecras: HTMLElement[] = [];

function ecra(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  ecras.push(el);
  return el;
}

/** Um ecrã novo, com a caixa de ferramentas de Python a sério. */
function ecrã(): Blockly.WorkspaceSvg {
  return Blockly.inject(ecra(), { toolbox: caixaComoOBlockly(criarToolbox('python')) });
}

/** O ecrã que o componente acabou de montar.
 *
 *  `getMainWorkspace` é tipado a devolver `Workspace`, que é a superclasse e
 *  não tem `fire` nem os blocos com desenho — e o que o teste precisa é
 *  exatamente isso. A conversão está aqui, com o nome, e não espalhada. */
function ecraPrincipal(): Blockly.WorkspaceSvg {
  const ws = Blockly.getMainWorkspace();
  if (ws === null) throw new Error('não há ecrã nenhum');
  return ws as Blockly.WorkspaceSvg;
}

function cenario(construir: (ws: Blockly.WorkspaceSvg) => void): Cenario {
  const ws = ecrã();
  registarBlocos('python');
  construir(ws);
  return { estado: Blockly.serialization.workspaces.save(ws), espaco: ws, libertar: () => ws.dispose() };
}

/** Um bloco de valor: `dador_num`, `texto` ou `variavel`. */
function valor(ws: Blockly.WorkspaceSvg, tipo: string, campo: string, dado: string | number): Blockly.BlockSvg {
  const b = ws.newBlock(tipo) as Blockly.BlockSvg;
  b.setFieldValue(dado, campo);
  b.initSvg();
  b.render();
  return b;
}

/** Um bloco de instrução, desenhado e pronto a ligar. */
function instrucao(ws: Blockly.WorkspaceSvg, tipo: string): Blockly.BlockSvg {
  const b = ws.newBlock(tipo) as Blockly.BlockSvg;
  b.initSvg();
  b.render();
  return b;
}

/** Liga um bloco de valor a uma ranhura. */
function ligar(pai: Blockly.BlockSvg, ranhura: string, filho: Blockly.BlockSvg): void {
  pai.getInput(ranhura)!.connection!.connect(filho.outputConnection!);
}

/** Liga duas instruções, uma abaixo da outra. */
function encadear(acima: Blockly.BlockSvg, abaixo: Blockly.BlockSvg): void {
  acima.nextConnection!.connect(abaixo.previousConnection!);
}

afterEach(() => {
  for (const el of ecras) el.remove();
  ecras = [];
});

describe('paraBlocoLeigo lê o que o Blockly dá', () => {
  it('uma área vazia não é programa nenhum', () => {
    const c = cenario(() => {});
    try {
      expect(paraBlocoLeigo(c.estado)).toBeNull();
      expect(paraBlocoLeigo(null)).toBeNull();
      expect(paraBlocoLeigo({})).toBeNull();
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('lê o nome de um guardar do campo, e não do sítio errado', () => {
    // O `fields` do Blockly guarda o **valor cru** — `{"nome": "total"}` — e
    // não `{"nome": {"valor": "total"}}`. A primeira versão do tradutor lia a
    // segunda, que é a forma que a lição em YAML usa, e escrevia
    // `undefined = 5` para o aluno. A forma do YAML é a forma do motor; a
    // forma do ecrã é a do Blockly, e o tradutor tem de estar nas duas.
    const c = cenario((ws) => {
      const g = instrucao(ws, 'guardar');
      g.setFieldValue('total', 'nome');
      ligar(g, 'VALOR', valor(ws, 'dador_num', 'VALOR', 5));
    });
    try {
      expect(emitir('python', paraBlocoLeigo(c.estado)).texto).toBe('total = 5\n');
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('lê o texto que a pessoa escreveu, e não uma string vazia', () => {
    // O bloco `texto` do plano era uma caixa com outra caixa dentro, e o
    // `valorDe` devolvia `{ txt: '' }` para ele. O texto da pessoa ia para o
    // lixo e o programa dizia `print('')`.
    const c = cenario((ws) => {
      const d = instrucao(ws, 'dizer');
      ligar(d, 'VALOR', valor(ws, 'texto', 'VALOR', 'olá'));
    });
    try {
      expect(emitir('python', paraBlocoLeigo(c.estado)).texto).toBe("print('olá')\n");
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('lê uma referência a uma variável, e só do bloco que a é', () => {
    // A regra antiga era «se tem um campo `NOME`, é uma referência». O bloco
    // do ator do robô também tem um campo `NOME` — o nome do ator — e com
    // essa regra arrastar um ator para dentro de um `dizer` escrevia
    // `print(coelho)`: uma variável que ninguém guardou, e um erro que aponta
    // para o sítio errado. A regra certa é «é do tipo `variavel`».
    const c = cenario((ws) => {
      const g = instrucao(ws, 'guardar');
      g.setFieldValue('total', 'nome');
      ligar(g, 'VALOR', valor(ws, 'dador_num', 'VALOR', 5));
      const l = instrucao(ws, 'log');
      ligar(l, 'VALOR', valor(ws, 'variavel', 'NOME', 'total'));
      encadear(g, l);
    });
    try {
      expect(emitir('python', paraBlocoLeigo(c.estado)).texto).toBe('total = 5\nlog(total)\n');
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('uma referência sem nome não é uma referência', () => {
    // Arrastar o bloco `variavel` sem escrever o nome dá um campo vazio, e um
    // campo vazio tem de dar um bloco normal — nunca `ref: ''`, que geraria
    // `log()` e um erro de sintaxe que aponta para o nome em vez de apontar
    // para o nome em falta.
    const c = cenario((ws) => {
      const l = instrucao(ws, 'log');
      const v = valor(ws, 'variavel', 'NOME', '');
      ligar(l, 'VALOR', v);
    });
    try {
      const b = paraBlocoLeigo(c.estado)!;
      const v = (b.inputs!.VALOR as { valor?: { ref?: string } }).valor;
      expect(v?.ref).toBeUndefined();
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('agrupa vários blocos de topo numa pilha', () => {
    const c = cenario((ws) => {
      instrucao(ws, 'dizer');
      instrucao(ws, 'log');
    });
    try {
      expect(paraBlocoLeigo(c.estado)!.type).toBe('pilha');
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('lê a cadeia de instruções, que o Blockly guarda em `next`', () => {
    // Duas instruções ligadas. A primeira versão do tradutor lia
    // `inputs[chave].stack`, que o Blockly nunca escreve: um `repetir` com
    // três linhas no corpo savingava uma, e o aluno executava um programa
    // que não era o que tinha montado.
    const c = cenario((ws) => {
      const r = instrucao(ws, 'repetir');
      ligar(r, 'PASSOS', valor(ws, 'dador_num', 'VALOR', 2));
      const d = instrucao(ws, 'dizer');
      const l = instrucao(ws, 'log');
      r.getInput('CORPO')!.connection!.connect(d.previousConnection!);
      encadear(d, l);
      ligar(d, 'VALOR', valor(ws, 'variavel', 'NOME', 'a'));
      ligar(l, 'VALOR', valor(ws, 'variavel', 'NOME', 'b'));
    });
    try {
      const esperado = 'for _ in range(2):\n    print(a)\n    log(b)\n';
      expect(emitir('python', paraBlocoLeigo(c.estado)).texto).toBe(esperado);
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('o que sai do ecrã corre no motor sem um erro sequer', () => {
    const c = cenario((ws) => {
      const g = instrucao(ws, 'guardar');
      g.setFieldValue('total', 'nome');
      ligar(g, 'VALOR', valor(ws, 'dador_num', 'VALOR', 7));
      const r = instrucao(ws, 'repetir');
      ligar(r, 'PASSOS', valor(ws, 'dador_num', 'VALOR', 3));
      r.getInput('CORPO')!.connection!.connect(g.previousConnection!);
    });
    try {
      const a = avaliador();
      a.executar(paraBlocoLeigo(c.estado));
      expect(a.trace.erros).toEqual([]);
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('um bloco que o Blockly não conhece passa em vez de rebentar', () => {
    // Um bloco do futuro é um bloco que esta tarefa ainda não conhece, e a
    // resposta é levá-lo ao motor e deixar o motor decidir o que fazer com ele
    // — não é falhar e levar o programa inteiro abaixo.
    Blockly.Blocks['bloco_do_futuro'] = { init() {} };
    const c = cenario((ws) => {
      const d = instrucao(ws, 'dizer');
      ligar(d, 'VALOR', instrucao(ws, 'bloco_do_futuro') as Blockly.BlockSvg);
    });
    try {
      const b = paraBlocoLeigo(c.estado);
      expect(b).not.toBeNull();
      expect(emitir('python', b).texto).toContain('bloco do v2');
    } finally {
      delete Blockly.Blocks['bloco_do_futuro'];
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('aceita as duas formas de estado, porque um `null` calado é um produto morto', () => {
    // `workspaces.save` embrulha o estado; um estado escrito à mão não. A
    // primeira versão lia só a forma escrita à mão, que é a que ela própria
    // escrevia nos testes, e devolvia `null` para tudo o que o Blockly
    // produz. Ler as duas é o que impede que a forma do teste e a forma da
    // biblioteca voltem a divergir em silêncio.
    const lista = [{ type: 'log', fields: {}, inputs: {} }];
    expect(paraBlocoLeigo({ blocks: lista })).not.toBeNull();
    expect(paraBlocoLeigo({ blocks: { languageVersion: 0, blocks: lista } })).not.toBeNull();
  }, PASSO_A_PASSO);
});

describe('deBlocoLeigo é o caminho inverso, e os dois caminhos fecham', () => {
  it('o programa do motor volta a ser o programa do motor', () => {
    const programa: BlocoLeigo = {
      type: 'pilha',
      inputs: {
        CORPO: {
          stack: [
            { type: 'guardar', fields: { nome: { valor: 'total' } }, inputs: { VALOR: { valor: 5 } } },
            {
              type: 'repetir',
              inputs: {
                PASSOS: { valor: 3 },
                CORPO: {
                  stack: [
                    { type: 'dizer', inputs: { VALOR: { valor: { ref: 'total' } } } },
                    { type: 'log', inputs: { VALOR: { valor: 'fim' } } },
                  ],
                },
              },
            },
          ],
        },
      },
    };
    const estado = { blocks: { languageVersion: 0, blocks: deBlocoLeigo(programa) } };
    expect(paraBlocoLeigo(estado)).toEqual(programa);
  }, PASSO_A_PASSO);

  it('e o programa que sai de ecrã e volta a dar o mesmo texto', () => {
    // Esta é a prova que vale: a ida e a volta não podem mudar o programa. Um
    // teste que verifica cada sentido em separado passa com um tradutor que
    // perde o corpo de um `repetir` na ida e o inventa na volta.
    const c = cenario((ws) => {
      const g = instrucao(ws, 'guardar');
      g.setFieldValue('total', 'nome');
      ligar(g, 'VALOR', valor(ws, 'dador_num', 'VALOR', 5));
      const r = instrucao(ws, 'repetir');
      ligar(r, 'PASSOS', valor(ws, 'dador_num', 'VALOR', 2));
      const d = instrucao(ws, 'dizer');
      const l = instrucao(ws, 'log');
      r.getInput('CORPO')!.connection!.connect(d.previousConnection!);
      encadear(d, l);
      ligar(d, 'VALOR', valor(ws, 'texto', 'VALOR', 'olá'));
      ligar(l, 'VALOR', valor(ws, 'variavel', 'NOME', 'total'));
      encadear(g, r);
    });
    try {
      const lido = paraBlocoLeigo(c.estado);
      const volta = paraBlocoLeigo({ blocks: { languageVersion: 0, blocks: deBlocoLeigo(lido) } });
      expect(volta).toEqual(lido);
      expect(emitir('python', volta).texto).toBe(emitir('python', lido).texto);
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('uma pilha volta a ser vários blocos de topo, e não um bloco `pilha`', () => {
    // Uma `pilha` não é um bloco do Blockly: são vários blocos de topo. Se o
    // caminho inverso a escrevesse como um bloco, o ecrã do aluno mostrava um
    // bloco que não existe e o programa desaparecia.
    const saida = deBlocoLeigo({
      type: 'pilha',
      inputs: { CORPO: { stack: [{ type: 'log', fields: {}, inputs: {} }] } },
    });
    expect(saida).toHaveLength(1);
    expect(saida[0]!.type).toBe('log');
    expect(deBlocoLeigo(null)).toEqual([]);
  }, PASSO_A_PASSO);

  it('o que o Bloco não consegue levar, fica fora, e não vira um bloco inventado', () => {
    // Um valor sem forma conhecida — um booleano, antes de a Task 11 registar
    // o bloco `logico` — não vira bloco nenhum. Deixar a ranhura vazia é a
    // única resposta honesta: um bloco inventado apareceria no ecrã do aluno
    // como uma coisa que ele não colocou. E «vazio» é **visível**.
    const saida = deBlocoLeigo({ type: 'log', fields: {}, inputs: { VALOR: { valor: true } } });
    expect(saida[0]!.inputs?.VALOR).toBeUndefined();
  }, PASSO_A_PASSO);
});

describe('o vocabulário vem da projeção, e não de uma lista neste ficheiro', () => {
  it('o registo devolve exatamente os blocos que a projeção declara', () => {
    // É este teste que diz que a fatia do SQL não tem de voltar a este
    // ficheiro: `obter('sql').blocos` é outra lista, e o que o ecrã oferece
    // segue a lista.
    expect(registarBlocos('python')).toEqual(obter('python').blocos);
    expect(registarBlocos('java')).toEqual(obter('java').blocos);
  }, PASSO_A_PASSO);

  it('a caixa de ferramentas oferece a linguagem escolhida, e nada mais', () => {
    const caixa = criarToolbox('python');
    const instr = caixa.contents.find((c) => c.name === 'Instruções')!;
    expect(instr.contents.map((b) => b.type)).toEqual(obter('python').blocos);
    // Os blocos de valor são de todas as linguagens, e por isso não estão em
    // `obter('python').blocos`. Uma categoria que os repetisse seria o mesmo
    // bloco duas vezes no ecrã.
    const valores = caixa.contents.find((c) => c.name === 'Números e texto')!;
    expect(valores.contents.map((b) => b.type)).toEqual(['dador_num', 'texto', 'variavel']);
  }, PASSO_A_PASSO);

  it('as duas linguagens que existem dão a mesma lista, e isso é de propósito', () => {
    // O mesmo conjunto de instruções em duas linguagens é o que faz a
    // linguagem ser a *sintaxe* e não o vocabulário — que é o que a spec §6.4
    // corrigiu. Um teste que as igualasse sem dizer porquê parece um teste
    // redundante; com a frase em cima, é a afirmação de que a diferença
    // entre Python e Java ainda não chegou ao ecrã.
    expect(obter('java').blocos).toEqual(obter('python').blocos);
  }, PASSO_A_PASSO);
});

describe('a área de blocos', () => {
  it('monta, e o programa que veio de fora está no ecrã', () => {
    // Este é o teste que apanha a versão do plano, que saltava a primeira
    // aplicação do programa com um `primeira` de `ref`: a lição abria em
    // branco, e o bloco inicial do passo nunca aparecia.
    const aoMudar = vi.fn();
    const carregar = { type: 'guardar', fields: { nome: { valor: 'total' } }, inputs: { VALOR: { valor: 5 } } };
    render(<Blocos chave="p1" linguagem="python" aoMudar={aoMudar} carregar={carregar} />);
    expect(screen.getByTestId('area-blocos')).toBeInTheDocument();
    expect(aoMudar).toHaveBeenCalledWith(carregar);
  }, PASSO_A_PASSO);

  it('quando o ecrã muda, o programa novo é dito — e não só na montagem', async () => {
    const aoMudar = vi.fn();
    render(<Blocos chave="p1" linguagem="python" aoMudar={aoMudar} />);
    expect(aoMudar).toHaveBeenLastCalledWith(null);
    const naMontagem = aoMudar.mock.calls.length;

    const ws = ecraPrincipal();
    const d = ws.newBlock('dizer') as Blockly.BlockSvg;
    const t = ws.newBlock('texto') as Blockly.BlockSvg;
    t.setFieldValue('olá', 'VALOR');
    d.initSvg();
    t.initSvg();
    d.render();
    t.render();
    d.getInput('VALOR')!.connection!.connect(t.outputConnection!);

    // A fila de eventos do Blockly é assíncrona: o evento chega depois do
    // comando, e por isso se espera por ele. Disparar o evento à mão — que é o
    // que a primeira versão fazia, com `ws.fire` — mede um caminho que a
    // pessoa nunca percorre, e o `fire` nem sequer é público na biblioteca.
    await waitFor(() => expect(aoMudar.mock.calls.length).toBeGreaterThan(naMontagem));
    const ultimo = aoMudar.mock.calls.at(-1)![0];
    expect(emitir('python', ultimo).texto).toBe("print('olá')\n");
  }, PASSO_A_PASSO);

  it('o ecrã sobrevive a um novo `aoMudar`, que é o que acontece a cada passo', () => {
    // Se `aoMudar` estivesse no array de dependências, cada estado novo
    // recriaria o ecrã e o aluno perderia o programa a meio de o montar.
    const antes = vi.fn();
    const { rerender } = render(<Blocos chave="p1" linguagem="python" aoMudar={antes} />);
    const d = ecraPrincipal().newBlock('dizer') as Blockly.BlockSvg;
    d.initSvg();
    d.render();
    const depois = vi.fn();
    rerender(<Blocos chave="p1" linguagem="python" aoMudar={depois} />);
    expect(ecraPrincipal().getAllBlocks(false)).toHaveLength(1);
  }, PASSO_A_PASSO);

  it('mudar a chave recria o ecrã, e é para isso que a chave existe', () => {
    // O contrário do teste anterior: com uma chave nova, o programa antigo tem
    // de ir embora, porque o passo é outro.
    const { rerender } = render(<Blocos chave="p1" linguagem="python" aoMudar={vi.fn()} />);
    const d = Blockly.getMainWorkspace().newBlock('dizer') as Blockly.BlockSvg;
    d.initSvg();
    d.render();
    rerender(<Blocos chave="p2" linguagem="python" aoMudar={vi.fn()} />);
    expect(ecraPrincipal().getAllBlocks(false)).toHaveLength(0);
  }, PASSO_A_PASSO);
});

describe('a lição inteira passa pelo ecrã sem perder uma letra', () => {
  const licao = CARREGAR(variavelPython, 'python');
  const todos = [
    ...licao.blocos,
    ...licao.passos.map((p) => p.bloco),
    ...licao.sondas.flatMap((s) => (s.prova.programa === undefined ? [] : [s.prova.programa])),
  ];

  function corpusVazio(b: BlocoLeigo): boolean {
    return (corpoDe(b) ?? []).length === 0;
  }

  /** Um programa do motor, montado num ecrã a sério, lido de volta. */
  function peloEcran(programa: BlocoLeigo): BlocoLeigo | null {
    const ws = ecrã();
    try {
      for (const bloco of deBlocoLeigo(programa)) {
        const feito = Blockly.serialization.blocks.append(bloco, ws);
        const svg = feito as Blockly.BlockSvg;
        svg.initSvg();
        svg.render();
      }
      return paraBlocoLeigo(Blockly.serialization.workspaces.save(ws));
    } finally {
      ws.dispose();
    }
  }

  it('cada bloco da lição, montado no Blockly e lido de volta, escreve o mesmo', () => {
    // O teste que liga esta tarefa à lição da anterior. A lição escreve
    // programas em `BlocoLeigo` e o ecrã lê e escreve `BlocoJson`; nada os
    // obriga a concordar, e o que se perde no caminho é **visível** — um
    // `{ref: 'total'}` que vira uma string `'[object Object]'` dá um programa
    // que corre e dá o resultado errado, que é a pior das maneiras de
    // falhar. O passo de cima passa por um ecrã do Blockly a sério, e não
    // por um objeto parecido com ele, pela mesma razão dos testes de cima.
    for (const b of todos) {
      const volta = peloEcran(b);
      if (b.type === 'pilha' && corpusVazio(b)) {
        // A pilha vazia é o único caso em que a volta não devolve o mesmo
        // bloco, e é o caso em que **não deve**: um ecrã sem blocos não é um
        // programa, e o passo da ficha de leitura começa assim de propósito.
        // A lição que se abre em branco é a lição que ainda não foi feita.
        expect(volta).toBeNull();
        continue;
      }
      expect(volta, `o bloco ${b.type} não voltou`).toEqual(b);
      expect(emitir('python', volta).texto).toBe(emitir('python', b).texto);
    }
  }, PASSO_A_PASSO);

  it('e nenhum deles escreve `undefined` depois da volta', () => {
    // A prova negativa. Um tradutor que perde um campo dá `undefined` e o
    // aluno lê `undefined = 5` — e a lição continua a passar nos testes que
    // só perguntam se o programa é aceite.
    for (const b of todos) {
      const escrito = emitir('python', peloEcran(b)).texto;
      expect(escrito).not.toMatch(/undefined/);
      expect(escrito).not.toMatch(/\[object Object\]/);
    }
  }, PASSO_A_PASSO);
});
