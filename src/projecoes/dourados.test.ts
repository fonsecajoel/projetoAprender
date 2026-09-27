import { describe, expect, it } from 'vitest';
import { LINGUAGENS, NOMES } from '../nucleo/tipos';
import type { Language } from '../nucleo/tipos';
import { LINGUAGENS_COM_PROJECAO, REGISTO, obter } from './registo';
import { avaliarTexto, emitir } from './avaliar';
import { guardar, guardarTexto, log, pilha, repetir } from '../nucleo/testes/dados';
import type { BlocoLeigo } from '../nucleo/blocos';
import { temLicao } from '../conteudo';

/** Os programas que têm de voltar a ser lidos sem um erro sequer.
 *
 *  Não é uma lista de exemplo: é a lista mínima que diz que `emitir` e `ler`
 *  são uma coisa e a sua inversa. Guardar, guardar um texto e repetir são as
 *  três coisas que toda a lição do Plano A faz, e se alguma delas não
 *  voltasse, o aluno veria uma linha no ecrã que a linguagem não aceitaria —
 *  que é a pior coisa que este produto pode fazer. */
const PROGRAMAS: Record<string, BlocoLeigo> = {
  'um número': pilha(guardar('total', 5)),
  'um texto': pilha(guardarTexto('nome', 'olá')),
  'um laço': pilha(repetir(3, [guardar('x', 1)])),
};

/** Os programas que têm de **falhar** a ler-se, cada um à sua maneira.
 *
 *  O teste das referências cruzadas precisa de erros para ler, e um programa
 *  que corre limpo não dá nenhum. Estes três dão: um chama uma função que
 *  não existe, um esvazia a pilha, e um número não cabe no sítio onde o
 *  chegou. O segundo é o que interessa à linguagem — é o `RANGE_INTEIROS` do
 *  núcleo, e por isso a sua mensagem é a mesma nas seis, que é a prova de que
 *  o núcleo não trouxe nenhuma palavra de linguagem com ele. */
const PROGRAMAS_QUE_FALHAM: Record<string, BlocoLeigo> = {
  'uma função que não existe': pilha(log(5)),
  'um número que não cabe': pilha(guardar('total', 5000)),
  'um texto onde o núcleo só quer número': pilha(guardarTexto('total', 'olá')),
};

