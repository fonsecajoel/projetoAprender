import type { Sonda } from '../../conteudo/esquema';
import type { ClassesObservadas } from '../../projecoes/avaliar';

export interface SondasViewProps {
  /** A sondagem deste passo. `null` é um estado que o carregador torna
   *  impossível — um passo sem sondagem é um passo em que a pessoa faz e não
   *  sabe se acertou, e o carregador atira `ErroDeAutoria` — mas o ecrã
   *  trata-o na mesma, e trata-o a mostrar o que falta em vez de mostrar
   *  uma caixa vazia. */
  sonda: Sonda | null;
  /** O que o motor deu da última corrida, ou `null` se ainda não correu
   *  nada. Um ecrã que mostra um veredicto antes de haver corrida está a
   *  dizer que a pessoa viu alguma coisa que não viu. */
  observada: ClassesObservadas | null;
  /** A razão que o motor deu, quando a corrida não bateu. */
  motivo: string;
  /** A pessoa carregou em «Ver a resposta». */
  revelado: boolean;
  aoRevelar: () => void;
}

/** A sondagem do passo: a pergunta, o que aconteceu, e a fuga.
 *
 *  A sondagem é o que decide se o momento fica visto. Não é o botão, não é o
 *  clique, e não é ofacto de a pessoa ter mexido em algum bloco: é o
 *  resultado que o motor deu ser o que a sondagem queria. Uma porta
 *  Hogwarts que se abre com um gesto e uma porta que se abre com a coisa
 *  certain estão a ensinar coisas diferentes, e o produto é a segunda.
 *
 *  O que aparece aqui é sempre o **nome da classe** que o motor deu, nos dois
 *  sentidos. Mostrar a classe é o que faz a pessoa ver que a diferença
 *  entre `Observacao` e `FalhaRuntime` é uma coisa que existe, e é
 *  precisamente essa diferença que a lição anda a ensinar. */
export function SondasView({ sonda, observada, motivo, revelado, aoRevelar }: SondasViewProps) {
  if (sonda === null) {
    return (
      <section className="sondas">
        <p className="aviso">
          Este passo não tem sondagem, e portanto nada aqui está a ser julgado. O que
          fizeste conta na mesma — o produto não tem opinião sobre o teu trabalho, só
          tem sobre as sondagens.
        </p>
        <button type="button" onClick={aoRevelar}>
          Ver a resposta
        </button>
      </section>
    );
  }

  const bateu = observada !== null && observada === sonda.esperado.classe;

  return (
    <section className="sondas">
      <p className="sonda-pergunta">{sonda.pergunta}</p>
      {observada === null ? null : (
        <p className={bateu ? 'sonda-veredicto' : 'sonda-veredicto sonda-veredicto-falta'}>
          {bateu
            ? `Agora já viste o que a sondagem queria ver. Isto deu ${observada}.`
            : `Ainda não. Isto deu ${observada}, e a sondagem estava à procura de ${sonda.esperado.classe}. ${motivo}`}
        </p>
      )}
      {revelado ? (
        <div className="sonda-revelada">
          <p className="sonda-revelada-porque">{sonda.esperado.porque.trim()}</p>
          <p className="sonda-revelada-aviso">
            Esta resposta foi revelada. Não a descobriste tu, e a lição conta o
            momento como não-descobrimento.
          </p>
        </div>
      ) : null}
      <button type="button" onClick={aoRevelar}>
        Ver a resposta
      </button>
    </section>
  );
}
