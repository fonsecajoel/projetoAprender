import type { Language } from '../nucleo/tipos';
import { java } from './java';
import { python } from './python';
import type { Projection } from './tipos';

export const REGISTO: Partial<Record<Language, Projection>> = {
  python,
  java,
};

export const LINGUAGENS_COM_PROJECAO: Language[] = Object.keys(REGISTO) as Language[];

export function temProjecao(linguagem: Language): boolean {
  return REGISTO[linguagem] !== undefined;
}

export function obter(linguagem: Language): Projection {
  const p = REGISTO[linguagem];
  if (p === undefined) {
    // A mensagem nomeia a linguagem em minúsculas, como se escreve em
    // código, e diz também o que existe. Um erro que só diz o que falta
    // obriga quem o lê a ir procurar a lista; um erro que diz a lista
    // transforma-se no próximo passo.
    //
    // E a mensagem é **acentuada**, como todas as que a pessoa lê. O
    // `projecao` sem acento é o nome de uma pasta, e é por isso que aqui a
    // palavra é «projeção»: uma palavra escrita em código e uma palavra
    // escrita para a pessoa não são a mesma palavra.
    throw new Error(
      `A projeção para ${linguagem} ainda não foi construída. ` +
        `As linguagens com projeção são: ${LINGUAGENS_COM_PROJECAO.join(', ')}.`,
    );
  }
  return p;
}
