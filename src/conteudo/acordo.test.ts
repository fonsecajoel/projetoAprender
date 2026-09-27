import { describe, expect, it } from 'vitest';
import { CARREGAR, LICSOES, TEXTOS, executarSonda } from './index';
import type { Licao } from './esquema';
import { avaliador } from '../nucleo/avaliador';
import { avaliarTexto, classificar, emitir } from '../projecoes/avaliar';
import type { Bloco } from './esquema';
import type { Language } from '../nucleo/tipos';
import { identificador } from '../nucleo/blocos';

/** Todas as lições que existem, com a linguagem de cada uma.
 *
 *  Sai de `LICSOES` e de `TEXTOS` e não de uma lista escrita à mão. Uma lista
 *  escrita à mão é uma lista de intenções, e a segunda lição entra sem
 *  ninguém se lembrar de a acrescentar aqui — que é exatamente o modo de
 *  falha que este ficheiro existe para apanhar. */
function licoes(): Array<{ linguagem: Language; licao: Licao }> {
  return LICSOES.map((linguagem) => {
    const chave = Object.keys(TEXTOS).find((k) => k.startsWith(`${linguagem}/`));
    if (chave === undefined) throw new Error(`LICSOES tem ${linguagem} e o TEXTOS não`);
    return { linguagem, licao: CARREGAR(TEXTOS[chave] as string, linguagem) };
  });
}

/** O que o motor dá a um programa, pelos dois caminhos.
 *
 *  O produto tem **dois** motores para a mesma semântica: o avaliador de
 *  blocos, que é o que o aluno corre ao arrastar coisas, e o avaliador de
 *  texto, que é o que julga o que a projeção escreveu. São duas
 *  implementações, e uma implementação que discorda da outra não é uma
 *  implementação: é uma sorte.
 *
 *  E a sorte é invisível enquanto ninguém compara as duas. Foi o que
 *  aconteceu com `guardar nome = 'olá'`: o caminho de texto dizia
 *  `Observacao` — que é o que a sondagem `guarda-um-texto` provava — e o
 *  caminho de blocos dizia `Recusa`, com a frase «este sítio só aceita
 *  número. Recebeste número». A lição estava escrita, as sondagens passavam,
 *  e a pessoa que fosse fazer aquele primeiro passo batia com uma parede.
 */
function veredito(programa: Bloco | null): string {
  const pelosBlocos = avaliador();
  pelosBlocos.executar(programa);
  return classificar(pelosBlocos.trace.erros);
}

function vereditoDoTexto(linguagem: Language, programa: Bloco | null): string {
  return classificar(avaliarTexto(linguagem, emitir(linguagem, programa).texto));
}

