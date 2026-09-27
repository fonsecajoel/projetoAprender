import { describe, expect, it } from 'vitest';
import { TOLERANCIA_EDICAO, comparar, distância, dividirEmLinhas } from './divergencia';

describe('dividirEmLinhas', () => {
  it('ignora linhas em branco e espaços nas pontas', () => {
    expect(dividirEmLinhas('  a = 1  \n\n\n  b = 2\n')).toEqual(['a = 1', 'b = 2']);
  });

  it('devolve lista vazia para string vazia', () => {
    expect(dividirEmLinhas('')).toEqual([]);
  });

  it('não remove espaços do meio, que mudam nada mas são o texto', () => {
    expect(dividirEmLinhas('int  total = 5;')).toEqual(['int  total = 5;']);
  });

  it('o texto lido é o mesmo que a pessoa escreveu, sem a linha a mais do fim', () => {
    // Cortar o fim não pode ser "cortar o último caractere": um programa
    // escrito sem o `\n` final é o mesmo programa, e uma comparação que
    // tratasse os dois como textos diferentes culpava a pessoa por uma coisa
    // que não fez.
    expect(dividirEmLinhas('a = 1\nb = 2')).toEqual(['a = 1', 'b = 2']);
    expect(dividirEmLinhas('a = 1\nb = 2\n')).toEqual(['a = 1', 'b = 2']);
  });
});

describe('distância', () => {
  it('zero para texto igual', () => {
    expect(distância('total = 5', 'total = 5')).toBe(0);
  });

  it('conta uma omissão como 1', () => {
    expect(distância('tota = 5', 'total = 5')).toBe(1);
  });

  it('conta uma duplicação como 1', () => {
    expect(distância('totall = 5', 'total = 5')).toBe(1);
  });

  it('uma transposição de adjacentes custa 1, e não 2', () => {
    // A promessa do comentário acima da função, e a que dá sentido à
    // tolerância: quem escreve à pressa troca duas letras, não apaga quatro.
    // A primeira implementação lia a linha **um** acima do sítio certo — a
    // linha anterior, e não a de há duas — e por isso nunca encontrava a
    // troca: `cosntante` custava 2. O teste passava na mesma, porque a
    // tolerância é 2. **Um teste que passa por uma margem dobrada não está a
    // fixar o que diz que fixa.**
    expect(distância('cosntante', 'constante')).toBe(1);
    expect(distância('tset', 'test')).toBe(1);
  });

  it('a troca tem de ser mesmo de adjacentes', () => {
    // `total` com o `t` e o `a` trocados não é uma troca de adjacentes, e
    // custa mais. Se custasse 1, a tolerância aceitaria uma linha reescrita.
    expect(distância('aotlt', 'total')).toBeGreaterThan(1);
  });

  it('uma troca e uma omissão na mesma palavra custam 3, e não 2', () => {
    // `tla` → `total` resolve-se com uma troca **e** uma omissão, que à
    // primeira vista são 2. Dão 3, e é por isso que a conta é a de
    // Damerau-Levenshtein **restrito**: a variante que não deixa editar a mesma
    // palavra duas vezes. A irrestrita dava 2 e tinha de manter duas colunas
    // de histórico para o saber.
    //
    // A escolha é do lado certo para o que a tolerância quer: quem troca duas
    // letras está a fazer um erro, e quem troca *e* omite está a fazer dois.
    // A tolerância de 2 apanha o primeiro e deixa passar o segundo para a
    // pessoa ler a divergência, que é mais útil do que aceitar a linha.
    expect(distância('tla = 5', 'total = 5')).toBe(3);
  });

  it('uma linha contra a vazia custa o comprimento dela', () => {
    expect(distância('', 'abc')).toBe(3);
    expect(distância('abc', '')).toBe(3);
    expect(distância('', '')).toBe(0);
  });
});

describe('tolerância de edição', () => {
  it('é 2', () => {
    expect(TOLERANCIA_EDICAO).toBe(2);
  });

  it('aceita texto idêntico', () => {
    expect(comparar('total = 5\n', 'total = 5\n').ok).toBe(true);
  });

  it('aceita falta da linha em branco final', () => {
    expect(comparar('total = 5\n', 'total = 5').ok).toBe(true);
  });

  it('aceita uma transposição de caracteres adjacentes', () => {
    expect(comparar('log(constante)\n', 'log(cosntante)\n').ok).toBe(true);
  });

  it('aceita dois caracteres trocados em sítios diferentes', () => {
    expect(comparar('log(constante)\n', 'log(contsante)\n').ok).toBe(true);
  });

  it('rejeita três caracteres errados', () => {
    expect(comparar('total = 5\n', 'txxttxl = 5\n').ok).toBe(false);
  });
});

