import { load } from 'js-yaml';
import { LINGUAGENS } from '../nucleo/tipos';
import type { Language } from '../nucleo/tipos';
import { CLASSES_OBSERVADAS } from '../projecoes/avaliar';
import { obter } from '../projecoes/registo';
import type { Bloco, Licao, Momento, Passo, Prova, Sonda } from './esquema';
import { FASES, FONTES, FORMAS, FORMAS_POR_FAMILIA } from './esquema';
import variavelPython from './python/variavel.yml?raw';

/** Uma lição que não é uma lição.
 *
 *  Apanha-se com `catch (e)` e tem duas partes: `razao`, que é o que se lê,
 *  e `caminho`, que é **onde no ficheiro** está o problema. Sem o caminho, o
 *  autor tem de procurar a linha à mão num ficheiro de seiscentas linhas — e
 *  uma regra de autoria que obriga a procurar não é uma regra de autoria, é
 *  um ritual. */
export class ErroDeAutoria extends Error {
  readonly razao: string;
  readonly caminho: string;

  constructor(razao: string, caminho: string) {
    super(`${razao} (${caminho})`);
    this.name = 'ErroDeAutoria';
    this.razao = razao;
    this.caminho = caminho;
  }
}

// ---------------------------------------------------------------------------
// O registo: que lições existem
// ---------------------------------------------------------------------------

/** O texto de cada lição, por `${linguagem}/${id}`.
 *
 *  As chaves são **derivadas** do que há no repositório, e a lista de
 *  linguagens com lição sai de cima. A primeira versão escrevia
 *  `LICSOES = ['python']` à mão; ao lado de um ficheiro que existe, uma lista
 *  escrita à mão é uma lista de intenções, e diverge no dia em que se escreve
 *  a segunda lição e se esquece a linha. */
export const TEXTOS: Record<string, string> = {
  'python/variavel': variavelPython,
};

export function temLicao(linguagem: Language): boolean {
  return Object.keys(TEXTOS).some((chave) => chave.startsWith(`${linguagem}/`));
}

/** As linguagens que já têm lição, **na ordem do produto** — a mesma ordem
 *  que `LINGUAGENS` e que o seletor da Task 13 vai mostrar. Derivar de
 *  `TEXTOS` e não ao contrário: um ficheiro importado que ninguém liste é um
 *  ficheiro que existe e não aparece. */
export const LICSOES: Language[] = LINGUAGENS.filter(temLicao);

// ---------------------------------------------------------------------------
// As regras de autoria
// ---------------------------------------------------------------------------

function texto(v: unknown, caminho: string, regra: string): string {
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new ErroDeAutoria(`${regra}.`, caminho);
  }
  return v;
}

function lista(v: unknown, caminho: string, regra: string): unknown[] {
  if (!Array.isArray(v)) throw new ErroDeAutoria(`${regra}.`, caminho);
  return v;
}

function objeto(v: unknown, caminho: string, regra: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new ErroDeAutoria(`${regra}.`, caminho);
  }
  return v as Record<string, unknown>;
}

/** Um bloco do YAML, conferido.
 *
 *  A primeira versão fazia `prova.programa as never` e dizia, na mesma linha,
 *  que isso validava. Não validava: `as never` cala o compilador e não olha
 *  para o dado. Um `programa: 5` passava a validação e rebentava mais tarde,
 *  dentro da projeção, com um erro que não aponta para o YAML e não diz que o
 *  problema é uma lição. */
