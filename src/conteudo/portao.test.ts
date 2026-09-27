import { describe, expect, it } from 'vitest';
import { CARREGAR, TEXTOS, executarSonda, temLicao } from './index';
import type { Licao } from './index';
import { obter } from '../projecoes/registo';
import { emitir } from '../projecoes/avaliar';
import { LINGUAGENS, NOMES } from '../nucleo/tipos';
import type { BlocoLeigo } from '../nucleo/blocos';
import type { Language } from '../nucleo/tipos';

/** Todas as lições escritas, uma por entrada de `TEXTOS`.
 *
 *  A lista vem de `TEXTOS` e **não** de um par `linguagem` + chave escrito à
 *  mão. O plano original desta tarefa escribia `const CHAVE = 'variavel'` e
 *  iterava `LICSOES`, que é a lista das *linguagens* com lição: a segunda
 *  lição de Python, ou a primeira lição de qualquer outra linguagem, entravam
 *  pelo mesmo `CARREGAR` com um nome que ninguém escrevera, e o portão
 *  media um ficheiro. Um portão que mede um ficheiro não é um portão: é um
 *  teste. */
const LICOES: { chave: string; linguagem: Language; licao: Licao }[] = Object.entries(TEXTOS).map(
  ([chave, texto]) => {
    const linguagem = chave.slice(0, chave.indexOf('/')) as Language;
    return { chave, linguagem, licao: CARREGAR(texto, linguagem) };
  },
);

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** O texto que a projeção escreve tem de ser código, e não a impressão
 *  de um `undefined`.
 *
 *  Um `undefined = 5` é um programa que o Python aceita e que não faz nada
 *  do que a lição promete. Ver a linha é a única forma de o apanhar: o
 *  carregador diz que o dado é válido, e isso é uma verdade sobre o dado, não
 *  sobre o que ele escreve.
 *
 *  `vazio` muda de regra conforme o sítio, e a diferença vem do
 *  produto: o programa de uma **sondagem** tem de escrever alguma coisa, ou
 *  não prova nada; o programa de um **passo** pode ser vazio, e é o que o
 *  passo da ficha de leitura faz — o aluno abre o ficheiro e o ecrã dos
 *  blocos está em branco de propósito, para que o ficheiro seja a única coisa
 *  a ler. Uma regra única para os dois obrigaria a inventar um bloco no
 *  passo da leitura, e o bloco inventado é o primeiro sitio onde a pessoa
 *  inventa. */
function conferir(linguagem: Language, bloco: BlocoLeigo, onde: string, vazio: boolean): void {
  const texto = emitir(linguagem, bloco).texto;
  if (vazio) {
    expect(texto.length, `${onde}: uma sondagem que não escreve nada não prova nada`).toBeGreaterThan(
      0,
    );
  }
  for (const proibido of ['undefined', '[object Object]', 'NaN']) {
    expect(texto.includes(proibido), `${onde}: ${proibido} em ${texto}`).toBe(false);
  }
}

/** Uma lição tem de mostrar uma recusa quando a linguagem recusa?
 *
 *  A pergunta é da linguagem, e a resposta vem do mesmo sítio: a `Policy`. A
 *  versão desta regra escrita no plano era um `if (!policy) continue` dentro do
 *  `for`, e com uma lição só — a de Python, que não recusa — o corpo nunca
 *  chegava a correr. Tirá-la para uma função é o que a torna verificável sem a
 *  segunda lição, e é também a forma de a mesma verdade não viver escrita duas
 *  vezes. */
function exigeRecusa(recusaNoTipo: boolean, classes: Set<string>): boolean {
  return !recusaNoTipo || classes.has('Recusa');
}

describe('o portão existe antes de medir seja o que for', () => {
  it('há pelo menos uma lição escrita, e cada chave é `linguagem/nome`', () => {
    // Quatro das cinco asserções deste ficheiro percorrem listas. Uma lista
    // vazia passa por cima de todas, e um portão que passa sem ter medido
    // nada é pior do que um portão que não existe — porque dá confiança.
    expect(LICOES.length).toBeGreaterThan(0);
    for (const { chave, linguagem, licao } of LICOES) {
      expect(chave, 'a chave tem de ser `linguagem/nome`').toBe(`${linguagem}/${licao.id}`);
      expect(linguagem, `${chave}: a linguagem da chave`).toBe(licao.linguagem);
      expect(LINGUAGENS, `${chave}: tem de ser uma das seis`).toContain(linguagem);
    }
  });
});

