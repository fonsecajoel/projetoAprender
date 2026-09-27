import type { Passo } from '../../conteudo/esquema';
import { ROTULOS } from '../tipos';

export interface MapaPassosProps {
  passos: readonly Passo[];
  indiceActual: number;
  aoIrPara: (indice: number) => void;
}

function resumo(passo: Passo): string {
  if (passo.nomear !== undefined) return passo.nomear;
  const limpo = passo.porque.replace(/\s+/g, ' ').trim();
  if (limpo.length <= 48) return limpo;
  return `${limpo.slice(0, 45)}…`;
}

/** Índice lateral da lição — o mapa de passos que um curso interativo mostra
 *  à esquerda para saberes onde estás e poder voltar atrás. */
export function MapaPassos({ passos, indiceActual, aoIrPara }: MapaPassosProps) {
  return (
    <nav className="mapa-passos" aria-label="Índice da lição">
      <p className="mapa-titulo">Conteúdo</p>
      <ol className="mapa-lista">
        {passos.map((passo, i) => {
          const actual = i === indiceActual;
          const concluido = i < indiceActual;
          const podeIr = i <= indiceActual;
          const estado = actual ? 'actual' : concluido ? 'concluido' : 'bloqueado';

          return (
            <li key={`passo-${i}`} className={`mapa-item mapa-item-${estado}`}>
              {podeIr ? (
                <button
                  type="button"
                  className="mapa-botao"
                  aria-current={actual ? 'step' : undefined}
                  onClick={() => aoIrPara(i)}
                >
                  <span className="mapa-indice" aria-hidden="true">
                    {concluido ? '✓' : i + 1}
                  </span>
                  <span className="mapa-texto">
                    <span className="mapa-fase">{ROTULOS[passo.fase]}</span>
                    <span className="mapa-resumo">{resumo(passo)}</span>
                  </span>
                </button>
              ) : (
                <div className="mapa-botao mapa-botao-bloqueado" aria-disabled="true">
                  <span className="mapa-indice" aria-hidden="true">{i + 1}</span>
                  <span className="mapa-texto">
                    <span className="mapa-fase">{ROTULOS[passo.fase]}</span>
                    <span className="mapa-resumo">{resumo(passo)}</span>
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
