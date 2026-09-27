import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PainelTexto } from './texto';
import { divergir } from '../projecoes/avaliar';
import type { BlocoLeigo } from '../nucleo/avaliador';

/** O programa que o painel vai mostrar como «o que o bloco faz». */
const GUARDAR: BlocoLeigo = {
  type: 'guardar',
  fields: { nome: { valor: 'total' } },
  inputs: { VALOR: { valor: 5 } },
};

/** Espera o dobro do intervalo mais curto que o painel usa, mais uma
 *  margem. Só é preciso depois de uma ação que devia *cancelar* um
 *  temporizador: a prova é que o temporizador não dispara, e «não disparou
 *  ainda» não é a mesma coisa que «não disparou». */
async function quietos(vezes: number): Promise<void> {
  await new Promise((r) => setTimeout(r, vezes));
}

describe('PainelTexto', () => {
  it('escreve o que o utilizador escreve e avisa depois do debounce', async () => {
    let recebido = '';
    render(
      <PainelTexto linguagem="python" resposta="total = 5" aoComparar={(t) => { recebido = t; }} debounceMs={20} />,
    );
    const area = screen.getByLabelText('O teu código em Python');
    await userEvent.clear(area);
    await userEvent.type(area, 'total = 6');
    await waitFor(() => {
      expect(recebido).toBe('total = 6');
    });
  });

  it('o intervalo existe para agrupar, e uma frase dá um aviso só', async () => {
    // O teste acima passa com um `onChange` sem intervalo nenhum, e é esse o
    // defeito: escrever uma frase de doze letras doze avisos, doze execuções
    // do motor e doze respostas a piscar. O intervalo só existe para isso, e
    // um teste que só espera pelo valor nunca prova que ele existe.
    const aoComparar = vi.fn();
    const { container } = render(
      <PainelTexto linguagem="python" resposta="" aoComparar={aoComparar} debounceMs={20} />,
    );
    const area = container.querySelector('textarea')!;
    let escrita = '';
    for (const letra of 'total = 5') {
      escrita += letra;
      fireEvent.change(area, { target: { value: escrita } });
    }
    await waitFor(() => expect(aoComparar).toHaveBeenCalled());
    await quietos(60);
    expect(aoComparar).toHaveBeenCalledTimes(1);
    // E o que corre é a última tecla, não a primeira nem a terceira.
    expect(aoComparar).toHaveBeenCalledWith('total = 5');
  });

  it('o botão Executar corre já, e cancela o aviso que estava pendente', async () => {
    // Sem o cancelamento, a pessoa escreve, carrega em Executar, vê o
    // resultado, e dois instantes depois o aviso pendente chega e corre o
    // mesmo texto outra vez. O resultado aparece duas vezes e o painel não
    // diz porquê.
    const aoComparar = vi.fn();
    render(
      <PainelTexto linguagem="python" resposta="" aoComparar={aoComparar} debounceMs={20} />,
    );
    const area = screen.getByLabelText('O teu código em Python');
    fireEvent.change(area, { target: { value: 'total = 6' } });
    // O clique dispara-se à mão e não com `userEvent`. O `userEvent` espera
    // por temporizadores entre os seus próprios passos, e com um intervalo de
    // vinte milissegundos o aviso pendente chegava **antes** do clique: o
    // teste passava a medir quanto o `userEvent` demora, e não o
    // cancelamento. Com o clique na mesma tarefa, o aviso ainda está
    // pendente, que é a situação que o botão tem de resolver.
    fireEvent.click(screen.getByRole('button', { name: 'Executar' }));
    expect(aoComparar).toHaveBeenCalledWith('total = 6');
    await quietos(60);
    expect(aoComparar).toHaveBeenCalledTimes(1);
  });

  it('sem blocos ligados o botão Executar corre o texto, mas avisa que não pode comparar', async () => {
    let recebido = '';
    render(
      <PainelTexto linguagem="python" resposta="total = 5" aoComparar={(t) => { recebido = t; }} semBlocos />,
    );
    const botao = screen.getByRole('button', { name: 'Executar' });
    expect(botao).toBeEnabled();
    expect(screen.getByText(/sem blocos ao lado/i)).toBeInTheDocument();
    await userEvent.click(botao);
    expect(recebido).toBe('total = 5');
  });

  it('sem blocos não aparecem divergências, porque não há com que comparar', () => {
    const { container } = render(
      <PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} semBlocos />,
    );
    expect(container.querySelector('.divergencias')).toBeNull();
  });

  it('limpa o texto quando a resposta muda de passo', () => {
    const { rerender } = render(<PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} />);
    rerender(<PainelTexto linguagem="python" resposta="outro = 1" aoComparar={() => undefined} />);
    expect(screen.getByLabelText('O teu código em Python')).toHaveValue('outro = 1');
  });

  it('não limpa o texto quando o painel re-renderiza com a mesma resposta', () => {
    // É o contrário do teste anterior, e é o que acontece a cada tecla: o
    // pai re-renderiza com a mesma `resposta`, e um efeito que dependesse de
    // mais alguma coisa voltava a pôr o texto de fora por cima do texto que
    // estava a ser escrito. O primeiro teste deste ficheiro passaria com
    // este defeito, porque lá o valor vinha de fora e não de dentro.
    //
    // Este teste foi escrito a pensar que o que protegia era uma comparação com a
    // resposta anterior, dentro do efeito. Mediu-se e não era: tirando a
    // comparação, os trinta e seis testes ficaram verdes. Acrescentando uma
    // dependência a mais ao efeito, também não é este teste que fica
    // vermelho — fica o de «limpa o texto quando a resposta muda de passo»,
    // porque o efeito passa a reescrever o valor para sempre. Ou seja: a
    // forma errada de_panel_apagar o que se escreve é um laço, e um laço
    // berra. O que este teste vela é o outro sentido — que o texto escrito
    // chega inteiro ao fim de quantas re-renderizações o pai quiser fazer —
    // e é para isso que ele fica.
    const { rerender } = render(<PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} />);
    const area = screen.getByLabelText('O teu código em Python');
    fireEvent.change(area, { target: { value: 'total = 6' } });
    expect(area).toHaveValue('total = 6');
    rerender(<PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} />);
    expect(area).toHaveValue('total = 6');
  });

  it('mostra a divergência com o porque e o que fazer', () => {
    render(
      <PainelTexto
        linguagem="python"
        resposta="total = 5"
        aoComparar={() => undefined}
        divergencias={[
          {
            linha: 1,
            esperado: 'total = 5',
            obtido: 'total = 6',
            porque: 'Estas duas linhas fazem coisas diferentes.',
            remedio: 'Muda a linha 1 para que faça o mesmo que o bloco.',
          },
        ]}
      />,
    );
    expect(screen.getByText('Linha 1')).toBeInTheDocument();
    expect(screen.getByText(/fazem coisas diferentes/i)).toBeInTheDocument();
    expect(screen.getByText(/Muda a linha 1/i)).toBeInTheDocument();
  });

  it('o rótulo diz a linguagem escolhida, e não uma hardcoded', () => {
    // A lição é escolhida no seletor e o aluno fica nela. Um painel que
    // diz "O teu código em Python" a quem escolheu Java não é um detalhe
    // de texto: é o produto a dizer que a escolha não contou.
    const { rerender } = render(
      <PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} />,
    );
    expect(screen.getByLabelText('O teu código em Python')).toBeInTheDocument();

    rerender(<PainelTexto linguagem="java" resposta="int total = 5;" aoComparar={() => undefined} />);
    expect(screen.getByLabelText('O teu código em Java')).toBeInTheDocument();
    expect(screen.queryByLabelText('O teu código em Python')).not.toBeInTheDocument();
  });

  it('e nunca compara o texto do aluno com o de outra linguagem', () => {
    // A `Divergencia` é entre o bloco e o teu texto, na tua linguagem. Não
    // há campo `python` nem `java` para o painel mostrar, e não há nada
    // para preencher se os houvesse.
    render(
      <PainelTexto
        linguagem="java"
        resposta="int total = 5;"
        aoComparar={() => undefined}
        divergencias={[
          {
            linha: 1,
            esperado: 'int total = 5;',
            obtido: 'int total = 6;',
            porque: 'O bloco soma 1 e o teu texto soma 2.',
            remedio: 'Muda o teu texto para somar 1.',
          },
        ]}
      />,
    );
    expect(screen.getByText(/O bloco soma 1/i)).toBeInTheDocument();
    expect(screen.queryByText(/Python/i)).not.toBeInTheDocument();
  });

  it('mostra a saída do programa quando existe', () => {
    render(<PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} saida={['7', '7', '7']} />);
    // Três linhas, um só elemento. `getByText('7')` encontraria três
    // elementos e.erraria, e encontraria um se o `<pre>` separasse as linhas
    // em nos de texto diferentes — e o resultado viria a bater. O que
    // interessa é o texto todo, que é o que a pessoa vai ler.
    const saida = screen.getByLabelText('Saída do programa');
    expect(saida.textContent).toBe('7\n7\n7');
  });

  it('não mostra saída quando o programa não imprimiu nada', () => {
    // O contrário do teste anterior. Um painel que mostra sempre um painel
    // de saída vazio faz o aluno procurar um resultado que não existe, e
    // a lição da variável — que só guarda — é exatamente esse caso.
    const { container } = render(
      <PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} />,
    );
    expect(container.querySelector('.saida')).toBeNull();
  });
});