describe('a costura é uma coisa e não uma promessa', () => {
  it('toda linguagem registada é uma das seis, e toda projeção diz qual é a sua', () => {
    // A projeção é a única coisa que sabe a sintaxe, e por isso tem de saber
    // **qual** é a sua linguagem: uma projeção que não diga responde à
    // pergunta «isto é Python?» com a resposta de outra, e o aluno leva a
    // lição errada.
    for (const nome of LINGUAGENS_COM_PROJECAO) {
      expect(LINGUAGENS).toContain(nome);
      expect(obter(nome).linguagem).toBe(nome);
    }
  });

  it('não há projeções fora do registo, nem registos sem projeção', () => {
    // `LINGUAGENS_COM_PROJECAO` é derivado de `REGISTO` por `Object.keys`, e
    // por isso os dois não podem divergir — a lista é uma vista, não uma
    // segunda fonte de verdade. Este teste existe para o dia em que alguém
    // acrescentar uma projeção e se esquecer dela.
    expect(Object.keys(REGISTO).sort()).toEqual([...LINGUAGENS_COM_PROJECAO].sort());
    expect(LINGUAGENS_COM_PROJECAO.length).toBeGreaterThan(0);
  });

  it('toda projeção tem `emitir` e `ler` que não são a mesma função', () => {
    // Se fossem o mesmo objeto, a projeção não saberia escrever a linguagem
    // que lê — e a lição ficava a mentir por omissão, que é a forma mais
    // barata de mentir e a mais difícil de apanhar.
    for (const nome of LINGUAGENS_COM_PROJECAO) {
      const p = obter(nome);
      expect(p.emit).not.toBe(p.ler);
    }
  });

  it('o que a projeção escreve, a mesma projeção lê sem um erro sequer', () => {
    // A prova de que não há dois sistemas separados. O filtro do plano
    // original — `porque` não contém «não é» — não provava nada: a recusa de
    // um tipo em Java também passa por ali, e o filtro transformationava uma
    // falha numa coisa que não falha. Aqui a afirmação é a que vale: **zero**.
    const medido: Record<string, string[]> = {};
    for (const nome of LINGUAGENS_COM_PROJECAO) {
      medido[nome] = [];
      for (const [nomeDoCaso, caso] of Object.entries(PROGRAMAS)) {
        const texto = emitir(nome, caso).texto;
        const erros = avaliarTexto(nome, texto);
        medido[nome].push(
          `${nomeDoCaso}: ${erros.length === 0 ? 'lido' : erros.map((e) => `${e.classe} — ${e.porque}`).join(' / ')}`,
        );
      }
    }
    for (const [nome, linhas] of Object.entries(medido)) {
      expect(linhas, `linguagem ${nome}`).toEqual(
        Object.keys(PROGRAMAS).map((c) => `${c}: lido`),
      );
    }
  });

  it('e nenhum erro de uma linguagem nomeia outra', () => {
    // A spec §0 tirou as referências cruzadas, e esta é a prova mecânica.
    // O `\b` é o que separa «Java» de «JavaScript»: sem ele, a palavra mais
    // curta casa dentro da mais comprida e o teste acusa um erro de escrita
    // onde não há nenhum.
    // Os dois conjuntos: os que têm de correr limpos e os que têm de falhar.
    // Com só os primeiros não haveria erro nenhum para ler, e a regra passaria
    // a provar que nenhum erro nomeia outra linguagem — o que é um número
    // verdadeiro sobre zero erros.
    for (const nome of LINGUAGENS_COM_PROJECAO) {
      const outras = LINGUAGENS.filter((l) => l !== nome).map((l) => NOMES[l]);
      const casos = { ...PROGRAMAS, ...PROGRAMAS_QUE_FALHAM };
      for (const [nomeDoCaso, caso] of Object.entries(casos)) {
        for (const e of avaliarTexto(nome, emitir(nome, caso).texto)) {
          for (const outra of outras) {
            const onde = new RegExp(`\\b${outra}\\b`);
            expect(onde.test(e.porque), `${nome}/${nomeDoCaso}: porque nomeia ${outra}`).toBe(false);
            expect(onde.test(e.remedio), `${nome}/${nomeDoCaso}: remedio nomeia ${outra}`).toBe(false);
          }
        }
      }
    }
  });
});

describe('as duas linguagens divergem, e é isso que prova a costura', () => {
  it('o mesmo bloco dá texto diferente', () => {
    // O ficheiro dourado. São estas duas linhas que o aluno vai ler, e uma
    // mudança nelas é uma mudança no que ele lê — que é a coisa que este
    // produto promete não mudar por baixo dele.
    expect(emitir('python', pilha(guardar('total', 5))).texto).toBe('total = 5\n');
    expect(emitir('java', pilha(guardar('total', 5))).texto).toBe('int total = 5;\n');
  });

  it('as duas linhas de cima só divergem na `Policy`, e não em código repetido', () => {
    // A tese da costura, escrita de uma forma que um teste apanha: as duas
    // projeções partilham o mesmo `interpretar` e o que muda é **uma
    // propriedade**. Um teste que mede a resposta de cada linguagem mede o
    // mesmo número de duas maneiras; este mede o que está a fazer esse
    // número ser diferente.
    expect(obter('python').policy.recusaNoTipo).toBe(false);
    expect(obter('java').policy.recusaNoTipo).toBe(true);
    expect(obter('python').policy.quando).not.toBe(obter('java').policy.quando);
  });

  it('a mesma violação dá respostas opostas, e sem uma linha de código duplicada', () => {
    // Estas duas linhas **têm de ser escritas à mão**, e não vir dos blocos.
    // A razão é o desenho do emissor: em Java o `emitir` escreve a
    // declaração que o valor pede, e por isso um programa montado em blocos
    // nunca viola um tipo sozinho. A violação nasce quando alguém escreve
    // `int` e dá um texto — e é para isso que o painel de texto existe.
    //
    // Um teste que montasse a violação com blocos passaria a ser um teste
    // sobre o `emitir`, não sobre a `Policy`, e não provaria nada.
    const emPython = avaliarTexto('python', "total = 'olá'\n");
    const emJava = avaliarTexto('java', 'int total = "olá";\n');
    expect(emPython).toEqual([]);
    expect(emJava.some((e) => e.classe === 'Recusa')).toBe(true);
  });

  it('e a recusa de Java diz quando acontece, e o conserto diz o que fazer', () => {
    // A metade da spec §7 que a lição de Python ensina: em Python a mesma
    // linha passa em silêncio, e em Java o compilador recusa. A mensagem
    // tem de **dizer** quando, porque é isso que fica — o aluno repete a
    // frase, não o que aconteceu. E o conserto tem de dizer o que fazer, que é a
    // outra metade de `Recusa`.
    //
    // O conserto não diz «String» e a spec não o pede: quem escreve a frase é
    // o núcleo, e o núcleo não sabe que em Java a um número se chama `int`.
    // Ver a nota no diário sobre este ponto.
    const emJava = avaliarTexto('java', 'int total = "olá";\n');
    const porque = emJava.map((e) => e.porque).join(' ');
    const remedio = emJava.map((e) => e.remedio).join(' ');
    expect(porque).toMatch(/antes de o código correr/);
    expect(porque).toMatch(/não guarda texto/);
    expect(remedio).toMatch(/Guarda aqui um/);
    expect(remedio).toMatch(/é o que este sítio aceita/);
  });

  it('e o `porque` de cada recusa fala só da sua linguagem', () => {
    for (const e of avaliarTexto('java', 'int total = "olá";\n')) {
      expect(e.porque).not.toMatch(/\bPython\b/);
      expect(e.remedio).not.toMatch(/\bPython\b/);
    }
  });
});