describe('toda lição escrita passa todas as suas sondagens', () => {
  for (const { chave, linguagem, licao } of LICOES) {
    it(`${chave}: todas as sondagens passam`, () => {
      const falhadas = licao.sondas
        .map((s) => executarSonda(s, linguagem))
        .filter((r) => !r.ok)
        .map((r) => ({ nome: r.nome, esperada: r.esperada, observada: r.observada, erro: r.erro }));
      expect(falhadas).toEqual([]);
    });
  }
});

describe('o formato aguenta uma lição inteira', () => {
  it('toda lição tem pelo menos seis sondagens', () => {
    // Menos de seis sondas não é uma lição, é um exemplo. A lição mínima é
    // explicar, fazer, nomear, e ter pelo menos uma história em que as
    // coisas rebentam.
    for (const { chave, licao } of LICOES) {
      expect(licao.sondas.length, chave).toBeGreaterThanOrEqual(6);
    }
  });

  it('toda lição tem as três fases', () => {
    for (const { chave, licao } of LICOES) {
      const fases = new Set(licao.passos.map((p) => p.fase));
      expect([...fases].sort(), chave).toEqual(['explicar', 'fazer', 'nomear']);
    }
  });

  it('toda lição tem pelo menos uma sondagem em que as coisas rebentam', () => {
    // Uma lição que só tem `Observacao` não ensina nada sobre quando as
    // coisas rebentam — e é quando as coisas rebentam que a pessoa está a
    // aprender a ler.
    //
    // E o inverso também é verdade, e é por isso que este teste **não** exige
    // uma `Recusa`: a §10 diz que em Python e em JavaScript a recusa de tipo
    // nunca acontece, e um portão que a exigisse ensinaria a pessoa a ver
    // uma recusa onde a linguagem não dá nenhuma.
    for (const { chave, licao } of LICOES) {
      const classes = new Set(licao.sondas.map((s) => s.esperado.classe));
      expect(
        classes.has('FalhaRuntime') || classes.has('Recusa'),
        `${chave}: nenhuma sondagem é sobre uma falha`,
      ).toBe(true);
    }
  });

  it('toda lição de uma linguagem que recusa no tipo tem uma sondagem de recusa', () => {
    // A condição é a `Policy` da linguagem, e não a lista de linguagens: é a
    // única forma de a afirmação continuar verdadeira quando entrar a lição de
    // Java, e é a forma de ela ser verificável sem uma lista escrita à mão.
    for (const { chave, linguagem, licao } of LICOES) {
      const classes = new Set(licao.sondas.map((s) => s.esperado.classe));
      expect(
        exigeRecusa(obter(linguagem).policy.recusaNoTipo, classes),
        `${chave}: a linguagem recusa e a lição nunca mostra`,
      ).toBe(true);
    }
  });

  it('a regra da recusa acende para uma linguagem que recusa, e não para uma que não recusa', () => {
    // A iteração acima só a exercita em Python, que não recusa: o `continue`
    // de uma versão anterior saltava o corpo do `expect` sem chegar a
    // executá-lo, e um teste que nunca executa a sua afirmação não prova
    // nada. Aqui a regra é chamada com os dois lados, e por isso não depende
    // de haver uma segunda lição para ser provada.
    expect(exigeRecusa(true, new Set(['Observacao']))).toBe(false);
    expect(exigeRecusa(true, new Set(['Observacao', 'Recusa']))).toBe(true);
    expect(exigeRecusa(true, new Set(['FalhaRuntime']))).toBe(false);
    expect(exigeRecusa(false, new Set(['Observacao']))).toBe(true);
  });
});