function blocoDe(v: unknown, caminho: string, vocabulario: readonly string[]): Bloco {
  const o = objeto(v, caminho, 'esperava-se um bloco');
  const type = texto(o.type, `${caminho}.type`, 'o bloco tem de dizer o que é');
  // `pilha` é o contentor, não uma instrução, e por isso não é vocabulário de
  // ninguém. Um `type: pilha` no vocabulário da lição é um bloco que o aluno
  // não pode arrastar para lado nenhum.
  const conhecidos = [...vocabulario, 'pilha'];
  if (!conhecidos.includes(type)) {
    throw new ErroDeAutoria(
      `o bloco "${type}" não é desta linguagem. Os blocos são: ${conhecidos.join(', ')}.`,
      `${caminho}.type`,
    );
  }
  for (const chave of ['fields', 'inputs'] as const) {
    if (o[chave] === undefined) continue;
    objeto(o[chave], `${caminho}.${chave}`, `o bloco "${type}" tem um ${chave} que não é um mapa`);
  }
  // O vocabulário é conferido **dentro** dos blocos também. A primeira versão
  // olhava só para o `type` de fora, e um `enquanto` escondido dentro de uma
  // pilha passava a validação: a linha parecia ser de Python e a emissão
  // escrevia um comentário a dizer que o bloco ainda não existe. É o mesmo
  // buraco que o `programa as never` abria, só que um nível mais abaixo.
  const entradas = o.inputs as Record<string, { stack?: unknown }> | undefined;
  for (const [chave, entrada] of Object.entries(entradas ?? {})) {
    if (entrada === null || typeof entrada !== 'object') continue;
    const pilha = (entrada as { stack?: unknown }).stack;
    if (pilha === undefined) continue;
    lista(pilha, `${caminho}.inputs.${chave}.stack`, `o corpo de "${type}" tem de ser uma lista de blocos`).forEach(
      (filho, i) => {
        blocoDe(filho, `${caminho}.inputs.${chave}.stack[${i}]`, vocabulario);
      },
    );
  }
  return {
    type,
    ...(o.fields === undefined ? {} : { fields: o.fields as Bloco['fields'] }),
    ...(o.inputs === undefined ? {} : { inputs: o.inputs as Bloco['inputs'] }),
  };
}

function slug(v: unknown, caminho: string, regra: string, minusculas: boolean): string {
  const s = texto(v, caminho, regra);
  const padrao = minusculas ? /^[a-z0-9-]+$/ : /^[A-Za-z0-9-]+$/;
  if (!padrao.test(s)) {
    throw new ErroDeAutoria(
      `"${s}" não serve${minusculas ? ' e tem de ser todo em minúsculas' : ''}. ` +
        'São só letras ASCII, números e hífenes, para o nome ser o mesmo em qualquer máquina.',
      caminho,
    );
  }
  return s;
}

function validarProva(v: unknown, caminho: string, vocabulario: readonly string[], familia: 'imperativa' | 'declarativa'): Prova {
  const p = objeto(v, caminho, 'a prova não está lá');
  const forma = texto(p.forma, `${caminho}.forma`, 'a forma da prova é obrigatória');
  if (!(FORMAS as readonly string[]).includes(forma)) {
    throw new ErroDeAutoria(
      `a forma "${forma}" não existe. As formas são: ${FORMAS.join(', ')}.`,
      `${caminho}.forma`,
    );
  }
  const temPrograma = p.programa !== undefined;
  const temTexto = p.texto !== undefined;
  if (temPrograma === temTexto) {
    throw new ErroDeAutoria(
      'a prova tem de ter `programa` ou `texto`, nunca os dois e nunca nenhum.',
      caminho,
    );
  }
  if (forma !== FORMAS_POR_FAMILIA[familia]) {
    throw new ErroDeAutoria(
      `a prova está escrita como "${forma}" e esta linguagem é ${familia}, que se prova com "${FORMAS_POR_FAMILIA[familia]}".`,
      `${caminho}.forma`,
    );
  }
  if (p.programa !== undefined) {
    return { forma: forma as 'programa', programa: blocoDe(p.programa, `${caminho}.programa`, vocabulario) };
  }
  return { forma: forma as 'programa', texto: texto(p.texto, `${caminho}.texto`, 'o texto da prova está vazio') };
}

function validarSonda(
  v: unknown,
  caminho: string,
  vocabulario: readonly string[],
  familia: 'imperativa' | 'declarativa',
): Sonda {
  const s = objeto(v, caminho, 'a sonda não está lá');
  const esperado = objeto(s.esperado, `${caminho}.esperado`, 'a sonda tem de dizer o que espera');
  const classe = texto(esperado.classe, `${caminho}.esperado.classe`, 'a classe esperada é obrigatória');
  if (!(CLASSES_OBSERVADAS as readonly string[]).includes(classe)) {
    throw new ErroDeAutoria(
      `a classe "${classe}" não existe. As classes são: ${CLASSES_OBSERVADAS.join(', ')}.`,
      `${caminho}.esperado.classe`,
    );
  }
  return {
    nome: slug(s.nome, `${caminho}.nome`, 'a sonda precisa de um nome', true),
    pergunta: texto(s.pergunta, `${caminho}.pergunta`, 'a pergunta da sonda é o que o aluno lê primeiro'),
    porque: texto(s.porque, `${caminho}.porque`, 'a sonda tem de dizer porque está na lição'),
    prova: validarProva(s.prova, `${caminho}.prova`, vocabulario, familia),
    esperado: {
      classe: classe as 'Observacao',
      porque: texto(esperado.porque, `${caminho}.esperado.porque`, 'o porque esperado é o que se lê depois de ver o que aconteceu'),
    },
  };
}

