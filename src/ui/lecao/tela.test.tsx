import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tela } from './Tela';
import { CARREGAR } from '../../conteudo';
import type { Bloco, Licao, Momento, Passo } from '../../conteudo/esquema';
import { avaliador } from '../../nucleo/avaliador';
import type { BlocoLeigo } from '../../nucleo/avaliador';
import { classificar, divergir, emitir } from '../../projecoes/avaliar';
import { ROTULOS } from '../tipos';

/** A regra de todas as asserções de texto deste ficheiro.
 *
 *  Nenhuma pergunta de uma lição é escrita aqui. A lição é YAML, e o YAML
 *  quebra as frases de `porque` em linhas de oitenta colunas e volta a
 *  juntá-las; um `getByText` com uma frase tirada de uma linha do ficheiro
 *  falha por causa do embrulho, e o ficheiro de testes acaba a ser uma
 *  segunda cópia da lição que diverge no primeiro parágrafo que alguém
 *  reescreva. Por isso a comparação é sempre sobre o `textContent` do
 *  ecrã inteiro, que é o que a pessoa lê. */
function textoDoEcran(): string {
  return document.body.textContent ?? '';
}

function ecra(): HTMLElement {
  const achado = document.querySelector('main.tela');
  if (achado === null) throw new Error('a lição não está no ecrã');
  return achado as HTMLElement;
}

let LICAO: Licao;

beforeAll(async () => {
  LICAO = await carregada();
});

async function carregada(): Promise<Licao> {
  const { default: bruto } = await import('../../conteudo/python/variavel.yml?raw');
  return CARREGAR(bruto, 'python');
}

/** O índice do primeiro passo que a sondagem deixa por satisfazer no
 *  programa que o ecrã lhe dá. Existe porque o ecrã **tem** de ter um momento
 *  em que a resposta ainda não é a esperada: sem ele, um ecrã que aceita
 *  tudo passa nos mesmos testes que um ecrã que não sabe o que viu. */
function passoQueNaoBasta(): { indice: number; passo: Passo } {
  const achado = LICAO.passos.findIndex((p, i) => {
    const sonda = LICAO.sondas.find((s) => s.nome === p.sonda);
    if (sonda === undefined) return false;
    return classificar(errosDe(p.bloco)) !== sonda.esperado.classe;
  });
  if (achado < 0) throw new Error('nenhum passo é um teste negativo');
  return { indice: achado, passo: LICAO.passos[achado] as Passo };
}

/** O primeiro passo cujo programa já chega ao que a sondagem espera. */
function passoQueBasta(): { indice: number; passo: Passo } {
  const achado = LICAO.passos.findIndex((p) => {
    const sonda = LICAO.sondas.find((s) => s.nome === p.sonda);
    if (sonda === undefined) return false;
    return classificar(errosDe(p.bloco)) === sonda.esperado.classe;
  });
  if (achado < 0) throw new Error('nenhum passo satisfaz a sua sondagem');
  return { indice: achado, passo: LICAO.passos[achado] as Passo };
}

function errosDe(bloco: BlocoLeigo | null) {
  const a = avaliador();
  a.executar(bloco);
  return a.trace.erros;
}

/** Clica em «Correr o programa» e devolve o que o ecrã disse. */
function correr(): void {
  const botao = screen.queryByRole('button', { name: 'Correr o programa' });
  if (botao === null) throw new Error('não há botão de correr neste momento');
  fireEvent.click(botao);
}

/** Clica no botão cujo nome começa por `nome`. Devolve o que estava lá, ou
 *  atira, que é a mesma coisa: um botão que não existe quando se devia
 *  existir é um defeito, e dizer qual faltou é o diagnóstico. */
function carregar(nome: string): void {
  const botao = screen.getByRole('button', { name: new RegExp(`^${nome}`) });
  fireEvent.click(botao);
}

function abrir(indice: number): void {
  render(<Tela linguagem="python" licao={LICAO} passoInicial={indice} />);
}