describe('os dois motores dizem a mesma coisa', () => {
  it('existe pelo menos uma lição, ou este ficheiro não prova nada', () => {
    // Um ficheiro de testes que percorre uma lista vazia passa. Esta linha
    // é a que impede que este ficheiro passe a provar o nada no dia em que
    // as lições mudarem de sítio — que é o mesmo defeito que já apareceu
    // três vezes nos testes de ecrã e uma vez no do motor.
    expect(licoes().length).toBeGreaterThan(0);
  });

  it('para cada passo, o programa que o ecrã põe no ecrã dá o mesmo nos dois motores', () => {
    // Este é o teste mais importante do projecto, e não é sobre a lição: é
    // sobre a **tela**. O ecrã carrega `passo.bloco` no painel de blocos e
    // deixa a pessoa mexer; a sondagem que decide se o passo está feito foi
    // provada pelo caminho do texto. Se os dois discordarem, a sondagem
    // está a medir uma coisa e o ecrã a medir outra, e a pessoa nunca
    // consegue satisfazer a sondagem com o programa que o ecrã lhe deu.
    const divergencias: string[] = [];

    for (const { linguagem, licao } of licoes()) {
      licao.passos.forEach((passo, indice) => {
        const pelosBlocos = veredito(passo.bloco);
        const peloTexto = vereditoDoTexto(linguagem, passo.bloco);
        if (pelosBlocos !== peloTexto) {
          divergencias.push(
            `${linguagem} passo ${indice} (${passo.fase}, sonda ${passo.sonda}): ` +
              `nos blocos deu ${pelosBlocos}, no texto deu ${peloTexto}`,
          );
        }
      });
    }

    expect(divergencias.join('\n')).toBe('');
  });

  it('para cada sondagem com programa, os dois motores concordam com o que ela espera', () => {
    // As sondagens com `prova.texto` não têm blocos com que correr — o
    // ficheiro de quinze linhas, por exemplo, é texto escrito à mão, e não
    // há blocos que o produzam. Essas são julgadas pelo caminho do texto, e
    // `executarSonda` é quem as julga (e tem o seu próprio teste). As
    // sondagens com `prova.programa` têm as duas, e é aí que a divergência
    // se esconde.
    const divergencias: string[] = [];

    for (const { linguagem, licao } of licoes()) {
      for (const sonda of licao.sondas) {
        if (sonda.prova.forma !== 'programa' || sonda.prova.programa === undefined) continue;
        const pelosBlocos = veredito(sonda.prova.programa);
        const peloTexto = vereditoDoTexto(linguagem, sonda.prova.programa);
        const esperada = sonda.esperado.classe;
        if (pelosBlocos !== peloTexto || pelosBlocos !== esperada) {
          divergencias.push(
            `${linguagem} sonda ${sonda.nome}: esperava ${esperada}, ` +
              `nos blocos deu ${pelosBlocos}, no texto deu ${peloTexto}`,
          );
        }
      }
    }

    expect(divergencias.join('\n')).toBe('');
  });

  it('nenhuma sondagem de bloco de uma lição sem blocos tem programa', () => {
    // Uma sondagem que promete um programa e não o tem é uma sondagem
    // vazia: `executarSonda` recusa-a, o que é certo, mas a recusa aparece
    // em `executarSonda` e não aqui, e quem lê o erro tem de saber de que
    // sondagem é que se trata. A lista abaixo é a lista do que este ficheiro
    // está a olhar, e ela não pode estar vazia nem meter coisas que não
    // são programas.
    const contadas: string[] = [];
    for (const { linguagem, licao } of licoes()) {
      for (const sonda of licao.sondas) {
        if (sonda.prova.forma !== 'programa') continue;
        contadas.push(`${linguagem}/${sonda.nome}`);
        // Uma sondagem da família dos blocos que não traz nem programa nem
        // texto não prova nada, e o `executarSonda` recusa-a — mas o nome da
        // sondagem no aviso tem de dizer de que linguagem é, senão o aviso
        // de uma lição de Java parece o de uma de Python.
        const temProva = sonda.prova.programa !== undefined || sonda.prova.texto !== undefined;
        expect(temProva, `${linguagem}/${sonda.nome}`).toBe(true);
      }
    }
    expect(contadas.length).toBeGreaterThan(0);
  });
});

