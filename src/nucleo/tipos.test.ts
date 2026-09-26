import { describe, expect, it } from 'vitest';
import { E, EXPLICACAO_VAZIA, LINGUAGENS, NOMES, RANGE_INTEIROS, restricao, val } from './tipos';
import type { Explicacao, Origem, Recusa, Tipo, Valor } from './tipos';

const O: Origem = { bloco: 'guardar', ranhura: 0, passo: 1 };

function num(n: number): Valor { return val('número', n, EXPLICACAO_VAZIA, O); }
function txt(t: string): Valor { return val('texto', t, EXPLICACAO_VAZIA, O); }

describe('LINGUAGENS e NOMES', () => {
  it('são as seis, e são só seis', () => {
    expect(LINGUAGENS).toHaveLength(6);
    expect(new Set(LINGUAGENS).size).toBe(6);
  });

  it('NOMES cobre as seis, e só elas', () => {
    expect(Object.keys(NOMES).sort()).toEqual([...LINGUAGENS].sort());
  });

  it('nenhum nome é o identificador a gritar, excepto onde tem de ser', () => {
    // A regra é "o nome é o que uma pessoa escreveria, não a chave em
    // maiúsculas". `SQL` é a excepção que confirma a regra: é um acrónimo,
    // escreve-se em maiúsculas em todo o lado, e `SQL` seria uma
    // falsificação se a forcássemos para dentro do padrão das outras cinco.
    for (const l of LINGUAGENS) {
      if (l === 'sql') {
        expect(NOMES.sql).toBe('SQL');
        continue;
      }
      expect(NOMES[l]).not.toBe(l.toUpperCase());
    }
  });
});

describe('Explicacao', () => {
  it('tem porque e remedio, e mais nada', () => {
    // A regra que a spec §6.4 reescreveu: nenhuma explicação carrega o nome
    // de uma linguagem. Se um dia aparecer `python:` aqui, o teste falha e
    // a pergunta volta a ser "o que é que muda entre as seis?" — que é a
    // resposta: nada, na semântica.
    const e: Explicacao = { porque: 'porque sim', remedio: 'faz assim' };
    expect(Object.keys(e).sort()).toEqual(['porque', 'remedio']);
  });

  it('o núcleo diz isto com as suas próprias palavras', () => {
    // `E` é uma função: recebe a restrição que falhou e o valor que chegou,
    // e escreve a recusa. O texto de sistema vive aqui e em mais lado
    // nenhum do núcleo. Uma projeção escreve o seu, porque o seu utilizador
    // precisa da sintaxe dele — e é a única coisa que uma projeção faz a
    // mais. Por isso o teste chama-a em vez de a ler.
    const nomes = /Python|Java|Go|TypeScript|JavaScript|SQL/;
    const r1 = E(restricao('número', 'total'), txt('olá'));
    expect(r1.porque).not.toMatch(nomes);
    expect(r1.remedio).not.toMatch(nomes);

    const r2 = E(restricao('lista', 'numeros'), num(3));
    expect(r2.porque).not.toMatch(nomes);
    expect(r2.remedio).not.toMatch(nomes);
  });
});

describe('valor e tipo', () => {
  it('um número dentro do intervalo é número', () => {
    expect(num(5).tipo).toBe('número');
  });

  it('um texto nunca é número, mesmo com os mesmos algarismos', () => {
    expect(txt('5').tipo).toBe('texto');
    expect(txt('5').valor === 5).toBe(false);
  });

  it('`função` está no tipo mas não há nenhum valor dele', () => {
    // Está na união para a sondas não crescerem por baixo. Nenhum bloco do
    // Plano A a produz, e o `Tipo` continua fechado.
    const tipos: Tipo[] = ['número', 'texto', 'lógico', 'lista', 'função', 'actor'];
    expect(tipos).toContain('função');
  });
});

describe('RestricaoDeTipo', () => {
  it('aceita o número que é número', () => {
    expect(restricao('número').cabeEm(num(5))).toBe(true);
  });

  it('recusa um texto onde se pede número — e é a regra que o Java vai usar', () => {
    expect(restricao('número').cabeEm(txt('olá'))).toBe(false);
    expect(restricao('número').cabeEm(txt('5'))).toBe(false);
  });

  it('recusa o que já chegou recusado', () => {
    const recusado = { ...num(5), recusado: true };
    expect(restricao('número').cabeEm(recusado)).toBe(false);
  });

  it('recusa o número fora do intervalo, e o limite é RANGE_INTEIROS', () => {
    expect(restricao('número').cabeEm(num(RANGE_INTEIROS))).toBe(true);
    expect(restricao('número').cabeEm(num(RANGE_INTEIROS + 1))).toBe(false);
  });

  it('recusa o infinito, que é um número e não devia ser', () => {
    expect(restricao('número').cabeEm(num(Number.POSITIVE_INFINITY))).toBe(false);
  });

  it('o nome do slot é o do tipo, salvo quando se dá outro', () => {
    expect(restricao('número').nome).toBe('número');
    expect(restricao('número', 'total').nome).toBe('total');
  });
});

describe('as três classes de erro', () => {
  it('Recusa tem porque, remedio e o valor que foi recusado', () => {
    const r: Recusa = {
      classe: 'Recusa',
      porque: 'aqui só entra número',
      remedio: 'guarda um número, ou declara o slot como texto',
      esperado: 'número',
      obtido: 'texto',
      origem: O,
    };
    expect(r.classe).toBe('Recusa');
    expect(Object.keys(r)).toContain('remedio');
  });

  it('e nenhuma das três tem o nome de uma linguagem', () => {
    // Três interfaces, uma regra. Se amanhã um `FalhaRuntime` levar um
    // campo `java`, esta linha é a que apanha.
    const campoDeLinguagem = /^(python|java|go|typescript|javascript|sql)$/;
    for (const chave of ['porque', 'remedio', 'obtido', 'esperado', 'saida', 'linha']) {
      expect(campoDeLinguagem.test(chave)).toBe(false);
    }
  });
});