/** Quanto tempo um teste que monta o ecrã de cada passo precisa.
 *
 *  Montar o ecrã de um passo é montar o Blockly, e o Blockly não é rápido:
 *  regista blocos, mede o SVG que o jsdom não sabe medir, e monta a
 *  ferramenta. O produto nunca monta onze — monta um — mas um teste que
 *  percorre a lição toda monta onze, e onze montagens em paralelo com os
 *  outros ficheiros passam dos cinco segundos que é o limite por omissão.
 *
 *  O limite escreve-se à mão em vez de se subir o global, porque subir o
 *  global é dizer que todos os testes são lentos quando este é lento por uma
 *  razão que só este tem. */
const PASSO_A_PASSO = 20_000;

describe('O ecrã da lição', () => {
  it('abre no primeiro passo, e não num ecrã vazio', () => {
    // Uma pessoa que escolhe uma linguagem tem de aterrar em qualquer coisa
    // que se possa ler. Um ecrã com o título e nada mais é um ecrã de erro
    // que não parece de erro.
    abrir(0);
    expect(screen.getByRole('heading', { level: 1, name: LICAO.titulo })).toBeInTheDocument();
    expect(textoDoEcran()).toContain(LICAO.porqueTitulo.trim());
    expect(textoDoEcran()).toContain(LICAO.passos[0]?.porque.trim());
  }, PASSO_A_PASSO);

  it('diz em que passo está e o que esse passo é', () => {
    // Quem não sabe onde vai não sabe se já chegou. E o rótulo da fase é o
    // que diz o que se espera de quem está ali: ler, fazer, ou dar nome.
    abrir(3);
    expect(textoDoEcran()).toContain(`Passo 4 de ${LICAO.passos.length}`);
    expect(textoDoEcran()).toContain(ROTULOS[LICAO.passos[3]?.fase ?? 'fazer']);
  }, PASSO_A_PASSO);

  it('cada passo mostra a sua instrução, e não a de outro', () => {
    // A instrução é o `porque` do passo. Uma ecrã que mostrasse sempre o
    // primeiro `porque` da lição pareceria funcionar: há texto, o texto é
    // verdade, e a pessoa faz a coisa errada com a confiança de quem fez
    // a coisa certa.
    for (const [indice, passo] of LICAO.passos.entries()) {
      const { unmount } = render(
        <Tela linguagem="python" licao={LICAO} passoInicial={indice} />,
      );
      expect(textoDoEcran(), `passo ${indice}`).toContain(passo.porque.trim());
      unmount();
    }
  }, PASSO_A_PASSO);

  it('um passo de nomear mostra a palavra, e só um passo de nomear mostra', () => {
    // `variável`, `atribuição` e `erro de execução` são as três palavras que
    // esta lição quer que fiquem. Um passo que as mostra quando não deve
    // está a dar a resposta antes de a pergunta.
    const nomeares = LICAO.passos.filter((p) => p.fase === 'nomear');
    expect(nomeares.length).toBeGreaterThan(0);
    for (const [indice, passo] of LICAO.passos.entries()) {
      const { unmount } = render(
        <Tela linguagem="python" licao={LICAO} passoInicial={indice} />,
      );
      const ecraActual = ecra();
      if (passo.fase === 'nomear') {
        const palavra = ecraActual.querySelector('.passo-palavra');
        expect(palavra?.textContent, `passo ${indice}`).toBe(passo.nomear);
      } else {
        expect(ecraActual.querySelector('.passo-palavra'), `passo ${indice}`).toBeNull();
      }
      unmount();
    }
  }, PASSO_A_PASSO);
});

