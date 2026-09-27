import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { CATALOGO } from './catalogo';
import { SeletorLinguagem } from './SeletorLinguagem';
import { Aplicacao } from './Aplicacao';
import { LINGUAGENS, NOMES } from '../../nucleo/tipos';
import type { Language } from '../../nucleo/tipos';
import { temLicao } from '../../conteudo';
import { temProjecao } from '../../projecoes/registo';

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


/** O cartão de uma linguagem. As asserções são sobre *qual* cartão
 *  mostra o quê: uma busca no ecrã inteiro mediria o produto errado,
 *  porque duas das seis opções partilham de propósito uma linha — a mesma
 *  atribuição em Python e em Go é a comparação que a pessoa está a fazer. */
function cartaoDe(container: HTMLElement, linguagem: Language): HTMLElement {
  const achado = container.querySelector(`[data-linguagem="${linguagem}"]`);
  if (achado === null) throw new Error(`o seletor não mostra o cartão de ${linguagem}`);
  return achado as HTMLElement;
}

describe('O catálogo de linguagens', () => {
  it('traz as seis, pela ordem do produto, todas visíveis', () => {
    // Uma opção que desaparece em silêncio é a forma mais barata de mentir
    // sobre um produto. As seis estão no ecrã desde o primeiro momento, e as
    // cinco que não estão prontas dizem porquê.
    expect(CATALOGO).toHaveLength(LINGUAGENS.length);
    expect(CATALOGO.map((o) => o.linguagem)).toEqual([...LINGUAGENS]);
    expect(CATALOGO.map((o) => o.nome)).toEqual(LINGUAGENS.map((l) => NOMES[l]));
  }, PASSO_A_PASSO);

  it('a prontidão vem da projeção e da lição, e não de uma lista escrita à mão', () => {
    // **Este é o teste que responde ao ponto 5 do `Review Focus`.** O plano
    // escrevia `pronta: true` e `pronta: false` à mão em cada uma das seis,
    // e uma lista escrita à mão diverge do ficheiro no dia em que a
    // projeção de Go chega: o ecrã continuaria a dizer «Ainda não há
    // projeção de Go» com a projeção instalada e os testes a passar.
    //
    // Aqui a afirmação é a igualdade com o estado real do produto, calculada
    // a partir de `temProjecao` e de `temLicao`. Se um dia a projeção de Go
    // entrar, este teste fica vermelho a dizer que a opção devia estar
    // pronta — que é a frase que alguém precisa de ler.
    for (const opcao of CATALOGO) {
      expect(opcao.pronta).toBe(
        temProjecao(opcao.linguagem) && temLicao(opcao.linguagem),
      );
    }
  }, PASSO_A_PASSO);

  it('só uma está pronta no primeiro corte, e é a do Python', () => {
    const prontas = CATALOGO.filter((o) => o.pronta);
    expect(prontas.map((o) => o.linguagem)).toEqual(['python']);
  }, PASSO_A_PASSO);

  it('cada opção mostra três linhas verdadeiras, e nenhuma é uma descrição', () => {
    for (const opcao of CATALOGO) {
      expect(opcao.exemplo).toHaveLength(3);
      for (const linha of opcao.exemplo) {
        expect(linha.trim()).not.toBe('');
        // A pergunta que o seletor faz ao aluno é «isto?», e uma linha que
        // descreve em vez de mostrar não deixa ninguém responder.
        expect(linha).not.toMatch(/linguagem|bloco|programa|exemplo/i);
      }
    }
    // E não são as mesmas três linhas para todas: seis opções com o mesmo
    // texto seriam uma opção só, escrita seis vezes.
    const exemplos = new Set(CATALOGO.map((o) => o.exemplo.join('\n')));
    expect(exemplos.size).toBe(CATALOGO.length);
  }, PASSO_A_PASSO);

  it('cada opção bloqueada diz o que falta, e uma opção pronta não diz nada', () => {
    for (const opcao of CATALOGO) {
      if (opcao.pronta) {
        expect(opcao.falta).toBe('');
        continue;
      }
      // A razão **nomeia a linguagem**: «Ainda não está escrito» sem dizer
      // o quê nem onde é uma frase que serve para seis opções e não informa
      // sobre nenhuma.
      expect(opcao.falta).toContain(NOMES[opcao.linguagem]);
      // E diz **qual das duas** falta, porque são duas coisas diferentes com
      // consequências diferentes: sem projeção a opção nem existe; com
      // projeção e sem lição é uma lição por escrever, e o motor já está
      // verificado por trás.
      const semProjecao = !temProjecao(opcao.linguagem);
      const semLicao = !temLicao(opcao.linguagem);
      expect(opcao.falta).toMatch(semProjecao && semLicao ? /projeção/ : /lição/);
    }
  }, PASSO_A_PASSO);
});