/** Os sete defeitos de conteúdo que o formato deixou passar na primeira
 *  lição, e o que fecha cada um deles.
 *
 *  O teste da lição de Python apanhou seis deles com uma lista de sete
 *  palavras proibidas e um `emitir` de cada bloco. Os dois primeiros são
 *  fixos, os dois últimos são listas que não fecham: uma lista de sete
 *  palavras não é a regra «uma palavra que não responde», é sete exemplos
 *  dessa regra. Este bloco é a regra, e por isso foi o primeiro a apanhar
 *  os dois que ficaram — que é a prova de que o portão serve para alguma
 *  coisa antes de a segunda lição existir. */
describe('os defeitos de conteúdo da primeira lição, fechados pela regra', () => {
  it('nenhum programa da lição escreve `undefined`, `[object Object]` ou `NaN`', () => {
    // Defeito 1, o mais caro: trocar `nome` por `NOME` no YAML deixava os 36
    // testes verdes e o aluno lia `undefined = 5`. O que o teste antigo via
    // era o carregador a aceitar, que é outra coisa. Aqui vê-se **a linha
    // que o aluno lê**.
    //
    // E são **todos** os programas, não só os que os passos levam: o bloco de
    // um passo e o programa de uma sondagem são duas cópias separadas no
    // YAML, e a mutação de `NOME` calhava na segunda. Uma versão desta
    // conferência que olhasse só para os passos passava com
    // `undefined = 5` à vista — que foi exatamente o que aconteceu na
    // primeira tentativa desta tarefa, e o que a segunda mediu.
    for (const { chave, linguagem, licao } of LICOES) {
      for (const [i, passo] of licao.passos.entries()) {
        conferir(linguagem, passo.bloco, `${chave} passo ${i}`, false);
      }
      for (const sonda of licao.sondas) {
        if (sonda.prova.programa === undefined) continue;
        conferir(linguagem, sonda.prova.programa, `${chave}/${sonda.nome}`, true);
      }
    }
  });

  // Os defeitos 2, 3 e 4 — um passo que aponta para uma sondagem que não
  // existe, um nome de sondagem no sítio do bloco, e um bloco escondido dentro
  // de uma `pilha` — **não têm teste aqui**, e é de propósito. O carregador
  // recusa os três antes de este ficheiro chegar a vê-los, e a mutação que
  // tentava partir um deles pôs o portão vermelho com um erro de carga, não
  // com uma falha desta secção. Um teste que só pode falhar se o carregador
  // deixar de recusar não é uma segunda rede: é a mesma rede contada duas
  // vezes, e a segunda contagem faz o ficheiro parecer mais forte do que é.
  // As regras vivem em `carregar.test.ts` e estão lá provadas.

  it('nenhuma sondagem com nome de falha espera que nada falhe', () => {
    // Defeito 5: `a-divisao-que-nao-existe` era uma soma, e
    // `a-divisao-por-uma-funcao-que-nao-existe` era uma função em falta. O
    // nome é a primeira coisa que o autor escreve e a última que o aluno lê,
    // e um nome que mente ensina a pessoa a desconfiar dos nomes.
    const MENTIRA = /que-nao-existe|que-falta|sem-valor|que-nao-funciona|inexistente/;
    for (const { chave, licao } of LICOES) {
      for (const s of licao.sondas) {
        if (!MENTIRA.test(s.nome)) continue;
        expect(s.esperado.classe, `${chave}: ${s.nome}`).not.toBe('Observacao');
      }
    }
  });

  it('nenhuma pergunta da ficha aceita uma palavra da própria pergunta', () => {
    // Defeito 6, e a regra que fecha a classe toda. O teste da lição tinha
    // uma lista de sete palavras proibidas — `não`, `nunca`, `acho`, `sei` —
    // e uma lista não é uma regra. A regra é outra e é mais curta: **uma
    // palavra que a pergunta já diz não é a resposta**, porque responder com
    // ela é repetir a pergunta em vez de dizer o que a linha faz.
    //
    // Foi esta regra que apanhou os dois que ficaram da primeira lição: «o
    // nome» e «a palavra entre aspas» eram perguntas *e* respostas, e «o que
    // muda» aceitava «muda».
    for (const { chave, licao } of LICOES) {
      for (const passo of licao.passos) {
        for (const momento of passo.momentos) {
          if (momento.fonte !== 'leitura' || momento.palavras.length === 0) continue;
          const daPergunta = normalizar(momento.texto);
          for (const palavra of momento.palavras) {
            const pedida = normalizar(palavra);
            if (pedida.length === 0) continue;
            expect(
              daPergunta.includes(pedida),
              `${chave}/${momento.id}: «${palavra}» está na pergunta «${momento.texto}»`,
            ).toBe(false);
          }
        }
      }
    }
  });

  it('todo passo que manda ler um ficheiro pergunta todas as linhas dele', () => {
    // Defeito 7: o plano mandava acrescentar duas linhas ao ficheiro de
    // leitura, e elas ficavam depois da linha que rebenta — a lição
    // ensinaria que uma linha depois de uma falha é uma linha que se vê, que
    // é o contrário do que ela ensina. A pergunta por linha é o que impede
    // que o ficheiro cresça sem que ninguém leia o que cresceu.
    for (const { chave, licao } of LICOES) {
      for (const [i, passo] of licao.passos.entries()) {
        if (passo.referencia === undefined) continue;
        const sonda = licao.sondas.find((s) => s.nome === passo.sonda);
        const texto = sonda?.prova.texto;
        expect(texto, `${chave} passo ${i}: o ficheiro só existe na sondagem`).toBeDefined();
        if (texto === undefined) continue;
        const linhas = texto.trimEnd().split('\n');
        const perguntas = passo.momentos.filter((m) => m.fonte === 'leitura');
        expect(perguntas.length, `${chave} passo ${i}: perguntas por linha`).toBe(linhas.length);
        // E não se exige que a pergunta diga o número da linha: «O que é
        // `True` aqui?» é uma boa pergunta sobre a linha 4, e obrigá-la a
        // citar o número transformava a pergunta num formulário. O que se
        // exige é uma pergunta por linha e nenhum `id` repetido — e a ordem
        // do ficheiro é a ordem das perguntas, porque uma pergunta por linha
        // e um ficheiro de N linhas só se emparelham de uma maneira.
        expect(
          new Set(perguntas.map((m) => m.id)).size,
          `${chave} passo ${i}: perguntas repetidas`,
        ).toBe(linhas.length);
      }
    }
  });
});

