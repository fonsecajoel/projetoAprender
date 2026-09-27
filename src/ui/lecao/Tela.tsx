import { useCallback, useEffect, useMemo, useState } from 'react';
import { PassoView } from './PassoView';
import { useLicao } from '../estado';
import type { EstadoLicao } from '../estado';
import './lecao.css';
import { avaliador } from '../../nucleo/avaliador';
import type { BlocoLeigo } from '../../nucleo/avaliador';
import type { Divergencia } from '../../nucleo/divergencia';
import type { Erro, Language, Recusa, Valor } from '../../nucleo/tipos';
import { classificar, divergir as divergirNaLinguagem, emitir } from '../../projecoes/avaliar';
import type { ClassesObservadas } from '../../projecoes/avaliar';
import type { Licao } from '../../conteudo/esquema';

export interface TelaProps {
  linguagem: Language;
  licao: Licao;
  /** O passo em que se abre. Existe para os testes poderem medir cada passo
   *  sem fazer a pessoa chegar lá a carregar em botões — e é a mesma razão
   *  pela qual a lição tem quinze passos e não quinze ecrãs. */
  passoInicial?: number;
}

/** O que a última corrida deu: a classe, a razão, e o que ficou no robô. */
interface Corrida {
  observada: ClassesObservadas;
  motivo: string;
  valores: Record<string, Valor | undefined>;
  recusa: Recusa | null;
}

const SEM_CORRIDA: Corrida | null = null;

/** O ecrã da lição.
 *
 *  Aqui é que se decide quem julga o quê, e a decisão vale mais do que o
 *  ecrã todo: quem carrega em «Correr o programa» não é a pessoa que diz
 *  que acertou — é o motor, e o que ele diz é a **classe** que a sondagem
 *  esperava. A pessoa pode ter mexido em vinte blocos e acertado na mesma,
 *  e pode não ter mexido em nada e falhado na mesma, e as duas coisas são
 *  justas porque o que se julga é o programa e não a pessoa.
 *
 *  O programa que se julga é o que está no painel de blocos, e o painel é
 *  de onde ele sai. Não há uma segunda cópia do programa algures — o que o
 *  painel tem é o que o ecrã julga e o que a projeção escreve, e é por isso
 *  que `acordo.test.ts` consegue exigir que os dois motores do produto
 *  digam a mesma coisa sobre ele.
 *
 *  E o programa do passo entra no painel à partida. Um passo que manda
 *  «guarda um número com o nome `total`» e abre o painel vazio obriga a
 *  pessoa a saber a sintaxe antes de lhe terem ensinado nada, e o ficheiro
 *  de lição tem a linha escrita para ser lida antes de ser montada. */
