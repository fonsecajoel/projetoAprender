import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NUCLEO = 'src/nucleo';

/* O casamento é sobre o **caminho**, e não sobre a sintaxe do import.
 *
 *  A primeira versão casava `from '…'`, e isso deixava passar cinco furos que
 *  uma revisão mediu um a um: o `await import('../projecoes/avaliar')`, que o
 *  Vitest transforma numa chamada e que funciona; o `require('../projecoes/…')`;
 *  e o `import 'projecoes/avaliar';` sem nome nenhum, que é um import
 *  verdadeiro. Os três são a mesma coisa — um caminho para uma projeção escrito
 *  num literal — e casar a sintaxe em vez do caminho é casar a metade que é
 *  mais fácil e deixar passar a que interessa.
 *
 *  E `String s = 'a'; const t = "projecoes";` **também** é apanhado agora. É
 *  um falso positivo, e é o preço certo: um ficheiro do núcleo que tem a
 *  palavra `projecoes` num literal não tem motivo nenhum para a ter, e o
 *  núcleo vive da promessa de não saber sintaxe nenhuma. */
const PROIBIDO = /['"][^'"]*projecoes[^'"]*['"]/;

/* As extensões são as que o `tsconfig` compila **e** as que um dia
 *  alguém usaria para fugir ao verificador. Um `.mts` no núcleo não é
 *  compilado por nada hoje, e por isso o ficheiro seria código morto — mas
 *  «código morto que viola o invariante» é a pior das duas coisas, e o preço
 *  de o fechar é uma palavra numa expressão. */
const EXTENSOES = ['.ts', '.tsx', '.mts', '.cts', '.mjs', '.cjs'];

/** Os comentários saem antes do casamento.
 *
 *  Um import comentado não é um import, e o ficheiro que documenta a
 *  tentação tem de poder mostrar a tentação: o `avaliador.test.ts` escreve
 *  `import { avaliarTexto } from '../projecoes/…'` numa linha de comentário,
 *  precisamente para dizer "é isto que um dia vai acontecer aqui dentro". Com
 *  o casamento sobre o texto cru, esse `from` conta como violação — e o
 *  verificador que existe para proteger o invariante passa a proibir que o
 *  invariante seja explicado. Foi o que aconteceu na Task 2, e o portão
 *  reportou verde na mesma.
 *
 *  O `(^|[^:])` antes do `//` existe para não partir os `https://` das
 *  URL em comentários.
 */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function ficheiros(raiz: string): string[] {
  return readdirSync(raiz).flatMap((nome) => {
    const caminho = join(raiz, nome);
    if (statSync(caminho).isDirectory()) return ficheiros(caminho);
    return EXTENSOES.some((e) => caminho.endsWith(e)) ? [caminho] : [];
  });
}

const todos = ficheiros(NUCLEO);
// Os testes contam para o invariante tanto como o resto: um teste que importa
// uma projeção para poder escrever o resultado esperado não está a testar o
// núcleo, está a depender dele. A contagem é que os separa, para que o número
// que este script imprime diga quantos ficheiros *de produção* o núcleo tem.
const deTeste = todos.filter((f) => f.includes('.test.'));

const violacoes = todos.filter((f) =>
  PROIBIDO.test(semComentarios(readFileSync(f, 'utf8'))),
);

if (violacoes.length > 0) {
  console.error('O núcleo semântico não pode importar projeções:');
  for (const v of violacoes) console.error('  ' + v);
  process.exit(1);
}
console.log(
  'núcleo limpo: ' +
    (todos.length - deTeste.length) +
    ' ficheiros de produção + ' +
    deTeste.length +
    ' de teste, zero importações de projeções',
);