describe('o único bloco que não se lê é o `log`, e isso é de propósito', () => {
  it('o `log` é recusado nas duas linguagens, e cada uma explica nos termos dela', () => {
    // Isto apareceu ao escrever o teste de ouro, e é o exemplo mais honesto
    // do projecto: o `log` está no vocabulário partilhado e **nenhuma**
    // linguagem tem essa função. O emissor escreve `log(...)` nas duas, e as
    // duas recusam — cada uma com a sua frase, e cada uma a dizer *quando* se
    // descobre. O bloco existe para ensinar que uma função se escreve antes
    // de se chamar, e um teste que exigisse a inversão exata esconderia
    // justamente a lição.
    //
    // A afirmação é a que importa e é mais forte do que «não rebenta»: a
    // recusa **nombra a sua linguagem** e a **diz como se corrige**.
    for (const nome of LINGUAGENS_COM_PROJECAO) {
      const texto = emitir(nome, pilha(log(5))).texto;
      const erros = avaliarTexto(nome, texto);
      expect(erros.length, `${nome}: o log devia ser recusado`).toBeGreaterThan(0);
      const primeira = erros[0];
      if (primeira === undefined) continue;
      expect(primeira.porque, nome).toMatch(new RegExp(`\\b${NOMES[nome as Language]}\\b`));
      expect(primeira.remedio, nome).toMatch(/Escreve a função log/);
    }
  });
});

describe('o que o Plano A ainda não tem, e diz-se em voz alta', () => {
  it('quatro linguagens não têm projeção, e o registo não as finge', () => {
    const semProjecao = LINGUAGENS.filter((l) => !LINGUAGENS_COM_PROJECAO.includes(l));
    expect(semProjecao.sort()).toEqual(['go', 'javascript', 'sql', 'typescript']);
  });

  it('e a lição de Java ainda não está escrita, apesar de a projeção estar pronta', () => {
    // A projeção Java existe e passa os testes; a lição não. Este teste
    // impede que o produto anuncie seis linguagens quando tem duas
    // projeções e uma lição — e é o mesmo número que o seletor mostra ao
    // aluno no ecrã, dito pelas mesmas duas funções.
    expect(LINGUAGENS_COM_PROJECAO).toContain('java');
    expect(temLicao('java')).toBe(false);
  });

  it('e a lição de Python é a única que o produto pode oferecer', () => {
    const comLicao = LINGUAGENS.filter((l) => temLicao(l));
    expect(comLicao).toEqual(['python']);
  });
});
