import { describe, expect, it } from 'vitest';
import { LINGUAGENS_COM_PROJECAO, obter, temProjecao } from './registo';
import { BLOCOS_IMPERATIVOS } from './python';

describe('o registo', () => {
  it('tem Python e Java, e só essas duas', () => {
    expect([...LINGUAGENS_COM_PROJECAO].sort()).toEqual(['java', 'python']);
  });

  it('as duas imperativas declaram o mesmo vocabulário de blocos', () => {
    // As duas partilham os cinco blocos. A lista vive em `python.ts` porque é
    // onde a spec a escreveu, e a de Java vai buscá-la em vez de a repetir: uma
    // lista escrita duas vezes diverge no dia em que a spec ganha um bloco, e
    // ninguém se lembra de ir às duas.
    expect(obter('java').blocos).toEqual(obter('python').blocos);
  });

  it('as duas declaram a mesma família, e são as únicas', () => {
    expect(obter('java').familia).toBe(obter('python').familia);
    expect(obter('java').familia).toBe('imperativa');
  });

  it('e as duas declaram políticas opostas, que é o que a costura prova', () => {
    expect(obter('java').policy.recusaNoTipo).toBe(true);
    expect(obter('python').policy.recusaNoTipo).toBe(false);
  });

  it('obter devolve a projecão pedida', () => {
    expect(obter('python').linguagem).toBe('python');
    expect(obter('java').linguagem).toBe('java');
  });

  it('obter uma linguagem sem projecão diz qual falta, e não devolve indefinido', () => {
    expect(() => obter('go')).toThrow(/go/);
    expect(temProjecao('go')).toBe(false);
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
    // Um erro que diz "não há go; há java, python" diz também o próximo passo.
    expect(() => obter('go')).toThrow(/java/);
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

  it('temProjecao é falso para as quatro que faltam, e verdadeiro para as duas que há', () => {
    const comProjecao = LINGUAGENS_COM_PROJECAO;
    expect(comProjecao).toHaveLength(2);
    expect(temProjecao('python')).toBe(true);
    expect(temProjecao('java')).toBe(true);
    for (const l of ['go', 'javascript', 'sql', 'typescript'] as const) {
      expect(temProjecao(l), l).toBe(false);
    }
  });
});
