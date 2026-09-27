import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLicao, respostaBate } from './estado';
import { CARREGAR } from '../conteudo/carregar';
import type { Licao } from '../conteudo';
import variavelYaml from '../conteudo/python/variavel.yml?raw';

const licao = CARREGAR(variavelYaml, 'python');

/** O passo que manda ler o ficheiro. Derivado da lição e nunca escrito à
 *  mão, pelo mesmo motivo que no teste da Tela: um número escrito à mão
 *  aqui passa a testar outra coisa assim que a lição ganha um passo. */
const PASSO_DA_FICHA = licao.passos.findIndex((p) => p.referencia !== undefined);
const primeiro = (fase: 'explicar' | 'fazer' | 'nomear'): number => {
  const i = licao.passos.findIndex((p) => p.fase === fase);
  if (i < 0) throw new Error(`a lição não tem nenhum passo de fase ${fase}`);
  return i;
};
const PASSO_EXPLICAR = primeiro('explicar');
const PASSO_FAZER = primeiro('fazer');
const PASSO_NOMEAR = primeiro('nomear');

describe('useLicao', () => {
  it('começa no primeiro passo, no momento 0, e a fase é a do passo', () => {
    const { result } = renderHook(() => useLicao(licao));
    expect(result.current.indicePasso).toBe(0);
    expect(result.current.totalPassos).toBe(licao.passos.length);
    expect(result.current.momento).toBe(0);
    expect(result.current.fase).toBe(licao.passos[0]!.fase);
  });

  it('a fase é derivada do passo, e mudar de passo muda a fase', () => {
    const { result } = renderHook(() => useLicao(licao));
    expect(result.current.fase).toBe('explicar');
    act(() => result.current.irPara(PASSO_NOMEAR));
    expect(result.current.fase).toBe('nomear');
  });

  it('o passo de abertura pode ser saltado', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_FAZER));
    expect(result.current.indicePasso).toBe(PASSO_FAZER);
    expect(result.current.fase).toBe('fazer');
  });

  it('avançar percorre os momentos do passo e não salta de passo', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    expect(result.current.totalMomentos).toBe(15);
    act(() => result.current.proximo());
    expect(result.current.momento).toBe(1);
    act(() => result.current.proximo());
    expect(result.current.momento).toBe(2);
    // Avançar momento não avança passo. O botão que avança passo é outro, e
    // só funciona quando todos os momentos estão vistos — um botão único que
    // às vezes saltava de passo era um botão de que ninguém sabia o nome.
    expect(result.current.indicePasso).toBe(PASSO_DA_FICHA);
  });

  it('avançar no último momento não faz nada: o próximo passo é outra coisa', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_EXPLICAR));
    act(() => result.current.proximo());
    expect(result.current.momento).toBe(0);
    expect(result.current.indicePasso).toBe(PASSO_EXPLICAR);
  });

  it('voltar recua o momento, e no primeiro momento não faz nada', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    act(() => result.current.proximo());
    expect(result.current.momento).toBe(1);
    act(() => result.current.anterior());
    expect(result.current.momento).toBe(0);
    act(() => result.current.anterior());
    expect(result.current.momento).toBe(0);
  });

  it('o passo seguinte só abre quando todos os momentos estão vistos', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    act(() => result.current.proximoPasso());
    expect(result.current.indicePasso).toBe(PASSO_DA_FICHA);
    // Uma volta por momento, pelo número e não pelo momento: o que este
    // teste mede é «quantas vezes o botão foi apertado», e um `for..of`
    // sobre a lista seria uma segunda forma de escrever a mesma contagem.
    const quantos = licao.passos[PASSO_DA_FICHA]!.momentos.length;
    for (let volta = 0; volta < quantos; volta++) {
      act(() => result.current.observar());
      act(() => result.current.proximo());
    }
    act(() => result.current.proximoPasso());
    expect(result.current.indicePasso).toBe(PASSO_DA_FICHA + 1);
    expect(result.current.momento).toBe(0);
  });

  it('no último passo não há passo seguinte, e o estado não rebenta', () => {
    const ultimo = licao.passos.length - 1;
    const { result } = renderHook(() => useLicao(licao, ultimo));
    act(() => result.current.proximoPasso());
    expect(result.current.indicePasso).toBe(ultimo);
    act(() => result.current.irPara(licao.passos.length + 5));
    expect(result.current.indicePasso).toBe(ultimo);
    act(() => result.current.irPara(-1));
    expect(result.current.indicePasso).toBe(ultimo);
  });

  it('só marca um momento de leitura quando a resposta bate com uma das palavras', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    const momento = result.current.momentoActual!;
    expect(momento.fonte).toBe('leitura');
    act(() => {
      result.current.responder('guarda um número');
    });
    expect(result.current.feito[momento.id]).toBe(true);
  });

  it('uma resposta que não diz a palavra pedida não marca, e não impede a resposta certa', () => {
    // A diferença entre «o aluno errou» e «o produto não tem opinião nenhuma»
    // só se vê nesta ordem: primeiro uma resposta que não bate, e depois uma
    // que bate. Um `responder` que escreve `feito` à partida, ou que se
    // bloqueia depois de uma resposta errada, passa o teste do plano e
    // fecha a ficha de leitura para quem ainda não a leu.
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    const momento = result.current.momentoActual!;
    let primeira: boolean | undefined;
    act(() => {
      primeira = result.current.responder('não faço ideia');
    });
    expect(primeira).toBe(false);
    expect(result.current.feito[momento.id]).toBeUndefined();
    let segunda: boolean | undefined;
    act(() => {
      segunda = result.current.responder('guarda um número');
    });
    expect(segunda).toBe(true);
    expect(result.current.feito[momento.id]).toBe(true);
  });

  it('responder sem escrever nada não marca o momento', () => {
    // Uma resposta vazia é o estado inicial da caixa de texto, e é o estado
    // em que o aluno está antes de ler a linha. Deixar a marca posta
    // transformava o «li a pergunta e respondi» num «cliquei no botão», e
    // o passo passava a ser decorável.
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    const momento = result.current.momentoActual!;
    act(() => {
      result.current.responder('   ');
    });
    expect(result.current.feito[momento.id]).toBeUndefined();
  });

  it('fora da ficha, responder nunca chumba: o produto não avalia blocos', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_FAZER));
    const momento = result.current.momentoActual!;
    expect(momento.palavras).toEqual([]);
    act(() => {
      result.current.responder('banana');
    });
    // Não chumba, mas também não conta. A diferença entre as duas coisas é
    // a diferença entre "o produto não se importa" e "o produto concordou".
    expect(result.current.feito[momento.id]).toBeUndefined();
  });

  it('a sonda do passo é a da lição com o mesmo nome', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_FAZER));
    expect(result.current.sonda).toBe(
      licao.sondas.find((x) => x.nome === result.current.passo.sonda),
    );
    expect(result.current.sonda).not.toBeNull();
  });

  it('um passo que aponta para uma sonda que não existe fica sem sonda, e não rebenta', () => {
    // Uma sonda apagada de uma lição é um erro de autoria, e o ecrã não pode
    // ser o sítio onde esse erro aparece a meio de uma pessoa a ler um
    // ficheiro. A resposta é um passo sem prova, que o motor avalia e o
    // ecrã mostra — e a porta que devolve este `null` é `temLicao` na
    // Task 13.
    const partida: Licao = {
      ...licao,
      passos: licao.passos.map((p) =>
        p.referencia === undefined ? p : { ...p, sonda: 'sonda-que-nao-existe' },
      ),
    };
    const { result } = renderHook(() => useLicao(partida, PASSO_DA_FICHA));
    expect(result.current.sonda).toBeNull();
    expect(result.current.referencia).toBeUndefined();
  });

  it('o passo da ficha traz as linhas do ficheiro, e são as 15', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    expect(result.current.referencia?.linhas).toHaveLength(15);
    expect(result.current.referencia?.linhas[0]).toBe('total = 5');
    expect(result.current.referencia?.linhas[5]).toBe('    total = total + 1');
    expect(result.current.referencia?.nome).toBe('variavel.py');
  });

  it('um passo que aponta para uma sonda sem ficheiro fica sem referência, e não rebenta', () => {
    // A ficha de leitura e as sondagens de programa vivem no mesmo sítio, e
    // só uma das duas tem `prova.texto`. Apontar a referência para a sonda
    // errada é um erro de autoria; o ecrã tem de mostrar um passo sem
    // ficheiro, e não um ecrã em branco com um erro na consola.
    const partida: Licao = {
      ...licao,
      passos: licao.passos.map((p) =>
        p.referencia === undefined ? p : { ...p, sonda: 'guarda-um-numero' },
      ),
    };
    const { result } = renderHook(() => useLicao(partida, PASSO_DA_FICHA));
    expect(result.current.sonda?.nome).toBe('guarda-um-numero');
    expect(result.current.referencia).toBeUndefined();
  });

  it('um passo sem ficha não tem referência, e não é um erro', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_FAZER));
    expect(result.current.referencia).toBeUndefined();
  });
});

