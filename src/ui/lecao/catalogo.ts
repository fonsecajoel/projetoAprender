import { LINGUAGENS, NOMES } from '../../nucleo/tipos';
import type { Language } from '../../nucleo/tipos';
import { temLicao } from '../../conteudo';
import { temProjecao } from '../../projecoes/registo';
import type { OpcaoLinguagem } from './SeletorLinguagem';

/** As três linhas que cada opção mostra, escritas à mão.
 *
 *  São texto de ecrã, e texto de ecrã não se genera: a pergunta que o
 *  seletor faz ao aluno é «isto?», e uma linha que descreve em vez de
 *  mostrar não deixa ninguém responder. São três, e não uma, porque uma
 *  linha isolada é um desonesto — a mesma atribuição em duas linguagens
 *  parece a mesma coisa, e não é. */
const EXEMPLOS: Record<Language, string[]> = {
  python: ['total = 5', 'print(total)', 'total = total + 1'],
  java: ['int total = 5;', 'System.out.println(total);', 'total = total + 1;'],
  go: ['total := 5', 'fmt.Println(total)', 'total = total + 1'],
  typescript: ['let total: number = 5;', 'console.log(total);', 'total = total + 1;'],
  javascript: ['let total = 5;', 'console.log(total);', 'total = total + 1;'],
  sql: ['SELECT total FROM vendas;', 'WHERE total > 10', 'ORDER BY total;'],
};

/** O que falta a uma linguagem para poder ser escolhida, escrito a partir do
 *  estado real do produto.
 *
 *  Este é o ponto 5 do `Review Focus`, e a decisão que o resolve é uma só: a
 *  prontidão **não é escrita à mão**. Um `pronta: false` escrito no catálogo
 *  continua a dizer a verdade até ao dia em que a projeção de Go entra — e
 *  nesse dia o ecrã mente para metade das pessoas que abrirem o produto, sem
 *  nenhum teste ficar vermelho. Aqui a resposta vem de `temProjecao` e de
 *  `temLicao`, e o `Record` de exemplos continua a ser a verificação de que
 *  nenhuma das sete linguagens de amanhã ficou sem linhas.
 *
 *  E a razão **diz qual das duas** falta, porque são duas coisas diferentes:
 *  sem projeção a opção ainda não existe; com projeção e sem lição há um
 *  ecrã inteiro por escrever, e o motor por trás já está verificado por
 *  testes. Dizer «ainda não» sem dizer qual das duas é uma frase que serve
 *  para as seis e não informa sobre nenhuma. */
function faltaDe(linguagem: Language): { pronta: boolean; falta: string } {
  const nome = NOMES[linguagem];
  if (!temProjecao(linguagem)) {
    return {
      pronta: false,
      falta: `Ainda não há projeção de ${nome}. A lição vem depois da projeção, nunca antes.`,
    };
  }
  if (!temLicao(linguagem)) {
    return {
      pronta: false,
      falta: `A projeção de ${nome} está pronta e verificada por testes. A lição ainda não está escrita.`,
    };
  }
  return { pronta: true, falta: '' };
}

/** As seis, pela ordem de `LINGUAGENS`, com o nome vindo do núcleo.
 *
 *  Nenhuma sai da lista e nenhuma desaparece em silêncio: uma opção que se
 *  vai embora parece um produto com uma linguagem a menos, e o produto tem
 *  seis, quatro das quais ainda por escrever. */
export const CATALOGO: OpcaoLinguagem[] = LINGUAGENS.map((linguagem) => ({
  linguagem,
  nome: NOMES[linguagem],
  exemplo: EXEMPLOS[linguagem],
  ...faltaDe(linguagem),
}));
