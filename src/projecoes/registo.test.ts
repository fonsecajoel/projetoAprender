import { describe, expect, it } from 'vitest';
import { LINGUAGENS_COM_PROJECAO, obter, temProjecao } from './registo';
import { BLOCOS_IMPERATIVOS } from './python';

describe('o registo', () => {
  it('tem Python, e só Python por enquanto', () => {
    expect(LINGUAGENS_COM_PROJECAO).toEqual(['python']);
  });

  it('obter devolve a projecão pedida', () => {
    expect(obter('python').linguagem).toBe('python');
  });

  it('obter uma linguagem sem projecão diz qual falta, e não devolve indefinido', () => {
    expect(() => obter('java')).toThrow(/java/);
    expect(temProjecao('java')).toBe(false);
  });

  it('a exceção nomeia a linguagem em minúsculas, como a usar em código', () => {
    let mensagem = '';
    try {
      obter('sql');
    } catch (e) {
      mensagem = (e as Error).message;
    }
    expect(mensagem).toContain('sql');
  });

  it('a exceção diz o que está disponível, e não só o que falta', () => {
    // Um erro que só diz "não há" obriga quem o lê a ir procurar a lista.
    // Um erro que diz "não há java; há python" diz também o próximo passo.
    expect(() => obter('go')).toThrow(/python/);
  });

  it('a família de Python é imperativa', () => {
    expect(obter('python').familia).toBe('imperativa');
  });

  it('o vocabulário de blocos é o da spec: guardar, repetir, dizer, log', () => {
    expect(BLOCOS_IMPERATIVOS).toEqual(['guardar', 'repetir', 'dizer', 'log']);
  });

  it('a projeção declara o mesmo vocabulário que exporta', () => {
    expect(obter('python').blocos).toEqual(BLOCOS_IMPERATIVOS);
  });

  it('temProjecao é falso para as cinco que faltam, e verdadeiro para a uma que há', () => {
    const comProjecao = LINGUAGENS_COM_PROJECAO;
    expect(comProjecao).toHaveLength(1);
    expect(temProjecao('python')).toBe(true);
    for (const l of ['go', 'java', 'javascript', 'sql', 'typescript'] as const) {
      expect(temProjecao(l), l).toBe(false);
    }
  });
});
