import { describe, expect, it } from 'vitest';
import { CARREGAR } from '../carregar';
import { executarSonda } from '../sondas';
import { avaliarTexto, classificar, emitir } from '../../projecoes/avaliar';
import variavelPython from './variavel.yml?raw';

const licao = CARREGAR(variavelPython, 'python');
const porNome = new Map(licao.sondas.map((s) => [s.nome, s]));

describe('o ficheiro de leitura tem quinze linhas', () => {
  it('a lição tem uma sonda de leitura completa', () => {
    expect(porNome.has('o-que-o-ficheiro-diz')).toBe(true);
  });

  it('o texto lido tem quinze linhas', () => {
    expect(porNome.get('o-que-o-ficheiro-diz')!.prova.texto!.trimEnd().split('\n')).toHaveLength(15);
  });

  it('a linha que rebenta está longe da linha que a estragou', () => {
    // A propriedade mais importante da lição, e a que se pede ao aluno que
    // veja. Se o sintoma estiver na causa, a lição ensina que o sintoma
    // aponta para a causa — e isso é falso.
    //
    // Neste ficheiro o par é a linha 10 (`total = 'olá'`, que estraga) e a
    // linha 15 (`total = total + preco`, que rebenta): cinco linhas de
    // distância, e sem nenhuma pista no meio.
    const linhas = porNome
      .get('o-que-o-ficheiro-diz')!
      .prova.texto!.trimEnd()
      .split('\n')
      .map((l) => l.trim());
    const estragou = linhas.indexOf("total = 'olá'");
    const rebentou = linhas.indexOf('total = total + preco');
    expect(estragou).toBeGreaterThanOrEqual(0);
    expect(rebentou).toBeGreaterThanOrEqual(0);
    // Cinco linhas, e o teste diz cinco. Um teste que só dissesse «vem
    // depois» passaria se alguém encurtasse o ficheiro para duas linhas, e a
    // lição continuaria a parecer certa no `git log`.
    expect(rebentou - estragou).toBe(5);
    // A linha que rebenta usa `total`, e é por isso que o ficheiro é um bom
    // ficheiro: `total` é um nome, e o nome continua a ser o mesmo depois do
    // valor mudar de lado. Não há nada no meio que diga «a causa foi a linha
    // 10» — quem lê tem de voltar atrás e ver que, aí, `total` deixou de ser
    // um número. A distância é que faz o trabalho.
    expect(linhas[rebentou]).toBe('total = total + preco');
    // E a *segunda* linha `print(total)` — a linha 11, que mostra o valor já
    // estragado — está entre as duas. `indexOf` devolveria a primeira, que é
    // a linha 7 e ainda mostra um número; é `lastIndexOf` que dá a pista.
    const mostraDepois = linhas.lastIndexOf('print(total)');
    expect(mostraDepois).toBeGreaterThan(estragou);
    expect(mostraDepois).toBeLessThan(rebentou);
    // E a primeira está antes de tudo, a mostrar um número a sério.
    expect(linhas.indexOf('print(total)')).toBeLessThan(estragou);
  });

  it('e a primeira linha a rebentar é a função que não existe, não o tipo', () => {
    const erros = avaliarTexto('python', porNome.get('o-que-o-ficheiro-diz')!.prova.texto!);
    // `log` não é uma falha de tipo. É uma função que não escreveste, e o
    // Python só diz isso a correr. A lição tem de não misturar as duas
    // coisas, que é a confusão mais comum de quem está a começar.
    //
    // E o teste afirma **qual** é a primeira, e não só que há uma: um
    // ficheiro cujas duas falhas fossem do mesmo género ensinaria a confusão
    // que a lição diz evitar.
    expect(erros[0]!.porque).toMatch(/log/);
    expect(erros[0]!.porque).toMatch(/não existe/);
    expect(erros[0]!.porque).not.toMatch(/número/);
  });

  it('cada linha do ficheiro é lida sem erro de sintaxe', () => {
    const erros = avaliarTexto('python', porNome.get('o-que-o-ficheiro-diz')!.prova.texto!);
    // O ficheiro é Python legível de ponta a ponta. Uma recusa a mais ou a
    // menos aqui significa que o `ler` mente, e o aluno que o lê leva a
    // lição errada antes de a ler.
    const deLeitura = erros.filter((e) => e.porque.includes('não é Python'));
    expect(deLeitura).toEqual([]);
  });
});