export function Tela({ linguagem, licao, passoInicial = 0 }: TelaProps) {
  const estado = useLicao(licao, passoInicial);
  const [programa, definirPrograma] = useState<BlocoLeigo | null>(null);
  const [corrida, definirCorrida] = useState<Corrida | null>(SEM_CORRIDA);
  const [divergencias, definirDivergencias] = useState<Divergencia[]>([]);
  const [revelados, definirRevelados] = useState<Record<string, boolean>>({});

  // Um erro é o que aconteceu numa corrida, e uma corrida é de um passo.
  // Deixá-lo no ecrã do passo seguinte é pôr ali uma falha que já não é do
  // programa que está à vista, e a pessoa passa a depurar código que não é
  // dela. Mudou o passo, mudaram-se as contas.
  useEffect(() => {
    estado.definirErros([]);
  }, [estado.indicePasso]);

  /** O programa do passo escrito na linguagem escolhida.
   *
   *  Sai da projeção, que é a única que sabe a sintaxe, e de mais lado
   *  nenhum. A alternativa — um `texto` novo no esquema da lição — seria uma
   *  segunda versão do mesmo programa, e as duas divergiriam no primeiro
   *  bloco que alguém mudasse de um lado só. */
  const textoInicial = useMemo(() => {
    try {
      return emitir(linguagem, estado.passo.bloco).texto;
    } catch {
      // Um bloco que a projeção não sabe escrever não pode partir o ecrã de
      // quem está a ler. O editor abre vazio e a lição continua, que é
      // infinitamente melhor do que uma página branca com um erro em
      // letra miudinha.
      return '';
    }
  }, [linguagem, estado.passo]);

  const aoMudar = useCallback((novo: BlocoLeigo | null) => {
    definirPrograma(novo);
  }, []);

  const correr = useCallback(() => {
    const a = avaliador();
    a.executar(programa);
    const erros: Erro[] = [...a.trace.erros];
    const observada = classificar(erros);
    estado.definirErros(erros);
    definirCorrida({
      observada,
      motivo: motivoDe(erros),
      valores: valoresDaRobo(a.trace.valores),
      recusa: erros.find((e): e is Recusa => e.classe === 'Recusa') ?? null,
    });
    // A sondagem é o que decide, e decide uma coisa só: se o que o motor
    // deu é a classe que a sondagem queria. Não é um botão, não é o acto
    // de mexer, e não é o que a pessoa escreveu no editor.
    if (estado.sonda !== null && observada === estado.sonda.esperado.classe) {
      estado.observar();
    }
  }, [programa, estado]);

  const comparar = useCallback(
    (texto: string) => {
      // A divergência é a pergunta «o teu texto faz o mesmo que estes
      // blocos?», e é a pergunta mais útil que se pode fazer a quem está a
      // passar de uma linguagem para outra: a diferença entre os dois
      // projectos é quase sempre uma linha, e essa linha diz-se.
      try {
        // `divergir` recebe o **programa**, não o texto emitido: quem escreve
        // é a projeção, e passar-lhe o texto que ela acabou de escrever é
        // dizer-lhe que o que ela há de decidir já está decidido.
        definirDivergencias(divergirNaLinguagem(linguagem, estado.passo.bloco, texto).divergencias);
      } catch {
        definirDivergencias([]);
      }
    },
    [linguagem, estado.passo],
  );

  const responder = useCallback(
    (texto: string) => {
      if (estado.momentoActual !== null) estado.definirResposta(estado.momentoActual.id, texto);
      estado.responder(texto);
    },
    [estado],
  );

  const revelar = useCallback(() => {
    const momento = estado.momentoActual;
    if (momento === null) return;
    definirRevelados((r) => ({ ...r, [momento.id]: true }));
    // Revelar marca o momento como visto. É uma fuga, e uma fuga que não
    // destrava a porta não é uma fuga: é uma parede com uma janela. O que
    // a distingue de ter visto é a linha do `SondasView` que diz na cara
    // que a resposta foi revelada.
    estado.observar();
  }, [estado]);

  const continuar = useCallback(() => {
    if (estado.momento < estado.totalMomentos - 1) {
      estado.proximo();
      return;
    }
    estado.proximoPasso();
  }, [estado]);

  const voltar = useCallback(() => {
    if (estado.momento > 0) {
      estado.anterior();
      return;
    }
    if (estado.indicePasso > 0) estado.irPara(estado.indicePasso - 1);
  }, [estado]);

  const revelado = estado.momentoActual !== null && (revelados[estado.momentoActual.id] ?? false);

  return (
    <main className="tela">
      <Cabecalho estado={estado} />
      <PassoView
        estado={estado}
        linguagem={linguagem}
        programa={programa}
        textoInicial={textoInicial}
        valores={corrida?.valores ?? {}}
        recusa={corrida?.recusa ?? null}
        observada={corrida?.observada ?? null}
        motivo={corrida?.motivo ?? ''}
        revelado={revelado}
        divergencias={divergencias}
        aoMudar={aoMudar}
        aoCorrer={correr}
        aoComparar={comparar}
        aoResponder={responder}
        aoRevelar={revelar}
        aoContinuar={continuar}
        aoVoltar={voltar}
      />
    </main>
  );
}

/** Onde está, e o que esta lição é. */
function Cabecalho({ estado }: { estado: EstadoLicao }) {
  return (
    <header className="tela-cabecalho">
      <h1>{estado.licao.titulo}</h1>
      <p className="tela-porque">{estado.licao.porqueTitulo.trim()}</p>
      <p className="tela-progresso">
        {`Passo ${estado.indicePasso + 1} de ${estado.totalPassos}`}
      </p>
    </header>
  );
}

/** A frase que vai por baixo do veredicto quando a corrida não bateu.
 *
 *  Sai do motor e não de um dicionário do ecrã. A diferença é que o motor
 *  sabe o que aconteceu e o ecrã só sabe o que costuma acontecer: um
 *  dicionário é uma lista de frases para os erros que se previa, e o
 *  primeiro erro que não estiver na lista fica sem explicação nenhuma — que
 *  é a pior coisa que se pode fazer a quem está a tentar perceber. */
function motivoDe(erros: readonly Erro[]): string {
  // As três classes de `Erro` têm `remedio` — é a regra que a Task 1 fixou
  // para `Recusa` e que o teste do motor estende a todas. Um `in` aqui dava
  // um ramo que nunca corre, e a assinatura do TypeScript punia o
  // código com um `never` onde devia estar a regra.
  const primeiro = erros[0];
  if (primeiro === undefined) return 'Não aconteceu nada que se pudesse ver.';
  return `${primeiro.porque} ${primeiro.remedio}`;
}

/** O que o robô mostra depois da corrida.
 *
 *  Só entra na porta o que o motor registou, e o registo é do `log` e do
 *  `dizer` — as duas coisas que num programa são a voz. O `dizer` é o
 *  `print` do Python e não sai do programa: sai do ecrã, e é por isso que
 *  ele também conta. */
function valoresDaRobo(valores: readonly Valor[]): Record<string, Valor | undefined> {
  const ditos = valores.filter((v) => v.origem.bloco === 'log' || v.origem.bloco === 'dizer');
  const ultimo = ditos[ditos.length - 1];
  return { entrada: undefined, saida: ultimo };
}