describe('o painel é da linguagem escolhida, e mostra o porquê que o motor deu', () => {
  it('o painel da Java mostra a falha do ponto-e-vírgula em falta como essa falha', () => {
    // O `porque` não é um texto de interface: é o que a Task 6 escreveu
    // depois de reparar que «função desconhecida» é uma mentira para quem
    // leu a linha e viu a falta de um ponto-e-vírgula. A única forma de
    // saber que essa frase chega ao aluno é construí-la com `divergir` e
    // ver o painel mostrar a mesma. Uma `Divergencia` escrita à mão aqui
    // provaria que o painel mostra o que lhe derem, e nada mais.
    const relatorio = divergir('java', GUARDAR, 'int total = 5');
    expect(relatorio.ok).toBe(false);
    expect(relatorio.divergencias[0]!.porque).toMatch(/ponto-e-vírgula/i);
    render(
      <PainelTexto
        linguagem="java"
        resposta={relatorio.divergencias[0]!.obtido}
        aoComparar={() => undefined}
        divergencias={relatorio.divergencias}
      />,
    );
    expect(screen.getByText(/ponto-e-vírgula/i)).toBeInTheDocument();
  });

  it('e o mesmo painel com texto de Python é divergência, e não um texto válido', () => {
    // A segunda metade do mesmo teste. Um painel que aceitasse `total = 5`
    // como Java escreveria a resposta ao aluno como se fosse o que ele
    // quis dizer, e o aluno ia copiá-la para o ficheiro e ver o compilador
    // dizer o que o painel devia ter dito.
    const relatorio = divergir('java', GUARDAR, 'total = 5');
    expect(relatorio.ok).toBe(false);
    expect(relatorio.divergencias.length).toBeGreaterThan(0);
  });

  it('e quando bate certo o painel não mostra nada para dizer', () => {
    // A prova negativa. Um painel que mostra a linha esperada «para
    // comparação» está a dar ao aluno a resposta, e quem está a aprender a
    // ler código não deve poder copiá-la do sítio onde a está a comparar.
    const relatorio = divergir('java', GUARDAR, 'int total = 5;');
    expect(relatorio.ok).toBe(true);
    const { container } = render(
      <PainelTexto
        linguagem="java"
        resposta="int total = 5;"
        aoComparar={() => undefined}
        divergencias={relatorio.divergencias}
      />,
    );
    expect(container.querySelector('.divergencias')).toBeNull();
  });
});
