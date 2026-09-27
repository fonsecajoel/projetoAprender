import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tela } from './Tela';
import { CARREGAR } from '../../conteudo';
import type { Fonte, Licao, Momento, Passo } from '../../conteudo/esquema';
import { LINGUAGENS, NOMES } from '../../nucleo/tipos';
import type { BlocoLeigo } from '../../nucleo/blocos';
import type { Erro } from '../../nucleo/tipos';
import { avaliarTexto } from '../../projecoes/avaliar';

/** O portão manual, tornado permanente.
 *
 *  O plano escrevia este portão como sete passos «à mão», com a instrução de
 *  não o saltar porque nenhum teste o fazia. Esta ficha é a mesma coisa com
 *  a instrução trocada: o que era um rito de uma vez passou a ser um ficheiro
 *  que corre com o resto. A diferença é que um rito de uma vez só prova que
 *  alguém o fez uma vez.
 *
 *  **Não são os sete passos todos.** Dois deles já medidos não são medidos
 *  outra vez, porque um ficheiro que repete o que outro ficheiro já prova não
 *  fica mais forte — fica mais comprido, e passa a dar a impressão de uma
 *  cobertura que não existe. O mapa é este:
 *
 *  1. O seletor oferece as que existem e diz por que as outras não —
 *     `entrada.test.tsx`, seis e três testes.
 *  2. Escolher Python abre a lição — `entrada.test.tsx`, e `tela.test.tsx`
 *     para o que acontece a seguir.
 *  3. O ficheiro da ficha, e onde ele morre — **aqui**, e em lado nenhum.
 *  4. O painel de texto e o motor, cada um a dizer a sua coisa — **aqui**.
 *  5. `int total = 5;` no painel de Python — **aqui** para o ecrã, e
 *     `python.test.ts` para o motor.
 *  6. Um texto num sítio de número, nos blocos — **aqui**, pelo ecrã.
 *  7. Java a escrever o tipo, e o motor a dizer porquê — **aqui** para o
 *     ecrã, e `dourados.test.ts` para o motor.
 *
 *  E há três coisas que o plano escrevia de uma maneira e que, medidas, são de
 *  outra. Cada uma está escrita no sítio onde o teste a encontra, com a
 *  medição ao lado, porque um ficheiro de testes que corrige o plano em
 *  silêncio deixa o plano errado no sítio em que se vai lê-lo outra vez.
 *
 *  E há um oitavo caminho que este ficheiro não mede e que é preciso dizer
 *  que existe: o `Aplicacao` tem uma ecra que explica que a lição ainda não
 *  está escrita, e essa ecra **não tem porta de entrada**. O seletor não dá
 *  botão a uma linguagem que não tem lição, e é por isso que o ecrã existe
 *  apenas para o caso de alguma vez se chegar ali por outra via — o que
 *  hoje não acontece. Medi-lo exigiria dar uma prop ao `Aplicacao` só para
 *  ele, e uma prop que existe só para um teste é um caminho que se passa a
 *  manter vivo. Fica escrito, e não medido. */

/** O tecto de tempo deste ficheiro.
 *
 *  Montar o ecrã é montar o Blockly, e o Blockly mede um SVG que o jsdom não
 *  sabe medir. A constante de 5 s do Vitest é o que mata metade destes testes
 *  quando o ficheiro corre ao lado dos outros; a de 20 s é a de
 *  `tela.test.tsx`, pelo mesmo motivo e com a mesma conta. */
const PASSO_A_PASSO = 20_000;

/** Os seis nomes, tirados do sítio onde estão escritos.
 *
 *  Uma lista escrita à mão aqui seria uma segunda fonte da verdade sobre as
 *  linguagens, e a segunda fonte divergiria da primeira no dia em que
 *  entrasse uma sétima — sem nenhum teste ficar vermelho. */
const NOMES_DAS_SEIS = LINGUAGENS.map((l) => NOMES[l]);