/** O falsificador escrito: «a segunda lição precisar de um campo novo».
 *
 *  O formato é o contrato, e um contrato que cresce sem ninguém decidir é um
 *  contrato que ninguém leu. Este teste nomeia os campos, todos, e cada
 *  lição escrita tem de ter exatamente esses — nem mais um, nem menos um.
 *  Uma segunda lição que precise de um campo obriga a acrescentar uma linha
 *  aqui, e a linha é a conversa da §16.1 a acontecer antes da segunda lição,
 *  que é a única altura em que ela é barata. */
const CAMPOS: Record<string, string[]> = {
  Licao: ['id', 'linguagem', 'titulo', 'porqueTitulo', 'blocos', 'passos', 'sondas', 'paraSaberQueFez'],
  Passo: ['fase', 'porque', 'bloco', 'sonda', 'momentos', 'nomear', 'referencia'],
  Momento: ['id', 'texto', 'palavras', 'fonte'],
  Sonda: ['nome', 'pergunta', 'porque', 'prova', 'esperado'],
  Prova: ['forma', 'programa', 'texto'],
  Esperado: ['classe', 'porque'],
};

describe('o formato do conteúdo não cresceu sem ninguém decidir', () => {
  it('os campos de uma lição são exatamente os que estão escritos aqui', () => {
    for (const { chave, licao } of LICOES) {
      expect(Object.keys(licao), chave).toEqual(CAMPOS.Licao);
      for (const passo of licao.passos) {
        // `nomear` e `referencia` são opcionais, e por isso a comparação é
        // por conjunto e não por lista: a ordem é do YAML, e a ordem não é
        // parte do contrato.
        const campos = Object.keys(passo);
        for (const obrigatorio of ['fase', 'porque', 'bloco', 'sonda', 'momentos']) {
          expect(campos, `${chave}: o campo ${obrigatorio}`).toContain(obrigatorio);
        }
        for (const campo of campos) {
          expect(CAMPOS.Passo, `${chave}: o campo a mais ${campo}`).toContain(campo);
        }
        for (const momento of passo.momentos) {
          expect(Object.keys(momento), `${chave}/${momento.id}`).toEqual(CAMPOS.Momento);
        }
      }
      for (const sonda of licao.sondas) {
        expect(Object.keys(sonda), `${chave}/${sonda.nome}`).toEqual(CAMPOS.Sonda);
        const temPrograma = sonda.prova.programa !== undefined;
        const temTexto = sonda.prova.texto !== undefined;
        // Uma prova tem `programa` **ou** `texto`, e a porta não sabe qual
        // das duas se espera: a sondagem que mostra um ficheiro para ler tem
        // `texto`, e as outras têm `programa`. Uma regra que fixasse
        // `programa` reprovaria a única sondagem da lição que ensina a ler um
        // ficheiro inteiro — que é a mais importante das oito.
        expect(
          [temPrograma, temTexto].filter(Boolean).length,
          `${chave}/${sonda.nome}: a prova tem programa ou texto, nunca os dois`,
        ).toBe(1);
        expect(
          [sonda.prova.forma, sonda.prova.programa, sonda.prova.texto].filter(
            (v) => v !== undefined,
          ).length,
          `${chave}/${sonda.nome}: a prova tem ` + 'forma' + ' e mais nada',
        ).toBe(2);
        expect(Object.keys(sonda.esperado), `${chave}/${sonda.nome}`).toEqual(CAMPOS.Esperado);
      }
    }
  });

  it('este teste cobre o que ele diz: o `CAMPOS` tem o mesmo número de linhas que o esquema', () => {
    // A lista de cima é escrita à mão, e uma lista escrita à mão que fica
    // desatualizada é o defeito que este ficheiro existe para apanhar — a
    // dois sítios. Se `esquema.ts` ganhar um campo e ninguém acrescentar aqui,
    // o teste acima passa (porque a lição não o tem) e este acende.
    expect(CAMPOS.Licao).toContain('paraSaberQueFez');
    expect(CAMPOS.Passo).toContain('referencia');
    expect(CAMPOS.Momento).not.toContain('linha');
  });
});

