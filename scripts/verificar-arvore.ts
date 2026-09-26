import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NUCLEO = 'src/nucleo';
const PROIBIDO = /from\s+['"][^'"]*projecoes[^'"]*['"]/;

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
    return caminho.endsWith('.ts') || caminho.endsWith('.tsx') ? [caminho] : [];
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