/** A linha de que o erro se culpa, seja qual for a classe.
 *
 *  `FalhaRuntime` chama-lhe `passo` e `QuebraEquivalencia` chama-lhe `linha`,
 *  e `Recusa` não tem campo nenhum: o seu número está em `origem.passo`, que
 *  é onde o núcleo põe a linha de todas as coisas que não são
 *  `FalhaRuntime`. As três são o mesmo sítio — a linha — e o ficheiro pergunta
 *  pela linha, não pelo nome que a classe lhe dá. */
function linhaDe(e: Erro): number {
  if (e.classe === 'Recusa') return e.origem.passo;
  return e.classe === 'FalhaRuntime' ? e.passo : e.linha;
}

function textoDoEcran(): string {
  return document.body.textContent ?? '';
}

let LICAO: Licao;
let FICHEIRO: { nome: string; linhas: string[] };

beforeAll(async () => {
  const { default: bruto } = await import('../../conteudo/python/variavel.yml?raw');
  LICAO = CARREGAR(bruto, 'python');
  const passo = LICAO.passos.find((p) => p.referencia !== undefined);
  if (passo === undefined || passo.referencia === undefined) {
    throw new Error('a lição já não tem nenhum passo que mande ler um ficheiro');
  }
  // As linhas do ficheiro saem da sondagem, e `referencia` só tem o nome. É
  // assim que o `estado` faz, e é por isso que este ficheiro o faz igual: um
  // ficheiro que mede o ficheiro por um caminho que o ecrã não usa mede o
  // ficheiro errado.
  const texto = LICAO.sondas.find((s) => s.nome === passo.sonda)?.prova.texto;
  if (texto === undefined) throw new Error('a sondagem do ficheiro não tem `texto`');
  FICHEIRO = {
    nome: passo.referencia.nome,
    linhas: texto.trimEnd().split('\n'),
  };
});

/** O texto do ficheiro que a ficha mostra.
 *
 *  Sai da sondagem do passo, e não do `referencia`: o `referencia` é o nome
 *  e mais nada, e a sondagem é onde o ficheiro está escrito. Um teste que
 *  medisse o `referencia` mediria uma coisa que o ecrã não lê. */
function textoDoFicheiro(): string {
  return FICHEIRO.linhas.join('\n') + '\n';
}

function errosDoFicheiro(): Erro[] {
  return avaliarTexto('python', textoDoFicheiro());
}

/** A lição com um passo só, o bloco que se quiser, e a fonte que se quiser.
 *
 *  A lição do Python **não tem** nenhum passo de fonte `texto`: os seus onze
 *  passos são blocos ou leitura, e o painel de texto é uma porta que o
 *  produto tem e que esta lição não abre. Para medir a porta é preciso uma
 *  lição que a abra, e construí-la por cima da lição real — o mesmo
 *  ficheiro, o mesmo primeiro passo, com o bloco e os momentos trocados — é
 *  o que a mantém honesta. Uma lição escrita à mão provaria que o ecrã
 *  funciona com uma lição que este ficheiro inventou.
 *
 *  O `fonte` é um parâmetro e não uma constante porque este ficheiro mede as
 *  duas portas — a dos blocos e a do texto — e uma função que só soubesse
 *  abrir uma delas mediria metade do ecrã sem o dizer. */
function licaoCom(bloco: BlocoLeigo, fonte: Fonte): Licao {
  const momento: Momento = {
    id: 'codigo',
    texto: 'O que diz o teu código?',
    palavras: [],
    fonte,
  };
  const passo: Passo = { ...LICAO.passos[0]!, bloco, momentos: [momento] };
  return { ...LICAO, passos: [passo] };
}

function escrever(codigo: string): void {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: codigo } });
  fireEvent.click(screen.getByRole('button', { name: 'Executar' }));
}

