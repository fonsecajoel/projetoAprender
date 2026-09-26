import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NUCLEO = 'src/nucleo';
const PROIBIDO = /from\s+['"][^'"]*projecoes[^'"]*['"]/;

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

const violacoes = todos.filter((f) => PROIBIDO.test(readFileSync(f, 'utf8')));

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