describe('O painel segue a fonte do momento', () => {
  it('um momento de blocos traz os blocos, o robô e o botão de correr', () => {
    // A fonte é o que decide o painel, e não a fase. Há `explicar` com
    // blocos e `nomear` com blocos, e há um `fazer` que vai trazer o editor
    // de texto. Um ecrã que escolhesse pelo passo em vez do momento teria
    // de repetir a decisão em mais sítio, e os dois sítios divergem.
    abrir(0);
    expect(screen.getByTestId('area-blocos')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'O robô' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Correr o programa' })).toBeInTheDocument();
  }, PASSO_A_PASSO);

  it('a lição de Python não tem um único momento de texto, e o ecrã não finge que tem', () => {
    // Este teste diz uma coisa verdadeira e chata: a primeira lição é toda de
    // blocos e de leitura. O editor de texto existe, é usado pelo menos por
    // um teste, e aparece em nenhum passo desta lição — e um teste que
    // dissesse que aparece mentiria sobre a lição. A lição derivada abaixo
    // é quem o exercita, e diz no seu nome porque é que existe.
    const comTexto = LICAO.passos.flatMap((p) => p.momentos).filter((m) => m.fonte === 'texto');
    expect(comTexto).toHaveLength(0);
    abrir(0);
    expect(screen.queryByLabelText(/O teu código em/)).not.toBeInTheDocument();
  }, PASSO_A_PASSO);

  it('um momento de texto traz o editor e tira os blocos', () => {
    // E o inverso do teste acima: quando o momento é de texto, o ecrã não
    // mostra ao mesmo tempo o editor e a área de blocos. Mostrar os dois é
    // oferecer duas maneiras de fazer a mesma coisa sem dizer qual é a
    // certa, e a pessoa perde tempo a experimentar.
    //
    // A lição derivada é a única coisa montada neste teste. Com um ecrã de
    // blocos do lado, o `not.toBeInTheDocument` media o ecrã do outro passo e
    // passava sem dizer nada sobre o editor.
    const derivada = comPrimeiroMomentoDeTexto();
    render(<Tela linguagem="python" licao={derivada} />);
    expect(screen.getByLabelText(/O teu código em/)).toBeInTheDocument();
    expect(screen.queryByTestId('area-blocos')).not.toBeInTheDocument();
    expect(screen.queryByTestId('robo')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Correr o programa' })).not.toBeInTheDocument();
  }, PASSO_A_PASSO);

  it('o editor diz em que linguagem se escreve, e escreve o que o passo traz', () => {
    // O `id` do editor é `codigo-<linguagem>`, e o texto que lá está é o do
    // passo. Um editor vazio num momento de texto é um editor que pede ao
    // aluno para escrever o ficheiro inteiro antes de ele saber o que o
    // ficheiro é.
    const derivada = comPrimeiroMomentoDeTexto();
    render(<Tela linguagem="python" licao={derivada} />);
    const editor = screen.getByLabelText(/O teu código em/);
    expect(editor).toHaveAttribute('id', 'codigo-python');
  }, PASSO_A_PASSO);
});

describe('O programa do passo já está no ecrã quando a pessoa chega', () => {
  it('correr sem mexer em nada dá o mesmo veredicto que o bloco do passo', () => {
    // Esta é a prova de que o ecrã carrega o programa do passo. Corre-se sem
    // tocar em nada e compara-se com o que o motor diz desse mesmo programa
    // fora do ecrã: se o painel abrisse vazio, o veredicto seria o de um
    // programa vazio, e a diferença apareceria aqui em pelo menos um dos
    // onze passos.
    //
    // A ficha fica de fora, e por uma razão que é a lição e não o teste: o
    // passo que manda ler um ficheiro não tem blocos para correr, e o que
    // se corre ali é o ficheiro — o que o painel de texto e a sondagem de
    // texto medem, e é o objeto do passo oito. Um botão de «Correr» num
    // passo de leitura correria o programa errado, e a pessoa acharia que
    // tinha corrido o ficheiro.
    for (const [indice, passo] of LICAO.passos.entries()) {
      if (passo.momentos.some((m) => m.fonte !== 'blocos')) continue;
      const { unmount } = render(
        <Tela linguagem="python" licao={LICAO} passoInicial={indice} />,
      );
      const esperada = classificar(errosDe(passo.bloco));
      const antes = ecra().querySelector('.sonda-veredicto')?.textContent ?? '';
      // Antes de correr não há veredicto. Um ecrã que mostra um veredicto sem
      // corrida está a dizer que a pessoa viu o que não viu.
      expect(antes, `passo ${indice}, sem correr`).toBe('');
      correr();
      const dita = ecra().querySelector('.sonda-veredicto')?.textContent ?? '';
      // O veredicto do ecrã é uma frase, e a frase tem de conter a classe
      // que o motor deu ao bloco do passo — não a classe que a sondagem
      // queria, que é uma coisa diferente e é o que o teste seguinte mede.
      expect(dita, `passo ${indice}`).toContain(esperada);
      unmount();
    }
  }, PASSO_A_PASSO);

  it('quando o programa do passo já dá o erro, um único correr diz que viu', () => {
    // O caso feliz do gate: o programa que o ecrã dá já é o que a sondagem
    // queria, e a pessoa que carrega em «Correr» vê o que a lição promete.
    const { indice } = passoQueBasta();
    abrir(indice);
    correr();
    expect(ecra().querySelector('.sonda-veredicto')?.textContent ?? '').toContain('viste');
  }, PASSO_A_PASSO);

  it('quando o programa do passo ainda não dá o erro, o ecrã diz o que aconteceu e não diz que viste', () => {
    // O caso negativo, e é o que dá sentido ao primeiro. Sem ele, um ecrã
    // que aceita tudo — ou que diz sempre «viste» — passava nos mesmos
    // testes. Aqui o programa do passo ainda não chega ao que a sondagem
    // espera, e o ecrã tem de dizer o que aconteceu em vez de dar a
    // estória boa.
    const { indice } = passoQueNaoBasta();
    abrir(indice);
    correr();
    const veredicto = ecra().querySelector('.sonda-veredicto')?.textContent ?? '';
    expect(veredicto).not.toContain('viste');
    expect(veredicto).toMatch(/O que aconteceu|aconteceu/i);
  }, PASSO_A_PASSO);

  it('quando não acontece nada, o ecrã diz que não aconteceu nada', () => {
    // Passo 4 da lição: o programa que o ecrã dá é `total = 'olá'`, que em
    // Python corre sem queixar-se, e a sondagem quer um erro. O ecrã não
    // pode inventar uma falha para preencher o sítio — e o que honesto é
    // dizer que o programa passou sem dar nada, porque é isso que aconteceu
    // e é isso que a pessoa tem de preencher.
    const { indice } = passoQueNaoBasta();
    abrir(indice);
    correr();
    const veredicto = ecra().querySelector('.sonda-veredicto')?.textContent ?? '';
    expect(veredicto).toMatch(/Observacao/);
    expect(veredicto).toMatch(/não aconteceu nada|Nada aconteceu/i);
  }, PASSO_A_PASSO);
});

describe('O que o motor diz quando o programa falha', () => {
  it('a razão e o conserto que o motor sugere aparecem no ecrã', () => {
    // A sondagem é o que julga, mas quem escreve a razão é o motor, e é o
    // motor que sabe qual das coisas correram. Um ecrã que dissesse só
    // «errado» obriga a pessoa a adivinhar, e é o oposto do produto.
    //
    // A lição de Python é usada aqui derivada. Dos onze passos dela, os
    // dois que divergem da sondagem não têm erro nenhum — o Python não se
    // queixa, que é metade do que a lição ensina — e os que têm erro batem
    // com a sondagem. Não há, portanto, nenhum passo da lição de verdade
    // onde o ecrã tenha de mostrar uma falha: o caminho está por medir.
    const derivada = comProgramaQueFalha();
    const erros = errosDe(derivada.passos[0]?.bloco ?? null);
    expect(erros.length).toBeGreaterThan(0);
    const primeiro = erros[0];
    render(<Tela linguagem="python" licao={derivada} />);
    correr();
    const painel = ecra().querySelector('.erros');
    expect(painel, 'sem erros no ecrã').not.toBeNull();
    if (primeiro !== undefined) {
      expect(painel?.textContent ?? '').toContain(primeiro.porque);
      if ('remedio' in primeiro) expect(painel?.textContent ?? '').toContain(primeiro.remedio);
    }
  }, PASSO_A_PASSO);

  it('o nome da variável que falta é dito à pessoa, e não só «erro»', () => {
    // O ponto 3 do `Review Focus`. Um erro que não diz qual é a variável
    // obriga a pessoa a ler o programa à procura de um nome, e o programa
    // é a coisa que ela ainda está a aprender a ler.
    const derivada = comProgramaQueFalha();
    const primeiro = errosDe(derivada.passos[0]?.bloco ?? null)[0];
    render(<Tela linguagem="python" licao={derivada} />);
    correr();
    const painel = ecra().querySelector('.erros')?.textContent ?? '';
    expect(primeiro?.porque ?? '').toContain('total');
    expect(painel).toContain('total');
  }, PASSO_A_PASSO);

  it('os erros desaparecem quando o passo muda', () => {
    // Um erro é o que aconteceu numa corrida. Mostrá-lo no passo seguinte
    // é pôr no ecrã uma falha que já não é do programa que está lá, e a
    // pessoa passa a depurar código que não é o dela.
    const derivada = comProgramaQueFalha();
    render(<Tela linguagem="python" licao={derivada} />);
    correr();
    expect(ecra().querySelector('.erros')).not.toBeNull();
    carregar('Ver a resposta');
    carregar('Continuar');
    expect(ecra().querySelector('.erros')).toBeNull();
  }, PASSO_A_PASSO);
});

describe('Continuar', () => {
  it('passa de um momento para o seguinte dentro do mesmo passo', () => {
    // O passo da ficha tem quinze perguntas, uma por linha. Passar de
    // pergunta é a coisa mais banal do ecrã e a que mais vezes se estraga.
    const ficha = LICAO.passos.findIndex((p) => p.referencia !== undefined);
    expect(ficha).toBeGreaterThanOrEqual(0);
    abrir(ficha);
    expect(textoDoEcran()).toContain(LICAO.passos[ficha]?.momentos[0]?.texto ?? 'x');
    carregar('Continuar');
    expect(textoDoEcran()).toContain(LICAO.passos[ficha]?.momentos[1]?.texto ?? 'x');
  }, PASSO_A_PASSO);

  it('no último momento passa para o passo seguinte', () => {
    // O botão que só avançava momento deixava a pessoa presa no fim do
    // último momento, e não havia outro caminho: um ecrã onde se pode ficar
    // sem saída é um ecrã onde se pode perder a lição.
    const ficha = LICAO.passos.findIndex((p) => p.referencia !== undefined);
    const passo = LICAO.passos[ficha];
    if (passo === undefined) throw new Error('a lição não tem ficha');
    abrir(ficha);
    for (const momento of passo.momentos) {
      // Cada linha pergunta uma coisa, e a pergunta não se responde sozinha.
      // Sem isto o botão fica batendo na última pergunta sem sair, e o
      // teste passava a medir uma coisa que a pessoa também não conseguiria.
      fireEvent.change(screen.getByLabelText('A tua resposta'), {
        target: { value: momento.palavras[0] ?? 'resposta' },
      });
      carregar('Continuar');
    }
    expect(textoDoEcran()).toContain(`Passo ${ficha + 2} de ${LICAO.passos.length}`);
  }, PASSO_A_PASSO);

  it('num passo de um momento só, «Continuar» leva ao passo seguinte', () => {
    // Dez dos onze passos são de um momento só. Se «Continuar» não atravessa
    // um momento, não os atravessa.
    abrir(0);
    correr();
    carregar('Continuar');
    expect(textoDoEcran()).toContain(`Passo 2 de ${LICAO.passos.length}`);
  }, PASSO_A_PASSO);

  it('não atravessa um momento que ainda não foi visto, e diz o que falta', () => {
    // O probe decide se o momento está visto — mas o ecrã tem de dizer isso,
    // não advance em silêncio e não fique à espera de um clique que não
    // muda nada. Uma pessoa que clica e nada acontece não sabe se errou.
    abrir(0);
    carregar('Continuar');
    expect(textoDoEcran()).toContain(`Passo 1 de ${LICAO.passos.length}`);
    expect(textoDoEcran()).toMatch(/falta|não.*visto|correr/i);
  }, PASSO_A_PASSO);

  it('uma corrida que não bate com a sondagem não abre a porta', () => {
    // O teste acima mede o que o ecrã **diz**; este mede o que o ecrã
    // **deixa fazer**. São coisas diferentes, e o buraco entre elas foi
    // encontrado por mutação: com a sondagem a deixar de decidir quem viu —
    // a pessoa fez o que fez e o momento ficou visto na mesma — todos os
    // testes passavam. O que se vê é que a corrida não abre a porta, e a
    // linha do que falta continua lá depois de correr.
    const { indice } = passoQueNaoBasta();
    abrir(indice);
    correr();
    expect(ecra().querySelector('.passo-falta'), 'a linha do que falta desapareceu').not.toBeNull();
    carregar('Continuar');
    expect(textoDoEcran()).toContain(`Passo ${indice + 1} de ${LICAO.passos.length}`);
  }, PASSO_A_PASSO);

  it('uma corrida que bate com a sondagem abre a porta sem o reveal', () => {
    // E o inverso, pelo mesmo caminho: sem isto, «a corrida não abre» podia
    // passar porque a porta nunca abreva. Correr chega.
    const { indice } = passoQueBasta();
    abrir(indice);
    correr();
    expect(ecra().querySelector('.passo-falta'), 'o momento ficou por ver').toBeNull();
    carregar('Continuar');
    expect(textoDoEcran()).toContain(`Passo ${indice + 2} de ${LICAO.passos.length}`);
  }, PASSO_A_PASSO);

  it('«Ver a resposta» marca o momento como visto e diz que foi revelada', () => {
    // A fuga honesta. A sondagem é o que julga, mas uma pessoa que não
    // consegue ver não fica presa: há uma saída, e a saída diz na cara que
    // foi uma saída. Um botão que marcasse sem dizer seria a mesma
    // mentira que a do probe silencioso, só que mais pequena.
    abrir(0);
    carregar('Ver a resposta');
    expect(ecra().querySelector('.sonda-revelada')?.textContent ?? '').toMatch(
      /revelad|não.*descobriste/i,
    );
    carregar('Continuar');
    expect(textoDoEcran()).toContain(`Passo 2 de ${LICAO.passos.length}`);
  }, PASSO_A_PASSO);

  it('a resposta revelada é a razão esperada pela sondagem, e não a do motor', () => {
    // São duas fontes diferentes e é uma distinção que vale a pena manter
    // no ecrã: `esperado.porque` é o que a lição quer que a pessoa veja, e
    // a do motor é o que o programa fez. Misturar as duas punha no ecrã uma
    // frase que ninguém escreveu.
    const { indice, passo } = passoQueBasta();
    const sonda = LICAO.sondas.find((s) => s.nome === passo.sonda);
    abrir(indice);
    carregar('Ver a resposta');
    expect(textoDoEcran()).toContain((sonda?.esperado.porque ?? '').trim());
  }, PASSO_A_PASSO);
});

describe('A ficha de leitura', () => {
  it('mostra as linhas do ficheiro com a indentação que ele tem', () => {
    // A linha 6 do ficheiro está dentro de um laço e é essa indentação que
    // diz à pessoa que ela corre três vezes. Um ecrã que a tirasse mostrava
    // um ficheiro que não é o ficheiro, e a pergunta da linha 6 ficava sem
    // resposta possível.
    const ficha = LICAO.passos.findIndex((p) => p.referencia !== undefined);
    const passo = LICAO.passos[ficha];
    if (passo === undefined) throw new Error('a lição não tem ficha');
    const sonda = LICAO.sondas.find((s) => s.nome === passo.sonda);
    const linhas = (sonda?.prova.texto ?? '').trimEnd().split('\n');
    abrir(ficha);
    expect(ecra().querySelector('.ficha-nome')?.textContent).toBe(
      passo.referencia?.nome,
    );
    expect(ecra().querySelectorAll('.ficha-linha')).toHaveLength(linhas.length);
    // Linha 6, a que está dentro do laço. A comparação é sobre o
    // `textContent` cru e não sobre o texto do ecrã, porque o `textContent`
    // do ecrã tem a pergunta por cima.
    const sexta = ecra().querySelector('[data-linha="6"]');
    expect(sexta?.textContent).toBe(linhas[5]);
    expect(sexta?.textContent?.startsWith('    ')).toBe(true);
  }, PASSO_A_PASSO);

  it('pergunta linha a linha, e uma resposta com a palavra conta', () => {
    // A palavra não é a única resposta certa: `palavras` é uma lista, e
    // qualquer uma delas chega. Uma resposta que não tenha nenhuma das
    // palavras não é «errada» — não é resposta nenhuma, e o ecrã diz o que
    // falta sem dizer que a pessoa errou.
    const ficha = LICAO.passos.findIndex((p) => p.referencia !== undefined);
    const passo = LICAO.passos[ficha];
    const momento = passo?.momentos[0] as Momento | undefined;
    if (momento === undefined) throw new Error('a ficha não tem perguntas');
    abrir(ficha);
    const campo = screen.getByLabelText('A tua resposta');
    fireEvent.change(campo, { target: { value: momento.palavras[0] ?? '' } });
    carregar('Continuar');
    expect(textoDoEcran()).toContain(passo?.momentos[1]?.texto ?? 'x');
  }, PASSO_A_PASSO);

  it('uma resposta sem as palavras não é tratada como resposta, e o ecrã não diz «errado»', () => {
    // A §11 do produto: não há respostas erradas, há respostas que não dizem
    // o que a linha fazia. A diferença é entre o produto e um questionário,
    // e o teste é «nenhum sítio do ecrã diz que a resposta está errada».
    const ficha = LICAO.passos.findIndex((p) => p.referencia !== undefined);
    abrir(ficha);
    fireEvent.change(screen.getByLabelText('A tua resposta'), {
      target: { value: 'asdkjhaskdjh' },
    });
    carregar('Continuar');
    expect(textoDoEcran()).not.toMatch(/errad|incorreto|wrong/i);
    expect(textoDoEcran()).toMatch(/falt|não.*cont/i);
  }, PASSO_A_PASSO);

  it('a ficha só aparece no passo que a manda ler', () => {
    // Nove dos onze passos não têm ficha. Uma ficha em todos seria um
    // ficheiro a mais a ler, e a lição desta vez seria sobre um ficheiro
    // que a lição não está a ensinar.
    for (const [indice, passo] of LICAO.passos.entries()) {
      const { unmount } = render(
        <Tela linguagem="python" licao={LICAO} passoInicial={indice} />,
      );
      const fichaActual = ecra().querySelector('.ficha');
      if (passo.referencia === undefined) {
        expect(fichaActual, `passo ${indice}`).toBeNull();
      } else {
        expect(fichaActual, `passo ${indice}`).not.toBeNull();
      }
      unmount();
    }
  }, PASSO_A_PASSO);
});

describe('O painel de texto diz onde o texto se afasta dos blocos', () => {
  it('escrever no editor mostra o que diverge do que os blocos escrevem', () => {
    // A divergência é a T6: o que a pessoa escreveu ao dedo contra o que os
    // blocos que ela viu produziriam. Sem esta linha, o editor de texto é um
    // lugar onde se escreve e não se sabe se se escreveu bem.
    //
    // O botão «Executar» e não a espera pelo temporizador: o painel tem um
    // atraso de duzentos e cinquenta milissegundos para não comparar a cada
    // tecla, e um teste que espera por um relógio que não controla mede o
    // relógio.
    const derivada = comPrimeiroMomentoDeTexto();
    const bloco = blocoDe(derivada);
    const gerado = emitir('python', bloco).texto;
    // Uma troca de nome, e não de um sinal. `total = 5` reescrito como
    // `total += 5` são dois caracteres de diferença, e a tolerância de dois
    // caracteres existe de propósito para apanhar quem escreve à pressa: essa
    // reescrita **não** é divergência, e um teste que a tomasse por
    // divergência estaria a mandar o ecrã gritar com quem só tropeçou.
    const escrito = gerado.replace('total', 'preco');
    const relatorio = divergir('python', bloco, escrito);
    expect(relatorio.ok, 'o texto com outro nome devia divergir').toBe(false);
    expect(
      divergir('python', bloco, gerado.replace('=', '+=')).ok,
      'uma troca de dois caracteres não é divergência',
    ).toBe(true);
    render(<Tela linguagem="python" licao={derivada} />);
    fireEvent.change(screen.getByLabelText(/O teu código em/), { target: { value: escrito } });
    fireEvent.click(screen.getByRole('button', { name: 'Executar' }));
    const painel = ecra().querySelector('.divergencias');
    expect(painel, 'sem divergências no ecrã').not.toBeNull();
    for (const d of relatorio.divergencias) {
      expect(painel?.textContent ?? '').toContain(d.porque);
    }
  }, PASSO_A_PASSO);

  it('escrever o que os blocos escreveriam não mostra divergência nenhuma', () => {
    // E o inverso: um ecrã que mostra divergências quando não há nenhuma é
    // um ecrã que não sabe quando calar-se, e é a mesma do que mostra
    // «viste» sem ter visto. Este teste só vale se comparar pelo mesmo
    // caminho do outro — daí o «Executar» nos dois.
    const derivada = comPrimeiroMomentoDeTexto();
    const bloco = blocoDe(derivada);
    const gerado = emitir('python', bloco).texto;
    expect(divergir('python', bloco, gerado).ok, 'o texto igual devia estar certo').toBe(true);
    render(<Tela linguagem="python" licao={derivada} />);
    fireEvent.change(screen.getByLabelText(/O teu código em/), { target: { value: gerado } });
    fireEvent.click(screen.getByRole('button', { name: 'Executar' }));
    expect(ecra().querySelector('.divergencias')).toBeNull();
  }, PASSO_A_PASSO);

  it('o editor abre com o programa do passo já escrito, e não vazio', () => {
    // Um editor vazio num momento de texto é um editor que pede à pessoa para
    // escrever a linha antes de lhe terem ensinado o que a linha é. O texto
    // vem da projeção — é a mesma linha de blocos, vista na linguagem.
    const derivada = comPrimeiroMomentoDeTexto();
    const esperado = emitir('python', blocoDe(derivada)).texto;
    render(<Tela linguagem="python" licao={derivada} />);
    expect((screen.getByLabelText(/O teu código em/) as HTMLTextAreaElement).value).toBe(esperado);
  }, PASSO_A_PASSO);
});

/** O bloco do primeiro passo, ou uma falha com o nome do ficheiro. */
function blocoDe(licao: Licao): BlocoLeigo {
  const bloco = licao.passos[0]?.bloco;
  if (bloco === undefined) throw new Error('a lição não tem passos');
  return bloco;
}

/** A primeira lição com um programa que falha e uma sondagem à espera de
 *  outra coisa.
 *
 *  Serve para medir o painel de erros, e a medição é necessária: os onze
 *  passos da lição de Python não têm nenhum caminho em que o programa que o
 *  ecrã dá **falhe** e a sondagem espere outra coisa. Os dois que divergem não
 *  têm erro nenhum — o Python aceita e segue, que é o que a lição ensina — e
 *  os que têm erro batem com a sondagem. O painel de erros é, portanto, uma
 *  parte do produto que a lição de verdade nunca chega a mostrar. */
function comProgramaQueFalha(): Licao {
  const passo = LICAO.passos[0] as Passo;
  const falha: Bloco = {
    type: 'log',
    inputs: { VALOR: { valor: { ref: 'total' } } },
  };
  return { ...LICAO, passos: [{ ...passo, bloco: falha }, ...LICAO.passos.slice(1)] };
}

/** A primeira lição transformada: o primeiro momento passa a ser de texto.
 *
 *  Existe porque a lição de Python não tem um momento de texto nenhum, e o
 *  editor de texto é uma parte do produto que precisa de ser exercitada. A
 *  alternativa — escrever um momento de texto na lição de verdade — mudaria
 *  a lição para caber num teste, e a lição é mais importante do que o
 *  teste. O nome da função diz porque é que ela existe, para que ninguém
 *  leia isto e conclua que a lição tem um momento de texto. */
function comPrimeiroMomentoDeTexto(): Licao {
  const passos = LICAO.passos.map((p, i) =>
    i === 0
      ? { ...p, momentos: p.momentos.map((m) => ({ ...m, fonte: 'texto' as const })) }
      : p,
  );
  return { ...LICAO, passos };
}
