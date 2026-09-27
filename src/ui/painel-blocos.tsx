import { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';
import type { BlocoLeigo } from '../nucleo/avaliador';
import type { Language } from '../nucleo/tipos';
import { OPCOES_PONTE } from './blockly-tema';
import { caixaComoOBlockly, criarToolbox, deBlocoLeigo, paraBlocoLeigo, registarBlocos } from './blocos';

/** Põe um bloco acrescentado no ecrã.
 *
 *  `append` é tipado a devolver `Block` porque também serve o modo sem ecrã.
 *  Numa `WorkspaceSvg` o que sai é sempre um `BlockSvg`, e `initSvg`/`render`
 *  é o que o faz aparecer. A conversão está escrita uma vez, aqui, e com o
 *  nome de quem a faz — um `as BlockSvg` repetido em dois sítios é o
 *  caminho mais curto para um `as never` disfarçado. */
function noEcran(bloco: Blockly.Block): Blockly.BlockSvg {
  const svg = bloco as Blockly.BlockSvg;
  svg.initSvg();
  svg.render();
  return svg;
}

export interface BlocosProps {
  /** Chamado com o programa sempre que o ecrã muda, e com `null` quando fica
   *  vazio. Um programa vazio é um programa, e dizer isso ao motor é diferente
   *  de dizer que o aluno não fez nada. */
  aoMudar: (programa: BlocoLeigo | null) => void;
  /** O programa a pôr no ecrã quando o passo muda. `null` deixa o ecrã em
   *  branco. */
  carregar?: BlocoLeigo | null;
  /** Muda quando a pessoa entra noutro passo. A chave é o que manda recriar o
   *  ecrã, e não uma comparação profunda do programa: comparar `{…}` a cada
   *  quadro recriaria o ecrã a cada quadro, e o aluno perderia o que estava a
   *  meio de montar. */
  chave: string;
  linguagem: Language;
}

/** A área de blocos.
 *
 *  Tudo o que este ficheiro faz de subtil está em duas decisões.
 *
 *  A primeira é que `aoMudar` vive num `ref` e não no array de dependências.
 *  Se estivesse lá, cada vez que o componente que o desenha criasse uma
 *  função nova — o que acontece em cada estado novo, e um estado novo acontece
 *  a cada passo — o ecrã era destruído e recriado, e o aluno via o seu
 *  programa desaparecer sozinho. A dependência é a chave, e nada mais.
 *
 *  A segunda é que o programa guardado é aplicado **também na montagem**. A
 *  primeira versão saltava a primeira aplicação com um `primeira` de `ref`, e
 *  o resultado era que a lição abria sempre em branco: o passo tinha um bloco
 *  inicial, o bloco inicial existia no ficheiro, e nunca aparecia no ecrã. */
export function Blocos({ aoMudar, carregar, chave, linguagem }: BlocosProps) {
  const alvo = useRef<HTMLDivElement | null>(null);
  const espaco = useRef<Blockly.WorkspaceSvg | null>(null);
  const aoMudarRef = useRef(aoMudar);
  aoMudarRef.current = aoMudar;

  useEffect(() => {
    const elemento = alvo.current;
    if (elemento === null) return;

    const injetado = Blockly.inject(elemento, {
      ...OPCOES_PONTE,
      toolbox: caixaComoOBlockly(criarToolbox(linguagem)),
    });
    espaco.current = injetado;
    registarBlocos(linguagem);

    const aoEvento = (): void => {
      aoMudarRef.current(paraBlocoLeigo(Blockly.serialization.workspaces.save(injetado)));
    };
    injetado.addChangeListener(aoEvento);

    if (carregar !== undefined && carregar !== null) {
      for (const bloco of deBlocoLeigo(carregar)) noEcran(Blockly.serialization.blocks.append(bloco, injetado));
    }
    // O primeiro `aoMudar` é imediato e não espera por um evento: um programa
    // que já veio de fora é um programa que o ecrã já tem, e quem o desenhou
    // precisa de o saber antes de a pessoa mexer em alguma coisa.
    aoMudarRef.current(paraBlocoLeigo(Blockly.serialization.workspaces.save(injetado)));

    return () => {
      injetado.removeChangeListener(aoEvento);
      injetado.dispose();
      espaco.current = null;
    };
    // `linguagem` entra porque mudar de linguagem é mudar de vocabulário, e
    // o ecrã antigo é de outra linguagem. `carregar` **não** entra: quem
    // carrega o programa é o efeito de baixo, e depende do valor, não da
    // identidade.
  }, [chave, linguagem]);

  useEffect(() => {
    const ws = espaco.current;
    if (ws === null) return;
    if (carregar === undefined) return;
    ws.clear();
    for (const bloco of deBlocoLeigo(carregar)) noEcran(Blockly.serialization.blocks.append(bloco, ws));
    aoMudarRef.current(paraBlocoLeigo(Blockly.serialization.workspaces.save(ws)));
  }, [carregar]);

  return <div ref={alvo} data-testid="area-blocos" className="area-blocos" />;
}
