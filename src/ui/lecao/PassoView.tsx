import { Blocos } from '../painel-blocos';
import { PORTA_ENTRADA, PORTA_SAIDA, PainelRobo } from '../robo';
import { PainelTexto } from '../texto';
import { ROTULOS } from '../tipos';
import type { EstadoLicao } from '../estado';
import { SondasView } from './SondasView';
import type { BlocoLeigo } from '../../nucleo/avaliador';
import type { Divergencia } from '../../nucleo/divergencia';
import type { Language, Recusa, Valor } from '../../nucleo/tipos';
import type { ClassesObservadas } from '../../projecoes/avaliar';

export interface PassoViewProps {
  estado: EstadoLicao;
  linguagem: Language;
  /** O programa que está no painel de blocos agora mesmo. */
  programa: BlocoLeigo | null;
  /** Um valor por porta do robô, pela chave `id` da porta. */
  valores: Readonly<Record<string, Valor | undefined>>;
  recusa: Recusa | null;
  observada: ClassesObservadas | null;
  motivo: string;
  revelado: boolean;
  divergencias: Divergencia[];
  /** O programa do passo escrito na linguagem escolhida. Vem de fora porque
   *  a escrita é coisa da projeção, e `PasoView` não sabe nada de
   *  projeções: sabe que lhe deram um texto para abrir o editor. */
  textoInicial: string;
  aoMudar: (programa: BlocoLeigo | null) => void;
  aoCorrer: () => void;
  aoComparar: (texto: string) => void;
  aoResponder: (texto: string) => void;
  aoRevelar: () => void;
  aoContinuar: () => void;
  aoVoltar: () => void;
}

/** O corpo de um passo: o que a lição pede, o programa, e o que fica.
 *
 *  Tudo o que decide **qual** painel aparece está num `if` só, e o `if` lê a
 *  `fonte` do momento. Não a fase, e não o índice do passo.
 *
 *  A distinção não é de estilo. A fase diz o que a pessoa está a fazer — ler,
 *  fazer, dar nome — e a fonte diz de onde vem a resposta que o produto espera.
 *  Um passo `explicar` pode trazer blocos (o passo 0 traz), um passo `nomear`
 *  pode trazer blocos (o passo 5 traz), e um passo `fazer` pode trazer o
 *  editor de texto. Escolher pelo passo obriga a repetir a decisão em mais um
 *  sítio, e os dois sítios divergem no primeiro passo que foge ao padrão. */
