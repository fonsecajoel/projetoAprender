import { useCallback, useMemo, useState } from 'react';
import type { Fase, Licao, Momento, Passo, Sonda } from '../conteudo';
import type { Erro } from '../nucleo/tipos';

/** O texto da pessoa, posto numa forma em que só há letras e dígitos.
 *
 *  Tirar os acentos não é um detalhe. A lição escreve `número`, `lógica` e
 *  `atribuição` nas palavras que pede, e o teclado de quem está a aprender
 *  não é o teclado de quem escreveu a lição: não tem cedilha, e um
 *  telemóvel com o teclado em inglês não tem sequer o acento. Sem esta
 *  tira, a palavra pedida nunca é dita e a ficha de leitura nunca mais
 *  abre — e não há botão para saltar, porque saltar a ficha é saltar a
 *  lição. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A resposta diz uma das palavras que a pergunta pedia?
 *
 *  Casa por subcadeia, para a pessoa poder responder com uma frase em vez
 *  de adivinhar a palavra exata. Não há resposta errada: há respostas que
 *  não dizem nada do que a linha fazia, e essas não avançam o passo porque
 *  o passo ainda não foi lido.
 *
 *  Uma resposta vazia nunca bate, mesmo com a lista de palavras vazia. Um
 *  momento fora da ficha tem `palavras` vazio, e `''.includes('')` é
 *  verdade — o que faria de cada momento fora da ficha um momento visto. */
export function respostaBate(alvo: string[], resposta: string): boolean {
  const r = normalizar(resposta);
  if (r.length === 0) return false;
  return alvo.some((p) => {
    const pedida = normalizar(p);
    return pedida.length > 0 && r.includes(pedida);
  });
}

export interface EstadoLicao {
  licao: Licao;
  indicePasso: number;
  totalPassos: number;
  passo: Passo;
  /** A fase do passo. Não é uma escolha do aluno: é o que o passo é. Por
   *  isso vive aqui como valor derivado e não como `useState` — se fosse
   *  estado, o ecrã e a lição podiam discordar sobre o passo atual. */
  fase: Fase;
  momento: number;
  totalMomentos: number;
  momentoActual: Momento | null;
  sonda: Sonda | null;
  feito: Record<string, boolean>;
  erros: Erro[];
  respostas: Record<string, string>;
  /** O ficheiro que este passo manda ler, se for um passo de ficha. */
  referencia?: { nome: string; linhas: string[] };
  proximo: () => void;
  anterior: () => void;
  responder: (texto: string) => boolean;
  observar: () => void;
  proximoPasso: () => void;
  irPara: (passo: number) => void;
  definirErros: (erros: Erro[]) => void;
  definirResposta: (momentoId: string, texto: string) => void;
}

export function useLicao(licao: Licao, passoInicial = 0): EstadoLicao {
  const [indicePasso, definirIndice] = useState(passoInicial);
  const [momento, definirMomento] = useState(0);
  const [feito, definirFeito] = useState<Record<string, boolean>>({});
  const [erros, definirErros] = useState<Erro[]>([]);
  const [respostas, definirRespostas] = useState<Record<string, string>>({});

  const passo = licao.passos[indicePasso] ?? licao.passos[0]!;
  const momentoActual = passo.momentos[momento] ?? null;

  // A sonda vive na lição, não no passo. O passo aponta para ela pelo nome e
  // a mesma sonda pode servir vários passos — a lição de Java vai precisar
  // disso, porque a lição dela é a mesma com outra sintaxe.
  const sonda = useMemo(
    () => licao.sondas.find((s) => s.nome === passo.sonda) ?? null,
    [licao.sondas, passo.sonda],
  );

  /** As linhas do ficheiro que este passo manda ler. Vêm da sonda nomeada
   *  em `referencia`, e de mais lado nenhum — a lição guarda o ficheiro num
   *  sítio só, e este é o sítio de onde o ecrã o vai buscar.
   *
   *  Uma sonda que não existe, ou uma sonda que prova um programa em vez de
   *  mostrar um ficheiro, dão `undefined` e não uma falha. Um erro de
   *  autoria na lição não pode aparecer a meio de uma pessoa a ler um
   *  ficheiro, e a porta que devolve este passo à pessoa é `temLicao`. */
  const referencia = useMemo(() => {
    if (!passo.referencia) return undefined;
    const texto = sonda?.prova.texto;
    if (texto === undefined) return undefined;
    return { nome: passo.referencia.nome, linhas: texto.trimEnd().split('\n') };
  }, [passo.referencia, sonda]);

  const totalMomentos = passo.momentos.length;
  const tudoFeito = passo.momentos.every((m) => feito[m.id]);

  /** Avança o momento. No último momento não avança o passo: avançar passo
   *  é uma decisão diferente, e é a de `proximoPasso`. Juntar as duas era
   *  um botão que às vezes saltava de passo sem o aluno querer. */
  const proximo = useCallback(() => {
    if (momento < totalMomentos - 1) definirMomento(momento + 1);
  }, [momento, totalMomentos]);

  const anterior = useCallback(() => {
    if (momento > 0) definirMomento(momento - 1);
  }, [momento]);

  const responder = useCallback(
    (texto: string): boolean => {
      const atual = passo.momentos[momento];
      if (!atual || atual.fonte !== 'leitura' || atual.palavras.length === 0) {
        // Só a ficha avalia palavras. Em qualquer outro momento o produto
        // não tem opiniões sobre o que o aluno escreveu: ou o programa
        // corre, ou não corre, e o texto é o texto.
        return true;
      }
      // `respostaBate` casa por subcadeia e sem pontuação: "esta linha
      // guarda um número" bate com "guarda" e com "número". Não há resposta
      // errada, há respostas que não dizem a palavra que a pergunta pedia.
      const ok = respostaBate(atual.palavras, texto);
      if (ok) definirFeito((f) => ({ ...f, [atual.id]: true }));
      return ok;
    },
    [momento, passo, definirFeito],
  );

  const observar = useCallback(() => {
    if (!momentoActual) return;
    definirFeito((f) => ({ ...f, [momentoActual.id]: true }));
  }, [momentoActual, definirFeito]);

  const proximoPasso = useCallback(() => {
    if (!tudoFeito) return;
    if (indicePasso < licao.passos.length - 1) {
      definirIndice(indicePasso + 1);
      definirMomento(0);
    }
  }, [tudoFeito, indicePasso, licao.passos.length]);

  const irPara = useCallback(
    (passo: number) => {
      if (passo < 0 || passo >= licao.passos.length) return;
      definirIndice(passo);
      definirMomento(0);
    },
    [licao.passos.length],
  );

  const definirResposta = useCallback((momentoId: string, texto: string) => {
    definirRespostas((r) => ({ ...r, [momentoId]: texto }));
  }, []);

  return useMemo(
    () => ({
      licao,
      indicePasso,
      totalPassos: licao.passos.length,
      passo,
      fase: passo.fase,
      momento,
      totalMomentos,
      momentoActual,
      sonda,
      feito,
      erros,
      respostas,
      referencia,
      proximo,
      anterior,
      responder,
      observar,
      proximoPasso,
      irPara,
      definirErros,
      definirResposta,
    }),
    [
      licao, indicePasso, passo, momento, totalMomentos, momentoActual, sonda, feito,
      erros, respostas, referencia, proximo, anterior, responder, observar,
      proximoPasso, irPara, definirResposta,
    ],
  );
}