describe('a lição tem a forma que a spec pede', () => {
  it('os três tempos aparecem, e o último passo é um NOMEAR', () => {
    const fases = licao.passos.map((p) => p.fase);
    expect(fases[0]).toBe('explicar');
    expect(fases).toContain('fazer');
    expect(fases).toContain('nomear');
    expect(fases.at(-1)).toBe('nomear');
  });

  it('ninguém nomeia antes de fazer: há sempre um FAZER antes do primeiro NOMEAR', () => {
    const fases = licao.passos.map((p) => p.fase);
    expect(fases.indexOf('fazer')).toBeLessThan(fases.indexOf('nomear'));
  });

  it('as palavras nomeadas são as três da lição, e são palavras', () => {
    // O `nomear` não é uma quarta fase com mais texto: é a fase em que a
    // palavra aparece sozinha, grande, e é a palavra que o aluno leva. Por
    // isso o limite é de palavras e não de frases — «erro de execução» são
    // duas, e «atribuição» é uma; uma frase inteira aqui seria a vista
    // `explicar` de novo, e o aluno sairia dela sem nome nenhum.
    const nomeadas = licao.passos.filter((p) => p.fase === 'nomear').map((p) => p.nomear!);
    expect(nomeadas).toEqual(['variável', 'atribuição', 'erro de execução']);
    for (const palavra of nomeadas) {
      // Três palavras é uma locução, como «erro de execução». Quatro já
      // seria uma frase, e uma frase aqui é a vista `explicar` de novo.
      expect(palavra.split(' ').length).toBeLessThanOrEqual(3);
      // Só minúsculas e acentos do português, mais espaços. Sem ponto final
      // — o ponto é do `porque`, não da palavra — e sem maiúscula, porque a
      // palavra é nomeada e não iniciada.
      expect(palavra).toMatch(/^[a-záàâãéêíóôõúç ]+$/);
    }
  });

  it('a palavra nomeada aparece também escrita no porque do passo', () => {
    // Se a palavra só estivesse no campo `nomear`, o `porque` e a palavra
    // seriam duas fontes da verdade. Ler a vista `nomear` e ler o `porque`
    // têm de dar a mesma palavra.
    for (const passo of licao.passos) {
      if (!passo.nomear) continue;
      expect(passo.porque.toLowerCase()).toContain(passo.nomear.toLowerCase());
    }
  });

  it('todo passo tem pelo menos um momento, e nenhum momento se repete', () => {
    // A regra da T7: um passo sem momentos nunca se completa. E um id
    // repetido faz o `feito` de dois momentos ser o mesmo registo, que é a
    // forma mais discreta de um passo dar-se por concluído sem estar.
    for (const passo of licao.passos) {
      expect(passo.momentos.length).toBeGreaterThan(0);
      expect(new Set(passo.momentos.map((m) => m.id)).size).toBe(passo.momentos.length);
    }
  });

  it('a ficha tem uma pergunta por linha do ficheiro, e são 15', () => {
    const ficha = licao.passos.find((p) => p.referencia !== undefined);
    expect(ficha).toBeDefined();
    const linhas = porNome
      .get(ficha!.sonda)!
      .prova.texto!.trimEnd()
      .split('\n');
    expect(ficha!.momentos).toHaveLength(linhas.length);
    expect(ficha!.momentos).toHaveLength(15);
    // Uma pergunta por linha, pela mesma ordem. A pergunta `lN` é a da linha
    // `N`, e é isso que permite dizer «a linha 10» ao aluno e dizer a ele o
    // que é que está a perguntar.
    expect(ficha!.momentos.map((m) => m.id)).toEqual(linhas.map((_, i) => `l${i + 1}`));
  });

  it('as perguntas da ficha aceitam várias palavras, e nenhuma resposta é errada', () => {
    const ficha = licao.passos.find((p) => p.referencia !== undefined)!;
    for (const m of ficha.momentos) {
      expect(m.fonte).toBe('leitura');
      // Três ou mais sinónimos por pergunta. Uma pergunta com uma palavra só
      // é um teste de ortografia disfarçado de pergunta.
      expect(m.palavras.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('nenhuma palavra das perguntas é uma palavra que não responde', () => {
    // As palavras são somadas com «ou»: uma resposta com uma delas conta.
    // Uma palavra que não responde — o «não» de uma pergunta sobre o que vai
    // acontecer, por exemplo — contaria a resposta errada, e a pergunta que
    // o produto faz deixa de ser uma pergunta.
    const ficha = licao.passos.find((p) => p.referencia !== undefined)!;
    const semResposta = new Set(['não', 'nao', 'nunca', 'nada', 'talvez', 'acho', 'sei']);
    for (const m of ficha.momentos) {
      for (const palavra of m.palavras) {
        expect(semResposta.has(palavra.toLowerCase())).toBe(false);
      }
    }
  });

  it('o ficheiro só existe num sítio: a referência aponta, não repete', () => {
    // A referência tem um nome e nada mais. As linhas estão na sonda, e um
    // segundo sítio seria uma segunda versão do ficheiro — a que divergiria
    // sem ninguém dar por isso, e a lição deixaria de ser sobre o ficheiro
    // que o aluno está a ler.
    const ficha = licao.passos.find((p) => p.referencia !== undefined)!;
    expect(Object.keys(ficha.referencia!)).toEqual(['nome']);
    expect(porNome.has(ficha.sonda)).toBe(true);
  });

  it('nenhum momento de fora da ficha finge avaliar a resposta', () => {
    // `palavras: []` significa «não se avalia». Um momento fora da ficha com
    // palavras seria o produto a inventar um certo e um errado onde só há
    // blocos e sintaxe.
    for (const passo of licao.passos) {
      if (passo.referencia) continue;
      for (const m of passo.momentos) {
        expect(m.palavras).toEqual([]);
        expect(m.fonte).toBe('blocos');
      }
    }
  });

  it('toda sonda escrita é ensinada por pelo menos um passo', () => {
    // Uma sonda que nenhum passo usa é conteúdo morto: o teste «todas as
    // sondas passam» dá-lhe verde e o aluno nunca a vê. Este é o teste que
    // apanha uma sonda órfã na hora em que se escreve, e não meses depois.
    const usadas = new Set(licao.passos.map((p) => p.sonda));
    expect(licao.sondas.map((s) => s.nome).filter((n) => !usadas.has(n))).toEqual([]);
  });

  it('nenhum passo tem porque vazio, e nenhum é uma instrução', () => {
    for (const p of licao.passos) {
      expect(p.porque.length).toBeGreaterThan(30);
      expect(p.porque).not.toMatch(/^clique|^escreva|^faça |^preste atenção/);
    }
  });

  it('o porque explica, e o título diz o que se aprende', () => {
    expect(licao.titulo).toContain('variável');
    expect(licao.porqueTitulo.length).toBeGreaterThan(30);
  });

  it('diz quando acabou, e não é «acerta todos os exercícios»', () => {
    expect(licao.paraSaberQueFez).not.toMatch(/acerta|acerte|completar todos/i);
    expect(licao.paraSaberQueFez.length).toBeGreaterThan(20);
  });

  it('nenhum texto da lição cita outra linguagem', () => {
    // Uma lição de uma linguagem que só fala de si. Citar a outra é dar ao
    // aluno uma comparação que ele não pode verificar, e é a porta por onde
    // entra a ideia de que a linguagem escolhida é uma das seis em vez de
    // ser a única.
    expect(JSON.stringify(licao)).not.toMatch(/Java|Go\b|TypeScript|SQL|JavaScript/);
  });
});

describe('a lição conta a verdade da tabela de segurança da spec §7', () => {
  it('Python não protege: a lição diz isso, e diz onde a culpa aparece', () => {
    const s = porNome.get('texto-que-nao-e-numero')!;
    expect(s.esperado.classe).toBe('Observacao');
    expect(s.esperado.porque).toMatch(/não avisa|não recusa|aceita/);
  });

  it('e a mesma linha mais adiante já falha, e a sonda diz FalhaRuntime', () => {
    expect(porNome.get('o-erro-que-nao-esta-no-lugar')!.esperado.classe).toBe('FalhaRuntime');
  });

  it('a falha de duas linhas é a do tipo, e só a do tipo', () => {
    // A linha de baixo é `total = total + 1` e não `print(total)`. Com um
    // `print` não há falha nenhuma: mostrar um texto é coisa nenhuma, e a
    // sonda diria que a lição provava a metade errada da verdade.
    //
    // E o `1` em vez de um nome. Com `preco`, a linha falha duas vezes: pelo
    // tipo e por `preco` não existir, e a segunda falha é uma distração que
    // a lição não pode pagar. A lição inteira assenta em a causa estar a uma
    // linha de distância, e uma segunda causa ao lado dessa tirava-lhe o
    // sentido.
    const erros = avaliarTexto('python', porNome.get('o-erro-que-nao-esta-no-lugar')!.prova.texto!);
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toMatch(/guarda texto/);
    expect(erros[0]!.porque).toMatch(/número/);
  });

  it('e a falha está na segunda linha, com a causa na primeira', () => {
    // A lição de Python em duas linhas: o sintoma não está onde está a
    // causa. O teste diz que a distância é uma, e não «maior do que zero».
    const linhas = porNome.get('o-erro-que-nao-esta-no-lugar')!.prova.texto!.trimEnd().split('\n');
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toBe("total = 'olá'");
    expect(linhas[1]).toBe('total = total + 1');
  });

  it('e a lição de Python não tem uma única Recusa — e o teste diz isso', () => {
    // A spec §7 dá a resposta de Python como «não protege, rebenta mais
    // tarde». Uma sonda com `Recusa` seria uma mentira: em Python escrito
    // directamente não há recusa nenhuma. A recusa existe no robô e no painel
    // de texto, que são a Task 11, e não se medem aqui.
    //
    // Este teste existe para ninguém «acrescentar uma sonda de Recusa» para a
    // lição parecer mais completa do que a linguagem é.
    const recusas = licao.sondas.filter((s) => s.esperado.classe === 'Recusa');
    expect(recusas.map((r) => r.nome)).toEqual([]);
  });

  it('e nenhuma sonda da lição promete que o Python recusa', () => {
    for (const s of licao.sondas) {
      expect(s.esperado.porque).not.toMatch(/o Python recusa|Python recusa antes/i);
    }
  });
});

describe('a linha que o aluno lê é a linha que a projeção escreve', () => {
  it('nenhum bloco da lição escreve `undefined` no ecrã do aluno', () => {
    // Prova negativa desta tarefa, e um buraco que só se abre fazendo: trocar
    // `fields.nome` por `fields.NOME` não dá erro de carregador nenhum,
    // porque `campoDe` devolve `undefined` em vez de falhar. Ficavam trinta
    // e seis testes verdes e um aluno a ler `undefined = 5`. O único sítio
    // que apanha o erro é a linha escrita.
    const todos = [
      ...licao.blocos,
      ...licao.passos.map((p) => p.bloco),
      ...licao.sondas.flatMap((s) => (s.prova.programa === undefined ? [] : [s.prova.programa])),
    ];
    for (const b of todos) {
      const escrito = emitir('python', b).texto;
      expect(escrito).not.toMatch(/undefined/);
      expect(escrito).not.toMatch(/\[object Object\]/);
      expect(escrito).not.toMatch(/\bNaN\b/);
      // Uma `pilha` pode ser vazia — a pilha vazia é o ficheiro vazio, e o
      // passo da ficha de leitura começa com o ecrã em branco de propósito.
      // Uma **instrução** não pode: uma linha que não escreve nada é uma
      // linha que o aluno não tem, e o passo sairia como um passo vazio.
      if (b.type !== 'pilha') expect(escrito.trim()).not.toBe('');
    }
  });

  it('e cada `guardar` escreve o nome que a lição escreveu', () => {
    // O teste anterior apanha o nome em falta. Este apanha o nome trocado:
    // o bloco escreve `outro = 5` e a lição diz que é `total`, e nenhuma das
    // sondas dá por isso porque o programa é bem formado nos dois casos.
    for (const b of licao.passos.map((p) => p.bloco)) {
      if (b.type !== 'guardar') continue;
      const nome = (b.fields as Record<string, { valor: unknown }> | undefined)?.nome?.valor;
      expect(nome).toBeTypeOf('string');
      expect(emitir('python', b).texto.trim()).toMatch(new RegExp(`^${String(nome)} = `));
    }
  });
});

describe('todas as sondas passam', () => {
  for (const sonda of licao.sondas) {
    it(`${sonda.nome} passa`, () => {
      const r = executarSonda(sonda, 'python');
      expect({ nome: r.nome, ok: r.ok, erro: r.erro }).toEqual({ nome: sonda.nome, ok: true, erro: null });
    });
  }
});

describe('as sondas que a spec §7 obriga', () => {
  it('cada linha da tabela de segurança tem a sua sonda, e a classe é a da spec', () => {
    // §7: para Python a resposta é «não protege, e rebenta mais tarde». A
    // lição tem de ter as duas metades: a que aceita e a que rebenta.
    expect(classificar(avaliarTexto('python', "total = 'olá'\n"))).toBe('Observacao');
    expect(classificar(avaliarTexto('python', "total = 'olá'\ntotal = total + 1\n"))).toBe('FalhaRuntime');
  });

  it('e a metade que aceita não dá erro nenhum, nem de leitura', () => {
    // A lição inteira assenta nesta linha. Se a projeção passasse a recusá-la,
    // a lição ensinaria o contrário da spec e nenhum teste de sondas
    // repararia: a sonda `texto-que-nao-e-numero` passaria na mesma classe e
    // a lição continuaria a parecer certa.
    const erros = avaliarTexto('python', "total = 'olá'\n");
    expect(erros).toEqual([]);
  });
});
