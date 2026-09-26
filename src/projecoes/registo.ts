import type { Language } from '../nucleo/tipos';
import { python } from './python';
import type { Projection } from './tipos';

export const REGISTO: Partial<Record<Language, Projection>> = {
  python,
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
    throw new Error(
      `A projecao para ${linguagem} ainda nao foi construida. ` +
        `As linguagens com projecao sao: ${LINGUAGENS_COM_PROJECAO.join(', ')}.`,
    );
  }
  return p;
}
