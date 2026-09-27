import type { Recusa, Tipo, Valor } from '../nucleo/tipos';
import './robo.css';

/** Como cada tipo se lê para quem não sabe programar.
 *
 *  Quatro dos seis são o próprio nome do tipo, e isso é o que se quer: quem
 *  lê `texto` no robô e lê `texto` no ficheiro não tem uma ponte para
 *  atravessar. Os dois que mudam mudam por uma razão, e as duas são
 *  traduções — `lógico` é «sim ou não» porque `true` e `false` são as
 *  palavras da máquina, não da pessoa; `actor` fica em inglês porque é o
 *  nome que o conceito tem em todo o lado e traduzi-lo cria um termo que
 *  não existe em mais lado nenhum.
 *
 *  O `Record` é a verificação de que nenhum tipo ficou de fora: um tipo novo
 *  aqui sem nome é um erro do `tsc`, e não uma porta que mostra `undefined`. */
export const NOMES_TIPO: Record<Tipo, string> = {
  número: 'número',
  texto: 'texto',
  lógico: 'sim ou não',
  lista: 'lista',
  função: 'função',
  actor: 'actor',
};

export interface PortaRobo {
  /** Identificador estável. É a chave de `valores`, e é o que o ecrã usa
   *  para decidir que valor entra em que porta. */
  id: string;
  nome: string;
  tipo: Tipo;
}

export const PORTA_ENTRADA: PortaRobo = { id: 'entrada', nome: 'entrada', tipo: 'número' };
export const PORTA_SAIDA: PortaRobo = { id: 'saida', nome: 'saída', tipo: 'número' };

/** Como o valor de uma porta se escreve para quem olha para o robô.
 *
 *  A conta é por tipo, e não um `String()` do que calhou. `String(true)` dá
 *  `true` e `String(['a', 'b'])` dá `a,b` — que é uma frase, do tipo
 *  errado, e parece texto. Um painel que mostra uma lista como frase ensina
 *  o contrário do que os outros ecrãs dizem, e o produto inteiro é sobre o
 *  que protege o tipo. */
function mostrar(v: Valor): string {
  switch (v.tipo) {
    case 'número':
    case 'texto':
      return String(v.valor);
    case 'lógico':
      return v.valor === true ? 'sim' : 'não';
    case 'lista':
      return `lista com ${Array.isArray(v.valor) ? v.valor.length : 0} coisas`;
    case 'função':
      return 'função';
    case 'actor':
      return 'actor';
  }
}

export interface PainelRoboProps {
  portas: readonly PortaRobo[];
  /** Um valor por porta, pela chave `id` da porta. E não uma lista da qual o
   *  painel escolhe: com `entrada` e `saída` as duas de `número`, «o último
   *  valor do tipo» punha o mesmo número nas duas, e a entrada mostrava o
   *  valor que acabou de sair. Um valor num sítio escolhido é o que um
   *  arrastar produz, e é o que a pessoa vê: esta porta tem isto, aquela
   *  porta tem aquilo. */
  valores: Readonly<Record<string, Valor | undefined>>;
  recusa: Recusa | null;
}

export function PainelRobo({ portas, valores, recusa }: PainelRoboProps) {
  return (
    <section aria-label="O robô" className="robo">
      <h2>O robô</h2>
      <div className="portas">
        {portas.map((porta) => {
          const recebido = valores[porta.id];
          // Só entra na porta o que o motor deixou passar: o valor é do
          // tipo da porta e não está recusado. Um valor recusado já passou
          // pelo motor e foi recusado, e mostrá-lo na porta ao lado da
          // recusa diria ao mesmo tempo que o valor entrou e que não
          // entrou. Um valor de outro tipo nunca entrou, e mostrá-lo seria
          // uma porta a mentir sobre o próprio tipo — e quem decide o que
          // entra é o motor, não este painel.
          const dentro =
            recebido !== undefined &&
            recebido.tipo === porta.tipo &&
            !recebido.recusado
              ? recebido
              : undefined;
          return (
            <div key={porta.id} className="porta" data-porta={porta.id} data-tipo={porta.tipo}>
              <span className="porta-nome">{porta.nome}</span>
              <span className="porta-tipo">{NOMES_TIPO[porta.tipo]}</span>
              <span className="porta-valor">{dentro === undefined ? '—' : mostrar(dentro)}</span>
            </div>
          );
        })}
      </div>
      {recusa ? (
        <div className="recusa" role="alert">
          {/* «A recusa é do robô» não é um adorno. A §11.2 do formato avisa
           *  que há duas recusas com a mesma palavra: a de arrastar um valor
           *  para esta ranhura, que acontece nas seis linguagens, e a do
           *  avaliador de texto, que em Python e em JavaScript não existe.
           *  A pessoa ouve as duas e, sem uma distinção no ecrã, aprende a
           *  desconfiar da palavra. Dizer de quem é a recusa é a distinção
           *  que o painel pode fazer sem inventar nada. */}
          <p className="recusa-quem">O robô não aceitou o valor.</p>
          <p className="recusa-porque">{recusa.porque}</p>
          <p>
            O que esta porta aceita: <strong>{NOMES_TIPO[recusa.esperado]}</strong>. O que
            lhe chegou: <strong>{NOMES_TIPO[recusa.obtido]}</strong>.
          </p>
          <p className="recusa-remedio">{recusa.remedio}</p>
        </div>
      ) : null}
    </section>
  );
}
