import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NOMES_TIPO, PainelRobo, PORTA_ENTRADA, PORTA_SAIDA } from './robo';
import type { PortaRobo } from './robo';
import { E, EXPLICACAO_VAZIA, LINGUAGENS, NOMES, restricao, val, valorEm } from '../nucleo/tipos';
import type { Valor } from '../nucleo/tipos';

/** A origem que a recusa traz. É a mesma nos testes todos porque a
 *  localização da recusa é o assunto de outro teste, e escrevê-la à mão em
 *  cada um seria repetir a mesma linha seis vezes sem acrescentar nada. */
const ORIGEM = { bloco: 'guardar', ranhura: 0, passo: 1 };

const VALOR_NUMERICO: Valor = val('número', 7, EXPLICACAO_VAZIA, ORIGEM);
const VALOR_TEXTO: Valor = val('texto', 'olá', EXPLICACAO_VAZIA, ORIGEM);
const VALOR_OITO: Valor = val('número', 8, EXPLICACAO_VAZIA, ORIGEM);

/** A recusa que a pessoa vê quando dá um texto a um sítio de número. Sai do
 *  motor — `E()` é a função de `tipos.ts` que produz todas as recusas — e
 *  não de uma constante escrita à mão. Um teste com a `Recusa` à mão
 *  provaria que o painel mostra o que lhe derem, e não que a frase que a
 *  pessoa vai ler é a que o motor escreveu. */
const RECUSA = E(restricao('número'), VALOR_TEXTO);

/** A porta com este nome, e não o ecrã todo. As asserções deste ficheiro
 *  são sobre *qual* porta mostra o quê: um painel que mostrasse os dois
 *  números no sítio certo mas emendados passaria por uma busca no ecrã
 *  inteiro. */
function portaDe(pai: HTMLElement, id: string): HTMLElement {
  const achada = pai.querySelector(`[data-porta="${id}"]`);
  if (achada === null) throw new Error(`o ecrã não tem a porta ${id}`);
  return achada as HTMLElement;
}

const LISTA: PortaRobo = { id: 'itens', nome: 'itens', tipo: 'lista' };
const PERGUNTA: PortaRobo = { id: 'pergunta', nome: 'pergunta', tipo: 'lógico' };