export function PassoView({
  estado,
  linguagem,
  programa,
  valores,
  recusa,
  observada,
  motivo,
  revelado,
  divergencias,
  textoInicial,
  aoMudar,
  aoCorrer,
  aoComparar,
  aoResponder,
  aoRevelar,
  aoContinuar,
  aoVoltar,
}: PassoViewProps) {
  const { passo, momentoActual, referencia } = estado;
  const fonte = momentoActual?.fonte ?? 'blocos';
  const visto = momentoActual !== null && estado.feito[momentoActual.id] === true;
  const nenhum = passo.momentos.length;

  return (
    <section className="passo" aria-label="O passo">
      <p className="passo-fase">{ROTULOS[passo.fase]}</p>
      <p className="passo-porque">{passo.porque.trim()}</p>
      {passo.nomear === undefined ? null : <p className="passo-palavra">{passo.nomear}</p>}

      <SondasView
        sonda={estado.sonda}
        observada={observada}
        motivo={motivo}
        revelado={revelado}
        aoRevelar={aoRevelar}
      />

      {fonte === 'blocos' ? (
        <div className="passo-blocos">
          <Blocos
            aoMudar={aoMudar}
            chave={`${estado.indicePasso}-${estado.momento}`}
            linguagem={linguagem}
            carregar={passo.bloco}
          />
          <PainelRobo
            portas={[PORTA_ENTRADA, PORTA_SAIDA]}
            valores={valores}
            recusa={recusa}
          />
          <button type="button" onClick={aoCorrer}>
            Correr o programa
          </button>
        </div>
      ) : null}

      {fonte === 'texto' ? (
        <PainelTexto
          linguagem={linguagem}
          resposta={textoInicial}
          aoComparar={aoComparar}
          divergencias={divergencias}
        />
      ) : null}

      {fonte === 'leitura' ? (
        <div className="passo-leitura">
          {referencia === undefined ? null : <Ficha referencia={referencia} />}
          <Pergunta momento={momentoActual} resposta={estado.respostas} aoResponder={aoResponder} />
        </div>
      ) : null}

      {estado.erros.length === 0 ? null : (
        <div className="erros" role="alert">
          <p className="erros-titulo">O que o programa fez</p>
          <ul>
            {estado.erros.map((erro, i) => (
              <li key={`${erro.classe}-${i}`} className="erro">
                <p className="erro-classe">{erro.classe}</p>
                <p className="erro-porque">{erro.porque}</p>
                <p className="erro-remedio">{erro.remedio}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="passo-progresso">{`Momento ${estado.momento + 1} de ${nenhum}`}</p>
      {visto ? null : (
        <p className="passo-falta">
          {fonte === 'leitura'
            ? 'Ainda falta este momento: responde com uma frase sobre a linha.'
            : 'Ainda falta este momento: corre o programa e vê o que acontece.'}
        </p>
      )}

      <div className="passo-acoes">
        <button type="button" onClick={aoVoltar}>
          Voltar
        </button>
        <button type="button" onClick={aoContinuar}>
          Continuar
        </button>
      </div>
    </section>
  );
}

/** O ficheiro que o passo manda ler.
 *
 *  As linhas vêm da sondagem nomeada em `referencia` e de mais lado nenhum —
 *  a lição guarda o ficheiro num sítio só. A indentação é o que se vê e o
 *  que se copia: a linha que está dentro do laço é a que está indented, e
 *  deitá-la de fora mostraria um ficheiro que não é o ficheiro, e a pergunta
 *  sobre essa linha ficaria sem resposta possível. Por isso cada linha vai
 *  dentro de um elemento com a linha preservada tal e qual, e o teste
 *  compara o `textContent` e não o texto do ecrã. */
function Ficha({ referencia }: { referencia: { nome: string; linhas: string[] } }) {
  return (
    <div className="ficha">
      <h2 className="ficha-nome">{referencia.nome}</h2>
      <ol className="ficha-linhas">
        {referencia.linhas.map((linha, i) => (
          <li key={`${i}-${linha}`} className="ficha-linha" data-linha={i + 1}>
            <code>{linha}</code>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A pergunta do momento, e o sítio de responder.
 *
 *  O campo responde com uma frase, e nenhuma resposta é errada: uma resposta
 *  que não tem as palavras que a pergunta pedia não é uma resposta que está
 *  mal, é uma resposta que não diz o que a linha fazia. O ecrã diz o que
 *  falta e não diz que a pessoa errou — a diferença entre este produto e um
 *  questionário está exatamente nessa frase. */
function Pergunta({
  momento,
  resposta,
  aoResponder,
}: {
  momento: EstadoLicao['momentoActual'];
  resposta: Record<string, string>;
  aoResponder: (texto: string) => void;
}) {
  if (momento === null) return null;
  const id = `resposta-${momento.id}`;
  return (
    <div className="pergunta">
      <p className="pergunta-texto">{momento.texto}</p>
      <label htmlFor={id}>A tua resposta</label>
      <input
        id={id}
        type="text"
        value={resposta[momento.id] ?? ''}
        onChange={(e) => aoResponder(e.target.value)}
      />
      {momento.palavras.length === 0 ? null : (
        <p className="pergunta-dica">
          Pode ser uma frase. O que interessa é que diga o que a linha faz.
        </p>
      )}
    </div>
  );
}
