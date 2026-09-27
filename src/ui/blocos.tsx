import * as Blockly from 'blockly';
import type { BlocoLeigo, CampoLeigo, EntradaLeiga } from '../nucleo/avaliador';
import { BLOCOS, CORES, corpoDe } from '../nucleo/blocos';
import type { Language } from '../nucleo/tipos';
import { obter } from '../projecoes/registo';

// ---------------------------------------------------------------------------
// A forma do Blockly, e a forma do motor
// ---------------------------------------------------------------------------
//
// Este ficheiro é a costura entre duas coisas que não se resemblem, e as duas
// formas têm de estar escritas aqui, uma vez, com o nome de cada campo. O
// plano desta tarefa escrevia-as no ficheiro e depois escrevia testes com
// blocos escritos à mão — e o resultado foi um tradutor que passava todos os
// testes e não lia um único bloco real. As formas verdadeiras foram tiradas
// do Blockly, não da memória:
//
//   `workspaces.save(ws)`  ->  { blocks: { languageVersion, blocks: [...] } }
//   `fields`               ->  { nome: 'total' }         (o valor, cru)
//   `inputs[chave].block`  ->  o bloco ligado à ranhura
//   `next.block`           ->  a instrução seguinte da cadeia
//
// Duas dessas quatro formas que o plano escrevia estavam erradas, e as duas
// erradas de uma maneira que não dá erro nenhum: devolvem `undefined` ou `null`
// em silêncio, e o produto fica morto sem uma única falha no ecrã. Por isso
// cada função abaixo tem um teste que a alimenta com a **saída real** do
// Blockly, e não com um objeto parecido com ela.

/** Um bloco como o Blockly o guarda, e não como o motor o lê.
 *
 *  `fields` guarda **valores crus** — `3`, `'olá'`, `'total'` — e não
 *  `{ valor: … }`. A diferença entre as duas formas é uma linha de código e
 *  nenhuma diferença no que o aluno vê, que é o que faz uma linha de código
 *  destas ser perigosa. */
export interface BlocoJson {
  type: string;
  x?: number;
  y?: number;
  fields?: Record<string, unknown>;
  inputs?: Record<string, LigacaoJson>;
  next?: LigacaoJson;
}

/** Uma ranhura do Blockly: `block` é o bloco ligado, `shadow` é o valor por
 *  omissão que o Blockly põe quando a ranhura está vazia. */
export interface LigacaoJson {
  block?: BlocoJson;
  shadow?: BlocoJson;
}

/** Teto de blocos numa cadeia. Não é um limite real — o Blockly não encadeia
 *  milhões de blocos — mas um `next` à mão pode ser um laço, e um tradutor
 *  que nunca acaba é pior do que um que pára. */
const MAX_BLOCOS = 10_000;

function textoDe(campo: unknown): string {
  return typeof campo === 'string' ? campo : String(campo ?? '');
}

// ---------------------------------------------------------------------------
// Bloco do Blockly -> bloco do motor
// ---------------------------------------------------------------------------

function camposDe(bruto: BlocoJson): Record<string, CampoLeigo> {
  const campos: Record<string, CampoLeigo> = {};
  for (const [nome, valor] of Object.entries(bruto.fields ?? {})) {
    campos[nome] = { valor };
  }
  return campos;
}

/** Uma referência a uma variável, ou o próprio bloco de valor.
 *
 *  O tipo decide, e não a presença de um campo chamado `NOME`. A primeira
 *  versão desta função dizia «se tem `NOME`, é uma referência», e o bloco do
 *  robô também tem um campo `NOME` — o nome do ator. Com essa regra, arrastar
 *  um ator para dentro de um `dizer` gerava `print(coelho)`: uma referência a
 *  uma variável que ninguém guardou, e um erro que aponta para o sítio
 *  errado. A regra certa é «é do tipo `variavel`», e o bloco `variavel` é o
 *  que a faz verdadeira. */
function valorDe(bruto: BlocoJson | undefined): unknown {
  if (bruto === undefined) return undefined;
  if (bruto.type === 'variavel') {
    const nome = textoDe(bruto.fields?.NOME);
    if (nome.length > 0) return { ref: nome };
  }
  if (bruto.type === 'dador_num' || bruto.type === 'texto') {
    return bruto.fields?.VALOR;
  }
  return { bloco: converter(bruto) };
}

