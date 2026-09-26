import { describe, expect, it } from 'vitest';
import { construir, registar } from './trace';
import { E, EXPLICACAO_VAZIA, LINGUAGENS, restricao, val } from './tipos';
import type { Recusa, RestricaoDeTipo, Valor } from './tipos';

const O = { bloco: 'guardar', ranhura: 0, passo: 1 };

function numero(n: number): Valor {
  return val('número', n, EXPLICACAO_VAZIA, O);
}
function palavra(s: string): Valor {
  return val('texto', s, EXPLICACAO_VAZIA, O);
}
function logico(b: boolean): Valor {
  return val('lógico', b, EXPLICACAO_VAZIA, O);
}

const recusaNumeroTexto: Recusa = E(restricao('número'), palavra('olá'));

describe('regra dura: nenhuma recusa existe sem porque', () => {
  it('toda recusa tem porque não vazio', () => {
    expect(recusaNumeroTexto.porque.length).toBeGreaterThan(0);
  });

  it('toda recusa tem remedio não vazio', () => {
    expect(recusaNumeroTexto.remedio.length).toBeGreaterThan(0);
  });

  it('toda recusa no trace tem porque não vazio', () => {
    const t = construir();
    t.recusa(recusaNumeroTexto);
    const unico = t.eventos.find((e) => e.tipo === 'erro');
    expect(unico).toBeDefined();
    if (!unico || unico.tipo !== 'erro') throw new Error('esperava um evento de erro');
    expect(unico.erro.porque.length).toBeGreaterThan(0);
  });
});

describe('nenhuma referência a outras linguagens', () => {
  it('Recusa não tem python nem java', () => {
    expect(Object.keys(recusaNumeroTexto)).not.toContain('python');
    expect(Object.keys(recusaNumeroTexto)).not.toContain('java');
  });

  it('a lista de linguagens tem as seis, todas minúsculas', () => {
    expect(LINGUAGENS).toEqual([
      'python', 'java', 'go', 'typescript', 'javascript', 'sql',
    ]);
  });
});

describe('registar', () => {
  it('produz um evento de valor com o passo certo', () => {
    const e = registar(3, numero(1));
    expect(e).toEqual({ tipo: 'valor', passo: 3, valor: numero(1) });
  });
});

describe('cabeEm', () => {
  // A restrição é uma coluna da tabela, e não um `restricao('número')`
  // fixo no laço. Com ela fixa, uma linha que diz "número em texto" tinha
  // de passar um número e de ser julgada por um sítio de número — e o nome
  // da linha passava a ser mentira. `número em texto` só é falso se o
  // sítio for de texto, e é por isso que o sítio viaja na linha.
  const casos: Array<[string, RestricaoDeTipo, Valor, boolean]> = [
    ['número em número', restricao('número'), numero(3), true],
    ['texto em número', restricao('número'), palavra('olá'), false],
    ['número em texto', restricao('texto'), numero(3), false],
    ['lógico em número', restricao('número'), logico(true), false],
    ['lógico em texto', restricao('texto'), logico(false), false],
    ['actor em número', restricao('número'), val('actor', 'coelho', EXPLICACAO_VAZIA, O), false],
    ['lista em número', restricao('número'), val('lista', [1], EXPLICACAO_VAZIA, O), false],
    ['função em número', restricao('número'), val('função', () => 1, EXPLICACAO_VAZIA, O), false],
    ['undefined em número', restricao('número'), val('número', undefined, EXPLICACAO_VAZIA, O), false],
    ['null em número', restricao('número'), val('número', null, EXPLICACAO_VAZIA, O), false],
    ['NaN em número', restricao('número'), val('número', NaN, EXPLICACAO_VAZIA, O), false],
    ['Infinity em número', restricao('número'), val('número', Infinity, EXPLICACAO_VAZIA, O), false],
    ['acima de RANGE_INTEIROS em número', restricao('número'), numero(1e9), false],
    ['número recusado em número', restricao('número'), { ...numero(1), recusado: true }, false],
    ['número recusado em texto', restricao('texto'), { ...numero(1), recusado: true }, false],
  ];
  for (const [nome, raio, v, esperado] of casos) {
    it(`${nome} é ${esperado}`, () => {
      expect(raio.cabeEm(v)).toBe(esperado);
    });
  }

  it('texto aceita texto', () => {
    expect(restricao('texto').cabeEm(palavra('olá'))).toBe(true);
  });
});

describe('E', () => {
  it('nomeia o esperado e o obtido', () => {
    const r = E(restricao('número', 'o que guardas'), palavra('olá'));
    expect(r.esperado).toBe('número');
    expect(r.obtido).toBe('texto');
    expect(r.porque).toContain('número');
    expect(r.porque).toContain('texto');
  });

  it('o remedio diz o que fazer, não o que a outra linguagem faria', () => {
    const r = E(restricao('número', 'o que guardas'), palavra('olá'));
    expect(r.remedio).toContain('número');
    expect(r.remedio).not.toContain('Python');
    expect(r.remedio).not.toContain('Java');
  });
});