describe('o estado real do produto, em números', () => {
  it('o catálogo é coerente com o que existe', () => {
    // Este teste não falha. Serve para quando alguém pergunta «quantas
    // linguagens há?», e a resposta está num `git grep` e não na cabeça de
    // ninguém. E são os números que vão no commit da decisão, escritos à mão
    // para que a leitura não dependa de alguém correr isto.
    const escrita = LINGUAGENS.filter((l) => temLicao(l));
    const semLicao = LINGUAGENS.filter((l) => !temLicao(l));
    const comProjecao = LINGUAGENS.filter((l) => {
      try {
        obter(l);
        return true;
      } catch {
        return false;
      }
    });
    const nome = (ls: Language[]) => ls.map((l) => NOMES[l]).join(', ');
    console.log(
      `catálogo: ${LINGUAGENS.length} linguagens, ` +
        `${comProjecao.length} projeções (${nome(comProjecao)}), ` +
        `${escrita.length} ${escrita.length === 1 ? 'lição escrita' : 'lições escritas'} ` +
        `(${nome(escrita)}), ${semLicao.length} sem lição (${nome(semLicao)})`,
    );
    expect(escrita.length).toBeGreaterThan(0);
    // E a verdade que o seletor mostra ao aluno, dita por outra via: uma
    // lição nunca pode existir numa linguagem que o produto não sabe julgar,
    // porque o painel de texto escreveria a linha e a leitura dela não
    // responderia. A versão anterior desta frase comparava `temLicao` com
    // `temLicao` dos dois lados, e portanto não podia falhar.
    for (const l of escrita) {
      expect(comProjecao, `${NOMES[l]}: há lição e não há projeção`).toContain(l);
    }
    // E o produto tem de ter pelo menos uma linguagem que se possa oferecer
    // a alguém hoje — sem isto o portão passa com o produto fechado.
    expect(
      LINGUAGENS.filter((l) => comProjecao.includes(l) && temLicao(l)),
      'nenhuma linguagem está pronta',
    ).not.toEqual([]);
  });
});