/** Uma cadeia de instruções, do primeiro bloco ao último.
 *
 *  O Blockly guarda as instruções ligadas umas às outras em `next.block`, e
 *  não numa lista. A primeira versão lia `inputs[chave].stack`, que o Blockly
 *  nunca escreve: um `repetir` com três linhas no corpo savingava uma linha,
 *  e o programa que o aluno via executar não era o programa que ele tinha
 *  montado. */
function cadeia(bruto: BlocoJson | undefined): BlocoLeigo[] {
  const pilha: BlocoLeigo[] = [];
  let atual = bruto;
  let n = 0;
  while (atual !== undefined && n < MAX_BLOCOS) {
    pilha.push(converter(atual));
    atual = atual.next?.block;
    n += 1;
  }
  return pilha;
}

function converter(bruto: BlocoJson): BlocoLeigo {
  const entradas: Record<string, EntradaLeiga> = {};
  const tipo = tipoDe(bruto);
  for (const [chave, ligacao] of Object.entries(bruto.inputs ?? {})) {
    if (levaInstrucoes(tipo, chave) && ligacao.block !== undefined) {
      entradas[chave] = { stack: cadeia(ligacao.block) };
      continue;
    }
    // Uma ranhura de valor. A ligada está em `block`, e o valor por omissão
    // que o Blockly inventa sozinho quando a pessoa não ligou nada está em
    // `shadow` — e é um bloco como outro: entra pelo mesmo caminho.
    entradas[chave] = { valor: valorDe(ligacao.block ?? ligacao.shadow) };
  }
  // Um dicionário vazio só se escreve quando há alguma coisa lá dentro. Não é
  // estilo: é o que faz os dois caminhos serem mesmo inversos. A primeira
  // versão acrescentava `fields: {}` a todos os blocos, e um bloco do
  // Blockly deixava de ser igual ao bloco do motor que o originou — mesmo
  // tendo o mesmo conteúdo. Um tradutor que junta uma chave vazia não está a
  // traduzir: está a dizer que o bloco tinha um campo, e não tinha.
  const campos = camposDe(bruto);
  const bloco: BlocoLeigo = { type: tipo };
  if (Object.keys(campos).length > 0) bloco.fields = campos;
  if (Object.keys(entradas).length > 0) bloco.inputs = entradas;
  return bloco;
}

function tipoDe(bruto: BlocoJson): string {
  return typeof bruto.type === 'string' && bruto.type.length > 0 ? bruto.type : 'desconhecido';
}

// ---------------------------------------------------------------------------
// Que ranhura leva instruções
// ---------------------------------------------------------------------------
//
// O JSON que o Blockly escreve **não diz** se uma ranhura leva um valor ou
// uma pilha de instruções: nos dois casos a forma é `inputs[chave].block`. A
// diferença só está na definição do bloco, e perguntar à definição é a única
// fonte que não pode divergir dela — que é o que acontecia na primeira
// versão deste ficheiro, que tratava as duas do mesmo jeito. O resultado era
// `total = 'undefined'`: o `dador_num` ligado ao `VALOR` do `guardar` entrava
// como pilha, o motor lia `.valor` de uma pilha, e o número sumia sem uma
// única falha no ecrã. A lição toda dependia desse número.
//
// A tabela é medida no registo, num bloco de cabeça sem ecrã, e não escrita à
// mão: uma tabela escrita à mão é uma segunda verdade sobre os mesmos blocos,
// e uma segunda verdade desatualiza-se em silêncio.
const RANHURAS_DE_INSTRUCAO = new Map<string, Set<string>>();

function levaInstrucoes(tipo: string, ranhura: string): boolean {
  return RANHURAS_DE_INSTRUCAO.get(tipo)?.has(ranhura) ?? false;
}

function medirRanhuras(tipos: string[]): void {
  const semEcran = new Blockly.Workspace();
  for (const id of tipos) {
    if (Blockly.Blocks[id] === undefined) continue;
    const bloco = semEcran.newBlock(id);
    RANHURAS_DE_INSTRUCAO.set(
      id,
      new Set(bloco.inputList.filter((i) => i instanceof Blockly.inputs.StatementInput).map((i) => i.name)),
    );
    bloco.dispose(false);
  }
  semEcran.dispose();
}