function validarMomento(v: unknown, caminho: string): Momento {
  const m = objeto(v, caminho, 'o momento não está lá');
  const fonte = texto(m.fonte, `${caminho}.fonte`, 'o momento tem de dizer de onde vem a resposta');
  if (!(FONTES as readonly string[]).includes(fonte)) {
    throw new ErroDeAutoria(
      `a fonte "${fonte}" não existe. São: ${FONTES.join(', ')}.`,
      `${caminho}.fonte`,
    );
  }
  const palavras = lista(m.palavras ?? [], `${caminho}.palavras`, 'as palavras têm de ser uma lista').map((p, i) =>
    texto(p, `${caminho}.palavras[${i}]`, 'uma palavra que não é texto não é uma palavra'),
  );
  // Só a `leitura` tem palavras. Noutra fonte seriam um campo morto: ninguém
  // as conferiria, e quem as escreveu pensou que alguém ia. E o produto não
  // tem respostas erradas — tem respostas que contam e palavras que são
  // decoração, e a decoração não vem escrita a fingir que conta.
  if (fonte === 'leitura' && palavras.length === 0) {
    throw new ErroDeAutoria(
      'um momento de fonte "leitura" sem palavras nunca conta como leitura.',
      `${caminho}.palavras`,
    );
  }
  if (fonte !== 'leitura' && palavras.length > 0) {
    throw new ErroDeAutoria(
      `as palavras só se conferem na fonte "leitura", e esta é "${fonte}".`,
      `${caminho}.palavras`,
    );
  }
  return {
    id: texto(m.id, `${caminho}.id`, 'o momento precisa de um id'),
    texto: texto(m.texto, `${caminho}.texto`, 'o momento precisa de uma pergunta'),
    palavras,
    fonte: fonte as 'leitura',
  };
}

function validarPasso(
  v: unknown,
  caminho: string,
  nomes: ReadonlySet<string>,
  vocabulario: readonly string[],
): Passo {
  const p = objeto(v, caminho, 'o passo não está lá');
  const fase = texto(p.fase, `${caminho}.fase`, 'a fase é obrigatória');
  if (!(FASES as readonly string[]).includes(fase)) {
    throw new ErroDeAutoria(`a fase "${fase}" não existe. São: ${FASES.join(', ')}.`, `${caminho}.fase`);
  }
  const sonda = texto(p.sonda, `${caminho}.sonda`, 'o passo tem de apontar para uma sonda');
  if (!nomes.has(sonda)) {
    throw new ErroDeAutoria(
      `este passo aponta para a sonda "${sonda}", que não existe. As sondas são: ${[...nomes].join(', ')}.`,
      `${caminho}.sonda`,
    );
  }
  const momentos = lista(p.momentos ?? [], `${caminho}.momentos`, 'os momentos têm de ser uma lista').map(
    (m, i) => validarMomento(m, `${caminho}.momentos[${i}]`),
  );
  if (momentos.length === 0) {
    // A regra não é de interface, é aritmética: `momentos[momento]` de uma
    // lista vazia dá `undefined` para sempre, e o aluno ficava preso num
    // passo que não avança nem recusa.
    throw new ErroDeAutoria('um passo sem momentos nunca se completa.', `${caminho}.momentos`);
  }
  const ids = new Set(momentos.map((m) => m.id));
  if (ids.size !== momentos.length) {
    throw new ErroDeAutoria('há dois momentos com o mesmo id neste passo.', `${caminho}.momentos`);
  }
  if (p.referencia !== undefined) {
    const ref = objeto(p.referencia, `${caminho}.referencia`, 'a referência tem de ser um mapa com um nome');
    const chaves = Object.keys(ref);
    if (chaves.length !== 1 || chaves[0] !== 'nome') {
      // A regra do ficheiro num sítio só. Aceitar `linhas` aqui seria
      // aceitar uma segunda versão do ficheiro, e as duas divergiriam sem
      // ninguém dar por isso — que é a forma mais cara de uma lição deixar de
      // falar do ficheiro que o aluno está a ler.
      throw new ErroDeAutoria(
        `a referência só pode ter "nome", e tem ${chaves.length === 0 ? 'nada' : `"${chaves.join('", "')}"`}. ` +
          'As linhas do ficheiro estão na sonda deste passo.',
        `${caminho}.referencia`,
      );
    }
    texto(ref.nome, `${caminho}.referencia.nome`, 'a referência tem de dizer o nome do ficheiro');
  }
  if (fase !== 'nomear' && p.nomear !== undefined) {
    throw new ErroDeAutoria(
      `a fase deste passo é "${fase}", e uma fase "${fase}" não dá nome a nada. A palavra "${String(p.nomear)}" não tem onde aparecer.`,
      `${caminho}.nomear`,
    );
  }
  return {
    fase: fase as 'explicar',
    porque: texto(p.porque, `${caminho}.porque`, 'o passo tem de dizer porque esta linha existe'),
    bloco: blocoDe(p.bloco, `${caminho}.bloco`, vocabulario),
    sonda,
    momentos,
    ...(fase === 'nomear' ? { nomear: texto(p.nomear, `${caminho}.nomear`, 'a fase nomear sem palavra repete o que a fase explicar já disse') } : {}),
    ...(p.referencia === undefined
      ? {}
      : { referencia: { nome: texto((p.referencia as { nome?: unknown }).nome, `${caminho}.referencia.nome`, 'a referência tem de dizer o nome do ficheiro') } }),
  };
}