describe('O seletor de linguagem', () => {
  it('mostra as seis, com o nome e as três linhas de cada uma', () => {
    // Cada linha é procurada **dentro do cartão da sua linguagem**, e não no
    // ecrã inteiro. `total = total + 1` é uma linha verdadeira de Python e
    // uma linha verdadeira de Go — a mesma escrita, e é essa a comparação
    // que a pessoa faz ao escolher. Uma busca no ecrã inteiro encontraria as
    // duas e atirava uma exceção, e o teste passava a medir a ambiguidade
    // em vez do ecrã.
    const { container } = render(<SeletorLinguagem opcoes={CATALOGO} aoEscolher={() => {}} />);
    for (const opcao of CATALOGO) {
      const cartao = cartaoDe(container, opcao.linguagem);
      expect(within(cartao).getByRole('heading', { name: NOMES[opcao.linguagem] })).toBeInTheDocument();
      // As três linhas vivem num `<pre>` só, e o `getByText` compara o texto
      // todo do elemento depois de dobrar os espaços: `total = 5` nunca
      // iguala `total = 5\nprint(total)\ntotal = total + 1`, e o teste
      // atirava com a mensagem «não achei o texto» sobre um ecrã que estava
      // certo. O que interessa é linha a linha, e uma linha é uma linha da
      // lista do catálogo — daí a comparação ser feita sobre as linhas.
      const exemplo = cartao.querySelector('.seletor-exemplo');
      const escritas = (exemplo?.textContent ?? '').split('\n');
      expect(escritas).toEqual(opcao.exemplo);
    }
  }, PASSO_A_PASSO);

  it('só habilita a que está pronta, e nenhuma das outras tem botão de escolha', () => {
    render(<SeletorLinguagem opcoes={CATALOGO} aoEscolher={() => {}} />);
    // A forma do teste importa: `getByRole('button', { name: 'Go' })` casa
    // com «Go» e não com «Google» porque aqui não há «Google», mas o plano
    // antigo escrevia `/Java/` e esse padrão casa com **«Java» e
    // «JavaScript» ao mesmo tempo** — dois elementos, e o `getBy` atira
    // uma exceção em vez de testar o que diz. Por isso a comparação é pelo
    // id da linguagem, que é uma coisa só.
    const botoes = screen.getAllByRole('button');
    expect(botoes).toHaveLength(CATALOGO.filter((o) => o.pronta).length);
    for (const opcao of CATALOGO.filter((o) => o.pronta)) {
      const botao = screen.getByRole('button', { name: `Começar ${NOMES[opcao.linguagem]}` });
      expect(botao).toBeEnabled();
    }
  }, PASSO_A_PASSO);

  it('cada opção bloqueada mostra a razão, e nenhuma desaparece em silêncio', () => {
    const { container } = render(<SeletorLinguagem opcoes={CATALOGO} aoEscolher={() => {}} />);
    for (const opcao of CATALOGO) {
      if (opcao.pronta) continue;
      // A razão está no ecrã **antes** de qualquer clique, e não aparece
      // depois de uma tentativa falhada. Um aluno que chegue ao fim da lista
      // tem de saber o que está a ver e porquê, sem descobrir que não pode
      // escolher.
      expect(cartaoDe(container, opcao.linguagem).textContent).toContain(opcao.falta);
    }
  }, PASSO_A_PASSO);

  it('escolher a pronta entrega a linguagem ao ecrã', () => {
    const aoEscolher = vi.fn<(l: Language) => void>();
    render(<SeletorLinguagem opcoes={CATALOGO} aoEscolher={aoEscolher} />);
    fireEvent.click(screen.getByRole('button', { name: `Começar ${NOMES.python}` }));
    expect(aoEscolher).toHaveBeenCalledWith('python');
  }, PASSO_A_PASSO);

  it('não há caminho para um ecrã em branco: as bloqueadas não têm botão nenhum', () => {
    // Um `<option disabled>` não se pode clicar — nem a pessoa, nem um
    // teste, sem `UNSAFE_`. O plano antigo testava o que acontecia ao clicar
    // numa opção desabilitada com `UNSAFE_getByRole`, que é um estado que o
    // browser não permite alcançar. A garantia real não é «o clique é
    // inofensivo»: é que **não existe o botão**. Se não existe, não há
    // caminho para o ecrã em branco, e não há estado escondido à espera de
    // um clique.
    render(<SeletorLinguagem opcoes={CATALOGO} aoEscolher={() => {}} />);
    for (const opcao of CATALOGO.filter((o) => !o.pronta)) {
      expect(
        screen.queryByRole('button', { name: `Começar ${NOMES[opcao.linguagem]}` }),
      ).not.toBeInTheDocument();
    }
  }, PASSO_A_PASSO);

  it('a opção que não tem botão tem a razão legível, não uma imagem', () => {
    // A razão é texto, e não um `title` nem uma cor. Uma cor não se lê com
    // um leitor de ecrã, e um `title` só aparece com o rato em cima.
    render(<SeletorLinguagem opcoes={CATALOGO} aoEscolher={() => {}} />);
    const opcao = CATALOGO.find((o) => !o.pronta)!;
    expect(screen.getByText(opcao.falta)).toBeInTheDocument();
  }, PASSO_A_PASSO);
});