/** Os blocos de topo de um estado do Blockly, seja ele qual for a forma.
 *
 *  `workspaces.save` embrulha o estado num `{ blocks: { blocks: [...] } }`, e
 *  o plano lia `{ blocks: [...] }` — que dá `undefined`, que dá `null`, que
 *  dá um produto que nunca lê um programa e nenhum teste vermelho. Por isso
 *  as duas formas são aceites: uma é o que o Blockly escreve e a outra é o
 *  que o Blockly consome, e uma função que só sabe ler uma das duas é uma
 *  armadilha com a data de validade escrita. */
export function blocosDe(estado: unknown): BlocoJson[] {
  if (estado === null || typeof estado !== 'object') return [];
  const embrulho = (estado as { blocks?: unknown }).blocks;
  const lista =
    Array.isArray(embrulho)
      ? embrulho
      : embrulho !== null && typeof embrulho === 'object' && Array.isArray((embrulho as { blocks?: unknown }).blocks)
        ? ((embrulho as { blocks: unknown[] }).blocks)
        : [];
  return lista as BlocoJson[];
}

/** O estado do Blockly, lido, e o motor a vê-lo como um programa.
 *
 *  Vários blocos de topo são uma `pilha` com todos eles no corpo, e é a
 *  `pilha` que o motor e o emissor já conhecem. Um bloco só é esse bloco. */
export function paraBlocoLeigo(estado: unknown): BlocoLeigo | null {
  const pilha = blocosDe(estado).flatMap((b) => cadeia(b));
  if (pilha.length === 0) return null;
  if (pilha.length === 1) return pilha[0]!;
  return { type: 'pilha', inputs: { CORPO: { stack: pilha } } };
}

// ---------------------------------------------------------------------------
// Bloco do motor -> bloco do Blockly
// ---------------------------------------------------------------------------

function ligacaoDe(valor: unknown): LigacaoJson | undefined {
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor === 'number') return { block: { type: 'dador_num', fields: { VALOR: valor } } };
  if (typeof valor === 'string') return { block: { type: 'texto', fields: { VALOR: valor } } };
  if (typeof valor === 'object') {
    const v = valor as { ref?: unknown; txt?: unknown; bloco?: BlocoLeigo };
    if (typeof v.ref === 'string' && v.ref.length > 0) {
      return { block: { type: 'variavel', fields: { NOME: v.ref } } };
    }
    if (typeof v.txt === 'string') return { block: { type: 'texto', fields: { VALOR: v.txt } } };
    if (v.bloco !== undefined) return { block: blocoDe(v.bloco) };
  }
  // Um valor sem forma conhecida não vira bloco nenhum. Deixar a ranhura
  // vazia é a única resposta honesta: um bloco inventado aqui apareceria no
  // ecrã do aluno como uma coisa que ele não colocou. O booleano cai aqui
  // até a Task 11 registar o bloco `logico` — e cai **visível**, que é o
  // oposto de cair em silêncio.
  return undefined;
}

function blocoDe(b: BlocoLeigo): BlocoJson {
  const campos: Record<string, unknown> = {};
  for (const [nome, campo] of Object.entries(b.fields ?? {})) campos[nome] = campo.valor;
  const entradas: Record<string, LigacaoJson> = {};
  for (const [chave, entrada] of Object.entries(b.inputs ?? {})) {
    if (entrada.stack !== undefined) {
      const [cabeca, ...resto] = entrada.stack;
      if (cabeca === undefined) continue;
      const ligacao: LigacaoJson = { block: blocoDe(cabeca) };
      let ultima = ligacao.block!;
      for (const seguinte of resto) {
        const proxima: LigacaoJson = { block: blocoDe(seguinte) };
        ultima.next = proxima;
        ultima = proxima.block!;
      }
      entradas[chave] = ligacao;
    } else if ('valor' in entrada) {
      const ligacao = ligacaoDe(entrada.valor);
      if (ligacao !== undefined) entradas[chave] = ligacao;
    }
  }
  return { type: b.type, fields: campos, inputs: entradas };
}

/** O programa do motor, escrito como blocos que o Blockly sabe montar.
 *
 *  É o caminho inverso de `paraBlocoLeigo` e a razão de existir: sem ele, um
 *  aluno que sai a meio de um passo volta e encontra o ecrã em branco, e a
 *  lição perde o trabalho sem nunca dizer que o perdeu. */