/** O que sai de um teclado sem cedilha: as mesmas letras, sem os acentos.
 *
 *  O teste tira os acentos a si próprio, e não os escreve à mão. A grafia
 *  sem acentos é ao mesmo tempo a que um aluno escreve e uma grafia de
 *  antes de 1990, e escrevê-la à mão seria escrever uma violação da regra
 *  ortográfica como dado de teste. E o teste ficaria a provar que a
 *  palavra existe no ficheiro, e não que o produto a aceita. */
function semAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

describe('respostaBate', () => {
  it('bate por subcadeia, e sem pontuação', () => {
    // «Esta linha guarda um número.» bate com «guarda» e com «número», e a
    // vírgula final não é a razão de não bater. A palavra pedida é o
    // fundamento, e o resto da frase é o aluno a falar como fala.
    expect(respostaBate(['guarda', 'atribui'], 'Esta linha guarda um número.')).toBe(true);
    expect(respostaBate(['guarda'], 'guarda')).toBe(true);
  });

  it('bate sem acentos, porque o aluno escreve sem acentos', () => {
    // A lição escreve `número`, `lógica` e `atribuição` nas palavras que
    // pede. Um teclado sem cedilha — ou um telemóvel com o teclado em
    // inglês — dá a mesma palavra sem o acento. Se `normalizar` deixasse de
    // tirar os acentos, a palavra pedida nunca era dita e **a ficha de
    // leitura nunca mais abria**: não há botão de saltar, porque saltar a
    // ficha é saltar a lição. É o único teste desta tarefa que apanha uma
    // falha que fecha o produto inteiro sem um único erro no ecrã.
    for (const pedida of ['número', 'lógica', 'atribuição']) {
      expect(respostaBate([pedida], semAcentos(pedida))).toBe(true);
      expect(respostaBate([pedida], `a linha é ${semAcentos(pedida)} aqui`)).toBe(true);
    }
  });

  it('não bate quando a resposta não diz nada disto', () => {
    expect(respostaBate(['guarda', 'atribui'], 'não faço ideia')).toBe(false);
  });

  it('uma resposta vazia nunca bate, mesmo com a palavra pedida a vazia', () => {
    // Uma lista de palavras vazia é o momento fora da ficha. Se
    // `respostaBate` batesse por causa de `''`, cada momento fora da ficha
    // contaria como visto sem a pessoa ter lido nada.
    expect(respostaBate([], 'qualquer coisa')).toBe(false);
    expect(respostaBate([''], 'qualquer coisa')).toBe(false);
    expect(respostaBate(['guarda'], '')).toBe(false);
  });
});