describe('A entrada do produto', () => {
  it('começa no seletor, e não numa lição', () => {
    // A escolha vem primeiro. Um `main.tsx` com a linguagem escrita à mão é
    // um produto que finge ter seis linguagens e ensina uma.
    render(<Aplicacao />);
    expect(screen.getByRole('heading', { name: NOMES.python })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: NOMES.java })).toBeInTheDocument();
    expect(screen.queryByText('O que é uma variável')).not.toBeInTheDocument();
  }, PASSO_A_PASSO);

  it('escolher Python abre a lição dessa linguagem', () => {
    render(<Aplicacao />);
    fireEvent.click(screen.getByRole('button', { name: `Começar ${NOMES.python}` }));
    // O título da lição é o da lição **dessa** linguagem, e não o de uma
    // lição qualquer: é a escolha que decidiu o que se ensina (§0).
    expect(screen.getByRole('heading', { name: 'O que é uma variável' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: NOMES.python })).not.toBeInTheDocument();
  }, PASSO_A_PASSO);

  it('não escreve o nome de nenhuma lição à mão', () => {
    // A chave da lição sai do `TEXTOS`, e não de uma constante no ecrã. Uma
    // constante 'variavel' escrita no `main.tsx` é uma segunda fonte de
    // verdade sobre que lições existem, e diverge do `TEXTOS` no dia em que
    // se escreve a segunda.
    render(<Aplicacao />);
    fireEvent.click(screen.getByRole('button', { name: `Começar ${NOMES.python}` }));
    // Se a chave viesse de uma constante, trocar a constante abriria uma
    // lição inexistente e o ecrã mostraria o aviso de «Ainda não há lição».
    expect(screen.queryByText(/Ainda não há lição/)).not.toBeInTheDocument();
  }, PASSO_A_PASSO);
});