export function deBlocoLeigo(programa: BlocoLeigo | null): BlocoJson[] {
  if (programa === null) return [];
  if (programa.type === 'pilha') return corpoDe(programa).flatMap(deBlocoLeigo);
  return [blocoDe(programa)];
}

// ---------------------------------------------------------------------------
// O registo de blocos
// ---------------------------------------------------------------------------

/** Uma definição de bloco no formato JSON do Blockly.
 *
 *  A biblioteca aceita `any` e por isso o compilador não ajuda em nada aqui.
 *  A interface existe para o ficheiro não passar a vida a escrever `as never`
 *  — que é o que o plano fazia, e `as never` é o oposto de um tipo: é uma
 *  way de dizer ao compilador «não me mostres isto». */
interface DefinicaoBloco {
  type: string;
  colour: string;
  [chave: string]: unknown;
}

/** Os blocos de valor, que são os mesmos em todas as linguagens.
 *
 *  Nenhum deles é uma instrução, e é por isso que vivem aqui e não no
 *  vocabulário da projeção: `obter('sql').blocos` é a lista do SQL e nenhuma
 *  das outras, e o SQL não quer um bloco de número no ecrã. */
const VALORES: DefinicaoBloco[] = [
  {
    type: 'dador_num',
    message0: '%1',
    args0: [{ type: 'field_number', name: 'VALOR', value: 0 }],
    colour: CORES.dador_num,
    output: 'Number',
  },
  {
    // O plano definia o `texto` como um reporter com um `input_value` dentro
    // — ou seja, uma caixa que leva outra caixa. E o `valorDe` tinha um caso
    // especial que devolvia `{ txt: '' }` para ele, o que significa que o
    // texto que a pessoa escrevia no bloco **era deitado fora**: o programa
    // dizia `print('')`. O texto é um valor escrito à mão, como o número, e
    // por isso tem um `field_input` e nada mais.
    type: 'texto',
    message0: 'texto %1',
    args0: [{ type: 'field_input', name: 'VALOR', text: '' }],
    colour: CORES.texto,
    output: 'String',
  },
  {
    type: 'variavel',
    message0: '%1',
    args0: [{ type: 'field_input', name: 'NOME', text: '' }],
    colour: CORES.variavel,
    output: null,
  },
];

/** As definições das instruções, por id.
 *
 *  Duas coisas nesta tabela não são estilo.
 *
 *  A ranhura de valor do `guardar` e a do `dizer` **não têm tipo**, e é
 *  deliberate: a lição guarda um texto em `nome` e mostra um número com
 *  `dizer`, e uma ranhura `setCheck('Number')` recusa as duas coisas. O aluno
 *  não conseguiria montar a lição que o produto lhe está a pedir. A ranhura
 *  do `repetir` é a única com tipo, porque um número de voltas é um número
 *  em qualquer linguagem.
 *
 *  Os rótulos vão por `appendDummyInput`, porque o Blockly 13 **tirou
 *  `Block.appendField`**: só `Input.appendField` existe. O plano usava
 *  `this.appendField('guardar')` em quatro blocos, e isso não compila — o que
 *  o `tsc` apanhou e o `vitest` não apanharia nunca. */
const INSTRUCOES: Record<string, () => void> = {
  [BLOCOS.guardar]: function guardar(this: Blockly.Block) {
    this.appendDummyInput('ROTULO').appendField('guardar');
    this.appendValueInput('VALOR');
    this.appendDummyInput('NOME').appendField('em');
    this.appendDummyInput('CAMPO').appendField(new Blockly.FieldTextInput('total'), 'nome');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CORES.guardar);
  },
  [BLOCOS.repetir]: function repetir(this: Blockly.Block) {
    this.appendDummyInput('ROTULO').appendField('repetir');
    this.appendValueInput('PASSOS').setCheck('Number');
    this.appendDummyInput('VEZES').appendField('vezes:');
    this.appendStatementInput('CORPO');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CORES.repetir);
  },
  [BLOCOS.dizer]: function dizer(this: Blockly.Block) {
    this.appendDummyInput('ROTULO').appendField('dizer');
    this.appendValueInput('VALOR');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CORES.dizer);
  },
  [BLOCOS.log]: function registo(this: Blockly.Block) {
    this.appendDummyInput('ROTULO').appendField('registar');
    this.appendValueInput('VALOR');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CORES.log);
  },
};