describe('O portão manual, que era um rito e passou a ser um ficheiro', () => {
  it('o ficheiro da ficha é o ficheiro, e o ficheiro morre na linha 12', () => {
    // O passo 3 do portão, e o mais importante dos sete: é o ficheiro que a
    // pessoa nunca viu, e a única verdade sobre ele é a que a projeção diz
    // quando o lê.
    const linhas = textoDoFicheiro().trimEnd().split('\n');
    expect(linhas).toHaveLength(15);
    expect(FICHEIRO.linhas).toEqual(linhas);

    // Cada linha do ficheiro tem a sua pergunta, pela ordem do ficheiro.
    const passo = LICAO.passos.find((p) => p.referencia !== undefined)!;
    const perguntas = passo.momentos.filter((m) => m.fonte === 'leitura');
    expect(perguntas.map((m) => m.id)).toEqual(linhas.map((_, i) => `l${i + 1}`));

    // E o ficheiro morre uma vez, na linha 12. Uma vez — e este número é o
    // que a medição deu. A versão anterior da lição prometia duas, e escrevia
    // «a segunda vem cinco linhas depois». Não vem: em Python uma função que
    // não existe mata o programa na linha em que aparece, e a linha 15
    // nunca corre. A falsehood estava na lição, e não no motor.
    const erros = errosDoFicheiro();
    expect(erros).toHaveLength(1);
    expect(erros[0]?.classe).toBe('FalhaRuntime');
    expect(linhaDe(erros[0]!)).toBe(12);
    expect(erros[0]?.porque).toContain('log');

    // E a linha de que a projeção se culpa é uma linha de que a ficha
    // pergunta. Um ficheiro que rebenta numa linha de que ninguém pergunta
    // tem uma pergunta a mais; esta afirmação é a que apanha esse caso.
    for (const erro of erros) {
      expect(perguntas.map((m) => m.id)).toContain(`l${linhaDe(erro)}`);
    }
  }, PASSO_A_PASSO);

  it('a ficha imprime a medição ao lado da frase, porque a frase é da pessoa', () => {
    // O que este ficheiro não conseguiu fechar com uma regra, e é bom que
    // fique escrito porquê. O defeito encontrado — uma sondagem a prometer
    // duas falhas num ficheiro que dá uma — é uma **frase** que diz mais do
    // que o produto faz. Uma regra que apanhasse isto teria de saber que «a
    // segunda» e «duas que rebentam» são contagens em português, e essa
    // lista envelheceria mal e passaria a ser a fonte da verdade sobre o que
    // o ficheiro faz.
    //
    // O que fica é a medição ao lado da frase, para o olho de quem revê as
    // apanhar. Isto não é um teste de nada: mede e imprime, e por isso não
    // pode ficar vermelho. Está aqui porque um ficheiro que imprime é mais
    // difícil de ignorar do que uma nota num caderno.
    const erros = errosDoFicheiro();
    for (const passo of LICAO.passos.filter((p) => p.referencia !== undefined)) {
      const sonda = LICAO.sondas.find((s) => s.nome === passo.sonda)!;
      const medido = erros.map((e) => `${e.classe} na linha ${linhaDe(e)}`).join(', ');
      const escrito = (sonda.esperado.porque ?? '').trim().split('\n')[0] ?? '';
      console.log(`FICHA medido: ${medido} || a lição escreve: ${escrito}`);
    }
    expect(erros.length).toBeGreaterThan(0);
  }, PASSO_A_PASSO);

  it('a leitura não oferece «Correr o programa», e é de propósito', () => {
    // A segunda metade do passo 3. Correr o ficheiro resolveria a pergunta da
    // linha 12 — o erro apareceria no ecrã e a pergunta ficaria sem resposta
    // — e a ficha existe para a pessoa ler, não para a ver acontecer. A
    // decisão é do produto e por isso tem de estar escrita num teste: sem ele,
    // um dia alguém acrescenta o botão «só aqui», e o botão é a coisa mais
    // óbvia do ecrã.
    render(<Tela linguagem="python" licao={LICAO} passoInicial={8} />);
    expect(screen.queryByRole('button', { name: 'Correr o programa' })).toBeNull();

    // E o ficheiro está lá, linha a linha, todas as quinze.
    for (const linha of FICHEIRO.linhas) {
      expect(textoDoEcran()).toContain(linha);
    }
  }, PASSO_A_PASSO);

  it('o painel de texto compara linha a linha, e a comparação diz o fecho que falta', () => {
    // Os passos 4 e 5 pela porta que o produto tem. O painel de texto
    // **compara** o que se escreve com o que os blocos escrevem; ele não
    // julga, e a diferença é o desenho: quem escreve está a ver a mesma
    // coisa noutra sintaxe, e a pergunta útil é «em que linha é que a minha
    // difere».
    //
    // O plano escrevia que `int total = 5;` tinha de ser recusado com um
    // `porque` que dissesse que a linha não é Python. Isso é o que o
    // **motor** diz, e está medido em `python.test.ts`. O ecrã diz outra
    // coisa, e também verdadeira: a linha tem um `;` que a linguagem não
    // pede. As duas são verdade porque respondem a perguntas diferentes, e
    // este teste existe para que ninguém confunda uma com a outra.
    render(
      <Tela
        linguagem="python"
        licao={licaoCom(
          {
            type: 'guardar',
            fields: { nome: { valor: 'total' } },
            inputs: { VALOR: { valor: 5 } },
          },
          'texto',
        )}
      />,
    );

    // O texto que a projeção escreve já está lá, e é o certo.
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('total = 5\n');

    // Escrever a linha que o painel espera não dá aviso nenhum.
    escrever('total = 5\n');
    expect(textoDoEcran()).not.toContain('ponto-e-vírgula');

    // Escrever com o `;` dá um aviso, e o aviso é sobre o `;`.
    escrever('total = 5;\n');
    expect(textoDoEcran()).toContain('ponto-e-vírgula');
    expect(textoDoEcran()).toContain('Retira o');
  }, PASSO_A_PASSO);

  it('o motor nomeia a variável que está mal, e não a linha', () => {
    // O que o passo 4 do portão queria, com a entrada que o motor conhece.
    // O plano escrevia `total = 'olá'` seguido de `print(total)`, e esperava
    // que a segunda linha falhasse: em Python `print` aceita qualquer coisa,
    // e essa linha corre bem. A entrada que dá a falha pedida é a que soma,
    // e a falha diz o que a lição inteira quer que diga.
    const erros = avaliarTexto('python', "total = 'olá'\ntotal = total + 1\n");
    expect(erros).toHaveLength(1);
    expect(erros[0]?.porque).toContain('total');
    expect(erros[0]?.porque).toContain('texto');
    // «e não uma linha»: a pessoa tem de saber **o quê** está mal antes de
    // poder ir ver **onde**.
    expect(erros[0]?.porque).not.toMatch(/linha \d+/);
    expect(erros[0]?.remedio).toContain('total');

    // E a entrada que o plano escrevia, essa passa — porque passa. Um ficheiro
    // que só mede o que falha deixa passar o que devia ser medido, e o que
    // devia ser medido aqui é que `print` não é o sítio onde um texto se
    // denuncia.
    expect(avaliarTexto('python', "total = 'olá'\nprint(total)\n")).toEqual([]);
  });

  it('nos blocos, um texto num sítio de número não é recusado — e a lição é essa', () => {
    // O passo 6 do portão, pelo ecrã. O plano escrevia: «escolher o bloco
    // `guardar` e tentar dar um texto a um sítio que só aceita número. O
    // robô recusa». **Medido: isso não acontece, e não por defeito.** A
    // correção do motor na T12 tirou a recusa de tipo do caminho dos blocos,
    // e com razão: a lição é em Python, e em Python `total = 'olá'` é uma
    // linha válida. Um produto que a recusasse estaria a ensinar que Python
    // protege o tipo, e é exatamente o contrário do que a lição existe para
    // dizer.
    //
    // A recusa de tipo vive nos dois sítios onde é verdade: o **texto** das
    // quatro linguagens que recusam, e o **ecrã** do robô. E o que o ecrã
    // mostra quando um programa de blocos corre limpo é nada.
    render(
      <Tela
        linguagem="python"
        licao={licaoCom(
          {
            type: 'pilha',
            inputs: {
              CORPO: {
                stack: [
                  {
                    type: 'guardar',
                    fields: { nome: { valor: 'total' } },
                    inputs: { VALOR: { valor: 'olá' } },
                  },
                  { type: 'dizer', inputs: { VALOR: { valor: 'olá' } } },
                ],
              },
            },
          },
          'blocos',
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Correr o programa' }));
    expect(screen.queryByRole('alert')).toBeNull();
  }, PASSO_A_PASSO);

  it('a única recusa que os blocos dão é a do número de voltas, e ela diz o que fazer', () => {
    // A segunda metade do passo 6, e a que a lição usa: o `RANGE_INTEIROS`
    // do núcleo. É a única `Recusa` que o caminho dos blocos produz, nas seis
    // linguagens, porque é o único sítio onde o núcleo tem uma regra que não
    // depende da linguagem.
    render(
      <Tela
        linguagem="python"
        licao={licaoCom(
          { type: 'repetir', inputs: { PASSOS: { valor: 5000 }, CORPO: { stack: [] } } },
          'blocos',
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Correr o programa' }));

    // A recusa aparece em dois sítios ao mesmo tempo — no robô, que é onde a
    // pessoa está a olhar, e na lista do que o programa fez. Um `getByRole` a
    // pedir o primeiro é um teste que passa por acidente e deixa de passar no
    // dia em que o segundo muda de sítio; por isso são os dois.
    const avisos = screen.getAllByRole('alert');
    expect(avisos).toHaveLength(2);
    for (const aviso of avisos) {
      // O limite, dito com o número, e não com a palavra «voltas»: quem
      // escreve `range(5000)` precisa de saber que o tecto são 1000, e um
      // aviso que só dissesse «demasiadas voltas» deixaria a pessoa a
      // adivinhar o número que passa.
      expect(aviso.textContent).toContain('1000 para baixo');
      // E o que se faz a seguir, em palavras que não são do número.
      expect(aviso.textContent).toContain('valor mais pequeno');
      // E não diz em que linguagem, porque o núcleo não sabe e porque a
      // regra é a mesma nas seis. Uma `Recusa` que perguntasse o nome da
      // linguagem seria uma regra do núcleo a saber de sintaxe, e é a parede
      // que este produto inteiro é construído em cima.
      for (const nome of NOMES_DAS_SEIS) {
        expect(aviso.textContent).not.toContain(nome);
      }
    }
  }, PASSO_A_PASSO);

  it('em Java o painel escreve o tipo, e o motor diz porquê', () => {
    // O passo 7 do portão, pelo ecrã. A lição de Java não está escrita — o
    // `dourados.test.ts` diz isso em voz alta e é verdade — e por isso o
    // ecrã de Java é o ecrã da lição de Python com a projeção de Java. É
    // exatamente o que o produto será no dia em que a lição existir, e é o
    // que mede a costura: a mesma lição, outra sintaxe.
    render(
      <Tela
        linguagem="java"
        licao={licaoCom(
          {
            type: 'guardar',
            fields: { nome: { valor: 'total' } },
            inputs: { VALOR: { valor: 5 } },
          },
          'texto',
        )}
      />,
    );
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('int total = 5;\n');
    expect(textoDoEcran()).toContain('O teu código em Java');

    // E o que a pessoa escreve sem o tipo é recusado, com a razão que diz
    // que o tipo se escreve antes do nome.
    const erros = avaliarTexto('java', 'total = 5;\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]?.porque).toContain('antes do nome');
    expect(erros[0]?.remedio).toContain('int total = 5;');
  }, PASSO_A_PASSO);
});