describe('as sondagens de todas as lições estão provadas', () => {
  it('cada sondagem passa no motor, em todas as lições', () => {
    // A promessa da §11.2 é que uma sondagem não pode estar errada, porque
    // corre no mesmo motor que a vê. Este teste generaliza a promessa: até
    // agora só a lição de Python a provava, e uma segunda lição de outra
    // linguagem podia trazer uma sondagem errada sem que nada ficasse
    // vermelho.
    const falhas: string[] = [];
    let quantas = 0;

    for (const { linguagem, licao } of licoes()) {
      for (const sonda of licao.sondas) {
        quantas += 1;
        const r = executarSonda(sonda, linguagem);
        if (!r.ok) falhas.push(`${linguagem} ${sonda.nome}: ${r.erro ?? '?'}`);
      }
    }

    expect(quantas).toBeGreaterThan(0);
    expect(falhas.join('\n')).toBe('');
  });

  it('cada passo diz à pessoa o que tem de fazer', () => {
    // O `porque` do passo é a instrução, e o `texto` do momento é a pergunta
    // que fica à espera enquanto a pessoa trabalha. São as duas únicas frases
    // que o ecrã mostra sem mais nada, e um passo com uma delas vazia é um
    // ecrã com um bloco e um silêncio.
    //
    // Repara no que este teste **não** repete: que a sonda existe e que o
    // passo tem momentos. O carregador já atira `ErroDeAutoria` nas duas
    // coisas, e um teste que repete uma verificação que já está noutro sítio
    // é um teste que nunca pode ficar vermelho — a pior sorte de teste, porque
    // parece que cobre alguma coisa.
    const mudos: string[] = [];
    for (const { linguagem, licao } of licoes()) {
      licao.passos.forEach((passo, indice) => {
        const onde = `${linguagem} passo ${indice}`;
        if (passo.porque.trim().length === 0) mudos.push(`${onde}: o passo não diz o que fazer`);
        for (const momento of passo.momentos) {
          if (momento.texto.trim().length === 0) mudos.push(`${onde}: o momento ${momento.id} está vazio`);
        }
      });
    }
    expect(mudos.join('\n')).toBe('');
  });

  it('todo nome de variável das lições é um identificador de verdade', () => {
    // `identificador` é a função que decide o que o nome escrito pelo aluno
    // vira no ficheiro: `class` vira `class_`, `1total` vira `v_1total`, e um
    // nome com acento perde o acento. Se uma lição escrever um nome que o
    // identificador muda, o ecrã mostra uma coisa e o ficheiro outra, e a
    // comparação de divergências aponta para a linha errada. A lição tem de
    // escrever o nome **já** com a forma que vai para o ficheiro.
    const mudados: string[] = [];
    for (const { linguagem, licao } of licoes()) {
      const nomes = new Set<string>();
      varre(licao.passos.map((p) => p.bloco), (nome) => nomes.add(nome));
      for (const nome of nomes) {
        if (identificador(nome) !== nome) {
          mudados.push(`${linguagem}: "${nome}" vira "${identificador(nome)}"`);
        }
      }
    }
    expect(mudados.join('\n')).toBe('');
  });
});

/** Uma ranhura tal como a lição a escreve: `valor` para o que entra
 *  num sítio, `stack` para o corpo de um laço, e `bloco` dentro de `valor`
 *  quando o que entra é outro bloco. Os três vivem no mesmo sítio e é a
 *  distinção entre eles que faz a busca ser rasa ou completa. */
type Ranhura = { valor?: unknown; stack?: Bloco[]; bloco?: Bloco };

/** Todos os `fields.nome.valor` que aparecem num programa, a qualquer
 *  profundidade.
 *
 *  Uma sondagem que escrevesse um nome com acento passava despercebida se a
 *  busca fosse rasa, e a busca rasa é o que dá a ilusão de que se olhou
 *  tudo. Por isso a funcao desce a `stack` e a `bloco`, e não só ao primeiro
 *  nível — e por isso recebe uma lista tanto como um bloco, porque os
 *  passos de uma lição são uma lista. */
function varre(programa: Bloco | Bloco[] | null, achou: (nome: string) => void): void {
  if (programa === null) return;
  if (Array.isArray(programa)) {
    for (const b of programa) varre(b, achou);
    return;
  }
  const nome = programa.fields?.nome?.valor;
  if (typeof nome === 'string' && nome.length > 0) achou(nome);
  const inputs = programa.inputs;
  if (inputs === undefined) return;
  for (const ranhura of Object.values(inputs) as Ranhura[]) {
    if (ranhura === undefined || ranhura === null) continue;
    if (ranhura.stack !== undefined) for (const b of ranhura.stack) varre(b, achou);
    const bruto = ranhura.valor;
    if (bruto !== null && typeof bruto === 'object' && 'bloco' in bruto) {
      varre((bruto as { bloco: Bloco }).bloco, achou);
    }
    if (ranhura.bloco !== undefined) varre(ranhura.bloco, achou);
  }
}