/** Regista os blocos e devolve os ids de instrução da linguagem.
 *
 *  Devolvê-los é o que torna `criarToolbox` honesta: a caixa de ferramentas
 *  oferece o que a projeção declara, e o teste que compara as duas coisas só
 *  existe porque o registo diz o que registou. */
export function registarBlocos(linguagem: Language): string[] {
  const declarados = obter(linguagem).blocos;
  for (const definicao of VALORES) {
    if (Blockly.Blocks[definicao.type] === undefined) Blockly.defineBlocksWithJsonArray([definicao]);
  }
  const registados: string[] = [];
  for (const id of declarados) {
    const fazer = INSTRUCOES[id];
    if (fazer === undefined) {
      // Um id que a projeção declara e que este ficheiro não sabe fazer. Não
      // é um erro calado: é a lista do que falta, e é o plano C a bater
      // nesta porta se o SQL trouxer um bloco novo.
      throw new Error(
        `O bloco "${id}" é declarado pela projeção de ${linguagem} e não tem ` +
          `definição em src/ui/blocos.tsx. Ou a definição entra aqui, ou o ` +
          `bloco sai de obter(${linguagem}).blocos.`,
      );
    }
    if (Blockly.Blocks[id] === undefined) Blockly.Blocks[id] = { init: fazer };
    registados.push(id);
  }
  // A medição tem de vir **depois** de todos os blocos estarem registados: um
  // `repetir` que se mede antes de o `guardar` existir mede um ecrã a menos.
  medirRanhuras(registados);
  return registados;
}

/** Uma categoria da caixa de ferramentas. */
export interface Categoria {
  kind: 'category';
  name: string;
  colour: string;
  contents: ItemDaVariavel[];
}

/** Um bloco dentro de uma categoria.
 *
 *  O `kind` é obrigatório e a sua falta é um erro de execução, não de
 *  compilação: o Blockly faz `item.kind.toUpperCase()` e uma entrada sem
 *  `kind` rebenta-o dentro do `inject`, com uma mensagem que fala de
 *  `toUpperCase` e não da caixa de ferramentas. */
export interface ItemDaVariavel {
  kind: 'block';
  type: string;
}

/** A caixa de ferramentas, na forma que este ficheiro escreve.
 *
 *  É uma interface nossa e não o tipo do Blockly porque o tipo do Blockly
 *  (`ToolboxInfo`) não é exportado pela raiz do pacote, e o
 *  `StaticCategoryInfo` de dentro exige `id`, `categorystyle`, `cssconfig` e
 *  `hidden` — campos que o Blockly preenche sozinho e que ninguém escreve. */
export interface Caixa {
  kind: 'categoryToolbox';
  contents: Categoria[];
}

/** A caixa de ferramentas da linguagem, montada a partir da projeção.
 *
 *  As categorias são o que a pessoa vê primeiro, e essa decisão não é do
 *  motor: é som, é cor, é o §18 da spec. Por isso são duas e não sete — uma
 *  para os valores e uma para as instruções da linguagem escolhida. */
/** A nossa `Caixa` como o Blockly a quer ver.
 *
 *  O tipo do Blockly (`ToolboxInfo`) exige, em cada categoria, campos que o
 *  Blockly preenche sozinho — `id`, `categorystyle`, `cssconfig` e `hidden`.
 *  A forma que escrevemos está certa; o tipo descreve também o que acontece
 *  **depois**. A conversão está escrita uma vez, aqui, para que o
 *  `as unknown as` não apareça espalhado pelo ficheiro — e para que ele não
 *  seja um `as never`, que é uma maneira de pedir ao compilador que não veja
 *  o problema. */
export function caixaComoOBlockly(caixa: Caixa): Blockly.utils.toolbox.ToolboxInfo {
  return caixa as Blockly.utils.toolbox.ToolboxInfo;
}

export function criarToolbox(linguagem: Language): Caixa {
  const declarados = registarBlocos(linguagem);
  return {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category',
        name: 'Números e texto',
        colour: CORES.dador_num,
        contents: VALORES.map((b) => ({ kind: 'block', type: b.type })),
      },
      {
        kind: 'category',
        name: 'Instruções',
        colour: CORES.guardar,
        contents: declarados.map((id) => ({ kind: 'block', type: id })),
      },
    ],
  };
}