describe('divergência em Java: o ponto-e-vírgula em falta', () => {
  // Review Focus 4. E a armadilha: a tolerância é de 2 caracteres, e um `;` em
  // falta é **um** caractere. A primeira versão comparava primeiro e só depois
  // dizia o que faltava, e a distância de 1 comia o erro — a linha passava, e
  // a lição de Java perdia o exemplo mais curto que tem.
  it('o ; em falta é uma divergência, não texto aceite', () => {
    const r = comparar('int total = 5;\n', 'int total = 5\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias).toHaveLength(1);
    expect(r.divergencias[0]!.linha).toBe(1);
    expect(r.divergencias[0]!.porque).toContain('ponto-e-vírgula');
  });

  it('e diz o que fazer, e o que a linha devia ser', () => {
    const d = comparar('int total = 5;\n', 'int total = 5\n').divergencias[0]!;
    expect(d.remedio).toContain(';');
    expect(d.esperado).toBe('int total = 5;');
    expect(d.obtido).toBe('int total = 5');
  });

  it('o porque não diz "função desconhecida" nem "linha inválida"', () => {
    const d = comparar('int total = 5;\n', 'int total = 5\n').divergencias[0]!;
    expect(d.porque).not.toMatch(/desconhecid|inválid/);
  });

  it('a verificação é de forma, e não de contagem de caracteres', () => {
    // Em Python a linha não acaba em `;`, logo não há o que faltar — e é a
    // mesma comparação com o sinal trocado. A regra olha para a **forma** que a
    // linha tem de ter, e não para quantos caracteres faltam: por isso o `;`
    // em falta é apanhado mesmo estando a distância dentro da tolerância, e
    // por isso um `;` a mais numa linha de Python também é apanhado.
    expect(comparar('total = 5\n', 'total = 5\n').ok).toBe(true);
    expect(comparar('total = 5\n', 'total = 5;\n').ok).toBe(false);
  });

  it('e o ; a mais é dito como o que é', () => {
    const d = comparar('total = 5\n', 'total = 5;\n').divergencias[0]!;
    expect(d.porque).toMatch(/sobrou|a mais|não pede/);
  });
});

describe('a comparação diz o que falta, e não "a linha está errada"', () => {
  it('uma linha a mais é dita como linha a mais', () => {
    const r = comparar('total = 5\n', 'total = 5\ntotal = 6\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias[0]!.porque).toMatch(/a mais|sobra/);
  });

  it('uma linha a menos é dita como linha em falta', () => {
    const r = comparar('total = 5\nlog(total)\n', 'total = 5\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias[0]!.porque).toMatch(/falta/);
  });

  it('um espaço a mais é aceite, porque é um erro que não se vê', () => {
    // A tolerância existe para isto: um espaço que a pessoa não vê não é uma
    // linha errada, é o mesmo programa. E dizê-lo por escrito evita que a
    // tolerância seja lida como "aceita o que der".
    expect(comparar('int total = 5;\n', 'int  total = 5;\n').ok).toBe(true);
  });

  it('mas três já não, e então é dito que é o espaçamento', () => {
    const r = comparar('int total = 5;\n', 'int   total   =   5;\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias[0]!.porque).toMatch(/espaçamento/);
  });

  it('e o resto remede para a linha verdadeira, à vista', () => {
    // A diferença tem de passar da tolerância. A primeira versão escreveu
    // `totl = 5`, que está a uma letra de distância — e portanto é aceite, e
    // o teste lia `undefined` numa lista vazia. Um teste que não falha não
    // está a testar.
    const d = comparar('total = 5\n', 'xxxx = 5\n').divergencias[0]!;
    expect(d.remedio).toContain('total = 5');
  });

  it('uma letra a menos passa, e é o que a tolerância é para isso', () => {
    // O par do teste anterior: o mesmo nome com uma letra a menos **não** é
    // divergência. Juntos, os dois, a tolerância de 2 fica escrita nos dois
    // sentidos em vez de ser um número solto.
    expect(comparar('total = 5\n', 'totl = 5\n').ok).toBe(true);
  });

  it('cada divergência diz a que linha do programa se refere', () => {
    // A linha é a do **texto da pessoa**, e é o número que o painel mostra ao
    // lado. Contar as linhas esperadas daria o número errado a partir da
    // primeira divergência, que é a mais importante de ver.
    const r = comparar('a = 1\nb = 2\nc = 3\n', 'a = 1\nb = 22222\nc = 3\n');
    expect(r.divergencias).toHaveLength(1);
    expect(r.divergencias[0]!.linha).toBe(2);
  });
});

describe('a comparação não sabe sintaxe, e não a inventa', () => {
  it('recebe texto, e não um objeto de projeção', () => {
    // A primeira versão de `comparar` recebia um `Gerado`, que é um tipo de
    // `projecoes/`, e o verificador de árvore ter-lhe-ia barrado a tarefa — a
    // dependência ia do núcleo para a camada que o núcleo não pode conhecer.
    // A assinatura a receber texto resolve: o que se compara é o texto, e as
    // anotações nunca entraram na comparação.
    expect(typeof comparar).toBe('function');
    expect(comparar('a', 'a').divergencias).toEqual([]);
  });

  it('a distância nunca é negativa, mesmo com a linha vazia dos dois lados', () => {
    expect(distância('', '')).toBeGreaterThanOrEqual(0);
    expect(comparar('', '').ok).toBe(true);
  });
});