describe('PainelRobo', () => {
  it('mostra as portas com o nome e o tipo que a porta declara', () => {
    render(<PainelRobo portas={[PORTA_ENTRADA, PORTA_SAIDA]} valores={{}} recusa={null} />);
    expect(screen.getByText('entrada')).toBeInTheDocument();
    expect(screen.getByText('saída')).toBeInTheDocument();
    // O rótulo do tipo sai do registo, e não de uma palavra escrita dentro
    // do componente: um painel que escreve «número» à mão passa a dizer
    // outra coisa no dia em que `NOMES_TIPO` mudar o nome de um tipo.
    for (const porta of [PORTA_ENTRADA, PORTA_SAIDA]) {
      expect(screen.getAllByText(NOMES_TIPO[porta.tipo]).length).toBe(2);
    }
  });

  it('o rótulo do tipo de cada porta vem do registo, em todos os tipos', () => {
    // O teste de cima passa com um painel que escreve «número» à mão,
    // porque as duas portas são de `número` e o registo também diz
    // «número». Só um tipo cujo nome no registo é **diferente** do nome do
    // tipo separa as duas coisas — e o `lógico` é esse tipo, porque o
    // registo diz «sim ou não» e o tipo diz `lógico`. Um painel que
    // escrevesse o nome do tipo à mão passaria o teste de cima e falhava
    // este, que é o que torna a porta legível para quem não sabe programar.
    const { container } = render(
      <PainelRobo portas={[PERGUNTA, LISTA]} valores={{}} recusa={null} />,
    );
    expect(portaDe(container, PERGUNTA.id).textContent).toContain(NOMES_TIPO['lógico']);
    expect(portaDe(container, PERGUNTA.id).textContent).not.toContain('lógico');
    expect(portaDe(container, LISTA.id).textContent).toContain(NOMES_TIPO['lista']);
  });

  it('mostra o valor dentro da porta', () => {
    render(
      <PainelRobo
        portas={[PORTA_SAIDA]}
        valores={{ [PORTA_SAIDA.id]: VALOR_NUMERICO }}
        recusa={null}
      />,
    );
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('mostra um traço quando a porta está vazia', () => {
    render(<PainelRobo portas={[PORTA_SAIDA]} valores={{}} recusa={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('duas portas do mesmo tipo mostram valores diferentes', () => {
    // A interface do plano era `valores: Valor[]` e o painel escolhia «o
    // último valor cujo tipo bate com a porta». Com `entrada` e `saída` as
    // duas de `número` — que é o que o ecrã da lição passa — as duas portas
    // mostravam sempre o mesmo número: a entrada mostrava o valor que
    // acabou de sair. Duas portas do mesmo tipo que mostram o mesmo número
    // ensinam que é o tipo que decide o sítio, e é o contrário: o sítio é uma
    // porta, e a porta é dela.
    //
    // Passa a ser `Record<id da porta, valor>`, que é o que um arrastar
    // produz: um valor num sítio escolhido, e não um valor à solta à espera
    // de que o painel lhe escolha um sítio.
    const { container } = render(
      <PainelRobo
        portas={[PORTA_ENTRADA, PORTA_SAIDA]}
        valores={{ [PORTA_ENTRADA.id]: VALOR_NUMERICO, [PORTA_SAIDA.id]: VALOR_OITO }}
        recusa={null}
      />,
    );
    expect(portaDe(container, PORTA_ENTRADA.id).textContent).toContain('7');
    expect(portaDe(container, PORTA_SAIDA.id).textContent).toContain('8');
  });

  it('uma porta não mostra um valor de outro tipo', () => {
    // A mesma regra por outra causa: o valor não entrou, logo não se mostra.
    // Uma porta de número que mostra «olá» é uma porta que mente sobre o
    // próprio tipo, e o painel não tem autoridade nenhuma para decidir se
    // esse texto pode entrar — quem decide é o motor. O que o painel faz é
    // não mostrar o que o motor não deixou passar.
    const { container } = render(
      <PainelRobo
        portas={[PORTA_ENTRADA]}
        valores={{ [PORTA_ENTRADA.id]: VALOR_TEXTO }}
        recusa={null}
      />,
    );
    expect(portaDe(container, PORTA_ENTRADA.id).textContent).toContain('—');
    expect(screen.queryByText('olá')).not.toBeInTheDocument();
  });

  it('quando há recusa, mostra a razão, o que fazer, e o que devia estar lá', () => {
    // As três coisas, e não uma. A spec §10 é uma regra dura: se uma
    // mensagem aparece sem explicação, é um bug. E a §9 pede «uma recusa com
    // razão e com saída» — a razão sem a saída deixa a pessoa a saber que
    // errou e a não saber o que fazer a seguir. E sem dizer o que estava à
    // espera e o que chegou, a pessoa tem de adivinhar qual dos dois foi o
    // erro.
    render(<PainelRobo portas={[PORTA_ENTRADA]} valores={{}} recusa={RECUSA} />);
    expect(screen.getByText(RECUSA.porque)).toBeInTheDocument();
    expect(screen.getByText(RECUSA.remedio)).toBeInTheDocument();
  });

  it('diz o que a porta aceita e o que lhe chegou, cada um no seu sítio', () => {
    // A recusa tem os dois tipos, e o painel tem de os dizer aos sítios
    // certos. Este teste foi escrito primeiro com a recusa de `número` e
    // `texto`, e era um teste que passava pelo motivo errado: o `porque` que
    // o motor escreve é «Este sítio só aceita número. Recebeste texto.», e
    // por isso `toContain(esperado)` e `toContain(obtido` eram verdadeiros
    // mesmo com a linha apagada do ecrã, e verdadeiros também com
    // `esperado` e `obtido` trocados de sítio. Apagada a linha, catorze
    // testes verdes. Trocados os dois, catorze testes verdes.
    //
    // A recusa de `lógico` e `lista` desfaz as duas armadilhas de uma vez:
    // o `porque` passa a dizer «aceita lógico», e o ecrã diz «sim ou não» —
    // que é o registo a traduzir. E a frase inteira é comparada, para que
    // trocar os dois tipos de sítio também dê vermelho.
    const recusa = E(restricao('lógico'), val('lista', ['a'], EXPLICACAO_VAZIA, ORIGEM));
    expect(recusa.porque).toContain('lógico');
    render(<PainelRobo portas={[PERGUNTA]} valores={{}} recusa={recusa} />);
    expect(screen.getByRole('alert').textContent).toContain(
      'O que esta porta aceita: sim ou não. O que lhe chegou: lista.',
    );
  });

  it('a recusa nunca cita outra linguagem, em nenhuma das seis', () => {
    // O defeito mais caro que este painel podia ter. A v1 da spec punha
    // `protecção: { python, java }` na recusa — o que a *outra* linguagem
    // faria — e a §9 tirou isso: um aluno de Go não sofre por causa do
    // Python. A regra é verificada aqui sobre as seis, pelo nome de cada
    // uma, e sobre o texto todo do ecrã: não basta não mostrar `python`, é
    // não mostrar «Python» em lado nenhum do aviso.
    //
    // E o `NOMES` é a fonte, não uma lista escrita aqui: um nome novo entra
    // na verificação no dia em que entra no produto.
    const { container } = render(
      <PainelRobo portas={[PORTA_ENTRADA]} valores={{}} recusa={RECUSA} />,
    );
    const texto = container.textContent ?? '';
    for (const linguagem of LINGUAGENS) {
      expect(texto).not.toContain(NOMES[linguagem]);
    }
    expect(texto).toContain('número');
    expect(texto).toContain('texto');
  });

  it('diz que a recusa é do robô, e não da linguagem', () => {
    // A §11.2 do formato põe o problema com todas as letras: a recusa de
    // arrastar um valor para a ranhura do robô acontece nas seis
    // linguagens, e **não é a mesma coisa** que a recusa do avaliador de
    // texto, que em Python e em JavaScript nunca chega a existir. A pessoa
    // ouve as duas com a mesma palavra, e sem uma distinção no ecrã aprende
    // a desconfiar da palavra. A distinção que o painel pode fazer sem
    // inventar nada é dizer de quem é a recusa — e é o robô, porque foi o
    // robô que não aceitou o valor.
    render(<PainelRobo portas={[PORTA_ENTRADA]} valores={{}} recusa={RECUSA} />);
    expect(screen.getByText(/o robô não aceitou/i)).toBeInTheDocument();
  });

  it('um valor recusado não fica na porta, porque não entrou', () => {
    // O painel do plano mostrava o valor na porta **e** a recusa ao lado.
    // As duas coisas ao mesmo tempo dizem o que não é verdade: que o valor
    // entrou e que foi recusado. A recusa é a última palavra — o valor não
    // passou, logo a porta fica vazia.
    const recusado = valorEm(VALOR_NUMERICO, (v) => `${v}`);
    expect(recusado.recusado).toBe(true);
    const { container } = render(
      <PainelRobo
        portas={[PORTA_SAIDA]}
        valores={{ [PORTA_SAIDA.id]: recusado }}
        recusa={RECUSA}
      />,
    );
    expect(screen.queryByText('7')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(container.textContent).toContain(RECUSA.porque);
  });

  it('sem recusa, não mostra nenhum aviso', () => {
    // A prova negativa do `role="alert"`. Um `role="alert"` sempre presente
    // — ou presente mas vazio — faz o leitor de ecrã anunciar o silêncio a
    // cada alteração, e a pessoa que usa leitor fica a ouvir um erro que não
    // aconteceu.
    render(
      <PainelRobo
        portas={[PORTA_ENTRADA]}
        valores={{ [PORTA_ENTRADA.id]: VALOR_NUMERICO }}
        recusa={null}
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uma lista mostra-se como lista, e não como as suas coisas coladas', () => {
    // `String(['número', 'texto'])` dá `número,texto` — uma frase, do tipo
    // errado, que parece texto. O produto inteiro é sobre o que protege o
    // tipo, e um painel que mostra uma lista como frase ensina o contrário
    // de tudo o que diz nos outros ecrãs.
    const valor = val('lista', ['número', 'texto'], EXPLICACAO_VAZIA, ORIGEM);
    render(<PainelRobo portas={[LISTA]} valores={{ itens: valor }} recusa={null} />);
    expect(screen.getByText(/lista com 2/i)).toBeInTheDocument();
    expect(screen.queryByText('número,texto')).not.toBeInTheDocument();
  });

  it('um lógico mostra-se como sim ou não, e não como true ou false', () => {
    // `String(true)` dá `true`, que é a palavra da linguagem da máquina e
    // não da pessoa. A pessoa que está a ler código vê `true` no ficheiro e
    // vê «sim» no robô, e precisa de uma ponte para os dois.
    render(
      <PainelRobo
        portas={[PERGUNTA]}
        valores={{ pergunta: val('lógico', true, EXPLICACAO_VAZIA, ORIGEM) }}
        recusa={null}
      />,
    );
    expect(screen.getByText('sim')).toBeInTheDocument();
    expect(screen.queryByText('true')).not.toBeInTheDocument();
  });

  it('uma recusa sem valor mostra a porta vazia e a razão, ao mesmo tempo', () => {
    // As duas leituras do ecrã ao mesmo tempo, e sem mentira em nenhuma: a
    // porta está vazia, e a pessoa sabe o que lá devia estar.
    const { container } = render(
      <PainelRobo portas={[PORTA_ENTRADA]} valores={{}} recusa={RECUSA} />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(container.textContent).toContain(RECUSA.porque);
    expect(container.textContent).toContain(RECUSA.remedio);
  });
});
