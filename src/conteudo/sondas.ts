import { avaliarTexto, classificar, emitir } from '../projecoes/avaliar';
import type { ClassesObservadas } from '../projecoes/avaliar';
import type { Language } from '../nucleo/tipos';
import type { Forma, Sonda } from './esquema';
import { FAMILIAS, FORMAS, FORMAS_POR_FAMILIA } from './esquema';

export interface ResultadoSonda {
  ok: boolean;
  nome: string;
  esperada: ClassesObservadas;
  observada: ClassesObservadas;
  /** O porque da sondagem, escrito à mão — e, quando a sondagem falha, o que
   *  aconteceu em cima. Vai para o relatório para que o `git diff` de uma
   *  alteração de conteúdo se leia sem abrir o relatório à mão. */
  porque: string;
  /** O que o motor viu, ou porque é que nem se chegou a ver. */
  erro: string | null;
}

function bloco(v: unknown): boolean {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && typeof (v as { type?: unknown }).type === 'string';
}

/** Corre uma sondagem e diz o que o motor viu.
 *
 *  Duas coisas que este função recusa-se a fazer, e as duas importam:
 *
 *  **Não decide o que é um erro de linguagem.** Quem lê o texto é a projeção
 *  da linguagem escolhida, e o texto de outra linguagem é recusado pela
 *  projeção — com a mensagem dela, que é a que sabe o que é a linguagem. Um
 *  runner que dissesse «falhou» esconderia a metade mais importante da
 *  resposta.
 *
 *  **Não rebenta.** Uma sondagem montada à mão, sem passar pelo carregador,
 *  pode ter uma forma que não existe ou um programa que não é um bloco. O
 *  `CARREGAR` recusa essas; aqui elas dão um relatório. Um `throw` aqui
 *  seria um ecrã branco com a lição a meio, e o relatório existe para isso
 *  não acontecer. */
export function executarSonda(sonda: Sonda, linguagem: Language): ResultadoSonda {
  const nome = String(sonda.nome);
  const esperada = sonda.esperado.classe;

  const recusa = (motivo: string, porqueExtra: string): ResultadoSonda => ({
    ok: false,
    nome,
    esperada,
    observada: 'Observacao',
    porque: `${sonda.porque} ${porqueExtra}`,
    erro: `o motor viu que a sondagem está mal: ${motivo}`,
  });

  const forma = sonda.prova.forma as Forma;
  if (!(FORMAS as readonly string[]).includes(forma)) {
    return recusa(`a forma "${String(forma)}" não existe. As formas são: ${FORMAS.join(', ')}.`, '');
  }
  // A família vem do `FAMILIAS`, e **não** da projeção. A primeira versão
  // desta linha pedia a projeção, e uma linguagem sem projeção — Go, SQL,
  // mais três — rebentava em vez de explicar. Era o pior sítio possível para
  // rebentar: o SQL é a única declarativa das seis, e `forma: consulta` com
  // `sql` é a **combinação certa**, a que esta linha existe para dizer que
  // está errada quando não está. A família é uma propriedade da linguagem e
  // está escrita num sítio só; perguntar à projeção era pedir a coisa certa ao
  // sítio errado.
  const familia = FAMILIAS[linguagem];
  const formaDaFamilia = FORMAS_POR_FAMILIA[familia];
  if (forma !== formaDaFamilia) {
    return recusa(
      `a prova está escrita como "${forma}" e esta linguagem é ${familia}, que se prova com "${formaDaFamilia}".`,
      '',
    );
  }
  const temPrograma = sonda.prova.programa !== undefined;
  const temTexto = sonda.prova.texto !== undefined;
  if (temPrograma === temTexto) {
    return recusa('a prova tem de ter `programa` ou `texto`, nunca os dois e nunca nenhum.', '');
  }

  // O programa vai ser escrito pela projeção antes de ser julgado, e por isso
  // o que o motor vê é **sempre** texto. Não há caminho em que o motor julgue
  // blocos: julga o que a linguagem diz deles, e é isso que o aluno escreve.
  if (temPrograma && !bloco(sonda.prova.programa)) {
    // `pilhaDe` de uma coisa que não é um bloco devolve uma lista vazia, e um
    // programa vazio corre sem erro: sem esta linha, `programa: 5` dava uma
    // sondagem **aprovada**, e o que passava era uma sondagem sem programa.
    return recusa(`o campo "programa" não é um bloco: ${JSON.stringify(sonda.prova.programa) ?? 'vazio'}.`, '');
  }
  let texto: string;
  try {
    texto = temPrograma ? emitir(linguagem, sonda.prova.programa ?? null).texto : String(sonda.prova.texto ?? '');
  } catch (e) {
    return recusa(`o programa da prova não pôde ser escrito: ${(e as Error).message}`, '');
  }

  // O `avaliarTexto` vai no mesmo `try` que o `emitir` e por uma razão que
  // só se vê depois de partir: as duas coisas precisam da projeção, e uma
  // projeção que não existe rebenta nas duas. A primeira versão só
  // apanhava o `emitir`, e a promessa «**não rebenta**» do ficheiro era
  // verdadeira para metade do caminho — a outra metade rebentava a meio da
  // lição, que é exatamente o ecrã branco que o texto promete evitar.
  let erros;
  try {
    erros = avaliarTexto(linguagem, texto);
  } catch (e) {
    return recusa(`o texto da prova não pôde ser lido: ${(e as Error).message}`, '');
  }
  const observada = classificar(erros);
  const ok = observada === esperada;
  if (ok) return { ok, nome, esperada, observada, porque: sonda.porque, erro: null };

  const primeiro = erros[0];
  const porqueExtra = primeiro === undefined
    ? 'Não aconteceu nada que se pudesse ver.'
    : `O que aconteceu: ${primeiro.porque} ${primeiro.remedio}`;
  return {
    ok,
    nome,
    esperada,
    observada,
    porque: `${sonda.porque} ${porqueExtra}`,
    erro: `o motor viu ${observada} e a sondagem esperava ${esperada}. ${porqueExtra}`,
  };
}