// ---------------------------------------------------------------------------
// A lição
// ---------------------------------------------------------------------------

/** Lê uma lição e recusa o que não é uma lição.
 *
 *  Todas as recusas são `ErroDeAutoria`, e nenhuma delas é um `TypeError`:
 *  quem escreve a lição é uma pessoa, e uma pessoa precisa de uma frase que
 *  diga o que está mal e onde. A diferença entre esta função e um `throw` de
 *  qualquer tipo é a diferença entre uma regra que se aprende e um bug que se
 *  persegue. */
export function CARREGAR(bruto: string, linguagem: Language): Licao {
  let dados: unknown;
  try {
    dados = load(bruto);
  } catch (e) {
    // A mensagem do analisador está em inglês, e fica. Quem escreve a lição é
    // quem a vai corrigir, e `bad indentation of a mapping entry` diz onde é
    // que o analisador também não percebeu. **Isto nunca vai para o ecrã de
    // um aluno**: é um erro de autoria, e o aluno não escreve lições.
    //
    // O `mark.line` conta a partir do zero, e passá-lo como estava dava a
    // linha 1 a quem está na linha 2. Um erro de autoria que aponta para a
    // linha errada é um erro de autoria que se arrasta.
    const linha = (e as { mark?: { line?: number } }).mark?.line;
    const onde = linha === undefined ? '' : `, linha ${linha + 1}`;
    throw new ErroDeAutoria(
      `o analisador não leu o YAML (${onde}): ${(e as Error).message}`,
      'o ficheiro inteiro',
    );
  }

  const o = objeto(dados, 'a lição', 'o ficheiro não é um mapa de YAML');
  if (texto(o.linguagem, 'linguagem', 'a lição tem de dizer de que linguagem é') !== linguagem) {
    throw new ErroDeAutoria(
      `esta lição é de "${String(o.linguagem)}" e foi pedida de "${linguagem}".`,
      'linguagem',
    );
  }
  const projecao = obter(linguagem);
  const vocabulario = projecao.blocos;

  const blocos = lista(o.blocos, 'blocos', 'os blocos da lição têm de ser uma lista').map((b, i) =>
    blocoDe(b, `blocos[${i}]`, vocabulario),
  );
  const sondas = lista(o.sondas, 'sondas', 'as sondas têm de ser uma lista').map((s, i) =>
    validarSonda(s, `sondas[${i}]`, vocabulario, projecao.familia),
  );
  const nomes = new Set(sondas.map((s) => s.nome));
  if (nomes.size !== sondas.length) {
    throw new ErroDeAutoria('há duas sondas com o mesmo nome.', 'sondas');
  }
  const passos = lista(o.passos, 'passos', 'os passos têm de ser uma lista').map((p, i) =>
    validarPasso(p, `passos[${i}]`, nomes, vocabulario),
  );

  return {
    id: slug(o.id, 'id', 'a lição precisa de um id', true),
    linguagem,
    titulo: texto(o.titulo, 'titulo', 'a lição precisa de um título'),
    porqueTitulo: texto(o.porqueTitulo, 'porqueTitulo', 'o título só quer dizer alguma coisa com o porque'),
    blocos,
    passos,
    sondas,
    paraSaberQueFez: texto(
      o.paraSaberQueFez,
      'paraSaberQueFez',
      'a lição tem de dizer como se sabe que foi feita',
    ),
  };
}
