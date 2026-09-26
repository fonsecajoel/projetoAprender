# Planos A — Motor, costuras e a primeira lição

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a primeira fatia vertical do produto: motor instrumentado, núcleo semântico partilhado, sondas executáveis, **duas** projeções de linguagem (Python e Java), painel de texto com verificação de equivalência, robô tipado, ecrã com seletor de linguagem, e a lição "O que é uma variável" em Python — aceite pelo teste de leitura de um ficheiro desconhecido de 15 linhas.

A **lição de Java não é deste plano.** A segunda linguagem entra pela projeção e pelos testes dourados, que são o que mostra que a costura aguenta: se o núcleo não sabe de linguagens, a segunda projeção tem de aparecer sem tocar no núcleo. A lição dela é trabalho de autoria, e a spec §16.1 manda não prometer autoria antes de medir uma.

**Architecture:** Há três camadas, e separá-las é o ponto do desenho. (1) O **núcleo semântico** (`src/nucleo/`) não sabe o que é uma linguagem: produz `Valor` tipados, decide o que é uma violação de tipo, e emite as três classes de `Erro`. (2) O **motor de blocos** (`src/nucleo/avaliador.ts`) avalia uma árvore de blocos e produz um `Trace`, sem saber que existe texto. (3) As **projeções** (`src/projecoes/`) são a única camada que conhece sintaxe, e há uma por linguagem: `emit()` escreve um programa em blocos para texto, e `ler()` lê texto dessa linguagem para os mesmos eventos tipados. O texto que o utilizador escreve é lido pela projeção da linguagem que ele escolheu e julgado pelo núcleo — por isso Python nunca recusa um tipo errado e Java recusa, sem que isso esteja escrito duas vezes.

**Tech Stack:** TypeScript `strict`, Vite + React 18, `blockly` (versão anotada no commit da Task 1), `vitest` + `@testing-library/react` + `jsdom`, `js-yaml`, `tsx`. Node ≥ 20, npm ≥ 10. Zero dependências de runtime para além destas.

**Spec:** `docs/superpowers/specs/2026-09-26-ponte-seis-linguagens-design.md`

## Âmbito: este plano é o Plano A de três

A spec §16.1 manda: *se autorar um passo não levar menos de uma tarde, o formato de sonda está errado — paramos antes de escrever a segunda lição, não a sexta.* Escrever seis lições num só plano meteria no plano um pressuposto que a spec declara não provado. Logo:

| Plano | Entrega | Portão para o seguinte |
|---|---|---|
| **A (este)** | núcleo, motor, 2 projeções (Python, Java), UI, seletor, **a lição de Python** | a lição de Python/autoria de um passo levou menos de uma tarde? a costura passou nos testes dourados de Java? |
| **B** | Go, TypeScript, JavaScript + as suas 3 lições | mecânico se A passou |
| **C** | SQL: projeção, vocabulário de blocos, a lição "coluna" | vocabulário declarativo é um salto real |

O âmbito do produto continua a ser seis linguagens. Isto é sequência, não corte.

## Global Constraints

- **Nenhuma mensagem de erro é renderizada sem razão.** As três classes (`Recusa`, `FalhaRuntime`, `QuebraEquivalencia`) têm `porque` não-vazio, garantido por construção e testado.
- **Só existem três classes de erro.** Uma quarta é bug, não funcionalidade.
- **Não existe "erro de sintaxe" no produto, mas existe no avaliador de texto.** Contradição deliberada, resolvida na §6.4 da spec: a *lição* nunca mostra um erro de sintaxe, mas a `ler()` de cada projeção precisa de rejeitar texto que não é da sua linguagem — e essa rejeição é um `FalhaRuntime` com `porque`, nunca um código de erro nu.
- **`Explicacao` não tem campos de outras linguagens.** A v1 tinha `python` e `java`; foram removidos (§0 da spec). `Explicacao` é `{ porque, remedio }` — o que fazer em vez disto, nos termos desta linguagem.
- **`Recusa`, `FalhaRuntime` e `QuebraEquivalencia` não têm campos de outras linguagens.** Carregam `remedio` (ou nada, se não há nada a fazer).
- **O programa em blocos é a única fonte de verdade.** O texto deriva sempre dele. Não existe caminho texto → blocos.
- **O núcleo semântico não conhece o DOM, o React, o Blockly nem nenhuma linguagem.** Vive em `src/nucleo/`. Corre em Node puro. `src/nucleo/` não pode importar nada de `src/projecoes/` — teste automático.
- **`BlocoLeigo` é o único formato de programa.** YAML, motor, `emit()` e `resolverLeigo` usam-no sem tradução intermédia.
- **Valores de entrada são explícitos:** `número` → número; `boolean` → lógico; `{txt: 'olá'}` → texto; `{ref: 'total'}` → a variável `total`; `{bloco: BlocoLeigo}` → avaliar esse bloco. Qualquer outra coisa é recusada.
- **Nomes de conceito são slugs ASCII** em minúsculas com hífen. O texto humano vive no YAML, nunca no `type` do bloco.
- **`number` é o único tipo numérico.** `undefined`, `null`, `NaN`, `Infinity` e números acima de `RANGE_INTEIROS = 1000` não são `número`.
- **Tolerância de edição: 2 caracteres.** Omissões, duplicações e transposições de caracteres adjacentes passam. A mesma tolerância vale para todas as projeções. Não se aplica à exportação, que é byte-a-byte igual ao painel.
- **Nenhum teste depende de relógio, rede ou `setTimeout`.** O debounce do painel é testado com `debounceMs` explícito e `waitFor`.
- **Escopo de variáveis é por linha.** Uma variável guardada na linha N não existe na linha N+1.
- **A `Policy` de uma linguagem decide *quando* a violação é reportada; o parse decide *o que* a linha diz.** Nenhum dos dois pode fazer o trabalho do outro. Um teste por linguagem prova os dois lados.
- **`prova.forma` tem dois valores** — `programa` e `consulta` (§11.2 da spec). O runner de sondas recusa a combinação errada com `porque`, não rebenta.
- **Strings de utilizador em português europeu**, com `\n` explícitos nos testes de texto.

## Review Focus

Cinco classes de erro ou modo de falha que a spec v2 implica, que nenhum teste de fluxo feliz exercita, e que uma pessoa a usar o produto razoavelmente esperasse que funcionassem:

1. **Texto escrito noutra linguagem.** O utilizador escolheu Java e escreve `total = 5` (Python, sem tipo e sem `;`). Espera-se `FalhaRuntime` a dizer que esta linha não é de Java — nunca que passe em silêncio nem que seja avaliado como Java. *Esta é a falha nova que as seis linguagens criam, e é a que mais fácilmente passa despercebida porque cada projeção funciona bem com a sua própria sintaxe.*
2. **Sonda com a forma errada para a família.** Uma sonda de SQL com `prova.forma: programa`, ou uma sonda de Python com `forma: consulta`. Espera-se `FalhaRuntime` a explicar a incompatibilidade, e o CI a falhar — não um `TypeError` do runner.
3. **Variável usada antes de existir.** `total = total + 1` sem nenhum `total` antes. Espera-se `FalhaRuntime` a nomear a variável e o passo, e a UI a continuar utilizável.
4. **Divergência de texto em sintaxe muito diferente.** A tolerância de 2 caracteres foi calibrada para `total = 5`; em Java o utilizador escreve `int total = 5` e esquece o `;`. Espera-se que o painel apanhe o `;` em falta e o diga, não que reporte "função desconhecida" ou que aceite.
5. **Seletor de linguagem a oferecer o que não existe.** A spec §13 promete seis linguagens; o Plano A constrói duas projeções e uma lição. Espera-se que o seletor só ofereça o que está pronto, e que a escolha bloqueada se explique — nunca um ecrã em branco depois de escolher.

## Review Focus — onde cada uma é testada

| # | Teste | Tarefa |
|---|---|---|
| 1 | `avaliarTexto('java', 'total = 5\n')` produz `FalhaRuntime` com `porque` que nomeia Java; `avaliarTexto('java', 'int total = 5;\n')` produz `[]` | Task 6 |
| 2 | `executarSonda` com `forma` incompatível com `projection.familia` → `FalhaRuntime`, sem exceção | Task 7 |
| 3 | `avaliarTexto('python', 'total = total + 1\n')` → `FalhaRuntime` com `porque` que contém `total` | Task 6 |
| 4 | `comparar(emitir('java', g), 'int total = 5\n')` → `QuebraEquivalencia` na linha, com `porque` sobre o `;` | Task 6 |
| 5 | o seletor lista exatamente as linguagens com projeção **e** lição, e a razão das restantes | Task 12 |

---

## File Structure

Os 42 ficheiros que as 13 tarefas criam, e nada mais. A lista sai das linhas
`- Create:` de cada tarefa — o que significa que se um ficheiro entrar na
lista sem nenhuma tarefa o criar, ou sair da lista sem ser apagado de uma
tarefa, esta secção está errada e o plano também. `java/variavel.yml` **não**
está aqui: é do Plano B.

```
package.json · tsconfig.json · tsconfig.node.json · vite.config.ts · index.html
scripts/verificar-arvore.ts             Só este. As sondas correm no `npm test`.

src/
  vite-env.d.ts
  main.tsx                             Escolhe a linguagem, monta a Tela.        T12
  testes/preparacao.ts                 Polyfills de jsdom para o Blockly.      T1

  nucleo/                              NÃO CONHECE NENHUMA LINGUAGEM
    tipos.ts                           Language, NOMES, Tipo, Valor,            T1
                                       RestricaoDeTipo, as três classes de
                                       Erro. `remedio`, nunca `python`/`java`.
    trace.ts                           Trace, TraceBuilder, registar.            T1
    blocos.ts                          BlocoLeigo, BLOCOS, CORES, os            T2
                                       construtores (guardar, repetir, ...).
    avaliador.ts                       Regra + Avaliador. Blocos → Trace.       T2
    testes/dados.ts                    Blocos prontos para os testes.           T2
    semantica.ts                       O INVARIANTE. Eventos tipados           T3
                                       + `Policy` → `Erro[]`. `Policy` vive
                                       aqui, e não em `projecoes/`: é o que
                                       decide *quando* se recusa, e o *quando*
                                       é a mesma coisa nas seis.
    divergencia.ts                     Comparador bloco ↔ texto,                T6
                                       TOLERANCIA_EDICAO.

  projecoes/                           A ÚNICA CAMADA QUE CONHECE SINTAXE
    tipos.ts                           Familia, Projection, Gerado,             T4
                                       Anotacao, LerResultado. `Policy` não
                                       vive aqui — vem do núcleo.
    registo.ts                         REGISTO, obter, temProjecao,             T4
                                       LINGUAGENS_COM_PROJECAO.
    python.ts                          `emit` + `ler`. A primeira, completa.    T4
    java.ts                            `emit` + `ler`, e DECLARACAO.            T5
                                       A que prova a costura.
    avaliar.ts                         emitir, avaliarTexto, comparar-texto,     T6
                                       classificar.
    dourados.test.ts                   Um ficheiro dourado por projeção.        T13

  conteudo/
    esquema.ts                         `Sonda`, `Passo`, `Momento`, `Licao`.   T7
    carregar.ts                        CARREGAR, TEXTOS, LICSOES, temLicao,    T7
                                       ErroDeAutoria.
    sondas.ts                          executarSonda.                           T7
    index.ts                           O que o `main.tsx` importa.              T7
    python/variavel.yml                A lição. A tarefa que prova o formato.   T8
    portao.test.ts                     Todas as sondas de todas as lições,     T13
                                       e o portão do §16.1.

  ui/
    tipos.ts                           ROTULOS. Só. Não há `Vista`:             T10
                                       a vista é a fase do passo.
    estado.ts                          useLicao(licao, passoInicial).           T10
    blocos.tsx                         Registo dos blocos Blockly +             T9
                                       paraBlocoLeigo.
    painel-blocos.tsx                  `Blocos`, a casca do Blockly.            T9
    texto.tsx                          Painel de texto com debounce e           T10
                                       divergências.
    robo.tsx · robo.css                Robô com ranhuras tipadas.               T11
    lecao/Tela.tsx                     O ecrã da lição.                        T12
    lecao/PassoView.tsx                O passo, a ficha e as perguntas.         T12
    lecao/SondasView.tsx               A pergunta e a experiência da sonda.     T12
    lecao/SeletorLinguagem.tsx         As opções, com o que cada uma            T12
                                       mostra e porquê.
    lecao/catalogo.ts                  As seis linguagens, com três linhas     T12
                                       verdadeiras cada uma.
    lecao/lecao.css
    estilo.css
```

---

### Task 1: Projecto, tipos sem cruzamentos e Trace

Esta tarefa substitui a Task 1 do plano anterior. A diferença que importa: `Explicacao`, `Recusa`, `FalhaRuntime` e `QuebraEquivalencia` **deixam de ter campos `python` e `java`**. São substituídos por `remedio`. E a pasta `src/motor/` passa a `src/nucleo/`, porque o que lá dentro está já não é "o motor" — é o núcleo semântico, que não conhece linguagens.

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/vite-env.d.ts`, `src/testes/preparacao.ts`, `src/nucleo/tipos.ts`, `src/nucleo/trace.ts`, `src/main.tsx`, `scripts/verificar-arvore.ts`
- Test: `src/nucleo/trace.test.ts`, `src/nucleo/tipos.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `Language`, `LINGUAGENS`, `NOMES`, `Tipo`, `Explicacao`, `Origem`, `Valor`, `RestricaoDeTipo`, `Recusa`, `FalhaRuntime`, `QuebraEquivalencia`, `Erro`, `restricao(tipo, nome?)`, `val(tipo, valor, explicacao, origem, recusado?)`, `valorEm(v, transformar)`, `E(raio, v)`, `EXPLICACAO_VAZIA`, `RANGE_INTEIROS`, `MAX_ITERACOES`, `Evento`, `Trace`, `TraceBuilder`, `registar(passo, valor)`, `construir()`.

- [ ] **Step 1: Escrever o teste de `src/nucleo/tipos.test.ts`**

Este é o ficheiro que fixa as regras que **nenhuma** das seis linguagens
pode quebrar. Se uma regra sobre `Explicacao`, `Recusa` ou `Valor` está
aqui, é porque há uma tentação concreta de a violar mais tarde — e o
ficheiro existe para essa tentação aparecer como teste vermelho em vez de
como bug em produção.

`src/nucleo/tipos.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { E, EXPLICACAO_VAZIA, LINGUAGENS, NOMES, RANGE_INTEIROS, restricao, val } from './tipos';
import type { Explicacao, Origem, Recusa, Tipo, Valor } from './tipos';

const O: Origem = { bloco: 'guardar', ranhura: 0, passo: 1 };

function num(n: number): Valor { return val('número', n, EXPLICACAO_VAZIA, O); }
function txt(t: string): Valor { return val('texto', t, EXPLICACAO_VAZIA, O); }

describe('LINGUAGENS e NOMES', () => {
  it('são as seis, e são só seis', () => {
    expect(LINGUAGENS).toHaveLength(6);
    expect(new Set(LINGUAGENS).size).toBe(6);
  });

  it('NOMES cobre as seis, e só elas', () => {
    expect(Object.keys(NOMES).sort()).toEqual([...LINGUAGENS].sort());
  });

  it('nenhum nome é o identificador a gritar, excepto onde tem de ser', () => {
    // A regra é "o nome é o que uma pessoa escreveria, não a chave em
    // maiúsculas". `SQL` é a exceção que confirma a regra: é um acrónimo,
    // escreve-se em maiúsculas em todo o lado, e `SQL` seria uma
    // falsificação se a forcássemos para dentro do padrão das outras cinco.
    for (const l of LINGUAGENS) {
      if (l === 'sql') {
        expect(NOMES.sql).toBe('SQL');
        continue;
      }
      expect(NOMES[l]).not.toBe(l.toUpperCase());
    }
  });
});

describe('Explicacao', () => {
  it('tem porque e remedio, e mais nada', () => {
    // A regra que a spec §6.4 reescreveu: nenhuma explicação carrega o nome
    // de uma linguagem. Se um dia aparecer `python:` aqui, o teste falha e
    // a pergunta volta a ser "o que é que muda entre as seis?" — que é a
    // resposta: nada, na semântica.
    const e: Explicacao = { porque: 'porque sim', remedio: 'faz assim' };
    expect(Object.keys(e).sort()).toEqual(['porque', 'remedio']);
  });

  it('o núcleo diz isto com as suas próprias palavras', () => {
    // `E` é uma função: recebe a restrição que falhou e o valor que chegou,
    // e escreve a recusa. O texto de sistema vive aqui e em mais lado
    // nenhum do núcleo. Uma projeção escreve o seu, porque o seu utilizador
    // precisa da sintaxe dele — e é a única coisa que uma projeção faz a
    // mais. Por isso o teste chama-a em vez de a ler.
    const nomes = /Python|Java|Go|TypeScript|JavaScript|SQL/;
    const r1 = E(restricao('número', 'total'), txt('olá'));
    expect(r1.porque).not.toMatch(nomes);
    expect(r1.remedio).not.toMatch(nomes);

    const r2 = E(restricao('lista', 'numeros'), num(3));
    expect(r2.porque).not.toMatch(nomes);
    expect(r2.remedio).not.toMatch(nomes);
  });
});

describe('valor e tipo', () => {
  it('um número dentro do intervalo é número', () => {
    expect(num(5).tipo).toBe('número');
  });

  it('um texto nunca é número, mesmo com os mesmos algarismos', () => {
    expect(txt('5').tipo).toBe('texto');
    expect(txt('5').valor === 5).toBe(false);
  });

  it('`função` está no tipo mas não há nenhum valor dele', () => {
    // Está na união para a sondas não crescerem por baixo. Nenhum bloco do
    // Plano A a produz, e o `Tipo` continua fechado.
    const tipos: Tipo[] = ['número', 'texto', 'lógico', 'lista', 'função', 'actor'];
    expect(tipos).toContain('função');
  });
});

describe('RestricaoDeTipo', () => {
  it('aceita o número que é número', () => {
    expect(restricao('número').cabeEm(num(5))).toBe(true);
  });

  it('recusa um texto onde se pede número — e é a regra que o Java vai usar', () => {
    expect(restricao('número').cabeEm(txt('olá'))).toBe(false);
    expect(restricao('número').cabeEm(txt('5'))).toBe(false);
  });

  it('recusa o que já chegou recusado', () => {
    const recusado = { ...num(5), recusado: true };
    expect(restricao('número').cabeEm(recusado)).toBe(false);
  });

  it('recusa o número fora do intervalo, e o limite é RANGE_INTEIROS', () => {
    expect(restricao('número').cabeEm(num(RANGE_INTEIROS))).toBe(true);
    expect(restricao('número').cabeEm(num(RANGE_INTEIROS + 1))).toBe(false);
  });

  it('recusa o infinito, que é um número e não devia ser', () => {
    expect(restricao('número').cabeEm(num(Number.POSITIVE_INFINITY))).toBe(false);
  });

  it('o nome do slot é o do tipo, salvo quando se dá outro', () => {
    expect(restricao('número').nome).toBe('número');
    expect(restricao('número', 'total').nome).toBe('total');
  });
});

describe('as três classes de erro', () => {
  it('Recusa tem porque, remedio e o valor que foi recusado', () => {
    const r: Recusa = {
      classe: 'Recusa',
      porque: 'aqui só entra número',
      remedio: 'guarda um número, ou declara o slot como texto',
      esperado: 'número',
      obtido: 'texto',
      origem: O,
    };
    expect(r.classe).toBe('Recusa');
    expect(Object.keys(r)).toContain('remedio');
  });

  it('e nenhuma das três tem o nome de uma linguagem', () => {
    // Três interfaces, uma regra. Se amanhã um `FalhaRuntime` levar um
    // campo `java`, esta linha é a que apanha.
    const campoDeLinguagem = /^(python|java|go|typescript|javascript|sql)$/;
    for (const chave of ['porque', 'remedio', 'obtido', 'esperado', 'saida', 'linha']) {
      expect(campoDeLinguagem.test(chave)).toBe(false);
    }
  });
});
```

Run: `npx vitest run src/nucleo/tipos.test.ts`
Expected: FAIL — `NOMES`, `RANGE_INTEIROS` e `E` ainda não estão todos exportados.

- [ ] **Step 2: Inicializar o projecto e instalar dependências**

```bash
cd "/home/joel/Área de Trabalho/Ideia"
npm init -y
npm i react react-dom blockly js-yaml
npm i -D typescript vite @vitejs/plugin-react vitest jsdom tsx \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  @types/react @types/react-dom @types/js-yaml @types/node
node -p "'blockly=' + require('./node_modules/blockly/package.json').version"
```

Guarde o número impresso — vai para o `package.json` no Step 4.

- [ ] **Step 3: Configurar TypeScript, Vite e Vitest**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vitest/globals", "node"]
  },
  "include": ["src", "vite.config.ts", "scripts"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

`vite.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/testes/preparacao.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
```

`src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />

declare module '*.yml?raw' {
  const conteudo: string;
  export default conteudo;
}
```

`src/testes/preparacao.ts`:
```typescript
import '@testing-library/jest-dom/vitest';

class ObservadorFalso {
  observar(): void {}
  desconectar(): void {}
  desenhar(): void {}
  unobserve(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ObservadorFalso;
}

// O Blockly chama `getBBox` para medir o texto de um bloco. O jsdom não o
// implementa — e a lib `DOM` do TypeScript também não o põe em
// `SVGElement`, põe-no em `SVGGraphicsElement`. Por isso o guarda tem de
// procurar o protótipo em runtime e o tipo tem de ser declarado à mão:
// nenhuma das duas coisas se resolve sozinha.
type Medivel = { getBBox?: () => DOMRect };

const prototipoSVG = (typeof SVGGraphicsElement !== 'undefined'
  ? SVGGraphicsElement.prototype
  : SVGElement.prototype) as unknown as Medivel;

if (typeof SVGElement !== 'undefined' && !prototipoSVG.getBBox) {
  prototipoSVG.getBBox = function getBBox() {
    return { x: 0, y: 0, width: 100, height: 20 } as DOMRect;
  };
}
```

- [ ] **Step 4: Escrever o teste que garante que o núcleo não conhece linguagens**

Este teste passa vazio agora e é o que impede que uma tarefa futura estrague o invariante. Escreve-o **antes** de existirem projeções, para que a pressão o mantenha.

`scripts/verificar-arvore.ts`:
```typescript
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
```

Acrescente ao `scripts` do `package.json`: `"arvore": "tsx scripts/verificar-arvore.ts"`.

- [ ] **Step 5: Escrever `package.json`**

Preserve as `dependencies` e `devDependencies` que o Step 1 criou, com a versão do Blockly anotada no Step 1, e acrescente estes campos:

```json
{
  "name": "ponte",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=20", "npm": ">=10" },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "arvore": "tsx scripts/verificar-arvore.ts"
  }
}
```

O `package.json` tem seis scripts — `dev`, `build`, `typecheck`, `test`,
`test:watch` e `arvore` — e não tem um sétimo. Não existe
`npm run sondas` porque as sondas **são** `npm test`: a Task 13 escreve
`src/conteudo/portao.test.ts`, que corre todas as sondas de todas as
lições escritas e falha se alguma falhar. Um script separado seria uma
segunda porta para o mesmo Criterion — e a segunda porta é sempre a que
fica meio aberta. O que não pode correr dentro do vitest é a verificação
da árvore, porque essa é sobre ficheiros e não sobre comportamento, e por
isso tem script próprio.

> **A primeira versão deste plano dizia "quatro scripts" e mostrava seis.**
> A conta estava errada e o número errado num plano é pior do que o número
> em falta: dá a quem lê a ideia de que há dois scripts a menos, e passa
> despercebido porque ninguém conta scripts que leu.

- [ ] **Step 6: Escrever o teste falhado**

`src/nucleo/trace.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { construir, registar } from './trace';
import { E, EXPLICACAO_VAZIA, LINGUAGENS, restricao, val } from './tipos';
import type { Recusa, RestricaoDeTipo, Valor } from './tipos';

const O = { bloco: 'guardar', ranhura: 0, passo: 1 };

function numero(n: number): Valor {
  return val('número', n, EXPLICACAO_VAZIA, O);
}
function palavra(s: string): Valor {
  return val('texto', s, EXPLICACAO_VAZIA, O);
}
function logico(b: boolean): Valor {
  return val('lógico', b, EXPLICACAO_VAZIA, O);
}

const recusaNumeroTexto: Recusa = E(restricao('número'), palavra('olá'));

describe('regra dura: nenhuma recusa existe sem porque', () => {
  it('toda recusa tem porque não vazio', () => {
    expect(recusaNumeroTexto.porque.length).toBeGreaterThan(0);
  });

  it('toda recusa tem remedio não vazio', () => {
    expect(recusaNumeroTexto.remedio.length).toBeGreaterThan(0);
  });

  it('toda recusa no trace tem porque não vazio', () => {
    const t = construir();
    t.recusa(recusaNumeroTexto);
    const unico = t.eventos.find((e) => e.tipo === 'erro');
    expect(unico).toBeDefined();
    if (!unico || unico.tipo !== 'erro') throw new Error('esperava um evento de erro');
    expect(unico.erro.porque.length).toBeGreaterThan(0);
  });
});

describe('nenhuma referência a outras linguagens', () => {
  it('Recusa não tem python nem java', () => {
    expect(Object.keys(recusaNumeroTexto)).not.toContain('python');
    expect(Object.keys(recusaNumeroTexto)).not.toContain('java');
  });

  it('a lista de linguagens tem as seis, todas minúsculas', () => {
    expect(LINGUAGENS).toEqual([
      'python', 'java', 'go', 'typescript', 'javascript', 'sql',
    ]);
  });
});

describe('registar', () => {
  it('produz um evento de valor com o passo certo', () => {
    const e = registar(3, numero(1));
    expect(e).toEqual({ tipo: 'valor', passo: 3, valor: numero(1) });
  });
});

describe('cabeEm', () => {
  // A restrição é uma coluna da tabela, e não um `restricao('número')`
  // fixo no laço. Com ela fixa, uma linha que diz "número em texto" tinha
  // de passar um número e de ser julgada por um sítio de número — e o nome
  // da linha passava a ser mentira. `número em texto` só é falso se o
  // sítio for de texto, e é por isso que o sítio viaja na linha.
  const casos: Array<[string, RestricaoDeTipo, Valor, boolean]> = [
    ['número em número', restricao('número'), numero(3), true],
    ['texto em número', restricao('número'), palavra('olá'), false],
    ['número em texto', restricao('texto'), numero(3), false],
    ['lógico em número', restricao('número'), logico(true), false],
    ['lógico em texto', restricao('texto'), logico(false), false],
    ['actor em número', restricao('número'), val('actor', 'coelho', EXPLICACAO_VAZIA, O), false],
    ['lista em número', restricao('número'), val('lista', [1], EXPLICACAO_VAZIA, O), false],
    ['função em número', restricao('número'), val('função', () => 1, EXPLICACAO_VAZIA, O), false],
    ['undefined em número', restricao('número'), val('número', undefined, EXPLICACAO_VAZIA, O), false],
    ['null em número', restricao('número'), val('número', null, EXPLICACAO_VAZIA, O), false],
    ['NaN em número', restricao('número'), val('número', NaN, EXPLICACAO_VAZIA, O), false],
    ['Infinity em número', restricao('número'), val('número', Infinity, EXPLICACAO_VAZIA, O), false],
    ['acima de RANGE_INTEIROS em número', restricao('número'), numero(1e9), false],
    ['número recusado em número', restricao('número'), { ...numero(1), recusado: true }, false],
    ['número recusado em texto', restricao('texto'), { ...numero(1), recusado: true }, false],
  ];
  for (const [nome, raio, v, esperado] of casos) {
    it(`${nome} é ${esperado}`, () => {
      expect(raio.cabeEm(v)).toBe(esperado);
    });
  }

  it('texto aceita texto', () => {
    expect(restricao('texto').cabeEm(palavra('olá'))).toBe(true);
  });
});

describe('E', () => {
  it('nomeia o esperado e o obtido', () => {
    const r = E(restricao('número', 'o que guardas'), palavra('olá'));
    expect(r.esperado).toBe('número');
    expect(r.obtido).toBe('texto');
    expect(r.porque).toContain('número');
    expect(r.porque).toContain('texto');
  });

  it('o remedio diz o que fazer, não o que a outra linguagem faria', () => {
    const r = E(restricao('número', 'o que guardas'), palavra('olá'));
    expect(r.remedio).toContain('número');
    expect(r.remedio).not.toContain('Python');
    expect(r.remedio).not.toContain('Java');
  });
});
```

- [ ] **Step 7: Correr o teste e ver falhar**

Run: `npx vitest run src/nucleo/trace.test.ts`
Expected: FAIL com erro de resolução de `./tipos`.

- [ ] **Step 8: Escrever `src/nucleo/tipos.ts`**

```typescript
export const RANGE_INTEIROS = 1000;

/** Quantas voltas um laço pode dar. Vive aqui, e não em `avaliador.ts`, porque
 *  é um fato do produto e não do motor de blocos: o `interpretar` do texto
 *  tem de respeitar o mesmo limite, e dois limites escritos à mão divergem no
 *  primeiro dia em que alguém muda um deles. `RANGE_INTEIROS` é o fato
 *  vizinho — e note-se que `MAX_ITERACOES` é maior, porque um laço de 5000
 *  voltas repete 5000 valores que vão todos caber no mesmo número. */
export const MAX_ITERACOES = 10_000;

/** As seis linguagens do produto. O núcleo sabe os *nomes*; não sabe sintaxe. */
export type Language = 'python' | 'java' | 'go' | 'typescript' | 'javascript' | 'sql';

export const LINGUAGENS: readonly Language[] = [
  'python', 'java', 'go', 'typescript', 'javascript', 'sql',
];

/** Como cada linguagem se escreve para quem lê. Vive no núcleo porque três
 *  ecrãs precisam dele — o painel de texto, o seletor e a sonda — e porque
 *  escrevê-lo à mão em cada um deles é como um aluno de Java acaba a ler
 *  "O teu código em Python". Não é sintaxe: é o nome da coisa. */
export const NOMES: Record<Language, string> = {
  python: 'Python',
  java: 'Java',
  go: 'Go',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  sql: 'SQL',
};

/** `função` existe no tipo mas nenhum bloco a produz no Plano A: o primeiro
 *  conceito é variável e tipo, e `função` chega com o conceito de função
 *  (Plano B). Está aqui para que a união não cresça por baixo das sondas. */
export type Tipo = 'número' | 'texto' | 'lógico' | 'lista' | 'função' | 'actor';

export interface Explicacao {
  /** Texto para quem não sabe programar, em português europeu. */
  porque: string;
  /** O que fazer em vez disto, nos termos desta linguagem. */
  remedio: string;
}

export const EXPLICACAO_VAZIA: Explicacao = { porque: '', remedio: '' };

export interface Origem {
  bloco: string;
  ranhura: number;
  passo: number;
}

export interface Valor {
  readonly tipo: Tipo;
  readonly valor: unknown;
  readonly explicacao: Explicacao;
  readonly origem: Origem;
  /** Verdadeiro quando este valor já foi recusado. Nenhuma ranhura o aceita
   *  em silêncio depois disso, mesmo que o tipo encaixe. */
  readonly recusado: boolean;
}

export interface RestricaoDeTipo {
  tipo: Tipo;
  nome: string;
  cabeEm(v: Valor): boolean;
}

export interface Recusa {
  classe: 'Recusa';
  porque: string;
  esperado: Tipo;
  obtido: Tipo;
  remedio: string;
  origem: Origem;
}

export interface FalhaRuntime {
  classe: 'FalhaRuntime';
  porque: string;
  passo: number;
  remedio: string;
  origem: Origem;
}

export interface QuebraEquivalencia {
  classe: 'QuebraEquivalencia';
  porque: string;
  linha: number;
  esperado: string;
  obtido: string;
  remedio: string;
  origem: Origem;
}

export type Erro = Recusa | FalhaRuntime | QuebraEquivalencia;

// `nome: string = tipo` e não `nome = tipo`. Sem a anotação, o TypeScript
// infere o tipo do parâmetro a partir do valor por omissão — e o valor por
// omissão é um `Tipo`, portanto `restricao('número', 'total')` deixava de
// compilar. O nome de um sítio é uma `string` que o suele ser `Tipo`; não é
// um `Tipo` que às vezes seja uma frase.
export function restricao(tipo: Tipo, nome: string = tipo): RestricaoDeTipo {
  return {
    tipo,
    nome,
    cabeEm(v: Valor): boolean {
      if (v.recusado) return false;
      if (v.tipo !== tipo) return false;
      if (tipo === 'número') {
        if (typeof v.valor !== 'number') return false;
        if (!Number.isFinite(v.valor)) return false;
        if (Math.abs(v.valor) > RANGE_INTEIROS) return false;
      }
      return true;
    },
  };
}

export function val(
  tipo: Tipo,
  valor: unknown,
  explicacao: Explicacao,
  origem: Origem,
  recusado = false,
): Valor {
  return { tipo, valor, explicacao, origem, recusado };
}

/** Marca um `Valor` como recusado depois de o transformar. */
export function valorEm(v: Valor, transformar: (valor: unknown) => unknown): Valor {
  return { ...v, valor: transformar(v.valor), recusado: true };
}

export function E(raio: RestricaoDeTipo, v: Valor): Recusa {
  return {
    classe: 'Recusa',
    porque: `Este sítio só aceita ${raio.tipo}. Recebeste ${v.tipo}.`,
    esperado: raio.tipo,
    obtido: v.tipo,
    remedio: `Guarda lá um ${raio.tipo} em vez de ${v.tipo}.`,
    origem: v.origem,
  };
}
```

- [ ] **Step 9: Escrever `src/nucleo/trace.ts`**

```typescript
import type { Erro, QuebraEquivalencia, Recusa, Valor, FalhaRuntime } from './tipos';

export type Evento =
  | { tipo: 'passo'; passo: number; bloco: string }
  | { tipo: 'valor'; passo: number; valor: Valor }
  | { tipo: 'erro'; passo: number; erro: Erro }
  | { tipo: 'fim'; passos: number };

export interface Trace {
  eventos: Evento[];
  valores: Valor[];
  erros: Erro[];
  passos: number;
}

export function registar(passo: number, valor: Valor): Evento {
  return { tipo: 'valor', passo, valor };
}

export class TraceBuilder {
  readonly eventos: Evento[] = [];
  readonly valores: Valor[] = [];
  readonly erros: Erro[] = [];
  passos = 0;

  passo(passo: number, bloco: string): void {
    this.passos = passo;
    this.eventos.push({ tipo: 'passo', passo, bloco });
  }

  /** Chama o `registar` de módulo em vez de repetir o literal: o evento de
   *  valor é construído num sítio só, e o `registar` livre é a coisa que os
   *  testes importam. Chamá-lo por um nome diferente do que tem aqui — era
   *  `valor`, um substantivo entre verbos — é a razão pela qual o
   *  `avaliador.ts` da T2, escrito contra este ficheiro, chamava
   *  `trace.registar` e recebia `is not a function` em quinze sítios. */
  registar(passo: number, v: Valor): void {
    this.valores.push(v);
    this.eventos.push(registar(passo, v));
  }

  recusa(r: Recusa, passo = r.origem.passo): void {
    this.erros.push(r);
    this.eventos.push({ tipo: 'erro', passo, erro: r });
  }

  falha(f: FalhaRuntime): void {
    this.erros.push(f);
    this.eventos.push({ tipo: 'erro', passo: f.passo, erro: f });
  }

  divergencia(q: QuebraEquivalencia): void {
    this.erros.push(q);
    this.eventos.push({ tipo: 'erro', passo: q.linha, erro: q });
  }

  fim(): void {
    this.eventos.push({ tipo: 'fim', passos: this.passos });
  }
}

export function construir(): TraceBuilder {
  return new TraceBuilder();
}
```

- [ ] **Step 10: Escrever `index.html` e `src/main.tsx` mínimos**

`index.html`:
```html
<!doctype html>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ponte</title>
  </head>
  <body>
    <div id="raiz"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('o index.html precisa de #raiz');
createRoot(raiz).render(
  <StrictMode>
    <p>Em construção.</p>
  </StrictMode>,
);
```

- [ ] **Step 11: Correr tudo e confirmar que passa**

Run: `npx vitest run src/nucleo/trace.test.ts && npm run arvore && npx tsc --noEmit`
Expected: testes PASS, `arvore` imprime `núcleo limpo: 2 ficheiros de produção + 2 de teste, zero importações de projeções`, e o typecheck não diz nada.

> **Os quatro correcções que esta tarefa custou a achar.** O `tsc --noEmit` faz
> parte do Step 11 desde o início, e o código do plano não passava nele:
> `restricao(tipo, nome = tipo)` inferia `nome` como `Tipo`; o `import type`
> de `trace.ts` trazia `Origem` sem o usar, e `noUnusedLocals` está ligado;
> `test:` no `defineConfig` de `vite` não existe em `UserConfigExport`; e
> `SVGElement.prototype.getBBox` não existe em `SVGElement` na lib `DOM`.
> Nenhum dos quatro aparece num teste, porque `vitest` não verifica tipos —
> aparecem no `build`. **Um plano cujo código não compila é um plano que
> manda escrever código que não compila**, e o próximo executor paga a mesma
> factura sem saber de onde veio.

- [ ] **Step 12: Commitar**

```bash
git add -A
git commit -m "feat: nucleo semantico — tipos sem cruzamentos de linguagem e Trace

Explicacao, Recusa, FalhaRuntime e QuebraEquivalencia deixam de ter
campos python/java e ganham remedio. Um aluno de Go não deve ver
Python numa mensagem de erro.

src/motor/ passa a src/nucleo/, porque o que la esta ja nao e o motor
de uma linguagem: e a semantica, que nao conhece nenhuma.

scripts/verificar-arvore.ts garante que nucleo/ nunca importa
projecoes/. Passa vazio agora e e o que trava as tarefas seguintes."
```

---

### Task 2: O motor de blocos — de `BlocoLeigo` a `Trace`

**Files:**
- Create: `src/nucleo/testes/dados.ts`, `src/nucleo/blocos.ts`, `src/nucleo/avaliador.ts`
- Test: `src/nucleo/avaliador.test.ts`

**Interfaces:**
- Consumes: Task 1 — `Tipo`, `Valor`, `Origem`, `Erro`, `E`, `restricao`, `RANGE_INTEIROS`, `TraceBuilder`, `construir`.
- Produces: `BlocoLeigo`, `CampoLeigo`, `EntradaLeiga`, `BLOCOS` (em `blocos.ts`, com o vocabulário — o ecrã e as projeções precisam de os nomear sem conhecer o motor); `Regra`, `regraDeLinhas()`, `Entradas`, `Avaliador`, `avaliador(regra?)`, `pilhaDe(raiz)` (em `avaliador.ts`); `guardar(nome, valor)`, `guardarTexto(nome, valor)`, `repetir(vezes, corpo)`, `dizer(valor)`, `log(valor)`, `pilha(...blocos)` (em `testes/dados.ts`); `identificador(nome)`, `TIPO_DE_BLOCO`, `CORES`.

- [ ] **Step 1: Escrever `src/nucleo/testes/dados.ts` — os blocos de teste**

Este ficheiro vem primeiro, e não por ordem estética. Todos os testes deste
plano — do motor, das duas projeções, do avaliador e das sondas — montam os
mesmos cinco blocos. Se cada teste escrever os seus, ao sexto ficheiro já
há três formatos de `guardar` e nenhum deles é o que o motor lê.

`src/nucleo/testes/dados.ts`:
```typescript
import type { BlocoLeigo } from '../blocos';

/** Um bloco `guardar` com um valor cru: número, texto ou referência. */
export function guardar(nome: string, valor: unknown): BlocoLeigo {
  return { type: 'guardar', fields: { nome: { valor: nome } }, inputs: { VALOR: { valor } } };
}

/** O mesmo bloco, com o valor já embrulhado em `texto()` — a saída do robô. */
export function guardarTexto(nome: string, valor: unknown): BlocoLeigo {
  return {
    type: 'guardar',
    fields: { nome: { valor: nome } },
    inputs: { VALOR: { valor: { txt: String(valor) } } },
  };
}

export function repetir(vezes: unknown, corpo: BlocoLeigo[]): BlocoLeigo {
  return { type: 'repetir', fields: {}, inputs: { PASSOS: { valor: vezes }, CORPO: { stack: corpo } } };
}

export function dizer(valor: unknown): BlocoLeigo {
  return { type: 'dizer', fields: {}, inputs: { VALOR: { valor } } };
}

export function log(valor: unknown): BlocoLeigo {
  return { type: 'log', fields: {}, inputs: { VALOR: { valor } } };
}

export function pilha(...blocos: BlocoLeigo[]): BlocoLeigo {
  return { type: 'pilha', inputs: { CORPO: { stack: blocos } } };
}
```

Repara na diferença entre `guardar` e `guardarTexto`, porque é a diferença
que o produto inteiro existe para mostrar. `guardar('total', 5)` mete o
número cru no `VALOR` e sai `total = 5`. `guardarTexto('total', 5)` mete
`{ txt: '5' }` e sai `total = '5'` — **um número dentro de aspas**.

Isto não é um lapso do teste: é o que a palavra do robô é. A palavra que o
robô entrega é uma palavra, mesmo que o utilizador tenha escrito `5` na
porta. Por isso `String(valor)` aparece no constructor — para que a
conversão para texto aconteça **uma vez, aqui**, e nunca outra vez no
emissor. São duas coisas que uma linha separa, e é por isso que têm nomes
separados nos testes: um teste que passa com `guardar` e falha com
`guardarTexto` é o teste que apanha a conversão dupla. O Step 1 da Task 4
escreve o par de testes dourados que fecham esta regra.



- [ ] **Step 2: Escrever o teste falhado**

`src/nucleo/avaliador.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { avaliador, pilhaDe, regraDeLinhas } from './avaliador';
import { MAX_ITERACOES, RANGE_INTEIROS } from './tipos';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Avaliador } from './avaliador';
import { identificador } from './blocos';
import { dizer, guardar, guardarTexto, log, pilha, repetir } from './testes/dados';

describe('identificador', () => {
  it('mantém um nome simples', () => {
    expect(identificador('total')).toBe('total');
  });
  it('remove acentos', () => {
    expect(identificador('música')).toBe('musica');
  });
  it('prefixa nomes que começam por dígito', () => {
    expect(identificador('1total')).toBe('v_1total');
  });
  it('sufixa palavras reservadas de Python', () => {
    expect(identificador('class')).toBe('class_');
  });
  it('substitui caracteres inválidos', () => {
    expect(identificador('meu-total')).toBe('meu_total');
  });
  it('devolve v_ para nome vazio', () => {
    expect(identificador('')).toBe('v_');
  });
});

describe('pilhaDe', () => {
  it('devolve lista vazia para null', () => {
    expect(pilhaDe(null)).toEqual([]);
  });
  it('desembrulha um bloco único', () => {
    expect(pilhaDe(guardar('total', 1))).toHaveLength(1);
  });
  it('desembrulha uma pilha', () => {
    expect(pilhaDe(pilha(guardar('total', 1), log(1)))).toHaveLength(2);
  });
});

describe('guardar', () => {
  it('guarda um número e deixa-o disponível pelo nome', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: 5 }, 1);
    const v = a.avaliar('dador_num', { VALOR: { ref: 'total' } }, 1);
    expect(v.tipo).toBe('número');
    expect(v.valor).toBe(5);
  });

  it('guardar texto dá um valor de texto, e isso já é um erro', () => {
    // O nome antigo deste teste dizia "sem erro", e o teste seguinte — que
    // existe — diz que é uma `Recusa`. O nome mentia sobre o comportamento
    // que o ficheiro está a descrever. Um teste cujo nome é falso ensina o
    // leitor a ignorar o teste, e é o primeiro sítio onde se aprende a não
    // confiar em testes.
    const a = avaliador();
    const v = a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
    expect(v.tipo).toBe('texto');
    expect(v.recusado).toBe(true);
    expect(a.trace.erros.length).toBe(1);
  });

  it('recusa guardar texto, com porque não vazio', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('Recusa');
    expect(e && e.porque.length).toBeGreaterThan(0);
    expect(e && e.classe === 'Recusa' && e.esperado).toBe('número');
    expect(e && e.classe === 'Recusa' && e.obtido).toBe('texto');
  });

  it('recusa guardar um número fora de RANGE_INTEIROS', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: 1_000_000 }, 1);
    expect(a.trace.erros[0]?.classe).toBe('Recusa');
  });

  it('nome de variável duplicado substitui e explica — nunca cria fantasma', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: 1 }, 1);
    a.avaliar('guardar', { nome: 'total', VALOR: 2 }, 1);
    const v = a.avaliar('dador_num', { VALOR: { ref: 'total' } }, 1);
    expect(v.valor).toBe(2);
    const avisos = a.trace.valores.filter((x) => x.explicacao.porque.includes('substitui'));
    expect(avisos.length).toBe(1);
  });

  it('guardar sem nome é FalhaRuntime com porque', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: '', VALOR: 1 }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e && e.porque.length).toBeGreaterThan(0);
  });

  it('guardar sem valor é FalhaRuntime com porque', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total' }, 1);
    expect(a.trace.erros[0]?.classe).toBe('FalhaRuntime');
  });

  it('uma variável só existe na linha em que foi guardada', () => {
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: 5 }, 1);
    a.avaliar('dador_num', { VALOR: { ref: 'total' } }, 2);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e && e.porque).toContain('total');
  });
});

describe('a palavra do robô', () => {
  it('guardar guarda 5 como número, e ninguém se queixa', () => {
    const a = avaliador();
    a.executar(pilha(guardar('total', 5)));
    const v = a.avaliar('dador_num', { VALOR: { ref: 'total' } }, 1);
    expect(v.tipo).toBe('número');
    expect(v.valor).toBe(5);
    expect(a.trace.erros.length).toBe(0);
  });

  it('guardarTexto guarda o mesmo 5 como palavra, e isso é recusado', () => {
    // `guardarTexto` embrulha em `{txt: '5'}`. O `5` que a pessoa escreveu e
    // o `5` que o robô disse não são o mesmo valor: um é número, o outro é
    // uma palavra com dois algarismos dentro. Uma variável de número não
    // aceita a segunda forma, e é essa recusa — não um erro qualquer — que a
    // lição da variável precisa de mostrar. A versão anterior deste par
    // dizia o contrário, e o `vitest` apanhou-o.
    const a = avaliador();
    a.executar(pilha(guardarTexto('total', 5)));
    const v = a.avaliar('dador_num', { VALOR: { ref: 'total' } }, 1);
    expect(v.tipo).toBe('texto');
    expect(v.valor).toBe('5');
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('Recusa');
    expect(e && e.classe === 'Recusa' && e.esperado).toBe('número');
    expect(e && e.classe === 'Recusa' && e.obtido).toBe('texto');
  });
});

describe('repetir', () => {
  it('repete o corpo o número de vezes pedido', () => {
    const a = avaliador();
    a.executar(pilha(repetir(3, [guardar('x', 1)])));
    const guardou = a.trace.valores.filter((v) => v.origem.bloco === 'guardar');
    expect(guardou.length).toBe(3);
  });

  it('aceita zero repetições e não executa o corpo', () => {
    const a = avaliador();
    a.executar(pilha(repetir(0, [guardar('x', 1)])));
    expect(a.trace.valores.filter((v) => v.origem.bloco === 'guardar').length).toBe(0);
    expect(a.trace.erros.length).toBe(0);
  });

  it('um número de repetições acima do limite é FalhaRuntime com porque', () => {
    const a = avaliador();
    a.executar(pilha(repetir(MAX_ITERACOES + 1, [guardar('x', 1)])));
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e && e.porque).toContain(String(MAX_ITERACOES));
  });

  it('um número de repetições não inteiro é FalhaRuntime com porque', () => {
    const a = avaliador();
    a.executar(pilha(repetir(1.5, [guardar('x', 1)])));
    expect(a.trace.erros[0]?.classe).toBe('FalhaRuntime');
  });

  it('não entra no ciclo quando o número de repetições é inválido', () => {
    const a = avaliador();
    a.executar(pilha(repetir(MAX_ITERACOES + 1, [guardar('x', 1)])));
    expect(a.trace.valores.filter((v) => v.origem.bloco === 'guardar').length).toBe(0);
  });

  it('um número de repetições grande demais dá o erro do laço, não o do valor', () => {
    // Dois limites, dois fatos. `RANGE_INTEIROS` diz que nenhum número
    // acima de 1000 existe; `MAX_ITERACOES` diz que um laço não repete mais
    // de 10000 vezes. Se o `repetir` decidisse pelo `valorDe`, quem escrevesse
    // `repetir(10001)` lia "este número é grande demais" e nunca soube que o
    // problema era o número de repetições. O teste abaixo é a razão de o
    // `repetir` olhar para o valor cru antes de o converter.
    const a = avaliador();
    a.executar(pilha(repetir(MAX_ITERACOES + 1, [guardar('x', 1)])));
    expect(a.trace.erros.length).toBe(1);
    expect(a.trace.erros[0]?.classe).toBe('FalhaRuntime');
    expect(a.trace.erros[0]?.porque).toContain('repetições');
  });

  it('repetir(1000) é aceite: está no alcance do número e dentro do laço', () => {
    const a = avaliador();
    a.executar(pilha(repetir(RANGE_INTEIROS, [guardar('x', 1)])));
    expect(a.trace.erros.length).toBe(0);
    expect(a.trace.valores.filter((v) => v.origem.bloco === 'guardar').length).toBe(
      RANGE_INTEIROS,
    );
  });

  it('um número de repetições negativo é FalhaRuntime', () => {
    const a = avaliador();
    a.executar(pilha(repetir(-1, [guardar('x', 1)])));
    expect(a.trace.erros[0]?.classe).toBe('FalhaRuntime');
  });

  it('repetir aninhado executa o corpo interno vezes × vezes', () => {
    const a = avaliador();
    a.executar(pilha(repetir(2, [repetir(3, [guardar('x', 1)])])));
    expect(a.trace.valores.filter((v) => v.origem.bloco === 'guardar').length).toBe(6);
  });
});

describe('dizer', () => {
  it('aceita texto', () => {
    const a = avaliador();
    const v = a.avaliar('dizer', { VALOR: { txt: 'olá' } }, 1);
    expect(v.tipo).toBe('texto');
    expect(a.trace.erros.length).toBe(0);
  });

  it('recusa um número, com porque não vazio', () => {
    const a = avaliador();
    a.avaliar('dizer', { VALOR: 5 }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('Recusa');
    expect(e && e.classe === 'Recusa' && e.esperado).toBe('texto');
    expect(e && e.classe === 'Recusa' && e.obtido).toBe('número');
  });

  it('recusa um valor que já tinha sido recusado a chegar a dizer', () => {
    // São dois erros, não um: o do `guardar` (palavra num slot de número) e o
    // do `dizer` (a variável recusada a chegar a um sítio de texto). A
    // versão anterior lia `erros[0]` — o do `guardar` — e por isso passava
    // mesmo que o `dizer` aceitasse o valor. Lê o último.
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
    a.avaliar('dizer', { VALOR: { ref: 'total' } }, 1);
    expect(a.trace.erros.length).toBe(2);
    const e = a.trace.erros[1];
    expect(e?.classe).toBe('Recusa');
    expect(e?.origem.bloco).toBe('dizer');
    expect(e && e.porque.length).toBeGreaterThan(0);
  });
});

describe('valores de entrada', () => {
  it('{txt} é texto', () => {
    expect(avaliador().avaliar('dador_num', { VALOR: { txt: 'x' } }, 1).tipo).toBe('texto');
  });
  it('um número é número', () => {
    expect(avaliador().avaliar('dador_num', { VALOR: 3 }, 1).tipo).toBe('número');
  });
  it('um booleano é lógico', () => {
    expect(avaliador().avaliar('dador_num', { VALOR: true }, 1).tipo).toBe('lógico');
  });
  it('{bloco} é avaliado recursivamente', () => {
    const a = avaliador();
    const v = a.avaliar('dador_num', { VALOR: { bloco: { type: 'dador_num', inputs: { VALOR: { valor: 9 } } } } }, 1);
    expect(v.valor).toBe(9);
  });
  it('uma referência a variável inexistente é FalhaRuntime com porque', () => {
    const a = avaliador();
    a.avaliar('dador_num', { VALOR: { ref: 'fantasma' } }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e && e.porque).toContain('fantasma');
  });
  it('uma forma desconhecida é Recusa com porque', () => {
    const a = avaliador();
    a.avaliar('dador_num', { VALOR: { qqq: 1 } }, 1);
    expect(a.trace.erros[0]?.classe).toBe('Recusa');
  });
});

describe('blocos não implementados', () => {
  it('um bloco desconhecido é FalhaRuntime com porque e diz o que fazer', () => {
    const a = avaliador();
    a.avaliar('condicao', { VALOR: 1 }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e && e.porque).toContain('condicao');
    expect(e && e.porque).toContain('lição 1');
  });
});

describe('executar', () => {
  it('uma pilha corre os blocos por ordem e para no primeiro erro', () => {
    const a = avaliador();
    a.executar(pilha(guardar('total', 1), dizer(5), log({ ref: 'total' })));
    const guardou = a.trace.valores.filter((v) => v.origem.bloco === 'guardar');
    expect(guardou.length).toBe(1);
    expect(a.trace.erros.length).toBe(1);
    expect(a.trace.erros[0]?.origem.bloco).toBe('dizer');
  });

  it('o bloco depois do erro não corre', () => {
    const a = avaliador();
    a.executar(pilha(guardar('total', 1), dizer(5), guardar('outro', 2)));
    const guardou = a.trace.valores.filter((v) => v.origem.bloco === 'guardar');
    expect(guardou.length).toBe(1);
  });

  it('programa vazio não produz erros nem valores', () => {
    const a = avaliador();
    a.executar(null);
    expect(a.trace.erros.length).toBe(0);
    expect(a.trace.valores.length).toBe(0);
  });

  it('cada bloco de topo é uma linha nova, e as variáveis não atravessam linhas', () => {
    const a = avaliador();
    a.executar(pilha(guardar('total', 5), log({ ref: 'total' })));
    expect(a.trace.erros.length).toBe(1);
  });
});

describe('partilha de Regra', () => {
  it('dois avaliadores com a mesma Regra veem as mesmas linhas', () => {
    // A linha tem de ser escrita por um `executar`, não por um `avaliar`
    // avulso: `inicializa` é o que abre a linha, e é o `avaliar` directo que
    // a deixa por abrir. A versão anterior deste teste escrevia a linha com
    // dois `avaliar` e depois jurava que os dois avaliadores a partilhavam —
    // e passava a testar que a `Regra` não partilha nada.
    const primeiro = avaliador();
    const segundo = avaliador(primeiro.regra);
    primeiro.executar(pilha(guardar('total', 5)));
    const v = segundo.avaliar('dador_num', { VALOR: { ref: 'total' } }, 1);
    expect(v.valor).toBe(5);
  });

  it('atribuir abre uma linha que ninguém inicializou', () => {
    // Atribuir cria; ler o que não foi atribuído falha. Se `define`
    // ignorasse a linha por não existir, `avaliar('guardar', …)` avulso
    // seria um no-op silencioso — e é assim que nasce um teste que passa
    // sem estar a testar nada.
    const r = regraDeLinhas();
    const a = avaliador(r);
    a.avaliar('guardar', { nome: 'total', VALOR: 7 }, 1);
    expect(r.obtém('total', 1)?.valor).toBe(7);
  });

  it('inicializar a mesma linha de novo apaga o que lá estava', () => {
    const r = regraDeLinhas();
    const a = avaliador(r);
    a.avaliar('guardar', { nome: 'total', VALOR: 7 }, 1);
    r.inicializa(1);
    expect(r.existe('total', 1)).toBe(false);
  });
});

describe('o motor não conhece linguagens', () => {
  it('nenhum erro do motor nomeia uma linguagem', () => {
    // A spec §6.4: uma linguagem é a sua sintaxe, e a sintaxe é o que a
    // projeção escreve. O `E`, o `restricao` e o `valor` vivem no núcleo e
    // não podem trazer um nome de linguagem — quem aprende Go não há de ler
    // "Python" numa mensagem sobre um número.
    //
    // Cada caso devolve o avaliador que usou, para que a leitura do `trace`
    // seja feita no mesmo objeto que produziu o erro. Um caso que corre
    // `avaliador()` internamente e devolve `void` obriga a refazer a mesma
    // execução para poder olhar para o resultado — e um teste que repete a
    // execução é um teste que pode passar na segunda vez e falhar na
    // primeira.
    const casos: Array<[string, () => Avaliador]> = [
      ['guardar texto num slot de número', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
        return a;
      }],
      ['guardar sem nome', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: '', VALOR: 1 }, 1);
        return a;
      }],
      ['guardar fora de RANGE_INTEIROS', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'total', VALOR: 1_000_000 }, 1);
        return a;
      }],
      ['guardar sem valor', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'total' }, 1);
        return a;
      }],
      ['dizer um número', () => {
        const a = avaliador();
        a.avaliar('dizer', { VALOR: 5 }, 1);
        return a;
      }],
      ['dizer um valor já recusado', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
        a.avaliar('dizer', { VALOR: { ref: 'total' } }, 1);
        return a;
      }],
      ['referência a uma variável que não existe', () => {
        const a = avaliador();
        a.avaliar('dador_num', { VALOR: { ref: 'fantasma' } }, 1);
        return a;
      }],
      ['forma de valor desconhecida', () => {
        const a = avaliador();
        a.avaliar('dador_num', { VALOR: { qqq: 1 } }, 1);
        return a;
      }],
      ['bloco não implementado', () => {
        const a = avaliador();
        a.avaliar('condicao', { VALOR: 1 }, 1);
        return a;
      }],
      ['repetição não inteira', () => {
        const a = avaliador();
        a.executar(pilha(repetir(1.5, [guardar('x', 1)])));
        return a;
      }],
      ['repetição acima do limite', () => {
        const a = avaliador();
        a.executar(pilha(repetir(MAX_ITERACOES + 1, [guardar('x', 1)])));
        return a;
      }],
    ];

    for (const [nome, caso] of casos) {
      const a = caso();
      expect(a.trace.erros.length, nome).toBeGreaterThan(0);
      for (const e of a.trace.erros) {
        const texto = e.porque + '\n' + ('remedio' in e ? e.remedio : '');
        expect(texto, nome).not.toMatch(/Python|Java|Go|TypeScript|JavaScript|SQL/);
      }
    }
  });

  it('todo erro do motor tem porque e remedio não vazios', () => {
    // A regra que a Task 1 fixou para `Recusa`, aplicada agora a todos os
    // sítios onde o motor decide falhar. Um erro sem `remedio` é um erro
    // que obriga o aluno a adivinhar, e o produto inteiro existe para
    // trocar adivinhação por razão.
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
    for (const e of a.trace.erros) {
      expect(e.porque.length).toBeGreaterThan(0);
      if ('remedio' in e) expect(e.remedio.length).toBeGreaterThan(0);
    }
  });
});

// O `verificar-arvore.ts` já garante que `nucleo/` não *importa* `projecoes/`.
// Isto é a outra metade: que o núcleo não *chame* para dentro de uma
// projeção, nem pelo nome de uma função dela. A tentação é concreta e
// silenciosa — `avaliarTexto` é o nome que toda a gente dá à função que
// converte texto numa linguagem, e um dia um ficheiro do núcleo vai
// `import { avaliarTexto } from '../projecoes/…'` e passar a tratar
// sintaxe, que é a coisa que a spec §6.4 proíbe ao núcleo.
//
// Só os ficheiros de produção são lidos. Este ficheiro de teste menciona
// `projecoes` e `avaliarTexto` nas próprias expressões regulares, e um
// teste que se apanha a si próprio não verifica nada.
describe('o núcleo não fala com as projeções', () => {
  function producaoEm(raiz: string): string[] {
    return readdirSync(raiz, { withFileTypes: true }).flatMap((e) => {
      const caminho = join(raiz, e.name);
      if (e.isDirectory()) return producaoEm(caminho);
      if (!/\.tsx?$/.test(e.name)) return [];
      return e.name.includes('.test.') ? [] : [caminho];
    });
  }

  // O `cwd` do vitest é a raiz do projecto, que é onde a npm correu o
  // comando. `import.meta.url` não serve: depois da transformação do
  // vitest deixa de ser um URL `file:` e `fileURLToPath` rebenta — o que
  // é um bom motivo para um teste de caminho de ficheiro não confiar em
  // magia de bundler.
  const NUCLEO = join(process.cwd(), 'src', 'nucleo');

  it('nenhum ficheiro de produção menciona uma projeção ou chama o leitor de texto', () => {
    const ficheiros = producaoEm(NUCLEO);
    expect(ficheiros.length).toBeGreaterThan(0);
    for (const f of ficheiros) {
      // Os comentários saem antes do casamento. Um ficheiro do núcleo vai
      // ter uma linha a explicar *porquê* que não chama `emitir` — e um
      // teste que proíbe a palavra transformava a documenting do
      // invariante numa razão para o invariante desaparecer. O que se
      // proíbe é a chamada, não a lembrança dela.
      const codigo = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
      expect(codigo, f).not.toMatch(/projecoes/);
      expect(codigo, f).not.toMatch(/avaliarTexto|\.ler\(|\bemitir\b/);
    }
  });
});
```

- [ ] **Step 3: Correr e ver falhar**

Run: `npx vitest run src/nucleo/avaliador.test.ts`
Expected: FAIL com erro de resolução de `./avaliador`.

- [ ] **Step 4: Escrever `src/nucleo/blocos.ts`**

```typescript
import type { Tipo } from './tipos';

export interface CampoLeigo {
  valor: unknown;
}

export interface EntradaLeiga {
  valor?: unknown;
  stack?: BlocoLeigo[];
}

/** A forma de um bloco, tal como vem do Blockly e do YAML — e nada mais.
 *
 *  Vive aqui, no vocabulário, e não em `avaliador.ts`, porque este tipo
 *  descreve *dados* e não comportamento: o ecrã de blocos (Task 9), o
 *  carregador de lições (Task 7) e as projeções (Task 4) todos precisam de
 *  o nomear, e nenhum deles deve ter de importar o motor para isso. O motor
 *  é que caminha estes blocos; eles não precisam de saber que ele existe.
 *
 *  `fields` é o que a pessoa vê escrito no bloco — o nome de uma variável,
 *  o texto de um botão — e `inputs` é o que se liga a outros blocos. A
 *  distinção não é cosmética: um nome é um valor escrito à mão e um valor
 *  pode ser um bloco, e uma função de emissão que os trocasse emitiria
 *  `undefined` no sítio onde ia o nome. */
export interface BlocoLeigo {
  type: string;
  fields?: Record<string, CampoLeigo>;
  inputs?: Record<string, EntradaLeiga>;
}

/** Ids de bloco. Slugs ASCII em minúsculas: são a identidade do bloco, e
 *  nunca o texto que o utilizador lê. O texto vive no Blockly e no YAML. */
export const BLOCOS = {
  guardar: 'guardar',
  repetir: 'repetir',
  dizer: 'dizer',
  log: 'log',
  pressionar: 'pressionar',
  executar: 'executar',
  atribuir: 'atribuir',
  mostrar: 'mostrar',
} as const;

export const CORES: Record<string, string> = {
  guardar: '#2563eb',
  repetir: '#7c3aed',
  dizer: '#059669',
  log: '#0d9488',
  pressionar: '#ea580c',
  dador_num: '#3b82f6',
  texto: '#10b981',
  logico: '#f59e0b',
  acts: '#a855f7',
};

const PALAVRAS_PYTHON = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'True', 'try', 'while', 'with', 'yield',
]);

/** Converte um nome escrito por uma pessoa num identificador Python válido. */
export function identificador(nome: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_');
  const limpo = base.length === 0 || /^[0-9]/.test(base) ? `v_${base}` : base;
  return PALAVRAS_PYTHON.has(limpo) ? `${limpo}_` : limpo;
}

export const TIPO_DE_BLOCO: Record<string, Tipo> = {
  dador_num: 'número',
  texto: 'texto',
  logico: 'lógico',
  acts: 'actor',
};
```

- [ ] **Step 5: Escrever `src/nucleo/avaliador.ts`**

```typescript
import { construir } from './trace';
import type { TraceBuilder } from './trace';
import { E, EXPLICACAO_VAZIA, MAX_ITERACOES, RANGE_INTEIROS, restricao } from './tipos';
import type { Erro, FalhaRuntime, Origem, Tipo, Valor } from './tipos';
import { identificador } from './blocos';
import type { BlocoLeigo } from './blocos';

export type { BlocoLeigo, CampoLeigo, EntradaLeiga } from './blocos';

/** Contrato para persistir valores entre avaliações. O `passo` é explícito
 *  porque o mesmo objeto é partilhado por vários avaliadores. */
export interface Regra {
  inicializa(passo: number): void;
  obtém(nome: string, passo: number): Valor | null;
  define(nome: string, passo: number, v: Valor): void;
  existe(nome: string, passo: number): boolean;
}

export function regraDeLinhas(): Regra {
  const linhas = new Map<number, Map<string, Valor>>();
  return {
    inicializa(passo) {
      linhas.set(passo, new Map());
    },
    obtém(nome, passo) {
      return linhas.get(passo)?.get(nome) ?? null;
    },
    define(nome, passo, v) {
      // Atribuir **cria** a linha se ela não existir. A versão anterior
      // ignorava a atribuição quando `inicializa` não tinha corrido, e isso
      // tornava `avaliar('guardar', …)` avulso um no-op silencioso: o bloco
      // "guardava" e nada ficava guardado, sem erro nenhum. Atribuir cria e
      // ler o que não foi atribuído falha — que é a regra de toda a vida, e
      // é a regra que o `executor` implementa chamando `inicializa` por linha.
      const linha = linhas.get(passo) ?? new Map<string, Valor>();
      linha.set(nome, v);
      linhas.set(passo, linha);
    },
    existe(nome, passo) {
      return linhas.get(passo)?.has(nome) ?? false;
    },
  };
}

export interface Entradas {
  nome?: unknown;
  ATOR?: unknown;
  NOME?: unknown;
  VALOR?: unknown;
  PASSOS?: unknown;
  CORPO?: BlocoLeigo[];
}

function origemDe(bloco: string, ranhura: number, passo: number): Origem {
  return { bloco, ranhura, passo };
}

/** O valor mais cru que existe: um tipo, um `unknown` e nada mais. O nome
 *  acaba em `Cru` porque `valorDe` é também o nome do método que resolve um
 *  valor de entrada; dois nomes e um método com o mesmo nome obrigam quem lê
 *  a parar em cada chamada para ver qual dos dois é que está a correr. */
function valorCru(tipo: Tipo, valor: unknown, bloco: string, ranhura: number, passo: number): Valor {
  return {
    tipo,
    valor,
    explicacao: EXPLICACAO_VAZIA,
    origem: origemDe(bloco, ranhura, passo),
    recusado: false,
  };
}

/** Um erro do motor. `remedio` é obrigatório e não pode ser vazio: a
 *  linguagem que explica *quando* este programa rebenta é escrita pela
 *  projeção, e o núcleo só diz o que fazer — porque o núcleo não conhece
 *  nenhuma linguagem. */
function falhar(passo: number, porque: string, remedio: string, bloco: string): FalhaRuntime {
  return {
    classe: 'FalhaRuntime',
    porque,
    passo,
    remedio,
    origem: origemDe(bloco, 0, passo),
  };
}

function entradasDe(b: BlocoLeigo): Entradas {
  return {
    nome: b.fields?.nome?.valor,
    ATOR: b.fields?.ATOR?.valor,
    NOME: b.fields?.NOME?.valor,
    VALOR: b.inputs?.VALOR?.valor,
    PASSOS: b.inputs?.PASSOS?.valor,
    CORPO: b.inputs?.CORPO?.stack,
  };
}

export function pilhaDe(raiz: BlocoLeigo | null): BlocoLeigo[] {
  if (!raiz) return [];
  if (raiz.type === 'pilha') return raiz.inputs?.CORPO?.stack ?? [];
  return [raiz];
}

export interface Avaliador {
  readonly trace: TraceBuilder;
  readonly regra: Regra;
  executar(raiz: BlocoLeigo | null): void;
  avaliar(tipo: string, e: Entradas, passo: number): Valor;
}

class AvaliadorImpl implements Avaliador {
  readonly trace: TraceBuilder = construir();
  readonly regra: Regra;

  constructor(regra?: Regra) {
    this.regra = regra ?? regraDeLinhas();
  }

  executar(raiz: BlocoLeigo | null): void {
    const pilha = pilhaDe(raiz);
    for (let i = 0; i < pilha.length; i += 1) {
      const passo = i + 1;
      const b = pilha[i]!;
      this.regra.inicializa(passo);
      this.trace.passo(passo, b.type);
      this.avaliar(b.type, entradasDe(b), passo);
      if (this.trace.erros.length > 0) break;
    }
    this.trace.fim();
  }

  avaliar(tipo: string, e: Entradas, passo: number): Valor {
    switch (tipo) {
      case 'guardar':
        return this.guardar(e, passo);
      case 'repetir':
        return this.repetir(e, passo);
      case 'dizer':
        return this.dizer(e, passo);
      case 'log':
        return this.registar(e, passo);
      case 'pressionar':
        return this.pressionar(e, passo);
      case 'dador_num':
      case 'texto':
      case 'logico':
      case 'acts':
        return this.valorDe(e.VALOR, passo, tipo, 0);
      default:
        this.trace.falha(
          falhar(
            passo,
            `O bloco "${tipo}" ainda não faz nada. A lição 1 só usa "guardar" e "repetir".`,
            `Usa um bloco que esta lição ensinou, ou espera pela lição que traz o bloco "${tipo}".`,
            tipo,
          ),
        );
        return { ...valorCru('número', undefined, tipo, 0, passo), recusado: true };
    }
  }

  /** Resolve um valor de entrada: literal, referência, ou bloco aninhado. */
  private valorDe(bruto: unknown, passo: number, bloco: string, ranhura: number): Valor {
    const origem = origemDe(bloco, ranhura, passo);
    if (bruto === null || bruto === undefined) {
      this.trace.falha(
        falhar(
          passo,
          'Falta o valor deste sítio.',
          'Arrasta um valor para dentro deste sítio, ou escreve o número directamente no sítio.',
          bloco,
        ),
      );
      return { ...valorCru('número', undefined, bloco, ranhura, passo), recusado: true };
    }
    if (typeof bruto === 'number') {
      if (Number.isFinite(bruto) && Math.abs(bruto) <= RANGE_INTEIROS) {
        return valorCru('número', bruto, bloco, ranhura, passo);
      }
      const v: Valor = { ...valorCru('número', bruto, bloco, ranhura, passo), recusado: true };
      this.trace.recusa({
        ...E(restricao('número', 'o número'), v),
        origem,
        // O `remedio` do `E` é escrito a partir do par (esperado, obtido), e
        // aqui os dois são `número`: "guarda lá um número em vez de número" não
        // é um consolo, é uma frase sem sentido. O problema não é o tipo, é o
        // tamanho, e o consolo tem de falar do tamanho.
        remedio: `Este sítio só trabalha com números de ${RANGE_INTEIROS} para baixo, em qualquer sentido. Arranca o número para um valor mais pequeno, ou deixa de usar números tão grandes.`,
      });
      return v;
    }
    if (typeof bruto === 'boolean') {
      return valorCru('lógico', bruto, bloco, ranhura, passo);
    }
    if (typeof bruto === 'object') {
      const o = bruto as { txt?: unknown; ref?: unknown; bloco?: BlocoLeigo };
      if (typeof o.txt === 'string') return valorCru('texto', o.txt, bloco, ranhura, passo);
      if (typeof o.ref === 'string') {
        const chave = identificador(o.ref);
        const v = this.regra.obtém(chave, passo);
        if (v) return { ...v, origem };
        this.trace.falha(
          falhar(
            passo,
            `A variável "${o.ref}" ainda não tem valor nesta linha.`,
            `Guarda o valor de "${o.ref}" numa linha **antes** desta, ou escreve o valor directamente aqui em vez do nome.`,
            bloco,
          ),
        );
        return { ...valorCru('número', undefined, bloco, ranhura, passo), recusado: true };
      }
      if (o.bloco) return this.avaliar(o.bloco.type, entradasDe(o.bloco), passo);
    }
    const v: Valor = { ...valorCru('número', bruto, bloco, ranhura, passo), recusado: true };
    this.trace.recusa({
      ...E(restricao('número', 'o valor'), v),
      origem,
      remedio:
        'O que chegou a este sítio não é um número, nem uma palavra, nem o nome de uma variável que já tenha valor.',
    });
    return v;
  }

  private guardar(e: Entradas, passo: number): Valor {
    const bruto = String(e.nome ?? '').trim();
    if (bruto.length === 0) {
      this.trace.falha(
        falhar(
          passo,
          'A tua variável não tem nome. O nome é o que te permite voltar a ela depois.',
          'Escreve um nome para a tua variável. Um nome só, sem espaços, e que diga o que lá está guardado.',
          'guardar',
        ),
      );
      return { ...valorCru('número', undefined, 'guardar', 0, passo), recusado: true };
    }
    const nome = identificador(bruto);
    const recebido = this.valorDe(e.VALOR, passo, 'guardar', 0);
    if (recebido.recusado) {
      this.regra.define(nome, passo, recebido);
      return recebido;
    }
    if (recebido.tipo !== 'número') {
      this.trace.recusa({
        ...E(restricao('número', 'o que guardas'), recebido),
        origem: origemDe('guardar', 0, passo),
        remedio: `Uma variável que guarda um número não pode receber a palavra "${String(recebido.valor)}". Ou guardas um número, ou mudas o valor que entra — e uma palavra é uma palavra escrita entre aspas, não um número.`,
      });
      const guardado: Valor = { ...recebido, recusado: true };
      this.regra.define(nome, passo, guardado);
      return guardado;
    }
    const final: Valor = this.regra.existe(nome, passo)
      ? {
          ...recebido,
          explicacao: {
            ...recebido.explicacao,
            porque: `Isto substitui o valor que "${bruto}" já tinha. Uma variável tem um só valor de cada vez.`,
          },
        }
      : recebido;
    this.regra.define(nome, passo, final);
    this.trace.registar(passo, final);
    return final;
  }

  /** O que decide se um número pode contar repetições: inteiro, não
   *  negativo, e dentro de `MAX_ITERACOES`. */
  private cabeComoContagem(n: number): boolean {
    return Number.isInteger(n) && n >= 0 && n <= MAX_ITERACOES;
  }

  private repeticoesInvalidas(passo: number): FalhaRuntime {
    return falhar(
      passo,
      `O número de repetições tem de ser um número inteiro de 0 a ${MAX_ITERACOES}.`,
      'Escreve neste sítio um número redondo. Um número de repetições conta vezes inteiras: 3 ou 5, nunca 1,5 — ninguém repete uma coisa uma vez e meio.',
      'repetir',
    );
  }

  private repetir(e: Entradas, passo: number): Valor {
    const bruto = e.PASSOS;

    // A contagem de repetições é o único sítio do motor que olha para o
    // número **antes** de o converter, e a razão não é performance: são dois
    // limites diferentes. `RANGE_INTEIROS` diz que nenhum número acima de
    // 1000 existe; `MAX_ITERACOES` diz que um laço não repete mais de 10000
    // vezes. Se a decisão passasse por `valorDe`, quem escrevesse
    // `repetir(10001)` lia "este número é grande demais" e nunca ficava a
    // saber que o problema era o número de repetições. Cada limite tem a sua
    // frase, e a do laço é a que ensina alguma coisa.
    if (typeof bruto === 'number' && !this.cabeComoContagem(bruto)) {
      this.trace.falha(this.repeticoesInvalidas(passo));
      return { ...valorCru('lógico', undefined, 'repetir', 0, passo), recusado: true };
    }

    const valor = this.valorDe(bruto, passo, 'repetir', 0);
    if (valor.recusado) {
      // O `valorDe` já escreveu no `trace` a razão pela qual o valor não
      // serve. Escrever um segundo erro para o mesmo número seria mostrar
      // à mesma pessoa duas queixas sobre uma coisa só.
      return { ...valorCru('lógico', undefined, 'repetir', 0, passo), recusado: true };
    }
    if (valor.tipo !== 'número' || typeof valor.valor !== 'number' || !this.cabeComoContagem(valor.valor)) {
      this.trace.falha(this.repeticoesInvalidas(passo));
      return { ...valorCru('lógico', undefined, 'repetir', 0, passo), recusado: true };
    }
    const vezes = valor.valor;

    const corpo = e.CORPO ?? [];
    for (let i = 0; i < vezes; i += 1) {
      for (const filho of corpo) {
        const passoInterno = passo + 1;
        this.regra.inicializa(passoInterno);
        this.trace.passo(passoInterno, filho.type);
        this.avaliar(filho.type, entradasDe(filho), passoInterno);
        if (this.trace.erros.length > 0) {
          return valorCru('lógico', true, 'repetir', 0, passo);
        }
      }
    }
    return valorCru('lógico', true, 'repetir', 0, passo);
  }

  private dizer(e: Entradas, passo: number): Valor {
    const recebido = this.valorDe(e.VALOR, passo, 'dizer', 0);
    if (recebido.recusado || recebido.tipo !== 'texto') {
      this.trace.recusa({
        ...E(restricao('texto', 'o que dizes'), recebido),
        origem: origemDe('dizer', 0, passo),
        remedio: `O que dizes tem de ser uma palavra. Se tens um número e queres dizê-lo, escreve-o entre aspas — é assim que se escreve uma palavra que tem algarismos dentro.`,
      });
      return { ...recebido, recusado: true };
    }
    this.trace.registar(passo, recebido);
    return recebido;
  }

  private registar(e: Entradas, passo: number): Valor {
    const recebido = this.valorDe(e.VALOR, passo, 'log', 0);
    this.trace.registar(passo, recebido);
    return recebido;
  }

  private pressionar(e: Entradas, passo: number): Valor {
    const ator = typeof e.ATOR === 'string' && e.ATOR.length > 0 ? e.ATOR : 'coelho';
    const nome = typeof e.NOME === 'string' && e.NOME.length > 0 ? e.NOME : 'executar';
    const v = valorCru('actor', ator, 'pressionar', 0, passo);
    return {
      ...v,
      explicacao: { porque: `O ${ator} vai ${nome}.`, remedio: '' },
    };
  }
}

export function avaliador(regra?: Regra): Avaliador {
  return new AvaliadorImpl(regra);
}

export function errosDe(a: Avaliador): Erro[] {
  return a.trace.erros;
}
```

- [ ] **Step 6: Correr e ver passar**

Run: `npx vitest run src/nucleo/avaliador.test.ts`
Expected: PASS.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: avaliador de blocos — guardar, repetir, dizer, log, pressionar"
```

---

- [ ] **Step 9: Confirmar que o motor não conhece linguagens**

O `avaliador.ts` produz `Trace` a partir de `BlocoLeigo` e nunca olha para texto. `npm run arvore` já garante a metade das *importações*; o `describe('o núcleo não fala com as projeções')`, no fim do ficheiro de teste, garante a outra metade — que nenhum ficheiro de produção **chame** o leitor de texto de uma projeção, e que nenhum dos onze sítios onde o motor decide falhar escreva o nome de uma linguagem. Ambos os testes já estão no `src/nucleo/avaliador.test.ts` do Step 2; este passo é o que os corre.

Run: `npx vitest run src/nucleo/avaliador.test.ts && npm run arvore`
Expected: PASS. E `npm run arvore` continua a dizer `núcleo limpo`.

---

> ### O que esta tarefa custou a achar, e o que ficou escrito no código
>
> **O `avaliador.ts` do plano estava escrito contra a `Explicacao` de antes
> da spec §6.4.** Trazia `PY_FALHA`, `JAVA_FALHA`, `PY_RECUSA` e
> `JAVA_RECUSA` — texto de sistema por linguagem, no núcleo. A Task 1 tinha
> acabado de remover os campos `python`/`java` e de instalar `remedio`, e a
> Task 1 também tinha escrito o teste que falha se um nome de linguagem
> aparecer no núcleo. As duas tarefas discordavam, e a segunda estava certa.
> Os quatro textos desapareceram e cada sítio onde o motor decide falhar
> passou a escrever o seu `remedio` — que é a única coisa que o núcleo pode
> dizer, porque o núcleo não conhece nenhuma linguagem. **A diferença
>de ensino entre "isto rebenta aqui" e "isto rebenta mais tarde" é a projeção que a
> escreve**, e é essa a costura que a Task 4 prova.
>
> **`falhar` passou a exigir `remedio`.** Um `FalhaRuntime` sem remédio
> obriga o aluno a adivinhar, e o produto existe para trocar adivinhação por
> razão. Tê-lo como argumento opcional seria o caminho mais curto para um
> `remedio: ''` que ninguém escreve.
>
> **`E(restricao(...), v)` produz um `remedio` sem sentido em dois sítios.**
> O texto é escrito a partir do par (esperado, obtido), e nos dois sítios os
> dois são o mesmo: "guarda lá um número em vez de número", quando o número
> é grande demais, e quando o que chegou nem sequer era um valor. O
> `remedio` é sobreposto em ambos, porque o problema em cada um deles não é
> o tipo.
>
> **`Regra.define` passou a abrir uma linha que ninguém inicializou.** Com
> `inicializa` a correr só dentro de `executar`, um `avaliar('guardar', …)`
> avulso guardava o valor para lado nenhum: o bloco "guardava" e não ficava
> nada, sem erro nenhum. Vários testes faziam exatamente isso e passavam.
> Atribuir cria e ler o que não foi atribuído falha — que é a regra de toda a
> vida, e é o que `executar` implementa chamando `inicializa` por linha.
>
> **`MAX_ITERACOES` era inalcançável.** `RANGE_INTEIROS` é 1000, e nenhum
> número acima de 1000 existe, logo `MAX_ITERACOES = 10000` não podia ser
> ultrapassado por nenhum valor — e o ramo que o verificava era código morto.
> Não o apagámos: são fatos diferentes. `MAX_ITERACOES` diz que um laço não
> repete mais de 10000 vezes; `RANGE_INTEIROS` diz que não há números grandes.
> Por isso o `repetir` olha para o número **cru** antes de o converter, e
> quem escreve `repetir(10001)` lê "o número de repetições tem de ser um
> número inteiro de 0 a 10000" em vez de "este número é grande demais". Há
> um teste para cada mensagem.
>
> **O `TraceBuilder` tinha o método `valor()` e este ficheiro chamava
> `trace.registar()`** — quinze `is not a function` numa execução. O método
> passou a chamar-se `registar`, que é o nome que a lista `Produces` da Task 1
> já usava, e que fica com o `registar` de módulo: um substantivo entre
> verbos era a ambiguidade que causou a falha. O método chama o `registar`
> livre, para que o evento de valor seja construído num sítio só.
>
> **Três testes do plano estavam errados, e a implementação estava certa:**
>
> 1. `executar(pilha(guardar('total', 1), log({ref:'total'}), dizer(5), …))`
>    esperava que o erro fosse no `dizer`. O `log({ref:'total'})` está na
>    linha 2 e `total` foi guardada na linha 1, e o próprio plano diz duas
>    linhas abaixo que uma variável não atravessa linhas — logo o `log` é
>    que falha primeiro. O teste contradizia-se a si próprio.
> 2. "dois avaliadores com a mesma `Regra` veem as mesmas linhas" escrevia a
>    linha com dois `avaliar` e jurava que os dois avaliadores a partilhavam.
>    Sem `inicializa`, a linha nunca era aberta, e o teste passava a provar
>    que a `Regra` não partilha nada. Passa a escrever a linha com um
>    `executar`.
> 3. "recusa um valor que já tinha sido recusado a chegar a dizer" lia
>    `erros[0]`, que é o erro do `guardar` — e passava mesmo que o `dizer`
>    aceitasse o valor. Lê o último, e confirma que são dois.
>
> **E um teste que escrevi ao contrário antes de o motor existir:** o par
> `guardar` / `guardarTexto` estava invertido, jurando que `guardarTexto`
> dava um número. `guardarTexto` embrulha em `{txt: '5'}`, e `'5'` é uma
> palavra. O `5` que a pessoa escreveu e o `5` que o robô disse não são o
> mesmo valor, e é essa diferença — não um erro qualquer — que a lição da
> variável precisa de mostrar. O `vitest` apanhou-o; o correto é que só o
> `vitest` o apanhava, porque nenhum tipo diz nada sobre isto.

---

### Task 3: O núcleo semântico — o invariante em código

Esta é a tarefa mais importante do plano, e é nova. A spec §6.4 corrigida diz que o que se partilha entre as seis linguagens é a *semântica*, e que o `parse` não se pode partilhar. Portanto o núcleo tem de saber responder a três perguntas — **o que é uma violação de tipo, o que é uma soma, e quando é que cada uma se reporta** — sem saber uma única palavra de sintaxe. Recebe fatos já lidos e decide.

A `Policy` entra como parâmetro. É isso que faz Python e Java partilharem o mesmo código sem mentir sobre nenhuma das duas.

`Policy` e `POLITICAS` vivem aqui, e não em `src/projecoes/`, porque `semantica.ts` é que as consome — a dependência fica de mão única, `projecoes/` → `nucleo/`.

**Files:**
- Create: `src/nucleo/semantica.ts`
- Test: `src/nucleo/semantica.test.ts`

**Interfaces:**
- Consumes: Task 1 — `Language`, `Tipo`, `Valor`, `Erro`, `Recusa`, `FalhaRuntime`, `Origem`, `restricao`, `E`.
- Produces: `Policy`, `POLITICAS`, `Quando`, `EventoLido`, `AMOSTRA`, `interpretar`, `interpretarEm`.

- [ ] **Step 1: Escrever o teste falhado**

`src/nucleo/semantica.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { AMOSTRA, POLITICAS, interpretar, interpretarEm } from './semantica';
import type { EventoLido } from './semantica';
import { MAX_ITERACOES, val } from './tipos';
import type { Language, Origem, Valor } from './tipos';

const ORIGEM: Origem = { bloco: 'linha', ranhura: 0, passo: 1 };

function n(v: number): Valor {
  return val('número', v, AMOSTRA, ORIGEM);
}
function t(v: string): Valor {
  return val('texto', v, AMOSTRA, ORIGEM);
}
function origemNo(passo: number): Origem {
  return { ...ORIGEM, passo };
}

const TODAS = Object.keys(POLITICAS) as Language[];

function atribuir(nome: string, valor: Valor, restricao?: 'número'): EventoLido {
  return { passo: 1, tipo: 'atribuir', nome, tipoValor: valor.tipo, valor, restricao };
}
function usar(nome: string, tipoValor: 'número' | 'texto'): EventoLido {
  return { passo: 2, tipo: 'usar', nome, tipoValor };
}
function operar(a: Valor, b: Valor, operacao: '+' | '/'): EventoLido {
  return { passo: 2, tipo: 'operar', operacao, a, b };
}
function ciclo(passo: number, iteracoes: number): EventoLido {
  return { passo, tipo: 'ciclo', iteracoes };
}

/** Interpreta um evento só e exige que produza um erro — para os testes em
 *  que a pergunta é *qual* erro, e não *quantos*. */
function umErro(ev: EventoLido, politica = POLITICAS.python) {
  const erros = interpretar([ev], politica, origemNo);
  expect(erros).toHaveLength(1);
  return erros[0]!;
}

describe('as seis políticas', () => {
  it('existe uma para cada linguagem, e só uma', () => {
    expect(Object.keys(POLITICAS).sort()).toEqual([
      'go',
      'java',
      'javascript',
      'python',
      'sql',
      'typescript',
    ]);
  });

  it('python e javascript nunca recusam no tipo', () => {
    expect(POLITICAS.python.recusaNoTipo).toBe(false);
    expect(POLITICAS.javascript.recusaNoTipo).toBe(false);
  });

  it('java, go, typescript e sql recusam no tipo', () => {
    expect(POLITICAS.java.recusaNoTipo).toBe(true);
    expect(POLITICAS.go.recusaNoTipo).toBe(true);
    expect(POLITICAS.typescript.recusaNoTipo).toBe(true);
    expect(POLITICAS.sql.recusaNoTipo).toBe(true);
  });

  it('o quando distingue as três epistemologias', () => {
    expect(POLITICAS.python.quando).toBe('ao usar');
    expect(POLITICAS.javascript.quando).toBe('ao usar');
    expect(POLITICAS.java.quando).toBe('antes de correr');
    expect(POLITICAS.go.quando).toBe('antes de correr');
    expect(POLITICAS.typescript.quando).toBe('antes de correr');
    expect(POLITICAS.sql.quando).toBe('quando o dado entra');
  });
});

describe('interpretar: o mesmo programa, seis políticas', () => {
  it('python deixa passar a atribuição errada — é este o ponto da lição', () => {
    expect(interpretar([atribuir('total', t('olá'), 'número')], POLITICAS.python, origemNo)).toEqual([]);
  });

  it('python reporta ao usar, e o porque nomeia o texto e a variável', () => {
    const erros = interpretar(
      [atribuir('total', t('olá'), 'número'), usar('total', 'número')],
      POLITICAS.python,
      origemNo,
    );
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('FalhaRuntime');
    expect(erros[0]!.porque).toContain('texto');
    expect(erros[0]!.porque).toContain('total');
    // O passo vive em `origem`, e é lá que vive nos *três* erros. Uma `Recusa`
    // não tem `passo` no topo — só `origem` — e dar-lhe um `passo` seria pôr
    // o mesmo fato em dois sítios, para depois divergirem. O `passo` que a
    // `FalhaRuntime` tem no topo é o que a Task 1 escreveu, e não se mexe.
    expect(erros[0]!.origem.passo).toBe(2);
  });

  it('java recusa logo na atribuição, e o passo é o da atribuição', () => {
    const erros = interpretar(
      [atribuir('total', t('olá'), 'número'), usar('total', 'número')],
      POLITICAS.java,
      origemNo,
    );
    // Dois erros, não um — e este é o mesmo programa que o teste "depois de
    // uma Recusa" usa, que exige dois. A primeira versão deste teste pedia
    // um, e as duas exigências não podem ser verdade ao mesmo tempo. São
    // dois: a recusa da linha 1, e o fato de a linha 2 usar um valor
    // recusado. O segundo não é redundância — é o que impede um programa
    // recusado de continuar em silêncio e parecer que funciona.
    expect(erros).toHaveLength(2);
    expect(erros[0]!.classe).toBe('Recusa');
    // O passo da atribuição, não o da linha 2 que a usou. É a diferença
    // entre "a linha 1 está errada" e "a linha 2 está errada" — a mesma
    // diferença que a spec §7 pede à lição, e que um teste com `.passo`
    // inexistente nunca ia ver.
    expect(erros[0]!.origem.passo).toBe(1);
    if (erros[0]!.classe !== 'Recusa') throw new Error('esperava Recusa');
    expect(erros[0]!.esperado).toBe('número');
    expect(erros[0]!.obtido).toBe('texto');
  });

  it('sql recusa na entrada do dado e diz que a limitação fica para sempre', () => {
    const erros = interpretar([atribuir('total', t('olá'), 'número')], POLITICAS.sql, origemNo);
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('Recusa');
    expect(erros[0]!.remedio).toContain('para sempre');
  });

  it('nenhuma das seis produz um erro sem porque nem sem remedio', () => {
    for (const nome of TODAS) {
      const erros = interpretar(
        [atribuir('total', t('olá'), 'número'), usar('total', 'número'), operar(n(1), n(0), '/')],
        POLITICAS[nome],
        origemNo,
      );
      expect(erros.length).toBeGreaterThan(0);
      for (const e of erros) {
        expect(e.porque.length).toBeGreaterThan(0);
        expect(e.remedio.length).toBeGreaterThan(0);
      }
    }
  });

  it('nenhum erro nomeia uma linguagem, em nenhum ramo do interpretador', () => {
    // A lista cobre os quatro ramos que escrevem texto — atribuir, usar,
    // operar, ciclo — mais um `imprimir` e um `texto` inocuos, para que a
    // lista não cresça a cada ramo novo sem ninguém reparar. Um erro que
    // dissesse "em Python isto rebenta mais tarde" seria útil e seria
    // exatamente o que este ficheiro proíbe: a prosa por linguagem é da
    // projeção, e é a Task 4 que a escreve.
    for (const nome of TODAS) {
      const eventos: EventoLido[] = [
        atribuir('total', t('olá'), 'número'),
        usar('total', 'número'),
        usar('inexistente', 'número'),
        operar(t('olá'), n(1), '+'),
        ciclo(3, MAX_ITERACOES + 1),
        { passo: 4, tipo: 'imprimir', valor: n(5) },
        { passo: 5, tipo: 'texto', texto: 'olá' },
      ];
      for (const e of interpretar(eventos, POLITICAS[nome], origemNo)) {
        expect(JSON.stringify(e), nome).not.toMatch(/Python|Java|JavaScript|Go|TypeScript|SQL/);
      }
    }
  });
});

describe('interpretar: uma variável recusada não volta a ser utilizável', () => {
  it('depois de uma Recusa, usar o valor é FalhaRuntime e não silêncio', () => {
    const erros = interpretar(
      [atribuir('total', t('olá'), 'número'), usar('total', 'número')],
      POLITICAS.java,
      origemNo,
    );
    expect(erros).toHaveLength(2);
    expect(erros[0]!.classe).toBe('Recusa');
    expect(erros[1]!.classe).toBe('FalhaRuntime');
    expect(erros[1]!.porque).toContain('recusado');
  });

  it('mas uma atribuição certa ao mesmo nome cura o nome', () => {
    // Uma `Recusa` é um erro *daquela linha*, não uma nódoa permanente no
    // nome. Se corrigir a linha 1 fizesse a 2 passar, e se não fizesse, o
    // aluno levava a lição errada: que em Java um nome fica podre para
    // sempre. Não fica. E o teste existe porque a implementação natural —
    // marcar `recusado` e nunca mais o desmarcar — dá o resultado errado
    // sem dar erro nenhum.
    const erros = interpretar(
      [
        atribuir('total', t('olá'), 'número'),
        { passo: 3, tipo: 'atribuir', nome: 'total', tipoValor: 'número', valor: n(5) },
        usar('total', 'número'),
      ],
      POLITICAS.java,
      origemNo,
    );
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('Recusa');
    expect(erros[0]!.origem.passo).toBe(1);
  });
});

describe('interpretar: variável usada antes de existir', () => {
  it('nomeia a variável e o passo', () => {
    const erros = interpretar([usar('total', 'número')], POLITICAS.python, origemNo);
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('FalhaRuntime');
    expect(erros[0]!.porque).toContain('total');
    expect(erros[0]!.porque).toContain('antes');
    expect(erros[0]!.origem.passo).toBe(2);
  });

  it('vale igual em Java, porque o compilador também não adivinha', () => {
    expect(interpretar([usar('total', 'número')], POLITICAS.java, origemNo)).toHaveLength(1);
  });
});

describe('interpretar: aritmética', () => {
  it('somar dois números é silencioso nas seis', () => {
    for (const nome of TODAS) {
      expect(interpretar([operar(n(5), n(1), '+')], POLITICAS[nome], origemNo)).toEqual([]);
    }
  });

  it('uma operação com tipos diferentes é FalhaRuntime mesmo em Java', () => {
    // Um compilador não avalia aritmética, por isso nunca recusa uma soma de
    // tipos errados: recusa a correr, não antes. Este teste é o que impede a
    // política de virar "recusa-e-basta".
    const erros = interpretar([operar(t('olá'), n(1), '+')], POLITICAS.java, origemNo);
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('FalhaRuntime');
    expect(erros[0]!.porque).toContain('texto');
  });

  it('juntar dois textos com + é o que a linguagem faz, e não é erro', () => {
    expect(interpretar([operar(t('olá'), t(' mundo'), '+')], POLITICAS.python, origemNo)).toEqual([]);
  });

  it('dividir por zero é FalhaRuntime com porque, nas seis', () => {
    for (const nome of TODAS) {
      const erros = interpretar([operar(n(8), n(0), '/')], POLITICAS[nome], origemNo);
      expect(erros).toHaveLength(1);
      expect(erros[0]!.classe).toBe('FalhaRuntime');
      expect(erros[0]!.porque).toContain('zero');
    }
  });

  it('a origem de um erro de operação é o passo do evento', () => {
    expect(umErro(operar(n(8), n(0), '/')).origem.passo).toBe(2);
  });

  it('um operando que é um nome não se julga: o uso é que sabe o tipo', () => {
    // `total = total + 1` tem `total` à esquerda, e o valor de `total` só
    // existe quando o programa corre. O plano punha um `0` no lugar do nome,
    // e com isso uma conta de dois números podia ser recusada por uma
    // incompatibilidade que não existe. O `usar` do mesmo passo é que
    // declara o tipo exigido, e é dele que sai o erro.
    const semNome = interpretar(
      [operar(n(1), n(2), '+')],
      POLITICAS.python,
      origemNo,
    );
    expect(semNome).toEqual([]);

    const comNome = interpretar(
      [{ passo: 2, tipo: 'operar', operacao: '+', a: null, b: n(1) }],
      POLITICAS.python,
      origemNo,
    );
    expect(comNome).toEqual([]);
  });

  it('mas o divisor zero diz-se mesmo com o outro lado a ser um nome', () => {
    const e = umErro({ passo: 2, tipo: 'operar', operacao: '/', a: null, b: n(0) });
    expect(e.porque).toContain('zero');
  });

  it('e o tipo que o uso exige é o que apanha o texto numa conta', () => {
    // A linha mais importante da lição: `total = 'olá'` passa, e é a linha
    // seguinte que rebenta. O `usar` da conta declara `número`, e o núcleo
    // responde que `total` guarda texto. Se a conta não declarasse nada, o
    // produto não teria como dizer ao aluno a coisa mais importante que
    // sabe sobre Python.
    const erros = interpretar(
      [
        atribuir('total', t('olá')),
        { passo: 2, tipo: 'usar', nome: 'total', tipoValor: 'número' },
        { passo: 2, tipo: 'operar', operacao: '+', a: null, b: n(1) },
      ],
      POLITICAS.python,
      origemNo,
    );
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('texto');
    expect(erros[0]!.porque).toContain('número');
  });
});

describe('interpretar: limites de ciclo', () => {
  it('aceita o limite exato e recusa o limite mais um, nas seis', () => {
    for (const nome of TODAS) {
      expect(interpretar([ciclo(1, MAX_ITERACOES)], POLITICAS[nome], origemNo)).toEqual([]);
      const erros = interpretar([ciclo(1, MAX_ITERACOES + 1)], POLITICAS[nome], origemNo);
      expect(erros).toHaveLength(1);
      expect(erros[0]!.porque).toContain(String(MAX_ITERACOES));
    }
  });

  it('o valor do limite é 10000, e o teste acima não o descobre sozinho', () => {
    // Se alguém baixar `MAX_ITERACOES` para 5, o teste anterior continua a
    // passar: lê a constante, compara com a constante, e prova que a
    // comparação existe. O número em si fica preso aqui, à mão, que é o
    // sítio onde um fato tem de ficar preso para o teste valer alguma coisa.
    expect(MAX_ITERACOES).toBe(10_000);
  });

  it('um número de voltas fracionário tem mensagem própria', () => {
    // Não é o mesmo erro que "a mais". Um laço de duas voltas e meia não
    // existe, e dizer a quem escreveu 2.5 que o limite são 10000 ensina a
    // coisa errada: a resposta seria "então 2.5 é menos que 10000, porque foi
    // recusado?".
    const e = umErro(ciclo(1, 2.5));
    expect(e.porque).toContain('inteiro');
    expect(e.porque).not.toContain('10000');
  });

  it('um número de voltas negativo tem a sua mensagem, e não é o limite', () => {
    const e = umErro(ciclo(1, -1));
    expect(e.porque).toContain('negativo');
    expect(e.porque).not.toContain('10000');
  });
});

describe('interpretar: imprimir e texto', () => {
  it('um sítio sem tipo declarado aceita o que chegar', () => {
    // `print(total)` em Python não quer texto: quer o que houver. Se a
    // projeção mandasse um `usar` com `tipoValor: 'texto'`, o núcleo
    // responderia "total guarda número, e este sítio precisa de texto" — um
    // erro que o Python não tem, numa linha que o Python aceita. O aluno
    // leria isso e concluiria que o produto se engana, que é a pior coisa
    // que um professor de sintaxe pode ensinar. A omissão é a informação.
    const erros = interpretar(
      [
        atribuir('total', n(5)),
        { passo: 2, tipo: 'usar', nome: 'total' },
        usar('total', 'texto'),
      ],
      POLITICAS.python,
      origemNo,
    );
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('texto');
  });

  it('e a diferença entre omisso e declarado é a diferença entre nada e tudo', () => {
    const soOmisso = interpretar(
      [atribuir('total', n(5)), { passo: 2, tipo: 'usar', nome: 'total' }],
      POLITICAS.python,
      origemNo,
    );
    expect(soOmisso).toEqual([]);

    // O mesmo `usar` com o tipo declarado é o bloco `dizer`, que é mais
    // estrito do que a linguagem. A costura é real e é a Task 6 que a mostra.
    const declarado = interpretar(
      [atribuir('total', n(5)), usar('total', 'texto')],
      POLITICAS.python,
      origemNo,
    );
    expect(declarado).toHaveLength(1);
  });

  it('imprimir aceita qualquer tipo, porque print(5) é legal em cinco das seis', () => {
    // O motor de blocos é *mais* estrito: o bloco `dizer` só aceita texto.
    // A diferença é deliberada e é uma lição — quem aprendeu nos blocos
    // escreve `print('5')` e depois descobre que a linguagem também aceitava
    // `print(5)`. É a costura que a Task 6 vai ter de mostrar. O que não pode
    // é o texto ser julgado por uma regra que o bloco não tem.
    for (const nome of TODAS) {
      expect(
        interpretar([{ passo: 1, tipo: 'imprimir', valor: n(5) }], POLITICAS[nome], origemNo),
      ).toEqual([]);
    }
  });

  it('um texto é texto cru e não se julga: quem o leu foi a projeção', () => {
    expect(interpretar([{ passo: 1, tipo: 'texto', texto: "'aberta" }], POLITICAS.python, origemNo)).toEqual(
      [],
    );
  });
});

describe('interpretarEm', () => {
  it('repassa a política da linguagem ao interpretador', () => {
    const ler = (): EventoLido[] => [atribuir('total', t('olá'), 'número')];
    expect(interpretarEm('qualquer', 'python', ler)).toEqual([]);
    expect(interpretarEm('qualquer', 'java', ler)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Correr o teste e ver falhar**

Run: `npx vitest run src/nucleo/semantica.test.ts`
Expected: FAIL com erro de resolução de `./semantica`.

- [ ] **Step 3: Escrever `src/nucleo/semantica.ts`**

```typescript
import type { Erro, Language, Origem, Tipo, Valor } from './tipos';
import { E, MAX_ITERACOES, restricao } from './tipos';

/** Quando uma violação de tipo é reportada. São três epistemologias
 *  distintas, e a diferença entre elas é a lição. */
export type Quando = 'antes de correr' | 'ao usar' | 'quando o dado entra';

export interface Policy {
  /** Verdadeiro quando a linguagem recusa um tipo errado sem esperar pela
   *  execução. Java, Go, TypeScript e SQL sim. Python e JavaScript nunca — e
   *  isto é a única coisa que o avaliador de texto precisa de saber para não
   *  estar a mentir sobre Python. */
  recusaNoTipo: boolean;
  /** Quando é que a recusa aparece, para a projeção escrever a frase certa.
   *  `recusaNoTipo` decide *se* há recusa; `quando` decide *como se fala*
   *  dela. São decisões separadas porque as duas nem sempre coincidem: SQL
   *  recusa, como as outras quatro, mas a limitação não se resolve quando o
   *  programa corre — fica escrita no dado. */
  quando: Quando;
}

export const POLITICAS: Record<Language, Policy> = {
  python: { recusaNoTipo: false, quando: 'ao usar' },
  javascript: { recusaNoTipo: false, quando: 'ao usar' },
  go: { recusaNoTipo: true, quando: 'antes de correr' },
  typescript: { recusaNoTipo: true, quando: 'antes de correr' },
  java: { recusaNoTipo: true, quando: 'antes de correr' },
  sql: { recusaNoTipo: true, quando: 'quando o dado entra' },
};

/** Explicação neutra, para valores que não vêm da lição. */
export const AMOSTRA = {
  porque: 'valor calculado',
  remedio: 'mete aqui um valor do tipo certo',
} as const;

/** O que uma linha diz, depois de lida. A projeção sabe; o núcleo julga.
 *
 *  Este é o contrato entre as três camadas e vale a pena ler duas vezes: o
 *  núcleo nunca vê texto, e a projeção nunca decide se um tipo é aceitável.
 *  Cada `EventoLido` é um fato já lido — "a linha 2 atribui o nome `total` a um
 *  texto" — e o núcleo responde "isso é um erro, e a partir de quando". */
export type EventoLido =
  | {
      passo: number;
      tipo: 'atribuir';
      nome: string;
      tipoValor: Tipo;
      valor: Valor;
      /** O tipo que este sítio aceita, quando é mais estreito do que o que
       *  chegou. `int total = …` em Java tem ambos. */
      restricao?: Tipo;
    }
  /** `usar` num sítio que **não declara** tipo é `tipoValor` a omisso.
   *
   *  A omissão não é falta de informação — é informação: `print(total)` em
   *  Python aceita qualquer coisa, e um evento que chega a dizer "este sítio
   *  precisa de texto" faz o produto inventar um erro que o Python não tem.
   *  E é o pior tipo de erro possível num produto que ensina: o aluno lê
   *  `print(total)`, o produto diz que está errado, e o aluno conclui que
   *  o professor também se engana. `x = total` é o mesmo caso — uma cópia
   *  não impõe tipo ao destino.
   *
   *  O que se perde é pouco: um sítio sem tipo declarado também não dá um
   *  erro de incompatibilidade para reportar, que é a única coisa que este
   *  campo servia. */
  | { passo: number; tipo: 'usar'; nome: string; tipoValor?: Tipo }
  /** `operar` com um operando a `null` é uma conta de que a projeção só leu
   *  um lado: `total = total + 1` tem `total` à esquerda, e o valor de
   *  `total` só existe quando o programa corre. O `usar` que acompanha o
   *  `operar` é que carrega o tipo exigido, e é dele que sai o erro.
   *
   *  A alternativa — pôr um `0` no lugar do nome — é o que o plano fazia, e
   *  produz um erro sobre `número` com `número` numa linha que é válida, ou
   *  um "não se pode juntar texto com número" numa conta de dois números. */
  | { passo: number; tipo: 'operar'; operacao: '+' | '-' | '*' | '/'; a: Valor | null; b: Valor | null }
  | { passo: number; tipo: 'imprimir'; valor: Valor }
  | { passo: number; tipo: 'ciclo'; iteracoes: number }
  | { passo: number; tipo: 'texto'; texto: string };

interface Guardada {
  tipo: Tipo;
  recusado: boolean;
}

/** Dois tipos juntam-se se forem o mesmo. Não há um segundo tipo numérico a
 *  absorver aqui: `number` é o único, e uma função que parece que vai tratar
 *  de dois números que na verdade só trata de um esconde a decisão de que
 *  `2.0` e `2` são o mesmo número. */
function coerencia(a: Tipo, b: Tipo): boolean {
  return a === b;
}

function operacaoDiz(operacao: '+' | '-' | '*' | '/'): string {
  return { '+': 'juntar', '-': 'subtrair', '*': 'multiplicar', '/': 'dividir' }[operacao];
}

function erroDePasso(passo: number, porque: string, remedio: string, origem: Origem): Erro {
  return { classe: 'FalhaRuntime', porque, passo, remedio, origem };
}

export function interpretar(
  eventos: readonly EventoLido[],
  politica: Policy,
  origemDe: (passo: number) => Origem,
): Erro[] {
  const erros: Erro[] = [];
  const guardadas = new Map<string, Guardada>();

  for (const ev of eventos) {
    switch (ev.tipo) {
      case 'atribuir': {
        const alvo = ev.restricao ?? ev.tipoValor;
        // Grava *antes* de decidir. Numa linguagem que recusa no tipo, o
        // nome fica reservado e fica recusado — não desaparece. É o que
        // permite dizer "esta linha foi recusada" quando a linha 2 o usa, em
        // vez de "não existe nada com esse nome", que seria mentira: em Java
        // o nome existe no código, o que não existe é o valor.
        guardadas.set(ev.nome, { tipo: ev.tipoValor, recusado: false });

        if (politica.recusaNoTipo && !coerencia(alvo, ev.tipoValor)) {
          const recusada = guardadas.get(ev.nome)!;
          recusada.recusado = true;
          erros.push({
            ...E(restricao(alvo, 'o que guardas'), ev.valor),
            porque: `Um sítio de ${alvo} não guarda ${ev.tipoValor}.`,
            remedio:
              politica.quando === 'quando o dado entra'
                ? `Guarda aqui um ${alvo}. A limitação fica escrita no dado e vale para sempre.`
                : `Guarda aqui um ${alvo}, que é o que este sítio aceita.`,
            origem: origemDe(ev.passo),
          });
        }
        break;
      }

      case 'usar': {
        const guardado = guardadas.get(ev.nome);
        if (guardado === undefined) {
          erros.push(
            erroDePasso(
              ev.passo,
              `Usaste ${ev.nome} antes de a guardares. Não existe nada guardado com esse nome.`,
              `Guarda ${ev.nome} numa linha antes desta.`,
              origemDe(ev.passo),
            ),
          );
          break;
        }
        // A recusa vem antes da incompatibilidade. São coisas diferentes: uma
        // é "esta linha está errada", a outra é "este nome não serve aqui".
        // Se a incompatibilidade viesse primeiro, quem corrigisse a linha 1
        // ouviria um erro diferente do que ouviu antes, e não saberia que o
        // primeiro tinha sido resolvido.
        if (guardado.recusado) {
          erros.push(
            erroDePasso(
              ev.passo,
              `${ev.nome} foi recusado, e um valor recusado não pode ser usado.`,
              `Corrige a linha onde ${ev.nome} foi guardado.`,
              origemDe(ev.passo),
            ),
          );
          break;
        }
        // `tipoValor` a omisso é um sítio que não declara tipo: `print(total)`,
        // `x = total`. Não há o que comparar, e comparar na mesma confrontaria
        // `undefined` com o tipo guardado — que nunca são iguais, e o produto
        // passaria a recusar Python válido.
        if (ev.tipoValor !== undefined && !coerencia(ev.tipoValor, guardado.tipo)) {
          erros.push(
            erroDePasso(
              ev.passo,
              `${ev.nome} guarda ${guardado.tipo}, e este sítio precisa de ${ev.tipoValor}.`,
              `Guarda ${ev.nome} como ${ev.tipoValor}.`,
              origemDe(ev.passo),
            ),
          );
        }
        break;
      }

      case 'operar': {
        // Só se julga o que se sabe. Se um dos lados é um nome, o `usar` que
        // vem antes no mesmo passo é que sabe que tipo esse nome tinha, e
        // é dele que sai o erro. Julgar aqui seria julgar um `null` como se
        // fosse um tipo, e `null` não é um tipo que ninguém guardou.
        if (ev.a !== null && ev.b !== null && !coerencia(ev.a.tipo, ev.b.tipo)) {
          erros.push(
            erroDePasso(
              ev.passo,
              `Não se pode ${operacaoDiz(ev.operacao)} ${ev.a.tipo} com ${ev.b.tipo}.`,
              'Junta coisas do mesmo tipo.',
              origemDe(ev.passo),
            ),
          );
          break;
        }
        // A divisão por zero só precisa do divisor, e o divisor é um número
        // escrito na linha. Logo dá para dizer, mesmo que o outro lado da
        // conta seja um nome — que é o caso de `total = total / 0`, a linha
        // que a lição precisa de conseguir dizer que está errada.
        if (ev.operacao === '/' && ev.b !== null && ev.b.valor === 0) {
          erros.push(
            erroDePasso(
              ev.passo,
              'Dividir por zero não dá resultado. Não há número que seja a resposta.',
              'Confirma o divisor antes de dividir.',
              origemDe(ev.passo),
            ),
          );
        }
        break;
      }

      case 'ciclo': {
        // Três fatos, três frases. Um só "passou do limite" para os três
        // diria a quem escreveu 2.5 que o problema é a magnitude, e a lição
        // seria errada: o problema é que 2.5 não é um número de voltas.
        if (!Number.isInteger(ev.iteracoes)) {
          erros.push(
            erroDePasso(
              ev.passo,
              `Um laço corre um número inteiro de voltas, e ${ev.iteracoes} não é um número inteiro.`,
              'Mete as voltas inteiras.',
              origemDe(ev.passo),
            ),
          );
          break;
        }
        if (ev.iteracoes < 0) {
          erros.push(
            erroDePasso(
              ev.passo,
              `Um laço não corre um número negativo de voltas, e ${ev.iteracoes} é negativo.`,
              'Mete um número de voltas de 0 para cima.',
              origemDe(ev.passo),
            ),
          );
          break;
        }
        if (ev.iteracoes > MAX_ITERACOES) {
          erros.push(
            erroDePasso(
              ev.passo,
              `Um laço corre ${ev.iteracoes} vezes, e o limite são ${MAX_ITERACOES}. O laço não entra.`,
              `Mete um número de voltas entre 0 e ${MAX_ITERACOES}.`,
              origemDe(ev.passo),
            ),
          );
        }
        break;
      }

      case 'imprimir':
        // `print(5)` é legal em cinco das seis. O motor de blocos é mais
        // estrito — o bloco `dizer` só aceita texto — e essa diferença é uma
        // lição, não um defeito: quem aprendeu nos blocos escreve
        // `print('5')` e depois descobre que a linguagem também aceitava
        // `print(5)`. Julgar o texto pela regra do bloco faria o produto
        // mentir sobre a linguagem.
        break;

      case 'texto':
        // Texto cru, sem `Valor` e sem tipo. Quem o leu foi a projeção, e se
        // a aspa ficou aberta a projeção é que recusa — o núcleo não tem
        // nada para julgar aqui, e inventar um erro seria inventar sintaxe.
        break;
    }
  }

  return erros;
}

/** Interpretar já tendo lido. Atalho para as sondas e para os testes. */
export function interpretarEm(
  texto: string,
  linguagem: Language,
  ler: (t: string) => EventoLido[],
): Erro[] {
  return interpretar(ler(texto), POLITICAS[linguagem], (passo) => ({
    bloco: 'linha',
    ranhura: 0,
    passo,
  }));
}
```

- [ ] **Step 4: Correr o teste e ver passar**

Run: `npx vitest run src/nucleo/semantica.test.ts`
Expected: PASS, 26 testes.

> **A primeira versão do plano contava mal e prometia 26.** O ficheiro tem 27
> `it`, e a conta do plano nunca foi feita — foi escrita como o número que
> uma pessoa adivinha. A lição de um número adivinhado num plano é a mesma
> do código adivinhado: passa porque ninguém verifica, e no dia em que se
> verifica, o número está errado e a pessoa não sabe se o trabalho está.

- [ ] **Step 5: Correr a suite toda e o verificador de árvore**

Run: `npm test && npm run arvore`
Expected: PASS, e `núcleo limpo: N ficheiros, zero importações de projeções`.

> **E há um portão que o `arvore` não é: correr o `arvore` *depois* da última
> escrita do ficheiro de teste.** Na Task 2 o verificador reportou verde
> porque foi corrido antes de o `avaliador.test.ts` ganhar o comentário que
> documenta a tentação — e esse comentário escreve
> `import { avaliarTexto } from '../projecoes/…'`, que o verificador, a
> ler o texto cru, contava como violação. A correção está no
> `verificar-arvore.ts`: os comentários saem antes do casamento. Um portão
> verde só vale se correu *depois* da última coisa que escreveste.

- [ ] **Step 6: Commitar**

```bash
git add -A
git commit -m "feat: nucleo semantico partilhado — Policy decide quando, nunca o que

O mesmo programa avaliado com seis politicas produz seis respostas, e e
o mesmo codigo a produzi-las. Python adia a recusa para o ponto de uso;
Java recusa na atribuicao; SQL recusa e diz que a limitacao fica escrita
no dado para sempre.

Tres regras que os testes fixam e que se perdem facilmente:
  - uma operacao com tipos diferentes e sempre FalhaRuntime, mesmo em
    Java, porque um compilador nao avalia aritmetica
  - uma variavel recusada nao volta a ser utilizavel em silencio
  - nenhum erro menciona outra linguagem
"
```

---

> ### O que esta tarefa custou a achar, e o que ficou escrito no código
>
> **`erros[0].passo` não compila, e o `passo` da `Recusa` não existe.** O
> plano acessava `.passo` em três sítios sobre `Erro[]`, e `Erro` é uma união
> de três tipos em que só a `FalhaRuntime` tem `passo` — a `Recusa` e a
> `QuebraEquivalencia` não. O `tsc` apanhou-o na hora; nenhum teste via.
> Pior: onde o plano queria o passo da atribuição em Java, não havia passo
> para ler. Dar um `passo` à `Recusa` resolveria o compilador e criaria o
> mesmo fato em dois sítios, para divergirem. O passo vive em
> `origem.passo`, e é lá que vive nos três erros — o `passo` no topo da
> `FalhaRuntime` é o que a Task 1 escreveu e fica como está. **Regra
> geral: quando um campo existe num membro de uma união e não nos outros,
> o campo não pertence à união, pertence ao membro, e a pergunta a fazer é
> porque é que um o tem e os outros não.** Aqui a resposta é que `origem` já
> o tem nos três.
>
> **O `coerencia` tinha uma clause morta.** Era
> `a === b || (ehNumero(a) && ehNumero(b))`, e com um único tipo numérico a
> segunda parte está contida na primeira — `ehNumero(a) && ehNumero(b)`
> implica `a === b`. A função e o auxiliar foram-se. Não era um erro que
> fizesse o código falhar: era um código que prometia tratar de dois tipos
> numéricos que não existem, e o próximo a lê-lo ia tratar de `integer`.
>
> **`MAX_ITERACOES` passou de `avaliador.ts` para `tipos.ts`.** A Task 3
> escrevia o limite de 10000 à mão, à segunda vez que o mesmo número
> aparecia em dois ficheiros. `RANGE_INTEIROS` — o fato vizinho — já vivia
> em `tipos.ts`, e dois limites escritos à mão divergem no primeiro dia em
> que alguém muda um deles. Custo se eu tivesse deixado: a Task 6 compara
> blocos com texto e usa os dois limites; um dos dois numa constante local
> seria um número que ninguém consegue mudar sem partir o produto. O
> `avaliador.ts` e o `avaliador.test.ts` passam a importar de `./tipos`.
>
> **O `ciclo` tinha uma frase para três fatos.** O plano dizia "um ciclo
> corre 2.5 vezes, e o limite são 10000" a quem escreveu `2.5`. Isso ensina
> a coisa errada — a resposta a "então 2.5 é menos que 10000, porque foi
> recusado?" é que não há resposta. São agora três frases: não é inteiro, é
> negativo, passou do limite. É a mesma decisão que a Task 2 tomou no
> `repetir`, e pela mesma razão: são três fatos e uma frase só é uma frase
> errada para dois deles.
>
> **Um teste do plano pedia 1 erro onde o mesmo programa, no teste seguinte,
> pedia 2.** `[atribuir('total', texto, 'número'), usar('total', 'número')]`
> em Java, exigido com 1 erro num teste e com 2 noutro. Não podem ser
> verdade ao mesmo tempo, e os 2 são os certos: a recusa da linha 1, e o
> fato de a linha 2 usar um valor recusado. O segundo não é ruído — é o que
> impede um programa recusado de continuar quieto e parecer que funciona. O
> plano tinha aqui o mesmo defeito que a Task 1 teve três vezes: um teste que
> se contradiz a si próprio passa porque ninguém compara os dois.
>
> **Um teste que o plano não tinha, e que é o que impede uma lição errada:**
> uma atribuição certa ao mesmo nome **cura** o nome. A implementação
> natural — marcar `recusado` e nunca mais o desmarcar — dá "o nome ficou
> podre para sempre", e em Java isso é falso. Se o aluno corrigisse a linha
> 1 e a linha 2 continuasse a dar erro sem explicação, a lição ensinaria
> que a linguagem guarda rancor. Não guarda, e agora há um teste a dizê-lo.
>
> **`imprimir` aceita qualquer tipo, e o motor de blocos não.** O bloco
> `dizer` só aceita texto; `print(5)` é legal em cinco das seis. A
> diferença é deliberada e está escrita nos dois sítios com um teste em
> cada: quem aprendeu nos blocos escreve `print('5')` e depois descobre que
> a linguagem também aceitava `print(5)`. **Isto é uma costura que a Task 6
> vai ter de mostrar**, e a nota está aqui para que a Task 6 não a trate
> como um defeito quando a encontrar.
>
> **`case 'texto'` não julga nada, e isso é uma decisão.** O evento traz
> texto cru, sem `Valor` e sem tipo. Quem decide se a aspa fechou foi a
> projeção, e inventar aqui um erro de sintaxe seria o núcleo a fazer
> exatamente o que a spec §6.4 lhe proíbe.

---

### Task 4: A interface `Projection`, o registo, e a projecão Python

`emit` e `ler` são as duas únicas funções do sistema que conhecem sintaxe, e estão no mesmo objeto de propósito: quem escreve `total = 5` e quem lê `total = 5` é a mesma pessoa, e se divergirem a lição mente.

O `BlocoLeigo` que entra em `emit` é o da Task 2, e o seu shape é este — sem o qual nada pode ser escrito:

```typescript
interface BlocoLeigo {
  type: string;
  // `fields` é o que a pessoa escreve no bloco; `inputs` é o que se liga a
  // outros blocos. Os dois são opcionais porque um bloco pode ter só um
  // deles — e o `guardar` tem-nos aos dois.
  fields?: Record<string, { valor: unknown }>;            // ex.: { nome: { valor: 'total' } }
  inputs?: Record<string, { valor: unknown } | { stack: BlocoLeigo[] }>;
}
```

> **A distinção entre `fields` e `inputs` é o que separa um nome de um
> valor, e o plano emendava os dois.** O código desta tarefa lia o nome de um
> `guardar` de `inputs.NOME` — que não existe — e emitia `undefined = 5` para
> o bloco mais básico do produto. Nenhum teste apanhava, porque o teste
> verificava o *tipo* e não o texto, que é o que o aluno lê. O esboço acima é
> a correcção: o nome do bloco vive em `fields.nome.valor` em `dados.ts`, no
> Blockly da Task 9 e no YAML da Task 7 — a mesma forma nos três sítios, sem
> exceção.

Blocos do primeiro conceito: `guardar`, `repetir`, `dizer`, `log`, `pilha`. **`dizer` é o que escreve no ecrã** (`print`) e **`log` emite `log(...)`**, uma função que ainda não existe — é o passo que mostra a Python a falhar a correr. Não existe bloco `media`, e não há `vazio`: um bloco que não produz nada é `vazio` no YAML e não chega ao `emit`.

**Files:**
- Create: `src/projecoes/tipos.ts`, `src/projecoes/registo.ts`, `src/projecoes/python.ts`
- Test: `src/projecoes/python.test.ts`, `src/projecoes/registo.test.ts`

**Interfaces:**
- Consumes: Task 1 — `Language`, `Tipo`, `Valor`, `Erro`, `restricao`, `MAX_ITERACOES`; Task 2 — `BlocoLeigo`, `identificador`, `pilhaDe`; Task 3 — `POLITICAS`, `EventoLido`, `AMOSTRA`.
- Produces: `Familia`, `Projection`, `Gerado`, `Anotacao`, `LerResultado`, `REGISTO`, `obter(linguagem)`, `temProjecao(linguagem)`, `LINGUAGENS_COM_PROJECAO`, `python`, `BLOCOS_IMPERATIVOS`.

- [ ] **Step 1: Escrever o teste falhado — a projecão Python**

`src/projecoes/python.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { python } from './python';
import { interpretar } from '../nucleo/semantica';
import type { Erro } from '../nucleo/tipos';
import { dizer, guardar, guardarTexto, log, pilha, repetir } from '../nucleo/testes/dados';

/** O que `emit` aceita. `ReturnType<typeof python.emit>` seria o `Gerado` que
 *  ele devolve — e o que se quer escrever aqui é o bloco que se lhe dá. */
type Programa = Parameters<typeof python.emit>[0];

/** Ler e depois julgar — o que a Task 6 chama `avaliarTexto`, feito à mão
 *  porque o atalho ainda não existe. */
function avaliar(texto: string): Erro[] {
  const lido = python.ler(texto);
  return lido.erros.length > 0
    ? lido.erros
    : interpretar(lido.eventos, python.policy, (p) => ({ bloco: 'texto', ranhura: 0, passo: p }));
}

function linhasDe(texto: string): string[] {
  return texto.replace(/\n$/, '').split('\n');
}

describe('emit: teste dourado', () => {
  it('guardar número produz uma atribuição simples', () => {
    expect(python.emit(pilha(guardar('total', 5))).texto).toBe('total = 5\n');
  });

  it('o texto() do robô obriga a texto: mesmo um 5 sai entre aspas', () => {
    // Este é o ponto do produto, e é fácil tê-lo errado. A palavra que o
    // robô entrega é uma palavra, mesmo que a pessoa tenha escrito um
    // número. Por isso `guardarTexto('total', 5)` produz `total = '5'` e
    // não `total = 5` — e é essa diferença que torna a conversa sobre
    // tipos necessária em vez de decorativa.
    expect(python.emit(pilha(guardarTexto('total', 5))).texto).toBe("total = '5'\n");
  });

  it('e guardar texto dentro de texto() não duplica a conversão', () => {
    expect(python.emit(pilha(guardarTexto('total', 'olá'))).texto).toBe("total = 'olá'\n");
  });

  it('o mesmo 5 pelo caminho do número sai número — e as duas linhas diferem', () => {
    const comoNumero = python.emit(pilha(guardar('total', 5))).texto;
    const comoPalavra = python.emit(pilha(guardarTexto('total', 5))).texto;
    expect([comoNumero, comoPalavra]).toEqual(['total = 5\n', "total = '5'\n"]);
  });

  it('o nome de um guardar está nos fields, e não nos inputs', () => {
    // O `BlocoLeigo` separa o que a pessoa escreve no bloco (fields) do que
    // se liga a outros blocos (inputs). O plano lia o nome de `inputs.NOME`,
    // que não existe, e emitia `undefined = 5` para o bloco mais básico do
    // produto. A forma do bloco é a mesma em `dados.ts`, no Blockly e no
    // YAML; o que se lê é um sítio, e o sítio é o `fields`.
    const b = guardar('total', 5);
    expect(b.fields?.nome?.valor).toBe('total');
    expect(b.inputs?.['NOME']).toBeUndefined();
  });

  it('dizer produz print', () => {
    expect(python.emit(pilha(dizer({ txt: 'olá' }))).texto).toBe("print('olá')\n");
  });

  it('dizer de um número escreve o número como está, sem aspas', () => {
    // O motor de blocos recusa `dizer(5)` — o bloco `dizer` só aceita
    // texto. O `emit` é uma função total sobre `BlocoLeigo` e escreve o
    // número na mesma, e isso é deliberado: `print(5)` é Python válido, e um
    // emissor que se recusasse a escrever isto teria de inventar um erro
    // para o mesmo-programa consoante o caminho.
    expect(python.emit(pilha(dizer(5))).texto).toBe('print(5)\n');
  });

  it('log de uma referência produz o nome da variável', () => {
    expect(python.emit(pilha(log({ ref: 'total' }))).texto).toBe('log(total)\n');
  });

  it('repetir produz for com range e indentação de 4 espaços', () => {
    expect(python.emit(pilha(repetir(3, [guardar('x', 1)]))).texto).toBe(
      'for _ in range(3):\n    x = 1\n',
    );
  });

  it('repetir aninhado aumenta a indentação', () => {
    expect(python.emit(pilha(repetir(2, [repetir(2, [guardar('x', 1)])]))).texto).toBe(
      'for _ in range(2):\n    for _ in range(2):\n        x = 1\n',
    );
  });

  it('repetir sem corpo emite um pass, porque um for vazio não é Python', () => {
    // Verificado contra o Python: `for _ in range(3):` sozinho é
    // `expected an indented block after 'for' statement`, e um corpo feito
    // só de um comentário dá o mesmo erro. O único corpo válido que não
    // diz nada é `pass`. Emitir o `for` sozinho era emitir Python que não
    // corre, e o produto existe para nunca mostrar ao aluno uma linha que
    // está errada sem dizer que está errada.
    const g = python.emit(pilha(repetir(3, [])));
    expect(g.texto).toBe('for _ in range(3):\n    pass\n');
    expect(() => new Function('x', '')).not.toThrow();
  });

  it('uma pilha gera todas as linhas por ordem', () => {
    expect(python.emit(pilha(guardar('total', 5), log({ ref: 'total' }))).texto).toBe(
      'total = 5\nlog(total)\n',
    );
  });

  it('normaliza um nome com acentos para identificador Python', () => {
    expect(python.emit(pilha(guardar('música', 1))).texto).toBe('musica = 1\n');
  });

  it('fuga aspas simples no texto com barra', () => {
    expect(python.emit(pilha(dizer({ txt: "it's" }))).texto).toBe("print('it\\'s')\n");
  });

  it('programa vazio gera string vazia e zero anotações', () => {
    const g = python.emit(null);
    expect(g.texto).toBe('');
    expect(g.anotacoes).toEqual([]);
  });

  it('toda linha gerada tem anotação, com o número de linha certo', () => {
    const g = python.emit(pilha(repetir(2, [guardar('x', 1), log({ ref: 'x' })]), dizer({ txt: 'olá' })));
    // Quatro linhas: o `for`, o `guardar` do corpo, o `log` do corpo, o
    // `dizer`. A primeira versão deste teste dizia seis, porque contava o
    // `for` duas vezes — uma por volta. Um `repetir(2)` escreve o `for` uma
    // vez e o corpo uma vez; quem lê o texto sabe disto, e quem escreve o
    // número sem contar erra o mesmo que o `Anotacao.tipo` do plano.
    expect(linhasDe(g.texto)).toEqual([
      'for _ in range(2):',
      '    x = 1',
      '    log(x)',
      "print('olá')",
    ]);
    expect(g.anotacoes).toHaveLength(4);
    for (let i = 0; i < g.anotacoes.length; i += 1) {
      expect(g.anotacoes[i]!.linha).toBe(i + 1);
      expect(g.anotacoes[i]!.porque.length).toBeGreaterThan(0);
    }
  });

  it('o for também é anotado, e a anotação do corpo conta a partir dele', () => {
    // O plano emitia a linha do `for` direto para a lista, sem anotação, e o
    // emissor aninhado contava as suas linhas a partir de 1. O resultado
    // eram anotações que apontavam para a linha errada — a do `x = 1` dizia
    // linha 1, e a linha 1 é o `for`. O `porque` de cada linha é o que o
    // aluno lê ao lado do código, e uma anotação na linha errada é pior do
    // que nenhuma: ensina a explicação errada com a confiança certa.
    const g = python.emit(pilha(repetir(2, [guardar('x', 1), log({ ref: 'x' })]), dizer({ txt: 'olá' })));
    const porLinha = new Map(g.anotacoes.map((a) => [a.linha, a.porque]));
    expect(g.anotacoes.every((a) => a.porque.length > 0)).toBe(true);
    expect(porLinha.get(1)).toContain('2 vezes');
    expect(porLinha.get(2)).toContain('Guarda x');
    expect(porLinha.get(3)).toContain('log');
    expect(porLinha.get(4)).toContain('Mostra');
  });

  it('nenhuma anotação menciona outra linguagem', () => {
    const g = python.emit(pilha(guardar('total', 5), log({ ref: 'total' }), dizer({ txt: 'olá' })));
    for (const a of g.anotacoes) {
      expect(a.porque).not.toMatch(/Java|Go|TypeScript|SQL|JavaScript/);
    }
  });

  it('nenhuma anotação afirma um tipo que não sabe', () => {
    // O `Anotacao` do plano tinha um `tipo: Tipo`, e o `emit` preenchia-o
    // com `número` sempre que a entrada era uma referência — porque não há
    // outro tipo para pôr. `log(total)` passava a ser uma linha sobre um
    // número, e o `Tipo` foi-se do interface: um campo que uma em cada
    // cinco linhas não consegue preencher honestamente é um campo que vai
    // ser preenchido a mentir, e o ecrã vai mostrar a mentira.
    const g = python.emit(pilha(log({ ref: 'total' })));
    expect(JSON.stringify(g.anotacoes)).not.toMatch(/"tipo"/);
  });

  it('um bloco desconhecido gera um comentário, nunca uma linha de código inválida', () => {
    const g = python.emit({ type: 'condicao', inputs: { VALOR: { valor: 1 } } });
    expect(g.texto).toBe('# bloco do v2: condicao\n');
  });
});

describe('emit: o texto gerado é Python que corre', () => {
  /** Os catorze programas que esta tarefa produz. Todos compilam no Python
   *  3.14 — verificado à mão, um a um, e o resultado anotado no plano.
   *
   *  O que fica em teste é a *forma* do texto, e não a sua validade: um
   *  teste que precisa de um interpretador externo não corre em todo o lado,
   *  e um teste que nem sempre corre deixa de ser um teste no dia em que o
   *  ambiente muda. A forma apanha o que-interesta — um bloco sem corpo, uma
   *  indentação errada, um sinal de outra linguagem — e é o que se despistou
   *  sozinho. */
  const PROGRAMAS: Programa[] = [
    pilha(guardar('total', 5)),
    pilha(guardarTexto('total', 5)),
    pilha(guardar('pronto', true)),
    pilha(dizer({ txt: 'olá' })),
    pilha(dizer(5)),
    pilha(log({ ref: 'total' })),
    pilha(repetir(3, [guardar('x', 1)])),
    pilha(repetir(3, [])),
    pilha(repetir(2, [repetir(2, [guardar('x', 1)])])),
    pilha(repetir(2, [guardar('x', 1), log({ ref: 'x' })]), dizer({ txt: 'olá' })),
    pilha(dizer({ txt: "it's" })),
    pilha(guardar('música', 1)),
    { type: 'condicao', inputs: { VALOR: { valor: 1 } } },
    null,
  ];

  it('nenhuma linha que abre um bloco fica sem corpo', () => {
    // A regra estrutural que o Python exige: uma linha acabada em `:` tem de
    // ser seguida por uma linha mais indentada. Emitir um `for` sozinho era
    // mostrar ao aluno uma linha que não corre, e o produto existe para nunca
    // mostrar uma linha errada sem dizer que está errada.
    for (const programa of PROGRAMAS) {
      const l = linhasDe(python.emit(programa).texto);
      for (let i = 0; i < l.length; i += 1) {
        if (!l[i]!.trimEnd().endsWith(':')) continue;
        const recuo = l[i]!.length - l[i]!.trimStart().length;
        const seguinte = l[i + 1];
        expect(seguinte, `linha ${i + 1} abre um bloco sem corpo`).toBeDefined();
        expect(seguinte!.length - seguinte!.trimStart().length).toBeGreaterThan(recuo);
      }
    }
  });

  it('nenhum programa gerado traz um sinal de outra linguagem', () => {
    // O `;`, o `{` e as palavras de Java e de JavaScript são as marcas que a
    // pessoa traz de outra linguagem. A projeção recusa-as ao ler, e o `emit`
    // nunca as escreve — as duas metades da mesma frase.
    for (const programa of PROGRAMAS) {
      const t = python.emit(programa).texto;
      expect(t, t).not.toMatch(/[;{}]/);
      expect(t, t).not.toMatch(/^\s*(function|const|let|var|public|class)\b/m);
    }
  });

  it('e a indentação é sempre múltipla de quatro', () => {
    for (const programa of PROGRAMAS) {
      for (const linha of linhasDe(python.emit(programa).texto)) {
        const recuo = linha.length - linha.trimStart().length;
        expect(recuo % 4, linha).toBe(0);
      }
    }
  });
});

describe('ler: o que o Python aceita', () => {
  it('atribuição de número', () => {
    const r = python.ler('total = 5\n');
    expect(r.erros).toEqual([]);
    expect(r.eventos).toHaveLength(1);
  });

  it('atribuição de texto com aspas simples', () => {
    expect(python.ler("nome = 'olá'\n").erros).toEqual([]);
  });

  it('aspas duplas também são Python, e o produto não pode dizer que não', () => {
    // Verificado contra o Python: `x = "ola"` compila. Recusar uma linha
    // válida é o pior erro que um produto de ensino pode cometer, porque o
    // aluno conclui que o produto está errado — e a lição passa a ser
    // "não confies no que o ecrã diz". A casa continua a ser aspas simples;
    // o que muda é o que se aceita.
    expect(python.ler('nome = "olá"\n').erros).toEqual([]);
  });

  it('um número com casas decimais é um número', () => {
    expect(python.ler('preco = 1.5\n').erros).toEqual([]);
    const ev = python.ler('preco = 1.5\n').eventos[0]!;
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('número');
    expect(ev.valor.valor).toBe(1.5);
  });

  it('lógica, e True é o que o Python escreve', () => {
    expect(python.ler('pronto = True\n').erros).toEqual([]);
    expect(python.ler('pronto = False\n').erros).toEqual([]);
  });

  it('print conta como evento sem erro', () => {
    expect(python.ler('print(total)\n').erros).toEqual([]);
  });

  it('print de uma variável não é um erro, porque Python não impõe tipo ao print', () => {
    // O plano emitia `usar` com `tipoValor: 'texto'` para o que está dentro
    // do `print`, e o núcleo respondia "total guarda número, e este sítio
    // precisa de texto". O Python não diz nada disso. Um `usar` sem
    // `tipoValor` é um sítio que não declara tipo — que é o que o `print` é.
    expect(avaliar('total = 5\nprint(total)\n')).toEqual([]);
  });

  it('uma cópia também não impõe tipo: x = total', () => {
    expect(avaliar('total = 5\nx = total\n')).toEqual([]);
  });

  it('linhas em branco, espaços e comentários são ignorados', () => {
    expect(python.ler('  total = 5  \n\n# um comentário\n').erros).toEqual([]);
  });

  it('texto vazio não é erro', () => {
    expect(python.ler('').erros).toEqual([]);
    expect(python.ler('\n\n').erros).toEqual([]);
  });
});

describe('ler: o que o Python recusa', () => {
  it('um ponto-e-vírgula no fim da linha não é Python', () => {
    const r = python.ler('total = 5;\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('Python');
    expect(r.erros[0]!.porque).toContain(';');
  });

  it('um ponto-e-vírgula dentro de um texto é perfeitamente válido', () => {
    // Verificado contra o Python: `x = 'a;b'` compila. O plano procurava o
    // `;` na linha toda e recusava antes de tentar ler, por isso contava um
    // sinal dentro de uma palavra como se fosse o vício do Java. A regra
    // passou a ser: primeiro tenta ler; só se não conseguir, e se a linha
    // acabar em `;`, é que o `;` é o culpado.
    expect(python.ler("x = 'a;b'\n").erros).toEqual([]);
  });

  it('o erro de sintaxe tem porque e remedio, nunca um código nu', () => {
    const r = python.ler('isto não é código\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.classe).toBe('FalhaRuntime');
    expect(r.erros[0]!.porque.length).toBeGreaterThan(10);
    expect(r.erros[0]!.remedio.length).toBeGreaterThan(0);
  });

  it('o passo do erro é a linha certa', () => {
    const r = python.ler('total = 5\nx = 1;\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.origem.passo).toBe(2);
  });

  it('dois sinais de igual são comparação, e o erro diz isso', () => {
    // A regra do plano casava `x == 1` como atribuição e dizia "Python não
    // sabe o que fazer com "= 1"". É verdade e não ajuda nada: o aluno
    // escreveu o sinal certo para comparar e o errado para atribuir, e é
    // exatamente isso que a mensagem tem de dizer.
    const r = python.ler('total == 5\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('==');
    expect(r.erros[0]!.remedio).toContain('=');
  });

  it('log é uma função que ainda não existe, e o erro diz isso', () => {
    // O bloco `log` emite `log(...)` de propósito. Em Python isso rebenta a
    // correr, e o recusa-ao-usar de Java recusa antes. A lição está no
    // quando, e o `porque` tem de dizer a verdade sobre o Python.
    const r = python.ler('log(total)\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('log');
    expect(r.erros[0]!.porque).toContain('Python');
    expect(r.erros[0]!.porque).toMatch(/não existe|não está definida/);
  });
});

describe('ler: a política do Python', () => {
  it("total = 'olá' passa — quem recusa é o uso", () => {
    expect(python.ler("total = 'olá'\n").erros).toEqual([]);
  });

  it('a leitura diz que o valor guardado é texto', () => {
    const ev = python.ler("total = 'olá'\n").eventos[0]!;
    expect(ev.tipo).toBe('atribuir');
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('texto');
    expect(ev.valor.valor).toBe('olá');
  });

  it('atribuir sem ponto-e-vírgula é o caminho feliz, e a semicolon é o teste', () => {
    expect(python.ler('total = 5\n').erros).toHaveLength(0);
    expect(python.ler('int total = 5\n').erros).toHaveLength(1);
  });
});

describe('ler: expressões', () => {
  it('total = total + 1 produz um uso e uma operação, e nenhum erro', () => {
    const r = python.ler('total = 5\ntotal = total + 1\n');
    expect(r.erros).toEqual([]);
    expect(r.eventos.map((e) => e.tipo)).toEqual(['atribuir', 'usar', 'operar']);
  });

  it('o uso vem antes da operação, que é o que faz o erro cair no sítio certo', () => {
    const r = python.ler('total = total + 1\n');
    expect(r.eventos[0]!.tipo).toBe('usar');
  });

  it('somar texto a número é erro de execução, e é em Python também', () => {
    const erros = avaliar("total = 'olá'\ntotal = total + 1\n");
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('texto');
  });

  it('as quatro operações entram', () => {
    for (const op of ['+', '-', '*', '/']) {
      expect(python.ler(`total = total ${op} 1\n`).erros).toEqual([]);
    }
  });

  it('dividir por zero é o que a conta dá, e quem diz é o núcleo', () => {
    const erros = avaliar('total = 8\ntotal = total / 0\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('zero');
  });

  it('uma conta de três termos não é adivinhada: ou se lê, ou se diz que não se lê', () => {
    // `1 - 2 - 3` casa a expressão como `1 - (2 - 3)`, e o termo da direita
    // não é um número nem um texto. O plano transformava-o num `0` sem
    // dizer nada, e o aluno lia `a = 1 - 0` como se fosse o que escreveu. Um
    // limite declarado é ensino; um limite escondido é mentira.
    const r = python.ler('a = 1 - 2 - 3\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('2 - 3');
    expect(r.erros[0]!.remedio).toContain('número');
  });
});

describe('ler: o for', () => {
  it('conta as voltas', () => {
    const r = python.ler('for _ in range(3):\n    total = total + 1\n');
    expect(r.erros).toEqual([]);
    const c = r.eventos.find((e) => e.tipo === 'ciclo');
    if (!c || c.tipo !== 'ciclo') throw new Error('esperava um ciclo');
    expect(c.iteracoes).toBe(3);
  });

  it('a indentação não é lida como erro: o `ler` lê linha a linha', () => {
    expect(python.ler('    total = 5\n').erros).toEqual([]);
  });

  it('o for de duas voltas também', () => {
    const c = python.ler('for _ in range(2):\n    x = 1\n').eventos[0]!;
    if (c.tipo !== 'ciclo') throw new Error('esperava um ciclo');
    expect(c.iteracoes).toBe(2);
  });

  it('range com mais de 10000 voltas é recusado pelo núcleo, não pelo leitor', () => {
    const erros = avaliar('for _ in range(10001):\n    x = 1\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('10000');
  });
});

describe('ler: os erros são sempre FalhaRuntime, e isso está no tipo', () => {
  it('o tipo de LerResultado.errors é FalhaRuntime[], não Erro[]', () => {
    // Se `erros` fosse `Erro[]`, `r.erros[0].passo` não compilaria — e o
    // plano acessava-o em três sítios, sobre uma união em que só a
    // `FalhaRuntime` tem `passo`. Declarar o tipo narrowed não é um truque
    // para o compilador calar-se: é a afirmação de que um erro de leitura é
    // sempre uma falha a correr, e que a projeção não produz recusas de
    // tipo — quem recusa o tipo é o núcleo.
    const r: { erros: Array<{ classe: 'FalhaRuntime'; passo: number }> } = python.ler('isto não é\n');
    expect(r.erros[0]!.classe).toBe('FalhaRuntime');
    expect(r.erros[0]!.passo).toBe(1);
  });

  it('nenhum erro de leitura diz que o tipo está errado', () => {
    for (const linha of ['int total = 5', 'log(total)', 'total == 5', "x = 'a;b';"]) {
      for (const e of python.ler(linha + '\n').erros) {
        expect(e.classe).toBe('FalhaRuntime');
      }
    }
  });
});

describe('a projeção e a sua política', () => {
  it('a política é a de Python, e vem do núcleo', () => {
    expect(python.policy).toEqual({ recusaNoTipo: false, quando: 'ao usar' });
  });

  it('emit e ler são o mesmo objeto, e é para isso que serve', () => {
    // Escrever `total = 5` e ler `total = 5` é a mesma pessoa. Se `emit` e
    // `ler` fossem dois objectos separados, cada um com as suas ideias
    // sobre o que é Python, a lição ensinaria duas linguagens diferentes
    // com o mesmo nome.
    const escrito = python.emit(pilha(guardar('total', 5))).texto;
    const lido = python.ler(escrito);
    expect(lido.erros).toEqual([]);
    const ev = lido.eventos[0]!;
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.nome).toBe('total');
    expect(ev.tipoValor).toBe('número');
  });

  it('ida e volta de cada bloco da lição, sem erros de leitura', () => {
    const programas: Array<[string, Programa]> = [
      ['guardar número', pilha(guardar('total', 5))],
      ['guardar texto', pilha(guardar('nome', { txt: 'olá' }))],
      ['dizer', pilha(dizer({ txt: 'olá' }))],
      ['log', pilha(log({ ref: 'total' }))],
      ['repetir', pilha(repetir(3, [guardar('x', 1)]))],
    ];
    for (const [nome, programa] of programas) {
      const g = python.emit(programa);
      const r = python.ler(g.texto);
      // O `log` é a única linha que o Python recusa, e é recusada de
      // propósito: é o bloco que mostra a diferença entre "recusa antes" e
      // "recusa quando corre". Qualquer outra linha que o `ler` não consiga
      // ler é o `emit` a escrever Python que não é Python.
      if (nome === 'log') {
        expect(r.erros, nome).toHaveLength(1);
      } else {
        expect(r.erros, nome).toEqual([]);
      }
    }
  });
});
```

- [ ] **Step 2: Escrever o teste falhado — o registo**

`src/projecoes/registo.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { LINGUAGENS_COM_PROJECAO, obter, temProjecao } from './registo';
import { BLOCOS_IMPERATIVOS } from './python';

describe('o registo', () => {
  it('tem Python, e só Python por enquanto', () => {
    expect(LINGUAGENS_COM_PROJECAO).toEqual(['python']);
  });

  it('obter devolve a projecão pedida', () => {
    expect(obter('python').linguagem).toBe('python');
  });

  it('obter uma linguagem sem projecão diz qual falta, e não devolve indefinido', () => {
    expect(() => obter('java')).toThrow(/java/);
    expect(temProjecao('java')).toBe(false);
  });

  it('a exceção nomeia a linguagem em minúsculas, como a usar em código', () => {
    let mensagem = '';
    try {
      obter('sql');
    } catch (e) {
      mensagem = (e as Error).message;
    }
    expect(mensagem).toContain('sql');
  });

  it('a exceção diz o que está disponível, e não só o que falta', () => {
    // Um erro que só diz "não há" obriga quem o lê a ir procurar a lista.
    // Um erro que diz "não há java; há python" diz também o próximo passo.
    expect(() => obter('go')).toThrow(/python/);
  });

  it('a família de Python é imperativa', () => {
    expect(obter('python').familia).toBe('imperativa');
  });

  it('o vocabulário de blocos é o da spec: guardar, repetir, dizer, log', () => {
    expect(BLOCOS_IMPERATIVOS).toEqual(['guardar', 'repetir', 'dizer', 'log']);
  });

  it('a projeção declara o mesmo vocabulário que exporta', () => {
    expect(obter('python').blocos).toEqual(BLOCOS_IMPERATIVOS);
  });

  it('temProjecao é falso para as cinco que faltam, e verdadeiro para a uma que há', () => {
    const comProjecao = LINGUAGENS_COM_PROJECAO;
    expect(comProjecao).toHaveLength(1);
    expect(temProjecao('python')).toBe(true);
    for (const l of ['go', 'java', 'javascript', 'sql', 'typescript'] as const) {
      expect(temProjecao(l), l).toBe(false);
    }
  });
});
```

- [ ] **Step 3: Correr os testes e ver falhar**

Run: `npx vitest run src/projecoes`
Expected: FAIL com erro de resolução de `./python` e `./registo`.

- [ ] **Step 4: Escrever `src/projecoes/tipos.ts`**

```typescript
import type { BlocoLeigo } from '../nucleo/blocos';
import type { EventoLido, Policy } from '../nucleo/semantica';
import type { FalhaRuntime, Language } from '../nucleo/tipos';

export type Familia = 'imperativa' | 'declarativa';

export interface Anotacao {
  linha: number;
  /** Porque é que esta linha existe, nos termos desta linguagem. Nunca
   *  menciona outra linguagem — a spec §0 removeu as referências cruzadas.
   *
   *  Não há um `tipo` aqui, e a ausência é uma decisão. A anotação é lida ao
   *  lado de uma linha gerada, e o tipo dessa linha nem sempre é conhecido:
   *  `log(total)` fala de uma variável cujo tipo só existe quando o programa
   *  corre. Um campo que uma em cada cinco linhas não consegue preencher
   *  honestamente acaba preenchido a mentir, e o ecrã mostra a mentira com
   *  a mesma confiança com que mostra o `porque`. O `Tipo` de uma linha
   *  gerada, quando for preciso, lê-se do `EventoLido` do caminho do
   *  `ler` — que é onde o tipo é um fato e não uma previsão. */
  porque: string;
}

export interface Gerado {
  texto: string;
  anotacoes: Anotacao[];
}

export interface LerResultado {
  eventos: EventoLido[];
  /** Erros de leitura: texto que não é desta linguagem.
   *
   *  O tipo é `FalhaRuntime[]` e não `Erro[]` por uma razão que vale mais do
   *  que o compilador: uma falha de leitura é sempre uma falha a correr,
   *  nunca uma recusa de tipo. Quem recusa o tipo é o núcleo, e um `ler` que
   *  devolvesse uma `Recusa` estaria a decidir uma coisa que não é sua — e a
   *  dizer ao aluno que Java recusa antes de correr e Python não, quando a
   *  diferença entre as duas está na `Policy` e em mais lado nenhum. */
  erros: FalhaRuntime[];
}

export interface Projection {
  linguagem: Language;
  familia: Familia;
  policy: Policy;
  /** Vocabulário de blocos desta linguagem. As cinco imperativas declaram o
   *  mesmo conjunto; o SQL declara o seu. */
  blocos: string[];
  /** Blocos → texto. Aceita `null` porque um programa vazio é um programa,
   *  e `pilhaDe(null)` é a forma de dizer isso sem inventar um bloco. */
  emit(programa: BlocoLeigo | null): Gerado;
  /** Texto desta linguagem → fatos tipados. */
  ler(texto: string): LerResultado;
}
```

- [ ] **Step 5: Escrever `src/projecoes/registo.ts`**

```typescript
import type { Language } from '../nucleo/tipos';
import { python } from './python';
import type { Projection } from './tipos';

export const REGISTO: Partial<Record<Language, Projection>> = {
  python,
};

export const LINGUAGENS_COM_PROJECAO: Language[] = Object.keys(REGISTO) as Language[];

export function temProjecao(linguagem: Language): boolean {
  return REGISTO[linguagem] !== undefined;
}

export function obter(linguagem: Language): Projection {
  const p = REGISTO[linguagem];
  if (p === undefined) {
    // A mensagem nomeia a linguagem em minúsculas, como se escreve em
    // código, e diz também o que existe. Um erro que só diz o que falta
    // obriga quem o lê a ir procurar a lista; um erro que diz a lista
    // transforma-se no próximo passo.
    throw new Error(
      `A projecao para ${linguagem} ainda nao foi construida. ` +
        `As linguagens com projecao sao: ${LINGUAGENS_COM_PROJECAO.join(', ')}.`,
    );
  }
  return p;
}
```

- [ ] **Step 6: Escrever `src/projecoes/python.ts`**

```typescript
import type { BlocoLeigo } from '../nucleo/blocos';
import { identificador } from '../nucleo/blocos';
import { pilhaDe } from '../nucleo/avaliador';
import { AMOSTRA, POLITICAS } from '../nucleo/semantica';
import type { EventoLido } from '../nucleo/semantica';
import { val } from '../nucleo/tipos';
import type { FalhaRuntime, Valor } from '../nucleo/tipos';
import type { Anotacao, Gerado, LerResultado, Projection } from './tipos';

export const BLOCOS_IMPERATIVOS = ['guardar', 'repetir', 'dizer', 'log'];

// ---------------------------------------------------------------------------
// Escrever: blocos → Python
// ---------------------------------------------------------------------------

function entradaDe(b: BlocoLeigo, chave: string): unknown {
  const i = b.inputs?.[chave];
  return i && 'valor' in i ? i.valor : undefined;
}

/** O nome de um `guardar` está nos `fields`, não nos `inputs`.
 *
 *  O `BlocoLeigo` separa o que a pessoa escreve no bloco do que se liga a
 *  outros blocos, e o nome de uma variável é a primeira coisa. Ler o nome de
 *  `inputs.NOME` — que não existe — produz `undefined = 5` para o bloco mais
 *  básico do produto, e esse é o tipo de bug que só aparece quando se vê o
 *  texto gerado, nunca num teste que só verifique tipos. */
function campoDe(b: BlocoLeigo, chave: string): unknown {
  return b.fields?.[chave]?.valor;
}

/** O corpo de um `repetir`, e não `pilhaDe(b)`.
 *
 *  `pilhaDe` abre uma pilha e, se não for uma pilha, devolve o próprio bloco
 *  — que é o que se quer no topo e é uma recursão infinita no corpo de um
 *  laço. O corpo vive em `inputs.CORPO.stack`, e confundir os dois `CORPO`
 *  — o da pilha e o do laço — produz `for _ in range(3):` repetido até a
 *  pilha estourar. */
function corpoDe(b: BlocoLeigo): BlocoLeigo[] {
  return b.inputs?.CORPO?.stack ?? [];
}

function fugar(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function literal(entrada: unknown): string {
  if (typeof entrada === 'number') return String(entrada);
  if (typeof entrada === 'boolean') return entrada ? 'True' : 'False';
  if (entrada !== null && typeof entrada === 'object' && 'ref' in entrada) {
    return String((entrada as { ref: unknown }).ref);
  }
  if (entrada !== null && typeof entrada === 'object' && 'txt' in entrada) {
    return `'${fugar(String((entrada as { txt: unknown }).txt))}'`;
  }
  return `'${fugar(String(entrada))}'`;
}

/** Acumula linhas e anotações, sabendo em que linha do programa está.
 *
 *  O `base` é o número de linhas que o pai já emitiu. Sem ele, o emissor de
 *  um corpo de laço contaria a partir de 1 e a anotação do `x = 1` diria
 *  "linha 1" — sendo que a linha 1 é o `for`. Uma anotação que aponta para
 *  a linha errada é pior do que nenhuma: o aluno lê a explicação ao lado
 *  da linha errada e aprende a explicação errada. */
class Emissor {
  readonly linhas: string[] = [];
  readonly anotacoes: Anotacao[] = [];

  constructor(
    private nivel = 0,
    private base = 0,
  ) {}

  recuo(): string {
    return '    '.repeat(this.nivel);
  }

  linha(texto: string, porque: string): void {
    this.linhas.push(this.recuo() + texto);
    this.anotacoes.push({ linha: this.base + this.linhas.length, porque });
  }

  /** As linhas do `for` já contadas: o corpo começa a seguir. */
  entrar(): Emissor {
    return new Emissor(this.nivel + 1, this.base + this.linhas.length);
  }
}

function emitir(b: BlocoLeigo, e: Emissor): void {
  switch (b.type) {
    case 'pilha':
      for (const filho of pilhaDe(b)) emitir(filho, e);
      return;

    case 'guardar': {
      const nome = identificador(String(campoDe(b, 'nome')));
      e.linha(`${nome} = ${literal(entradaDe(b, 'VALOR'))}`, `Guarda ${nome} para o usar mais tarde.`);
      return;
    }

    case 'dizer': {
      e.linha(`print(${literal(entradaDe(b, 'VALOR'))})`, 'Mostra o valor no ecrã.');
      return;
    }

    case 'log': {
      e.linha(
        `log(${literal(entradaDe(b, 'VALOR'))})`,
        'Chama `log`, uma função que ainda não escreveste. Em Python isto só falha quando o código corre.',
      );
      return;
    }

    case 'repetir': {
      const vezes = String(entradaDe(b, 'PASSOS'));
      e.linha(`for _ in range(${vezes}):`, `Repete o que está indentado ${vezes} vezes.`);
      const dentro = e.entrar();
      const corpo = corpoDe(b);
      if (corpo.length === 0) {
        // Um `for` sem corpo não é Python. Verificado: `for _ in range(3):`
        // sozinho dá `expected an indented block`, e um corpo de um só
        // comentário dá o mesmo erro. A única coisa que diz "nada" e é
        // Python é `pass`. Emitir o `for` sozinho era mostrar ao aluno uma
        // linha que não corre, e o produto existe para nunca mostrar uma
        // linha errada sem dizer que está errada.
        dentro.linha('pass', 'Não há nada dentro do laço, e um laço vazio não é Python.');
      } else {
        for (const filho of corpo) emitir(filho, dentro);
      }
      e.linhas.push(...dentro.linhas);
      e.anotacoes.push(...dentro.anotacoes);
      return;
    }

    default:
      e.linha(`# bloco do v2: ${b.type}`, 'Este bloco ainda não está nesta lição.');
  }
}

// ---------------------------------------------------------------------------
// Ler: Python → fatos
// ---------------------------------------------------------------------------

const ATRIBUIR = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/;
const IMPRIMIR = /^print\(\s*(.+?)\s*\)$/;
const CICLO = /^for\s+_\s+in\s+range\(\s*(\d+)\s*\)\s*:$/;
// Um inteiro, ou um inteiro com casas decimais. `x = 1.5` é Python e
// compila; recusá-lo é dizer ao aluno que está a escrever uma coisa que não
// é Python, e ele acredita.
const NUMERO = /^[-+]?\d+(\.\d+)?$/;
// Texto entre aspas simples **ou duplas** — e nada mais. A casa é a das
// simples; o que se aceita são as duas. Recusar `x = "olá"` seria ensinar o
// aluno a desconfiar do produto, que é o pior que um professor de sintaxe
// pode fazer. E a barra-crua ficou de fora *de propósito*: verifyi contra o
// Python que `x = \`olá\`` é erro de sintaxe, e aceitar aqui seria trocar um
// erro que o aluno cometia por um que o produto inventava.
const TEXTO = /^(['"])([\s\S]*?)\1$/;
const NOME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const EXPRESSAO = /^(.+?)\s*([+\-*/])\s*(.+)$/;

function erro(passo: number, porque: string, remedio: string): FalhaRuntime {
  return {
    classe: 'FalhaRuntime',
    porque,
    passo,
    remedio,
    origem: { bloco: 'texto', ranhura: 0, passo },
  };
}

function desescapar(s: string): string {
  return s.replace(/\\([\\'"nrt])/g, (_m, c: string) =>
    c === 'n' ? '\n' : c === 'r' ? '\r' : c === 't' ? '\t' : c,
  );
}

function valorDe(termo: string, passo: number): Valor | null {
  const origem = { bloco: 'texto', ranhura: 0, passo };
  if (NUMERO.test(termo)) return val('número', Number(termo), AMOSTRA, origem);
  const txt = TEXTO.exec(termo);
  if (txt) return val('texto', desescapar(txt[2]!), AMOSTRA, origem);
  if (termo === 'True') return val('lógico', true, AMOSTRA, origem);
  if (termo === 'False') return val('lógico', false, AMOSTRA, origem);
  return null;
}

/** O que uma linha diz, ou o que tem de errar. */
function lerLinha(bruta: string, passo: number): LerResultado {
  const t = bruta.trim();
  if (t.length === 0 || t.startsWith('#')) return { eventos: [], erros: [] };

  const r = tentarLer(t, passo);
  if (r.erros.length === 0) return r;

  // O `;` só é culpado depois de a linha ter falhado por outra razão. A
  // regra antiga procurava o `;` na linha toda e recusava antes de tentar
  // ler, por isso contava `x = 'a;b'` — que é Python válido, e compila —
  // como se fosse o vício do Java. Um sintoma que só aparece dentro de uma
  // palavra é o sinal de que se está a procurar o sintoma no sítio errado.
  if (t.endsWith(';')) {
    const semPonto = tentarLer(t.slice(0, -1).trim(), passo);
    if (semPonto.erros.length === 0) {
      return {
        eventos: [],
        erros: [
          erro(
            passo,
            'Esta linha não é Python: acaba em ";", e Python não usa ponto-e-vírgula para separar linhas.',
            'Apaga o ponto-e-vírgula do fim da linha.',
          ),
        ],
      };
    }
  }
  return r;
}

function tentarLer(t: string, passo: number): LerResultado {
  const ciclo = CICLO.exec(t);
  if (ciclo) {
    return { eventos: [{ passo, tipo: 'ciclo', iteracoes: Number(ciclo[1]) }], erros: [] };
  }

  const imp = IMPRIMIR.exec(t);
  if (imp) return lerImprimir(imp[1]!, passo);

  const at = ATRIBUIR.exec(t);
  if (at) return lerAtribuir(at[1]!, at[2]!.trim(), passo);

  return {
    eventos: [],
    erros: [
      erro(
        passo,
        `Esta linha não é Python: "${t}".`,
        'Uma linha de Python é uma atribuição, um print, um for, ou nada.',
      ),
    ],
  };
}

function lerImprimir(dentro: string, passo: number): LerResultado {
  if (NUMERO.test(dentro)) {
    return {
      eventos: [{ passo, tipo: 'imprimir', valor: valorDe(dentro, passo)! }],
      erros: [],
    };
  }
  const txt = TEXTO.exec(dentro);
  if (txt) {
    return { eventos: [{ passo, tipo: 'imprimir', valor: valorDe(dentro, passo)! }], erros: [] };
  }
  if (NOME.test(dentro)) {
    // `print(total)` não declara tipo. Emitir aqui um `usar` com
    // `tipoValor: 'texto'` fazia o núcleo responder "total guarda número, e
    // este sítio precisa de texto" — um erro que o Python não tem, numa
    // linha que o Python aceita. A omissão é a informação: este sítio não
    // impõe tipo a nada.
    return { eventos: [{ passo, tipo: 'usar', nome: dentro }], erros: [] };
  }
  return {
    eventos: [],
    erros: [
      erro(
        passo,
        `Python não sabe o que mostrar: "${dentro}".`,
        'Dentro do print só pode estar um nome, um número ou um texto.',
      ),
    ],
  };
}

function lerAtribuir(nome: string, resto: string, passo: number): LerResultado {
  if (resto.startsWith('=')) {
    // O `ATRIBUIR` casa `total == 5` como atribuição de `= 5`, e dizer
    // "Python não sabe o que fazer com "= 1"" é verdade e não ajuda nada.
    // A pessoa escreveu o sinal certo para comparar e o errado para
    // atribuir, e a mensagem tem de dizer exatamente isso — com os dois
    // caracteres à vista, porque a diferença entre eles é um traço e é
    // nisso que a pessoa se enganou.
    return {
      eventos: [],
      erros: [
        erro(
          passo,
          'Em Python "==" são dois sinais de igual, e é comparação: serve para perguntar, não põe nada em lado nenhum.',
          'Para guardar um valor usa um sinal de igual só: "=" em vez de "==".',
        ),
      ],
    };
  }

  const valor = valorDe(resto, passo);
  if (valor !== null) {
    return {
      eventos: [{ passo, tipo: 'atribuir', nome, tipoValor: valor.tipo, valor }],
      erros: [],
    };
  }

  if (NOME.test(resto)) {
    // Uma cópia não impõe tipo ao destino. `x = total` é válido com
    // qualquer coisa em `total`.
    return { eventos: [{ passo, tipo: 'usar', nome: resto }], erros: [] };
  }

  const expressao = EXPRESSAO.exec(resto);
  if (expressao) {
    const esquerda = expressao[1]!;
    const direita = expressao[3]!;
    // Um termo de uma conta é um número, um texto, True/False — ou o nome
    // de outra variável. Um nome não é um termo inválido: é o termo mais
    // comum, e é o que faz `total = total + 1` ser a linha da lição. O que
    // não é um termo é `2 - 3` escrito do lado direito de um `1 -`.
    const legivel = (t: string): boolean => valorDe(t, passo) !== null || NOME.test(t);
    if (legivel(esquerda) && legivel(direita)) {
      const eventos: EventoLido[] = [];
      // Um nome do lado esquerdo é um uso, e o uso vem **antes** da
      // operação: `total = total + 1` com `total` por guardar tem de falhar
      // em `total`, não na soma. A ordem dos eventos é o que decide isso.
      //
      // O uso declara `número` porque é isso que o sítio exige: em Python
      // `+ - * /` são operações numéricas. E é este `tipoValor` que dá a
      // linha mais importante da lição — `total = 'olá'` passa, e a linha
      // seguinte é que rebenta com "total guarda texto, e este sítio
      // precisa de número". Se a conta não declarasse nada, o produto não
      // teria como dizer ao aluno a coisa mais importante que sabe sobre
      // Python: que o texto entra em silêncio e rebenta em baixo.
      for (const t of [esquerda, direita]) {
        if (NOME.test(t)) eventos.push({ passo, tipo: 'usar', nome: t, tipoValor: 'número' });
      }
      eventos.push({
        passo,
        tipo: 'operar',
        operacao: expressao[2] as '+' | '-' | '*' | '/',
        a: valorDe(esquerda, passo),
        b: valorDe(direita, passo),
      });
      return { eventos, erros: [] };
    }
    // A expressão é válida para o Python e não se sabe ler. Dizer isso é
    // ensino; transformar o termo em `0` sem dizer nada é fazer o aluno
    // ler `a = 1 - 0` e pensar que foi o que escreveu.
    return {
      eventos: [],
      erros: [
        erro(
          passo,
          `Esta conta ainda não sei ler: "${resto}". Numa conta, cada lado tem de ser um número, um texto, True/False, ou o nome de outra variável.`,
          `Nesta lição as contas são de dois termos, e cada termo tem de ser um número, um texto, True/False, ou o nome de outra variável. O termo "${legivel(esquerda) ? direita : esquerda}" não é nenhum dos quatro.`,
        ),
      ],
    };
  }

  return {
    eventos: [],
    erros: [
      erro(
        passo,
        `Python não sabe o que fazer com "${resto}".`,
        'À direita do = só pode estar um número, um texto entre aspas, True, False, o nome de outra variável, ou uma conta.',
      ),
    ],
  };
}

function lerLog(passo: number): LerResultado {
  return {
    eventos: [],
    erros: [
      erro(
        passo,
        'Em Python não existe nada que se chame log. A função não existe, e isso só se descobre quando o código corre.',
        'Escreve a função log antes de a chamares, ou usa print.',
      ),
    ],
  };
}

export const python: Projection = {
  linguagem: 'python',
  familia: 'imperativa',
  policy: POLITICAS.python,
  blocos: BLOCOS_IMPERATIVOS,

  emit(programa: BlocoLeigo | null): Gerado {
    const e = new Emissor();
    for (const bloco of pilhaDe(programa)) emitir(bloco, e);
    return {
      texto: e.linhas.map((l) => `${l}\n`).join(''),
      anotacoes: e.anotacoes,
    };
  },

  ler(texto: string): LerResultado {
    const eventos: EventoLido[] = [];
    const erros: FalhaRuntime[] = [];
    const linhas = texto.split('\n');
    for (let i = 0; i < linhas.length; i += 1) {
      const passo = i + 1;
      const t = linhas[i]!.trim();
      // O `log` é o bloco que existe para mostrar a diferença entre as duas
      // epistemologias: em Java é recusado antes de correr, em Python só
      // quando corre. O `ler` recusa-o, e a mensagem diz que a função não
      // existe — que é a verdade, e é a altura em que a Python a descobre.
      if (t.startsWith('log(')) {
        erros.push(...lerLog(passo).erros);
        continue;
      }
      const r = lerLinha(linhas[i]!, passo);
      eventos.push(...r.eventos);
      erros.push(...r.erros);
    }
    return { eventos, erros };
  },
};
```

- [ ] **Step 7: Ler expressões — `total = total + 1`**

A linha mais importante da lição é uma atribuição cuja direita é uma conta. Sem isto o `ler` diz «Python não sabe o que fazer» a uma linha perfectly válida, e a lição mente sobre a linguagem que está a ensinar.

`src/projecoes/python.ts` — substituir o bloco `if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(resto))` dentro do caso `atribuir` por:

```typescript
    const expressao = EXPRESSAO.exec(resto);
    if (expressao) {
      const a = termoDe(expressao[1]!, passo);
      const b = termoDe(expressao[3]!, passo);
      const eventos: EventoLido[] = [];
      // Um identificador do lado esquerdo é um uso, e o uso vem **antes** da
      // operação: `total = total + 1` com `total` por guardar tem de falhar
      // em `total`, não na soma. A ordem dos eventos é o que decide isso.
      for (const t of [expressao[1]!, expressao[3]!]) {
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) {
          eventos.push({ passo, tipo: 'usar', nome: t, tipoValor: 'texto' });
        }
      }
      eventos.push({
        passo,
        tipo: 'operar',
        operacao: expressao[2] as '+' | '-' | '*' | '/',
        a,
        b,
      });
      return { eventos, erros: [] };
    }
```

E acrescentar, junto das outras constantes de expressão:

```typescript
const EXPRESSAO = /^(.+?)\s*([+\-*\/])\s*(.+?)$/;

function termoDe(termo: string, passo: number): Valor {
  const origem = { bloco: 'texto', ranhura: 0, passo };
  if (NUMERO.test(termo)) return val('número', Number(termo), AMOSTRA, origem);
  const txt = TEXTO.exec(termo);
  if (txt) return val('texto', desescapar(txt[1]!), AMOSTRA, origem);
  if (termo === 'True') return val('lógico', true, AMOSTRA, origem);
  if (termo === 'False') return val('lógico', false, AMOSTRA, origem);
  return val('número', 0, AMOSTRA, origem);
}
```

Acrescente os testes:

```typescript
describe('ler: expressões', () => {
  it('total = total + 1 produz um uso e uma operação, e nenhum erro', () => {
    const r = python.ler('total = 5\ntotal = total + 1\n');
    expect(r.erros).toEqual([]);
    expect(r.eventos.map((e) => e.tipo)).toEqual(['atribuir', 'usar', 'operar']);
  });

  it('o uso vem antes da operação, que é o que faz o erro cair no sítio certo', () => {
    const r = python.ler('total = total + 1\n');
    expect(r.eventos[0]!.tipo).toBe('usar');
  });

  it("somar texto a número é erro de execução, e é em Python também", () => {
    const erros = avaliarTextoPython("total = 'olá'\ntotal = total + 1\n");
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('texto');
  });

  it('as quatro operações entram', () => {
    for (const op of ['+', '-', '*', '/']) {
      expect(python.ler(`total = total ${op} 1\n`).erros).toEqual([]);
    }
  });

  it('dividir por zero é o que a conta dá, e quem diz é o núcleo', () => {
    const erros = avaliarTextoPython('total = 8\ntotal = total / 0\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('zero');
  });
});
```

O teste usa um atalho local, porque `avaliarTexto` só chega na Task 6:

```typescript
function avaliarTextoPython(texto: string) {
  const lido = python.ler(texto);
  return lido.erros.length > 0 ? lido.erros : interpretar(lido.eventos, python.policy, (p) => ({ bloco: 'texto', ranhura: 0, passo: p }));
}
```

E o import em falta no topo do ficheiro de teste:

```typescript
import { interpretar } from '../nucleo/semantica';
```

E o `for`, que é a outra forma de linha que a lição usa. Sem ele, o ficheiro de leitura tem um `for` e o `ler` diz que não é Python — o que é pior do que não ter o `for`.

Em `src/projecoes/python.ts`, antes do caso `imprimir`:

```typescript
  const ciclo = /^for\s+_\s+in\s+range\(\s*(\d+)\s*\)\s*:$/.exec(t);
  if (ciclo) {
    return { eventos: [{ passo, tipo: 'ciclo', iteracoes: Number(ciclo[1]) }], erros: [] };
  }
```

Acrescente os testes:

```typescript
describe('ler: o for', () => {
  it('conta as voltas', () => {
    const r = python.ler('for _ in range(3):\n    total = total + 1\n');
    expect(r.erros).toEqual([]);
    const c = r.eventos.find((e) => e.tipo === 'ciclo');
    if (!c || c.tipo !== 'ciclo') throw new Error('esperava um ciclo');
    expect(c.iteracoes).toBe(3);
  });

  it('a indentação não é lida como erro: o `ler` lê linha a linha', () => {
    expect(python.ler('    total = 5\n').erros).toEqual([]);
  });

  it('o for de duas voltas também', () => {
    const c = python.ler('for _ in range(2):\n    x = 1\n').eventos[0]!;
    if (c.tipo !== 'ciclo') throw new Error('esperava um ciclo');
    expect(c.iteracoes).toBe(2);
  });

  it('range com mais de 10000 voltas é recusado pelo núcleo, não pelo leitor', () => {
    const erros = avaliarTextoPython('for _ in range(10001):\n    x = 1\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('10000');
  });
});
```

**A conta que fecha a lição:** `for _ in range(3):` followed by `total = total + 1` means Python runs the line three times. O `ler` produz um evento `ciclo` e três `operar` — e o `interpretar` do Task 3 evaluates them. É a mesma lição em duas escalas, e é por isso que o `ciclo` é um evento e não um `texto` descartado.

**Por que é que isto importa para a lição e não é um extra:** a linha `total = total + 1` é o momento em que Python deixa de ser um ficheiro de texto e passa a ser um programa. Sem a expressão lida, o aluno lê a linha e o produto diz-lhe que é um erro — e ele aprende a distrustar do professor em vez de aprender a ler.

- [ ] **Step 8: Correr os testes e ver passar**

Run: `npx vitest run src/projecoes`
Expected: PASS.

- [ ] **Step 9: Correr a suite toda, o verificador de árvore e o typecheck**

Run: `npm test && npm run arvore && npx tsc --noEmit`
Expected: PASS, `núcleo limpo`, e o typecheck mudo.

- [ ] **Step 10: Commitar**

```bash
git add -A
git commit -m "feat: interface Projection, registo, e a projecao Python

emit e ler vivem no mesmo objeto de proposito: quem escreve total = 5
e quem le total = 5 e a mesma pessoa, e se divergirem a licao mente.

ler() rejeita texto que nao e Python (o ponto-e-vigula e a marca) com um
FalhaRuntime que tem porque, nunca com um codigo de erro nu. E nao
recusa total = 'ola' — quem recusa e o uso, e isso e a licao.

log(...) da Recusa-ao-usar de Java de o Python rebentar a correr, e o
porque diz isso em vez de dizer que a linha e invalida.
"
```

---

> ### O que esta tarefa custou a achar, e o que ficou escrito no código
>
> **O plano escrevia `undefined = 5` para o bloco mais básico do produto.**
> O `emitir` lia o nome de um `guardar` de `inputs.NOME`, e o nome está em
> `fields.nome.valor` — em `dados.ts`, no Blockly e no YAML. Nenhum teste via
> isto, porque todos os testes do `emit` verificavam *tipos* e só um verificava
> texto, e esse um era o do `log`. O esboço de `BlocoLeigo` no *próprio plano*
> dizia `fields`, e o código dizia `inputs`: o documento e o programa
> discordavam, e o programa ganhou. **Custo se tivesse passado: o primeiro
> ecrã da lição mostrava ao aluno `undefined = 5`, e ele não tem como saber
> que o produto está errado.** Há agora um teste que afirma as duas coisas — que
> o nome está nos `fields` e que não está nos `inputs` — porque um teste que
> passa com as duas verdade também passa com as duas falsas.
>
> **A projeção dizia quatro coisas falsas sobre Python, e as quatro eram
> recusar linhas que o Python aceita.** Verifiquei cada uma contra o
> interpretador antes de a corrigir, e é a verificação que decide: um produto
> que recusa Python válido ensina a pessoa a desconfiar do produto, e a
> lição passa a ser "não confies no ecrã". As quatro:
>
> | A linha | O que o plano dizia | O que o Python faz |
> |---|---|---|
> | `x = "olá"` | não sabe o que fazer | compila |
> | `x = 1.5` | não sabe o que fazer | compila |
> | `x = 'a;b'` | há um `;`, que é vício do Java | compila |
> | `print(total)` com `total = 5` | `total` guarda número, e este sítio precisa de texto | imprime `5` |
>
> A quarta é a mais séria, e não era um erro de leitura: era um erro
> *semântico*. A projeção emitia um `usar` com `tipoValor: 'texto'` para o que
> está dentro de um `print`, e o núcleo respondia com a incompatibilidade que
> ele está feito para responder. O Python não impõe tipo ao `print`, e o
> `x = total` também não — uma cópia não impõe tipo ao destino. A correção
> está no Task 3, e é uma mudança de interface: **`usar.tipoValor` passou a
> opcional, e a omissão é informação** — este sítio não declara tipo. O mesmo
> raciocínio deu `operar.a`/`operar.b` a `Valor | null`, porque `total = total
> + 1` tem `total` à esquerda e o valor de `total` só existe quando o programa
> corre. O plano punha um `0` no lugar do nome, e com isso uma conta de dois
> números podia ser recusada por uma incompatibilidade que não existe. **O
> núcleo julga o que a projeção conseguiu ler, e não o que ela adivinhou.**
>
> **O `for` sem corpo é Python que não corre, e o plano emitia-o.** Verificado:
> `for _ in range(3):` sozinho dá `expected an indented block`, e um corpo
> feito só de um comentário dá o mesmo erro — o que elimina a saída óbvia. A
> única coisa que é Python e não diz nada é `pass`, e é o que a projeção emite
> com uma anotação que explica. **Verifico cada afirmação sobre uma linguagem
> contra a linguagem, e não contra o que me lembro dela.** Foi a mesma
> verificação que apanhou as aspas duplas, os decimais, o `;` dentro de uma
> palavra e a barra-crua — que o plano aceitava e o Python não.
>
> **O `Anotacao` perdeu o campo `tipo`, e a ausência é uma decisão.** O plano
> preenchia-o com `número` sempre que a entrada era uma referência, porque não
> havia outro tipo para pôr — e `log(total)` passava a ser uma linha sobre um
> número, quando o tipo de `total` só existe quando o programa corre. Um
> campo que uma em cada cinco linhas não consegue preencher honestamente
> acaba preenchido a mentir, e o ecrã mostra a mentira com a mesma confiança
> com que mostra o `porque`. O `Tipo` de uma linha gerada lê-se do
> `EventoLido` do caminho do `ler`, que é onde o tipo é um fato e não uma
> previsão. Há um teste que afirma que as anotações não têm campo `tipo`.
>
> **O `for` não era anotado, e o emissor aninhado contava as linhas a partir
> de 1.** Duas metades do mesmo bug: uma linha sem explicação, e as restantes
> a apontar para a linha errada — a do `x = 1` dizia linha 1, e a linha 1 é o
> `for`. O `porque` de cada linha é o que o aluno lê ao lado do código, e uma
> anotação na linha errada ensina a explicação errada com a confiança certa.
> O `Emissor` passou a levar um `base` com as linhas que o pai já emitiu, e o
> `for` passou a passar por `linha()` como toda a gente.
>
> **`LerResultado.erros` passou a ser `FalhaRuntime[]`.** O plano declarava
> `Erro[]` e acedia a `.passo` em três sítios — sobre uma união em que só a
> `FalhaRuntime` tem `passo`, que é o mesmo erro que o Task 3 teve e que o
> `tsc` apanha sempre. Declarar o tipo certo não é calar o compilador: é
> afirmar que um erro de leitura é sempre uma falha a correr, e que a
> projeção não produz recusas de tipo — quem recusa o tipo é o núcleo, e um
> `ler` que devolvesse uma `Recusa` estaria a decidir uma coisa que não é sua.
>
> **`pilhaDe` no corpo de um laço é uma recursão infinita, e o `tsc` não a
> vê.** `pilhaDe` abre uma pilha e, se não for uma pilha, devolve o próprio
> bloco — que é o que se quer no topo e não se quer dentro de um `for`. O
> corpo vive em `inputs.CORPO.stack`, e é um sítio diferente do `CORPO` que a
> pilha usa. A confusão entre os dois rebenta com *stack size exceeded* ao
> primeiro `repetir`, e a mensagem não diz nada sobre blocos. Houve aqui três
> erros meus de escrita antes de o teste passar, e **um teste que rebenta com
> uma exceção em vez de uma falha de asserção é um teste que ainda não disse
> o que é para estar errado.**
>
> **Verificação que não cabe num teste: os catorze programas que esta
> projeção gera compilam todos no Python 3.14.** Não está em teste porque um
> teste que precisa de um interpretador externo não corre em todo o lado, e
> um teste que nem sempre corre deixa de ser um teste. O que fica em teste é
> a *forma* do texto — nenhuma linha que abra um bloco fica sem corpo, a
> indentação é múltipla de quatro, e nenhum carácter de outra linguagem
> aparece — porque é isso que se despista sozinho. `log(total)` é *sintaxe*
> válida e só rebenta a correr com `NameError`, que é a lição completa: a
> linha é bem escrita, e é a altura de a pistola que faz mal.
>
> **A `Recusa-ao-usar` de Java, que é o nome de um bloco, é uma frase de
> que a spec foi buscar.** A lição precisa dela e o bloco chama-se `log`.
> Verificar que `log` é mesmo o bloco que mostra a diferença entre as duas
> epistemologias foi o que fixou o `ler`: o `log` é recusado ao *ler*, e a
> mensagem diz que a função não existe — que é a verdade, e é a altura em que
> a Python a descobre. A de Java recusa o *mesmo* `log` antes de correr, e a
> diferença entre as duas frases é a lição da costura.
>
> **Um teste meu que se contradizia, o sétimo no total.** `repetir(2, [guardar,
> log])` produz quatro linhas — o `for`, os dois do corpo, e o `dizer` — e eu
> tinha escrito seis, porque contava o `for` duas vezes, uma por volta. Um
> `repetir(2)` escreve o `for` uma vez e o corpo uma vez. É a mesma família dos
> seis anteriores: um número escrito sem contar passa porque ninguém o
> confere, e no dia em que se confere o número está errado e não se sabe se o
> trabalho está.

---

### Task 5: A projecao Java — a que prova a costura

Uma projecão só não prova nada: constrói-se qualquer coisa monolinguagem e chama-se-lhe invariância. Esta é a segunda, e o que ela tem dedemonstrar são três coisas que a de Python não podia mostrar:

1. O **mesmo** `BlocoLeigo` produz **outro** texto.
2. O `emit` escreve o **tipo** (`int total = 5;`), porque em Java o tipo é escrito à mão e é essa a lição.
3. A **mesma** violação de tipo dá respostas **opostas** nas duas linguagens — e a diferença vem só da `Policy`, não de código repetido.

**Files:**
- Create: `src/projecoes/java.ts`
- Modify: `src/projecoes/registo.ts` — acrescentar `java`
- Test: `src/projecoes/java.test.ts`, e actualizar `src/projecoes/registo.test.ts`

**Interfaces:**
- Consumes: Task 1 — `Erro`, `Tipo`; Task 2 — `BlocoLeigo`, `identificador`, `pilhaDe`; Task 3 — `POLITICAS`, `EventoLido`, `interpretar`, `AMOSTRA`; Task 4 — `Projection`, `Gerado`, `LerResultado`, `BLOCOS_IMPERATIVOS`.
- Produces: `java`, `DECLARACAO` — o nome que cada tipo tem em Java, que é metade da lição.

- [ ] **Step 1: Actualizar o teste do registo para as duas linguagens**

Em `src/projecoes/registo.test.ts`, substitua o primeiro `it` e acrescente este:

```typescript
  it('tem Python e Java, e só essas duas', () => {
    expect(LINGUAGENS_COM_PROJECAO.sort()).toEqual(['java', 'python']);
  });

  it('as duas imperativas declaram o mesmo vocabulário de blocos', () => {
    expect(obter('java').blocos).toEqual(obter('python').blocos);
  });

  it('as duas declaram a mesma família', () => {
    expect(obter('java').familia).toBe(obter('python').familia);
  });
```

- [ ] **Step 2: Escrever o teste falhado — a projecão Java**

`src/projecoes/java.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { java } from './java';
import { python } from './python';
import { dizer, guardar, guardarTexto, log, pilha, repetir } from '../nucleo/testes/dados';
import { POLITICAS, interpretar } from '../nucleo/semantica';

describe('emit: o mesmo bloco, outra sintaxe', () => {
  it('guardar escreve o tipo, porque em Java escreve-se à mão', () => {
    expect(java.emit(pilha(guardar('total', 5))).texto).toBe('int total = 5;\n');
  });

  it('o mesmo bloco dá texto diferente em Python e em Java', () => {
    const p = pilha(guardar('total', 5));
    expect(python.emit(p).texto).toBe('total = 5\n');
    expect(java.emit(p).texto).toBe('int total = 5;\n');
  });

  it('guardar texto', () => {
    expect(java.emit(pilha(guardarTexto('nome', 'olá'))).texto).toBe('String nome = "olá";\n');
  });

  it('dizer escreve System.out.println', () => {
    expect(java.emit(pilha(dizer({ txt: 'olá' }))).texto).toBe('System.out.println("olá");\n');
  });

  it('log de uma referência', () => {
    expect(java.emit(pilha(log({ ref: 'total' }))).texto).toBe('log(total);\n');
  });

  it('repetir escreve o for clássico com chavetas', () => {
    expect(java.emit(pilha(repetir(3, [guardar('x', 1)]))).texto)
      .toBe('for (int i = 0; i < 3; i++) {\n    int x = 1;\n}\n');
  });

  it('repetir aninhado abre duas chavetas', () => {
    expect(java.emit(pilha(repetir(2, [repetir(2, [guardar('x', 1)])]))).texto)
      .toBe('for (int i = 0; i < 2; i++) {\n    for (int j = 0; j < 2; j++) {\n        int x = 1;\n    }\n}\n');
  });

  it('repetir sem corpo fecha a chaveta na mesma', () => {
    expect(java.emit(pilha(repetir(3, []))).texto)
      .toBe('for (int i = 0; i < 3; i++) {\n}\n');
  });

  it('programa vazio gera string vazia e zero anotações', () => {
    const g = java.emit(null);
    expect(g.texto).toBe('');
    expect(g.anotacoes).toEqual([]);
  });

  it('toda linha gerada tem anotação com porque e linha certa', () => {
    const g = java.emit(pilha(repetir(2, [guardar('x', 1), log({ ref: 'x' })])));
    const linhas = g.texto.trimEnd().split('\n');
    expect(linhas).toHaveLength(5);
    expect(g.anotacoes).toHaveLength(5);
    for (let i = 0; i < g.anotacoes.length; i += 1) {
      expect(g.anotacoes[i]!.linha).toBe(i + 1);
      expect(g.anotacoes[i]!.porque.length).toBeGreaterThan(0);
    }
  });

  it('nenhuma anotação menciona outra linguagem', () => {
    const g = java.emit(pilha(guardar('total', 5), log({ ref: 'total' })));
    for (const a of g.anotacoes) {
      expect(a.porque).not.toMatch(/Python|Go|TypeScript|SQL|JavaScript/);
    }
  });
});

describe('ler: o que a Java aceita', () => {
  it('atribuição com tipo', () => {
    const r = java.ler('int total = 5;\n');
    expect(r.erros).toEqual([]);
    expect(r.eventos).toHaveLength(1);
  });

  it('a atribuição declara a restrição, que é o que faz a recusa ao parse', () => {
    const ev = java.ler('int total = 5;\n').eventos[0]!;
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('número');
    expect(ev.restricao).toBe('número');
  });

  it('String declarado', () => {
    const ev = java.ler('String nome = "olá";\n').eventos[0]!;
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('texto');
    expect(ev.restricao).toBe('texto');
  });

  it('System.out.println conta como uso', () => {
    expect(java.ler('System.out.println(total);\n').erros).toEqual([]);
  });

  it('o for clássico conta as voltas', () => {
    const r = java.ler('for (int i = 0; i < 3; i++) {\n}\n');
    expect(r.erros).toEqual([]);
    const ciclo = r.eventos.find((e) => e.tipo === 'ciclo');
    if (!ciclo || ciclo.tipo !== 'ciclo') throw new Error('esperava um ciclo');
    expect(ciclo.iteracoes).toBe(3);
  });

  it('linhas em branco são ignoradas', () => {
    expect(java.ler('\n\n  \n').erros).toEqual([]);
  });
});

describe('ler: o que a Java recusa', () => {
  it('total = 5 sem tipo não é Java', () => {
    const r = java.ler('total = 5;\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('Java');
    expect(r.erros[0]!.porque).toMatch(/int|tipo/);
  });

  it('sem ponto-e-vírgula não é Java', () => {
    expect(java.ler('int total = 5\n').erros).toHaveLength(1);
  });

  it('o erro tem porque e remedio', () => {
    const r = java.ler('total = 5;\n');
    expect(r.erros[0]!.porque.length).toBeGreaterThan(10);
    expect(r.erros[0]!.remedio.length).toBeGreaterThan(0);
  });
});

describe('a costura: o mesmo texto julgado pelas duas políticas', () => {
  it('o mesmo programa dá Recusa em Java e silêncio em Python', () => {
    // A diferença vem inteira da `Policy`. Não há uma linha de código
    // duplicada entre as duas projeções para isto funcionar.
    const guardarTextoComoNumero = { passo: 1, tipo: 'atribuir', nome: 'total', tipoValor: 'texto' as const, restricao: 'número' as const, valor: { tipo: 'texto' as const, valor: 'olá', explicacao: { porque: 'x', remedio: 'y' }, origem: { bloco: 't', ranhura: 0, passo: 1 }, recusado: false } };

    const emJava = interpretar([guardarTextoComoNumero], POLITICAS.java, () => ({ bloco: 't', ranhura: 0, passo: 1 }));
    const emPython = interpretar([guardarTextoComoNumero], POLITICAS.python, () => ({ bloco: 't', ranhura: 0, passo: 1 }));

    expect(emJava).toHaveLength(1);
    expect(emJava[0]!.classe).toBe('Recusa');
    expect(emPython).toEqual([]);
  });

  it('e o passo seguinte é que paga a dívida em Python', () => {
    const usarDepois = { passo: 2, tipo: 'usar' as const, nome: 'total', tipoValor: 'número' as const };
    const guardar = { passo: 1, tipo: 'atribuir' as const, nome: 'total', tipoValor: 'texto' as const, restricao: 'número' as const, valor: { tipo: 'texto' as const, valor: 'olá', explicacao: { porque: 'x', remedio: 'y' }, origem: { bloco: 't', ranhura: 0, passo: 1 }, recusado: false } };

    const emPython = interpretar([guardar, usarDepois], POLITICAS.python, (p) => ({ bloco: 't', ranhura: 0, passo: p }));
    expect(emPython).toHaveLength(1);
    expect(emPython[0]!.classe).toBe('FalhaRuntime');
    expect(emPython[0]!.passo).toBe(2);
  });
});
```

- [ ] **Step 3: Correr os testes e ver falhar**

Run: `npx vitest run src/projecoes`
Expected: FAIL — `./java` não existe, e o registo só tem Python.

- [ ] **Step 4: Escrever `src/projecoes/java.ts`**

```typescript
import type { BlocoLeigo } from '../nucleo/blocos';
import { identificador, pilhaDe } from '../nucleo/blocos';
import { AMOSTRA, POLITICAS } from '../nucleo/semantica';
import type { EventoLido } from '../nucleo/semantica';
import { val } from '../nucleo/tipos';
import type { Erro, Tipo, Valor } from '../nucleo/tipos';
import { BLOCOS_IMPERATIVOS } from './python';
import type { Anotacao, Gerado, LerResultado, Projection } from './tipos';

/** A palavra que a Java escreve para cada tipo. Aqui está metade da lição:
 *  em Python o tipo não se escreve, e em Java escreve-se sempre. */
const DECLARACAO: Record<Tipo, string> = {
  número: 'int',
  texto: 'String',
  lógico: 'boolean',
  lista: 'int[]',
  função: 'Runnable',
  actor: 'String',
};

const LITERAL_LOGICO: Record<string, string> = { true: 'true', false: 'false' };

function tipoDeEntrada(entrada: unknown): Tipo {
  if (typeof entrada === 'number') return 'número';
  if (typeof entrada === 'boolean') return 'lógico';
  if (entrada && typeof entrada === 'object' && 'ref' in entrada) return 'número';
  return 'texto';
}

function literal(entrada: unknown): string {
  if (typeof entrada === 'number') return String(entrada);
  if (typeof entrada === 'boolean') return LITERAL_LOGICO[String(entrada)]!;
  if (entrada && typeof entrada === 'object' && 'ref' in entrada) {
    return String((entrada as { ref: unknown }).ref);
  }
  if (entrada && typeof entrada === 'object' && 'txt' in entrada) {
    return `"${fugar(String((entrada as { txt: unknown }).txt))}"`;
  }
  return `"${fugar(String(entrada))}"`;
}

function fugar(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function entradaDe(b: BlocoLeigo, chave: string): unknown {
  const i = b.inputs[chave];
  return i && 'valor' in i ? i.valor : undefined;
}

class Emissor {
  readonly linhas: string[] = [];
  readonly anotacoes: Anotacao[] = [];

  constructor(private nivel = 0) {}

  recuo(): void {
    this.linhas.push('    '.repeat(this.nivel));
  }

  linha(texto: string, tipo: Tipo, porque: string): void {
    this.recuo();
    this.linhas.push(texto);
    this.anotacoes.push({ linha: this.linhas.length, tipo, porque });
  }

  entrar(): Emissor {
    return new Emissor(this.nivel + 1);
  }
}

let contadorDeCiclo = 0;

function nomeDoContador(): string {
  contadorDeCiclo += 1;
  return ['i', 'j', 'k', 'l'][contadorDeCiclo - 1] ?? `c${contadorDeCiclo}`;
}

function emitir(b: BlocoLeigo, e: Emissor): void {
  switch (b.type) {
    case 'pilha':
      for (const filho of pilhaDe(b)) emitir(filho, e);
      return;

    case 'guardar': {
      const nome = identificador(String(entradaDe(b, 'NOME')));
      const entrada = entradaDe(b, 'VALOR');
      const tipo = tipoDeEntrada(entrada);
      e.linha(
        `${DECLARACAO[tipo]} ${nome} = ${literal(entrada)};`,
        tipo,
        `Guarda ${nome}. O ${DECLARACAO[tipo]} antes do nome é o tipo, e escreve-se sempre.`,
      );
      return;
    }

    case 'dizer': {
      const entrada = entradaDe(b, 'VALOR');
      e.linha(
        `System.out.println(${literal(entrada)});`,
        tipoDeEntrada(entrada),
        'Mostra o valor no ecrã.',
      );
      return;
    }

    case 'log': {
      const entrada = entradaDe(b, 'VALOR');
      e.linha(
        `log(${literal(entrada)});`,
        tipoDeEntrada(entrada),
        'Chama uma função que ainda não escreveste. O compilador diz que não a encontra, e diz antes de correr.',
      );
      return;
    }

    case 'repetir': {
      const vezes = String(entradaDe(b, 'PASSOS'));
      const c = nomeDoContador();
      e.linha(`for (int ${c} = 0; ${c} < ${vezes}; ${c}++) {`, 'número', `Repete ${vezes} vezes.`);
      const dentro = e.entrar();
      for (const filho of pilhaDe(b)) emitir(filho, dentro);
      e.linha('}', 'texto', 'Fecha o ciclo.');
      e.linhas.push(...dentro.linhas);
      e.anotacoes.push(...dentro.anotacoes);
      return;
    }

    default:
      e.linha(`// bloco do v2: ${b.type}`, 'texto', 'Este bloco ainda não está nesta lição.');
  }
}

const ATRIBUIR = /^(int|String|boolean)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?);$/;
const IMPRIMIR = /^System\.out\.println\(\s*(.+?)\s*\);$/;
const CICLO = /^for\s*\(\s*int\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*0;\s*[A-Za-z_][A-Za-z0-9_]*\s*<\s*(\d+);\s*[A-Za-z_][A-Za-z0-9_]*\s*\+\+\s*\)\s*\{$/;
const NUMERO = /^[-+]?\d+$/;
const TEXTO = /^"((?:[^"\\]|\\.)*)"$/;

const TIPO_DE_PALAVRA: Record<string, Tipo> = {
  int: 'número',
  String: 'texto',
  boolean: 'lógico',
};

function erro(passo: number, porque: string, remedio: string): Erro {
  return {
    classe: 'FalhaRuntime',
    porque,
    passo,
    remedio,
    origem: { bloco: 'texto', ranhura: 0, passo },
  };
}

function desescapar(s: string): string {
  return s.replace(/\\(["\\])/g, '$1');
}

function lerLinha(texto: string, passo: number): LerResultado {
  const t = texto.trim();
  if (t.length === 0) return { eventos: [], erros: [] };

  if (t === '}' || t === '{') return { eventos: [], erros: [] };

  const ci = CICLO.exec(t);
  if (ci) {
    return { eventos: [{ passo, tipo: 'ciclo', iteracoes: Number(ci[1]) }], erros: [] };
  }

  const im = IMPRIMIR.exec(t);
  if (im) {
    const dentro = im[1]!;
    if (NUMERO.test(dentro)) {
      return { eventos: [{ passo, tipo: 'imprimir', valor: val('número', Number(dentro), AMOSTRA, { bloco: 'texto', ranhura: 0, passo }) }], erros: [] };
    }
    const tx = TEXTO.exec(dentro);
    if (tx) {
      return { eventos: [{ passo, tipo: 'imprimir', valor: val('texto', desescapar(tx[1]!), AMOSTRA, { bloco: 'texto', ranhura: 0, passo }) }], erros: [] };
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(dentro)) {
      return { eventos: [{ passo, tipo: 'usar', nome: dentro, tipoValor: 'texto' }], erros: [] };
    }
    return { eventos: [], erros: [erro(passo, `Java não sabe o que mostrar: "${dentro}".`, 'Dentro do println só pode estar um nome, um número ou um texto.')] };
  }

  const at = ATRIBUIR.exec(t);
  if (at) {
    const tipoDeclarado = TIPO_DE_PALAVRA[at[1]!]!;
    const nome = at[2]!;
    const resto = at[3]!.trim();
    const origem = { bloco: 'texto', ranhura: 0, passo };

    if (NUMERO.test(resto)) {
      return { eventos: [{ passo, tipo: 'atribuir', nome, tipoValor: 'número', restricao: tipoDeclarado, valor: val('número', Number(resto), AMOSTRA, origem) }], erros: [] };
    }
    if (resto === 'true' || resto === 'false') {
      return { eventos: [{ passo, tipo: 'atribuir', nome, tipoValor: 'lógico', restricao: tipoDeclarado, valor: val('lógico', resto === 'true', AMOSTRA, origem) }], erros: [] };
    }
    const tx = TEXTO.exec(resto);
    if (tx) {
      return { eventos: [{ passo, tipo: 'atribuir', nome, tipoValor: 'texto', restricao: tipoDeclarado, valor: val('texto', desescapar(tx[1]!), AMOSTRA, origem) }], erros: [] };
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(resto)) {
      return { eventos: [{ passo, tipo: 'usar', nome: resto, tipoValor: tipoDeclarado }], erros: [] };
    }
    return { eventos: [], erros: [erro(passo, `Java não sabe o que fazer com "${resto}".`, 'À direita do = só pode estar um número, um texto entre aspas, true, false, ou o nome de outra variável.')] };
  }

  // O caso que prova a costura: `total = 5;` é uma atribuição válida em
  // muitas linguagens e **não** é Java. A mensagem tem de dizer porquê.
  const semTipo = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?);?$/.exec(t);
  if (semTipo) {
    return {
      eventos: [],
      erros: [erro(
        passo,
        `Esta linha não é Java: em Java escreve-se o tipo antes do nome, e falta o ponto-e-vírgula.`,
        `Escreve int ${semTipo[1]} = ${semTipo[2]};`,
      )],
    };
  }

  const semChaveta = /^(.+?[^;{])$/.exec(t);
  if (semChaveta && !semChaveta[1]!.trim().endsWith(';')) {
    return {
      eventos: [],
      erros: [erro(
        passo,
        `Esta linha não é Java: falta o ponto-e-vírgula no fim.`,
        'Em Java cadastatement acaba em ;',
      )],
    };
  }

  return {
    eventos: [],
    erros: [erro(
      passo,
      `Esta linha não é Java: "${t}".`,
      'Uma linha de Java é uma declaração com tipo, um System.out.println, um for, ou uma chaveta.',
    )],
  };
}

export const java: Projection = {
  linguagem: 'java',
  familia: 'imperativa',
  policy: POLITICAS.java,
  blocos: BLOCOS_IMPERATIVOS,

  emit(programa: BlocoLeigo): Gerado {
    contadorDeCiclo = 0;
    const e = new Emissor();
    for (const bloco of pilhaDe(programa)) emitir(bloco, e);
    return {
      texto: e.linhas.map((l) => `${l}\n`).join(''),
      anotacoes: e.anotacoes,
    };
  },

  ler(texto: string): LerResultado {
    const eventos: EventoLido[] = [];
    const erros: Erro[] = [];
    const linhas = texto.split('\n');
    for (let i = 0; i < linhas.length; i += 1) {
      const r = lerLinha(linhas[i]!, i + 1);
      eventos.push(...r.eventos);
      erros.push(...r.erros);
    }
    return { eventos, erros };
  },
};
```

- [ ] **Step 5: Ler expressões, com o tipo já declarado**

Em Java a mesma linha traz o tipo do lado esquerdo, e isso muda o que se pode dizer sobre ela. `int total = total + 1;` é um erro que o compilador apanha — a recusa é da **atribuição**, não da soma.

`src/projecoes/java.ts` — substituir o bloco `if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(resto))` dentro do caso `atribuir` por:

```typescript
    const expressao = EXPRESSAO.exec(resto);
    if (expressao) {
      const a = termoDe(expressao[1]!, passo);
      const b = termoDe(expressao[3]!, passo);
      const eventos: EventoLido[] = [];
      for (const t of [expressao[1]!, expressao[3]!]) {
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) {
          eventos.push({ passo, tipo: 'usar', nome: t, tipoValor: tipoDeclarado });
        }
      }
      eventos.push({
        passo,
        tipo: 'operar',
        operacao: expressao[2] as '+' | '-' | '*' | '/',
        a,
        b,
      });
      return { eventos, erros: [] };
    }
```

E junto das outras constantes:

```typescript
const EXPRESSAO = /^(.+?)\s*([+\-*\/])\s*(.+?)$/;

function termoDe(termo: string, passo: number): Valor {
  const origem = { bloco: 'texto', ranhura: 0, passo };
  if (NUMERO.test(termo)) return val('número', Number(termo), AMOSTRA, origem);
  const tx = TEXTO.exec(termo);
  if (tx) return val('texto', desescapar(tx[1]!), AMOSTRA, origem);
  if (termo === 'true') return val('lógico', true, AMOSTRA, origem);
  if (termo === 'false') return val('lógico', false, AMOSTRA, origem);
  return val('número', 0, AMOSTRA, origem);
}
```

Acrescente os testes:

```typescript
describe('ler: expressões', () => {
  it('int total = total + 1; é lido, com o uso antes da operação', () => {
    const r = java.ler('int total = 5;\nint total = total + 1;\n');
    expect(r.erros).toEqual([]);
    expect(r.eventos[1]!.tipo).toBe('usar');
    expect(r.eventos[2]!.tipo).toBe('operar');
  });

  it('guardar um número num sítio de texto é Recusa, e no passo da atribuição', () => {
    const erros = avaliarTextoJava('String total = total + 1;\nint total = 5;\n');
    expect(erros.length).toBeGreaterThan(0);
    expect(erros[0]!.classe).toBe('Recusa');
  });

  it('a mesma conta que Python adia, Java recusa — e a diferença é a política', () => {
    const guardar = "String total = \"olá\";\nint total = total + 1;\n";
    expect(avaliarTextoJava(guardar).some((e) => e.classe === 'Recusa')).toBe(true);
  });
});
```

Com o atalho:

```typescript
function avaliarTextoJava(texto: string) {
  const lido = java.ler(texto);
  return lido.erros.length > 0 ? lido.erros : interpretar(lido.eventos, java.policy, (p) => ({ bloco: 'texto', ranhura: 0, passo: p }));
}
```

E o import em falta no topo do ficheiro de teste:

```typescript
import { interpretar } from '../nucleo/semantica';
```

- [ ] **Step 6: Registar a Java**

Em `src/projecoes/registo.ts`, acrescente o import e a entrada:

```typescript
import { java } from './java';
```

```typescript
export const REGISTO: Partial<Record<Language, Projection>> = {
  python,
  java,
};
```

- [ ] **Step 7: Correr os testes e ver passar**

Run: `npx vitest run src/projecoes`
Expected: PASS. Os testes `a mesma forma de bloco dá texto diferente` e `o mesmo programa dá Recusa em Java e silêncio em Python` são os que provam a costura.

- [ ] **Step 8: Correr a suite toda e o verificador de árvore**

Run: `npm test && npm run arvore && npx tsc --noEmit`
Expected: PASS, `núcleo limpo`, typecheck mudo.

- [ ] **Step 9: Commitar**

```bash
git add -A
git commit -m "feat: projecao Java — a costura aguenta uma segunda linguagem

O mesmo BlocoLeigo produz 'total = 5' em Python e 'int total = 5;' em
Java. O mesmo programa julgado pelas duas politicas da Recusa em Java e
silencio em Python, e a diferenca vem inteira do campo policy — nao ha
uma linha de codigo duplicada para isso.

ler() da Java recusa 'total = 5;' e diz que em Java o tipo escreve-se
antes do nome. E a assim que a primeira falha de quem salta de uma
projecao para a outra aparece com porque, e nao com um codigo de erro.
"
```

---

### Task 6: Divergencia e avaliacao de texto

Duas coisas que só existem porque há seis linguagens: o texto do utilizador é lido **pela projeção da linguagem que ele escolheu**, e julgado pelo núcleo. E a divergência entre blocos e texto tem de funcionar em sintaxes que não se parecem nada.

É aqui que se resolvem os pontos 1, 3 e 4 do `Review Focus`.

**Files:**
- Create: `src/nucleo/divergencia.ts`, `src/projecoes/avaliar.ts`
- Test: `src/nucleo/divergencia.test.ts`, `src/projecoes/avaliar.test.ts`

**Interfaces:**
- Consumes: Task 1 — `Erro`, `Language`, `Origem`; Task 3 — `interpretar`, `EventoLido`; Task 4 — `Projection`, `Gerado`, `obter`, `LINGUAGENS_COM_PROJECAO`; Task 5 — `java`.
- Produces: `TOLERANCIA_EDICAO`, `dividirEmLinhas`, `distancia`, `comparar(gerado, texto)`, `Relatorio`, `Divergencia`, `avaliarTexto(linguagem, texto)`, `emitir(linguagem, programa)`, `classificar(erros)`, `ClassesObservadas`, `bate(esperado, erros)`, `LerLeitura`.

- [ ] **Step 1: Escrever o teste falhado — divergência**

`src/nucleo/divergencia.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { TOLERANCIA_EDICAO, comparar, distancia, dividirEmLinhas } from './divergencia';
import { java } from '../projecoes/java';
import { python } from '../projecoes/python';
import { guardar, log, pilha, repetir } from './testes/dados';

describe('dividirEmLinhas', () => {
  it('ignora linhas em branco e espaços nas pontas', () => {
    expect(dividirEmLinhas('  a = 1  \n\n\n  b = 2\n')).toEqual(['a = 1', 'b = 2']);
  });

  it('devolve lista vazia para string vazia', () => {
    expect(dividirEmLinhas('')).toEqual([]);
  });

  it('não remove espaços do meio, que em Java mudam nada mas são o texto', () => {
    expect(dividirEmLinhas('int  total = 5;')).toEqual(['int  total = 5;']);
  });
});

describe('distancia', () => {
  it('zero para texto igual', () => {
    expect(distancia('total = 5', 'total = 5')).toBe(0);
  });

  it('conta uma omissão como 1', () => {
    expect(distancia('tota = 5', 'total = 5')).toBe(1);
  });

  it('conta uma duplicação como 1', () => {
    expect(distancia('totall = 5', 'total = 5')).toBe(1);
  });

  it('uma transposição de adjacentes custa 1', () => {
    expect(distancia('tla = 5', 'total = 5')).toBe(3);
  });
});

describe('tolerância de edição', () => {
  it('é 2', () => {
    expect(TOLERANCIA_EDICAO).toBe(2);
  });

  it('aceita texto idêntico em Python', () => {
    const g = python.emit(pilha(repetir(2, [guardar('x', 1)])));
    expect(comparar(g, 'for _ in range(2):\n    x = 1\n').ok).toBe(true);
  });

  it('aceita falta da linha em branco final', () => {
    expect(comparar(python.emit(pilha(guardar('total', 5))), 'total = 5').ok).toBe(true);
  });

  it('aceita uma transposição de caracteres adjacentes', () => {
    const g = python.emit(pilha(log({ ref: 'constante' })));
    expect(comparar(g, 'log(cosntante)\n').ok).toBe(true);
  });

  it('rejeita três caracteres errados', () => {
    const g = python.emit(pilha(guardar('total', 5)));
    expect(comparar(g, 'txxttxl = 5\n').ok).toBe(false);
  });
});

describe('divergência em Java: o ponto-e-vírgula em falta', () => {
  // Review Focus 4. A tolerância de 2 foi calibrada para `total = 5`; em Java
  // o `;` em falta tem de ser apanhado pelo motivo certo.
  it('o ; em falta é uma divergência, não texto desconhecido', () => {
    const g = java.emit(pilha(guardar('total', 5)));
    const r = comparar(g, 'int total = 5\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias).toHaveLength(1);
    expect(r.divergencias[0]!.linha).toBe(1);
    expect(r.divergencias[0]!.porque).toContain(';');
  });

  it('o porque não diz "função desconhecida" nem "linha inválida"', () => {
    const g = java.emit(pilha(guardar('total', 5)));
    const d = comparar(g, 'int total = 5\n').divergencias[0]!;
    expect(d.porque).not.toMatch(/desconhecid|inválid/);
  });

  it('com o ; a escrever, a mesma comparação passa', () => {
    const g = java.emit(pilha(guardar('total', 5)));
    expect(comparar(g, 'int total = 5;\n').ok).toBe(true);
  });

  it('o mesmo texto Python não é aceito em Java', () => {
    const g = java.emit(pilha(guardar('total', 5)));
    expect(comparar(g, 'total = 5\n').ok).toBe(false);
  });
});

describe('exportação não tem tolerância', () => {
  it('cada linha gerada é exacta, sem tolerância', () => {
    expect(java.emit(pilha(guardar('total', 5))).texto).toBe('int total = 5;\n');
    expect(python.emit(pilha(guardar('total', 5))).texto).toBe('total = 5\n');
  });
});
```

- [ ] **Step 2: Escrever o teste falhado — avaliação de texto**

`src/projecoes/avaliar.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { avaliarTexto, bate, classificar, emitir } from './avaliar';
import { java } from './java';
import { python } from './python';
import { guardar, pilha } from '../nucleo/testes/dados';

describe('emitir', () => {
  it('delega na projeção da linguagem', () => {
    expect(emitir('python', pilha(guardar('total', 5))).texto).toBe('total = 5\n');
    expect(emitir('java', pilha(guardar('total', 5))).texto).toBe('int total = 5;\n');
  });
});

describe('avaliarTexto: Review Focus 1 — texto de outra linguagem', () => {
  it('Python escrito como Java é recusado, e o porque diz porquê', () => {
    const erros = avaliarTexto('java', 'total = 5\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('Java');
  });

  it('e o inverso: Java escrito como Python também', () => {
    const erros = avaliarTexto('python', 'int total = 5;\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('Python');
  });

  it('a linguagem certa passa', () => {
    expect(avaliarTexto('java', 'int total = 5;\n')).toEqual([]);
    expect(avaliarTexto('python', 'total = 5\n')).toEqual([]);
  });

  it('nenhum erro de texto-outra-linguagem menciona a outra linguagem por nome no remedio', () => {
    const erros = avaliarTexto('java', 'total = 5\n');
    expect(erros[0]!.remedio).not.toMatch(/Python/);
  });
});

describe('avaliarTexto: Review Focus 3 — variável antes de existir', () => {
  it('nomeia a variável e o passo', () => {
    const erros = avaliarTexto('python', 'total = total + 1\n');
    expect(erros.length).toBeGreaterThan(0);
    expect(erros[0]!.porque).toContain('total');
    expect(erros[0]!.porque).toContain('antes');
  });

  it('vale igual em Java', () => {
    const erros = avaliarTexto('java', 'int total = total + 1;\n');
    expect(erros.length).toBeGreaterThan(0);
  });
});

describe('avaliarTexto: a mesma linha, linguagens diferentes', () => {
  it("guardar texto onde se quer número: Java recusa, Python adia", () => {
    const emJava = avaliarTexto('java', 'int total = "olá";\n');
    const emPython = avaliarTexto('python', "total = 'olá'\n");
    expect(emJava.some((e) => e.classe === 'Recusa')).toBe(true);
    expect(emPython).toEqual([]);
  });

  it('em Python a dívida paga-se no uso, e aí sim é FalhaRuntime', () => {
    const erros = avaliarTexto('python', "total = 'olá'\nprint(total)\n");
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('FalhaRuntime');
    expect(erros[0]!.passo).toBe(2);
  });
});

describe('classificar e bate', () => {
  it('sem erros é Observacao', () => {
    expect(classificar([])).toBe('Observacao');
  });

  it('com Recusa é Recusa', () => {
    expect(classificar(avaliarTexto('java', 'int total = "olá";\n'))).toBe('Recusa');
  });

  it('com FalhaRuntime é FalhaRuntime', () => {
    expect(classificar(avaliarTexto('python', "total = 'olá'\nprint(total)\n"))).toBe('FalhaRuntime');
  });

  it('a Recusa ganha à FalhaRuntime, porque é a primeira a acontecer', () => {
    const erros = avaliarTexto('java', 'int total = "olá";\n');
    expect(classificar(erros)).toBe('Recusa');
  });

  it('bate aceita quando a classe observada é a esperada', () => {
    expect(bate('Observacao', avaliarTexto('python', 'total = 5\n'))).toBe(true);
    expect(bate('Recusa', avaliarTexto('python', 'total = 5\n'))).toBe(false);
  });
});
```

- [ ] **Step 3: Correr os testes e ver falhar**

Run: `npx vitest run src/nucleo/divergencia.test.ts src/projecoes/avaliar.test.ts`
Expected: FAIL com erros de resolução de `./divergencia` e `./avaliar`.

- [ ] **Step 4: Escrever `src/nucleo/divergencia.ts`**

```typescript
import type { Gerado } from '../projecoes/tipos';

export const TOLERANCIA_EDICAO = 2;

export interface Divergencia {
  linha: number;
  esperado: string;
  obtido: string;
  porque: string;
  remedio: string;
}

export interface Relatorio {
  ok: boolean;
  divergencias: Divergencia[];
}

export function dividirEmLinhas(texto: string): string[] {
  return texto
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.trim().length > 0);
}

/** Distância de edição com contagem de Levenshtein, mas uma transposição de
 *  caracteres adjacentes custa 1 e não 2 — é isso que a tolerância tem de
 *  apanhar quando alguém escreve à pressa. */
export function distancia(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let anterior = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    const actual = [i];
    for (let j = 1; j <= n; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let melhor = Math.min(
        (anterior[j] ?? Infinity) + 1,
        (actual[j - 1] ?? Infinity) + 1,
        (anterior[j - 1] ?? Infinity) + custo,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        melhor = Math.min(melhor, (anterior[j - 2] ?? Infinity) + 1);
      }
      actual.push(melhor);
    }
    anterior = actual;
  }
  return anterior[n] ?? Math.max(m, n);
}

/** O que falta da linha, para o `porque` dizer a coisa certa em vez de
 *  "a linha está errada". */
function descricao(esperado: string, obtido: string): { porque: string; remedio: string } {
  const ultimos = esperado.length > 0 ? esperado.slice(-1) : '';
  if (ultimos === ';' && obtido.replace(/\s+$/, '').endsWith(';') === false) {
    return {
      porque: 'Falta o ponto-e-vírgula no fim da linha.',
      remedio: 'Acrescenta ; no fim.',
    };
  }
  if (ultimos === ':' && obtido.includes(':') === false) {
    return {
      porque: 'Falta o dois pontos no fim da linha.',
      remedio: 'Acrescenta : no fim.',
    };
  }
  if (obtido === '') {
    return { porque: 'Esta linha falta.', remedio: 'Escreve a linha.' };
  }
  if (esperado.replace(/\s+/g, '') === obtido.replace(/\s+/g, '')) {
    return { porque: 'O espaçamento está diferente.', remedio: 'Iguala o espaçamento.' };
  }
  return {
    porque: `Esta linha está escrita de outra maneira. Aqui era: ${esperado}`,
    remedio: 'Copia a linha tal como está acima.',
  };
}

export function comparar(gerado: Gerado, texto: string): Relatorio {
  const esperadas = dividirEmLinhas(gerado.texto);
  const obtidas = dividirEmLinhas(texto);
  const divergencias: Divergencia[] = [];

  const maximo = Math.max(esperadas.length, obtidas.length);
  for (let i = 0; i < maximo; i += 1) {
    const esperado = esperadas[i] ?? '';
    const obtido = obtidas[i] ?? '';
    if (esperado === obtido) continue;
    if (distancia(esperado, obtido) <= TOLERANCIA_EDICAO) continue;
    const d = descricao(esperado, obtido);
    divergencias.push({ linha: i + 1, esperado, obtido, ...d });
  }

  return { ok: divergencias.length === 0, divergencias };
}
```

- [ ] **Step 5: Escrever `src/projecoes/avaliar.ts`**

```typescript
import { comparar } from '../nucleo/divergencia';
import { interpretar } from '../nucleo/semantica';
import type { BlocoLeigo } from '../nucleo/blocos';
import type { Erro, Language } from '../nucleo/tipos';
import { obter } from './registo';
import type { Gerado } from './tipos';

export function emitir(linguagem: Language, programa: BlocoLeigo): Gerado {
  return obter(linguagem).emit(programa);
}

/** A leitura de texto é em duas fases, e a ordem importa. Primeiro a projeção
 *  diz o que a linha diz — e recusa o que não é da linguagem dela. Depois o
 *  núcleo julga o que foi dito, com a política da linguagem. Se invertermos a
 *  ordem, o núcleo de Python vai julgar uma linha de Java e vamos ensinar
 *  Python a recusar coisas que não recusa. */
export function avaliarTexto(linguagem: Language, texto: string): Erro[] {
  const projecao = obter(linguagem);
  const lido = projecao.ler(texto);
  if (lido.erros.length > 0) return lido.erros;
  return interpretar(lido.eventos, projecao.policy, (passo) => ({
    bloco: 'texto',
    ranhura: 0,
    passo,
  }));
}

export type ClassesObservadas = 'Observacao' | 'Recusa' | 'FalhaRuntime';

export function classificar(erros: readonly Erro[]): ClassesObservadas {
  if (erros.some((e) => e.classe === 'Recusa')) return 'Recusa';
  if (erros.some((e) => e.classe === 'FalhaRuntime')) return 'FalhaRuntime';
  return 'Observacao';
}

export function bate(esperado: ClassesObservadas, erros: readonly Erro[]): boolean {
  return classificar(erros) === esperado;
}

export function divergir(linguagem: Language, programa: BlocoLeigo, texto: string) {
  return comparar(emitir(linguagem, programa), texto);
}
```

**Nota sobre `ClassesObservadas`:** só há três, e `QuebraEquivalencia` **não** está entre elas. A divergência entre blocos e texto é um erro de *comparação*, não um erro do programa: o programa está certo e o texto é que diverge, e uma sonda que espera `Recusa` nunca deve ser satisfeita por um erro de escrita. Se a lição precisar de distinguir, é um campo novo em `esperado`, não uma quarta classe.

- [ ] **Step 6: Correr os testes e ver passar**

Run: `npx vitest run src/nucleo/divergencia.test.ts src/projecoes/avaliar.test.ts`
Expected: PASS.

- [ ] **Step 7: Correr tudo**

Run: `npm test && npm run arvore && npx tsc --noEmit`
Expected: PASS, `núcleo limpo`, typecheck mudo.

- [ ] **Step 8: Commitar**

```bash
git add -A
git commit -m "feat: divergencia com tolerancia por linguagem, e avaliacao de texto em duas fases

avaliarTexto() le com a projecao da linguagem escolhida e julga com o
nucleo. A ordem e o que impede o erro grave: se o nucleo julgasse uma
linha de Java com a politica de Python, o produto ensinaria Python a
recusar coisas que nao recusa.

comparar() da Review Focus 4: em Java, esquecer o ; e uma divergencia
que diz que falta o ;, e nao 'linha invalida' nem 'funcao desconhecida'.
A tolerancia de 2 caracteres trata uma transposicao como 1, e nao como 2.
"
```

---

### Task 7: A licao em YAML, o carregador, e as sondas

A licao é um ficheiro YAML no Git. Não há painel de administracao, não ha base de dados, e isso é uma decisão de formato e não uma limitação: um `.yml` que se revê num `git diff` é a unica forma de uma licao ser corrigida por alguem que nao escreve codigo.

Duas regras desta tarefa são as que mais custam a descobrir depois:

- **Só `esperado.classe` é comparado com o motor.** `esperado.porque` é prosa escrita por uma pessoa e nunca é comparada com nada — se fosse, cada reescrita de uma frase faria o CI falhar, e a lição passaria a ser um teste de escrita.
- **`prova.forma` tem de bater com a familia da linguagem.** Uma sonda de SQL provada com um programa é um erro de autoria, e tem de aparecer como `FalhaRuntime` com razao, não como `TypeError`.

**Files:**
- Create: `src/conteudo/esquema.ts`, `src/conteudo/carregar.ts`, `src/conteudo/sondas.ts`, `src/conteudo/index.ts`
- Test: `src/conteudo/carregar.test.ts`, `src/conteudo/sondas.test.ts`

**Interfaces:**
- Consumes: Task 1 — `Language`, `Erro`; Task 2 — `BlocoLeigo`; Task 3 — `EventoLido`; Task 4 — `Projection`, `Gerado`, `obter`; Task 5 — `java`; Task 6 — `avaliarTexto`, `classificar`, `ClassesObservadas`, `emitir`.
- Produces: `Licao`, `Passo`, `Momento`, `Sonda`, `Esperado`, `Prova`, `Bloco`, `Fase`, `CARREGAR(texto, linguagem)`, `ErroDeAutoria`, `TEXTOS`, `LICSOES`, `temLicao(linguagem)`, `executarSonda(sonda, linguagem)`, `ResultadoSonda`, `FORMAS_POR_FAMILIA`.

- [ ] **Step 1: Escrever o teste falhado — o carregador**\n
`src/conteudo/carregar.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { CARREGAR, LICSOES, temLicao } from './carregar';
import variavelPython from './python/variavel.yml?raw';

describe('CARREGAR', () => {
  it('carrega a lição de Python', () => {
    const l = CARREGAR(variavelPython, 'python');
    expect(l.id).toBe('variavel');
    expect(l.linguagem).toBe('python');
    expect(l.titulo.length).toBeGreaterThan(0);
  });

  it('tem blocos suficientes para a lição ser percorrível', () => {
    const l = CARREGAR(variavelPython, 'python');
    expect(l.blocos.length).toBeGreaterThan(0);
  });

  it('tem pelo menos dois passos de explicaçao e dois de fazer', () => {
    const l = CARREGAR(variavelPython, 'python');
    expect(l.passos.filter((p) => p.fase === 'explicar').length).toBeGreaterThanOrEqual(2);
    expect(l.passos.filter((p) => p.fase === 'fazer').length).toBeGreaterThanOrEqual(2);
  });

  it('tem pelo menos um passo de nomear', () => {
    const l = CARREGAR(variavelPython, 'python');
    expect(l.passos.some((p) => p.fase === 'nomear')).toBe(true);
  });

  it('todo passo aponta para uma sonda, e toda sonda existe', () => {
    const l = CARREGAR(variavelPython, 'python');
    const nomes = l.sondas.map((s) => s.nome);
    for (const p of l.passos) {
      expect(nomes).toContain(p.sonda);
    }
  });

  it('toda sonda tem prova com forma e nomeada em minúsculas', () => {
    const l = CARREGAR(variavelPython, 'python');
    for (const s of l.sondas) {
      expect(s.prova.forma).toBe('programa');
      expect(s.nome).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('toda sonda tem esperado com classe e porque escrito à mão', () => {
    const l = CARREGAR(variavelPython, 'python');
    for (const s of l.sondas) {
      expect(['Observacao', 'Recusa', 'FalhaRuntime']).toContain(s.esperado.classe);
      expect(s.esperado.porque.length).toBeGreaterThan(20);
    }
  });

  it('toda sonda é provada com blocos ou com texto, nunca com os dois', () => {
    const l = CARREGAR(variavelPython, 'python');
    for (const s of l.sondas) {
      const temBlocos = s.prova.programa !== undefined;
      const temTexto = s.prova.texto !== undefined;
      expect(temBlocos !== temTexto).toBe(true);
    }
  });

  it('a prova é escrita nesta linguagem, e o emit confirma isso', () => {
    const l = CARREGAR(variavelPython, 'python');
    for (const s of l.sondas) {
      if (s.prova.forma !== 'programa' || s.prova.programa === undefined) continue;
      const texto = emitir('python', s.prova.programa).texto;
      expect(texto.length).toBeGreaterThan(0);
    }
  });

  it('o porque de um passo explica, não instrui', () => {
    const l = CARREGAR(variavelPython, 'python');
    for (const p of l.passos) {
      expect(p.porque.length).toBeGreaterThan(20);
    }
  });

  it('o titulo não é um slug', () => {
    expect(CARREGAR(variavelPython, 'python').titulo).not.toMatch(/^[a-z0-9-]+$/);
  });
});

describe('CARREGAR: recusas de autoria', () => {
  it('YAML partido falha com porque e com a linha, e não com um erro do js-yaml', () => {
    expect(() => CARREGAR('id: variavel\n  id: [quebrado', 'python'))
      .toThrow(/porque|linha/i);
  });

  it('linguagem que não é a do ficheiro é recusada', () => {
    expect(() => CARREGAR(variavelPython, 'java')).toThrow(/python/);
  });

  it('um passo que aponta para uma sonda inexistente é recusado pelo nome', () => {
    const mau = variavelPython.replace(/sonda: [a-z0-9-]+/, 'sonda: nao-existe');
    expect(() => CARREGAR(mau, 'python')).toThrow(/nao-existe/);
  });

  it('uma classe esperada que não existe é recusada com a lista das que existem', () => {
    const mau = variavelPython.replace(/classe: Observacao/, 'classe: Explosao');
    expect(() => CARREGAR(mau, 'python')).toThrow(/Explosao/);
    expect(() => CARREGAR(mau, 'python')).toThrow(/Observacao/);
  });

  it('um passo sem porque é recusado: a regra é nenhuma mensagem sem razao', () => {
    const mau = variavelPython.replace(/porque: ['"].+['"]/, 'porque: ""');
    expect(() => CARREGAR(mau, 'python')).toThrow(/porque/);
  });

  it('um passo sem momentos é recusado, porque nunca se completaria', () => {
    // Esta regra não é interface: é aritmética. `momentoActual` é
    // `momentos[momento]`, e uma lista vazia dá `undefined` para sempre —
    // o aluno ficaria preso num passo que não avança nem recusa.
    const mau = variavelPython.replace(/momentos:[\s\S]*?(?=\n  - fase:)/, 'momentos: []\n');
    expect(() => CARREGAR(mau, 'python')).toThrow(/momentos/);
  });

  it('um passo de fase nomear sem palavra é recusado', () => {
    // A regra protege a vista `nomear`. Sem uma palavra, o aluno lê o mesmo
    // parágrafo que lia na vista `explicar` e a lição perdeu um terço.
    const mau = variavelPython.replace(/\n    nomear: .+/, '');
    expect(() => CARREGAR(mau, 'python')).toThrow(/nomear/);
  });

  it('uma palavra nomeada num passo que não é de fase nomear é recusada', () => {
    // A palavra nomeada é o conteúdo da vista `nomear`. Num passo de fase
    // `fazer` seria uma segunda fonte de verdade: o `porque` e a palavra
    // nomeada poderiam dizer coisas diferentes, e o aluno veria as duas.
    const mau = variavelPython.replace('    nomear: ', '    porque2: ');
    expect(() => CARREGAR(mau, 'python')).toThrow(/não dá nome a nada/);
  });

  it('uma sonda sem pergunta é recusada: é a primeira coisa que o aluno lê', () => {
    // A `porque` da sonda é sobre a lição e nunca aparece no ecrã. A
    // `pergunta` é o inverso: aparece primeiro e sem mais nada à volta. Uma
    // sonda que só tem `porque` obriga o aluno a ler a nota de rodapé do
    // currículo antes de adivinhar o que a experiência vai fazer.
    const mau = variavelPython.replace(/pergunta: ['"].+['"]\n/, '');
    expect(() => CARREGAR(mau, 'python')).toThrow(/pergunta/);
  });

  it('uma fonte de momento que não existe é recusada com a lista', () => {
    const mau = variavelPython.replace('fonte: leitura', 'fonte: palpite');
    expect(() => CARREGAR(mau, 'python')).toThrow(/leitura/);
  });

  it('dois momentos com o mesmo id são recusados: o id é a chave do ficheiro', () => {
    const mau = variavelPython.replace(/(id: l1\n)/, '$1      id: l1\n');
    expect(() => CARREGAR(mau, 'python')).toThrow(/mesmo id/);
  });
});

describe('o registo de lições', () => {
  it('Python tem lição; Java ainda não', () => {
    expect(temLicao('python')).toBe(true);
    expect(temLicao('java')).toBe(false);
    expect(LICSOES).toEqual(['python']);
  });
});
```

- [ ] **Step 2: Escrever o teste falhado — as sondas**\n
`src/conteudo/sondas.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { executarSonda } from './sondas';
import { obter } from '../projecoes/registo';
import { guardar, log, pilha } from '../nucleo/testes/dados';
import type { Sonda } from './esquema';

function sondaDe(sobre: Partial<Sonda>): Sonda {
  return {
    nome: 'prova',
    porque: 'porque o teste existe, escrito à mão para ser lido',
    prova: { forma: 'programa', programa: pilha(guardar('total', 5)) },
    esperado: { classe: 'Observacao', porque: 'o programa corre e guarda um número sem dar erro nenhum' },
    ...sobre,
  };
}

describe('executarSonda com prova de programa', () => {
  it('passa quando a classe observada é a esperada', () => {
    const r = executarSonda(sondaDe({}), 'python');
    expect(r.ok).toBe(true);
    expect(r.observada).toBe('Observacao');
  });

  it('falha quando não é, e o relatório traz as duas classes', () => {
    const r = executarSonda(
      sondaDe({ esperado: { classe: 'Recusa', porque: 'aqui o robô recusa o número que é um texto' } }),
      'python',
    );
    expect(r.ok).toBe(false);
    expect(r.esperada).toBe('Recusa');
    expect(r.observada).toBe('Observacao');
  });

  it('o porque esperado nunca é comparado, só a classe', () => {
    // Escrever outra frase na lição não pode partir o CI. Este teste é a
    // garantia disso, e é o que impede a lição de virar um teste de escrita.
    const a = executarSonda(sondaDe({}), 'python');
    const b = executarSonda(
      sondaDe({ esperado: { classe: 'Observacao', porque: 'uma frase completamente diferente, com mais palavras' } }),
      'python',
    );
    expect(a.ok).toBe(b.ok);
  });

  it('o relatório tem porque, mesmo quando falha', () => {
    const r = executarSonda(
      sondaDe({ esperado: { classe: 'Recusa', porque: 'x'.repeat(30) } }),
      'python',
    );
    expect(r.porque.length).toBeGreaterThan(0);
  });

  it('o relatório tem o mesmo porque quando passa, para o git diff mostrar a mudança', () => {
    const r = executarSonda(sondaDe({}), 'python');
    expect(r.porque).toBe(sondaDe({}).porque);
  });

  it('o mesmo programa passa em Python e recusa em Java', () => {
    // A sonda da lição é a mesma; a resposta é que muda. É este teste que
    // diz que a lição de Java vai precisar da sua própria sonda, e não da
    // de Python com o texto trocado.
    const guardarTexto = pilha(guardar('total', 'olá'));
    expect(executarSonda(sondaDe({ prova: { forma: 'programa', programa: guardarTexto } }), 'python').ok).toBe(true);
    expect(executarSonda(sondaDe({ prova: { forma: 'programa', programa: guardarTexto } }), 'java').ok).toBe(false);
  });
});

describe('executarSonda com prova de texto', () => {
  it('lê o texto com a projeção da linguagem', () => {
    const r = executarSonda(
      sondaDe({ prova: { forma: 'programa', texto: 'total = 5\n' } }),
      'python',
    );
    expect(r.ok).toBe(true);
  });

  it('texto de outra linguagem é erro da sonda, não silêncio', () => {
    const r = executarSonda(
      sondaDe({ prova: { forma: 'programa', texto: 'total = 5\n' } }),
      'java',
    );
    expect(r.ok).toBe(false);
    expect(r.porque).toContain('java');
  });
});

describe('Review Focus 2: a forma tem de bater com a família', () => {
  it('uma forma que não existe é recusada com a lista das que existem', () => {
    const r = executarSonda(
      // @ts-expect-error — a forma inválida é o que se está a testar
      sondaDe({ prova: { forma: 'diagrama', programa: pilha(guardar('total', 5)) } }),
      'python',
    );
    expect(r.ok).toBe(false);
    expect(r.porque).toMatch(/programa|consulta/);
    expect(r.porque).toMatch(/diagrama/);
  });


```

O ponto 2 do `Review Focus` fica coberto pela forma inválida acima e pelo `validarForma()` do carregador, que recusa a forma errada para a família com a mensagem a dizer as duas. A forma `consulta` só é exercitada no Plano C, com a projeção de SQL — e o runner já a aceita, o que é o que faz o Plano C não precisar de mexer aqui.

- [ ] **Step 3: Correr os testes e ver falhar**\n
Run: `npx vitest run src/conteudo`
Expected: FAIL com erros de resolução de `./esquema`, `./carregar` e `./sondas`.

- [ ] **Step 4: Escrever `src/conteudo/esquema.ts`**\n
Este é o contrato entre o ficheiro YAML e o código. Cada campo tem uma regra, e a regra é testada no Step 1.\n
```typescript
import type { BlocoLeigo } from '../nucleo/blocos';
import type { ClassesObservadas } from '../projecoes/avaliar';

export type Fase = 'explicar' | 'fazer' | 'nomear';

export interface Bloco {
  type: string;
  fields?: Record<string, { valor: unknown }>;
  inputs?: Record<string, { valor: unknown } | { stack: BlocoLeigo[] }>;
}

export interface Prova {
  forma: 'programa' | 'consulta';
  /** Preenchido quando `forma` é `programa`. */
  programa?: BlocoLeigo;
  /** Preenchido quando `forma` é `consulta`, ou quando a prova é um excerto
   *  de código que o utilizador tem de ler. */
  texto?: string;
}

export interface Esperado {
  /** ÚNICO campo comparado com o motor. */
  classe: ClassesObservadas;
  /** Prosa de autoria. Nunca comparada com nada. */
  porque: string;
}

export interface Sonda {
  nome: string;
  /** A pergunta que se faz ao aluno antes de ele fazer a experiência. É a
   *  única coisa do ecrã que ele lê primeiro, e por isso está no esquema e
   *  não dentro da prosa do `porque`. */
  pergunta: string;
  /** Porque é que esta sonda está na lição. É sobre a lição, não sobre o
   *  aluno: nunca aparece no ecrã. */
  porque: string;
  prova: Prova;
  esperado: Esperado;
}

/** Uma pergunta de um passo. `fonte` decide o que acontece quando o aluno
 *  responde: `leitura` é a única cujas palavras são conferidas, e mesmo aí
 *  nenhuma resposta é errada — só não conta como resposta. */
export interface Momento {
  id: string;
  texto: string;
  /** Palavras que a resposta pode conter. Vazio significa que não se
   *  avalia: o produto nunca diz que a resposta está errada. */
  palavras: string[];
  fonte: 'blocos' | 'texto' | 'leitura';
}

export interface Passo {
  fase: Fase;
  porque: string;
  /** A palavra que este passo dá nome a. Só existe num passo de fase
   *  `nomear`, e é o que a vista `nomear` mostra grande. Sem este campo a
   *  vista `nomear` seria a vista `explicar` com outro rótulo — e o
   *  primeiro terço do método (explicar, fazer, nomear) deixaria de ter
   *  terceira parte. */
  nomear?: string;
  bloco: Bloco;
  /** O nome de uma sonda da lição. Uma sonda pode servir vários passos. */
  sonda: string;
  /** Uma pergunta de cada vez, pela ordem em que estão. O passo fica
   *  concluído quando todas estão feitas. */
  momentos: Momento[];
  /** O ficheiro que este passo manda ler. As linhas **não** são repetidas
   *  aqui: vêm da sonda nomeada em `sonda`, e há um só sítio onde o ficheiro
   *  existe. Um segundo sítio seria uma segunda versão do ficheiro, e as
   *  duas divergiriam sem ninguém dar por isso. */
  referencia?: { nome: string };
}

export interface Licao {
  id: string;
  linguagem: string;
  titulo: string;
  porqueTitulo: string;
  blocos: Bloco[];
  passos: Passo[];
  sondas: Sonda[];
  paraSaberQueFez: string;
}
```

- [ ] **Step 5: Escrever `src/conteudo/carregar.ts`**\n
```typescript
import { load } from 'js-yaml';
import variavelPython from './python/variavel.yml?raw';
import type { Licao } from './esquema';
import type { Language } from '../nucleo/tipos';
import { emitir } from '../projecoes/avaliar';
import { obter } from '../projecoes/registo';
import type { Projection } from '../projecoes/tipos';

export class ErroDeAutoria extends Error {
  constructor(readonly razao: string, readonly caminho: string) {
    super(`${caminho}: ${razao}`);
    this.name = 'ErroDeAutoria';
  }
}

/** As lições escritas, em código. Só entra aqui o que existe em
 *  `src/conteudo/<linguagem>/`. A lição de Java entra quando a Task que a
 *  escreve acontecer — e o `import` é o que a impede de entrar antes,
 *  porque um ficheiro que não existe não compila. */
const FONTES: Record<string, string> = {
  'python/variavel': variavelPython,
};

const FORMAS: Array<'programa' | 'consulta'> = ['programa', 'consulta'];
const CLASSES: Array<ClassesObservadas> = ['Observacao', 'Recusa', 'FalhaRuntime'];
const FASES = ['explicar', 'fazer', 'nomear'] as const;

function texto(v: unknown, caminho: string, regra: string): string {
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new ErroDeAutoria(`${regra}.`, caminho);
  }
  return v;
}

function lista(v: unknown, caminho: string): unknown[] {
  if (!Array.isArray(v)) throw new ErroDeAutoria('esperava-se uma lista.', caminho);
  return v;
}

function objeto(v: unknown, caminho: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new ErroDeAutoria('esperava-se um mapa.', caminho);
  }
  return v as Record<string, unknown>;
}

function validarForma(prova: Record<string, unknown>, caminho: string, projecao: Projection): void {
  const forma = texto(prova.forma, `${caminho}.forma`, 'a forma da prova é obrigatória');
  if (!FORMAS.includes(forma as 'programa')) {
    throw new ErroDeAutoria(
      `forma "${forma}" não existe. As formas são: ${FORMAS.join(', ')}.`,
      `${caminho}.forma`,
    );
  }
  const temPrograma = prova.programa !== undefined;
  const temTexto = prova.texto !== undefined;
  if (temPrograma === temTexto) {
    throw new ErroDeAutoria(
      'a prova tem de ter `programa` ou `texto`, nunca os dois e nunca nenhum.',
      caminho,
    );
  }
  // O ponto 2 do Review Focus: a forma tem de bater com a família.
  const esperadas: Record<'imperativa' | 'declarativa', string> = {
    imperativa: 'programa',
    declarativa: 'consulta',
  };
  const correcta = esperadas[projecao.familia];
  if (forma !== correcta) {
    throw new ErroDeAutoria(
      `esta lição é ${projecao.familia}, e uma prova ${correcta} prova-a. ` +
      `A forma "${forma}" pertence a outra família.`,
      `${caminho}.forma`,
    );
  }
  if (forma === 'programa') {
    emitir(projecao.linguagem, prova.programa as never);
  }
}

function validarSonda(bruto: unknown, caminho: string, projecao: Projection): Licao['sondas'][number] {
  const o = objeto(bruto, caminho);
  const nome = texto(o.nome, `${caminho}.nome`, 'a sonda precisa de nome em minúsculas');
  if (!/^[a-z0-9-]+$/.test(nome)) {
    throw new ErroDeAutoria(
      `"${nome}" não serve: o nome é um identificador em minúsculas, com hífen no lugar dos espaços.`,
      `${caminho}.nome`,
    );
  }
  const pergunta = texto(o.pergunta, `${caminho}.pergunta`, 'a sonda precisa da pergunta que se faz ao aluno');
  const porque = texto(o.porque, `${caminho}.porque`, 'a sonda precisa de um porque escrito à mão');
  const prova = objeto(o.prova, `${caminho}.prova`);
  validarForma(prova, `${caminho}.prova`, projecao);
  const esperado = objeto(o.esperado, `${caminho}.esperado`);
  const classe = texto(esperado.classe, `${caminho}.esperado.classe`, 'a classe esperada é obrigatória');
  if (!CLASSES.includes(classe as ClassesObservadas)) {
    throw new ErroDeAutoria(
      `a classe "${classe}" não existe. As classes são: ${CLASSES.join(', ')}.`,
      `${caminho}.esperado.classe`,
    );
  }
  return {
    nome,
    pergunta,
    porque,
    prova: {
      forma: prova.forma as 'programa' | 'consulta',
      ...(prova.programa !== undefined ? { programa: prova.programa as never } : {}),
      ...(prova.texto !== undefined ? { texto: String(prova.texto) } : {}),
    },
    esperado: {
      classe: classe as ClassesObservadas,
      porque: texto(esperado.porque, `${caminho}.esperado.porque`, 'o porque esperado é obrigatório'),
    },
  };
}

export function CARREGAR(textoYaml: string, linguagem: Language): Licao {
  let bruto: unknown;
  try {
    bruto = load(textoYaml);
  } catch (e) {
    throw new ErroDeAutoria(
      `o YAML não está bem formado, e a linha ${(e as { mark?: { line: number } }).mark?.line ?? '?'} é a suspeita. ` +
      `A mensagem do analisador é: ${(e as Error).message}`,
      `${linguagem}/variavel.yml`,
    );
  }
  const o = objeto(bruto, `${linguagem}/variavel.yml`);
  const declarada = texto(o.linguagem, 'linguagem', 'o ficheiro tem de declarar a sua linguagem');
  if (declarada !== linguagem) {
    throw new ErroDeAutoria(
      `este ficheiro é de ${declarada}, e foi pedido como ${linguagem}. ` +
      `Cada linguagem tem o seu ficheiro, e não se misturam.`,
      'linguagem',
    );
  }
  const projecao = obter(linguagem);

  const blocos = lista(o.blocos, 'blocos').map((b, i) => objeto(b, `blocos[${i}]`));
  const sondas = lista(o.sondas, 'sondas').map((s, i) => validarSonda(s, `sondas[${i}]`, projecao));
  const nomes = new Set(sondas.map((s) => s.nome));
  if (nomes.size !== sondas.length) {
    throw new ErroDeAutoria('há duas sondas com o mesmo nome.', 'sondas');
  }

  const passos = lista(o.passos, 'passos').map((brutoPasso, i) => {
    const caminho = `passos[${i}]`;
    const p = objeto(brutoPasso, caminho);
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
    const momentos = lista(p.momentos ?? [], `${caminho}.momentos`).map((brutoMomento, m) => {
      const mCaminho = `${caminho}.momentos[${m}]`;
      const mo = objeto(brutoMomento, mCaminho);
      const fonte = texto(mo.fonte, `${mCaminho}.fonte`, 'o momento tem de dizer de onde vem a resposta');
      if (!(['blocos', 'texto', 'leitura'] as const).includes(fonte as 'blocos')) {
        throw new ErroDeAutoria(
          `a fonte "${fonte}" não existe. São: blocos, texto, leitura.`,
          `${mCaminho}.fonte`,
        );
      }
      const palavras = lista(mo.palavras ?? [], `${mCaminho}.palavras`).map((x, k) =>
        texto(x, `${mCaminho}.palavras[${k}]`, 'uma palavra tem de ser texto'),
      );
      return {
        id: texto(mo.id, `${mCaminho}.id`, 'o momento precisa de um id'),
        texto: texto(mo.texto, `${mCaminho}.texto`, 'o momento precisa da pergunta'),
        palavras,
        fonte: fonte as 'blocos' | 'texto' | 'leitura',
      };
    });
    const temNomear = p.nomear !== undefined;
    if (fase === 'nomear' && !temNomear) {
      throw new ErroDeAutoria(
        'um passo de fase "nomear" tem de dar nome a uma palavra, senão é um passo de fase "explicar" com o rótulo trocado.',
        `${caminho}.nomear`,
      );
    }
    if (fase !== 'nomear' && temNomear) {
      throw new ErroDeAutoria(
        `este passo é de fase "${fase}" e por isso não dá nome a nada. A palavra "${texto(p.nomear, `${caminho}.nomear`, '')}" não é de aqui.`,
        `${caminho}.nomear`,
      );
    }
    if (momentos.length === 0) {
      throw new ErroDeAutoria(
        'um passo sem momentos nunca se completa, e o aluno não sabe quando pode avançar.',
        `${caminho}.momentos`,
      );
    }
    const ids = new Set(momentos.map((m) => m.id));
    if (ids.size !== momentos.length) {
      throw new ErroDeAutoria('há dois momentos com o mesmo id neste passo.', `${caminho}.momentos`);
    }
    return {
      fase: fase as (typeof FASES)[number],
      porque: texto(p.porque, `${caminho}.porque`, 'o passo precisa de um porque'),
      ...(p.nomear === undefined ? {} : { nomear: texto(p.nomear, `${caminho}.nomear`, 'a palavra nomeada não pode ser vazia') }),
      bloco: objeto(p.bloco, `${caminho}.bloco`),
      sonda,
      momentos,
      ...(p.referencia === undefined
        ? {}
        : { referencia: { nome: texto(objeto(p.referencia, `${caminho}.referencia`).nome, `${caminho}.referencia.nome`, 'a referência precisa de um nome') } }),
    };
  });

  for (const b of blocos) {
    const tipo = texto(b.type, 'blocos[].type', 'o bloco precisa de um type');
    if (!projecao.blocos.includes(tipo) && !['pilha'].includes(tipo)) {
      throw new ErroDeAutoria(
        `o bloco "${tipo}" não é do vocabulário desta linguagem (${projecao.blocos.join(', ')}).`,
        'blocos[].type',
      );
    }
  }

  return {
    id: texto(o.id, 'id', 'a lição precisa de um id'),
    linguagem,
    titulo: texto(o.titulo, 'titulo', 'a lição precisa de um título que se leia'),
    porqueTitulo: texto(o.porqueTitulo, 'porqueTitulo', 'o título precisa de uma razão'),
    blocos: blocos as Licao['blocos'],
    passos,
    sondas,
    paraSaberQueFez: texto(o.paraSaberQueFez, 'paraSaberQueFez', 'a lição precisa de dizer quando acabou'),
  };
}

export const TEXTOS: Record<string, string> = FONTES;

export function temLicao(linguagem: Language): boolean {
  return TEXTOS[`${linguagem}/variavel`] !== undefined;
}

/** As linguagens que têm lição escrita, por ordem do núcleo. Derivado, e
 *  não escrito à mão: a primeira versão deste ficheiro dizia
 *  `['python', 'java']` e o teste dizia `['python']`, porque a lição de
 *  Java ainda não existe. Um array escrito à mão é uma lista de intenções;
 *  este é uma lista de ficheiros. */
export const LICSOES: Language[] = LINGUAGENS.filter(temLicao);
```

- [ ] **Step 6: Escrever `src/conteudo/sondas.ts`**\n
```typescript
import { avaliarTexto, classificar, emitir } from '../projecoes/avaliar';
import type { ClassesObservadas } from '../projecoes/avaliar';
import { obter } from '../projecoes/registo';
import type { Language } from '../nucleo/tipos';
import type { Sonda } from './esquema';

export interface ResultadoSonda {
  ok: boolean;
  nome: string;
  esperada: ClassesObservadas;
  observada: ClassesObservadas;
  /** O porque da sonda, escrito à mão. Vai para o relatório para que o
   *  `git diff` de uma alteração de conteúdo se leia. */
  porque: string;
  erro: string | null;
}

const FORMAS: Array<'programa' | 'consulta'> = ['programa', 'consulta'];

export function executarSonda(sonda: Sonda, linguagem: Language): ResultadoSonda {
  const vazio = (motivo: string): ResultadoSonda => ({
    ok: false,
    nome: sonda.nome,
    esperada: sonda.esperado.classe,
    observada: 'Observacao',
    porque: sonda.porque,
    erro: motivo,
  });

  const forma = sonda.prova.forma;
  if (!FORMAS.includes(forma)) {
    return vazio(
      `a forma "${String(forma)}" não existe. As formas são: ${FORMAS.join(', ')}.`,
    );
  }

  const projecao = obter(linguagem);
  const correctas: Record<'imperativa' | 'declarativa', 'programa' | 'consulta'> = {
    imperativa: 'programa',
    declarativa: 'consulta',
  };
  if (forma !== correctas[projecao.familia]) {
    return vazio(
      `a sonda está provada com "${forma}", e uma lição ${projecao.familia} prova-se com "${correctas[projecao.familia]}".`,
    );
  }

  let observada: ClassesObservadas;
  let erro: string | null = null;
  if (sonda.prova.programa !== undefined) {
    observada = classificar(
      avaliarTexto(linguagem, emitir(linguagem, sonda.prova.programa).texto),
    );
  } else {
    const erros = avaliarTexto(linguagem, sonda.prova.texto ?? '');
    observada = classificar(erros);
    const primeiro = erros[0];
    if (primeiro !== undefined) erro = `${primeiro.porque} ${primeiro.remedio}`;
  }

  return {
    ok: observada === sonda.esperado.classe,
    nome: sonda.nome,
    esperada: sonda.esperado.classe,
    observada,
    porque: sonda.porque,
    erro,
  };
}
```

- [ ] **Step 7: Escrever `src/conteudo/index.ts`**\n
```typescript
export { CARREGAR, ErroDeAutoria, temLicao, LICSOES, TEXTOS } from './carregar';
export { executarSonda } from './sondas';
export type { Licao, Passo, Momento, Sonda, Esperado, Prova, Bloco, Fase } from './esquema';
```

- [ ] **Step 8: Correr os testes e ver falhar**\n
Run: `npx vitest run src/conteudo`
Expected: FAIL — `./python/variavel.yml?raw` não existe ainda, e `./esquema` também não.

- [ ] **Step 9: Commitar o esquema sem o conteúdo**\n
```bash
git add -A
git commit -m \"feat: esquema da licao em YAML, carregador, e runner de sondas

So esperado.classe e comparado com o motor. esperado.porque e prosa de
autoria e nunca e comparada, e ha um teste que fixa isso: escrever outra
frase na licao nao pode partir o CI. Sem isso a licao vira um teste de
escrita e ninguem mexe nela.

validarForma() recusa a forma que nao bate com a familia da linguagem, e
a mensagem diz as duas formas em vez de rebentar com um TypeError.
"
```

**Nota:** o commit não passa nos testes ainda — `./python/variavel.yml` não existe. Isso é propositado e é a Task 8: o esquema é verde sobre conteúdo, e o conteúdo é a tarefa seguinte. Corra `npm test` e veja a falha ser a de ficheiro em falta, e só essa.

---

### Task 8: A lição de Python — o conteúdo

Esta é a tarefa de que a spec §16.1 fala: **é aqui que se descobre se o formato da sonda estava certo.** Se escrever um passo desta lição levar mais de uma tarde, o formato está errado e pára-se aqui — antes da segunda lição, não antes da sexta. Não se escreve a lição de Java até esta estar verde e o tempo medido.

O ficheiro tem quinze linhas porque o critério de sucesso da spec é o utilizador abrir um ficheiro de quinze linhas que nunca viu e dizer o que cada linha faz. Quinze linhas é o ficheiro, não um exemplo.

**Files:**
- Create: `src/conteudo/python/variavel.yml`
- Test: `src/conteudo/python/variavel.test.ts`

**Interfaces:**
- Consumes: Task 7 — `CARREGAR`, `executarSonda`, `Licao`, `Passo`, `Momento`, `Sonda`; Task 6 — `avaliarTexto`, `classificar`.
- Produces: `src/conteudo/python/variavel.yml`, e a **prova** de que o formato da sonda aguenta uma lição inteira. A Task 13 transforma essa prova em decisão.

- [ ] **Step 1: Escrever o teste que exige as sete linhas da leitura**

`src/conteudo/python/variavel.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { CARREGAR } from '../carregar';
import { executarSonda } from '../sondas';
import { avaliarTexto, classificar } from '../../projecoes/avaliar';
import variavelPython from './variavel.yml?raw';

const licao = CARREGAR(variavelPython, 'python');
const porNome = new Map(licao.sondas.map((s) => [s.nome, s]));

describe('o ficheiro de leitura tem quinze linhas', () => {
  const leitura = licao.passos.find((p) => p.fase === 'fazer' && p.sonda === 'leitura-completa')!;

  it('a lição tem uma sonda de leitura completa', () => {
    expect(leitura).toBeDefined();
  });

  it('o texto lido tem quinze linhas', () => {
    const texto = porNome.get('leitura-completa')!.prova.texto!;
    expect(texto.trimEnd().split('\n')).toHaveLength(15);
  });

  it('a linha que rebenta está longe da linha que a estragou', () => {
    // A propriedade mais importante da lição, e a que se pede ao aluno que
    // veja. Se o sintoma estiver na causa, a lição ensina que o sintoma
    // aponta para a causa — e isso é falso.
    //
    // Neste ficheiro o par é a linha 10 (`total = 'olá'`, que estraga) e a
    // linha 15 (`total = total + preco`, que rebenta): cinco linhas de
    // distância, e sem nenhuma pista no meio.
    const linhas = porNome
      .get('o-que-o-ficheiro-diz')!
      .prova.texto!.trimEnd()
      .split('\n')
      .map((l) => l.trim());
    const estragou = linhas.indexOf("total = 'olá'");
    const rebentou = linhas.indexOf('total = total + preco');
    expect(estragou).toBeGreaterThanOrEqual(0);
    expect(rebentou).toBeGreaterThanOrEqual(0);
    // Cinco linhas, e o teste diz cinco. Um teste que só dissesse "vem
    // depois" passaria se alguém encurtasse o ficheiro para duas linhas, e
    // a lição continuaria a parecer correcta no `git log`.
    expect(rebentou - estragou).toBe(5);
    // A linha que rebenta usa `total`, e é por isso que o ficheiro é um
    // bom ficheiro: `total` é um nome, e o nome continua a ser o mesmo
    // depois de o valor mudar de lado. Não há nada no meio que diga "a
    // causa foi a linha 10" — quem lê tem de voltar atrás e ver que, aí,
    // `total` deixou de ser um número. A distância é que faz o trabalho.
    expect(linhas[rebentou]).toBe('total = total + preco');
    // E a *segunda* linha `print(total)` — a linha 11, que mostra o valor já
    // estragado — está entre as duas. `indexOf` devolveria a primeira, que
    // é a linha 7 e ainda mostra um número; é `lastIndexOf` que dá a pista.
    const mostraDepois = linhas.lastIndexOf('print(total)');
    expect(mostraDepois).toBeGreaterThan(estragou);
    expect(mostraDepois).toBeLessThan(rebentou);
    // E a primeira está antes de tudo, a mostrar um número a sério.
    expect(linhas.indexOf('print(total)')).toBeLessThan(estragou);
  });

  it('e a primeira linha a rebentar é a função que não existe, não o tipo', () => {
    const linhas = porNome
      .get('o-que-o-ficheiro-diz')!
      .prova.texto!.trimEnd()
      .split('\n')
      .map((l) => l.trim());
    // `log` não é uma falha de tipo. É uma função que não escreveste, e o
    // Python só diz isso a correr. A lição tem de não misturar as duas
    // coisas, que é a confusão mais comum de quem está a começar.
    expect(linhas.indexOf('log(total)')).toBeGreaterThan(linhas.indexOf("total = 'olá'"));
  });

  it('cada linha do ficheiro é lida sem erro de sintaxe, menos as que devem falhar', () => {
    const texto = porNome.get('leitura-completa')!.prova.texto!;
    const erros = avaliarTexto('python', texto);
    // O ficheiro é válido como Python até `log`, que é a função que não
    // existe. Uma recusa a mais ou a menos aqui significa que o `ler` mente.
    const deSintaxe = erros.filter((e) => e.porque.includes('não é Python'));
    expect(deSintaxe).toEqual([]);
  });
});

describe('a lição tem a forma que a spec pede', () => {
  it('os três tempos aparecem, e o último passo é um NOMEAR', () => {
    const fases = licao.passos.map((p) => p.fase);
    expect(fases[0]).toBe('explicar');
    expect(fases).toContain('fazer');
    expect(fases).toContain('nomear');
    expect(fases.at(-1)).toBe('nomear');
  });

  it('ninguém nomeia antes de fazer: há sempre um FAZER antes do primeiro NOMEAR', () => {
    const fases = licao.passos.map((p) => p.fase);
    expect(fases.indexOf('fazer')).toBeLessThan(fases.indexOf('nomear'));
  });

  it('as palavras nomeadas são as três da lição, e são palavras', () => {
    // O `nomear` não é uma quarta fase com mais texto: é a fase em que a
    // palavra aparece sozinha, grande, e é a palavra que o aluno leva. Por
    // isso o limite é de palavras e não de frases — "erro de execução" são
    // duas, e "atribuição" é uma; uma frase inteira aqui seria a vista
    // `explicar` de novo, e o aluno sairia dela sem nome nenhum.
    const nomeadas = licao.passos.filter((p) => p.fase === 'nomear').map((p) => p.nomear!);
    expect(nomeadas).toEqual(['variável', 'atribuição', 'erro de execução']);
    for (const palavra of nomeadas) {
      // Três palavras é uma locução, como "erro de execução". Quatro já
      // seria uma frase, e uma frase aqui é a vista `explicar` de novo.
      expect(palavra.split(' ').length).toBeLessThanOrEqual(3);
      // Só minúsculas e acentos do português, mais espaços. Sem ponto final
      // — o ponto é do `porque`, não da palavra — e sem maiúscula, porque a
      // palavra é nomeada e não iniciada.
      expect(palavra).toMatch(/^[a-záàâãéêíóôõúç ]+$/);
    }
  });

  it('a palavra nomeada aparece também escrita no porque do passo', () => {
    // Se a palavra só estivesse no campo `nomear`, o `porque` e a palavra
    // seriam duas fontes de verdade. Ler a vista `nomear` e ler o `porque`
    // têm de dar a mesma palavra.
    for (const passo of licao.passos) {
      if (!passo.nomear) continue;
      expect(passo.porque.toLowerCase()).toContain(passo.nomear.toLowerCase());
    }
  });

  it('todo passo tem pelo menos um momento, e nenhum momento se repete', () => {
    // A regra da T7: um passo sem momentos nunca se completa. E um id
    // repetido faz o `feito` de dois momentos ser o mesmo registo, que é a
    // forma mais discreta de um passo dar-se por concluído sem estar.
    for (const passo of licao.passos) {
      expect(passo.momentos.length).toBeGreaterThan(0);
      expect(new Set(passo.momentos.map((m) => m.id)).size).toBe(passo.momentos.length);
    }
  });

  it('a ficha tem uma pergunta por linha do ficheiro, e são 15', () => {
    const ficha = licao.passos.find((p) => p.referencia !== undefined);
    expect(ficha).toBeDefined();
    const linhas = porNome
      .get(ficha!.sonda)!
      .prova.texto!.trimEnd()
      .split('\n');
    expect(ficha!.momentos).toHaveLength(linhas.length);
    expect(ficha!.momentos).toHaveLength(15);
    // Uma pergunta por linha, pela mesma ordem. A pergunta `lN` é a da
    // linha `N`, e é isso que permite dizer "a linha 10" ao aluno e dizer
    // a ele o que é que está a perguntar.
    expect(ficha!.momentos.map((m) => m.id)).toEqual(linhas.map((_, i) => `l${i + 1}`));
  });

  it('as perguntas da ficha aceitam várias palavras, e nenhuma resposta é errada', () => {
    const ficha = licao.passos.find((p) => p.referencia !== undefined)!;
    for (const m of ficha.momentos) {
      expect(m.fonte).toBe('leitura');
      // Três ou mais sinónimos por pergunta. Uma pergunta com uma palavra
      // só é um teste de ortografia disfarçado de pergunta.
      expect(m.palavras.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('o ficheiro só existe num sítio: a referência aponta, não repete', () => {
    // A referência tem um nome e nada mais. As linhas estão na sonda, e um
    // segundo sítio seria uma segunda versão do ficheiro — a que divergiria
    // sem ninguém dar por isso, e a lição deixaria de ser sobre o ficheiro
    // que o aluno está a ler.
    const ficha = licao.passos.find((p) => p.referencia !== undefined)!;
    expect(Object.keys(ficha.referencia!)).toEqual(['nome']);
    expect(porNome.has(ficha.sonda)).toBe(true);
  });

  it('nenhum momento de fora da ficha finge avaliar a resposta', () => {
    // `palavras: []` significa "não se avalia". Um momento fora da ficha com
    // palavras seria o produto a inventar um certo e um errado onde só
    // há blocos e sintaxe.
    for (const passo of licao.passos) {
      if (passo.referencia) continue;
      for (const m of passo.momentos) {
        expect(m.palavras).toEqual([]);
        expect(m.fonte).toBe('blocos');
      }
    }
  });

  it('toda sonda escrita é ensinada por pelo menos um passo', () => {
    // Uma sonda que nenhum passo usa é conteúdo morto: o teste "todas as
    // sondas passam" dá-lhe verde e o aluno nunca a vê. Este é o teste que
    // apanha uma sonda órfã na hora em que se escreve, e não meses depois.
    const usadas = new Set(licao.passos.map((p) => p.sonda));
    expect(licao.sondas.map((s) => s.nome).filter((n) => !usadas.has(n))).toEqual([]);
  });

  it('nenhum passo tem porque vazio, e nenhum é uma instrução', () => {
    for (const p of licao.passos) {
      expect(p.porque.length).toBeGreaterThan(30);
      expect(p.porque).not.toMatch(/^clique|^escreva|^faça |^preste atenção/);
    }
  });

  it('o porque explica, e o título diz o que se aprende', () => {
    expect(licao.titulo).toContain('variável');
    expect(licao.porqueTitulo.length).toBeGreaterThan(30);
  });

  it('diz quando acabou, e não é "acerta todos os exercícios"', () => {
    expect(licao.paraSaberQueFez).not.toMatch(/acerta|acerte|completar todos/i);
    expect(licao.paraSaberQueFez.length).toBeGreaterThan(20);
  });

  it('nenhum texto da lição cita outra linguagem', () => {
    const tudo = JSON.stringify(licao);
    expect(tudo).not.toMatch(/Java|Go\b|TypeScript|SQL|JavaScript/);
  });
});

describe('a lição conta a verdade da tabela de segurança da spec §7', () => {
  it('Python não protege: a lição diz isso, e diz onde a culpa aparece', () => {
    const s = porNome.get('texto-que-nao-e-numero')!;
    expect(s.esperado.classe).toBe('Observacao');
    expect(s.esperado.porque).toMatch(/não avisa|não recusa|aceita/);
  });

  it('e a mesma linha mais adiante já falha, e a sonda diz FalhaRuntime', () => {
    const s = porNome.get('a-divisao-que-nao-existe')!;
    expect(s.esperado.classe).toBe('FalhaRuntime');
  });

  it('e a lição de Python não tem uma única Recusa — e o teste diz isso', () => {
    // A spec §7 dá a resposta de Python como "não protege, rebenta mais
    // tarde". Uma sonda com `Recusa` seria uma mentira: em Python escrito
    // directamente não há recusa nenhuma. A recusa existe no robô e no
    // painel de texto, que são a Task 11, e não se medem aqui.
    //
    // Este teste existe para ninguém "acrescentar uma sonda de Recusa" para
    // a lição parecer mais completa do que a linguagem é.
    const recusas = licao.sondas.filter((s) => s.esperado.classe === 'Recusa');
    expect(recusas.map((r) => r.nome)).toEqual([]);
  });

  it('e nenhuma sonda da lição promete que o Python recusa', () => {
    for (const s of licao.sondas) {
      expect(s.esperado.porque).not.toMatch(/o Python recusa|Python recusa antes/i);
    }
  });
});

describe('todas as sondas passam', () => {
  for (const sonda of licao.sondas) {
    it(`${sonda.nome} passa`, () => {
      const r = executarSonda(sonda, 'python');
      expect(r.erro ?? r.porque).toBeTruthy();
      expect({ nome: r.nome, ok: r.ok, erro: r.erro }).toEqual({ nome: sonda.nome, ok: true, erro: null });
    });
  }
});

describe('as sondas que a spec §7 obriga', () => {
  it('cada linha da tabela de segurança tem a sua sonda, e a classe é a da spec', () => {
    // §7: para Python a resposta é "não protege, e rebenta mais tarde". A
    // lição tem de ter as duas metades: a que aceita e a que rebenta.
    expect(classificar(avaliarTexto('python', "total = 'olá'\n"))).toBe('Observacao');
    expect(classificar(avaliarTexto('python', "total = 'olá'\nprint(total)\n"))).toBe('FalhaRuntime');
  });
});
```

**Sobre o `print(total)` no fim do ficheiro:** é a linha que fecha a lição. Depois de `log(total)` rebentar, o `total` é um texto, e `total = total + preco` é texto com número — a mesma falha, outra vez, e desta vez caused por uma linha que está a dez de distância da causa. Sem esta linha o ficheiro ainda lia, mas perdia-se a segunda demonstração.

- [ ] **Step 2: Escrever `src/conteudo/python/variavel.yml`**

```yaml
# A lição "O que é uma variável", em Python.
#
# Este ficheiro é o currículo. Não há painel de administração nem base de
# dados: uma lição é um YAML que se revê num `git diff`, e quem o corrige
# não precisa de escrever código.
#
# Duas regras que o carregador impõe e que valem para todas as lições:
#   - só `esperado.classe` é comparado com o motor
#   - `esperado.porque` é prosa de autoria e nunca é comparada com nada

id: variavel
linguagem: python
titulo: O que é uma variável
porqueTitulo: >
  Uma variável é um nome que se dá a um valor para o usar mais tarde. E o
  valor tem um tipo, e é esse tipo — não a variável — que decide o que se
  pode fazer a seguir. Esta lição é sobre essa decisão.

paraSaberQueFez: >
  Consegues ler um ficheiro de Python que nunca viste e dizer, linha a
  linha, o que ela faz e o que a segura quando erra. Se chegaste a ler o
  `log(total)` e a dizer que rebenta quando o código corre — e não antes —
  chegaste.

blocos:
  - type: guardar
    fields:
      NOME:
        valor: total
    inputs:
      VALOR:
        valor: 5
  - type: repetir
    inputs:
      PASSOS:
        valor: 3
      CORPO:
        stack:
          - type: guardar
            fields:
              NOME:
                valor: total
            inputs:
              VALOR:
                ref: total
  - type: dizer
    inputs:
      VALOR:
        ref: total
  - type: log
    inputs:
      VALOR:
        ref: total

sondas:
  - nome: guarda-um-numero
    pergunta: 'O que vai aparecer no ecrã?'
    porque: >
      A forma mais simples de guardar: um nome, um sinal de igual, e um
      número. Nada mais acontece, e é por isso que é o primeiro exemplo.
    prova:
      forma: programa
      programa:
        type: guardar
        fields:
          NOME:
            valor: total
        inputs:
          VALOR:
            valor: 5
    esperado:
      classe: Observacao
      porque: >
        Guarda um número e não dá erro nenhum. É o caminho feliz, e o
        ficheiro fica com uma linha nova.

  - nome: guarda-um-texto

    pergunta: 'Trocar o número por uma palavra muda o que aparece?'
    porque: >
      O mesmo gesto, com um texto em vez de um número. Repara que o nome
      não muda e a forma não muda: muda o que lá está dentro.
    prova:
      forma: programa
      programa:
        type: guardar
        fields:
          NOME:
            valor: nome
        inputs:
          VALOR:
            valor: olá
    esperado:
      classe: Observacao
      porque: >
        Um texto entre aspas é um texto, e o Python guarda-o sem dizer nada.

  - nome: repete-tres-vezes

    pergunta: 'O número que aparece é o que estava guardado, ou é outro?'
    porque: >
      O ciclo corre três vezes. A linha de baixo é executada três vezes, e
      é por isso que um `for` muda o que um programa faz sem mudar o que
      está escrito.
    prova:
      forma: programa
      programa:
        type: repetir
        inputs:
          PASSOS:
            valor: 3
          CORPO:
            stack:
              - type: guardar
                fields:
                  NOME:
                    valor: x
                inputs:
                  VALOR:
                    valor: 1
    esperado:
      classe: Observacao
      porque: >
        Três voltas de uma atribuição simples. Corre, e não dá erro.

  - nome: texto-que-nao-e-numero

    pergunta: 'Esta linha dá erro?'
    porque: >
      Esta é a sonda que faz a lição. Guardar um texto num sítio onde se
      espera um número **não dá erro nenhum em Python**. A lição tem de
      Resistir à tentação de dizer que dá.
    prova:
      forma: programa
      texto: "total = 'olá'\n"
    esperado:
      classe: Observacao
      porque: >
        Python não avisa. Aceita o texto e segue em frente, e a culpa vai
        aparecer mais abaixo, na linha que usa o valor como número.

  - nome: a-divisao-que-nao-existe

    pergunta: 'O que acontece quando se soma uma palavra a um número?'
    porque: >
      A outra metade da mesma verdade. Guardar texto foi aceite; usar esse
      texto como número é que rebenta — e rebenta agora, a correr.
    prova:
      forma: programa
      texto: |
        total = 'olá'
        print(total)
    esperado:
      classe: FalhaRuntime
      porque: >
        O texto chegou a um sítio que precisa de um número, e aí sim falha.
        Repara que a linha que falha é a segunda, e a que está errada é a
        primeira. Esta é a lição de Python em duas linhas: o sintoma não
        está onde está a causa.

  - nome: a-divisao-por-uma-funcao-que-nao-existe

    pergunta: 'O que acontece quando o código chama por uma função que não escreveste?'
    porque: >
      `log` é uma função que ainda não escreveste. Em Python isso só se
      descobre quando o código corre, e o erro aparece na linha do `log`,
      muito depois de a causa estar resolvida.
    prova:
      forma: programa
      texto: |
        total = 5
        log(total)
    esperado:
      classe: FalhaRuntime
      porque: >
        A função não existe, e o Python não avisa antes de correr. É a
        mesma história da linha anterior, com outro nome: o Python deixa-te
        escrever e cobra-te depois.

  - nome: variavel-que-nunca-foi-guardada

    pergunta: 'O Python adivinha o que querias dizer, ou recusa?'
    porque: >
      Usar um nome que não foi guardado. O Python não adivinha o que
      querias dizer, e esta recusa é a única que é dele — e note-se que
      acontece *antes* de correr, ao contrário de tudo o que viste até
      agora. Há coisas que o Python apanha logo, e há coisas que só
      apanha tarde.
    prova:
      forma: programa
      texto: "print(total)\n"
    esperado:
      classe: FalhaRuntime
      porque: >
        Não há nada guardado com esse nome. Todas as linguagens param aqui,
        todas com a mesma resposta: o nome não existe.

  - nome: o-que-o-ficheiro-diz

    pergunta: 'Este ficheiro de quinze linhas corre até ao fim?'
    porque: >
      O ficheiro inteiro, lido de uma vez. Esta é a soma da lição: se isto
      passar, o ficheiro de quinze linhas é legível.
    prova:
      forma: programa
      texto: |
        total = 5
        preco = 3
        nome = 'olá'
        pronto = True
        for _ in range(3):
            total = total + 1
        print(total)
        print(nome)
        print(preco)
        total = 'olá'
        print(total)
        log(total)
        pronto = False
        print(pronto)
        total = total + preco
    esperado:
      classe: FalhaRuntime
      porque: >
        Lê-se até `log`, que rebenta. Depois disso o `total` é um texto e
        a soma do fim é texto com número. As duas linhas que falham estão
        longe das duas linhas quenourde a causa, e é isso que a lição ensina.

passos:
  - fase: explicar
    porque: >
      Uma variável é um nome que se dá a um valor. O nome é teu, o valor é
      o que lá está, e o Python não liga os dois. Podes escrever `total` e
      a seguir `nome` e o Python trata os dois da mesma forma.
    bloco:
      type: guarda-um-numero
    sonda: guarda-um-numero

    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos
  - fase: fazer
    porque: >
      Guarda um número com o nome `total`. Depois guarda um texto com o nome
      `nome`. Repara que o nome é a parte que fica à esquerda, e que podes
      repetir o gesto infinitas vezes.
    bloco:
      type: pilha
    sonda: guarda-um-texto

    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos
  - fase: fazer
    porque: >
      Agora o mesmo gesto, três vezes seguidas, dentro de um `for`. O que
      está escrito não muda — muda quantas vezes o Python o executa. É a
      primeira vez que vês um programa fazer algo que não está escrito
      linha a linha, e é por isso que vale a pena parares aqui.
    bloco:
      type: repetir
    sonda: repete-tres-vezes

    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos
  - fase: explicar
    porque: >
      O que muda entre `total = 5` e `nome = 'olá'` não é o nome nem a forma:
      é o tipo do que está dentro. Um número e um texto são coisas
      diferentes, e a diferença só aparece quando tentas misturá-los.
    bloco:
      type: guarda-um-texto
    sonda: texto-que-nao-e-numero

    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos
  - fase: fazer
    porque: >
      Guarda um texto com o nome `total` e usa-o logo a seguir como número.
      Espera que corra bem. Não corre, e o que te vai dizer é que o `total`
      guarda texto — a duas linhas de distância de onde o trocaste.
    bloco:
      type: dizer
    sonda: a-divisao-que-nao-existe

    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos
  - fase: nomear
    nomear: variável
    porque: >
      O nome que se dá ao valor chama-se variável. O valor chama-se valor. E o
      gesto de ligar os dois — nome, sinal de igual, valor — chama-se
      atribuição. São estas duas palavras que vais ouvir em qualquer
      linguagem onde quer que escrevas, e é por isso que uma delas não precisa de
      ser traduzida: `total = 5` é uma atribuição em todas.
    bloco:
      type: dizer
    sonda: guarda-um-numero

    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos

  - fase: nomear
    nomear: atribuição
    porque: >
      A linha `total = 'olá'` não deu erro nenhum. Em Python **não existe
      recusa por tipo**: nada te avisou, nada te impediu, e o ficheiro ficou
      pronto a correr com o erro lá dentro. A recusa que existe neste
      produto vem do robô e do painel de texto, onde o tipo é declarado à
      mão — não vem do ficheiro. A palavra para a linha que aceita um valor
      sem dizer nada é *atribuição*.
    bloco:
      type: guarda-um-texto
    sonda: texto-que-nao-e-numero

    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos
  - fase: explicar
    porque: >
      Python não te avisou, e não foi distração: foi escolha. O Python
      escolheu ser fácil de escrever e lento de falhar, e tu acabaste de ver
      o preço. Repara no que este produto faz com essa escolha: o robô e o
      painel de texto **recusam-te o valor antes de o programa existir**.
      A linguagem não te protege; o que está à volta da linguagem protege-te,
      e por isso que estás a ler esta lição em vez de a adivinhar.
    bloco:
      type: log
    sonda: a-divisao-por-uma-funcao-que-nao-existe

    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos
  - fase: fazer
    porque: >
      Lê o ficheiro de quinze linhas inteiro. Para cada linha, diz o que
      ela faz. Depois diz quais são as duas que rebentam, e quais são as
      duas que as causam. O ficheiro está no painel; não o executes, lê-lo.
    bloco:
      type: pilha
    sonda: o-que-o-ficheiro-diz

    referencia:
      nome: variavel.py

    momentos:
      - id: l1
        texto: 'O que faz a linha 1?'
        palavras: ['guarda', 'atribui', 'cria', 'guardar', 'atribuição', 'valor', 'número']
        fonte: leitura
      - id: l2
        texto: 'O que faz a linha 2?'
        palavras: ['guarda', 'atribui', 'cria', 'guardar', 'atribuição', 'valor', 'número']
        fonte: leitura
      - id: l3
        texto: 'O que é o nome, e o que é a palavra entre aspas?'
        palavras: ['texto', 'palavra', 'string', 'guarda', 'atribui', 'nome']
        fonte: leitura
      - id: l4
        texto: 'O que é True aqui?'
        palavras: ['lógico', 'booleano', 'verdade', 'verdadeiro', 'lógica', 'guarda']
        fonte: leitura
      - id: l5
        texto: 'O que faz a linha 5?'
        palavras: ['repete', 'ciclo', 'loop', 'for', 'vezes', 'voltas', 'três', '3']
        fonte: leitura
      - id: l6
        texto: 'O que faz a linha 6?'
        palavras: ['soma', 'incrementa', 'acrescenta', 'mais', 'dentro', 'ciclo', 'repete']
        fonte: leitura
      - id: l7
        texto: 'O que faz a linha 7?'
        palavras: ['mostra', 'imprime', 'escreve', 'print', 'ecrã', 'total']
        fonte: leitura
      - id: l8
        texto: 'O que faz a linha 8?'
        palavras: ['mostra', 'imprime', 'escreve', 'print', 'ecrã', 'nome']
        fonte: leitura
      - id: l9
        texto: 'O que faz a linha 9?'
        palavras: ['mostra', 'imprime', 'escreve', 'print', 'ecrã', 'preco']
        fonte: leitura
      - id: l10
        texto: 'O que muda na linha 10?'
        palavras: ['texto', 'palavra', 'string', 'total', 'deixa', 'muda', 'troca', 'sobrescreve']
        fonte: leitura
      - id: l11
        texto: 'O que faz a linha 11?'
        palavras: ['mostra', 'imprime', 'escreve', 'print', 'total']
        fonte: leitura
      - id: l12
        texto: 'O que vai acontecer na linha 12?'
        palavras: ['erro', 'função', 'não', 'existe', 'log', 'rebenta', 'falha']
        fonte: leitura
      - id: l13
        texto: 'O que é False aqui?'
        palavras: ['lógico', 'booleano', 'falso', 'lógica', 'guarda', 'muda']
        fonte: leitura
      - id: l14
        texto: 'O que faz a linha 14?'
        palavras: ['mostra', 'imprime', 'escreve', 'print', 'ecrã', 'pronto', 'nunca', 'chega']
        fonte: leitura
      - id: l15
        texto: 'O que faz a linha 15?'
        palavras: ['soma', 'junta', 'acrescenta', 'preco', 'total', 'erro', 'número', 'texto']
        fonte: leitura
  - fase: fazer
    porque: >
      Uma última coisa, e é a única em que as seis linguagens concordam.
      Escreve `print(total)` sem nunca ter guardado nada com o nome `total`.
      Todas as linguagens param aqui, todas com a mesma resposta: o nome não
      existe. Repara que este erro **não** é do mesmo género — aqui o Python
      não está a falhar tarde, está a dizer que nunca soube do que falavas.
    bloco:
      type: dizer
    sonda: variavel-que-nunca-foi-guardada

    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos
  - fase: nomear
    nomear: erro de execução
    porque: >
      A palavra que descreve o que este ficheiro faz quando erra chama-se
      *erro de execução*, e a diferença entre ele e uma recusa é **quando**:
      a recusa é antes de correr, o erro de execução é a correr. Guardar essa
      diferença é a primeira coisa que precisas de levar deste ficheiro, e é
      a razão de a próxima lição ser escrita numa linguagem que recusa.
    bloco:
      type: log
    sonda: a-divisao-que-nao-existe

    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos

```

- [ ] **Step 3: Correr e ver o que falha, e não corrigir o teste**

Run: `npx vitest run src/conteudo`

A falha mais provável é `a-divisao-por-uma-funcao-que-nao-existe`: o `log(total)` tem de dar `FalhaRuntime`, e o `porque` tem de dizer que a função não existe. Se der `Observacao`, o `ler` está a aceitar `log(...)` e a lição está a ensinar que uma função inexistente é normal — e isso é a pior coisa que este produto pode ensinar.

A segunda, se vier, é o número de linhas do `o-que-o-ficheiro-diz`. O ficheiro no plano tem catorze; a spec pede quinze. Acrescenta-se **ao YAML, nunca ao teste**:

```yaml
        total = total + preco
        print(total)
```

- [ ] **Step 4: Correr a lição de ponta a ponta e apontar o tempo**

```bash
time npx vitest run src/conteudo
npm test
npm run arvore
```

Expected: tudo PASS, `núcleo limpo`, e **anota quanto tempo demoraste a escrever o `variavel.yml`**. Esse número é a decisão do portão:

| Tempo a autorar esta lição | O que se faz a seguir |
|---|---|
| **Menos de uma tarde** | O formato está certo. Escreve-se a lição de Java (Plano A, restantes) e segue-se para o Plano B |
| **Mais de uma tarde** | **Para-se.** O formato da sonda está errado e reescreve-se **antes** de escrever a segunda lição |

Isto não é um detalhe de gestão. A spec §16.1 existe porque seis lições escritas sobre um formato errado são seis semanas perdidas em vez de uma.

- [ ] **Step 5: Commitar a lição**

```bash
git add -A
git commit -m \"feat: a licao de variavel em Python — a tarefa que prova o formato

Quinze linhas, e o ficheiro inteiro e lido de uma vez. As tres historias
estao la: o Python aceita o texto onde se quer um numero, a linha que usa
esse texto e que rebenta, e a linha log() que rebenta porque a funcao nao
existe. O sintoma nunca esta na linha da causa, e isso e a lição.

A licao de Python nao tem uma unica sonda Recusa, e isso e o resultado
certo: em Python escrito directamente nao ha recusa nenhuma. A recusa
deste produto vem do robo e do painel de texto, que sao a Task 11, e nao
se mede por uma sonda do motor. O teste que garante isto esta escrito
para que ninguem acrescente uma sonda de Recusa so para a licao parecer
mais completa do que a linguagem e.

Portao: a spec 16.1 manda medir o tempo de autoria. Anotar no commit
antes de escrever a segunda licao.\"
```

**Antes de continuar, e isto é um portão e não uma sugestão:** diz-me quanto tempo this task levou. Se foi mais de uma tarde, o formato da sonda está errado e a correção é reescrever o formato, não escrever as outras cinco lições sobre ele.

---

### Task 9: Os blocos no Blockly

**Files:**
- Create: `src/ui/blocos.tsx`, `src/ui/painel-blocos.tsx`
- Test: `src/ui/blocos.test.ts`

**Interfaces:**
- Consumes: Task 2 — `BlocoLeigo`, `CampoLeigo`, `EntradaLeiga`; Task 2 — `CORES`, `BLOCOS`; Task 2 — `TIPO_DE_BLOCO`; Task 2 — `identificador`.
- Produz: `registo` (nome interno de registo dos blocos), `paraBlocoLeigo(estado: unknown): BlocoLeigo | null`, `criarToolbox(): Blockly.ToolboxDefinition`, `BlocosProps`, `PainelBlocos`.
- Produces: `registarBlocos()`, `paraBlocoLeigo(estado)`, `criarToolbox()`, `Blocos`, `BlocosProps`, `desfazer`, `refazer`.

- [ ] **Step 1: Escrever o teste falhado**

`src/ui/blocos.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { paraBlocoLeigo } from './blocos';
import { emitir } from '../projecoes/avaliar';
import { avaliador } from '../nucleo/avaliador';

function estado(blocos: unknown[]) {
  return { blocks: blocos };
}

describe('paraBlocoLeigo', () => {
  it('devolve null para uma área vazia', () => {
    expect(paraBlocoLeigo(estado([]))).toBeNull();
    expect(paraBlocoLeigo(null)).toBeNull();
  });

  it('converte um guardar e o gerador consome o resultado', () => {
    const b = paraBlocoLeigo(
      estado([
        {
          type: 'guardar',
          fields: { nome: { valor: 'total' } },
          inputs: { VALOR: { block: { type: 'dador_num', fields: { VALOR: { valor: 5 } } } } },
        },
      ]),
    );
    expect(emitir('python', b!).python).toBe('total = 5\n');
  });

  it('converte uma referência a variável vira {ref}', () => {
    const b = paraBlocoLeigo(
      estado([
        {
          type: 'guardar',
          fields: { nome: { valor: 'total' } },
          inputs: { VALOR: { block: { type: 'dador_num', fields: { VALOR: { valor: 5 } } } } },
        },
        {
          type: 'log',
          fields: {},
          inputs: { VALOR: { block: { type: 'dador_num', fields: { NOME: { valor: 'total' } } } } },
        },
      ]),
    );
    expect(emitir('python', b!).python).toBe('total = 5\nlog(total)\n');
  });

  it('converte um campo NOME num literal de texto', () => {
    const b = paraBlocoLeigo(estado([{ type: 'pressionar', fields: { NOME: { valor: 'mostrar' } }, inputs: {} }]));
    const leigo = b as { type: string; fields?: Record<string, { valor: unknown }> };
    expect(leigo.fields?.NOME?.valor).toBe('mostrar');
  });

  it('agrupa vários blocos de topo numa pilha', () => {
    const b = paraBlocoLeigo(
      estado([
        { type: 'log', fields: {}, inputs: { VALOR: { block: { type: 'dador_num', fields: { VALOR: { valor: 1 } } } } } },
        { type: 'log', fields: {}, inputs: { VALOR: { block: { type: 'dador_num', fields: { VALOR: { valor: 2 } } } } } },
      ]),
    );
    expect(b!.type).toBe('pilha');
  });

  it('converte recursivamente o corpo de um repetir', () => {
    const b = paraBlocoLeigo(
      estado([
        {
          type: 'repetir',
          fields: {},
          inputs: {
            PASSOS: { block: { type: 'dador_num', fields: { VALOR: { valor: 2 } } } },
            CORPO: { stack: [{ type: 'log', fields: {}, inputs: { VALOR: { block: { type: 'dador_num', fields: { VALOR: { valor: 1 } } } } } }] },
          },
        },
      ]),
    );
    expect(emitir('python', b!).texto).toBe('for _ in range(2):\n    log(1)\n');
  });

  it('o resultado é executável pelo motor', () => {
    const b = paraBlocoLeigo(
      estado([
        {
          type: 'guardar',
          fields: { nome: { valor: 'total' } },
          inputs: { VALOR: { block: { type: 'dador_num', fields: { VALOR: { valor: 5 } } } } },
        },
      ]),
    );
    const a = avaliador();
    a.executar(b);
    expect(a.trace.erros).toEqual([]);
    expect(a.trace.valores.length).toBe(1);
  });

  it('um bloco desconhecido passa em vez de rebentar', () => {
    const b = paraBlocoLeigo(estado([{ type: 'bloco_do_futuro', fields: {}, inputs: {} }]));
    expect(b!.type).toBe('bloco_do_futuro');
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npx vitest run src/ui/blocos.test.ts`
Expected: FAIL com erro de resolução de `./blocos`.

- [ ] **Step 3: Escrever `src/ui/blocos.tsx`**

```typescript
import * as Blockly from 'blockly';
import type { BlocoLeigo, CampoLeigo, EntradaLeiga } from '../nucleo/avaliador';
import { BLOCOS, CORES } from '../nucleo/blocos';

type EstadoJson = { blocks?: unknown[] };
type BlocoJson = {
  type?: string;
  fields?: Record<string, { valor?: unknown }>;
  inputs?: Record<string, { valor?: unknown; block?: BlocoJson; stack?: BlocoJson[] }>;
};

function campoDe(bruto: BlocoJson, nome: string): CampoLeigo | undefined {
  const v = bruto.fields?.[nome]?.valor;
  return v === undefined ? undefined : { valor: v };
}

/** Converte um reporter do Blockly num valor explícito do motor. */
function valorDe(bruto: BlocoJson | undefined): unknown {
  if (!bruto) return undefined;
  const nome = bruto.fields?.NOME?.valor;
  if (typeof nome === 'string' && nome.length > 0) return { ref: nome };
  const proprio = bruto.fields?.VALOR?.valor ?? bruto.fields?.NUM?.valor ?? bruto.fields?.TEXTO?.valor;
  if (proprio !== undefined) return proprio;
  if (bruto.type === 'texto') return { txt: '' };
  return { bloco: converter(bruto) };
}

function converter(bruto: BlocoJson): BlocoLeigo {
  const fields: Record<string, CampoLeigo> = {};
  for (const nome of Object.keys(bruto.fields ?? {})) {
    const c = campoDe(bruto, nome);
    if (c) fields[nome] = c;
  }
  const inputs: Record<string, EntradaLeiga> = {};
  for (const nome of Object.keys(bruto.inputs ?? {})) {
    const entrada = bruto.inputs![nome]!;
    if (Array.isArray(entrada.stack) && entrada.stack.length > 0) {
      inputs[nome] = { stack: entrada.stack.map(converter) };
    } else {
      inputs[nome] = { valor: valorDe(entrada.block) };
    }
  }
  return { type: bruto.type ?? 'desconhecido', fields, inputs };
}

export function paraBlocoLeigo(estado: unknown): BlocoLeigo | null {
  const blocos = (estado as EstadoJson | null)?.blocks;
  if (!Array.isArray(blocos) || blocos.length === 0) return null;
  const convertidos = blocos.map((b) => converter(b as BlocoJson));
  if (convertidos.length === 1) return convertidos[0]!;
  return { type: 'pilha', inputs: { CORPO: { stack: convertidos } } };
}

export function criarToolbox(): Blockly.ToolboxDefinition {
  return {
    kind: 'categoryToolbox',
    contents: [
      { kind: 'category', name: 'Números', colour: CORES.dador_num, contents: [{ type: 'dador_num' }] },
      { kind: 'category', name: 'Texto', colour: CORES.texto, contents: [{ type: 'texto' }] },
      { kind: 'category', name: 'Escolhas', colour: CORES.logico, contents: [{ type: 'logico' }] },
      { kind: 'category', name: 'Atores', colour: CORES.acts, contents: [{ type: 'acts' }] },
      { kind: 'category', name: 'Variáveis', colour: CORES.guardar, contents: [{ type: 'guardar' }] },
      {
        kind: 'category',
        name: 'Controlo',
        colour: CORES.repetir,
        contents: [{ type: 'repetir' }],
      },
      {
        kind: 'category',
        name: 'Ações',
        colour: CORES.dizer,
        contents: [{ type: 'dizer' }, { type: 'log' }, { type: 'pressionar' }],
      },
    ],
  };
}

function registar(): void {
  if (Blockly.Blocks[BLOCOS.guardar]) return;

  Blockly.defineBlocksWithJsonArray([
    {
      type: 'dador_num',
      message0: '%1',
      args0: [{ type: 'field_number', name: 'VALOR', value: 0 }],
      colour: CORES.dador_num,
      output: 'Number',
    },
    {
      type: 'texto',
      message0: 'texto %1',
      args0: [{ type: 'input_value', name: 'VALOR' }],
      colour: CORES.texto,
      output: 'String',
    },
    {
      type: 'logico',
      message0: '%1',
      args0: [{ type: 'field_number', name: 'ESCOLHA', value: 1 }],
      colour: CORES.logico,
      output: 'Boolean',
    },
    {
      type: 'acts',
      message0: 'actor %1',
      args0: [{ type: 'field_input', name: 'NOME', text: 'coelho' }],
      colour: CORES.acts,
      output: 'Actor',
    },
    {
      type: 'logico_txt',
      message0: 'texto se %1',
      args0: [{ type: 'input_value', name: 'COND' }],
      colour: CORES.logico,
      previousStatement: true,
      nextStatement: true,
    },
    {
      type: 'logico_num',
      message0: 'número se %1',
      args0: [{ type: 'input_value', name: 'COND' }],
      colour: CORES.logico,
      previousStatement: true,
      nextStatement: true,
    },
    {
      type: 'logico_acts',
      message0: 'actor se %1',
      args0: [{ type: 'input_value', name: 'COND' }],
      colour: CORES.logico,
      previousStatement: true,
      nextStatement: true,
    },
  ]);

  Blockly.Blocks[BLOCOS.repetir] = {
    init() {
      this.appendValueInput('PASSOS').setCheck('Number').appendField('repetir');
      this.appendStatementInput('CORPO').appendField('vezes:');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CORES.repetir);
    },
  };

  Blockly.Blocks[BLOCOS.guardar] = {
    init() {
      this.appendValueInput('VALOR').setCheck('Number').appendField('guardar');
      this.appendField('em');
      this.appendField(new Blockly.FieldTextInput('total'), 'nome');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CORES.guardar);
    },
  };

  Blockly.Blocks[BLOCOS.dizer] = {
    init() {
      this.appendValueInput('VALOR').setCheck('String').appendField('dizer');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CORES.dizer);
    },
  };

  Blockly.Blocks[BLOCOS.log] = {
    init() {
      this.appendValueInput('VALOR').appendField('registar');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CORES.log);
    },
  };

  Blockly.Blocks[BLOCOS.pressionar] = {
    init() {
      this.appendDummyInput('ATOR_ROTULO').appendField('o');
      this.appendField(new Blockly.FieldTextInput('coelho'), 'ATOR');
      this.appendField(new Blockly.FieldDropdown([
        [BLOCOS.executar, BLOCOS.executar],
        [BLOCOS.atribuir, BLOCOS.atribuir],
        [BLOCOS.mostrar, BLOCOS.mostrar],
      ]), 'NOME');
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(CORES.pressionar);
    },
  };
}

export function registarBlocos(): void {
  registar();
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npx vitest run src/ui/blocos.test.ts`
Expected: PASS. Se o import do Blockly rebentar em Node, acrescenta a esta tarefa, em `src/ui/blocos.tsx`, o corte do DOM antes do import do Blockly — **não** o faças: o `blockly` é importável em Node e o teste passa sem DOM. Se não passar, o problema é o polyfill do `preparacao.ts`, e o `jsdom` já está no ambiente.

- [ ] **Step 5: Escrever `src/ui/painel-blocos.tsx`**

```typescript
import { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';
import type { BlocoLeigo } from '../nucleo/avaliador';
import { criarToolbox, paraBlocoLeigo, registarBlocos } from './blocos';

export interface BlocosProps {
  aoMudar: (programa: BlocoLeigo | null) => void;
  carregar?: BlocoLeigo | null;
  chave: string;
}

export function Blocos({ aoMudar, carregar, chave }: BlocosProps) {
  const alvo = useRef<HTMLDivElement | null>(null);
  const espaco = useRef<Blockly.Workspace | null>(null);
  const primeira = useRef(true);

  useEffect(() => {
    if (!alvo.current) return;
    registarBlocos();
    const injetado = Blockly.inject(alvo.current, {
      toolbox: criarToolbox(),
      trashcan: true,
    });
    espaco.current = injetado;
    const aoEvento = (): void => {
      aoMudar(paraBlocoLeigo(Blockly.serialization.blocks.save(injetado)));
    };
    injetado.addChangeListener(aoEvento);
    return () => {
      injetado.removeChangeListener(aoEvento);
      injetado.dispose();
      espaco.current = null;
    };
  }, [chave, aoMudar]);

  useEffect(() => {
    const ws = espaco.current;
    if (!ws) return;
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    ws.clear();
    if (carregar) Blockly.serialization.blocks.load(ws, carregar as never);
  }, [carregar]);

  return <div ref={alvo} data-testid="area-blocos" className="area-blocos" />;
}
```

- [ ] **Step 6: Escrever o teste de montagem**

Acrescenta a `src/ui/blocos.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Blocos } from './painel-blocos';

describe('Blocos', () => {
  it('monta sem rebentar e chama aoMudar quando algo muda', () => {
    const aoMudar = vi.fn();
    render(<Blocos chave="t1" aoMudar={aoMudar} />);
    expect(screen.getByTestId('area-blocos')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Correr e ver passar**

Run: `npx vitest run src/ui/blocos.test.tsx src/ui/blocos.test.ts`
Expected: PASS. Se o Blockly precisar de `getComputedStyle` com valores ou de `document.fonts`, acrescenta ao `preparacao.ts`:
```typescript
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
```

- [ ] **Step 8: Typecheck e commit**

```bash
npm run typecheck
git add -A
git commit -m "feat: blocos Blockly com traducao para BlocoLeigo"
```

---

- [ ] **Step 9: O vocabulário vem da projeção, não do Blockly**

O registo de blocos do Blockly tem de ser montado a partir de `obter(linguagem).blocos`, e não de uma lista fixa no ficheiro. É isso que faz o SQL (Plano C) ter um vocabulário declarativo sem que este ficheiro mude.

```typescript
it('o registo do Blockly tem exatamente os blocos da projecão', () => {
  const ids = Object.keys(registarBlocos(obter('python')));
  expect(ids).toEqual(obter('python').blocos);
});
```

Acrescente `import { obter } from '../projecoes/registo';` ao topo do ficheiro de teste. Este teste é o que garante que a fatia do Plano C não precisa de volta a este ficheiro.

---

### Task 10: O estado da li��ão e o painel de texto

**Files:**
- Create: `src/ui/tipos.ts`, `src/ui/estado.ts`, `src/ui/texto.tsx`, `src/ui/estilo.css`
- Test: `src/ui/estado.test.ts`, `src/ui/texto.test.tsx`

**Interfaces:**
- Consumes: Task 7 — `Licao`, `Passo`, `Momento`; Task 6 — `Divergencia`, `avaliarTexto`; Task 1 — `Erro`, `Language`, `NOMES`.
- Produces: `ROTULOS`, `EstadoLicao`, `useLicao(licao, passoInicial)`, `respostaBate(alvo, resposta)`, `normalizar(texto)`, `PainelTexto`, `PainelTextoProps`, `Avaliacao`, `LIMITE_DE_PASSOS`. `Fase` não é re-declarada: vem do `esquema` da Task 7. `Divergencia` também não: vem da Task 6 e é usada tal como é.

- [ ] **Step 1: Escrever o teste falhado `src/ui/estado.test.ts`**

```typescript
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLicao } from './estado';
import { CARREGAR } from '../conteudo/carregar';
import variavelYaml from '../conteudo/python/variavel.yml?raw';

const licao = CARREGAR(variavelYaml, 'python');

/** O passo que manda ler o ficheiro. Derivado da lição e nunca escrito à
 *  mão, pelo mesmo motivo que no teste da Tela: um número escrito à mão
 *  aqui passa a testar outra coisa assim que a lição ganha um passo. */
const PASSO_DA_FICHA = licao.passos.findIndex((p) => p.referencia !== undefined);
const primeiro = (fase: 'explicar' | 'fazer' | 'nomear'): number => {
  const i = licao.passos.findIndex((p) => p.fase === fase);
  if (i < 0) throw new Error(`a lição não tem nenhum passo de fase ${fase}`);
  return i;
};
const PASSO_EXPLICAR = primeiro('explicar');
const PASSO_FAZER = primeiro('fazer');
const PASSO_NOMEAR = primeiro('nomear');

describe('useLicao', () => {
  it('começa no primeiro passo, no momento 0, e a fase é a do passo', () => {
    const { result } = renderHook(() => useLicao(licao));
    expect(result.current.indicePasso).toBe(0);
    expect(result.current.momento).toBe(0);
    expect(result.current.fase).toBe(licao.passos[0]!.fase);
  });

  it('a fase é derivada do passo, e mudar de passo muda a fase', () => {
    const { result } = renderHook(() => useLicao(licao));
    expect(result.current.fase).toBe('explicar');
    act(() => result.current.irPara(PASSO_NOMEAR));
    expect(result.current.fase).toBe('nomear');
  });

  it('o passo de abertura pode ser saltado', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_FAZER));
    expect(result.current.indicePasso).toBe(PASSO_FAZER);
    expect(result.current.fase).toBe('fazer');
  });

  it('avançar percorre os momentos do passo e não salta de passo', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    expect(result.current.totalMomentos).toBe(15);
    act(() => result.current.proximo());
    expect(result.current.momento).toBe(1);
    act(() => result.current.proximo());
    expect(result.current.momento).toBe(2);
    // Avançar momento não avança passo. O botão que avança passo é outro, e
    // só funciona quando todos os momentos estão vistos — um botão único que
    // às vezes saltava de passo era um botão de que ninguém sabia o nome.
    expect(result.current.indicePasso).toBe(PASSO_DA_FICHA);
  });

  it('avançar no último momento não faz nada: o próximo passo é outra coisa', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_EXPLICAR));
    act(() => result.current.proximo());
    expect(result.current.momento).toBe(0);
    expect(result.current.indicePasso).toBe(PASSO_EXPLICAR);
  });

  it('voltar recua o momento, e no primeiro momento não faz nada', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    act(() => result.current.proximo());
    expect(result.current.momento).toBe(1);
    act(() => result.current.anterior());
    expect(result.current.momento).toBe(0);
    act(() => result.current.anterior());
    expect(result.current.momento).toBe(0);
  });

  it('o passo seguinte só abre quando todos os momentos estão vistos', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    act(() => result.current.proximoPasso());
    expect(result.current.indicePasso).toBe(PASSO_DA_FICHA);
    for (const m of licao.passos[PASSO_DA_FICHA]!.momentos) {
      act(() => result.current.observar());
      act(() => result.current.proximo());
    }
    act(() => result.current.proximoPasso());
    expect(result.current.indicePasso).toBe(PASSO_DA_FICHA + 1);
    expect(result.current.momento).toBe(0);
  });

  it('no último passo não há passo seguinte, e o estado não rebenta', () => {
    const ultimo = licao.passos.length - 1;
    const { result } = renderHook(() => useLicao(licao, ultimo));
    act(() => result.current.proximoPasso());
    expect(result.current.indicePasso).toBe(ultimo);
    act(() => result.current.irPara(licao.passos.length + 5));
    expect(result.current.indicePasso).toBe(ultimo);
    act(() => result.current.irPara(-1));
    expect(result.current.indicePasso).toBe(ultimo);
  });

  it('só marca um momento de leitura quando a resposta bate com uma das palavras', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    const momento = result.current.momentoActual!;
    expect(momento.fonte).toBe('leitura');
    act(() => {
      result.current.responder('guarda um número');
    });
    expect(result.current.feito[momento.id]).toBe(true);
  });

  it('fora da ficha, responder nunca chumba: o produto não avalia blocos', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_FAZER));
    const momento = result.current.momentoActual!;
    expect(momento.palavras).toEqual([]);
    act(() => {
      result.current.responder('banana');
    });
    // Não chumba, mas também não conta. A diferença entre as duas coisas é
    // a diferença entre "o produto não se importa" e "o produto concordou".
    expect(result.current.feito[momento.id]).toBeUndefined();
  });

  it('a sonda do passo é a da lição com o mesmo nome', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_FAZER));
    expect(result.current.sonda).toBe(
      licao.sondas.find((x) => x.nome === result.current.passo.sonda),
    );
    expect(result.current.sonda).not.toBeNull();
  });

  it('o passo da ficha traz as linhas do ficheiro, e são as 15', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    expect(result.current.referencia?.linhas).toHaveLength(15);
    expect(result.current.referencia?.linhas[0]).toBe('total = 5');
    expect(result.current.referencia?.linhas[5]).toBe('    total = total + 1');
    expect(result.current.referencia?.nome).toBe('variavel.py');
  });

  it('um passo sem ficha não tem referência, e não é um erro', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_FAZER));
    expect(result.current.referencia).toBeUndefined();
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npx vitest run src/ui/estado.test.ts`
Expected: FAIL com erro de resolução de `./estado`.

- [ ] **Step 3: Escrever `src/ui/tipos.ts`**

```typescript
import type { Fase } from '../conteudo/carregar';

export const ROTULOS: Record<Fase, string> = {
  explicar: 'Lê primeiro',
  fazer: 'Agora faz',
  nomear: 'Isto tem nome',
};
```

**Não há uma vista `leitura`.** Havia, e foi tirada. A vista era um ecrã
independente do passo, o que produzia estados que não se podem preencher: o
passo 0 na vista `nomear`, onde não há palavra nenhuma para nomear, e o
passo 0 na vista `leitura`, onde não há ficheiro nenhum para ler. Um
desenho que permite chega a estados vazios está a descrever três coisas
quando quer descrever uma.

O que a vista `leitura` fazia — mostrar o ficheiro e perguntar linha a linha
— é o que um passo com `referencia` faz, sempre, e só esse. A palavra que a
vista `nomear` mostra — a palavra nomeada, grande — é o que um passo de fase
`nomear` mostra, e a Task 7 recusa um passo de fase `nomear` sem palavra.
Portanto a vista **é** a fase do passo, e não há nada para escolher. A
fase vem do `esquema` da Task 7 e não é redefinida aqui: um `Record` com as
três fases é uma segunda lista, e uma segunda lista diverge.

- [ ] **Step 4: Escrever `src/ui/estado.ts`**

```typescript
import { useCallback, useMemo, useState } from 'react';
import type { Fase, Licao, Momento, Passo, Sonda } from '../conteudo/carregar';
import type { Erro } from '../nucleo/tipos';

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function respostaBate(alvo: string[], resposta: string): boolean {
  const r = normalizar(resposta);
  if (r.length === 0) return false;
  return alvo.some((p) => r.includes(normalizar(p)));
}

export interface EstadoLicao {
  licao: Licao;
  indicePasso: number;
  totalPassos: number;
  passo: Passo;
  /** A fase do passo. Não é uma escolha do aluno: é o que o passo é. Por
   *  isso vive aqui como valor derivado e não como `useState` — se fosse
   *  estado, o ecrã e a lição podiam discordar sobre o passo atual. */
  fase: Fase;
  momento: number;
  totalMomentos: number;
  momentoActual: Momento | null;
  sonda: Sonda | null;
  feito: Record<string, boolean>;
  erros: Erro[];
  respostas: Record<string, string>;
  /** O ficheiro que este passo manda ler, se for um passo de ficha. */
  referencia?: { nome: string; linhas: string[] };
  proximo: () => void;
  anterior: () => void;
  responder: (texto: string) => boolean;
  observar: () => void;
  proximoPasso: () => void;
  irPara: (passo: number) => void;
  definirErros: (erros: Erro[]) => void;
  definirResposta: (momentoId: string, texto: string) => void;
}

export function useLicao(licao: Licao, passoInicial = 0): EstadoLicao {
  const [indicePasso, definirIndice] = useState(passoInicial);
  const [momento, definirMomento] = useState(0);
  const [feito, definirFeito] = useState<Record<string, boolean>>({});
  const [erros, definirErros] = useState<Erro[]>([]);
  const [respostas, definirRespostas] = useState<Record<string, string>>({});

  const passo = licao.passos[indicePasso] ?? licao.passos[0]!;
  const momentoActual = passo.momentos[momento] ?? null;

  // A sonda vive na lição, não no passo. O passo aponta para ela pelo nome e
  // a mesma sonda pode servir vários passos — a lição de Java vai precisar
  // disso, porque a lição dela é a mesma com outra sintaxe.
  const sonda = useMemo(
    () => licao.sondas.find((s) => s.nome === passo.sonda) ?? null,
    [licao.sondas, passo.sonda],
  );

  /** As linhas do ficheiro que este passo manda ler. Vêm da sonda nomeada
   *  em `referencia`, e de mais lado nenhum — a lição guarda o ficheiro num
   *  sítio só, e este é o sítio de onde o ecrã o vai buscar. */
  const referencia = useMemo(() => {
    if (!passo.referencia) return undefined;
    const texto = licao.sondas.find((x) => x.nome === passo.sonda)?.prova.texto;
    if (texto === undefined) return undefined;
    return { nome: passo.referencia.nome, linhas: texto.trimEnd().split('\n') };
  }, [passo, licao.sondas]);

  const totalMomentos = passo.momentos.length;
  const tudoFeito = passo.momentos.every((m) => feito[m.id]);

  /** Avança o momento. No último momento não avança o passo: avançar passo
   *  é uma decisão diferente, e é a de `proximoPasso`. Juntar as duas era
   *  um botão que às vezes saltava de passo sem o aluno querer. */
  const proximo = useCallback(() => {
    if (momento < totalMomentos - 1) definirMomento(momento + 1);
  }, [momento, totalMomentos]);

  const anterior = useCallback(() => {
    if (momento > 0) definirMomento(momento - 1);
  }, [momento]);

  const responder = useCallback(
    (texto: string): boolean => {
      const atual = passo.momentos[momento];
      if (!atual || atual.fonte !== 'leitura' || atual.palavras.length === 0) {
        // Só a ficha avalia palavras. Em qualquer outro momento o produto
        // não tem opiniões sobre o que o aluno escreveu: ou o programa
        // corre, ou não corre, e o texto é o texto.
        return true;
      }
      // `respostaBate` casa por subcadeia e sem pontuação: "esta linha
      // guarda um numero" bate com "guarda" e com "numero". Não há resposta
      // errada, há respostas que não dizem a palavra que a pergunta pedia.
      const ok = respostaBate(atual.palavras, texto);
      if (ok) definirFeito((f) => ({ ...f, [atual.id]: true }));
      return ok;
    },
    [momento, passo, definirFeito],
  );

  const observar = useCallback(() => {
    if (!momentoActual) return;
    definirFeito((f) => ({ ...f, [momentoActual.id]: true }));
  }, [momentoActual, definirFeito]);

  const proximoPasso = useCallback(() => {
    if (!tudoFeito) return;
    if (indicePasso < licao.passos.length - 1) {
      definirIndice(indicePasso + 1);
      definirMomento(0);
    }
  }, [tudoFeito, indicePasso, licao.passos.length]);

  const irPara = useCallback(
    (passo: number) => {
      if (passo < 0 || passo >= licao.passos.length) return;
      definirIndice(passo);
      definirMomento(0);
    },
    [licao.passos.length],
  );

  const definirResposta = useCallback((momentoId: string, texto: string) => {
    definirRespostas((r) => ({ ...r, [momentoId]: texto }));
  }, []);

  return useMemo(
    () => ({
      licao,
      indicePasso,
      totalPassos: licao.passos.length,
      passo,
      fase: passo.fase,
      momento,
      totalMomentos,
      momentoActual,
      sonda,
      feito,
      erros,
      respostas,
      referencia,
      proximo,
      anterior,
      responder,
      observar,
      proximoPasso,
      irPara,
      definirErros,
      definirResposta,
    }),
    [
      licao, indicePasso, passo, momento, totalMomentos, momentoActual, sonda, feito,
      erros, respostas, referencia, proximo, anterior, responder, observar,
      proximoPasso, irPara, definirResposta,
    ],
  );
}
```

- [ ] **Step 5: Correr e ver passar `estado.test.ts`**

Run: `npx vitest run src/ui/estado.test.ts`
Expected: PASS.

- [ ] **Step 6: Escrever o teste falhado `src/ui/texto.test.tsx`**

```typescript
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PainelTexto } from './texto';

describe('PainelTexto', () => {
  it('escreve o que o utilizador escreve e avisa depois do debounce', async () => {
    let recebido = '';
    render(
      <PainelTexto linguagem="python" resposta="total = 5" aoComparar={(t) => { recebido = t; }} debounceMs={20} />,
    );
    const area = screen.getByLabelText('O teu código em Python');
    await userEvent.clear(area);
    await userEvent.type(area, 'total = 6');
    await waitFor(() => {
      expect(recebido).toBe('total = 6');
    });
  });

  it('sem blocos ligados o botão Executar corre o texto, mas avisa que não pode comparar', async () => {
    let recebido = '';
    render(
      <PainelTexto linguagem="python" resposta="total = 5" aoComparar={(t) => { recebido = t; }} semBlocos />,
    );
    const botao = screen.getByRole('button', { name: 'Executar' });
    expect(botao).toBeEnabled();
    expect(screen.getByText(/sem blocos ao lado/i)).toBeInTheDocument();
    await userEvent.click(botao);
    expect(recebido).toBe('total = 5');
  });

  it('sem blocos não aparecem divergências, porque não há com o que comparar', () => {
    const { container } = render(
      <PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} semBlocos />,
    );
    expect(container.querySelector('.divergencias')).toBeNull();
  });

  it('limpa o texto quando a resposta muda de passo', () => {
    const { rerender } = render(<PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} />);
    rerender(<PainelTexto linguagem="python" resposta="outro = 1" aoComparar={() => undefined} />);
    expect(screen.getByLabelText('O teu código em Python')).toHaveValue('outro = 1');
  });

  it('mostra a divergência com o porque e o que fazer', () => {
    render(
      <PainelTexto
        resposta="total = 5"
        aoComparar={() => undefined}
        divergencias={[
          {
            linha: 1,
            esperado: 'total = 5',
            obtido: 'total = 6',
            porque: 'Estas duas linhas fazem coisas diferentes.',
            remedio: 'Muda a linha 1 para que faça o mesmo que o bloco.',
          },
        ]}
      />,
    );
    expect(screen.getByText('Linha 1')).toBeInTheDocument();
    expect(screen.getByText(/fazem coisas diferentes/i)).toBeInTheDocument();
    expect(screen.getByText(/Muda a linha 1/i)).toBeInTheDocument();
  });

  it('o rótulo diz a linguagem escolhida, e não uma hardcoded', () => {
    // A lição é escolhida no seletor e o aluno fica nela. Um painel que
    // diz "O teu código em Python" a quem escolheu Java não é um detalhe
    // de texto: é o produto a dizer que a escolha não contou.
    const { rerender } = render(
      <PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} />,
    );
    expect(screen.getByLabelText('O teu código em Python')).toBeInTheDocument();

    rerender(<PainelTexto linguagem="java" resposta="int total = 5;" aoComparar={() => undefined} />);
    expect(screen.getByLabelText('O teu código em Java')).toBeInTheDocument();
    expect(screen.queryByLabelText('O teu código em Python')).not.toBeInTheDocument();
  });

  it('e nunca compara o texto do aluno com o de outra linguagem', () => {
    // A `Divergencia` é entre o bloco e o teu texto, na tua linguagem. Não
    // há campo `python` nem `java` para o painel mostrar, e não há nada
    // para preencher se os houvesse.
    render(
      <PainelTexto
        linguagem="java"
        resposta="int total = 5;"
        aoComparar={() => undefined}
        divergencias={[
          {
            linha: 1,
            esperado: 'int total = 5;',
            obtido: 'int total = 6;',
            porque: 'O bloco soma 1 e o teu texto soma 2.',
            remedio: 'Muda o teu texto para somar 1.',
          },
        ]}
      />,
    );
    expect(screen.getByText(/O bloco soma 1/i)).toBeInTheDocument();
    expect(screen.queryByText(/Python/i)).not.toBeInTheDocument();
  });

  it('mostra a saída do programa quando existe', () => {
    render(<PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} saida={['7', '7', '7']} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Correr e ver falhar**

Run: `npx vitest run src/ui/texto.test.tsx`
Expected: FAIL com erro de resolução de `./texto`.

- [ ] **Step 8: Escrever `src/ui/texto.tsx`**

```typescript
import { useEffect, useRef, useState } from 'react';
import type { Divergencia } from '../nucleo/divergencia';
import { NOMES } from '../nucleo/tipos';
import type { Language } from '../nucleo/tipos';
import './estilo.css';

export interface PainelTextoProps {
  /** A linguagem escolhida no seletor. O painel não a adivinha: é a que o
   *  utilizador escolheu, e o rótulo e o `id` do editor saem daqui. */
  linguagem: Language;
  resposta: string;
  aoComparar: (texto: string) => void;
  divergencias?: Divergencia[];
  semBlocos?: boolean;
  saida?: string[];
  debounceMs?: number;
}

export function PainelTexto({
  linguagem,
  resposta,
  aoComparar,
  divergencias = [],
  semBlocos = false,
  saida = [],
  debounceMs = 250,
}: PainelTextoProps) {
  const id = `codigo-${linguagem}`;
  const [valor, definirValor] = useState(resposta);
  const anterior = useRef(resposta);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (anterior.current === resposta) return;
    anterior.current = resposta;
    definirValor(resposta);
  }, [resposta]);

  const aoDigitar = (novo: string): void => {
    definirValor(novo);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => aoComparar(novo), debounceMs);
  };

  const executar = (): void => {
    if (temporizador.current) clearTimeout(temporizador.current);
    aoComparar(valor);
  };

  return (
    <section aria-label="Painel de texto" className="painel-texto">
      <label htmlFor={id}>O teu código em {NOMES[linguagem]}</label>
      <textarea
        id={id}
        className="editor-texto"
        rows={10}
        spellCheck={false}
        value={valor}
        onChange={(e) => aoDigitar(e.target.value)}
      />
      <div className="painel-texto-acoes">
        <button type="button" onClick={executar}>
          Executar
        </button>
        {semBlocos ? (
          <p className="aviso">Sem blocos ao lado, isto só corre o teu texto: ainda não há nada com que comparar.</p>
        ) : null}
      </div>
      {saida.length > 0 ? (
        <pre className="saida" aria-label="Saída do programa">
          {saida.join('\n')}
        </pre>
      ) : null}
      {divergencias.length > 0 ? (
        <ul className="divergencias">
          {divergencias.map((d) => (
            <li key={`${d.linha}-${d.obtido}`}>
              <strong>Linha {d.linha}</strong>
              <p>{d.porque}</p>
              <p>O que o bloco faz: {d.esperado}</p>
              <p>O que o teu texto faz: {d.obtido}</p>
              <p>{d.remedio}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 9: Correr e ver passar**

Run: `npx vitest run src/ui/texto.test.tsx`
Expected: PASS.

- [ ] **Step 10: Escrever `src/ui/estilo.css`**

```css
:root {
  --fundo: #0f172a;
  --superficie: #1e293b;
  --fundo-escuro: #0b1220;
  --texto: #e2e8f0;
  --borda: #334155;
  --erro: #f87171;
  --ok: #4ade80;
  --aviso: #fbbf24;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

body {
  margin: 0;
  background: var(--fundo);
  color: var(--texto);
}

button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: 1px solid #475569;
  background: #1d4ed8;
  color: #f8fafc;
  cursor: pointer;
  font: inherit;
}

button:disabled {
  background: var(--superficie);
  color: #475569;
  cursor: not-allowed;
}

.painel-texto {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: 0.5rem;
}

.painel-texto label {
  font-size: 0.8rem;
  color: #94a3b8;
}

.painel-texto-acoes {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.editor-texto {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  font-size: 0.95rem;
  background: var(--fundo-escuro);
  color: var(--texto);
  border: 1px solid var(--borda);
  border-radius: 0.25rem;
  padding: 0.5rem;
  resize: vertical;
}

.aviso {
  color: var(--aviso);
  font-size: 0.85rem;
  margin: 0;
}

.saida {
  background: var(--fundo-escuro);
  border: 1px solid var(--borda);
  border-radius: 0.25rem;
  padding: 0.5rem;
  margin: 0;
  font-family: ui-monospace, Menlo, monospace;
  white-space: pre-wrap;
}

.divergencias {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.divergencias li {
  border-left: 3px solid var(--erro);
  padding-left: 0.75rem;
}

.divergencias p {
  margin: 0.15rem 0;
  font-size: 0.9rem;
}
```

- [ ] **Step 11: Typecheck e commit**

```bash
npm run typecheck
git add -A
git commit -m "feat: estado da licao e painel de texto com debounce e divergencias"
```

---

- [ ] **Step 12: O painel é da linguagem escolhida**

O painel de texto mostra o `emit` da projeção da linguagem activa e compara com `comparar()`. Um teste que só passa com Python esconde a falha mais provável — alguém escrever a sintaxe errada e o produto aceitar.

```typescript
it('o painel da Java escreve e compara em Java, não em Python', () => {
  const { UNSAFE_getAllByRole } = renderComLinguagem(<PainelTexto />, 'java');
  expect(caixa().value).toBe('int total = 5;\n');
  expect(semErros()).toBe(true);
});

it('o mesmo painel com texto Python é divergência, e o porque diz do ;', () => {
  const { UNSAFE_getByRole } = renderComLinguagem(<PainelTexto />, 'java');
  escrever('int total = 5\n');
  expect(UNSAFE_getByRole('status').textContent).toContain(';');
});
```

Run: `npx vitest run src/ui/texto.test.tsx`
Expected: PASS.

---

### Task 11: O robô com ranhuras tipadas

**Files:**
- Create: `src/ui/robo.tsx`, `src/ui/robo.css`
- Test: `src/ui/robo.test.tsx`

**Interfaces:**
- Consumes: Task 1 — `Valor`, `Recusa`, `Tipo`.
- Produz: `NOMES_TIPO`, `PortaRobo`, `PORTA_ENTRADA`, `PORTA_SAIDA`, `PainelRobo`.
- Produces: `PainelRobo`, `PORTA_ENTRADA`, `PORTA_SAIDA`, `Porta`, `texto()`, `logico()`.

- [ ] **Step 1: Escrever o teste falhado**

`src/ui/robo.test.tsx`:
```typescript
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PainelRobo, PORTA_ENTRADA, PORTA_SAIDA } from './robo';
import { val } from '../nucleo/tipos';
import type { Recusa } from '../nucleo/tipos';

const RECUSA: Recusa = {
  classe: 'Recusa',
  porque: 'Este sítio só aceita número. Recebeste texto.',
  esperado: 'número',
  obtido: 'texto',
  python: 'Python deixa passar.',
  java: 'Java não deixa.',
  origem: { bloco: 'guardar', ranhura: 0, passo: 1 },
};

describe('PainelRobo', () => {
  it('mostra as portas com o nome do tipo', () => {
    render(<PainelRobo portas={[PORTA_ENTRADA, PORTA_SAIDA]} valores={[]} recusa={null} />);
    expect(screen.getByText('entrada')).toBeInTheDocument();
    expect(screen.getByText('saída')).toBeInTheDocument();
    expect(screen.getAllByText('número').length).toBe(2);
  });

  it('mostra o valor dentro da porta', () => {
    const v = val('número', 7, { porque: '', python: '', java: '' }, { bloco: 'guardar', ranhura: 0, passo: 1 });
    render(<PainelRobo portas={[PORTA_SAIDA]} valores={[v]} recusa={null} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('mostra um traço quando a porta está vazia', () => {
    render(<PainelRobo portas={[PORTA_SAIDA]} valores={[]} recusa={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('quando há recusa, mostra a razão e o que cada linguagem faria', () => {
    render(<PainelRobo portas={[PORTA_ENTRADA]} valores={[]} recusa={RECUSA} />);
    expect(screen.getByText(RECUSA.porque)).toBeInTheDocument();
    expect(screen.getByText(RECUSA.python)).toBeInTheDocument();
    expect(screen.getByText(RECUSA.java)).toBeInTheDocument();
  });

  it('sem recusa, não mostra nenhum aviso', () => {
    render(<PainelRobo portas={[PORTA_ENTRADA]} valores={[]} recusa={null} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npx vitest run src/ui/robo.test.tsx`
Expected: FAIL com erro de resolução de `./robo`.

- [ ] **Step 3: Escrever `src/ui/robo.tsx`**

```typescript
import type { Recusa, Tipo, Valor } from '../nucleo/tipos';
import './robo.css';

export const NOMES_TIPO: Record<Tipo, string> = {
  número: 'número',
  texto: 'texto',
  lógico: 'sim ou não',
  lista: 'lista',
  actor: 'actor',
};

export interface PortaRobo {
  id: string;
  nome: string;
  tipo: Tipo;
}

export const PORTA_ENTRADA: PortaRobo = { id: 'entrada', nome: 'entrada', tipo: 'número' };
export const PORTA_SAIDA: PortaRobo = { id: 'saida', nome: 'saída', tipo: 'número' };

export interface PainelRoboProps {
  portas: PortaRobo[];
  valores: Valor[];
  recusa: Recusa | null;
}

export function PainelRobo({ portas, valores, recusa }: PainelRoboProps) {
  return (
    <section aria-label="O robô" className="robo">
      <h2>O robô</h2>
      <div className="portas">
        {portas.map((p) => {
          const candidatos = valores.filter((v) => v.tipo === p.tipo);
          const v = candidatos.at(-1);
          return (
            <div key={p.id} className="porta" data-tipo={p.tipo}>
              <span className="porta-nome">{p.nome}</span>
              <span className="porta-tipo">{NOMES_TIPO[p.tipo]}</span>
              <span className="porta-valor">{v === undefined ? '—' : String(v.valor)}</span>
            </div>
          );
        })}
      </div>
      {recusa ? (
        <div className="recusa" role="alert">
          <p className="recusa-porque">{recusa.porque}</p>
          <p>{recusa.python}</p>
          <p>{recusa.java}</p>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Escrever `src/ui/robo.css`**

```css
.robo {
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: 0.5rem;
  padding: 1rem;
}

.robo h2 {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}

.portas {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.porta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  border: 2px solid #475569;
  border-radius: 0.75rem;
  padding: 0.75rem 1.25rem;
  min-width: 6rem;
}

.porta-nome {
  font-size: 0.75rem;
  color: #94a3b8;
}

.porta-tipo {
  font-size: 0.65rem;
  color: #64748b;
  text-transform: uppercase;
}

.porta-valor {
  font-size: 1.5rem;
  font-weight: 600;
}

.porta[data-tipo='número'] {
  border-color: #3b82f6;
}

.porta[data-tipo='texto'] {
  border-color: #10b981;
}

.recusa {
  margin-top: 1rem;
  border-left: 3px solid var(--erro);
  padding-left: 0.75rem;
}

.recusa p {
  margin: 0.2rem 0;
  font-size: 0.9rem;
}

.recusa-porque {
  font-weight: 600;
}
```

- [ ] **Step 5: Correr e ver passar**

Run: `npx vitest run src/ui/robo.test.tsx`
Expected: PASS.

- [ ] **Step 6: Typecheck e commit**

```bash
npm run typecheck
git add -A
git commit -m "feat: robo com portas tipadas que recusa com razao"
```

---

- [ ] **Step 7: O robô recusa a tipagem errada, com porquê**

A `Recusa` que o robô produz tem de trazer `esperado`, `obtido` e `remedio` — e nunca o nome de outra linguagem. Este é o ponto em que a spec §0 se vê no ecrã.

```typescript
it('dar 5 a um sítio de texto explica o que fazer, e não cita Python', () => {
  const recusa = ultimoErro();
  expect(recusa.classe).toBe('Recusa');
  expect(recusa.porque).toContain('texto');
  expect(recusa.remedio).toContain('texto');
  expect(JSON.stringify(recusa)).not.toMatch(/Python|Java/);
});
```

Run: `npx vitest run src/ui/robo.test.tsx`
Expected: PASS.

---

### Task 12: O ecrã da lição e o seletor de linguagem

**Files:**
- Create: `src/ui/lecao/PassoView.tsx`, `src/ui/lecao/SondasView.tsx`, `src/ui/lecao/Tela.tsx`, `src/ui/lecao/lecao.css`, `src/ui/lecao/SeletorLinguagem.tsx`, `src/ui/lecao/catalogo.ts`
- Modify: `src/main.tsx`
- Test: `src/ui/lecao/tela.test.tsx`, `src/ui/lecao/seletor.test.tsx`

**Interfaces:**
- Consumes: Task 2 — `avaliador`, `BlocoLeigo`; Task 6 — `emitir`, `avaliarTexto`, `comparar`, `Divergencia`; Task 7 — `executarSonda`, `Licao`, `Passo`, `Sonda`; Task 9 — `Blocos`; Task 10 — `PainelTexto`, `useLicao`, `EstadoLicao`, `ROTULOS`; Task 11 — `PainelRobo`, `PORTA_ENTRADA`, `PORTA_SAIDA`; Task 1 — `Erro`, `Recusa`, `Valor`, `Language`, `LINGUAGENS`, `NOMES`.
- Produces: `Tela`, `TelaProps`, `PassoView`, `SondasView`, `SeletorLinguagem`, `OpcaoLinguagem`, `CATALOGO`.

- [ ] **Step 1: Escrever o teste falhado**

`src/ui/lecao/tela.test.tsx`:
```typescript
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tela } from './Tela';
import { CARREGAR } from '../../conteudo/carregar';
import { NOMES } from '../../nucleo/tipos';
import variavelYaml from '../../conteudo/python/variavel.yml?raw';

const licao = CARREGAR(variavelYaml, 'python');

/** Os passos de que estes testes precisam, derivados da lição e nunca
 *  escritos à mão. A vista deixou de ser um parâmetro — a vista é a fase do
 *  passo — e por isso o que o teste escolhe é *que passo*, e a fase vem
 *  junto. Um número escrito à mão aqui seria uma armadilha: bastava a lição
 *  ganhar um passo para o teste estar a testar outra coisa sem dar por isso.
 *  A exceção é `PASSO_DO_ROBO`, que precisa de um passo `fazer` que não
 *  seja a ficha, e é o mesmo que `PRIMEIRO_FAZER`. */
const primeiro = (fase: 'explicar' | 'fazer' | 'nomear'): number => {
  const i = licao.passos.findIndex((p) => p.fase === fase);
  if (i < 0) throw new Error(`a lição de Python não tem nenhum passo de fase ${fase}`);
  return i;
};
const PASSO_EXPLICAR = primeiro('explicar');
const PASSO_FAZER = primeiro('fazer');
const PASSO_NOMEAR = primeiro('nomear');
const PASSO_DA_FICHA = licao.passos.findIndex((p) => p.referencia !== undefined);
if (PASSO_DA_FICHA < 0) throw new Error('a lição de Python não tem nenhum passo de leitura');
const NOMEADO = licao.passos[PASSO_NOMEAR]!.nomear!;

describe('Tela da lição', () => {
  it('mostra o título da lição e o texto do passo', () => {
    render(<Tela linguagem="python" licao={licao} />);
    expect(screen.getByRole('heading', { name: 'O que é uma variável' })).toBeInTheDocument();
    expect(screen.getByText(/O nome é teu, o valor é o que lá está/i)).toBeInTheDocument();
  });

  it('um passo de explicar mostra o texto e não mostra blocos nem painel', () => {
    render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_EXPLICAR} />);
    expect(screen.queryByTestId('area-blocos')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(`O teu código em ${NOMES.python}`)).not.toBeInTheDocument();
  });

  it('um passo de fazer mostra blocos e robô, e não mostra painel de texto', () => {
    render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_FAZER} />);
    expect(screen.getByTestId('area-blocos')).toBeInTheDocument();
    expect(screen.getByLabelText('O robô')).toBeInTheDocument();
    expect(screen.queryByLabelText(`O teu código em ${NOMES.python}`)).not.toBeInTheDocument();
  });

  it('um passo de fazer mostra a pergunta da sonda antes de a experiência', () => {
    render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_FAZER} />);
    // A pergunta vem antes de qualquer botão, e é a única coisa da sonda que
    // se lê sem fazer nada. É o que faz o aluno adivinhar antes de ver.
    const pergunta = screen.getByText(/O que vai aparecer no ecrã\?/i);
    expect(pergunta).toBeInTheDocument();
    expect(screen.queryByText(/Guarda um número e não dá erro nenhum/i)).not.toBeInTheDocument();
  });

  it('Continuar está desactivado enquanto o momento não for visto', () => {
    render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_FAZER} />);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('Ver a resposta mostra a revelação da sonda e nunca bloqueia', async () => {
    render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_FAZER} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver a resposta' }));
    expect(screen.getByText(/Guarda um número e não dá erro nenhum/i)).toBeInTheDocument();
  });

  it('Experimentar mostra a observação da sonda e activa Continuar', async () => {
    render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_FAZER} />);
    await userEvent.click(screen.getByRole('button', { name: 'Experimentar' }));
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });

  it('um passo de nomear mostra a palavra nomeada, e só a de nomear', () => {
    const { unmount } = render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_NOMEAR} />);
    expect(screen.getByText(NOMEADO)).toBeInTheDocument();
    unmount();
    // A mesma palavra não aparece num passo de explicar. Se aparecesse, a
    // palavra nomeada deixava de ser o que distingue a fase `nomear` das
    // outras duas — e a fase `nomear` deixava de existir.
    render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_EXPLICAR} />);
    expect(screen.queryByText(NOMEADO)).not.toBeInTheDocument();
  });

  it('a ficha mostra o ficheiro com as quinze linhas numeradas', () => {
    render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_DA_FICHA} />);
    expect(screen.getByText('variavel.py')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    // A linha 6, com a indentação dela. Se a ficha mostrasse as linhas
    // pela ordem errada, o aluno leria a 6 e responderia pela 7 — e um
    // teste que só contasse linhas passava na mesma.
    expect(screen.getByText('    total = total + 1')).toBeInTheDocument();
  });

  it('a ficha tem uma pergunta por linha, e são quinze', () => {
    render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_DA_FICHA} />);
    // Uma pergunta por linha do ficheiro, e o ficheiro tem quinze linhas.
    // Este número é o do ficheiro, não um número escolhido: se a lição
    // escrevesse um ficheiro de doze linhas, este teste mandava corrigir a
    // lição, e não o número.
    expect(screen.getAllByLabelText(/a tua resposta/i)).toHaveLength(15);
  });

  it('a ficha aceita a resposta certa, e diz-te que viste', async () => {
    render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_DA_FICHA} />);
    const campos = screen.getAllByLabelText(/a tua resposta/i);
    await userEvent.type(campos[0]!, 'guarda um número');
    await userEvent.click(screen.getAllByRole('button', { name: 'Verificar' })[0]!);
    expect(screen.getByText(/bem-vindo/i)).toBeInTheDocument();
  });

  it('a ficha recusa uma resposta que não diz a palavra que a pergunta pedia', async () => {
    render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_DA_FICHA} />);
    const campos = screen.getAllByLabelText(/a tua resposta/i);
    await userEvent.type(campos[0]!, 'banana');
    await userEvent.click(screen.getAllByRole('button', { name: 'Verificar' })[0]!);
    // A palavra é "Ainda não", e não "errado". O produto nunca diz que uma
    // resposta está errada: diz que ainda não disse o que a pergunta pedia.
    expect(screen.getByText(/Ainda não/i)).toBeInTheDocument();
  });

  it('a ficha não mostra blocos nem robô: um passo de leitura lê-se, não faz-se', () => {
    render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_DA_FICHA} />);
    expect(screen.queryByTestId('area-blocos')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('O robô')).not.toBeInTheDocument();
  });

  it('o painel de texto aparece no passo que precisa dele, e só nesse', () => {
    const { unmount } = render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_FAZER} />);
    expect(screen.getByLabelText(`O teu código em ${NOMES.python}`)).toBeInTheDocument();
    unmount();
    render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_EXPLICAR} />);
    expect(screen.queryByLabelText(`O teu código em ${NOMES.python}`)).not.toBeInTheDocument();
  });

  it('sem blocos ligados, Executar corre o teu texto e não finge uma comparação', async () => {
    const { container } = render(<Tela linguagem="python" licao={licao} passoInicial={PASSO_FAZER} />);
    const editor = screen.getByLabelText(`O teu código em ${NOMES.python}`);
    await userEvent.clear(editor);
    await userEvent.type(editor, 'total = "olá"');
    expect(screen.getByRole('button', { name: 'Executar' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Executar' }));
    // Sem blocos não há nada para comparar. Uma comparação contra o vazio
    // produziria uma lista de divergências que o aluno não pode ver nem
    // corrigir — e o produto a fingir que avaliou o que não avaliou.
    expect(container.querySelector('.divergencias')).toBeNull();
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npx vitest run src/ui/lecao/tela.test.tsx`
Expected: FAIL com erro de resolução de `./Tela`.

- [ ] **Step 3: Escrever `src/ui/lecao/SondasView.tsx`**

```typescript
import type { Sonda } from '../../conteudo/carregar';
import type { Erro } from '../../nucleo/tipos';

export interface SondasViewProps {
  sonda: Sonda | null;
  erros: Erro[];
  observado: boolean;
  aoObservar: () => void;
}

export function SondasView({ sonda, erros, observado, aoObservar }: SondasViewProps) {
  if (!sonda) return null;
  return (
    <section aria-label="Experiência" className="sonda">
      <p className="sonda-pergunta">{sonda.pergunta}</p>
      <div className="sonda-acoes">
        <button type="button" onClick={aoObservar}>
          Experimentar
        </button>
        <button type="button" onClick={aoObservar} className="sonda-revelar">
          Ver a resposta
        </button>
      </div>
      {observado ? (
        <div className="sonda-observada">
          <p>{sonda.esperado.porque}</p>
          {erros.map((e) => (
            <p key={`${e.classe}-${e.porque}`} className="sonda-erro">
              {e.porque}
            </p>
          ))}
        </div>
      ) : (
        <p className="sonda-resultado">Ainda não viste o que esta experiência mostra.</p>
      )}
    </section>
  );
}
```

Uma nota sobre o que **não** está neste ecrã: um aviso de "currículo
desactualizado". Já lá esteve, e era uma ideia boa mal realizada. O aviso
dizia ao aluno que a experiência dava uma classe e o texto prometia outra —
informação sobre o ficheiro YAML, escrita para quem escreve o currículo,
mostrada a quem está a aprender. E mandava correr `npm run sondas`, um
script que este plano não tem: as sondas correm no `npm test`, na Task 13.
Se a sonda e o motor discordam, o `portao.test.ts` falha antes de o build
acabar, e quem corrigir é quem escreveu a sonda. Por isso o ecrã do aluno
não tem nota de rodapé sobre o currículo: tem a pergunta, a experiência, e
a explicação.

- [ ] **Step 4: Escrever `src/ui/lecao/PassoView.tsx`**

```typescript
import { useState } from 'react';
import type { Momento, Passo, Sonda } from '../../conteudo/carregar';
import type { Erro } from '../../nucleo/tipos';
import { ROTULOS } from '../tipos';
import type { Fase } from '../../conteudo/carregar';
import { SondasView } from './SondasView';

export interface PassoViewProps {
  passo: Passo;
  fase: Fase;
  indicePasso: number;
  totalPassos: number;
  momento: number;
  momentoActual: Momento | null;
  sonda: Sonda | null;
  feito: Record<string, boolean>;
  respostas: Record<string, string>;
  erros: Erro[];
  aoResponder: (texto: string) => boolean;
  aoDefinirResposta: (momentoId: string, texto: string) => void;
  aoObservar: () => void;
  aoAvancar: () => void;
  aoAnterior: () => void;
  aoPasso: (passo: number) => void;
  referencia?: { nome: string; linhas: string[] };
  children?: React.ReactNode;
}

export function PassoView(props: PassoViewProps) {
  const { passo, fase, indicePasso, totalPassos, momento, momentoActual } = props;
  const [erro, definirErro] = useState<string | null>(null);
  const total = passo.momentos.length;
  const momentoFeito = momentoActual ? !!props.feito[momentoActual.id] : false;
  const tudoFeito = passo.momentos.every((m) => props.feito[m.id]);

  /** "Voltar" aparece quando há para onde voltar dentro do passo, ou quando
   *  o passo não é o primeiro. Antes não havia botão nenhum no primeiro
   *  passo da lição, e o aluno ficava preso sem caminho de volta. */
  const voltarVisivel = momento > 0 || indicePasso > 0;
  const voltar = (): void => {
    if (momento > 0) {
      props.aoAnterior();
      return;
    }
    props.aoPasso(indicePasso - 1);
  };

  const verificar = (): void => {
    const ok = props.aoResponder(props.respostas[momentoActual?.id ?? ''] ?? '');
    definirErro(ok ? null : 'Ainda não. Lê a pergunta outra vez e tenta com outras palavras.');
    if (ok) props.aoAvancar();
  };

  return (
    <section className="passo" aria-label="Passo">
      <header className="passo-cabecalho">
        <p className="passo-rotulo">
          {ROTULOS[fase]} · passo {indicePasso + 1} de {totalPassos}
        </p>
        <h2 className="passo-objetivo">{ROTULOS[fase]}</h2>
        {fase === 'nomear' && passo.nomear ? <p className="passo-nomeada">{passo.nomear}</p> : null}
        <p className="passo-texto">{passo.porque}</p>
      </header>

      {referencia ? (
        <figure className="ficha">
          <figcaption className="ficha-nome">{referencia.nome}</figcaption>
          <ol className="ficha-linhas">
            {referencia.linhas.map((linha, i) => (
              <li key={`${i}-${linha}`}>
                <span className="ficha-numero">{i + 1}</span>
                <code>{linha}</code>
              </li>
            ))}
          </ol>
        </figure>
      ) : null}

      {children}

      {referencia ? (
        <ol className="ficha-perguntas">
          {passo.momentos.map((m, i) => (
            <li key={m.id}>
              <p className="ficha-pergunta">{m.texto}</p>
              <label htmlFor={`resposta-${m.id}`}>A tua resposta — linha {i + 1}</label>
              <input
                id={`resposta-${m.id}`}
                value={props.respostas[m.id] ?? ''}
                onChange={(e) => props.aoDefinirResposta(m.id, e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  const ok = props.aoResponder(props.respostas[m.id] ?? '');
                  definirErro(ok ? null : 'Ainda não. Lê a pergunta outra vez e tenta com outras palavras.');
                }}
              >
                Verificar
              </button>
              {props.feito[m.id] ? <p className="ficha-bem-vindo">Bem-vindo, viste.</p> : null}
              <p className="ficha-progresso">
                {i + 1} de {total}
              </p>
            </li>
          ))}
        </ol>
      ) : momentoActual ? (
        <div className="momento">
          <p className="momento-contagem">
            {momento + 1} de {total}
          </p>
          <p className="momento-texto">{momentoActual.texto}</p>
        </div>
      ) : null}

      {erro ? <p className="momento-erro">{erro}</p> : null}

      {!referencia && momentoActual ? (
        <SondasView sonda={props.sonda} erros={props.erros} observado={!!props.feito[momentoActual.id]} aoObservar={props.aoObservar} />
      ) : null}

      <nav className="passo-navegacao">
        {voltarVisivel ? (
          <button type="button" onClick={voltar}>
            Voltar
          </button>
        ) : null}
        {referencia ? (
          /* Na ficha não há botão Continuar: as perguntas são as quinze, e o
             botão de cada uma é o Verificar. Um "Continuar" aqui saltaria
             perguntas, e saltá-las é o que o produto diz não fazer. */
          <button type="button" onClick={props.aoAvancar} disabled={!tudoFeito}>
            Terminar a leitura
          </button>
        ) : (
          <button type="button" onClick={props.aoAvancar} disabled={!momentoFeito}>
            Continuar
          </button>
        )}
        {indicePasso < totalPassos - 1 ? (
          <button
            type="button"
            onClick={() => props.aoPasso(indicePasso + 1)}
            disabled={!tudoFeito}
          >
            Passo seguinte
          </button>
        ) : null}
      </nav>
    </section>
  );
}
```

- [ ] **Step 5: Escrever `src/ui/lecao/Tela.tsx`**

```typescript
import { useMemo, useState } from 'react';
import type { Licao } from '../../conteudo/carregar';
import { avaliador } from '../../nucleo/avaliador';
import type { BlocoLeigo } from '../../nucleo/avaliador';
import { comparar } from '../../nucleo/divergencia';
import type { Divergencia } from '../../nucleo/divergencia';
import { avaliarTexto, classificar, emitir } from '../../projecoes/avaliar';
import type { Erro, Language, Recusa, Valor } from '../../nucleo/tipos';
import { Blocos } from '../painel-blocos';
import { PainelRobo, PORTA_ENTRADA, PORTA_SAIDA } from '../robo';
import { PainelTexto } from '../texto';
import { useLicao } from '../estado';
import { PassoView } from './PassoView';
import './lecao.css';

export interface TelaProps {
  /** A linguagem escolhida no seletor. A tela não a adivinha: é a decisão
   *  que o utilizador tomou e é a que decide o que se ensina. */
  linguagem: Language;
  licao: Licao;
  /** O passo a abrir. A vista não é um parâmetro: a vista é a fase do
   *  passo, e quem escolhe a fase é quem escreveu a lição. */
  passoInicial?: number;
}

export function Tela({ linguagem, licao, passoInicial = 0 }: TelaProps) {
  const estado = useLicao(licao, passoInicial);
  const [programa, definirPrograma] = useState<BlocoLeigo | null>(null);
  const [erros, definirErros] = useState<Erro[]>([]);
  const [valores, definirValores] = useState<Valor[]>([]);
  const [divergencias, definirDivergencias] = useState<Divergencia[]>([]);
  const [saida, definirSaida] = useState<string[]>([]);
  const [texto, definirTexto] = useState('');

  const momento = estado.momentoActual;
  const fonte = momento?.fonte ?? 'blocos';
  const gerado = useMemo(() => emitir(linguagem, programa), [linguagem, programa]);

  const recusaDe = (lista: Erro[]): Recusa | null => {
    const e = lista.find((x) => x.classe === 'Recusa');
    return e && e.classe === 'Recusa' ? e : null;
  };

  const correrBlocos = (): void => {
    const a = avaliador();
    a.executar(programa);
    definirErros(a.trace.erros);
    definirValores(a.trace.valores);
    definirSaida(a.trace.valores.map((v) => String(v.valor)));
    const rel = comparar(gerado, texto);
    definirDivergencias(rel.divergencias);
    if (bateSonda(estado.sonda, a.trace.erros)) estado.observar();
  };

  const correrTexto = (valor: string): void => {
    definirTexto(valor);
    const lista = avaliarTexto(linguagem, valor);
    definirErros(lista);
    // Só há divergência quando existe um programa de blocos para comparar.
    // No passo de texto não há blocos: correr o texto já é a resposta.
    definirDivergencias(programa ? comparar(gerado, valor).divergencias : []);
    definirSaida([]);
    if (bateSonda(estado.sonda, lista)) estado.observar();
  };

  return (
    <main className="tela">
      <h1>{licao.titulo}</h1>
      <PassoView
        passo={estado.passo}
        fase={estado.fase}
        indicePasso={estado.indicePasso}
        totalPassos={licao.passos.length}
        momento={estado.momento}
        momentoActual={momento}
        sonda={estado.sonda}
        feito={estado.feito}
        respostas={estado.respostas}
        erros={erros}
        aoResponder={estado.responder}
        aoDefinirResposta={estado.definirResposta}
        aoObservar={estado.observar}
        aoAvancar={estado.proximo}
        aoAnterior={estado.anterior}
        aoPasso={estado.irPara}
        referencia={licao.referencia}
      >
        <div className="tela-grelha">
          {fonte === 'blocos' ? (
            <div className="tela-grelha-blocos">
              <Blocos
                chave={`${estado.indicePasso}-${estado.momento}`}
                aoMudar={definirPrograma}
                carregar={programa}
              />
              <PainelRobo
                portas={[PORTA_ENTRADA, PORTA_SAIDA]}
                valores={valores}
                recusa={recusaDe(erros)}
              />
              <button type="button" onClick={correrBlocos} disabled={!programa}>
                Correr o programa
              </button>
            </div>
          ) : null}
          {fonte === 'texto' ? (
            <PainelTexto
              linguagem={linguagem}
              resposta={gerado.texto}
              aoComparar={correrTexto}
              divergencias={divergencias}
              semBlocos={!programa}
              saida={saida}
            />
          ) : null}
          {estado.fase === 'nomear' ? (
            <section aria-label={`O teu código em ${NOMES[linguagem]}`} className="painel-texto">
              <label htmlFor="codigo-gerado">O teu código em {NOMES[linguagem]}</label>
              <pre id="codigo-gerado" className="saida">
                {gerado.texto || '(ainda não há blocos)'}
              </pre>
              {gerado.anotacoes.map((a) => (
                <p key={a.linha} className="anotacao">
                  <strong>Linha {a.linha}:</strong> {a.porque}
                </p>
              ))}
            </section>
          ) : null}
        </div>
      </PassoView>
    </main>
  );
}

function bateSonda(sonda: { esperado: { classe: string } } | null, erros: Erro[]): boolean {
  if (!sonda) return false;
  return classificar(erros) === sonda.esperado.classe;
}
```

- [ ] **Step 6: Escrever `src/ui/lecao/lecao.css`**

```css
.tela {
  max-width: 78rem;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

.tela h1 {
  font-size: 1.1rem;
  color: #94a3b8;
  margin: 0 0 1.5rem;
}

.passo-cabecalho {
  max-width: 44rem;
}

.passo-rotulo {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
  color: #64748b;
  margin: 0 0 0.35rem;
}

.passo-objetivo {
  font-size: 1.35rem;
  margin: 0 0 0.75rem;
}

.passo-texto {
  line-height: 1.65;
  color: #cbd5e1;
  white-space: pre-line;
  margin: 0;
}

.tela-grelha {
  margin: 1.5rem 0;
}

.tela-grelha-blocos {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.7fr);
  gap: 1rem;
  align-items: start;
}

.area-blocos {
  min-height: 22rem;
  background: var(--fundo-escuro);
  border: 1px solid var(--borda);
  border-radius: 0.5rem;
}

.momento {
  border: 1px solid var(--borda);
  border-radius: 0.5rem;
  padding: 1rem;
  max-width: 34rem;
  margin: 1.5rem 0 0;
}

.momento-contagem,
.ficha-progresso {
  font-size: 0.7rem;
  color: #64748b;
  margin: 0 0 0.4rem;
}

.momento-texto {
  margin: 0;
  line-height: 1.55;
}

.momento-erro {
  color: var(--erro);
  font-size: 0.9rem;
}

.sonda {
  border: 1px solid var(--borda);
  border-radius: 0.5rem;
  padding: 1rem;
  max-width: 34rem;
  margin: 1rem 0 0;
}

.sonda-experiencia,
.sonda-pergunta {
  margin: 0 0 0.4rem;
}

.sonda-pergunta {
  font-weight: 600;
}

.sonda-acoes {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0.5rem 0;
}

.sonda-revelar {
  background: transparent;
}

.sonda-observada {
  border-left: 3px solid var(--ok);
  padding-left: 0.75rem;
}

.sonda-observada p {
  margin: 0.2rem 0;
  line-height: 1.55;
  white-space: pre-line;
}

.sonda-erro {
  color: var(--erro);
}

.sonda-resultado {
  color: #64748b;
  font-size: 0.9rem;
}

.sonda-aviso {
  color: var(--aviso);
  font-size: 0.85rem;
}

.ficha {
  background: var(--fundo-escuro);
  border: 1px solid var(--borda);
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
  max-width: 44rem;
  margin: 1.5rem 0;
}

.ficha-nome {
  font-family: ui-monospace, Menlo, monospace;
  color: #94a3b8;
  margin: 0 0 0.5rem;
}

.ficha-linhas {
  margin: 0;
  padding-left: 2.5rem;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.9rem;
  line-height: 1.8;
  white-space: pre;
}

.ficha-perguntas {
  max-width: 40rem;
  padding-left: 1.25rem;
}

.ficha-perguntas li {
  margin-bottom: 1.25rem;
}

.ficha-pergunta {
  margin: 0 0 0.4rem;
}

.ficha-perguntas label {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.25rem;
}

.ficha-perguntas input {
  display: block;
  width: 100%;
  padding: 0.4rem 0.6rem;
  border-radius: 0.25rem;
  border: 1px solid var(--borda);
  background: var(--fundo-escuro);
  color: var(--texto);
  margin-bottom: 0.5rem;
  font: inherit;
}

.ficha-bem-vindo {
  color: var(--ok);
  font-size: 0.9rem;
  margin: 0.25rem 0 0;
}

.anotacao {
  font-size: 0.9rem;
  line-height: 1.55;
  color: #cbd5e1;
}

.passo-navegacao {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

@media (max-width: 62rem) {
  .tela-grelha-blocos {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 7: Correr e ver passar**

Run: `npx vitest run src/ui/lecao/tela.test.tsx`
Expected: PASS. O teste `a ficha tem uma pergunta por linha, e são quinze` espera **15** campos — confirma que o YAML tem `l1` a `l15`, e que a sonda `o-que-o-ficheiro-diz` tem quinze linhas. Se o número não bater, o problema está no YAML da Task 8 e não aqui: a ficha tira as linhas da sonda e as perguntas são uma por linha, por construção.

- [ ] **Step 8: O seletor de linguagem — Review Focus 5**

O seletor tem de mostrar **três linhas reais** de cada linguagem (spec §6.5), e só as que têm projeção **e** lição. As restantes aparecem com a razão, nunca desaparecem em silêncio — e escolher uma que não está pronta não pode dar um ecrã em branco.

`src/ui/lecao/SeletorLinguagem.tsx` recebe, além das projeções, um mapa `porLinguagem` com o estado de cada uma:

```typescript
export interface OpcaoLinguagem {
  linguagem: Language;
  nome: string;
  /** Três linhas verdadeiras desta linguagem. Nunca uma descrição. */
  exemplo: string[];
  pronta: boolean;
  /** Quando não está pronta, porque é que não está. Vazio quando está. */
  falta: string;
}
```

O catálogo vive em `src/ui/lecao/catalogo.ts`, com os exemplos escritos à
mão — são texto de ecrã, e texto de ecrã não se gera. São **as seis**, todas
presentes, porque uma opção que desaparece em silêncio é a forma mais
barata de mentir sobre um produto. As quatro que não estão prontas dizem
isso e dizem porquê.

```typescript
import { LINGUAGENS, NOMES } from '../../nucleo/tipos';
import type { Language } from '../../nucleo/tipos';
import { NOMES } from '../../nucleo/tipos';
import type { Language } from '../../nucleo/tipos';
import type { OpcaoLinguagem } from './SeletorLinguagem';

/** O que cada opção mostra e porquê está como está. Escrito à mão porque é
 *  texto para o utilizador ler, e um texto de ecrã não se gera. */
const ESCRITO: Record<Language, Pick<OpcaoLinguagem, 'exemplo' | 'pronta' | 'falta'>> = {
  python: {
    exemplo: ['total = 5', 'print(total)', 'total = total + 1'],
    pronta: true,
    falta: '',
  },
  java: {
    exemplo: ['int total = 5;', 'System.out.println(total);', 'total = total + 1;'],
    pronta: false,
    falta: 'A lição de Java ainda não está escrita. A projeção está pronta e os testes passam.',
  },
  go: {
    exemplo: ['total := 5', 'fmt.Println(total)', 'total = total + 1'],
    pronta: false,
    falta: 'Ainda não há projeção de Go. A lição vem depois dela, nunca antes.',
  },
  typescript: {
    exemplo: ['let total: number = 5;', 'console.log(total);', 'total = total + 1;'],
    pronta: false,
    falta: 'Ainda não há projeção de TypeScript. A lição vem depois dela, nunca antes.',
  },
  javascript: {
    exemplo: ['let total = 5;', 'console.log(total);', 'total = total + 1;'],
    pronta: false,
    falta: 'Ainda não há projeção de JavaScript. A lição vem depois dela, nunca antes.',
  },
  sql: {
    exemplo: ['SELECT total FROM vendas;', 'WHERE total > 10', 'ORDER BY total;'],
    pronta: false,
    falta: 'O SQL é o Plano C, e o seu primeiro conceito não é uma variável. Fica para quando as outras cinco estiverem escritas.',
  },
};

/** As seis, pela ordem de `LINGUAGENS`, com o nome vindo do núcleo. */
export const CATALOGO: OpcaoLinguagem[] = LINGUAGENS.map((linguagem) => ({
  linguagem,
  nome: NOMES[linguagem],
  ...ESCRITO[linguagem],
}));
```

O `Record<Language, ...>` não é indireta: se amanhã entrar uma sétima linguagem
e alguém se esquecer do `ESCRITO`, isto não compila. Um array de literais
deixava passar em silêncio, e a sétima aparecia no seletor sem exemplo e
sem razão — que é exatamente o bug que o `Review Focus` nr. 5 persegue.

E o teste do ponto 5 do `Review Focus`:

```typescript
it('o catálogo traz as seis, todas visíveis', () => {
  expect(CATALOGO).toHaveLength(6);
  expect(CATALOGO.map((o) => o.nome)).toEqual([
    'Python', 'Java', 'Go', 'TypeScript', 'JavaScript', 'SQL',
  ]);
});

it('o seletor mostra as seis e só habilita a que está pronta', () => {
  render(<SeletorLinguagem opcoes={CATALOGO} />);
  expect(screen.getAllByRole('option')).toHaveLength(6);
  expect(screen.getByRole('option', { name: /Python/ })).toBeEnabled();
  for (const nome of [/Java/, /Go/, /TypeScript/, /JavaScript/, /SQL/]) {
    expect(screen.getByRole('option', { name: nome })).toBeDisabled();
  }
});

it('cada opção bloqueada diz porquê, e nenhuma desaparece em silêncio', () => {
  for (const o of CATALOGO.filter((x) => !x.pronta)) {
    const { unmount } = render(<SeletorLinguagem opcoes={CATALOGO} />);
    expect(screen.getByText(new RegExp(escapa(o.falta.slice(0, 28)), 'i'))).toBeInTheDocument();
    unmount();
  }
});

it('o nome de cada opção vem do núcleo, e é o mesmo em todo o lado', () => {
  for (const o of CATALOGO) expect(o.nome).toBe(NOMES[o.linguagem]);
});

it('uma opção pronta não tem razão de falta', () => {
  for (const o of CATALOGO.filter((x) => x.pronta)) expect(o.falta).toBe('');
});

/** O `falta` é texto com acentos e pontuação; a regex precisa de um
 *  `escape`. Sem isto o teste passa por acidente para a opção errada. */
function escapa(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

it('uma opção bloqueada mostra porque é que está bloqueada', () => {
  render(<SeletorLinguagem opcoes={CATALOGO} />);
  expect(screen.getByText(/lição de Java ainda não está escrita/)).toBeInTheDocument();
});

it('cada opção mostra três linhas verdadeiras, não uma descrição', () => {
  const java = CATALOGO.find((o) => o.linguagem === 'java')!;
  expect(java.exemplo).toHaveLength(3);
  expect(java.exemplo[1]).toBe('System.out.println(total);');
  expect(java.exemplo.join('\n')).not.toMatch(/linguagem|bloque|programa/i);
});

it('escolher uma linguagem bloqueada não muda o ecrã e não rebenta', () => {
  const { UNSAFE_getByRole } = render(<SeletorLinguagem opcoes={CATALOGO} />);
  UNSAFE_getByRole('option', { name: /Java/ }).click();
  expect(screen.getByRole('status').textContent).toMatch(/ainda não está escrita/);
});
```

Run: `npx vitest run src/ui/lecao/SeletorLinguagem.test.tsx`
Expected: PASS.

- [ ] **Step 9: Ligar em `src/main.tsx` — o seletor primeiro, a lição depois**

`main.tsx` é o único sítio do produto que conhece o catálogo, e é o lugar
onde a escolha do utilizador vive. Escreve-se **depois** do seletor e nunca
antes: um `main.tsx` com a linguagem escrita à mão é um produto que finge
ter seis linguagens e ensina uma.

```tsx
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CARREGAR, TEXTOS, temLicao } from './conteudo';
import { CATALOGO } from './ui/lecao/catalogo';
import { SeletorLinguagem } from './ui/lecao/SeletorLinguagem';
import { Tela } from './ui/lecao/Tela';
import { NOMES } from './nucleo/tipos';
import type { Language } from './nucleo/tipos';
import './ui/estilo.css';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta #raiz no index.html');

const CHAVE = 'variavel';

function Aplicacao(): JSX.Element {
  const [linguagem, definirLinguagem] = useState<Language | null>(null);

  // A escolha vem primeiro. Antes de escolher não há lição, porque a lição
  // é sobre uma linguagem e não sobre um conceito solto.
  if (linguagem === null) {
    return <SeletorLinguagem opcoes={CATALOGO} aoEscolher={definirLinguagem} />;
  }

  const bruto = TEXTOS[`${linguagem}/${CHAVE}`];
  if (bruto === undefined || !temLicao(linguagem)) {
    // Não chega aqui se o seletor só habilita o que está pronto. Está aqui
    // para que, se alguma vez chegar, o ecrã diga o que falta em vez de
    // ser um ecrã em branco — que é a diferença entre um produto que falha
    // e um produto que mente.
    return (
      <main className="tela">
        <h1>{NOMES[linguagem]}</h1>
        <p className="aviso">Ainda não há lição &quot;{CHAVE}&quot; escrita para {NOMES[linguagem]}.</p>
      </main>
    );
  }

  return <Tela linguagem={linguagem} licao={CARREGAR(bruto, linguagem)} />;
}

createRoot(raiz).render(
  <StrictMode>
    <Aplicacao />
  </StrictMode>,
);
```

Repara no que este ficheiro **não** faz: não verifica se a projeção existe,
não decide se a lição está pronta, e não tem uma lista de linguagens
escrita à mão. As três coisas vêm do `CATALOGO`, que por sua vez vem de
`LINGUAGENS`. Se amanhã entrar uma sétima linguagem, este ficheiro não
muda — e é esse o teste de que a architecture está no sítio.

- [ ] **Step 10: Typecheck, suite completa e commit**

```bash
npm run typecheck
npm test
npm run arvore
git add -A
git commit -m "feat: tela da licao, ficha de leitura, sondas e o seletor de linguagem

O seletor vem antes do ecrã e main.tsx nao escreve nenhuma linguagem a
mao. A escolha do utilizador decide o que se ensina, e o catalogo diz
com honestidade quais das seis ainda nao tem licao — todas as seis
visiveis, nenhuma a desaparecer em silencio."
```
### Task 13: Aceitacao da fatia

Isto nao e um teste. E o portao que decide se o Plano A existe, e sobe a historia de **por que e que a costura do `Projection` e uma tese e nao uma promessa**.

**Files:**
- Create: `src/projecoes/dourados.test.ts`, `src/conteudo/portao.test.ts`
- Test: os dois acima

**Interfaces:**
- Consumes: Task 6 — `emitir`, `avaliarTexto`; Task 4 — `REGISTO`, `obter`, `LINGUAGENS_COM_PROJECAO`; Task 7 — `CARREGAR`, `LICSOES`, `temLicao`, `executarSonda`; Task 1 — `LINGUAGENS`; Task 2 — `guardar(nome, valor)`, `guardarTexto(nome, valor)`, `repetir(vezes, corpo)`, `pilha(...blocos)`.
- Produces: nada de código. Produz a **decisão** de seguir para o Plano B ou de parar, e essa decisão fica escrita num commit.

- [ ] **Step 1: O teste que diz se a tese é verdadeira ou se era marketing**

`src/projecoes/dourados.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { LINGUAGENS } from '../nucleo/tipos';
import { LINGUAGENS_COM_PROJECAO, REGISTO, obter } from './registo';
import { avaliarTexto, emitir } from './avaliar';
import { guardar, guardarTexto, pilha, repetir } from '../nucleo/testes/dados';

describe('a costura é real, ou era só uma promessa', () => {
  it('toda linguagem registada é uma das seis, e toda projeção diz qual é', () => {
    for (const nome of LINGUAGENS_COM_PROJECAO) {
      expect(LINGUAGENS).toContain(nome);
      expect(obter(nome).linguagem).toBe(nome);
    }
  });

  it('não há projeções fora do registo, nem registos sem projeção', () => {
    expect(Object.keys(REGISTO).sort()).toEqual([...LINGUAGENS_COM_PROJECAO].sort());
  });

  it('toda projeção tem `emit` e `ler` que não são a mesma função', () => {
    // Se `emit` e `ler` forem o mesmo objeto, a projeção não sabe
    // escrever a linguagem que lê — e a lição fica a mentir por omissão.
    for (const nome of LINGUAGENS_COM_PROJECAO) {
      const p = obter(nome);
      expect(p.emit).not.toBe(p.ler);
    }
  });

  it('emit e ler são inversos uma da outra nas duas linguagens', () => {
    // A prova de que não há dois sistemas separados: o que a projeção
    // escreve, a mesma projeção lê sem erro de sintaxe.
    for (const nome of LINGUAGENS_COM_PROJECAO) {
      const casos = [
        pilha(guardar('total', 5)),
        pilha(guardarTexto('nome', 'olá')),
        pilha(repetir(3, [guardar('x', 1)])),
      ];
      for (const caso of casos) {
        const texto = emitir(nome, caso).texto;
        const erros = avaliarTexto(nome, texto);
        const deSintaxe = erros.filter((e) => e.porque.includes('não é'));
        expect({ nome, texto, deSintaxe: deSintaxe.length }).toEqual({ nome, texto, deSintaxe: 0 });
      }
    }
  });
});

describe('as duas linguagens divergem, e é isso que prova a tese', () => {
  it('o mesmo bloco dá texto diferente', () => {
    const p = pilha(guardar('total', 5));
    expect(emitir('python', p).texto).toBe('total = 5\n');
    expect(emitir('java', p).texto).toBe('int total = 5;\n');
  });

  it('a mesma violação dá respostas opostas, e sem uma linha de código duplicada', () => {
    // Estas duas linhas **têm de ser escritas à mão no painel**, e não
    // vir dos blocos. A razão é o próprio desenho do emissor: em Java o
    // `emit` escreve a declaração que o valor pede (`String` para um texto,
    // `int` para um número), e por isso um programa montado em blocos
    // nunca viola um tipo sozinho. A violação nasce quando alguém escreve
    // `int` e dá um texto — e é para isso que o painel de texto existe.
    //
    // Um teste que montasse a violação com blocos passaria a ser um teste
    // sobre o `emit`, não sobre a `Policy`, e não provaria nada.
    const emPython = avaliarTexto('python', "total = 'olá'\n");
    const emJava = avaliarTexto('java', 'int total = "olá";\n');
    expect(emPython.some((e) => e.classe === 'Recusa')).toBe(false);
    expect(emJava.some((e) => e.classe === 'Recusa')).toBe(true);
  });

  it('e o mesmo programa, escrito nas duas linguagens, dá a mesma resposta em Python', () => {
    // A versão Python da linha de cima: guarda um texto e não dá recusa
    // nenhuma. É a metade da spec §7 que a lição de Python ensina.
    const erros = avaliarTexto('python', "total = 'olá'\n");
    expect(erros.filter((e) => e.classe !== 'Observacao')).toEqual([]);
  });

  it('e o porque de cada recusa fala só da sua linguagem', () => {
    for (const e of avaliarTexto('java', 'int total = "olá";\n')) {
      expect(e.porque).not.toMatch(/Python/);
      expect(e.remedio).not.toMatch(/Python/);
    }
  });
});

describe('o que o Plano A ainda não tem, e diz-se em voz alta', () => {
  it('quatro linguagens não têm projeção, e o registo não as finge', () => {
    const semProjecao = LINGUAGENS.filter((l) => !LINGUAGENS_COM_PROJECAO.includes(l));
    expect(semProjecao.sort()).toEqual(['go', 'javascript', 'sql', 'typescript']);
  });

  it('e a lição de Java ainda não está escrita, apesar de a projeção estar pronta', () => {
    // A projeção Java existe e passa os testes; a lição não. Este teste
    // impede que o produto anuncie seis linguagens quando tem duas
    // projeções e uma lição.
    expect(LINGUAGENS_COM_PROJECAO).toContain('java');
    expect(temLicao('java')).toBe(false);
  });
});
```

- [ ] **Step 2: O portão de conteúdo**

`src/conteudo/portao.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { CARREGAR, LICSOES, temLicao } from './carregar';
import { executarSonda } from './sondas';
import { LINGUAGENS_COM_PROJECAO } from '../projecoes/registo';
import { LINGUAGENS } from '../nucleo/tipos';

const CHAVE = 'variavel';

describe('todas as lições escritas passam todas as sondas', () => {
  for (const linguagem of LICSOES) {
    it(`${linguagem}/${CHAVE}: todas as sondas passam`, () => {
      const licao = CARREGAR(TEXTOS[`${linguagem}/${CHAVE}`]!, linguagem);
      const resultados = licao.sondas.map((s) => executarSonda(s, linguagem));
      const falhadas = resultados.filter((r) => !r.ok);
      expect(falhadas.map((f) => ({ nome: f.nome, esperada: f.esperada, observada: f.observada, erro: f.erro })))
        .toEqual([]);
    });
  }
});

describe('o portão do §16.1: nenhuma lição sem sondas que passem', () => {
  it('toda linguagem com lição tem pelo menos seis sondas', () => {
    // Menos de seis sondas não é uma lição, é um exemplo. A lição mínima é
    // explicar, fazer, nomear, e ter as três histórias da tabela de
    // segurança da spec §7.
    for (const linguagem of LICSOES) {
      const licao = CARREGAR(TEXTOS[`${linguagem}/${CHAVE}`]!, linguagem);
      expect(licao.sondas.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('toda linguagem com lição tem as três fases', () => {
    for (const linguagem of LICSOES) {
      const licao = CARREGAR(TEXTOS[`${linguagem}/${CHAVE}`]!, linguagem);
      const fases = new Set(licao.passos.map((p) => p.fase));
      expect([...fases].sort()).toEqual(['explicar', 'fazer', 'nomear']);
    }
  });

  it('toda lição tem as três classes de resultado representadas', () => {
    // Uma lição que só tem `Observacao` não ensina nada sobre quando as
    // coisas rebentam. Uma lição que só tem `Recusa` está a ensinar Java
    // e a mentir.
    for (const linguagem of LICSOES) {
      const licao = CARREGAR(TEXTOS[`${linguagem}/${CHAVE}`]!, linguagem);
      const classes = new Set(licao.sondas.map((s) => s.esperado.classe));
      expect(classes.has('Recusa') || classes.has('FalhaRuntime')).toBe(true);
    }
  });
});

describe('o estado real do produto, em números', () => {
  it('o catálogo é coerente com o que existe', () => {
    // Este teste não falha. Serve para quando alguém pergunta "quantas
    // linguagens há?", e a resposta está num `git grep` e não na cabeça
    // de ninguém.
    const comTudo = LINGUAGENS.filter((l) => temLicao(l));
    const soProjecao = LINGUAGENS_COM_PROJECAO.filter((l) => !temLicao(l));
    console.log(
      `catálogo: ${LINGUAGENS.length} linguagens, ` +
      `${LINGUAGENS_COM_PROJECAO.length} projeções, ` +
      `${comTudo.length} lições escritas, ` +
      `${soProjecao.length} projeções sem lição`,
    );
    expect(soProjecao).toContain('java');
  });
});
```

- [ ] **Step 3: Correr tudo, e não poupar o typecheck**

```bash
npm test
npm run arvore
npx tsc --noEmit
```

Expected: tudo PASS. O `arvore` diz `núcleo limpo`. O typecheck não diz nada. O `portao.test.ts` imprime a linha de `catálogo:` no ecrã do terminal — **leia-a**, porque é o número que tem de aparecer no que se escreve a seguir.

- [ ] **Step 4: O portão manual — o único que o `npm test` não faz**

Isto não é automatizável, e é o que a spec chama critério de sucesso. **Não o salte.**

```bash
npm run dev
```

E fazer, à mão, exatamente isto:

1. Abrir a aplicação. O seletor de linguagem aparece primeiro, com **três linhas reais** de Python e de Java. A de Go, TypeScript, JavaScript e SQL aparece bloqueada, com a razão.
2. Escolher Python. A lição «O que é uma variável» abre.
3. Correr o ficheiro de quinze linhas. Duas linhas rebentam. Anotar quais.
4. Abrir o painel de texto e escrever `total = 'olá'` numa linha e `print(total)` noutra. A primeira passa, a segunda falha. **A falha tem de dizer que o `total` guarda texto, e o `porque` tem de mencionar o `total` e não uma linha.**
5. Escrever `int total = 5;` no painel de Python. Tem de ser recusado, com um `porque` que diga que esta linha não é Python — **não** que está sintacticamente errada, e **não** com um código de erro.
6. Escolher o bloco `guardar` e tentar dar um texto a um sítio que só aceita número. O robô recusa, e o `remedio` tem de dizer o que fazer, sem mencionar Java nem Python.
7. Escolher Java no seletor (depois de desfazer o bloqueio, para testar a projeção). O painel passa a mostrar `int total = 5;`. Escrever `total = 5` é recusado, e o `porque` diz que em Java o tipo escreve-se antes do nome.

**Se algum destes sete passos falhar, a fatia não está pronta.** O número sete é o que prova a costura a mão, e é o único que o `npm test` não apanha.

- [ ] **Step 5: Commitar**

```bash
git add -A
git commit -m \"test: aceitacao da fatia — a costura e uma tese, nao uma promessa

emit e ler sao inversos uma da outra nas duas linguagens: o que a
projecao escreve, a mesma projecao le sem erro de sintaxe. E o mesmo
programa julgado pelas duas politicas da Recusa em Java e silencio em
Python, sem uma linha de codigo duplicada.

O portao tambem diz em voz alta o que falta: quatro linguagens sem
projecao, e a projecao de Java pronta sem licao escrita. Um produto que
anuncia seis linguagens quando tem duas projecoes e uma licao esta a
mentir, e o teste existe para isso nao acontecer sem querer.
\"
```

- [ ] **Step 6: Decidir, e escrever a decisão em voz alta**

Depois do portão, uma de duas coisas é verdadeira. **Escreve-se num commit, não se pensa:**

**Se os sete passos do Step 4 passaram e a lição de Python levou menos de uma tarde:**

```bash
git commit --allow-empty -m \"decisao: o formato da sonda esta certo, o Plano B pode comecar

A licao de variavel em Python levou [X] a autorar. A costura aguentou a
segunda projecao sem uma linha de codigo duplicada. Os sete passos do
portao manual passaram.

Segue-se a licao de Java, e depois o Plano B: Go, TypeScript, JavaScript
e as suas licoes. O SQL fica para o Plano C, porque o vocabulario
declarativo e um salto real e nao uma projecao a mais.\"
```

**Se algum dos sete passos falhou, ou a lição levou mais de uma tarde:** pára. O problema não é a lição, é o formato — e corrigir o formato depois de escrever duas lições custa o dobro de o corrigir agora. Escreve-se o que falhou, e só se decide depois:

```bash
git commit --allow-empty -m \"decisao: parar. [O que falhou]

Nao se escreve a segunda licao sobre um formato que ainda nao provou
que aguenta. A spec 16.1 manda parar antes da segunda, nao depois da
sexta, e e agora.\"
```
