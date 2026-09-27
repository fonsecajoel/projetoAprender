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

Os 46 ficheiros que as 13 tarefas criam, e nada mais. A lista sai das linhas
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
    blocos.ts                          BlocoLeigo, BLOCOS, CORES,               T2
                                       entradaDe, campoDe, corpoDe,
                                       identificador, identificadorJava.
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
    emissor.ts                         `Emissor`, `textoDe`, `linhasDe`.         T4
                                       O que é igual nas seis: contar as
                                       linhas e numerar as anotações.
    registo.ts                         REGISTO, obter, temProjecao,             T4
                                       LINGUAGENS_COM_PROJECAO.
    python.ts                          `emit` + `ler`. A primeira, completa.    T4
    java.ts                            `emit` + `ler`, e `declaracaoDe`.         T5
                                       A que prova a costura.
    avaliar.ts                         emitir, avaliarTexto, classificar,      T6
                                       bate, divergir.
    termos.ts                          NOME, EXPRESSAO, eNome, eventosDeConta,   T6
                                       ladoCulpado. A leitura de um termo é
                                       igual nas seis; o que muda é o que cada
                                       linguagem exige dele, e isso vem por
                                       argumento.
    dourados.test.ts                   Um ficheiro dourado por projeção.        T13

  conteudo/
    esquema.ts                         `Sonda`, `Passo`, `Momento`, `Licao`.   T7
    carregar.ts                        CARREGAR, TEXTOS, LICSOES, temLicao,    T7
                                       ErroDeAutoria.
    sondas.ts                          executarSonda.                           T7
    index.ts                           O que o `main.tsx` importa.              T7
    python/variavel.yml                A lição. Nasce mínima na T7, para que  T7, T8
                                       essa tarefa seja verde, e a T8
                                       reescreve-a a sério.
    python/variavel.test.ts            A lição posta a prova: as quinze    T8
                                       linhas, as três palavras nomeadas e
                                       a linha que o aluno lê.
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

  it('nenhum nome é o identificador a gritar, exceto onde tem de ser', () => {
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

    const r2 = E(restricao('lista', 'números'), num(3));
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

function num(n: number): Valor {
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
    const único = t.eventos.find((e) => e.tipo === 'erro');
    expect(único).toBeDefined();
    if (!único || único.tipo !== 'erro') throw new Error('esperava um evento de erro');
    expect(único.erro.porque.length).toBeGreaterThan(0);
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
    const e = registar(3, num(1));
    expect(e).toEqual({ tipo: 'valor', passo: 3, valor: num(1) });
  });
});

describe('cabeEm', () => {
  // A restrição é uma coluna da tabela, e não um `restricao('número')`
  // fixo no laço. Com ela fixa, uma linha que diz "número em texto" tinha
  // de passar um número e de ser julgada por um sítio de número — e o nome
  // da linha passava a ser mentira. `número em texto` só é falso se o
  // sítio for de texto, e é por isso que o sítio viaja na linha.
  const casos: Array<[string, RestricaoDeTipo, Valor, boolean]> = [
    ['número em número', restricao('número'), num(3), true],
    ['texto em número', restricao('número'), palavra('olá'), false],
    ['número em texto', restricao('texto'), num(3), false],
    ['lógico em número', restricao('número'), logico(true), false],
    ['lógico em texto', restricao('texto'), logico(false), false],
    ['actor em número', restricao('número'), val('actor', 'coelho', EXPLICACAO_VAZIA, O), false],
    ['lista em número', restricao('número'), val('lista', [1], EXPLICACAO_VAZIA, O), false],
    ['função em número', restricao('número'), val('função', () => 1, EXPLICACAO_VAZIA, O), false],
    ['undefined em número', restricao('número'), val('número', undefined, EXPLICACAO_VAZIA, O), false],
    ['null em número', restricao('número'), val('número', null, EXPLICACAO_VAZIA, O), false],
    ['NaN em número', restricao('número'), val('número', NaN, EXPLICACAO_VAZIA, O), false],
    ['Infinity em número', restricao('número'), val('número', Infinity, EXPLICACAO_VAZIA, O), false],
    ['acima de RANGE_INTEIROS em número', restricao('número'), num(1e9), false],
    ['número recusado em número', restricao('número'), { ...num(1), recusado: true }, false],
    ['número recusado em texto', restricao('texto'), { ...num(1), recusado: true }, false],
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
import { Aplicacao } from './ui/lecao/Aplicacao';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('o index.html precisa de #raiz');
createRoot(raiz).render(
  <StrictMode>
    <Aplicacao />
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

  it('guardar texto guarda o texto, e não dá erro nenhum', () => {
    // Este nome já foi escrito duas vezes a mentir sobre o que o motor
    // fazia. Na primeira versão dizia «sem erro» num ficheiro em que o
    // teste seguinte provava que havia uma `Recusa`; na segunda dizia que
    // guardar texto «já é um erro». Nas duas o `guardar` recusava texto — e
    // a primeira lição, que diz «guarda um número com o nome total. Depois
    // guarda um texto com o nome nome», era impossível de fazer. Ninguém a
    // completava.
    //
    // A recusa vinha do avaliador de blocos, e um avaliador de blocos não
    // sabe em que linguagem vive: quem recusa é a linguagem (§6.4), e o
    // Python não recusa nada disto. O que rebenta, e rebenta mais tarde, é
    // o `log` de uma variável que nunca foi guardada — que é a história
    // que a lição conta, e o que a §10 diz do Python.
    const a = avaliador();
    const v = a.avaliar('guardar', { nome: 'nome', VALOR: { txt: 'olá' } }, 1);
    expect(v.tipo).toBe('texto');
    expect(v.valor).toBe('olá');
    expect(v.recusado).toBe(false);
    expect(a.trace.erros.length).toBe(0);
  });

  it('o texto guardado volta pelo nome, e continua a ser texto', () => {
    // A ida e a volta é o que interessa: uma variável que se lembra do que
    // ficou lá dentro, e de que tipo esse conteúdo é. Sem a volta, o teste
    // acima provava só que o `guardar` não se queixou — e não que o valor
    // ficou guardado.
    const a = avaliador();
    a.avaliar('guardar', { nome: 'nome', VALOR: { txt: 'olá' } }, 1);
    const v = a.avaliar('dador_num', { VALOR: { ref: 'nome' } }, 1);
    expect(v.tipo).toBe('texto');
    expect(v.valor).toBe('olá');
    expect(a.trace.erros.length).toBe(0);
  });
  it('a única recusa que o motor ainda faz é um número grande demais', () => {
    // Convém dizer isto em voz alta, porque é uma afirmação forte e é o
    // estado real do motor depois desta mudança: nos blocos, **nenhum** tipo
    // é recusado. Quem recusa é a linguagem (§6.4) — o Java escreve
    // `int total = 'olá';` e recusa, e o Python escreve `total = 'olá';` e
    // não recusa, e é essa diferença que o produto existe para mostrar. Um
    // avaliador de blocos que recusasse tipos estaria a decidir por conta
    // própria o que cada linguagem permite, e a lição passava a mentir
    // sobre as seis.
    //
    // A recusa que fica é a do tamanho: um número acima de `RANGE_INTEIROS`
    // não existe em nenhum número das linguagens, e recusá-lo é dizer a
    // verdade sobre todas.
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: 1_000_000 }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('Recusa');
    expect(e && e.classe === 'Recusa' && e.esperado).toBe('número');
    expect(e && e.remedio.length).toBeGreaterThan(0);
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

  it('guardarTexto guarda o mesmo 5 como palavra, e lê-se de volta uma palavra', () => {
    // `guardarTexto` embrulha em `{txt: '5'}`. O `5` que a pessoa escreveu e
    // uma palavra com dois algarismos dentro. Uma variável que guarda uma
    // palavra guarda uma palavra, e o que muda quando se lê de volta é
    // exatamente o que a pessoa escreveu: o valor, não o tipo de quem o
    // escreveu. Este é o parágrafo do ficheiro de leitura que diz que em
    // Python `5` e `'5'` são coisas diferentes, e é o que a sonda
    // `texto-que-nao-e-numero` acaba por mostrar.
    const a = avaliador();
    a.executar(pilha(guardarTexto('total', 5)));
    const guardado = a.trace.valores.find((v) => v.origem.bloco === 'guardar');
    expect(guardado?.tipo).toBe('texto');
    expect(guardado?.valor).toBe('5');
    expect(a.trace.erros.length).toBe(0);
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

  it('aceita um número, porque o print do Python também aceita', () => {
    // A recusa antiga dizia «O que dizes tem de ser uma palavra», e isso é
    // falso: `print(5)` é legal em Python. A primeira lição conta
    // precisamente a história de um `print` a imprimir um número — o
    // ficheiro de leitura tem `print(total)` na sétima linha, e `total`
    // vale 5 na segunda. Um motor que recusa aquele gesto ensina que o
    // Python é uma linguagem que não o deixa.
    const a = avaliador();
    const v = a.avaliar('dizer', { VALOR: 5 }, 1);
    expect(v.tipo).toBe('número');
    expect(v.valor).toBe(5);
    expect(a.trace.erros.length).toBe(0);
  });

  it('um valor que já falhou não ganha uma segunda mensagem pelo caminho', () => {
    // Este teste já existia, e o que afirmava era o contrário do que devia:
    // esperava **dois** erros e dizia que dois era a resposta certa, com um
    // comentário a explicar que lia o último para não passar por engano.
    // Não era engano: era a especificação do defeito.
    //
    // Um `{ref}` que ainda não tem valor já diz o seu erro dentro de
    // `valorDe`, e o `dizer` acrescentava uma `Recusa` por cima. Um gesto, um
    // erro, e no ecrã duas frases ao mesmo tempo: «a variável "fantasma" não
    // tem valor» e «este sítio só aceita texto». Quem lê as duas aprende que
    // são dois problemas, e são um — e a segunda frase era falsa, porque o
    // que chegou não era um número nem uma palavra: era nada.
    const a = avaliador();
    a.avaliar('dizer', { VALOR: { ref: 'fantasma' } }, 1);
    expect(a.trace.erros.length).toBe(1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e?.porque).toContain('fantasma');
  });


describe('valores de entrada', () => {
  it('{txt} é texto', () => {
    expect(avaliador().avaliar('dador_num', { VALOR: { txt: 'x' } }, 1).tipo).toBe('texto');
  });
  it('uma palavra escrita a direito é um literal de texto', () => {
    // É assim que a lição escreve um texto: `valor: olá`, e não
    // `valor: {txt: olá}`. A projeção já tratava a palavra solta como
    // texto — emitia `total = 'olá'` — e o avaliador não: o mesmo programa
    // recebia `Observacao` quando vinha do texto e `Recusa` quando vinha
    // dos blocos. Duas implementações da mesma semântica a discordar uma da
    // outra é a forma mais cara de um produto ter sondas que não podem
    // estar erradas, e foi o que a Task 12 encontrou ao correr a lição da
    // Task 8 pelos blocos.
    const a = avaliador();
    const v = a.avaliar('dador_num', { VALOR: 'olá' }, 1);
    expect(v.tipo).toBe('texto');
    expect(v.valor).toBe('olá');
    expect(a.trace.erros.length).toBe(0);
  });

  it('um número é número', () => {
    expect(avaliador().avaliar('dador_num', { VALOR: 3 }, 1).tipo).toBe('número');
  });
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
  it('uma forma que o motor não sabe ler é FalhaRuntime, e diz que não sabe', () => {
    // Não é um tipo errado: é uma forma que nenhuma das quatro formas de
    // valor resolve. A versão antiga dizia «Este sítio só aceita número.
    // Recebeste número» — uma frase que se nega a si mesma, e uma frase que
    // se nega a si mesma não ensina o tipo de lado nenhum. O produto inteiro
    // existe para trocar adivinhação por razão, e uma razão que se nega a si
    // mesma é a pior das duas.
    const a = avaliador();
    a.avaliar('dador_num', { VALOR: { qqq: 1 } }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e && e.classe === 'FalhaRuntime' && e.porque.length).toBeGreaterThan(0);
    expect(a.trace.erros.length).toBe(1);
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
    // O bloco que falha passou a ser um `log` de uma variável que nunca foi
    // guardada. Era um `dizer` com um número dentro, e deixou de ser quando
    // o `dizer` deixou de recusar números — que é o comportamento certo, e
    // por isso o gatilho deste teste tinha de mudar. Um teste cujo gatilho
    // desapareceu não se apaga: muda de gatilho, ou deixa de provar que a
    // pilha para.
    const a = avaliador();
    a.executar(pilha(guardar('total', 1), log({ ref: 'fantasma' }), log(2)));
    const guardou = a.trace.valores.filter((v) => v.origem.bloco === 'guardar');
    expect(guardou.length).toBe(1);
    expect(a.trace.erros.length).toBe(1);
    expect(a.trace.erros[0]?.origem.bloco).toBe('log');
  });

  it('o bloco depois do erro não corre', () => {
    const a = avaliador();
    a.executar(pilha(guardar('total', 1), log({ ref: 'fantasma' }), guardar('outro', 2)));
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
    // avulso: `inicializa` é o que abre a linha, e é o `avaliar` direto que
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
    //
    // O `expect` do meio não é decoração. Este teste itera uma lista de
    // erros; se o motor deixar de dar erro nenhum, o `for` corre zero vezes
    // e o teste passa a medir o nada. Passou a passar por cima de uma lista
    // vazia até a Task 12 o fazer, e é o mesmo defecto que se viu três
    // vezes nos testes de ecrã.
    const a = avaliador();
    a.avaliar('guardar', { nome: '', VALOR: 1 }, 1);
    a.avaliar('dizer', { VALOR: { ref: 'fantasma' } }, 1);
    a.avaliar('dador_num', { VALOR: { qqq: 1 } }, 1);
    expect(a.trace.erros.length).toBeGreaterThan(0);
    for (const e of a.trace.erros) {
      expect(e.porque.length).toBeGreaterThan(0);
      if ('remedio' in e) expect(e.remedio.length).toBeGreaterThan(0);
    }
  });

  it('nenhum destes gestos inventa um erro', () => {
    // A lista de cima é a lista do que **tem** de dar erro. Esta é a lista
    // do que **não** pode dar, e é tão importante como a outra: um motor
    // que inventa recusas recusa a lição inteira, e o aluno nunca chega ao
    // fim de um passo. Guardar texto, dizer um número e imprimir o que ficou
    // guardado são gestos normais em Python, e nenhum deles pode ser uma
    // recusa — e a palavra escrita a direito é a forma como a lição escreve
    // um texto, que é a forma que a projeção também aceita.
    const gestos: Array<[string, () => Avaliador]> = [
      ['guardar um texto', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'nome', VALOR: { txt: 'olá' } }, 1);
        return a;
      }],
      ['guardar um texto escrito a direito', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'nome', VALOR: 'olá' }, 1);
        return a;
      }],
      ['dizer um número', () => {
        const a = avaliador();
        a.avaliar('dizer', { VALOR: 5 }, 1);
        return a;
      }],
      ['dizer o que ficou guardado', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 't', VALOR: 5 }, 1);
        a.avaliar('dizer', { VALOR: { ref: 't' } }, 1);
        return a;
      }],
      ['três voltas a guardar e a dizer, o programa da ficha em blocos', () => {
        // Um `guardar` e um `dizer` que não se olham um para o outro, porque
        // cada bloco é a sua linha: o âmbito do motor é por bloco, não por
        // pilha (a Task 2 fixou isso, e a ficha de leitura é lida e não
        // executada). Este caso existe para cubrir o laço, a atribuição e o
        // `dizer` ao mesmo tempo — e para que uma mudança futura no âmbito
        // apareça aqui e não na lição.
        const a = avaliador();
        a.executar(repetir(3, [guardar('total', 5), dizer(5)]));
        return a;
      }],
    ];

    for (const [nome, gesto] of gestos) {
      const a = gesto();
      expect(a.trace.erros.length, nome).toBe(0);
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

/** Os ids de bloco. Slugs ASCII em minúsculas: são a identidade do bloco, e
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
  variavel: 'variavel',
} as const;

/** As cores, e a tabela é `as const` por uma razão que o compilador
 *  impôs e que se provou ser a certa: com `Record<string, string>` e o
 *  `noUncheckedIndexedAccess` ligado, `CORES.guardar` é `string | undefined`, e
 *  uma cor em falta passava a ser uma cor qualquer — ou, pior, um `undefined`
 *  entregue ao Blockly. Uma tabela de cores cujas chaves se podem perder não
 *  é uma tabela de cores. */
export const CORES = {
  guardar: '#2563eb',
  repetir: '#7c3aed',
  dizer: '#059669',
  log: '#0d9488',
  pressionar: '#ea580c',
  dador_num: '#3b82f6',
  texto: '#10b981',
  logico: '#f59e0b',
  acts: '#a855f7',
  variavel: '#0891b2',
} as const;

const PALAVRAS_PYTHON = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'True', 'try', 'while', 'with', 'yield',
]);

const PALAVRAS_JAVA = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'float', 'for', 'goto', 'if', 'implements', 'import',
  'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package',
  'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
  'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
  'try', 'void', 'volatile', 'while',
]);

/** Converte um nome escrito por uma pessoa num identificador que não choca
 *  com a linguagem. Os acentos saem, o que não é ASCII vira `_`, e um nome
 *  que começa por número ganha um `v_` à frente.
 *
 *  As palavras reservadas entram no fim e **por linguagem**: `int` é palavra em
 *  Java e não é em Python, e `class` é palavra nas duas. Uma lista só — a da
 *  primeira linguagem — produz `int int = 5;`, que não é Java, e o aluno
 *  recebe um erro de sintaxe numa linha em que só escreveu o nome da variável.
 *  Uma palavra reservada que não apanhe é o mesmo tipo de erro que uma
 *  palavra que apanha a mais: nos dois, o produto escreveu uma coisa que não
 *  quereva escrever. */
function identificadorDe(nome: string, reservadas: Set<string>): string {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_');
  const limpo = base.length === 0 || /^[0-9]/.test(base) ? `v_${base}` : base;
  return reservadas.has(limpo) ? `${limpo}_` : limpo;
}

/** Um identificador Python válido. */
export function identificador(nome: string): string {
  return identificadorDe(nome, PALAVRAS_PYTHON);
}

/** Um identificador Java válido. */
export function identificadorJava(nome: string): string {
  return identificadorDe(nome, PALAVRAS_JAVA);
}

/**
 * O tipo *declarado* de um bloco, e só esse.
 *
 *  A palavra «declarado» está no nome por uma razão que a Task 11 vai pagar:
 *  um bloco que traz o valor dentro de si — um número, um texto, um sim ou
 *  não, um ator — tem um tipo antes de o programa correr. Uma referência a
 *  uma variável **não tem**, e por isso `variavel` não está nesta tabela.
 *
 *  A ausência não é uma falha de preenchimento: é a resposta certa. O tipo de
 *  `total` só existe depois da primeira atribuição, e quem a preenchesse com
 *  «número» estaria a mentir ao aluno sobre a linguagem que ele escolheu.
 */
export const TIPO_DE_BLOCO: Record<string, Tipo> = {
  dador_num: 'número',
  texto: 'texto',
  logico: 'lógico',
  acts: 'actor',
};

// ---------------------------------------------------------------------------
// Ler um bloco
// ---------------------------------------------------------------------------
//
// Estas três funções vivem ao lado de `BlocoLeigo` — e não em cada projeção —
// porque todas as projeções precisam delas e porque uma delas já foi escrita
// duas vezes com o mesmo erro. `corpoDe` é o caso: o corpo de um `repetir`
// vive em `inputs.CORPO.stack`, e `pilhaDe` também abre uma pilha de um
// `CORPO`. Confundir os dois dá um `for` repetido até a pilha estourar, e o
// erro que aparece ao aluno fala da pilha e não dos blocos.

/** O valor de uma ranhura, ou `undefined` se não houver. */
export function entradaDe(b: BlocoLeigo, chave: string): unknown {
  const i = b.inputs?.[chave];
  return i !== undefined && 'valor' in i ? i.valor : undefined;
}

/** O que a pessoa escreveu no bloco.
 *
 *  O nome de uma variável é um `campo`, não uma entrada. Ler o nome de um
 *  `guardar` de `inputs.NOME` — que não existe — produz `undefined = 5` para o
 *  bloco mais básico do produto, e esse é o tipo de bug que só aparece quando
 *  se vê o texto gerado, nunca num teste que só verifique tipos. */
export function campoDe(b: BlocoLeigo, chave: string): unknown {
  return b.fields?.[chave]?.valor;
}

/** O corpo de um `repetir`, e não `pilhaDe(b)`. */
export function corpoDe(b: BlocoLeigo): BlocoLeigo[] {
  return b.inputs?.CORPO?.stack ?? [];
}
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

  it('a recusa diz QUANDO acontece, e não só o que está errado', () => {
    // A `Policy` tem `quando` para isto, e o `porque` era só "Um sítio de
    // número não guarda texto" — que está certo e não diz nada de quando. É a
    // lacuna mais cara do produto: a diferença entre as seis linguagens **é** o
    // momento, e quem não sabe se o erro aparece antes ou depois de o programa
    // correr não aprendeu nada que distinga uma linguagem de outra.
    const antes = interpretar([atribuir('total', t('olá'), 'número')], POLITICAS.java, origemNo);
    const noDado = interpretar([atribuir('total', t('olá'), 'número')], POLITICAS.sql, origemNo);

    expect(antes[0]!.porque).toMatch(/antes de o código correr/);
    expect(noDado[0]!.porque).toMatch(/no dado/);
    // E as duas frases têm de ser diferentes entre si, ou a diferença de
    // momento voltou a ser invisível mesmo estando escrita no código.
    expect(antes[0]!.porque).not.toBe(noDado[0]!.porque);
  });

  it('e o erro de incompatibilidade também diz quando aparece', () => {
    // Esta é a linha mais importante da lição de Python: `total = 'olá'` passa,
    // e a linha seguinte é que rebenta. Sem o momento, o aluno lê "total guarda
    // texto, e este sítio precisa de número" e não percebe que o estrago já
    // estava feito uma linha antes.
    const aoUsar = interpretar(
      [atribuir('total', t('olá')), usar('total', 'número')],
      POLITICAS.python,
      origemNo,
    );
    expect(aoUsar[0]!.porque).toMatch(/quando este valor é usado/);
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

/** A parte da frase que diz **quando** a recusa aparece.
 *
 *  A diferença entre as seis linguagens *é* esta parte, e uma frase que só
 *  dissesse o que está errado deixaria essa diferença invisível mesmo depois de
 *  estar escrita no código. Alguém que lê "total guarda texto, e este sítio
 *  precisa de número" sem saber se o erro vem antes ou depois de o programa
 *  correr não aprendeu nada que distinga uma linguagem de outra — e é
 *  precisamente essa distinção que a lição existe para ensinar.
 *
 *  Nenhuma destas frases nomeia uma linguagem. O momento é um fato sobre a
 *  linguagem, não o nome dela, e o núcleo diz o momento sem saber qual é. */
const QUANDO: Record<Quando, string> = {
  'antes de correr': 'A recusa vem antes de o código correr: nem chega a começar.',
  'ao usar': 'O erro só aparece quando este valor é usado, e não antes.',
  'quando o dado entra': 'A limitação não se resolve: fica escrita no dado, para sempre.',
};

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
            porque: `Um sítio de ${alvo} não guarda ${ev.tipoValor}. ${QUANDO[politica.quando]}`,
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
              `${ev.nome} guarda ${guardado.tipo}, e este sítio precisa de ${ev.tipoValor}. ${QUANDO[politica.quando]}`,
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

### Task 4: A interface `Projection`, o registo, e a projeção Python

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
- Create: `src/projecoes/tipos.ts`, `src/projecoes/registo.ts`, `src/projecoes/emissor.ts`, `src/projecoes/python.ts`
- Test: `src/projecoes/python.test.ts`, `src/projecoes/registo.test.ts`

**Interfaces:**
- Consumes: Task 1 — `Language`, `Tipo`, `Valor`, `Erro`, `restricao`, `MAX_ITERACOES`; Task 2 — `BlocoLeigo`, `identificador`, `pilhaDe`; Task 3 — `POLITICAS`, `EventoLido`, `AMOSTRA`.
- Produces: `Familia`, `Projection`, `Gerado`, `Anotacao`, `LerResultado`, `REGISTO`, `obter(linguagem)`, `temProjecao(linguagem)`, `LINGUAGENS_COM_PROJECAO`, `python`, `BLOCOS_IMPERATIVOS`, `Emissor`, `NOMES_DE_CONTADOR`, `textoDe(e)`, `linhasDe(texto)`.

- [ ] **Step 1: Escrever o teste falhado — a projeção Python**

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

  it('fuga a linha nova, porque uma linha nova dentro de aspas não é Python', () => {
    // Verificado contra o Python 3.14: `x = 'a` + linha nova + `b'` dá
    // `unterminated string literal (detected at line 1)`. Escrever o caractere
    // tal e qual produzia duas linhas, e a segunda era código — o aluno via um
    // programa partido sem que nada lhe dissesse que estava partido.
    expect(python.emit(pilha(dizer({ txt: 'a\nb' }))).texto).toBe("print('a\\nb')\n");
    expect(python.emit(pilha(dizer({ txt: 'a\tb\r\nc' }))).texto).toBe("print('a\\tb\\r\\nc')\n");
    // A barra de fugar tem de ser a primeira a ser tratada: se a `\` virasse
    // `\\` depois de o `\n` virar `\n`, cada fuga passava a duplicar-se.
    expect(python.emit(pilha(dizer({ txt: 'a\\nb' }))).texto).toBe("print('a\\\\nb')\n");
  });

  it('e o que o leitor lê é o que a pessoa escreveu', () => {
    // A fuga e a desfuga são o mesmo caminho pelos dois lados. Se divergirem,
    // quem escreve o bloco vê uma coisa e o painel de texto lê outra, e a
    // diferença é um caractere que ninguém consegue ver.
    const ev = python.ler("print('a\\nb')\n").eventos[0]!;
    if (ev.tipo !== 'imprimir') throw new Error('esperava imprimir');
    expect(ev.valor.valor).toBe('a\nb');
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
    // `ler` fossem dois objetos separados, cada um com as suas ideias
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
  it('tem Python e Java, e só essas duas', () => {
    expect([...LINGUAGENS_COM_PROJECAO].sort()).toEqual(['java', 'python']);
  });

  it('as duas imperativas declaram o mesmo vocabulário de blocos', () => {
    // As duas partilham os cinco blocos. A lista vive em `python.ts` porque é
    // onde a spec a escreveu, e a de Java vai buscá-la em vez de a repetir: uma
    // lista escrita duas vezes diverge no dia em que a spec ganha um bloco, e
    // ninguém se lembra de ir às duas.
    expect(obter('java').blocos).toEqual(obter('python').blocos);
  });

  it('as duas declaram a mesma família, e são as únicas', () => {
    expect(obter('java').familia).toBe(obter('python').familia);
    expect(obter('java').familia).toBe('imperativa');
  });

  it('e as duas declaram políticas opostas, que é o que a costura prova', () => {
    expect(obter('java').policy.recusaNoTipo).toBe(true);
    expect(obter('python').policy.recusaNoTipo).toBe(false);
  });

  it('obter devolve a projeção pedida', () => {
    expect(obter('python').linguagem).toBe('python');
    expect(obter('java').linguagem).toBe('java');
  });

  it('obter uma linguagem sem projeção diz qual falta, e não devolve indefinido', () => {
    expect(() => obter('go')).toThrow(/go/);
    expect(temProjecao('go')).toBe(false);
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
    // Um erro que diz "não há go; há java, python" diz também o próximo passo.
    expect(() => obter('go')).toThrow(/java/);
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

  it('temProjecao é falso para as quatro que faltam, e verdadeiro para as duas que há', () => {
    const comProjecao = LINGUAGENS_COM_PROJECAO;
    expect(comProjecao).toHaveLength(2);
    expect(temProjecao('python')).toBe(true);
    expect(temProjecao('java')).toBe(true);
    for (const l of ['go', 'javascript', 'sql', 'typescript'] as const) {
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
import { java } from './java';
import { python } from './python';
import type { Projection } from './tipos';

export const REGISTO: Partial<Record<Language, Projection>> = {
  python,
  java,
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

- [ ] **Step 6: Escrever `src/projecoes/emissor.ts`**

O que é igual nas seis projeções, e que por isso vive uma vez só. O `Emissor`
da primeira projeção contava as linhas do corpo de um laço a partir de 1, e a
anotação do `x = 1` dizia "linha 1" — sendo que a linha 1 é o `for`. **Uma
anotação que aponta para a linha errada é pior do que nenhuma**: o aluno lê a
explicação ao lado da linha errada e aprende a explicação errada, com a
confiança de quem a leu no sítio certo. Duas cópias teriam o bug duas vezes, e
corrigir uma deixaria a outra a dizer que a coisa está bem.

Os nomes de contador são escolhidos **por nível de aninhamento** e não por
emissão: um laço dentro de outro não pode repetir o nome — `for (int i…) { for
(int i…) }` não compila — mas dois laços irmãos **podem**, e devem, porque é o
que se escreve à mão.

`src/projecoes/emissor.ts`:

```typescript
import type { Anotacao } from './tipos';

/** Os nomes de contador disponíveis para os laços, por ordem de preferência. */
export const NOMES_DE_CONTADOR = ['i', 'j', 'k', 'm', 'n'] as const;

/** Acumula linhas e anotações, sabendo em que linha do programa está.
 *
 *  Vive aqui, e não em cada projeção, porque é a *mesma* em todas: o que muda
 *  entre linguagens é o texto que se escreve e a frase que o explica — e isso
 *  é o `emitir` de cada uma. O que não muda é a contagem das linhas, e a
 *  contagem é a parte em que a primeira projeção tinha o bug: o emissor de um
 *  corpo de laço contava a partir de 1 e a anotação do `x = 1` dizia "linha
 *  1", sendo que a linha 1 é o `for`. **Uma anotação que aponta para a linha
 *  errada é pior do que nenhuma**: o aluno lê a explicação ao lado da linha
 *  errada e aprende a explicação errada, com a confiança de quem a leu no sítio
 *  certo.
 *
 *  Duas cópias desta classe teriam o bug duas vezes, e corrigir uma deixaria a
 *  outra a dizer que a coisa está bem.
 *
 *  Os nomes de contador são escolhidos **por nível de aninhamento** e não por
 *  emissão, e a diferença importa em Java: um laço dentro de outro não pode
 *  repetir o nome — `for (int i…) { for (int i…) }` não compila, porque a
 *  variável já está declarada — mas dois laços irmãos **podem**, e devem: é o
 *  que se escreve à mão, e um `j` que aparece sem um `i` antes dele confunde
 *  quem está a ler. Um `Set` partilhado pela emissão dava `i` e `j` a dois
 *  irmãos; um `Set` novo por nível dava `i` aos dois e `i` outra vez ao
 *  aninhado, que também não compila. Cada nível vê os nomes dos níveis que o
 *  cercam e os seus, e é daí que sai `i`, `j`, e outra vez `i`. */
export class Emissor {
  readonly linhas: string[] = [];
  readonly anotacoes: Anotacao[] = [];

  private readonly nomesPorNivel: Map<number, string[]>;

  constructor(
    private nivel = 0,
    private base = 0,
    nomesPorNivel?: Map<number, string[]>,
  ) {
    this.nomesPorNivel = nomesPorNivel ?? new Map<number, string[]>();
  }

  recuo(): string {
    return '    '.repeat(this.nivel);
  }

  linha(texto: string, porque: string): void {
    this.linhas.push(this.recuo() + texto);
    this.anotacoes.push({ linha: this.base + this.linhas.length, porque });
  }

  /** O emissor do corpo de um bloco que abre uma linha — um laço.
   *
   *  As linhas do pai já contadas são a base, e é isso que faz a primeira
   *  linha do corpo ser a linha a seguir à do laço. O `nome` é o contador que
   *  o laço vai usar, e ele desce **numa cópia** do mapa: o corpo não pode
   *  repetir o nome, e os laços que vierem a seguir deste laço no mesmo sítio
   *  podem — que é o que se escreve à mão, e o que a cópia dá. */
  entrar(nome?: string): Emissor {
    const nomes = new Map(this.nomesPorNivel);
    if (nome !== undefined) {
      nomes.set(this.nivel, [...(nomes.get(this.nivel) ?? []), nome]);
    }
    return new Emissor(this.nivel + 1, this.base + this.linhas.length, nomes);
  }

  /** Pega nas linhas de um corpo e junta-as às deste, por ordem.
   *
   *  Chamar isto **antes** de escrever a linha de fecho é o que põe a
   *  chaveta a seguir ao corpo. Ao contrário, o laço abre, o fecho fecha, e o
   *  corpo fica escrito lá fora — código que não compila, com a anotação de
   *  cada linha do corpo a apontar para uma linha que não existe. */
  absorver(outro: Emissor): void {
    this.linhas.push(...outro.linhas);
    this.anotacoes.push(...outro.anotacoes);
  }

  /** Um nome de contador que nenhum laço à volta esteja a usar.
   *
   *  Não reserva nada: quem reserva é o `entrar`, e só para o corpo. Guardar o
   *  nome aqui atava os laços irmãos — o segundo `for` sairia `j`, e um `j` sem
   *  um `i` antes dele é uma coisa que ninguém escreve à mão. */
  nomeDeContador(): string {
    const tomados = new Set<string>();
    for (const nomes of this.nomesPorNivel.values()) {
      for (const nome of nomes) tomados.add(nome);
    }
    for (const nome of NOMES_DE_CONTADOR) {
      if (!tomados.has(nome)) return nome;
    }
    // Cinco laços aninhados já são absurdo para uma lição, e um nome novo é o
    // que o Java faria com `var`. O erro — se algum dia aparecer — diz o que
    // aconteceu, em vez de virar um `undefined` no meio do texto.
    return `c${this.nivel}_${tomados.size}`;
  }
}

/** O programa inteiro, como texto: uma linha por linha emitida, com `\n`. */
export function textoDe(e: Emissor): string {
  return e.linhas.map((l) => `${l}\n`).join('');
}

/** As linhas de um texto gerado, sem a linha a mais do fim. */
export function linhasDe(texto: string): string[] {
  return texto.replace(/\n$/, '').split('\n');
}
```

- [ ] **Step 7: Escrever `src/projecoes/python.ts`**

```typescript
import type { BlocoLeigo } from '../nucleo/blocos';
import { corpoDe, campoDe, entradaDe, identificador } from '../nucleo/blocos';
import { pilhaDe } from '../nucleo/avaliador';
import { AMOSTRA, POLITICAS } from '../nucleo/semantica';
import type { EventoLido } from '../nucleo/semantica';
import { val } from '../nucleo/tipos';
import type { FalhaRuntime, Valor } from '../nucleo/tipos';
import { Emissor, textoDe } from './emissor';
import { eNome, eventosDeConta, ladoCulpado } from './termos';
import type { Gerado, LerResultado, Projection } from './tipos';

export const BLOCOS_IMPERATIVOS = ['guardar', 'repetir', 'dizer', 'log'];

// ---------------------------------------------------------------------------
// Escrever: blocos → Python
// ---------------------------------------------------------------------------

/** Escreve um texto como um literal Python.
 *
 *  A barra de fugar é tratada **primeiro**, sempre. Se o `\n` se transformasse
 *  numa fuga antes de a barra ser dobrada, cada fuga seria duplicada — e o
 *  texto `a\nb` (barra, n, b) sairia `a\\nb`, que o Python lê como barra
 *  seguida de n. Verificado contra o Python 3.14: uma linha nova escrita tal
 *  e qual dentro de aspas dá `unterminated string literal`, e o produto nunca
 *  mostra ao aluno uma linha que não corre. */
function fugar(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/'/g, "\\'");
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
      e.absorver(dentro);
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
const NÚMERO = /^[-+]?\d+(\.\d+)?$/;
// Texto entre aspas simples **ou duplas** — e nada mais. A casa é a das
// simples; o que se aceita são as duas. Recusar `x = "olá"` seria ensinar o
// aluno a desconfiar do produto, que é o pior que um professor de sintaxe
// pode fazer. E a barra-crua ficou de fora *de propósito*: verifyi contra o
// Python que `x = \`olá\`` é erro de sintaxe, e aceitar aqui seria trocar um
// erro que o aluno cometia por um que o produto inventava.
const TEXTO = /^(['"])([\s\S]*?)\1$/;

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
  if (NÚMERO.test(termo)) return val('número', Number(termo), AMOSTRA, origem);
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
  if (NÚMERO.test(dentro)) {
    return {
      eventos: [{ passo, tipo: 'imprimir', valor: valorDe(dentro, passo)! }],
      erros: [],
    };
  }
  const txt = TEXTO.exec(dentro);
  if (txt) {
    return { eventos: [{ passo, tipo: 'imprimir', valor: valorDe(dentro, passo)! }], erros: [] };
  }
  if (eNome(dentro)) {
    // `print(total)` não declara tipo. Emitir aqui um `usar` com
    // `tipoValor: 'texto'` fazia o núcleo responder "total guarda número, e
    // este sítio precisa de texto" — um erro que o Python não tem, numa
    // linha que o Python aceita. A omissão é a informação: este sítio não
    // impõe tipo a nada.
    return { eventos: [{ passo, tipo: 'usar', nome: dentro }], erros: [] };
  }

  // Uma conta dentro do `print`. **Faltava aqui, e é a linha de que a lição
  // de Python precisa:** `total = 'olá'` passa, e é `print(total + 1)` que
  // diz que este sítio precisa de número. Sem esta rama o produto recusava a
  // linha — e com a recusa certa, por motivo errado, que é pior do que não
  // dizer nada.
  //
  // O `tipoDosNomes` é `'número'` **por causa do Python**: `'olá' + 1` é erro
  // logo a correr, porque o Python não converte nada sozinho. O mesmo código
  // na Java passa `undefined`, e a diferença está escrita num lugar só.
  const conta = eventosDeConta(dentro, passo, (t) => valorDe(t, passo), 'número');
  if (conta !== null) return { eventos: conta, erros: [] };
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

  if (eNome(resto)) {
    // Uma cópia não impõe tipo ao destino. `x = total` é válido com
    // qualquer coisa em `total`.
    return { eventos: [{ passo, tipo: 'usar', nome: resto }], erros: [] };
  }

  // Um termo de uma conta é um número, um texto, True/False — ou o nome de
  // outra variável. Um nome não é um termo inválido: é o termo mais comum, e é
  // o que faz `total = total + 1` ser a linha da lição. O que não é um termo
  // é `2 - 3` escrito do lado direito de um `1 -`.
  //
  // A leitura da conta é a do leitor partilhado, e a diferença entre_requireer
  // número e não requerer está escrita num sítio só, e não em dois — que é
  // como os dois ficheiros divergiam.
  const conta = eventosDeConta(resto, passo, (t) => valorDe(t, passo), 'número');
  if (conta !== null) return { eventos: conta, erros: [] };
  const culpado = ladoCulpado(resto, (t) => valorDe(t, passo));
  if (culpado !== null) {
    // A expressão é válida para o Python e não se sabe ler. Dizer isso é
    // ensino; transformar o termo em `0` sem dizer nada é fazer o aluno ler
    // `a = 1 - 0` e pensar que foi o que escreveu.
    return {
      eventos: [],
      erros: [
        erro(
          passo,
          `Esta conta ainda não sei ler: "${resto}". Numa conta, cada lado tem de ser um número, um texto, True/False, ou o nome de outra variável.`,
          `Nesta lição as contas são de dois termos, e cada termo tem de ser um número, um texto, True/False, ou o nome de outra variável. O termo "${culpado}" não é nenhum dos quatro.`,
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
    return { texto: textoDe(e), anotacoes: e.anotacoes };
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

- [ ] **Step 8: Ler expressões — `total = total + 1`**

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

- [ ] **Step 9: Correr os testes e ver passar**

Run: `npx vitest run src/projecoes`
Expected: PASS.

- [ ] **Step 10: Correr a suite toda, o verificador de árvore e o typecheck**

Run: `npm test && npm run arvore && npx tsc --noEmit`
Expected: PASS, `núcleo limpo`, e o typecheck mudo.

- [ ] **Step 11: Commitar**

```bash
git add -A
git commit -m "feat: interface Projection, registo, e a projeção Python

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

### Task 5: A projeção Java — a que prova a costura

Uma projeção só não prova nada: constrói-se qualquer coisa monolinguagem e chama-se-lhe invariância. Esta é a segunda, e o que ela tem dedemonstrar são três coisas que a de Python não podia mostrar:

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

- [ ] **Step 2: Escrever o teste falhado — a projeção Java**

`src/projecoes/java.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { java } from './java';
import { python } from './python';
import { POLITICAS, interpretar } from '../nucleo/semantica';
import type { EventoLido } from '../nucleo/semantica';
import { val } from '../nucleo/tipos';
import type { Tipo, Valor } from '../nucleo/tipos';
import { dizer, guardar, guardarTexto, log, pilha, repetir } from '../nucleo/testes/dados';
import { linhasDe } from './emissor';

/** O que `emit` aceita. `ReturnType<typeof java.emit>` seria o `Gerado` que ele
 *  devolve — e o que se quer escrever aqui é o bloco que se lhe dá. */
type Programa = Parameters<typeof java.emit>[0];

const AMOSTRA = { porque: 'aqui', remedio: 'aqui' } as const;

function v(tipo: Tipo, valor: unknown, passo = 1): Valor {
  return val(tipo, valor, AMOSTRA, { bloco: 'texto', ranhura: 0, passo });
}

function eventoDe(texto: string, i = 0): EventoLido {
  const ev = java.ler(texto).eventos[i];
  if (ev === undefined) throw new Error(`a linha "${texto}" não produziu evento ${i}`);
  return ev;
}

describe('emit: o mesmo bloco, outra linguagem', () => {
  it('o mesmo programa dá texto diferente nas duas projeções', () => {
    // A prova de que a costura é real e não um rótulo: um `BlocoLeigo`, dois
    // textos, e a diferença entre eles não está em nenhum `if` — está na
    // projeção, que é a única camada que conhece sintaxe.
    const programa = pilha(guardar('total', 5), log({ ref: 'total' }));
    expect(python.emit(programa).texto).toBe('total = 5\nlog(total)\n');
    expect(java.emit(programa).texto).toBe('int total = 5;\nlog(total);\n');
  });

  it('guardar número escreve o tipo à mão', () => {
    // Em Java o tipo escreve-se antes do nome, sempre. É a linha inteira da
    // lição: o mesmo bloco que em Python dá `total = 5` dá aqui `int total = 5;`.
    expect(java.emit(pilha(guardar('total', 5))).texto).toBe('int total = 5;\n');
  });

  it('o tipo escrito depende do valor, e não só do genre', () => {
    // `int` não aceita casas decimais e `double` aceita. Um `Record<Tipo, string>`
    // — um nome por tipo — escreveria `int` para o 1.5 e produziria Java que
    // não compila. O `Tipo` deste produto só tem um `número`, e é a projeção
    // que sabe que em Java esse número tem duas palavras.
    expect(java.emit(pilha(guardar('total', 1.5))).texto).toBe('double total = 1.5;\n');
    expect(java.emit(pilha(guardarTexto('total', 5))).texto).toBe('String total = "5";\n');
    expect(java.emit(pilha(guardar('pronto', true))).texto).toBe('boolean pronto = true;\n');
  });

  it('um guardar de outra variável escreve var, e diz porquê', () => {
    // O tipo de `contagem` só existe quando o programa corre, e um `int` escrito
    // aqui seria uma adivinhação: se `contagem` for um texto, `int total =
    // contagem;` não compila. `var` existe em Java, deixa o compilador
    // descobrir, e por isso é a única palavra honesta para este caso — que a
    // anotação tem de explicar, porque a palavra sozinha ensina o contrário da
    // lição.
    const g = java.emit(pilha(guardar('total', { ref: 'contagem' })));
    expect(g.texto).toBe('var total = contagem;\n');
    expect(g.anotacoes[0]!.porque).toContain('var');
  });

  it('dizer é o System.out.println, e aceita qualquer tipo', () => {
    expect(java.emit(pilha(dizer({ txt: 'olá' }))).texto).toBe('System.out.println("olá");\n');
    expect(java.emit(pilha(dizer(5))).texto).toBe('System.out.println(5);\n');
    expect(java.emit(pilha(dizer({ ref: 'total' }))).texto).toBe('System.out.println(total);\n');
  });

  it('fuga a barra e a linha nova, porque uma linha nova fecha a string', () => {
    // `System.out.println("a` + linha nova + `b");` é uma string por terminar.
    // Verificado: é a mesma armadilha do Python, e a correção é a mesma.
    expect(java.emit(pilha(dizer({ txt: 'a\nb' }))).texto).toBe('System.out.println("a\\nb");\n');
    expect(java.emit(pilha(dizer({ txt: 'diz "olá"' }))).texto)
      .toBe('System.out.println("diz \\"olá\\"");\n');
    // A barra de fugar primeiro, sempre: `a\nb` com barra sai `a\\nb`, que o
    // Java lê como barra seguida de n.
    expect(java.emit(pilha(dizer({ txt: 'a\\nb' }))).texto)
      .toBe('System.out.println("a\\\\nb");\n');
  });

  it('repetir escreve o for clássico, e a chaveta fecha depois do corpo', () => {
    // A ordem das linhas é o que decide se o Java é válido. A primeira versão
    // desta projeção empurrava o `}` para antes do corpo — abria, fechava, e o
    // corpo ficava escrito lá fora.
    expect(java.emit(pilha(repetir(3, [guardar('x', 1)]))).texto)
      .toBe('for (int i = 0; i < 3; i++) {\n    int x = 1;\n}\n');
  });

  it('dois laços aninhados não podem usar o mesmo nome de contador', () => {
    // O nome do contador não pode ser um contador de módulo: com dois laços
    // aninhados, o mesmo nome é uma variável repetida em Java.
    expect(java.emit(pilha(repetir(2, [repetir(2, [guardar('x', 1)])]))).texto)
      .toBe('for (int i = 0; i < 2; i++) {\n    for (int j = 0; j < 2; j++) {\n        int x = 1;\n    }\n}\n');
  });

  it('dois laços irmãos podem usar o mesmo nome, e o texto lê-se melhor', () => {
    expect(java.emit(pilha(repetir(2, [guardar('x', 1)]), repetir(2, [guardar('y', 2)]))).texto)
      .toBe(
        'for (int i = 0; i < 2; i++) {\n    int x = 1;\n}\n' +
          'for (int i = 0; i < 2; i++) {\n    int y = 2;\n}\n',
      );
  });

  it('e duas emissões não se baralham entre si', () => {
    // Um contador de módulo seria reposto no início de cada `emit` e por isso
    // pareceria funcionar — até dois `emit` intercalados, o que um ecrã React
    // faz sem querer. O `Set` de nomes é por emissão.
    const primeiro = java.emit(pilha(repetir(2, [repetir(2, [guardar('x', 1)])]))).texto;
    const meio = java.emit(pilha(repetir(9, [guardar('y', 1)]))).texto;
    const segundo = java.emit(pilha(repetir(2, [repetir(2, [guardar('x', 1)])]))).texto;
    expect(meio).toContain('int i = 0; i < 9;');
    expect(segundo).toBe(primeiro);
  });

  it('um laço sem corpo fecha a chaveta na mesma, porque em Java isso é legal', () => {
    // Um bloco vazio entre chavetas é Java válido. Em Python o `for` sem corpo
    // não é — e é a diferença que a anotação tem de fazer, se é que a faz.
    expect(java.emit(pilha(repetir(3, []))).texto)
      .toBe('for (int i = 0; i < 3; i++) {\n}\n');
  });

  it('toda linha gerada tem anotação, com o número de linha certo', () => {
    // Quatro linhas: o `for`, os dois blocos do corpo, e o `}`. A primeira
    // versão deste teste dizia cinco, e a contagem certa está a dois testes
    // acima — um número escrito sem contar passa porque ninguém o confere.
    const g = java.emit(pilha(repetir(2, [guardar('x', 1), log({ ref: 'x' })])));
    expect(linhasDe(g.texto)).toEqual([
      'for (int i = 0; i < 2; i++) {',
      '    int x = 1;',
      '    log(x);',
      '}',
    ]);
    expect(g.anotacoes).toHaveLength(4);
    for (let i = 0; i < g.anotacoes.length; i += 1) {
      expect(g.anotacoes[i]!.linha).toBe(i + 1);
      expect(g.anotacoes[i]!.porque.length).toBeGreaterThan(0);
    }
  });

  it('a anotação do corpo conta a partir do for, e a da chaveta aponta para a chaveta', () => {
    const g = java.emit(pilha(repetir(2, [guardar('x', 1), log({ ref: 'x' })])));
    const porLinha = new Map(g.anotacoes.map((a) => [a.linha, a.porque]));
    expect(porLinha.get(1)).toContain('2');
    expect(porLinha.get(2)).toContain('Guarda x');
    expect(porLinha.get(3)).toContain('log');
    expect(porLinha.get(4)).toContain('chaveta');
  });

  it('o que o emit escreve, o ler lê — e com o mesmo tipo', () => {
    // A promessa da T4 escrita de forma a não depender de alguém a lembrar
    // dela: cada linha que o `emit` produz, o `ler` tem de devolver com o tipo
    // que a linha declara. Se os dois lados divergirem, o painel de texto passa
    // a discordar do ecrã de blocos, e o aluno vê as duas coisas ao mesmo
    // tempo sem saber qual é a errada.
    const casos: Array<[Programa, Tipo]> = [
      [pilha(guardar('total', 5)), 'número'],
      [pilha(guardar('total', 1.5)), 'número'],
      [pilha(guardarTexto('total', 5)), 'texto'],
      [pilha(guardar('pronto', false)), 'lógico'],
      [pilha(repetir(3, [guardar('x', 1)])), 'número'],
    ];
    for (const [programa, tipo] of casos) {
      const linhas = linhasDe(java.emit(programa).texto);
      for (const linha of linhas) {
        if (linha.trim() === '}' || linha.startsWith('for')) continue;
        const r = java.ler(`${linha}\n`);
        expect(r.erros, linha).toEqual([]);
        const ev = r.eventos[0]!;
        if (ev.tipo === 'atribuir') {
          expect(ev.tipoValor, linha).toBe(tipo);
          expect(ev.restricao, linha).toBe(tipo);
        }
      }
    }
  });

  it('nenhuma anotação menciona outra linguagem', () => {
    const g = java.emit(pilha(guardar('total', 5), log({ ref: 'total' })));
    expect(g.anotacoes.length).toBeGreaterThan(0);
    for (const a of g.anotacoes) {
      expect(a.porque).not.toMatch(/Python|Go|TypeScript|SQL|JavaScript/);
    }
  });

  it('nenhuma anotação diz que o programa vai correr bem, porque em Java não se sabe', () => {
    const g = java.emit(pilha(guardar('total', 5), log({ ref: 'total' })));
    for (const a of g.anotacoes) {
      expect(a.porque).not.toMatch(/vai correr|funciona|corre bem|não dá erro/);
    }
  });

  it('um bloco desconhecido gera um comentário, nunca código inválido', () => {
    expect(java.emit({ type: 'condicao', inputs: { VALOR: { valor: 1 } } }).texto)
      .toBe('// bloco do v2: condicao\n');
  });

  it('programa vazio gera string vazia e zero anotações', () => {
    const g = java.emit(null);
    expect(g.texto).toBe('');
    expect(g.anotacoes).toEqual([]);
  });
});

describe('ler: o que a Java aceita', () => {
  it('atribuição com tipo', () => {
    const r = java.ler('int total = 5;\n');
    expect(r.erros).toEqual([]);
    expect(r.eventos).toHaveLength(1);
  });

  it('a atribuição declara a restrição, e é isso que faz a recusa ao parse', () => {
    // `int total = "olá";` é recusado em Java antes de o programa correr, e a
    // recusa vem do `restricao` que este evento traz. A mesma linha em Python
    // não tem onde declarar nada, e por isso não pode ser recusada.
    const ev = eventoDe('int total = 5;\n');
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('número');
    expect(ev.restricao).toBe('número');
  });

  it('int e double são ambos número, e ambos declaram número', () => {
    for (const linha of ['int total = 5;', 'double total = 5;', 'double total = 1.5;']) {
      const ev = eventoDe(`${linha}\n`);
      if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
      expect(ev.tipoValor, linha).toBe('número');
      expect(ev.restricao, linha).toBe('número');
    }
  });

  it('String declarado', () => {
    const ev = eventoDe('String nome = "olá";\n');
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('texto');
    expect(ev.restricao).toBe('texto');
  });

  it('boolean declarado', () => {
    const ev = eventoDe('boolean pronto = true;\n');
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('lógico');
  });

  it('var não declara tipo a ninguém, e a atribuição não impõe um', () => {
    // `var` é o único sítio de Java onde o tipo não se escreve, e por isso é o
    // único onde a atribuição não impõe um tipo. Tratar o `var` como se
    // declarasse `int` faria o produto recusar `var total = "olá";`, que é Java
    // válido.
    const ev = eventoDe('var total = "olá";\n');
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.tipoValor).toBe('texto');
    expect(ev.restricao).toBeUndefined();
  });

  it('System.out.println conta como uso, e sem tipo declarado', () => {
    // O `println` é sobrecarregado: em Java aceita qualquer tipo. Um `usar` com
    // `tipoValor: 'texto'` faria o núcleo dizer "total guarda número, e este
    // sítio precisa de texto" — um erro que o Java não tem.
    const r = java.ler('int total = 5;\nSystem.out.println(total);\n');
    expect(r.erros).toEqual([]);
    const usar = r.eventos[1]!;
    if (usar.tipo !== 'usar') throw new Error('esperava usar');
    expect(usar.nome).toBe('total');
    expect(usar.tipoValor).toBeUndefined();
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

  it('as chavetas e os comentários não são erro', () => {
    expect(java.ler('// um comentário\n{\n}\n').erros).toEqual([]);
  });

  it('o texto lido é o texto que foi escrito', () => {
    const ev = eventoDe('String nome = "a\\nb";\n');
    if (ev.tipo !== 'atribuir') throw new Error('esperava atribuir');
    expect(ev.valor.valor).toBe('a\nb');
  });
});

describe('ler: o que a Java recusa, e o que diz', () => {
  it('falta o ponto-e-vírgula é dito como falta de ponto-e-vírgula', () => {
    // O ponto de revisão da spec: uma falta de `;` em Java tem de ser
    // reportada como falta de `;`, e não como "função desconhecida". A regra é
    // simétrica à do Python e faz a mesma coisa: só se culpa o `;` depois de a
    // linha ter falhado por outra razão, e porque sem ele a linha lê bem.
    const r = java.ler('int total = 5\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('ponto-e-vírgula');
    expect(r.erros[0]!.porque).not.toMatch(/função|funcao|não conhece/);
    expect(r.erros[0]!.remedio).toContain(';');
  });

  it('falta o ponto-e-vírgula numa atribuição com tipo', () => {
    expect(java.ler('String nome = "olá"\n').erros[0]!.porque).toContain('ponto-e-vírgula');
  });

  it('e a falta de ponto-e-vírgula não é inventada onde o ponto-e-vírgula está dentro de um texto', () => {
    expect(java.ler('String nome = "a;b";\n').erros).toEqual([]);
  });

  it('o espaço antes do ponto-e-vírgula é espaço, e não parte do valor', () => {
    // Java válida recusada, e a pior versão: a recusa dizia que a linha não
    // era Java, que é uma mentira, e não dizia que o problema eram dois
    // espaços. A causa era o `(.+);$` ganancioso, que **aceita** a linha e
    // guarda `"5 "` como valor — texto com um espaço no fim, e não o número
    // cinco. A regra de Java é que o valor não tem espaços nas pontas, e a
    // expressão tinha de a dizer.
    //
    // A lista toda, porque a falha era do espaço e o sintoma não dizia onde:
    // o espaço antes, o espaço depois, e os dois lados ao mesmo tempo.
    for (const linha of [
      'int total = 5 ;',
      'int total = 5; ',
      'int total  =  5 ;',
      'int  total  =  5;',
      'String nome = "olá" ;',
    ]) {
      expect(java.ler(linha + '\n').erros).toEqual([]);
    }
    // E o que é mesmo errado continua errado: dois pontos-e-vírgula não são
    // uma linha de Java, e a correção do espaço não pode tê-lo comido.
    expect(java.ler('int total = 5;;\n').erros.length).toBeGreaterThan(0);
  });

  it('falta o tipo é dito como falta de tipo, e o mesmo erro não se repete', () => {
    const r = java.ler('total = 5;\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('tipo');
    expect(r.erros[0]!.porque).not.toContain('ponto-e-vírgula');
    expect(r.erros[0]!.remedio).toContain('int');
  });

  it('quando faltam as duas coisas, o erro diz as duas', () => {
    // Dizer "falta o tipo" a quem também falta o `;` é meio mentira, e a
    // pessoa vai corrigir o tipo, correr, e receber outro erro sobre a mesma
    // linha. Um erro, com as duas partes visíveis, resolve a linha de uma vez.
    const r = java.ler('total = 5\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toContain('tipo');
    expect(r.erros[0]!.porque).toContain('ponto-e-vírgula');
  });

  it('a mensagem do tipo não afirma que um nome sem tipo é sempre errado', () => {
    // Numa linha já declarada o tipo não se repete: `int total; total = 5;` é
    // Java válido. Dizer que esta linha nunca é válida ensina uma coisa falsa
    // sobre a linguagem, e a pessoa encontra a linha mais tarde.
    expect(java.ler('total = 5;\n').erros[0]!.porque).toMatch(/declarado|declara/);
  });

  it('log é recusado antes de correr, e a mensagem diz que é o compilador que recusa', () => {
    // A linha mais importante da lição de Java. A mesma linha em Python só
    // falha quando o código corre, e a diferença entre as duas frases é a
    // costura a fazer-se.
    const r = java.ler('log(total);\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque).toMatch(/compilador|compilar|correr/);
  });

  it('e o Python dá a mesma linha um erro que só aparece a correr', () => {
    const emPython = python.ler('log(total);\n');
    expect(emPython.erros).toHaveLength(1);
    expect(emPython.erros[0]!.porque).toContain('corre');
  });

  it('texto de outra linguagem é recusado com o motivo, não com "não percebo"', () => {
    const r = java.ler("print('olá')\n");
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.porque.length).toBeGreaterThan(10);
    expect(r.erros[0]!.remedio.length).toBeGreaterThan(0);
  });

  it('e a mesma linha é recusada pelas duas linguagens, por motivos diferentes', () => {
    // A mesma pessoa escreve `total = 5;` a achar que é Python. Em Python o
    // problema é o `;`; em Java é o tipo. A lição não é "isto está errado" — é
    // que o que falta depende da linguagem, e é por isso que a sintaxe se
    // escreve à mão.
    expect(python.ler('total = 5;\n').erros[0]!.porque).toContain('ponto-e-vírgula');
    expect(java.ler('total = 5;\n').erros[0]!.porque).toContain('tipo');
  });

  it('e o inverso: uma linha de Java é recusada em Python', () => {
    expect(python.ler('int total = 5;\n').erros).toHaveLength(1);
  });

  it('o erro tem porque e remedio, nunca um código nu', () => {
    const r = java.ler('total = 5;\n');
    expect(r.erros[0]!.porque.length).toBeGreaterThan(10);
    expect(r.erros[0]!.remedio.length).toBeGreaterThan(0);
  });

  it('o passo do erro é a linha certa', () => {
    const r = java.ler('int total = 5;\n\n\ntotal = 5;\n');
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]!.passo).toBe(4);
  });
});

describe('a costura: a mesma pergunta, as duas políticas', () => {
  it('o mesmo programa dá Recusa em Java e silêncio em Python', () => {
    // A diferença vem da `Policy` e de mais lado nenhum: os mesmos eventos
    // entram nos dois núcleos. Se este teste precisasse de um `if` sobre a
    // linguagem, era porque a costura tinha pasado para o meio.
    const eventos: EventoLido[] = [
      { passo: 1, tipo: 'atribuir', nome: 'total', tipoValor: 'número', valor: v('número', 5) },
      {
        passo: 1,
        tipo: 'atribuir',
        nome: 'total',
        tipoValor: 'texto',
        valor: v('texto', 'olá'),
        restricao: 'número',
      },
    ];
    const origem = (passo: number) => ({ bloco: 'texto', ranhura: 0, passo });

    const emJava = interpretar(eventos, POLITICAS.java, origem);
    const emPython = interpretar(eventos, POLITICAS.python, origem);

    expect(emJava).toHaveLength(1);
    expect(emJava[0]!.classe).toBe('Recusa');
    expect(emPython).toEqual([]);
  });

  it('e a diferença é o momento, não a classe', () => {
    // A `Policy` tem duas decisões separadas: `recusaNoTipo` diz *se* há
    // recusa, `quando` diz *como se fala* dela. Um produto que metesse a
    // segunda dentro da primeira diria "antes de correr" a uma linguagem que
    // recusa a meio da execução.
    const eventos: EventoLido[] = [
      {
        passo: 1,
        tipo: 'atribuir',
        nome: 'total',
        tipoValor: 'texto',
        valor: v('texto', 'olá'),
        restricao: 'número',
      },
    ];
    const origem = (passo: number) => ({ bloco: 'texto', ranhura: 0, passo });
    const antes = interpretar(eventos, POLITICAS.java, origem);
    const noDado = interpretar(eventos, POLITICAS.sql, origem);
    expect(antes[0]!.classe).toBe('Recusa');
    expect(noDado[0]!.classe).toBe('Recusa');
    expect((noDado[0] as { remedio: string }).remedio).toContain('dado');
    expect((antes[0] as { remedio: string }).remedio).not.toContain('dado');
  });

  it('o mesmo nome usado antes de existir é o mesmo erro nas duas', () => {
    // A revisão da spec pede este teste pelo nome da variável e pelo passo. E é
    // igual nas duas porque um nome que não existe não é um problema de tipo:
    // é um nome, e o núcleo é quem sabe os nomes.
    const eventos: EventoLido[] = [{ passo: 3, tipo: 'usar', nome: 'total' }];
    for (const linguagem of ['python', 'java'] as const) {
      const erros = interpretar(eventos, POLITICAS[linguagem], (passo) => ({
        bloco: 'texto',
        ranhura: 0,
        passo,
      }));
      expect(erros, linguagem).toHaveLength(1);
      expect(erros[0]!.porque, linguagem).toContain('total');
      expect((erros[0] as { passo: number }).passo, linguagem).toBe(3);
    }
  });
});
```

- [ ] **Step 3: Correr os testes e ver falhar**

Run: `npx vitest run src/projecoes`
Expected: FAIL — `./java` não existe, e o registo só tem Python.

- [ ] **Step 4: Escrever `src/projecoes/java.ts`**

```typescript
import type { BlocoLeigo } from '../nucleo/blocos';
import { corpoDe, campoDe, entradaDe, identificadorJava } from '../nucleo/blocos';
import { pilhaDe } from '../nucleo/avaliador';
import { AMOSTRA, POLITICAS } from '../nucleo/semantica';
import type { EventoLido } from '../nucleo/semantica';
import { val } from '../nucleo/tipos';
import type { FalhaRuntime, Tipo, Valor } from '../nucleo/tipos';
import { BLOCOS_IMPERATIVOS } from './python';
import { Emissor, textoDe } from './emissor';
import { eNome, eventosDeConta, ladoCulpado } from './termos';
import type { Gerado, LerResultado, Projection } from './tipos';

// ---------------------------------------------------------------------------
// Os fatos de Java que esta projeção sabe
// ---------------------------------------------------------------------------
//
// **Não havia um compilador de Java à mão quando esta projeção foi escrita, e
// por isso ela não afirma nada que não fosse preciso para a lição.** Cada
// afirmação abaixo é uma que sei e que consigo defender; o que não sei, o
// `ler` recusa por não saber em vez de chutar. A regra vale mais do que a
// lista: um produto que recusa texto indevidamente ensina a pessoa a
// desconfiar do produto, e essa é a única coisa que este produto não pode
// fazer — passou a vida a dizer "confia no que te digo, e eu digo porquê".
//
// **Um erro que não é dado é muito mais barato do que um erro que é dado à
// cosa.** A recusa tem de ser verdadeira, e o silêncio sobre o que não se
// sabe fica escrito como uma nota neste ficheiro, e não escondido.

// ---------------------------------------------------------------------------
// Escrever: blocos → Java
// ---------------------------------------------------------------------------

/** A palavra de tipo que a Java escreve antes do nome, para um valor dado.
 *
 *  Um `Record<Tipo, string>` não chega, e a razão é a lição e não a
 *  conveniência: **em Java o número tem duas palavras**. `int` não aceita
 *  casas decimais e `double` aceita. Um nome-por-tipo escreve `int` para o
 *  `1.5` e produz Java que não compila — e o aluno recebe um erro de Java
 *  numa linha que ele não escreveu assim, que é a pior forma de errar.
 *
 *  E há um quinto caso, o `var`: quando o valor é o nome de outra variável, o
 *  tipo só existe quando o programa corre, e nenhum destes quatro o sabe. */
export function declaracaoDe(entrada: unknown): string {
  if (typeof entrada === 'number') return Number.isInteger(entrada) ? 'int' : 'double';
  if (typeof entrada === 'boolean') return 'boolean';
  if (entrada !== null && typeof entrada === 'object' && 'ref' in entrada) return 'var';
  return 'String';
}

/** De palavra de Java para o `Tipo` do produto, para o `ler`.
 *
 *  O `var` está de fora de propósito: é a única palavra que não declara tipo a
 *  ninguém, e o `ler` diz isso omitindo a restrição em vez de a pôr a
 *  `número`. */
const TIPO_DE_PALAVRA: Record<string, Tipo> = {
  int: 'número',
  double: 'número',
  String: 'texto',
  boolean: 'lógico',
};

function fugar(s: string): string {
  // A barra de fugar primeiro, sempre — e a ordem importa: se o `\n` virasse
  // fuga antes de a barra ser dobrada, cada fuga seria duplicada.
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function literal(entrada: unknown): string {
  if (typeof entrada === 'number') return String(entrada);
  if (typeof entrada === 'boolean') return entrada ? 'true' : 'false';
  if (entrada !== null && typeof entrada === 'object' && 'ref' in entrada) {
    return String((entrada as { ref: unknown }).ref);
  }
  if (entrada !== null && typeof entrada === 'object' && 'txt' in entrada) {
    return `"${fugar(String((entrada as { txt: unknown }).txt))}"`;
  }
  return `"${fugar(String(entrada))}"`;
}

function emitir(b: BlocoLeigo, e: Emissor): void {
  switch (b.type) {
    case 'pilha':
      for (const filho of pilhaDe(b)) emitir(filho, e);
      return;

    case 'guardar': {
      const nome = identificadorJava(String(campoDe(b, 'nome')));
      const entrada = entradaDe(b, 'VALOR');
      const palavra = declaracaoDe(entrada);
      // A anotação é a lição inteira quando a palavra tem um tipo, e é uma
      // ressalva honesta quando é `var`. Uma anotação igual nos dois casos
      // diria "o tipo escreve-se sempre" ao lado de uma linha onde o tipo não
      // se escreve, e quem lê as duas coisas aprende uma delas e ignora a outra.
      const porque =
        palavra === 'var'
          ? `O tipo de ${String((entrada as { ref: unknown }).ref)} só se sabe quando o código corre, e o \`var\` deixa o compilador descobri-lo.`
          : `Guarda ${nome} como ${palavra}, e o tipo escreve-se aqui à mão.`;
      e.linha(`${palavra} ${nome} = ${literal(entrada)};`, porque);
      return;
    }

    case 'dizer': {
      e.linha(
        `System.out.println(${literal(entradaDe(b, 'VALOR'))});`,
        'Mostra o valor no ecrã. O `println` aceita qualquer tipo, por isso aqui não há tipo a escrever.',
      );
      return;
    }

    case 'log': {
      e.linha(
        `log(${literal(entradaDe(b, 'VALOR'))});`,
        'Chama `log`, uma função que ainda não escreveste. Enquanto não a escreveres, o compilador recusa esta linha antes de o código correr.',
      );
      return;
    }

    case 'repetir': {
      const vezes = String(entradaDe(b, 'PASSOS'));
      const c = e.nomeDeContador();
      e.linha(
        `for (int ${c} = 0; ${c} < ${vezes}; ${c}++) {`,
        `Repete o que está entre chavetas ${vezes} vezes, a contar com ${c}.`,
      );
      // `absorver` **antes** da linha de fecho. Ao contrário, o `for` abre, o
      // `}` fecha, e o corpo fica escrito lá fora — Java que não compila, com
      // as anotações do corpo a apontar para linhas que não existem.
      const dentro = e.entrar(c);
      for (const filho of corpoDe(b)) emitir(filho, dentro);
      e.absorver(dentro);
      // Uma `{` e uma `}` vazias são Java válido. Um `for` vazio não é Python,
      // e a diferença é o que faz a projeção de Python emitir um `pass`: duas
      // linguagens, o mesmo bloco vazio, e uma delas obriga a dizer alguma
      // coisa e a outra não.
      e.linha('}', 'Fecha o ciclo: a chaveta a fechar é o fim daquilo que repete.');
      return;
    }

    default:
      e.linha(`// bloco do v2: ${b.type}`, 'Este bloco ainda não está nesta lição.');
  }
}

// ---------------------------------------------------------------------------
// Ler: Java → fatos
// ---------------------------------------------------------------------------

// O `;` faz parte do padrão, e é a sua ausência que dá a mensagem do ponto-e-
// vírgula. Se ficasse de fora, o `ler` não distinguiria "falta o ponto" de
// "falta o tipo", e a pessoa corrigia uma coisa e recebia o erro da outra.
const ATRIBUIR = /^(int|double|String|boolean|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+);$/;
const IMPRIMIR = /^System\.out\.println\(\s*(.+?)\s*\);$/;
const CICLO = /^for\s*\(\s*int\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*0;\s*[A-Za-z_][A-Za-z0-9_]*\s*<\s*(\d+);\s*[A-Za-z_][A-Za-z0-9_]*\s*\+\+\s*\)\s*\{$/;
// Uma atribuição sem a palavra de tipo. Serve só para a mensagem: `total = 5;`
// é isto, e o que falta é o tipo.
const SEM_TIPO = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/;
// Um literal numérico de Java. Sem sinal: o `-` é uma operação, não parte do
// número, e `1.5` é o único formato com ponto que a Java aceita.
const NÚMERO = /^\d+(\.\d+)?$/;
const TEXTO = /^"((?:[^"\\]|\\.)*)"$/;

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
  return s.replace(/\\(["\\nrt])/g, (_m, c: string) =>
    c === 'n' ? '\n' : c === 'r' ? '\r' : c === 't' ? '\t' : c,
  );
}

function valorDe(termo: string, passo: number): Valor | null {
  const origem = { bloco: 'texto', ranhura: 0, passo };
  if (NÚMERO.test(termo)) return val('número', Number(termo), AMOSTRA, origem);
  const txt = TEXTO.exec(termo);
  if (txt) return val('texto', desescapar(txt[1]!), AMOSTRA, origem);
  if (termo === 'true') return val('lógico', true, AMOSTRA, origem);
  if (termo === 'false') return val('lógico', false, AMOSTRA, origem);
  return null;
}

/** A mesma regra de Python, com o sinal trocado.
 *
 *  Em Python o ponto-e-vírgula é o que estraga a linha; aqui é o que falta.
 *  Nos dois casos só se toca nele **depois** de a linha ter falhado por outra
 *  razão, e porque a linha com o `;` lê bem. Sem essa segunda condição,
 *  `String s = "a;b";` — Java válido — era recusada por causa de um
 *  ponto-e-vírgula que estava dentro de uma palavra. */
function lerLinha(bruta: string, passo: number): LerResultado {
  const t = bruta.trim();
  if (t.length === 0 || t === '{' || t === '}' || t.startsWith('//')) {
    return { eventos: [], erros: [] };
  }

  const r = tentarLer(t, passo);
  if (r.erros.length === 0) return r;

  const semPonto = !t.endsWith(';');
  if (semPonto && tentarLer(`${t};`, passo).erros.length === 0) {
    return {
      eventos: [],
      erros: [
        erro(
          passo,
          'Em Java cada linha acaba em ponto-e-vírgula, e esta acaba sem.',
          'Acrescenta o ";" no fim da linha.',
        ),
      ],
    };
  }
  return semTipo(t.replace(/;$/, '').trim(), passo, semPonto);
}

/** A linha parece uma atribuição e não tem a palavra de tipo.
 *
 *  `total = 5;` não é Java porque o tipo não está lá. Mas `int total;` seguido
 *  de `total = 5;` **é** Java, e dizer que a segunda linha nunca é válida
 *  ensina uma coisa falsa — que a pessoa encontra mais tarde, quando escrever
 *  a primeira. Por isso a honestidade cabe numa frase, e a frase é a lição: em
 *  Java o tipo escreve-se uma vez, na declaração. */
function semTipo(corpo: string, passo: number, faltaPonto: boolean): LerResultado {
  const m = SEM_TIPO.exec(corpo);
  if (m) {
    const porque =
      'Em Java o tipo escreve-se antes do nome, e esta linha não tem tipo nenhum. ' +
      'Se o nome já tivesse sido declarado numa linha antes, esta linha era válida — ' +
      'e é por isso que o tipo se escreve uma vez só, na declaração.';
    return {
      eventos: [],
      erros: [
        erro(
          passo,
          faltaPonto ? `${porque} E falta também o ponto-e-vírgula no fim da linha.` : porque,
          `Escreve o tipo antes do nome, como em "${sugestaoDe(m[1]!, m[2]!)}".`,
        ),
      ],
    };
  }
  return {
    eventos: [],
    erros: [
      erro(
        passo,
        `Esta linha não é Java: "${corpo}".`,
        'Uma linha de Java é uma declaração com tipo, um System.out.println, ou um for.',
      ),
    ],
  };
}

/** A linha que a pessoa queria escrever, com o tipo que a Java exige. */
function sugestaoDe(nome: string, resto: string): string {
  const v = valorDe(resto, 1);
  if (v === null) return `var ${nome} = ${resto};`;
  return `${declaracaoDe(v.valor)} ${nome} = ${literal(v.valor)};`;
}

function tentarLer(t: string, passo: number): LerResultado {
  const ci = CICLO.exec(t);
  if (ci) {
    return { eventos: [{ passo, tipo: 'ciclo', iteracoes: Number(ci[1]) }], erros: [] };
  }

  const im = IMPRIMIR.exec(t);
  if (im) return lerImprimir(im[1]!, passo);

  const at = ATRIBUIR.exec(t);
  if (at) return lerAtribuir(at[1]!, at[2]!, at[3]!, passo);

  return naoEhJava(t, passo);
}

function naoEhJava(t: string, passo: number): LerResultado {
  return {
    eventos: [],
    erros: [
      erro(
        passo,
        `Esta linha não é Java: "${t}".`,
        'Uma linha de Java é uma declaração com tipo, um System.out.println, ou um for.',
      ),
    ],
  };
}

function lerImprimir(dentro: string, passo: number): LerResultado {
  const valor = valorDe(dentro, passo);
  if (valor !== null) {
    return { eventos: [{ passo, tipo: 'imprimir', valor }], erros: [] };
  }
  if (eNome(dentro)) {
    // O `println` é sobrecarregado e aceita qualquer tipo. Um `usar` com
    // `tipoValor` viria dizer "total guarda número, e este sítio precisa de
    // texto" — um erro que a Java não tem, na linha que a Java aceita, e o
    // aluno concluiria que o produto também se engana.
    return { eventos: [{ passo, tipo: 'usar', nome: dentro }], erros: [] };
  }

  // Uma conta dentro do `println`. **Faltava aqui**, e a segunda projeção
  // foi o que mostrou: as duas percebiam uma conta depois de um `=` e nenhuma
  // dentro de um `println`, e `println(total + 1)` é a linha com que a lição
  // de Java mostra que usar um valor recusado também é erro.
  //
  // O `tipoDosNomes` é `undefined`, e é a diferença real entre as duas
  // linguagens: **`"olá" + 1` dá `"olá1"` em Java e compila**, e `1 + "olá"`
  // dá `"1olá"`. Qual dos lados é número decide, e o tipo guardado só existe
  // quando o programa corre, portanto este sítio não pode exigir nada. No
  // Python é o contrário — `'olá' + 1` é erro logo a correr — e por isso o
  // Python passa `'número'` no mesmo sítio. A mesma conta, a mesma forma, e o
  // que muda é uma palavra.
  const conta = eventosDeConta(dentro, passo, (t) => valorDe(t, passo), undefined);
  if (conta !== null) return { eventos: conta, erros: [] };
  return {
    eventos: [],
    erros: [
      erro(
        passo,
        `Java não sabe o que mostrar: "${dentro}".`,
        'Dentro do println só pode estar um nome, um número ou um texto.',
      ),
    ],
  };
}

function lerAtribuir(
  palavra: string,
  nome: string,
  resto: string,
  passo: number,
): LerResultado {
  if (resto.startsWith('=')) {
    return {
      eventos: [],
      erros: [
        erro(
          passo,
          'Em Java "==" são dois sinais de igual, e é comparação: serve para perguntar, não põe nada em lado nenhum.',
          'Para guardar um valor usa um sinal de igual só: "=" em vez de "==".',
        ),
      ],
    };
  }

  const valor = valorDe(resto, passo);
  if (valor !== null) {
    return {
      eventos: [
        {
          passo,
          tipo: 'atribuir',
          nome,
          tipoValor: valor.tipo,
          valor,
          // O `restricao` é a palavra escrita na linha, e é o que dá a recusa
          // *antes de correr*. O `var` não tem: é a única palavra de Java que
          // não declara tipo a ninguém, e a omissão é a informação.
          restricao: TIPO_DE_PALAVRA[palavra],
        },
      ],
      erros: [],
    };
  }

  if (eNome(resto)) {
    return { eventos: [{ passo, tipo: 'usar', nome: resto }], erros: [] };
  }

  // A leitura da conta é a do leitor partilhado, e a diferença entre exigir
  // número e não exigir está escrita num sítio só — não em dois, que é como
  // os dois ficheiros divergiam.
  const conta = eventosDeConta(resto, passo, (t) => valorDe(t, passo), undefined);
  if (conta !== null) return { eventos: conta, erros: [] };
  const culpado = ladoCulpado(resto, (t) => valorDe(t, passo));
  if (culpado !== null) {
    return {
      eventos: [],
      erros: [
        erro(
          passo,
          `Esta conta ainda não sei ler: "${resto}". Numa conta, cada lado tem de ser um número, um texto, true/false, ou o nome de outra variável.`,
          `Nesta lição as contas são de dois termos, e cada termo tem de ser um número, um texto, true/false, ou o nome de outra variável. O termo "${culpado}" não é nenhum dos quatro.`,
        ),
      ],
    };
  }

  return naoEhJava(resto, passo);
}

export const java: Projection = {
  linguagem: 'java',
  familia: 'imperativa',
  policy: POLITICAS.java,
  blocos: BLOCOS_IMPERATIVOS,

  emit(programa: BlocoLeigo | null): Gerado {
    const e = new Emissor();
    for (const bloco of pilhaDe(programa)) emitir(bloco, e);
    return { texto: textoDe(e), anotacoes: e.anotacoes };
  },

  ler(texto: string): LerResultado {
    const eventos: EventoLido[] = [];
    const erros: FalhaRuntime[] = [];
    const linhas = texto.split('\n');
    for (let i = 0; i < linhas.length; i += 1) {
      const passo = i + 1;
      const t = linhas[i]!.trim();
      // O `log` é o bloco que existe para mostrar a diferença entre as duas
      // epistemologias. Aqui o `ler` recusa-o e a mensagem diz que é o
      // compilador que recusa; a do Python recusa o mesmo `log` e a mensagem
      // diz que só se descobre a correr. Duas frases para a mesma linha, e a
      // diferença entre elas é a lição da costura.
      if (t.startsWith('log(')) {
        erros.push(
          erro(
            passo,
            'Em Java não existe nada que se chame log, e o compilador recusa esta linha antes de o código correr.',
            'Escreve a função log antes de a chamares, ou usa System.out.println.',
          ),
        );
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
git commit -m "feat: projeção Java — a costura aguenta uma segunda linguagem

O mesmo BlocoLeigo produz 'total = 5' em Python e 'int total = 5;' em
Java. O mesmo programa julgado pelas duas politicas da Recusa em Java e
silencio em Python, e a diferenca vem inteira do campo policy — nao ha
uma linha de codigo duplicada para isso.

ler() da Java recusa 'total = 5;' e diz que em Java o tipo escreve-se
antes do nome. E a assim que a primeira falha de quem salta de uma
projeção para a outra aparece com porque, e nao com um codigo de erro.
"
```

---

#### Task 5 —(decisoes e o que ficou por provar)

O código desta tarefa é o do ficheiro, e o ficheiro mudou em relação ao que o
plano tinha escrito. As decisões e o que cada uma custava:

1. **`declaracaoDe(entrada)`, e não uma tabela `Tipo → palavra`.** Em Java o
   número tem duas palavras: `int` não aceita casas decimais e `double` aceita.
   Um nome-por-tipo escreve `int` para o `1.5` e produz Java que não compila —
   e o aluno recebe um erro de Java numa linha que não escreveu assim. A palavra
   depende do *valor*, e é a projeção que sabe do valor. **Custaria:** uma
   função onde uma tabela bastava, e a tabela era mais rápida de ler.

2. **`var` quando o valor é o nome de outra variável.** O tipo só existe quando
   o programa corre, e nenhum dos quatro nomes o sabe. Chutar `int` produz
   `int total = contagem;`, que não compila se `contagem` for um texto. `var`
   existe em Java, deixa o compilador descobrir, e por isso é a única palavra
   honesta — e a anotação tem de dizer isso, porque a palavra sozinha ensina o
   contrário da lição. No `ler`, o `var` é a única palavra que **não** declara
   `restricao`, e é a omissão que diz. **Custaria:** uma palavra que parece
   contradizer a lição, mitada por uma frase.

3. **Contadores por nível de aninhamento, não por emissão.** Um laço dentro de
   outro não pode repetir o nome; dois laços irmãos **podem**, e devem, porque
   é o que se escreve à mão e um `j` sem um `i` antes confunde. Um `Set`
   partilhado pela emissão dava `i` e `j` a dois irmãos; um `Set` novo por
   nível dava `i` aos dois e `i` outra vez ao aninhado, que também não compila.
   A reserva vive no `entrar(nome)`, numa cópia do mapa, e dura só o corpo.
   **Custaria:** um `Map<number, string[]>` partilhado por referência, que é
   mais difícil de ler do que um contador.

4. **A frase da recusa passou a dizer *quando*.** A `Policy` tem `quando` e o
   `porque` não o usava: dizia "Um sítio de número não guarda texto", que está
   certo e não diz se o erro vem antes ou depois de o programa correr. **E essa
   diferença é a lição**: é o que distingue uma linguagem de outra, e um aluno
   que não sabe quando não aprendeu nada que as distinga. Isto mudou
   `semantica.ts` (T3) e não só a projeção. **Custaria:** três frases novas e
   mais longas no núcleo, e o núcleo continua sem nomear nenhuma linguagem.

5. **`identificadorJava` em `blocos.ts`, ao lado de `identificador`.** `int` é
   palavra reservada em Java e não é em Python. Uma lista só produz
   `int int = 5;`. **Custaria:** uma segunda lista de palavras, e a pergunta
   das outras quatro linguagens fica para o Plano B.

6. **`entradaDe`, `campoDe` e `corpoDe` saíram de `python.ts` para
   `blocos.ts`.** Três funções sobre a forma de um bloco, que toda a projeção
   precisa. `corpoDe` é o caso que prova: `pilhaDe` também abre uma pilha a
   partir de um `CORPO`, e a confusão dá um `for` repetido até a pilha
   estourar. **Custaria:** tocar em `blocos.ts` (T2) dentro da T5.

7. **`Emissor` saiu para `src/projecoes/emissor.ts`.** É o mesmo nas seis: o
   que muda é o texto que se escreve e a frase que o explica, e isso é o
   `emitir` de cada uma. Duas cópias teriam o bug da contagem de linhas duas
   vezes. **Custaria:** um ficheiro que o plano não previa, e por isso a lista
   de ficheiros passou de 42 para 43.

8. **A fuga de linha nova, em `python.ts` e em `java.ts`.** `dizer('a\nb')`
   escrevia uma linha nova verdadeira dentro das aspas. Verificado contra o
   Python 3.14: dá `unterminated string literal`. O `fugar` trata agora a barra
   **primeiro**, e só depois `\n`, `\r`, `\t` — ao contrário, cada fuga
   duplicava-se. Isto é um defeito da T4 que só apareceu por se estar a
   escrever a segunda projeção. **Custaria:** nada, e era um programa partido
   a mostrar ao aluno.

**O que ficou por provar, e é uma lacuna assumida:**

- **Não havia um compilador de Java à mão.** Cada afirmação sobre Java nesta
  projeção é uma que se sabe e se consegue defender; o que não se sabe, o `ler`
  recusa por não saber em vez de chutar. A regra vale mais do que a lista: um
  produto que recusa texto indevidamente ensina a desconfiar dele, e é a única
  coisa que este produto não pode fazer.
- **`int total = 1.5;` não dá erro nenhum, e Java recusa.** Não é um defeito
  da projeção: é da **decisão da T1** de que `number` é o único tipo numérico.
  Com um só `número`, o `1.5` e o `5` são a mesma coisa e não há o que comparar.
  Dizer que o `int` não aceita o `1.5` exigiria um segundo tipo numérico, e
  isso muda a lição toda — a decisão é da T13, não desta tarefa. Um erro que não
  é dado é muito mais barato do que um erro que é dado à coisa.
- **A `Recusa` de Java não foi vista por um compilador.** O que se viu foi o
  `tsc` a aceitar o TypeScript que a escreve.

---

### Task 6: Divergencia e avaliacao de texto

Duas coisas que só existem porque há seis linguagens: o texto do utilizador é lido **pela projeção da linguagem que ele escolheu**, e julgado pelo núcleo. E a divergência entre blocos e texto tem de funcionar em sintaxes que não se parecem nada.

É aqui que se resolvem os pontos 1, 3 e 4 do `Review Focus`.

**Files:**
- Create: `src/nucleo/divergencia.ts`, `src/projecoes/avaliar.ts`, `src/projecoes/termos.ts`
- Test: `src/nucleo/divergencia.test.ts`, `src/projecoes/avaliar.test.ts`
- Change: `src/projecoes/python.ts`, `src/projecoes/java.ts` — a conta dentro de
  um `print`/`println` passa a ser lida, e a leitura vai buscar o leitor
  partilhado em vez de estar escrita duas vezes.

**Interfaces:**
- Consumes: Task 1 — `Erro`, `Language`, `Origem`; Task 3 — `interpretar`, `EventoLido`; Task 4 — `Projection`, `Gerado`, `obter`, `LINGUAGENS_COM_PROJECAO`; Task 5 — `java`.
- Produces: `TOLERANCIA_EDICAO`, `dividirEmLinhas`, `distância`, `comparar(esperado: string, obtido: string)`, `Relatorio`, `Divergencia`, `avaliarTexto(linguagem, texto)`, `emitir(linguagem, programa)`, `divergir(linguagem, programa, texto)`, `classificar(erros)`, `ClassesObservadas`, `bate(esperado, erros)`; e em `termos.ts` — `NOME`, `EXPRESSAO`, `eNome`, `eventosDeConta`, `ladoCulpado`.

- [ ] **Step 1: Escrever o teste falhado — divergência**

`src/nucleo/divergencia.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { TOLERANCIA_EDICAO, comparar, distância, dividirEmLinhas } from './divergencia';

describe('dividirEmLinhas', () => {
  it('ignora linhas em branco e espaços nas pontas', () => {
    expect(dividirEmLinhas('  a = 1  \n\n\n  b = 2\n')).toEqual(['a = 1', 'b = 2']);
  });

  it('devolve lista vazia para string vazia', () => {
    expect(dividirEmLinhas('')).toEqual([]);
  });

  it('não remove espaços do meio, que mudam nada mas são o texto', () => {
    expect(dividirEmLinhas('int  total = 5;')).toEqual(['int  total = 5;']);
  });

  it('o texto lido é o mesmo que a pessoa escreveu, sem a linha a mais do fim', () => {
    // Cortar o fim não pode ser "cortar o último caractere": um programa
    // escrito sem o `\n` final é o mesmo programa, e uma comparação que
    // tratasse os dois como textos diferentes culpava a pessoa por uma coisa
    // que não fez.
    expect(dividirEmLinhas('a = 1\nb = 2')).toEqual(['a = 1', 'b = 2']);
    expect(dividirEmLinhas('a = 1\nb = 2\n')).toEqual(['a = 1', 'b = 2']);
  });
});

describe('distância', () => {
  it('zero para texto igual', () => {
    expect(distância('total = 5', 'total = 5')).toBe(0);
  });

  it('conta uma omissão como 1', () => {
    expect(distância('tota = 5', 'total = 5')).toBe(1);
  });

  it('conta uma duplicação como 1', () => {
    expect(distância('totall = 5', 'total = 5')).toBe(1);
  });

  it('uma transposição de adjacentes custa 1, e não 2', () => {
    // A promessa do comentário acima da função, e a que dá sentido à
    // tolerância: quem escreve à pressa troca duas letras, não apaga quatro.
    // A primeira implementação lia a linha **um** acima do sítio certo — a
    // linha anterior, e não a de há duas — e por isso nunca encontrava a
    // troca: `cosntante` custava 2. O teste passava na mesma, porque a
    // tolerância é 2. **Um teste que passa por uma margem dobrada não está a
    // fixar o que diz que fixa.**
    expect(distância('cosntante', 'constante')).toBe(1);
    expect(distância('tset', 'test')).toBe(1);
  });

  it('a troca tem de ser mesmo de adjacentes', () => {
    // `total` com o `t` e o `a` trocados não é uma troca de adjacentes, e
    // custa mais. Se custasse 1, a tolerância aceitaria uma linha reescrita.
    expect(distância('aotlt', 'total')).toBeGreaterThan(1);
  });

  it('uma troca e uma omissão na mesma palavra custam 3, e não 2', () => {
    // `tla` → `total` resolve-se com uma troca **e** uma omissão, que à
    // primeira vista são 2. Dão 3, e é por isso que a conta é a de
    // Damerau-Levenshtein **restrito**: a variante que não deixa editar a mesma
    // palavra duas vezes. A irrestrita dava 2 e tinha de manter duas colunas
    // de histórico para o saber.
    //
    // A escolha é do lado certo para o que a tolerância quer: quem troca duas
    // letras está a fazer um erro, e quem troca *e* omite está a fazer dois.
    // A tolerância de 2 apanha o primeiro e deixa passar o segundo para a
    // pessoa ler a divergência, que é mais útil do que aceitar a linha.
    expect(distância('tla = 5', 'total = 5')).toBe(3);
  });

  it('uma linha contra a vazia custa o comprimento dela', () => {
    expect(distância('', 'abc')).toBe(3);
    expect(distância('abc', '')).toBe(3);
    expect(distância('', '')).toBe(0);
  });
});

describe('tolerância de edição', () => {
  it('é 2', () => {
    expect(TOLERANCIA_EDICAO).toBe(2);
  });

  it('aceita texto idêntico', () => {
    expect(comparar('total = 5\n', 'total = 5\n').ok).toBe(true);
  });

  it('aceita falta da linha em branco final', () => {
    expect(comparar('total = 5\n', 'total = 5').ok).toBe(true);
  });

  it('aceita uma transposição de caracteres adjacentes', () => {
    expect(comparar('log(constante)\n', 'log(cosntante)\n').ok).toBe(true);
  });

  it('aceita dois caracteres trocados em sítios diferentes', () => {
    expect(comparar('log(constante)\n', 'log(contsante)\n').ok).toBe(true);
  });

  it('rejeita três caracteres errados', () => {
    expect(comparar('total = 5\n', 'txxttxl = 5\n').ok).toBe(false);
  });
});

describe('divergência em Java: o ponto-e-vírgula em falta', () => {
  // Review Focus 4. E a armadilha: a tolerância é de 2 caracteres, e um `;` em
  // falta é **um** caractere. A primeira versão comparava primeiro e só depois
  // dizia o que faltava, e a distância de 1 comia o erro — a linha passava, e
  // a lição de Java perdia o exemplo mais curto que tem.
  it('o ; em falta é uma divergência, não texto aceite', () => {
    const r = comparar('int total = 5;\n', 'int total = 5\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias).toHaveLength(1);
    expect(r.divergencias[0]!.linha).toBe(1);
    expect(r.divergencias[0]!.porque).toContain('ponto-e-vírgula');
  });

  it('e diz o que fazer, e o que a linha devia ser', () => {
    const d = comparar('int total = 5;\n', 'int total = 5\n').divergencias[0]!;
    expect(d.remedio).toContain(';');
    expect(d.esperado).toBe('int total = 5;');
    expect(d.obtido).toBe('int total = 5');
  });

  it('o porque não diz "função desconhecida" nem "linha inválida"', () => {
    const d = comparar('int total = 5;\n', 'int total = 5\n').divergencias[0]!;
    expect(d.porque).not.toMatch(/desconhecid|inválid/);
  });

  it('a verificação é de forma, e não de contagem de caracteres', () => {
    // Em Python a linha não acaba em `;`, logo não há o que faltar — e é a
    // mesma comparação com o sinal trocado. A regra olha para a **forma** que a
    // linha tem de ter, e não para quantos caracteres faltam: por isso o `;`
    // em falta é apanhado mesmo estando a distância dentro da tolerância, e
    // por isso um `;` a mais numa linha de Python também é apanhado.
    expect(comparar('total = 5\n', 'total = 5\n').ok).toBe(true);
    expect(comparar('total = 5\n', 'total = 5;\n').ok).toBe(false);
  });

  it('e o ; a mais é dito como o que é', () => {
    const d = comparar('total = 5\n', 'total = 5;\n').divergencias[0]!;
    expect(d.porque).toMatch(/sobrou|a mais|não pede/);
  });
});

describe('a comparação diz o que falta, e não "a linha está errada"', () => {
  it('uma linha a mais é dita como linha a mais', () => {
    const r = comparar('total = 5\n', 'total = 5\ntotal = 6\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias[0]!.porque).toMatch(/a mais|sobra/);
  });

  it('uma linha a menos é dita como linha em falta', () => {
    const r = comparar('total = 5\nlog(total)\n', 'total = 5\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias[0]!.porque).toMatch(/falta/);
  });

  it('um espaço a mais é aceite, porque é um erro que não se vê', () => {
    // A tolerância existe para isto: um espaço que a pessoa não vê não é uma
    // linha errada, é o mesmo programa. E dizê-lo por escrito evita que a
    // tolerância seja lida como "aceita o que der".
    expect(comparar('int total = 5;\n', 'int  total = 5;\n').ok).toBe(true);
  });

  it('mas três já não, e então é dito que é o espaçamento', () => {
    const r = comparar('int total = 5;\n', 'int   total   =   5;\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias[0]!.porque).toMatch(/espaçamento/);
  });

  it('e o resto remede para a linha verdadeira, à vista', () => {
    // A diferença tem de passar da tolerância. A primeira versão escreveu
    // `totl = 5`, que está a uma letra de distância — e portanto é aceite, e
    // o teste lia `undefined` numa lista vazia. Um teste que não falha não
    // está a testar.
    const d = comparar('total = 5\n', 'xxxx = 5\n').divergencias[0]!;
    expect(d.remedio).toContain('total = 5');
  });

  it('uma letra a menos passa, e é o que a tolerância é para isso', () => {
    // O par do teste anterior: o mesmo nome com uma letra a menos **não** é
    // divergência. Juntos, os dois, a tolerância de 2 fica escrita nos dois
    // sentidos em vez de ser um número solto.
    expect(comparar('total = 5\n', 'totl = 5\n').ok).toBe(true);
  });

  it('cada divergência diz a que linha do programa se refere', () => {
    // A linha é a do **texto da pessoa**, e é o número que o painel mostra ao
    // lado. Contar as linhas esperadas daria o número errado a partir da
    // primeira divergência, que é a mais importante de ver.
    const r = comparar('a = 1\nb = 2\nc = 3\n', 'a = 1\nb = 22222\nc = 3\n');
    expect(r.divergencias).toHaveLength(1);
    expect(r.divergencias[0]!.linha).toBe(2);
  });
});

describe('a comparação não sabe sintaxe, e não a inventa', () => {
  it('recebe texto, e não um objeto de projeção', () => {
    // A primeira versão de `comparar` recebia um `Gerado`, que é um tipo de
    // `projecoes/`, e o verificador de árvore ter-lhe-ia barrado a tarefa — a
    // dependência ia do núcleo para a camada que o núcleo não pode conhecer.
    // A assinatura a receber texto resolve: o que se compara é o texto, e as
    // anotações nunca entraram na comparação.
    expect(typeof comparar).toBe('function');
    expect(comparar('a', 'a').divergencias).toEqual([]);
  });

  it('a distância nunca é negativa, mesmo com a linha vazia dos dois lados', () => {
    expect(distância('', '')).toBeGreaterThanOrEqual(0);
    expect(comparar('', '').ok).toBe(true);
  });
});
```

- [ ] **Step 2: Escrever o teste falhado — avaliação de texto**

`src/projecoes/avaliar.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { avaliarTexto, bate, classificar, divergir, emitir } from './avaliar';
import { guardar, log, pilha, repetir } from '../nucleo/testes/dados';

describe('emitir', () => {
  it('delega na projeção da linguagem', () => {
    expect(emitir('python', pilha(guardar('total', 5))).texto).toBe('total = 5\n');
    expect(emitir('java', pilha(guardar('total', 5))).texto).toBe('int total = 5;\n');
  });

  it('e uma linguagem sem projeção diz que não tem, em vez de devolver nada', () => {
    expect(() => emitir('sql', pilha(guardar('total', 5)))).toThrow(/sql/);
  });

  it('aceita um programa vazio, como o `emit` da projeção', () => {
    expect(emitir('java', null).texto).toBe('');
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
    // A regra de §0: nenhuma mensagem aponta para outra linguagem. A pessoa
    // escolheu uma, e ser-lhe mostrada outra pelo nome é exatamente a
    // referência cruzada que a spec removeu.
    const erros = avaliarTexto('java', 'total = 5\n');
    expect(erros[0]!.remedio).not.toMatch(/Python/);
  });

  it('e nenhum dos dois lados usa o nome da linguagem errada no porque', () => {
    expect(avaliarTexto('java', 'total = 5\n')[0]!.porque).not.toMatch(/Python/);
    expect(avaliarTexto('python', 'int total = 5;\n')[0]!.porque).not.toMatch(/Java/);
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
    expect(erros[0]!.porque).toContain('total');
  });
});

describe('avaliarTexto: a mesma linha, linguagens diferentes', () => {
  it('guardar texto onde se quer número: Java recusa, Python adia', () => {
    const emJava = avaliarTexto('java', 'int total = "olá";\n');
    const emPython = avaliarTexto('python', "total = 'olá'\n");
    expect(emJava.some((e) => e.classe === 'Recusa')).toBe(true);
    expect(emPython).toEqual([]);
  });

  it('em Python a dívida paga-se no uso, e aí sim é FalhaRuntime', () => {
    // A dívida paga-se **numa conta**, e não num `print`. O `print` aceita
    // qualquer tipo — o `tipoValor` fica de fora de propósito, senão o produto
    // inventava um erro de tipo onde a linguagem não tem nenhum — e por isso
    // `print(total)` não acusa nada. A primeira versão deste teste escrevia
    // `print(total)` e esperava um erro: um teste que só passa se a projeção
    // mentir sobre o `print`.
    //
    // E o `porque` é exigido **pelo conteúdo**: a primeira versão deste teste
    // passava com o erro de leitura errado, porque também era
    // `FalhaRuntime` e também estava no passo 2. Passava a testar outra coisa.
    const erros = avaliarTexto('python', "total = 'olá'\nprint(total + 1)\n");
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('FalhaRuntime');
    if (erros[0]!.classe !== 'FalhaRuntime') throw new Error('esperava FalhaRuntime');
    expect(erros[0]!.passo).toBe(2);
    expect(erros[0]!.porque).toContain('precisa de número');
  });

  it('e a mesma dívida, em Java, não chega a ser dívida', () => {
    const emJava = avaliarTexto('java', 'int total = "olá";\nSystem.out.println(total + 1);\n');
    expect(emJava[0]!.classe).toBe('Recusa');
    expect(emJava[0]!.classe).not.toBe('FalhaRuntime');
  });
});

describe('a leitura de texto é em duas fases, e a ordem importa', () => {
  it('uma linha que nem se lê não chega a ser julgada', () => {
    // Primeiro a projeção diz o que a linha diz. Se o núcleo a julgasse
    // primeiro, o produto ensinaria Python a recusar coisas que não recusa —
    // que é a falha mais cara que esta divisão de trabalho evita.
    //
    // A segunda linha **recusa um tipo**, e é para isso que o teste existe: a
    // `Recusa` dela não aparece. Se aparecesse, o núcleo estaria a julgar
    // eventos lidos de uma linha que não se leu, e não há nada a julgar.
    const erros = avaliarTexto('java', 'total = 5;\nint total = "olá";\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.origem.passo).toBe(1);
    expect(erros[0]!.classe).not.toBe('Recusa');
  });

  it('e a segunda linha é julgada quando a primeira lê-se', () => {
    // O mesmo texto sem o ponto-e-vírgula: a linha 1 passa, e é a linha 2 que
    // dá a `Recusa`. Um teste só com o caso de cima passa mesmo com o
    // curto-circuito a acontecer ao contrário.
    const erros = avaliarTexto('java', 'int total = 5;\nint total = "olá";\n');
    expect(erros.length).toBeGreaterThan(0);
    expect(erros.some((e) => e.classe === 'Recusa')).toBe(true);
  });
});

describe('a classe é que género de erro foi, e a mensagem é quando', () => {
  it('uma falta de ; numa linguagem compilada é FalhaRuntime, e a mensagem diz antes', () => {
    // Aqui está a decisão, e é uma decisão e não um acidente. **A classe
    // responde a "que genre de coisa está errada", e não a "quando".** Um `;`
    // em falta não é um tipo trocado, e pôr-lo em `Recusa` obrigaria a inventar
    // um `esperado` e um `obtido` que não são tipos — e um `Recusa` com tipos
    // inventados é pior do que um `FalhaRuntime` honesto. **Quando** é a
    // mensagem que diz, e a projeção de Java diz que o compilador recusa antes
    // de o código correr.
    const erros = avaliarTexto('java', 'int total = 5\n');
    expect(erros[0]!.classe).toBe('FalhaRuntime');
    expect(erros[0]!.porque).toMatch(/ponto-e-vírgula/);
  });

  it('e a mesma linha, na linguagem que não recusa, é FalhaRuntime sem mais', () => {
    const emPython = avaliarTexto('python', "total = 'olá'\nprint(total + 1)\n");
    expect(emPython[0]!.classe).toBe('FalhaRuntime');
    expect(emPython[0]!.porque).toMatch(/quando este valor é usado/);
  });

  it('a classe observada nunca é QuebraEquivalencia', () => {
    // Que há três classes observadas, e QuebraEquivalencia não é uma delas: a
    // divergência entre blocos e texto é um erro de comparação, não do
    // programa. Uma sonda que espera `Recusa` nunca pode ser satisfeita por
    // alguém que escreveu a linha de outra maneira.
    const casos = [
      avaliarTexto('java', 'int total = 5\n'),
      avaliarTexto('java', 'int total = "olá";\n'),
      avaliarTexto('python', "total = 'olá'\nprint(total + 1)\n"),
      avaliarTexto('python', 'total = 5\n'),
    ];
    for (const erros of casos) {
      expect(['Observacao', 'Recusa', 'FalhaRuntime']).toContain(classificar(erros));
    }
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
    expect(classificar(avaliarTexto('python', "total = 'olá'\nprint(total + 1)\n"))).toBe(
      'FalhaRuntime',
    );
  });

  it('a Recusa ganha à FalhaRuntime, porque é a primeira a acontecer', () => {
    // E é a primeira mesmo: numa linguagem que recusa, a atribuição errada
    // aparece antes de o uso errado. Ordenar por classe em vez de por ordem
    // de acontecimento daria o mesmo resultado por sorte, e o próximo caso em
    // que não desse seria o primeiro a enganar.
    const erros = avaliarTexto('java', 'int total = "olá";\nSystem.out.println(total + 1);\n');
    expect(erros.length).toBeGreaterThan(1);
    expect(classificar(erros)).toBe('Recusa');
  });

  it('bate aceita quando a classe observada é a esperada', () => {
    expect(bate('Observacao', avaliarTexto('python', 'total = 5\n'))).toBe(true);
    expect(bate('Recusa', avaliarTexto('python', 'total = 5\n'))).toBe(false);
  });

  it('bate não diz o que viu, e isso é trabalho de quem pergunta', () => {
    // `bate` devolve sim ou não, e é o que uma sondagem precisa para passar ou
    // falhar. Dizer "esperavas Recusa, viste FalhaRuntime" é trabalho da
    // sondagem, que tem o esperado à mão — e que, em Portugal, se escreve
    // `sondas.ts` na T7. Uma função que devolvesse a frase faria o núcleo
    // saber o formato da lição, e é o que ele não pode saber.
    expect(bate('Recusa', avaliarTexto('python', "total = 'olá'\nprint(total + 1)\n"))).toBe(
      false,
    );
  });
});

describe('divergir: os blocos contra o texto, na linguagem escolhida', () => {
  it('o texto que o programa gera bate com ele', () => {
    expect(divergir('python', pilha(repetir(2, [guardar('x', 1)])), 'for _ in range(2):\n    x = 1\n').ok).toBe(
      true,
    );
  });

  it('e o mesmo programa escrito à maneira de outra linguagem não bate', () => {
    const programa = pilha(guardar('total', 5), log({ ref: 'total' }));
    expect(divergir('java', programa, 'int total = 5;\nlog(total);\n').ok).toBe(true);
    expect(divergir('java', programa, 'total = 5\nlog(total)\n').ok).toBe(false);
  });

  it('a divergência diz a linha e as duas versões', () => {
    const programa = pilha(guardar('total', 5), log({ ref: 'total' }));
    const r = divergir('java', programa, 'int total = 5;\nlog(total)\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias[0]!.linha).toBe(2);
    expect(r.divergencias[0]!.esperado).toBe('log(total);');
    expect(r.divergencias[0]!.obtido).toBe('log(total)');
  });
});
```

- [ ] **Step 3: Correr os testes e ver falhar**

Run: `npx vitest run src/nucleo/divergencia.test.ts src/projecoes/avaliar.test.ts`
Expected: FAIL com erros de resolução de `./divergencia` e `./avaliar`.

- [ ] **Step 4: Escrever `src/nucleo/divergencia.ts`**

```typescript
/** Quantos caracteres podem estar errados numa linha sem que a linha conte
 *  como errada.
 *
 *  Calibrada para quem escreve à pressa e troca duas letras, não para quem
 *  reescreve a linha. Três parece o número óbvio e é o número errado: aceita
 *  uma linha que a pessoa meio que sabe reescrever, e recusa o erro que ela
 *  mais comete — uma letra trocada com a vizinha. */
export const TOLERANCIA_EDICAO = 2;

export interface Divergencia {
  /** A linha do **texto da pessoa**, que é a que o painel mostra ao lado. */
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

/** O texto lido, linha a linha, sem o que a pessoa não quis dizer.
 *
 *  Espaços nas **duas** pontas: quem copia de um painel vê `  a = 1  ` e
 *  escreve-a assim, e a linha é a mesma. Espaços no meio ficam, porque no meio
 *  são o texto — e é a diferença entre o que a pessoa quis dizer e o que a
 *  pessoa escreveu que esta comparação anda a medir. */
export function dividirEmLinhas(texto: string): string[] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** Nomes dos fechos que a linha tem de ter, porque a linguagem lida-os.
 *
 *  Vem da leitura de cada linguagem e não deste ficheiro: em Java a linha
 *  acaba em `;`, em Python não acaba em nada, e em SQL acaba em `;`. Este
 *  ficheiro **não conhece sintaxe** — só sabe que há fechos que não são uma
 *  gralha de escrita, e lê a lista de cima. */
const FECHOS: Record<string, string> = {
  ';': 'ponto-e-vírgula',
  ':': 'dois pontos',
};

/** Distância de edição de Damerau-Levenshtein: como Levenshtein, mas uma
 *  transposição de caracteres adjacentes custa 1 e não 2 — que é o erro que
 *  a tolerância tem de apanhar.
 *
 *  E a transposição é lida da linha de **há duas**, e não da anterior. Ler da
 *  anterior é o erro que esta função teve na primeira versão: `cosntante`
 *  custava 2 em vez de 1, o que não se via porque a tolerância é 2 — e um
 *  teste que passa por uma margem dobrada não está a fixar o que diz que fixa.
 *  Por isso a função guarda duas linhas, e não uma. */
export function distância(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // `haDois` é a linha de há duas iterações e `haUm` a de há uma. No começo
  // `haUm` é a linha zero, que é `0, 1, 2, …, n` — e se `a` for vazia é
  // precisamente a resposta.
  let haDois = Array.from({ length: n + 1 }, (_, j) => j);
  let haUm = haDois;
  for (let i = 1; i <= m; i += 1) {
    const actual = [i];
    for (let j = 1; j <= n; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let melhor = Math.min(
        (haUm[j] ?? Infinity) + 1,
        (actual[j - 1] ?? Infinity) + 1,
        (haUm[j - 1] ?? Infinity) + custo,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        melhor = Math.min(melhor, (haDois[j - 2] ?? Infinity) + 1);
      }
      actual.push(melhor);
    }
    haDois = haUm;
    haUm = actual;
  }
  return haUm[n] ?? Math.max(m, n);
}

interface Desvio {
  porque: string;
  remedio: string;
}

/** O que a **forma** da linha diz, antes de contar caracteres.
 *
 *  Um `;` em falta é uma divergência por si, mesmo estando a distância dentro
 *  da tolerância: é um caractere de diferença, e a tolerância de 2 comia-o.
 *  Perder isso é perder o exemplo mais curto que a lição de Java tem — a
 *  linha que é quase a mesma e mesmo assim está errada.
 *
 *  E o simétrico também conta, porque o mesmo buraco noutro sentido dá a mesma
 *  nota: em Python, um `;` a mais não é uma gralha de escrita, é um sinal que
 *  a linguagem não usa. */
function desvioDeForma(esperado: string, obtido: string): Desvio | null {
  for (const [fecho, nome] of Object.entries(FECHOS)) {
    if (esperado.endsWith(fecho) && !obtido.endsWith(fecho)) {
      return {
        porque: `Esta linha tinha de acabar em ${nome}, e a tua acaba sem.`,
        remedio: `Acrescenta o "${fecho}" no fim da linha.`,
      };
    }
  }
  for (const [fecho, nome] of Object.entries(FECHOS)) {
    if (obtido.endsWith(fecho) && !esperado.endsWith(fecho)) {
      return {
        porque: `A tua linha acaba em ${nome}, e esta não pede esse fecho.`,
        remedio: `Retira o "${fecho}" do fim da linha.`,
      };
    }
  }
  return null;
}

/** O que falta da linha, para o `porque` dizer a coisa certa em vez de "a
 *  linha está errada". */
function desvio(esperado: string, obtido: string): Desvio {
  const forma = desvioDeForma(esperado, obtido);
  if (forma !== null) return forma;
  if (esperado === '') {
    return { porque: 'Sobrou uma linha a mais.', remedio: 'Apaga essa linha.' };
  }
  if (obtido === '') {
    return { porque: 'Esta linha falta.', remedio: 'Escreve a linha que está em cima.' };
  }
  if (esperado.replace(/\s+/g, '') === obtido.replace(/\s+/g, '')) {
    return {
      porque: 'O espaçamento está diferente, e o programa é o mesmo.',
      remedio: 'Iguala o espaçamento.',
    };
  }
  return {
    porque: `Esta linha está escrita de outra maneira. Aqui era: ${esperado}`,
    remedio: `Copia a linha tal como está: ${esperado}`,
  };
}

/** O texto gerado e o texto escrito, linha a linha.
 *
 *  Recebe **texto**, e não o `Gerado` da projeção. A primeira versão recebia o
 *  `Gerado`, que é um tipo de `projecoes/`, e o verificador de árvore
 *  ter-lhe-ia barrado a tarefa: a dependência ia do núcleo para a camada que o
 *  núcleo não pode conhecer. Só que nunca houve problema — o que se compara é
 *  o texto, e as anotações nunca entraram na comparação. A assinatura
 *  estava a pedir mais do que a função usava. */
export function comparar(esperado: string, obtido: string): Relatorio {
  const esperadas = dividirEmLinhas(esperado);
  const obtidas = dividirEmLinhas(obtido);
  const divergencias: Divergencia[] = [];

  const maximo = Math.max(esperadas.length, obtidas.length);
  for (let i = 0; i < maximo; i += 1) {
    const linhaEsperada = esperadas[i] ?? '';
    const linhaObtida = obtidas[i] ?? '';
    if (linhaEsperada === linhaObtida) continue;
    // A forma primeiro, e a distância depois. Ao contrário, um `;` em falta
    // — uma diferença de um caractere — passava por dentro da tolerância e a
    // lição de Java perdia o exemplo mais curto que tem.
    if (desvioDeForma(linhaEsperada, linhaObtida) === null) {
      if (distância(linhaEsperada, linhaObtida) <= TOLERANCIA_EDICAO) continue;
    }
    divergencias.push({
      linha: i + 1,
      esperado: linhaEsperada,
      obtido: linhaObtida,
      ...desvio(linhaEsperada, linhaObtida),
    });
  }

  return { ok: divergencias.length === 0, divergencias };
}
```

- [ ] **Step 5: Escrever `src/projecoes/termos.ts` — a leitura de um termo, uma vez**

A leitura de uma conta estava escrita nas duas projeções, e por isso a segunda
projection não a tinha no sítio onde era preciso. Ver a nota da Task 6.

`src/projecoes/termos.ts`:

```typescript
import type { EventoLido } from '../nucleo/semantica';
import type { Tipo, Valor } from '../nucleo/tipos';

/** As três coisas que uma linha tem por baixo, e que são as mesmas nas seis
 *  linguagens: um nome, uma conta de dois termos, e um literal.
 *
 *  Vivem aqui, e não em cada projeção, pela mesma razão que o `Emissor` vive
 *  uma vez só — e a prova é que estar escritas duas vezes **produziu um
 *  buraco**: as duas projeções percebiam uma conta depois de um `=`, e nenhuma a
 *  percebia dentro de um `print`. `print(total + 1)` — que é a linha de que a
 *  lição de Python precisa para mostrar a dívida a pagar-se no uso — era
 *  recusada pelas duas.
 *
 *  O que fica de fora é tudo o que é da linguagem: os delimitadores de texto,
 *  os lógicos, e a frase do erro. Cada uma dessas coisas é uma resposta
 *  diferente à pergunta "como se escreve isto aqui", e é a projeção que a tem. */
export const NOME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Uma conta de dois termos, se a houver. */
export const EXPRESSAO = /^(.+?)\s*([+\-*/])\s*(.+)$/;

export function eNome(termo: string): boolean {
  return NOME.test(termo);
}

/** O que uma conta produz: um uso por cada nome que apareça, e a operação.
 *
 *  `tipoDosNomes` é o que o sítio exige de cada nome, e pode ser `undefined` —
 *  e numa linguagem compilada é. **O `+` de Java não exige número**: `"olá" + 1`
 *  dá `"olá1"` e compila, e `1 + "olá"` dá `"1olá"`. Qual dos dois lados é
 *  número decide, e o tipo guardado só existe quando o programa corre, portanto
 *  aqui não há nada para exigir. Dizer que este sítio precisa de número faria o
 *  produto recusar uma linha que a Java aceita.
 *
 *  Em Python é o contrário, e é a diferença entre as duas: `'olá' + 1` é erro
 *  logo a correr, porque o Python não converte nada sozinho. A mesma conta, a
 *  mesma forma, e o que muda é uma palavra — que é exatamente o que a costura
 *  tem de mostrar.
 *
 *  Devolve `null` quando algum dos lados não é um termo legível, e quem escreve
 *  a frase do erro é a projeção: a frase é em termos da linguagem dela, e este
 *  ficheiro não conhece nenhuma. */
export function eventosDeConta(
  termo: string,
  passo: number,
  valorDeTermo: (t: string) => Valor | null,
  tipoDosNomes: Tipo | undefined,
): EventoLido[] | null {
  const conta = EXPRESSAO.exec(termo);
  if (conta === null) return null;
  const esquerda = conta[1]!;
  const direita = conta[3]!;
  if (!legivel(esquerda, valorDeTermo) || !legivel(direita, valorDeTermo)) return null;

  const eventos: EventoLido[] = [];
  for (const lado of [esquerda, direita]) {
    // O `tipoValor` a omitir é a informação. É a mesma omissão que o
    // `print(total)` faz, e por uma razão parecida: este sítio não declara
    // tipo a ninguém.
    if (eNome(lado)) eventos.push({ passo, tipo: 'usar', nome: lado, tipoValor: tipoDosNomes });
  }
  eventos.push({
    passo,
    tipo: 'operar',
    operacao: conta[2] as '+' | '-' | '*' | '/',
    a: valorDeTermo(esquerda),
    b: valorDeTermo(direita),
  });
  return eventos;
}

function legivel(termo: string, valorDeTermo: (t: string) => Valor | null): boolean {
  return valorDeTermo(termo) !== null || eNome(termo);
}

/** O lado da conta que não é um termo legível, para a frase dizer qual foi. */
export function ladoCulpado(
  termo: string,
  valorDeTermo: (t: string) => Valor | null,
): string | null {
  const conta = EXPRESSAO.exec(termo);
  if (conta === null) return null;
  for (const lado of [conta[1]!, conta[3]!]) {
    if (!legivel(lado, valorDeTermo)) return lado;
  }
  return null;
}
```

- [ ] **Step 6: Escrever `src/projecoes/avaliar.ts`**

```typescript
import { comparar } from '../nucleo/divergencia';
import type { Relatorio } from '../nucleo/divergencia';
import { interpretar } from '../nucleo/semantica';
import type { BlocoLeigo } from '../nucleo/blocos';
import type { Erro, Language } from '../nucleo/tipos';
import { obter } from './registo';
import type { Gerado } from './tipos';

export function emitir(linguagem: Language, programa: BlocoLeigo | null): Gerado {
  return obter(linguagem).emit(programa);
}

/** O texto da pessoa, lido e julgado — em duas fases, e a ordem é tudo.
 *
 *  Primeiro a projeção da linguagem escolhida diz o que cada linha diz, e
 *  recusa o que não é da linguagem dela. Só depois o núcleo julga o que foi
 *  dito, com a política dessa mesma linguagem.
 *
 *  Inverter a ordem é a falha mais cara que esta divisão de trabalho evita: o
 *  núcleo de Python a julgar uma linha de Java ensinaria Python a recusar
 *  coisas que não recusa, e o aluno levaria para a vida a ideia errada sobre
 *  a linguagem que escolheu. E, por isso, quando a linha nem se lê, o erro é o
 *  da leitura e o núcleo **não é chamado** — não há nada para julgar. */
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

/** As três coisas que uma sondagem pode ver acontecer.
 *
 *  A classe responde a **que género de erro é**, e não a *quando*. Um `;` em
 *  falta é `FalhaRuntime` mesmo em Java, porque não é um tipo trocado: pô-lo
 *  em `Recusa` obrigaria a inventar um `esperado` e um `obtido` que não são
 *  tipos, e um `Recusa` com tipos inventados é pior do que um `FalhaRuntime`
 *  honesto. *Quando* é a mensagem que diz, e a projeção de Java diz que o
 *  compilador recusa a linha antes de o código correr.
 *
 *  `QuebraEquivalencia` **não** está aqui, e a ausência é uma decisão: a
 *  divergência entre blocos e texto é um erro de comparação, não do programa.
 *  O programa está certo e o texto é que diverge, e uma sondagem que espera
 *  `Recusa` nunca pode ser satisfeita por alguém que escreveu a linha de outra
 *  maneira — seria dar a nota a uma coisa que não se estava a perguntar.
 *
 *  A lista está logo a seguir e é a fonte da verdade: o tipo sai dela, e não
 *  o contrário. Com o tipo escrito à mão e a lista escrita noutro sítio — que
 *  é o que o carregador de lições fazia — a lista é a que esquece uma das
 *  três, e quem lê vê «as classes são: Observacao, FalhaRuntime», que é um
 *  erro que se lê como um erro. */
export const CLASSES_OBSERVADAS = ['Observacao', 'Recusa', 'FalhaRuntime'] as const;

export type ClassesObservadas = (typeof CLASSES_OBSERVADAS)[number];

export function classificar(erros: readonly Erro[]): ClassesObservadas {
  if (erros.some((e) => e.classe === 'Recusa')) return 'Recusa';
  if (erros.some((e) => e.classe === 'FalhaRuntime')) return 'FalhaRuntime';
  return 'Observacao';
}

export function bate(esperado: ClassesObservadas, erros: readonly Erro[]): boolean {
  return classificar(erros) === esperado;
}

/** O programa e o que a pessoa escreveu, na linguagem escolhida. */
export function divergir(
  linguagem: Language,
  programa: BlocoLeigo | null,
  texto: string,
): Relatorio {
  return comparar(emitir(linguagem, programa).texto, texto);
}
```

**Nota sobre `ClassesObservadas`:** só há três, e `QuebraEquivalencia` **não** está entre elas. A divergência entre blocos e texto é um erro de *comparação*, não um erro do programa: o programa está certo e o texto é que diverge, e uma sonda que espera `Recusa` nunca deve ser satisfeita por um erro de escrita. Se a lição precisar de distinguir, é um campo novo em `esperado`, não uma quarta classe.

- [ ] **Step 7: Correr os testes e ver passar**

Run: `npx vitest run src/nucleo/divergencia.test.ts src/projecoes/avaliar.test.ts`
Expected: PASS.

- [ ] **Step 8: Correr tudo**

Run: `npm test && npm run arvore && npx tsc --noEmit`
Expected: PASS, `núcleo limpo`, typecheck mudo.

- [ ] **Step 9: Commitar**

```bash
git add -A
git commit -m "feat: divergencia com tolerancia por linguagem, e avaliacao de texto em duas fases

avaliarTexto() le com a projeção da linguagem escolhida e julga com o
nucleo. A ordem e o que impede o erro grave: se o nucleo julgasse uma
linha de Java com a politica de Python, o produto ensinaria Python a
recusar coisas que nao recusa.

comparar() da Review Focus 4: em Java, esquecer o ; e uma divergencia
que diz que falta o ;, e nao 'linha invalida' nem 'funcao desconhecida'.
A tolerancia de 2 caracteres trata uma transposicao como 1, e nao como 2.
"
```

---

#### Task 6 —(decisoes e o que ficou por provar)

Sete defeitos no código que o plano trazia, e três deles eram meus. A lista
inteira, porque o padrão é o que se aprende:

1. **O `comparar` do plano importava um tipo de `projecoes/`.** A assinatura
   era `comparar(gerado: Gerado, texto: string)`, e o `Gerado` vive em
   `projecoes/tipos.ts`. Um núcleo a importar a camada que só existe para
   conhecer sintaxe é o invariante inteiro virado do avesso — e a prova é que
   nunca houve problema: o que se comparava era `gerado.texto`, e as anotações
   nunca entraram na comparação. **A assinatura estava a pedir mais do que a
   função usava.** Passou a ser `comparar(esperado: string, obtido: string)`.
   **Custaria:** nada, e a camada ficou com a direção certa.

2. **O ficheiro de teste do próprio plano violava o invariante.**
   `src/nucleo/divergencia.test.ts` importava `java` e `python` para poder
   escrever o resultado esperado — e o `verificar-arvore` o apanhou, porque
   conta os testes. Um núcleo a importar projeções num **teste** é pior do que
   no código: o teste passa a provar a coisa errada. O teste do núcleo ficou só
   com texto, e o que cruza as duas linguagens foi para o `avaliar.test.ts`,
   que vive em `projecoes/` e as pode importar. **Custaria:** a separação
   entre «o que o núcleo faz» e «o que o núcleo provoca».

3. **A tolerância de 2 engolia o ponto-e-vírgula em falta de Java.** Um `;` em
   falta é uma diferença de **um** caractere, e a lição de Java perdia o
   exemplo mais curto que tem: a linha que é quase a mesma e mesmo assim está
   errada. A comparação media a distância antes de dizer o que faltava, e a
   distância de 1 comia o erro. Passou a haver uma verificação de **forma**
   antes da contagem: se a linha esperada acaba num fecho e a escrita não, é
   divergência, seja qual for a distância. E o simétrico também, porque um `;` a
   mais numa linha de Python é o mesmo buraco ao contrário. **Custaria:** uma
   tabela de dois fechos no núcleo — e é uma tabela de **nomes** de fechos, não
   de sintaxe: o núcleo continua sem saber nada de linguagem.

4. **A `distância` do plano não fazia o que o comentário dela prometia.** Dizer
   «uma transposição custa 1» e custar 2 não é um erro que se veja: a tolerância
   é 2, portanto o teste passava na mesma. A linha de *duas* iterações atrás
   estava a ser lida na de *uma*, e por isso a troca de adjacentes nunca era
   encontrada. Passou a guardar duas linhas. **É a nona vez, em treze tarefas,
   que um teste passava por uma margem que escondia o defeito.** Um teste que
   passa com folga não está a fixar o que diz que fixa, e a única forma de
   saber se fixa é exigir o valor exato.

5. **`print(total + 1)` não era lido por nenhuma das projeções.** Nem Python,
   nem Java. A leitura da conta estava escrita **duas vezes**, uma dentro de
   cada `lerAtribuir`, e nenhuma dentro de cada `lerImprimir` — e essa linha é
   a que a lição de Python precisa para mostrar a dívida a pagar-se no uso. A
   segunda projeção pagou a fatura da duplicação. Saiu para
   `src/projecoes/termos.ts`, com o que muda entre linguagens por argumento.

6. **Um teste meu passava pelo motivo errado.** O teste da dívida em Python
   escrevia `print(total + 1)` e aceitava qualquer `FalhaRuntime` no passo 2 — e
   o que lá estava era o **erro de leitura** da linha, que também é
   `FalhaRuntime` e também está no passo 2. Passava a testar outra coisa sem
   ninguém dar por isso. Passou a exigir o texto da mensagem, que só a
   incompatibilidade diz. **Custaria:** nada, e a lição passou a estar provada
   em vez de adivinhada.

7. **`dividirEmLinhas` só aparava espaços à direita**, e o teste dizia «espaços
   nas pontas». O teste estava certo: quem copia de um painel escreve
   `  a = 1  ` e a linha é a mesma. Espaços no meio ficam, porque no meio são o
   texto — e é essa diferença, entre o que a pessoa quis dizer e o que
   escreveu, que a comparação anda a medir. **Custaria:** nada.

**A decisão mais cara desta tarefa, registada aqui:** a classe do erro responde
a **que género de coisa** está errada, e não a **quando**. Um `;` em falta em
Java é `FalhaRuntime`, e é-o porque não é um tipo trocado: pô-lo em `Recusa`
obrigaria a inventar um `esperado` e um `obtido` que não são tipos, e um
`Recusa` com tipos inventados é pior do que um `FalhaRuntime` honesto. O
**quando** é a mensagem que diz — e a projeção de Java diz que o compilador
recusa a linha antes de o código correr. Está fixado por um teste que exige as
duas coisas ao mesmo tempo: a classe **e** a mensagem.

E **o que a classe observada não inclui** continua a ser `QuebraEquivalencia`,
por uma razão que esta tarefa tornou visível: a divergência entre blocos e
texto é um erro de comparação, não do programa. O programa está certo e o texto
é que diverge, e uma sondagem que espera `Recusa` nunca pode ser satisfeita por
alguém que escreveu a linha de outra maneira — seria dar a nota a uma coisa que
não se estava a perguntar.

**O que ficou por provar:** nada. Esta tarefa não afirma nada sobre a linguagem
das pessoas: `comparar` e `avaliarTexto` julgam **o que a projeção leu**, e o
que a projeção leu já foi julgado nas Tasks 4 e 5, com as suas limitações
declaradas. A única afirmação é sobre código nosso, e o `tsc` e os testes são o
que a sustenta.

---

### Task 7: A licao em YAML, o carregador, e as sondas

A licao é um ficheiro YAML no Git. Não há painel de administracao, não ha base de dados, e isso é uma decisão de formato e não uma limitação: um `.yml` que se revê num `git diff` é a unica forma de uma licao ser corrigida por alguem que nao escreve codigo.

Duas regras desta tarefa são as que mais custam a descobrir depois:

- **Só `esperado.classe` é comparado com o motor.** `esperado.porque` é prosa escrita por uma pessoa e nunca é comparada com nada — se fosse, cada reescrita de uma frase faria o CI falhar, e a lição passaria a ser um teste de escrita.
- **`prova.forma` tem de bater com a familia da linguagem.** Uma sonda de SQL provada com um programa é um erro de autoria, e tem de aparecer como `FalhaRuntime` com razao, não como `TypeError`.

**Files:**
- Create: `src/conteudo/esquema.ts`, `src/conteudo/carregar.ts`, `src/conteudo/sondas.ts`, `src/conteudo/index.ts`,
  `src/conteudo/python/variavel.yml` — a lição mais pequena que o formato aceita, para que
  esta tarefa seja verde. A Task 8 reescreve-a com a lição a sério.
- Test: `src/conteudo/carregar.test.ts`, `src/conteudo/sondas.test.ts`

**Interfaces:**
- Consumes: Task 1 — `Language`, `Erro`; Task 2 — `BlocoLeigo`; Task 3 — `EventoLido`; Task 4 — `Projection`, `Gerado`, `obter`; Task 5 — `java`; Task 6 — `avaliarTexto`, `classificar`, `ClassesObservadas`, `emitir`.
- Produces: `Licao`, `Passo`, `Momento`, `Sonda`, `Esperado`, `Prova`, `Bloco`, `Fase`, `Forma`, `Fonte`,
  `FASES`, `FORMAS`, `FORMAS_POR_FAMILIA`, `FONTES`, `FAMILIAS`, `CARREGAR(texto, linguagem)`,
  `ErroDeAutoria`, `TEXTOS`, `LICSOES`, `temLicao(linguagem)`, `executarSonda(sonda, linguagem)`,
  `ResultadoSonda`.

- [ ] **Step 1: Escrever o teste falhado — o carregador**
`src/conteudo/carregar.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { dump } from 'js-yaml';
import { CARREGAR, ErroDeAutoria, LICSOES, TEXTOS, temLicao } from './carregar';
import { FORMAS_POR_FAMILIA } from './esquema';
import variavelPython from './python/variavel.yml?raw';

/** A lição mais pequena que o carregador aceita.
 *
 *  Vive aqui, montada a partir de um objeto, e não copiada do ficheiro real.
 *  A versão do plano fazia o contrário — pegava no `variavel.yml` e
 *  substituía com expressões regulares — e o resultado era uma dezena de
 *  testes presos à formatação do ficheiro: `momentos: []` só era alcançável
 *  porque a regex sabia onde estava a próxima `- fase:`, e mudar a
 *  indentação do YAML partia seis testes que deviam estar a testar o
 *  carregador.
 *
 *  Aqui a corrupção é **num campo**, não num texto. O teste continua a ser
 *  sobre a regra do carregador, e passa a ser sobre a regra do carregador
 *  mesmo que o ficheiro real mude de forma. */
function licaoMinima(): Record<string, unknown> {
  return {
    id: 'variavel',
    linguagem: 'python',
    titulo: 'A caixa que guarda o valor',
    porqueTitulo: 'Sem uma caixa, o número que contas desaparece no fim da linha.',
    blocos: [{ type: 'guardar' }, { type: 'dizer' }],
    passos: [
      {
        fase: 'explicar',
        porque:
          'Este bloco põe um número dentro de uma caixa com nome, e o nome é o que torna o número útil depois da linha.',
        bloco: {
          type: 'guardar',
          fields: { nome: { valor: 'total' } },
          inputs: { VALOR: { valor: 5 } },
        },
        sonda: 'guarda-um-numero',
        momentos: [
          {
            id: 'l1',
            texto: 'O que é que esta linha põe dentro da caixa?',
            palavras: ['guardar', 'número', 'total'],
            fonte: 'leitura',
          },
        ],
      },
      {
        fase: 'fazer',
        porque: 'Agora escreves tu a linha, e a sonda diz-te se o que fizeste é o que a linha diz.',
        bloco: {
          type: 'guardar',
          fields: { nome: { valor: 'total' } },
          inputs: { VALOR: { valor: 5 } },
        },
        sonda: 'guarda-um-numero',
        momentos: [
          {
            id: 'f1',
            texto: 'Escreve a linha que põe 5 dentro de uma caixa chamada total.',
            palavras: [],
            fonte: 'texto',
          },
        ],
      },
      {
        fase: 'nomear',
        porque: 'O nome desta coisa é metade do que a torna útil.',
        nomear: 'variável',
        bloco: {
          type: 'guardar',
          fields: { nome: { valor: 'total' } },
          inputs: { VALOR: { valor: 5 } },
        },
        sonda: 'guarda-um-numero',
        momentos: [
          {
            id: 'n1',
            texto: 'Como se chama a caixa que guarda o valor?',
            palavras: ['variável', 'caixa'],
            fonte: 'leitura',
          },
        ],
      },
    ],
    sondas: [
      {
        nome: 'guarda-um-numero',
        pergunta: 'O que é que este programa faz?',
        porque:
          'A sonda tem de estar na lição antes de o aluno mexer, para o ele tentar a experiência e ver o que acontece.',
        prova: {
          forma: 'programa',
          programa: {
            type: 'pilha',
            inputs: {
              CORPO: {
                stack: [
                  {
                    type: 'guardar',
                    fields: { nome: { valor: 'total' } },
                    inputs: { VALOR: { valor: 5 } },
                  },
                ],
              },
            },
          },
        },
        esperado: {
          classe: 'Observacao',
          porque:
            'O programa corre, guarda um número e não dá erro nenhum — e é por isso que a linha parece estar a fazer nada.',
        },
      },
    ],
    paraSaberQueFez:
      'Fizeste quando conseguiste dizer, sem ver a lição, o que a tua linha faz e o que a protege.',
  };
}

/** A mesma lição, com um campo mudado, sem tocar no resto. */
function com(mudanca: (l: Record<string, unknown>) => void): string {
  const l = licaoMinima();
  mudanca(l);
  return dump(l);
}

function primeiroPasso(l: Record<string, unknown>): Record<string, unknown> {
  return (l.passos as Array<Record<string, unknown>>)[0]!;
}

describe('CARREGAR: a lição mínima é aceite', () => {
  it('carrega e devolve os campos tal como estão', () => {
    const l = CARREGAR(dump(licaoMinima()), 'python');
    expect(l.id).toBe('variavel');
    expect(l.linguagem).toBe('python');
    expect(l.titulo).toBe('A caixa que guarda o valor');
    expect(l.paraSaberQueFez.length).toBeGreaterThan(0);
  });

  it('e o tipo da linguagem é o do núcleo, e não `string`', () => {
    // `linguagem: string` no esquema é uma porta aberta: a lição de Go
    // passava a validar como se fosse a de Python, e o erro só aparecia
    // quando o aluno carregava. O esquema tem de fechar a lista.
    const l = CARREGAR(dump(licaoMinima()), 'python');
    expect(l.linguagem satisfies 'python' | 'java' | 'go' | 'typescript' | 'javascript' | 'sql').toBe('python');
  });

  it('o YAML partido é recusado com a linha, e a linha é a do ficheiro e não a do analisador', () => {
    // O `mark.line` do analisador conta a partir do zero. Passá-lo como
    // estava dá a linha 1 a quem está na linha 2, e um erro de autoria
    // que aponta para a linha errada é um erro de autoria que se arrasta.
    try {
      CARREGAR('id: variavel\n  id: [quebrado', 'python');
      throw new Error('devia ter sido recusado');
    } catch (e) {
      expect(e).toBeInstanceOf(ErroDeAutoria);
      expect((e as ErroDeAutoria).razao).toMatch(/linha 2/);
    }
  });

  it('e a mensagem diz o que o analisador disse, para o autor não ficar às cegas', () => {
    // A mensagem do analisador está em inglês. Fica, e fica por uma razão que
    // vale mais do que a língua: quem escreve a lição é quem vai corrigir a
    // lição, e um `bad indentation of a mapping entry` aponta para o sítio e
    // o analisador é quem sabe o sítio. **Esta mensagem nunca vai para o
    // ecrã de um aluno** — é um erro de autoria, e o aluno não escreve lições.
    try {
      CARREGAR('id: variavel\n  id: [quebrado', 'python');
    } catch (e) {
      expect((e as ErroDeAutoria).razao).toMatch(/analisador/);
    }
  });
});

describe('CARREGAR: recusas de autoria, campo a campo', () => {
  it('linguagem que não é a do ficheiro é recusada, e a mensagem diz as duas', () => {
    try {
      CARREGAR(dump(licaoMinima()), 'java');
      throw new Error('devia ter sido recusado');
    } catch (e) {
      expect((e as Error).message).toMatch(/python/);
      expect((e as Error).message).toMatch(/java/);
    }
  });

  it('a sonda que um passo aponta tem de existir, e a mensagem diz os nomes', () => {
    const razao = razaoDe(com((l) => {
      primeiroPasso(l).sonda = 'nao-existe';
    }));
    expect(razao).toMatch(/nao-existe/);
    expect(razao).toMatch(/guarda-um-numero/);
  });

  it('uma classe esperada que não existe é recusada com a lista das que existem', () => {
    const razao = razaoDe(com((l) => {
      ((l.sondas as Array<Record<string, unknown>>)[0]!.esperado as Record<string, unknown>).classe =
        'Explosao';
    }));
    expect(razao).toMatch(/Explosao/);
    expect(razao).toMatch(/Observacao/);
  });

  it('um passo sem porque é recusado: nenhuma mensagem sem razão', () => {
    const razao = razaoDe(com((l) => {
      primeiroPasso(l).porque = '   ';
    }));
    expect(razao).toMatch(/porque/);
  });

  it('um passo sem momentos é recusado, porque nunca se completaria', () => {
    // A regra não é interface: é aritmética. `momentos[momento]` de uma lista
    // vazia dá `undefined` para sempre, e o aluno ficava preso num passo que
    // não avança nem recusa.
    const razao = razaoDe(com((l) => {
      primeiroPasso(l).momentos = [];
    }));
    expect(razao).toMatch(/momentos/);
  });

  it('um passo de fase nomear sem palavra é recusado', () => {
    // A regra protege a vista `nomear`. Sem uma palavra, o aluno lia o mesmo
    // parágrafo que lia na vista `explicar`, e a lição perdia um terço do
    // método.
    const razao = razaoDe(com((l) => {
      const p = (l.passos as Array<Record<string, unknown>>)[2]!;
      delete p.nomear;
    }));
    expect(razao).toMatch(/nomear/);
  });

  it('uma palavra nomeada num passo que não é de fase nomear é recusada', () => {
    // A palavra nomeada é o conteúdo da vista `nomear`. Num passo de fase
    // `fazer` seria uma segunda fonte de verdade: o `porque` e a palavra
    // nomeada poderiam dizer coisas diferentes, e o aluno veria as duas.
    const razao = razaoDe(com((l) => {
      primeiroPasso(l).nomear = 'variável';
    }));
    expect(razao).toMatch(/não dá nome a nada/);
  });

  it('e a recusa diz a palavra que está fora do sítio, e não só o campo', () => {
    const razao = razaoDe(com((l) => {
      primeiroPasso(l).nomear = 'variável';
    }));
    expect(razao).toMatch(/variável/);
  });

  it('uma sonda sem pergunta é recusada: é a primeira coisa que o aluno lê', () => {
    // O `porque` da sonda é sobre a lição e nunca aparece no ecrã. A
    // `pergunta` é o inverso: aparece primeiro e sem mais nada à volta. Uma
    // sonda que só tem `porque` obriga o aluno a ler a nota de rodapé do
    // currículo antes de adivinhar o que a experiência vai fazer.
    const razao = razaoDe(com((l) => {
      delete (l.sondas as Array<Record<string, unknown>>)[0]!.pergunta;
    }));
    expect(razao).toMatch(/pergunta/);
  });

  it('uma fonte de momento que não existe é recusada com a lista', () => {
    const razao = razaoDe(com((l) => {
      ((primeiroPasso(l).momentos as Array<Record<string, unknown>>)[0]!).fonte = 'palpite';
    }));
    expect(razao).toMatch(/palpite/);
    expect(razao).toMatch(/leitura/);
  });

  it('dois momentos com o mesmo id são recusados: o id é a chave dentro do passo', () => {
    const razao = razaoDe(com((l) => {
      const momentos = primeiroPasso(l).momentos as Array<Record<string, unknown>>;
      momentos.push({ ...momentos[0]! });
    }));
    expect(razao).toMatch(/mesmo id/);
  });

  it('dois passos com o mesmo id de momento são aceites, porque o id é do passo', () => {
    // O mesmo `id` em dois passos diferentes é o mesmo sítio lógico —
    // `l1` é a leitura em qualquer passo. Recusá-lo obrigaria a inventar nomes
    // globais para cada passo, e o ficheiro a crescer sem o aluno ver nada.
    const l = com((bruta) => {
      const passos = bruta.passos as Array<Record<string, unknown>>;
      passos[1]!.momentos = [
        { id: 'l1', texto: 'A mesma pergunta, noutro passo.', palavras: ['guardar'], fonte: 'leitura' },
      ];
    });
    expect(() => CARREGAR(l, 'python')).not.toThrow();
  });

  it('o nome de uma sonda tem de ser um identificador em minúsculas', () => {
    const razao = razaoDe(com((l) => {
      const s = (l.sondas as Array<Record<string, unknown>>)[0]!;
      s.nome = 'Guarda Um Número';
    }));
    expect(razao).toMatch(/minúsculas/);
  });

  it('uma prova com os dois, `programa` e `texto`, é recusada', () => {
    const razao = razaoDe(com((l) => {
      ((l.sondas as Array<Record<string, unknown>>)[0]!.prova as Record<string, unknown>).texto = 'total = 5\n';
    }));
    expect(razao).toMatch(/nunca os dois/);
  });

  it('uma prova sem nenhum dos dois é recusada', () => {
    const razao = razaoDe(com((l) => {
      delete (l.sondas as Array<Record<string, unknown>>)[0]!.prova;
    }));
    expect(razao).toMatch(/prova/);
  });

  it('um programa de prova que não é um bloco é recusado pelo sítio, e não por um `as never`', () => {
    // O plano fazia `prova.programa as never` e dizia que validava. Não
    // validava: `as never` cala o compilador e não olha para o dado. Um
    // `programa: 5` passava a validação e rebentava no `emitir`, em código de
    // projeção, com um erro que não aponta para o YAML.
    const razao = razaoDe(com((l) => {
      ((l.sondas as Array<Record<string, unknown>>)[0]!.prova as Record<string, unknown>).programa = 5;
    }));
    expect(razao).toMatch(/programa/);
  });

  it('um bloco do vocabulario que não é desta linguagem é recusado com a lista', () => {
    const razao = razaoDe(com((l) => {
      (l.blocos as Array<Record<string, unknown>>)[0]!.type = 'enquanto';
    }));
    expect(razao).toMatch(/enquanto/);
    expect(razao).toMatch(/guardar/);
  });
});

describe('CARREGAR: Review Focus 2, a forma tem de bater com a família', () => {
  it('uma forma que não existe é recusada com a lista das que existem', () => {
    const razao = razaoDe(com((l) => {
      ((l.sondas as Array<Record<string, unknown>>)[0]!.prova as Record<string, unknown>).forma = 'diagrama';
    }));
    expect(razao).toMatch(/diagrama/);
    expect(razao).toMatch(/programa/);
  });

  it('uma forma que existe mas é de outra família é recusada, e a mensagem diz as duas', () => {
    // O ponto 2 do `Review Focus` é este: uma sonda de SQL provada com um
    // programa é um erro de autoria e aparece como recusa com razão, e não
    // como um `TypeError` algures dentro da projeção. `consulta` existe no
    // esquema porque o Plano C precisa dela, e é exatamente por isso que
    // este teste é preciso agora: uma forma válida noutra família não é uma
    // forma válida aqui.
    const razao = razaoDe(com((l) => {
      ((l.sondas as Array<Record<string, unknown>>)[0]!.prova as Record<string, unknown>).forma = 'consulta';
    }));
    expect(razao).toMatch(/consulta/);
    expect(razao).toMatch(/imperativa/);
  });

  it('e a regra mora num sítio só, o esquema, e as duas metades do runner leem de lá', () => {
    // A tabela da família estava escrita duas vezes — no carregador e no
    // runner — e duas tabelas divergem no primeiro caso em que uma delas é
    // mudada. `FORMAS_POR_FAMILIA` vive no esquema, que é o contrato.
    expect(FORMAS_POR_FAMILIA.imperativa).toBe('programa');
    expect(FORMAS_POR_FAMILIA.declarativa).toBe('consulta');
  });
});

describe('o registo de lições', () => {
  it('Python tem lição; as outras ainda não', () => {
    expect(temLicao('python')).toBe(true);
    expect(temLicao('java')).toBe(false);
    expect(LICSOES).toEqual(['python']);
  });

  it('o registo é derivado dos ficheiros, e não escrito à mão', () => {
    // A primeira versão dizia `['python', 'java']` e o teste dizia
    // `['python']`. Um array escrito à mão é uma lista de intenções; este é
    // uma lista de ficheiros, e por isso não pode ficar para trás.
    expect(Object.keys(TEXTOS)).toEqual(LICSOES.map((l) => `${l}/variavel`));
  });

  it('e a chave do registo é a mesma que `temLicao` pergunta', () => {
    for (const l of LICSOES) expect(TEXTOS[`${l}/variavel`]).toBeDefined();
  });
});

describe('a lição de Python que está no repositório', () => {
  it('carrega sem nenhuma recusa de autoria', () => {
    expect(() => CARREGAR(variavelPython, 'python')).not.toThrow();
  });

  it('é a mesma lição que a do registo', () => {
    expect(TEXTOS['python/variavel']).toBe(variavelPython);
  });

  it('cada passo aponta para uma sonda que existe', () => {
    const l = CARREGAR(variavelPython, 'python');
    const nomes = l.sondas.map((s) => s.nome);
    for (const p of l.passos) expect(nomes).toContain(p.sonda);
  });

  it('cada sonda tem os dois campos de prosa, e nenhum dos dois é opcional', () => {
    const l = CARREGAR(variavelPython, 'python');
    for (const s of l.sondas) {
      expect(s.pergunta.length).toBeGreaterThan(0);
      expect(s.porque.length).toBeGreaterThan(20);
    }
  });

  it('só `fonte: leitura` tem palavras, e as outras não', () => {
    // Uma palavra numa fonte que não é `leitura` é um campo morto: ninguém a
    // confere, e quem a escreveu pensou que alguém ia. A regra do produto é
    // que não há respostas erradas — só há palavras que contam e palavras
    // que são decoração.
    const l = CARREGAR(variavelPython, 'python');
    for (const p of l.passos) {
      for (const m of p.momentos) {
        if (m.fonte === 'leitura') expect(m.palavras.length).toBeGreaterThan(0);
        else expect(m.palavras).toEqual([]);
      }
    }
  });

  it('o `porque` de um passo explica e não instrui, e é por isso que é comprido', () => {
    const l = CARREGAR(variavelPython, 'python');
    for (const p of l.passos) expect(p.porque.length).toBeGreaterThan(20);
  });

  it('o título não é um slug', () => {
    expect(CARREGAR(variavelPython, 'python').titulo).not.toMatch(/^[a-z0-9-]+$/);
  });

  it('um bloco escondido dentro de uma pilha é conferido como os outros', () => {
    // O vocabulário é conferido no `type` de fora e **dentro** também. Com a
    // conferência só por fora, um `enquanto` dentro de uma pilha validava: a
    // linha parecia ser de Python e a emissão escrevia um comentário a dizer
    // que o bloco ainda não existe. É o mesmo buraco do `programa as never`,
    // um nível mais abaixo.
    const l = licaoMinima();
    l.blocos = [
      {
        type: 'pilha',
        inputs: { CORPO: { stack: [{ type: 'enquanto' }] } },
      },
    ];
    const razao = razaoDe(dump(l));
    expect(razao).toMatch(/enquanto/);
    expect(razao).toMatch(/blocos\[0\]\.inputs\.CORPO\.stack\[0\]\.type/);
    // E o caminho aponta para o sítio, que é o que faz a regra ser usada.
    expect(razao).toMatch(/stack\[0\]/);
  });

  it('a referência tem um nome e nada mais: o ficheiro vive num sítio só', () => {
    // Aceitar `linhas` dentro da referência seria aceitar uma segunda versão
    // do ficheiro, e as duas divergiriam sem ninguém dar por isso.
    const l = licaoMinima();
    const passo = (l.passos as Record<string, unknown>[])[0]!;
    passo.referencia = { nome: 'variavel.py' };
    const licao = CARREGAR(dump(l), 'python');
    expect(licao.passos[0]!.referencia).toEqual({ nome: 'variavel.py' });

    passo.referencia = { nome: 'variavel.py', linhas: ['total = 5'] };
    const razao = razaoDe(dump(l));
    expect(razao).toMatch(/só pode ter "nome"/);
    expect(razao).toMatch(/referencia\.linhas|linhas/);
  });

  // A versão desta secção que dizia «cada programa de prova escreve alguma
  // coisa» foi apagada na T13, e o motivo está escrito onde a substituiu.
  // `texto.length > 0` passa com `undefined = 5`, que é o defeito
  // que a conferência fraca deixou passar: a mutação que trocava `nome` por
  // `NOME` no YAML pôs este ficheiro a vermelho, o `length > 0` ficou verde, e
  // a única coisa que o apanhou foi a conferência de `portao.test.ts`, que
  // existe porque este teste existia e era mais fraco. A regra nova é mais
  // forte e está no sítio certo: em `portao.test.ts`, a correr sobre todas as
  // lições em vez de uma.
});

function razaoDe(yaml: string): string {
  try {
    CARREGAR(yaml, 'python');
  } catch (e) {
    if (e instanceof ErroDeAutoria) return e.message;
    throw e;
  }
  throw new Error('a lição devia ter sido recusada e não foi');
}
```

- [ ] **Step 2: Escrever o teste falhado — as sondas**
`src/conteudo/sondas.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { avaliarTexto, emitir } from '../projecoes/avaliar';
import { FAMILIAS, FORMAS, FORMAS_POR_FAMILIA } from './esquema';
import { LINGUAGENS } from '../nucleo/tipos';
import type { Sonda } from './esquema';
import { executarSonda } from './sondas';

function sonda(extra: Partial<Sonda> = {}): Sonda {
  return {
    nome: 'guarda-um-numero',
    pergunta: 'O que é que este programa faz?',
    porque: 'A sonda está aqui para a pessoa dizer o que espera antes de ver o que acontece.',
    prova: {
      forma: 'programa',
      programa: {
        type: 'pilha',
        inputs: {
          CORPO: {
            stack: [
              { type: 'guardar', fields: { nome: { valor: 'total' } }, inputs: { VALOR: { valor: 5 } } },
            ],
          },
        },
      },
    },
    esperado: {
      classe: 'Observacao',
      porque: 'Corre e não dá erro, e é por isso que a linha parece não estar a fazer nada.',
    },
    ...extra,
  };
}

/** Uma sondagem montada à mão, com o que se quiser dentro.
 *
 *  Existe porque o `CARREGAR` recusa sondagens malformadas **e é suposto
 *  recusá-las**: o runner nunca é chamado com uma sondagem assim. Mas quem
 *  escreve uma sondagem em memória — o painel de texto da Task 10 faz isso —
 *  pode, e o runner tem de responder com um relatório e não com um
 *  `TypeError`, que é a diferença entre uma ferramenta que ensina e uma que
 *  baralha.
 *
 *  A conversão é `as Sonda` e está **numa função**, com a razão escrita. A
 *  versão do plano punha `// @ts-expect-error` numa linha que não era a linha
 *  do erro, o que o `tsc` apanha a dizer que não. */
function sondaEmMaos(bruta: unknown): Sonda {
  return bruta as Sonda;
}

function sondaDeTexto(corpo: string): Sonda {
  return sonda({ nome: 'linha-escrita-a-mao', prova: { forma: FORMAS_POR_FAMILIA.imperativa, texto: corpo } });
}

describe('executarSonda: o que o relatório diz', () => {
  it('passa quando o motor vê o que a sondagem esperava', () => {
    const r = executarSonda(sonda(), 'python');
    expect(r.ok).toBe(true);
    expect(r.esperada).toBe('Observacao');
    expect(r.observada).toBe('Observacao');
    expect(r.nome).toBe('guarda-um-numero');
    expect(r.erro).toBeNull();
  });

  it('falha quando não passa, e o relatório traz as duas classes', () => {
    const r = executarSonda(sondaDeTexto('int total = "olá";\n'), 'java');
    expect(r.ok).toBe(false);
    expect(r.esperada).toBe('Observacao');
    expect(r.observada).toBe('Recusa');
  });

  it('o porque esperado nunca é comparado, só a classe', () => {
    // Escrever outra frase na lição não pode partir o CI. Este teste é a
    // garantia disso, e é o que impede a lição de virar um teste de escrita.
    const a = executarSonda(sonda(), 'python');
    const b = executarSonda(
      sonda({ esperado: { classe: 'Observacao', porque: 'Uma frase completamente diferente, com mais palavras.' } }),
      'python',
    );
    expect(a.ok).toBe(b.ok);
    expect(b.ok).toBe(true);
  });

  it('o relatório tem porque, mesmo quando falha', () => {
    const r = executarSonda(sondaDeTexto('isto nao e python\n'), 'python');
    expect(r.ok).toBe(false);
    expect(r.porque.length).toBeGreaterThan(0);
  });

  it('o relatório tem o mesmo porque quando passa, para o `git diff` mostrar a mudança', () => {
    expect(executarSonda(sonda(), 'python').porque).toBe(sonda().porque);
  });

  it('e quando falha o porque é o da sondagem mais o que aconteceu', () => {
    // A regra do produto: a lição não muda de texto porque alguém errou. O
    // porque da sondagem escreve-se uma vez e continua igual; o que muda é o
    // que o relatório acrescenta em cima.
    const r = executarSonda(sondaDeTexto('isto nao e python\n'), 'python');
    expect(r.porque.startsWith(sonda().porque)).toBe(true);
    expect(r.porque.length).toBeGreaterThan(sonda().porque.length);
  });

  it('o erro de uma falha começa por dizer que foi o motor que viu aquilo', () => {
    const r = executarSonda(sondaDeTexto('isto nao e python\n'), 'python');
    expect(r.erro).toMatch(/^o motor viu/);
  });
});

describe('executarSonda: a mesma linha em duas linguagens', () => {
  it('guardar uma palavra passa em Python e é recusado em Java, e é a recusa que é o produto', () => {
    // A linha é a mesma ideia: pôr um valor dentro de uma caixa. Em Python a
    // caixa aceita o que lhe derem; em Java a caixa é de um tipo só, e um
    // `int` não aceita uma palavra. **Nenhuma das duas está errada.** A
    // resposta muda porque a pergunta muda, e é isso que a lição tem de
    // ensinar.
    const py = executarSonda(sondaDeTexto("total = 'olá'\n"), 'python');
    const ja = executarSonda(sondaDeTexto('int total = "olá";\n'), 'java');
    expect(py.ok).toBe(true);
    expect(ja.ok).toBe(false);
    expect(ja.observada).toBe('Recusa');
  });

  it('a sondagem de Java não pode ser a de Python com o texto trocado', () => {
    // É este teste que diz à próxima tarefa que a lição de Java precisa de
    // sondagens próprias. A lição é o conteúdo, e o conteúdo não se copia.
    const py = executarSonda(sondaDeTexto("total = 'olá'\n"), 'python');
    const emJava = executarSonda(sondaDeTexto("total = 'olá'\n"), 'java');
    // O mesmo texto, lido por Java, nem é lido: tem aspas simples onde a Java
    // só aceita duplas. E o erro tem de ser **da leitura**, não da política,
    // porque é a leitura que não reconhece a linha.
    expect(py.ok).toBe(true);
    expect(emJava.ok).toBe(false);
    expect(emJava.observada).toBe('FalhaRuntime');
    expect(emJava.erro).toMatch(/Java/);
  });

  it('nenhum programa de blocos dá uma recusa de tipo, e isso é uma fatura da estrutura', () => {
    // Os blocos são tipados: um `guardar` com `{ txt: 'olá' }` escreve
    // `String total = "olá";` em Java, que é Java bem escrito. **Não há
    // caminho de blocos para uma `Recusa` em Java.** A lição de Java tem de
    // provar as recusas com texto escrito à mão, e este teste é o que o diz
    // em vez de o descobrir à quinta tarefa quando a lição não fecha.
    const escrito = emitir('java', {
      type: 'pilha',
      inputs: {
        CORPO: {
          stack: [
            { type: 'guardar', fields: { nome: { valor: 'total' } }, inputs: { VALOR: { valor: { txt: 'olá' } } } },
          ],
        },
      },
    }).texto;
    expect(escrito).toBe('String total = "olá";\n');
    expect(avaliarTexto('java', escrito)).toEqual([]);
  });
});

describe('executarSonda: o Review Focus 1, texto de outra linguagem', () => {
  it('texto de Java lido por Python é recusado com uma razão', () => {
    const r = executarSonda(sondaDeTexto('int total = 5;\n'), 'python');
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/Python/i);
  });

  it('e o relatório diz que o texto não é desta linguagem, e não que o programa falhou', () => {
    // A diferença é o que o aluno aprende. «Isto não é Python» é uma porta
    // fechada com uma razão; «o programa falhou» faz o aluno pensar que
    // escreveu Python mal, que é uma coisa diferente — e errada.
    const r = executarSonda(sondaDeTexto('int total = 5;\n'), 'python');
    // A metade que importa: a recusa **nomeia a linguagem** e diz o que uma
    // linha dela é. Um relatório que dissesse «o programa falhou» faria o
    // aluno procurar um erro no programa, e o programa estava bem — a linha é
    // que é de outra linguagem.
    expect(r.erro).toMatch(/não é Python/i);
    expect(r.erro).toMatch(/atribuição, um print, um for/);
    expect(r.erro).not.toMatch(/o programa falhou/i);
  });
});

describe('executarSonda: sondagens malformadas dão relatório, não exceção', () => {
  it('uma forma que não existe dá relatório a dizer quais existem', () => {
    const r = executarSonda(sondaEmMaos({ ...sonda(), prova: { forma: 'diagrama', texto: 'x' } }), 'python');
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/diagrama/);
    expect(r.erro).toMatch(/programa/);
    expect(r.observada).toBe('Observacao');
  });

  it('uma forma de outra família dá relatório a dizer a família', () => {
    const r = executarSonda(sondaEmMaos({ ...sonda(), prova: { forma: 'consulta', texto: 'SELECT 1' } }), 'python');
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/consulta/);
    expect(r.erro).toMatch(/imperativa/);
  });

  it('uma prova com os dois, ou com nenhum, dá relatório', () => {
    for (const prova of [{ forma: 'programa' }, { forma: 'programa', texto: 'x = 1\n', programa: sonda().prova.programa }]) {
      const r = executarSonda(sondaEmMaos({ ...sonda(), prova }), 'python');
      expect(r.ok).toBe(false);
      expect(r.erro).toMatch(/nunca os dois|nenhum/);
    }
  });

  it('uma sondagem de Go, TypeScript, JavaScript ou SQL dá relatório, e não rebenta', () => {
    // Este teste foi escrito depois de uma revisão de fora, e a revisão
    // tinha razão. A linha que decide se a forma bate com a família pedia a
    // **projeção**, e uma projeção que não existe rebenta. Rebentar ali é a
    // pior coisa que podia acontecer, e por duas Razões: o SQL é a única
    // declarativa das seis, e `forma: consulta` com `sql` é a combinação
    // **certa** — a que a linha existe para dizer que está errada quando não
    // está. Quatro das seis linguagens nunca chegaram a ver esta linha.
    //
    // A família é uma propriedade da linguagem e vive no `FAMILIAS`; a
    // projeção só é preciso depois, para escrever o programa.
    //
    // E a prova não é que deixou de rebentar: é que as doze combinações dão
    // uma **mensagem**, e que a mensagem é a do sítio certo. A do par errado
    // diz «esta linguagem é declarativa, que se prova com "consulta"» e é
    // essa a resposta que se queria; a do par certo passa à regra seguinte,
    // porque já não há nada a dizer sobre a forma.
    for (const linguagem of LINGUAGENS) {
      for (const forma of FORMAS) {
        const certa = forma === FORMAS_POR_FAMILIA[FAMILIAS[linguagem]];
        const r = executarSonda(
          sondaEmMaos({ ...sonda(), prova: { forma, texto: 'qualquer' } }),
          linguagem,
        );
        expect(r.ok).toBe(false);
        if (certa) {
          // O par certo: a forma não é o assunto, e a regra seguinte diz
          // do assunto. É por isso que isto mede a **passagem** e não a
          // recusa, e é por isso que a recusa é o que se afirma.
          expect(r.erro).not.toMatch(/que se prova com/);
        } else {
          expect(r.erro).toMatch(/que se prova com/);
          expect(r.erro).toMatch(
            new RegExp(FAMILIAS[linguagem] === 'declarativa' ? 'declarativa' : 'imperativa'),
          );
        }
      }
    }
  });

  it('um programa que não é um bloco dá relatório, e não rebenta dentro da projeção', () => {
    // O `CARREGAR` recusa isto, e o painel de texto da Task 10 pode construí-
    // lo sem passar pelo carregador. Um `throw` aqui seria um ecrã branco
    // com a lição a meio.
    // `programa: 5` **não** rebenta: `pilhaDe(5)` devolve uma lista vazia, o
    // emissor escreve um programa vazio, e um programa vazio corre sem erro.
    // O relatório dizia que a sondagem tinha passado, e o que tinha passado
    // era uma sondagem sem programa. O runner é a última linha: tem de
    // olhar para o programa antes de o escrever.
    const r = executarSonda(sondaEmMaos({ ...sonda(), prova: { forma: 'programa', programa: 5 } }), 'python');
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/o motor viu/);
    expect(r.erro).toMatch(/não é um bloco/);
  });
});
```

O ponto 2 do `Review Focus` fica coberto pela forma inválida acima e pelo `validarForma()` do carregador, que recusa a forma errada para a família com a mensagem a dizer as duas. A forma `consulta` só é exercitada no Plano C, com a projeção de SQL — e o runner já a aceita, o que é o que faz o Plano C não precisar de mexer aqui.

- [ ] **Step 3: Correr os testes e ver falhar**
Run: `npx vitest run src/conteudo`
Expected: FAIL com erros de resolução de `./esquema`, `./carregar` e `./sondas`.

- [ ] **Step 4: Escrever `src/conteudo/esquema.ts`**
Este é o contrato entre o ficheiro YAML e o código. Cada campo tem uma regra, e a regra é testada no Step 1.\n
```typescript
import type { BlocoLeigo } from '../nucleo/blocos';
import type { Language } from '../nucleo/tipos';
import type { ClassesObservadas } from '../projecoes/avaliar';
import type { Familia } from '../projecoes/tipos';

/** As três fases do método, e a ordem em que aparecem.
 *
 *  Não são três ecrãs: são três perguntas ao mesmo programa. `explicar` lê,
 *  `fazer` escreve, `nomear` dá o nome. Uma lição que saltasse a `nomear`
 *  ensinaria a executar sem nunca saber o que se está a executar — que é
 *  exatamente o que a maioria faz com um computador alheio. */
export type Fase = 'explicar' | 'fazer' | 'nomear';

export const FASES: readonly Fase[] = ['explicar', 'fazer', 'nomear'];

/** A forma de um bloco no YAML. **Não** é um tipo novo: é o `BlocoLeigo` do
 *  núcleo, com o nome que o formato usa.
 *
 *  A primeira versão do esquema declarava a forma outra vez, campo a campo, e
 *  a duplicação pagou-se assim que o núcleo ganhou um campo: os dois tipos
 *  deixaram de descrever a mesma coisa e o `emitir` deixou de aceitar o que o
 *  YAML escrevia, com um erro que só aparecia em runtime. Uma forma, um
 *  nome, dois sítios onde se pode escrever. */
export type Bloco = BlocoLeigo;

/** As duas formas de uma sondagem.
 *
 *  `programa` é um programa imperativo, escrito com blocos, e é o que a
 *  maioria das sondagens é. `consulta` é uma pergunta feita aos dados, e só
 *  o SQL a usa.
 *
 *  A forma **não** decide o que está dentro da prova: uma sondagem em forma
 *  de programa pode provar-se com blocos (`programa`) ou com um excerto de
 *  código que o aluno tem de ler (`texto`). São duas perguntas differentes —
 *  «isto corre?» e «isto quer dizer o que tu pensas?» — e a segunda é a que
 *  ensina a ler código. */
export type Forma = 'programa' | 'consulta';

export const FORMAS: readonly Forma[] = ['programa', 'consulta'];

/** Que forma de sondagem é a de cada família de linguagem.
 *
 *  Mora aqui, e não no carregador nem no runner, porque era escrita nos dois
 *  sítios e duas tabelas divergem no primeiro caso em que uma delas muda.
 *  A tabela é a *regra*, e a regra é uma coisa só. */
export const FORMAS_POR_FAMILIA: Record<Familia, Forma> = {
  imperativa: 'programa',
  declarativa: 'consulta',
};

/** As famílias, e a de cada linguagem.
 *
 *  Vive no esquema para que quem escreve uma lição não tenha de saber de
 * família: escreve `forma: consulta` e o carregador descobre o resto. A
 *  projeção continua a ser a única que sabe disto — o esquema só aponta para
 *  lá. */
export const FAMILIAS: Record<Language, Familia> = {
  python: 'imperativa',
  java: 'imperativa',
  go: 'imperativa',
  typescript: 'imperativa',
  javascript: 'imperativa',
  sql: 'declarativa',
};

/** A prova de uma sondagem. */
export interface Prova {
  forma: Forma;
  /** Preenchido quando a prova são blocos. */
  programa?: Bloco;
  /** Preenchido quando a prova é um excerto de código ou de consulta, que o
   *  aluno tem de ler e dizer o que faz. */
  texto?: string;
}

/** O que se espera que aconteça.
 *
 *  `classe` é o **único** campo comparado com o motor. `porque` é prosa de
 *  autoria e nunca é comparada com nada — se fosse, cada reescrita de uma
 *  frase faria o CI falhar e a lição passaria a ser um teste de escrita. */
export interface Esperado {
  classe: ClassesObservadas;
  porque: string;
}

export interface Sonda {
  nome: string;
  /** A pergunta que se faz ao aluno antes de ele fazer a experiência. É a
   *  primeira coisa do ecrã que ele lê, e por isso é um campo próprio e não
   *  uma frase dentro do `porque`. */
  pergunta: string;
  /** Porque é que esta sonda está na lição. É sobre a lição, não sobre o
   *  aluno: nunca aparece no ecrã. */
  porque: string;
  prova: Prova;
  esperado: Esperado;
}

/** De onde vem a resposta a um momento. */
export type Fonte = 'blocos' | 'texto' | 'leitura';

export const FONTES: readonly Fonte[] = ['blocos', 'texto', 'leitura'];

/** Uma pergunta de um passo.
 *
 *  `fonte: leitura` é a única cujas palavras são conferidas, e mesmo aí
 *  nenhuma resposta é errada: uma resposta que não tem as palavras não conta
 *  como resposta, e o produto **nunca** diz que está errada. Uma sondagem que
 *  dissesse «errado» seria uma sondagem sobre a vontade do autor, não sobre
 *  a leitura de quem responde. */
export interface Momento {
  id: string;
  texto: string;
  /** Palavras que a resposta pode conter. Vazio significa que não se avalia. */
  palavras: string[];
  fonte: Fonte;
}

export interface Passo {
  fase: Fase;
  /** Porque esta linha existe, nos termos desta linguagem. Explica, não
   *  instrui: um `porque` que dá ordens é uma ordem disfarçada de
   *  explicação, e o aluno deixa de pensar. */
  porque: string;
  /** A linha que este passo mostra. Vem sempre do bloco que o aluno vê, e
   *  é a mesma coisa que a sondagem prova. */
  bloco: Bloco;
  /** O nome da sondagem que prova este passo. Tem de existir: um passo sem
   *  sondagem é um passo em que o aluno faz e não sabe se acertou. */
  sonda: string;
  momentos: Momento[];
  /** A palavra a nomear. Só pode existir em `fase: nomear`, e é obrigatória
   *  em `fase: nomear`. */
  nomear?: string;
  /** O ficheiro que este passo manda ler. Tem um nome e **nada mais**: as
   *  linhas estão na sonda deste passo, e um segundo sítio seria uma segunda
   *  versão do ficheiro — a que divergiria sem ninguém dar por isso, e a
   *  lição deixaria de ser sobre o ficheiro que o aluno está a ler. */
  referencia?: { nome: string };
}

export interface Licao {
  id: string;
  /** O `Language` do núcleo, e não `string`. Uma `string` aqui é uma porta
   *  aberta: a lição de Go passava a validar como se fosse a de Python, e o
   *  erro só aparecia quando o aluno carregava. */
  linguagem: Language;
  titulo: string;
  porqueTitulo: string;
  /** O vocabulário que esta lição usa. Cada entrada tem de ser um bloco que
   *  a projeção desta linguagem sabe escrever. */
  blocos: Bloco[];
  passos: Passo[];
  sondas: Sonda[];
  /** Como se sabe que a lição foi feita. Não é uma nota, e não é um
   * Baremo: é a frase que o produto mostra quando a pessoa pergunta se
   *  aprendeu. */
  paraSaberQueFez: string;
}
```

- [ ] **Step 5: Escrever `src/conteudo/carregar.ts`**
```typescript
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
```

- [ ] **Step 6: Escrever `src/conteudo/sondas.ts`**
```typescript
import { avaliarTexto, classificar, emitir } from '../projecoes/avaliar';
import type { ClassesObservadas } from '../projecoes/avaliar';
import { obter } from '../projecoes/registo';
import type { Language } from '../nucleo/tipos';
import type { Forma, Sonda } from './esquema';
import { FORMAS, FORMAS_POR_FAMILIA } from './esquema';

export interface ResultadoSonda {
  ok: boolean;
  nome: string;
  esperada: ClassesObservadas;
  observada: ClassesObservadas;
  /** O porque da sondagem, escrito à mão — e, quando a sondagem falha, o que
   *  aconteceu em cima. Vai para o relatório para que o `git diff` de uma
   *  alteração de conteúdo se leia sem abrir o relatório à mão. */
  porque: string;
  /** O que o motor viu, ou porque é que nem se chegou a ver. */
  erro: string | null;
}

function bloco(v: unknown): boolean {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && typeof (v as { type?: unknown }).type === 'string';
}

/** Corre uma sondagem e diz o que o motor viu.
 *
 *  Duas coisas que este função recusa-se a fazer, e as duas importam:
 *
 *  **Não decide o que é um erro de linguagem.** Quem lê o texto é a projeção
 *  da linguagem escolhida, e o texto de outra linguagem é recusado pela
 *  projeção — com a mensagem dela, que é a que sabe o que é a linguagem. Um
 *  runner que dissesse «falhou» esconderia a metade mais importante da
 *  resposta.
 *
 *  **Não rebenta.** Uma sondagem montada à mão, sem passar pelo carregador,
 *  pode ter uma forma que não existe ou um programa que não é um bloco. O
 *  `CARREGAR` recusa essas; aqui elas dão um relatório. Um `throw` aqui
 *  seria um ecrã branco com a lição a meio, e o relatório existe para isso
 *  não acontecer. */
export function executarSonda(sonda: Sonda, linguagem: Language): ResultadoSonda {
  const nome = String(sonda.nome);
  const esperada = sonda.esperado.classe;

  const recusa = (motivo: string, porqueExtra: string): ResultadoSonda => ({
    ok: false,
    nome,
    esperada,
    observada: 'Observacao',
    porque: `${sonda.porque} ${porqueExtra}`,
    erro: `o motor viu que a sondagem está mal: ${motivo}`,
  });

  const forma = sonda.prova.forma as Forma;
  if (!(FORMAS as readonly string[]).includes(forma)) {
    return recusa(`a forma "${String(forma)}" não existe. As formas são: ${FORMAS.join(', ')}.`, '');
  }
  const projecao = obter(linguagem);
  if (forma !== FORMAS_POR_FAMILIA[projecao.familia]) {
    return recusa(
      `a prova está escrita como "${forma}" e esta linguagem é ${projecao.familia}, que se prova com "${FORMAS_POR_FAMILIA[projecao.familia]}".`,
      '',
    );
  }
  const temPrograma = sonda.prova.programa !== undefined;
  const temTexto = sonda.prova.texto !== undefined;
  if (temPrograma === temTexto) {
    return recusa('a prova tem de ter `programa` ou `texto`, nunca os dois e nunca nenhum.', '');
  }

  // O programa vai ser escrito pela projeção antes de ser julgado, e por isso
  // o que o motor vê é **sempre** texto. Não há caminho em que o motor julgue
  // blocos: julga o que a linguagem diz deles, e é isso que o aluno escreve.
  if (temPrograma && !bloco(sonda.prova.programa)) {
    // `pilhaDe` de uma coisa que não é um bloco devolve uma lista vazia, e um
    // programa vazio corre sem erro: sem esta linha, `programa: 5` dava uma
    // sondagem **aprovada**, e o que passava era uma sondagem sem programa.
    return recusa(`o campo "programa" não é um bloco: ${JSON.stringify(sonda.prova.programa) ?? 'vazio'}.`, '');
  }
  let texto: string;
  try {
    texto = temPrograma ? emitir(linguagem, sonda.prova.programa ?? null).texto : String(sonda.prova.texto ?? '');
  } catch (e) {
    return recusa(`o programa da prova não pôde ser escrito: ${(e as Error).message}`, '');
  }

  const erros = avaliarTexto(linguagem, texto);
  const observada = classificar(erros);
  const ok = observada === esperada;
  if (ok) return { ok, nome, esperada, observada, porque: sonda.porque, erro: null };

  const primeiro = erros[0];
  const porqueExtra = primeiro === undefined
    ? 'Não aconteceu nada que se pudesse ver.'
    : `O que aconteceu: ${primeiro.porque} ${primeiro.remedio}`;
  return {
    ok,
    nome,
    esperada,
    observada,
    porque: `${sonda.porque} ${porqueExtra}`,
    erro: `o motor viu ${observada} e a sondagem esperava ${esperada}. ${porqueExtra}`,
  };
}
```

- [ ] **Step 7: Escrever `src/conteudo/index.ts`**
```typescript
/** A porta única do conteúdo.
 *
 *  Tudo o que a interface precisa do conteúdo entra por aqui: a lição que se
 *  está a fazer, as sondagens que a provam, e o registo de que lições existem.
 *  Nenhum ficheiro de `interface/` importa `esquema.ts` ou `sondas.ts`
 *  directamente, e por isso mudar a forma de uma sondagem é mexer num ficheiro
 *  só — e não em seis, cada um com a sua ideia do que era.
 */
export { FORMAS, FORMAS_POR_FAMILIA, FASES, FONTES, FAMILIAS } from './esquema';
export type { Bloco, Esperado, Fase, Forma, Fonte, Licao, Momento, Passo, Prova, Sonda } from './esquema';

export { CARREGAR, ErroDeAutoria, LICSOES, TEXTOS, temLicao } from './carregar';

export { executarSonda } from './sondas';
export type { ResultadoSonda } from './sondas';
```

- [ ] **Step 8: Escrever `src/conteudo/python/variavel.yml` — a lição mais pequena que o formato aceita**

A versão do plano não tinha este passo, e por isso o commit da Task 7 ficava
vermelho de propósito: o passo 8 dizia «espera-se que falhe, porque
`./python/variavel.yml` ainda não existe». Um plano pode dizer isso. Um
executor que faz `git commit` em cada tarefa fica com um commit que não passa
nos testes, e a partir daí «o commit está verde» deixa de ser verdade em
todo o repositório e deixa de valer como prova de nada.

A lição mínima é uma lição a sério e a mais curta possível: um passo de cada
fase, uma sondagem, um bloco de `guardar`. Serve de duas maneiras — faz esta
tarefa verde, e é o exemplo mais curto do formato, que é o que a Task 8 vai
ler antes de escrever a lição a sério por cima.

`src/conteudo/python/variavel.yml`:

```yaml
# A lição «O que é uma variável», em Python.
#
# Este ficheiro é o currículo. Não há painel de administração nem base de
# dados: uma lição é um YAML que se revê num `git diff`, e quem o corrige
# não precisa de escrever código.
#
# Duas regras que o carregador impõe e que valem para todas as lições:
#   - só `esperado.classe` é comparado com o motor
#   - `esperado.porque` é prosa de autoria e nunca é comparada com nada
#
# E uma regra que é desta lição: o `nome` de uma variável vive em
# `fields.nome`, em minúsculas, e o valor vive em `inputs.VALOR`, em
# maiúsculas. Escrever `NOME` não dá erro nenhum — o carregador aceita — e
# escreve `undefined = 5` no ecrã do aluno.

id: variavel
linguagem: python
titulo: O que é uma variável
porqueTitulo: >
  Uma variável é um nome que se dá a um valor para o usar mais tarde. E o
  valor tem um tipo, e é esse tipo — não a variável — que decide o que se
  pode fazer a seguir. Esta lição é sobre essa decisão.

paraSaberQueFez: >
  Consegues ler um ficheiro de Python que nunca viste e dizer, linha a linha,
  o que ela faz e o que a segura quando erra. Se chegaste a ler o `log(total)`
  e a dizer que rebenta quando o código corre — e não antes —, chegaste.

# O vocabulário desta lição: os blocos que o aluno pode arrastar. Cada um
# traz os valores de origem, e o `nome` é um `field` enquanto o valor é um
# `input`. A distinção não é cosmética — trocar os dois escreve `undefined`
# no sítio onde vai o nome.
blocos:
  - type: guardar
    fields:
      nome:
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
              nome:
                valor: total
            inputs:
              VALOR:
                valor:
                  ref: total
  - type: dizer
    inputs:
      VALOR:
        valor:
          ref: total
  - type: log
    inputs:
      VALOR:
        valor:
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
          nome:
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
      O mesmo gesto, com um texto em vez de um número. Repara que o nome não
      muda e a forma não muda: muda o que lá está dentro.
    prova:
      forma: programa
      programa:
        type: guardar
        fields:
          nome:
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
      O ciclo corre três vezes. A linha de baixo é executada três vezes, e é
      por isso que um `for` muda o que um programa faz sem mudar o que está
      escrito.
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
                  nome:
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
      resistir à tentação de dizer que dá.
    prova:
      forma: programa
      texto: "total = 'olá'\n"
    esperado:
      classe: Observacao
      porque: >
        Python não avisa. Aceita o texto e segue em frente, e a culpa vai
        aparecer mais abaixo, na linha que usa o valor como número.

  - nome: o-erro-que-nao-esta-no-lugar

    pergunta: 'O que acontece quando se soma uma palavra a um número?'
    porque: >
      A outra metade da mesma verdade. Guardar o texto foi aceite; usá-lo como
      número é que rebenta — e rebenta agora, a correr.
    prova:
      forma: programa
      texto: |
        total = 'olá'
        total = total + 1
    esperado:
      classe: FalhaRuntime
      porque: >
        O texto chegou a um sítio que precisa de um número, e aí sim falha.
        Repara que a linha que falha é a segunda, e a que está errada é a
        primeira. Esta é a lição de Python em duas linhas: o sintoma não está
        onde está a causa.

  - nome: uma-funcao-que-nao-existe

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
        A função não existe, e o Python não avisa antes de correr. É a mesma
        história da linha anterior, com outro nome: o Python deixa-te escrever
        e cobra-te depois.

  - nome: variavel-que-nunca-foi-guardada

    pergunta: 'O Python adivinha o que querias dizer, ou recusa?'
    porque: >
      Usar um nome que não foi guardado. O Python não adivinha o que querias
      dizer, e esta recusa é a única que é dele — e note-se que acontece
      *antes* de correr, ao contrário de tudo o que viste até agora. Há
      coisas que o Python apanha logo, e há coisas que só apanha tarde.
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
        Lê-se até à linha 12, onde `log` rebenta: essa função não existe, e é a
        única falha deste ficheiro. Depois da linha 12 já não corre nada, e é
        por isso que as linhas 13, 14 e 15 não têm nada a mostrar. O
        `total = 'olá'` da linha 10 foi aceite sem uma pergunta, e a linha 15 é
        onde isso se pagaria — mas nunca lá chega. Nenhuma das duas coisas diz
        onde está a causa.

passos:
  - fase: explicar
    porque: >
      Uma variável é um nome que se dá a um valor. O nome é teu, o valor é o
      que lá está, e o Python não liga os dois. Podes escrever `total` e a
      seguir `nome` e o Python trata os dois da mesma forma.
    bloco:
      type: guardar
      fields:
        nome:
          valor: total
      inputs:
        VALOR:
          valor: 5
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
      inputs:
        CORPO:
          stack:
            - type: guardar
              fields:
                nome:
                  valor: total
              inputs:
                VALOR:
                  valor: 5
            - type: guardar
              fields:
                nome:
                  valor: nome
              inputs:
                VALOR:
                  valor: olá
    sonda: guarda-um-texto
    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos

  - fase: fazer
    porque: >
      Agora o mesmo gesto, três vezes seguidas, dentro de um `for`. O que está
      escrito não muda — muda quantas vezes o Python o executa. É a primeira
      vez que vês um programa fazer algo que não está escrito linha a linha, e
      é por isso que vale a pena parares aqui.
    bloco:
      type: repetir
      inputs:
        PASSOS:
          valor: 3
        CORPO:
          stack:
            - type: guardar
              fields:
                nome:
                  valor: x
              inputs:
                VALOR:
                  valor: 1
    sonda: repete-tres-vezes
    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos

  - fase: explicar
    porque: >
      O que muda entre `total = 5` e `nome = 'olá'` não é o nome nem a forma: é
      o tipo do que está dentro. Um número e um texto são coisas diferentes, e
      a diferença só aparece quando tentas misturá-los.
    bloco:
      type: guardar
      fields:
        nome:
          valor: nome
      inputs:
        VALOR:
          valor: olá
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
      guarda texto — a uma linha de distância de onde o trocaste.
    bloco:
      type: guardar
      fields:
        nome:
          valor: total
      inputs:
        VALOR:
          valor: olá
    sonda: o-erro-que-nao-esta-no-lugar
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
      atribuição. São estas duas palavras que vais ouvir em qualquer linguagem
      onde quer que escrevas, e é por isso que uma delas não precisa de ser
      traduzida: `total = 5` é uma atribuição em todas.
    bloco:
      type: guardar
      fields:
        nome:
          valor: total
      inputs:
        VALOR:
          valor: 5
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
      pronto a correr com o erro lá dentro. A recusa que existe neste produto
      vem do robô e do painel de texto, onde o tipo é declarado à mão — não vem
      do ficheiro. A palavra para a linha que aceita um valor sem dizer nada
      é *atribuição*.
    bloco:
      type: guardar
      fields:
        nome:
          valor: total
      inputs:
        VALOR:
          valor: olá
    sonda: texto-que-nao-e-numero
    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos

  - fase: explicar
    porque: >
      Python não te avisou, e não foi distração: foi escolha. O Python escolheu
      ser fácil de escrever e lento de falhar, e tu acabaste de ver o preço.
      Repara no que este produto faz com essa escolha: o robô e o painel de
      texto **recusam-te o valor antes de o programa existir**. A linguagem não
      te protege; o que está à volta da linguagem protege-te, e é por isso que
      estás a ler esta lição em vez de a adivinhar.
    bloco:
      type: log
      inputs:
        VALOR:
          valor:
            ref: total
    sonda: uma-funcao-que-nao-existe
    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos

  - fase: fazer
    porque: >
      Lê o ficheiro de quinze linhas inteiro. Para cada linha, diz o que ela
      faz. Depois diz onde é que o programa morre, e o que ia acontecer se
      não morresse aí. O ficheiro está no painel; não o executes, lê-lo.
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
        palavras: ['texto', 'string', 'guarda', 'atribui', 'atribuição']
        fonte: leitura
      - id: l4
        texto: 'O que é True aqui?'
        palavras: ['lógico', 'booleano', 'verdade', 'verdadeiro', 'lógica', 'guarda']
        fonte: leitura
      - id: l5
        texto: 'O que faz a linha 5?'
        palavras: ['repete', 'ciclo', 'for', 'vezes', 'voltas', 'três', '3']
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
        palavras: ['texto', 'palavra', 'string', 'total', 'deixa', 'troca', 'sobrescreve']
        fonte: leitura
      - id: l11
        texto: 'O que faz a linha 11?'
        palavras: ['mostra', 'imprime', 'escreve', 'print', 'total']
        fonte: leitura
      - id: l12
        texto: 'O que vai acontecer na linha 12?'
        palavras: ['erro', 'função', 'existe', 'log', 'rebenta', 'falha']
        fonte: leitura
      - id: l13
        texto: 'O que é False aqui?'
        palavras: ['lógico', 'booleano', 'falso', 'lógica', 'guarda', 'muda']
        fonte: leitura
      - id: l14
        texto: 'O que faz a linha 14?'
        palavras: ['mostra', 'imprime', 'escreve', 'print', 'ecrã', 'pronto', 'chega', 'chegar']
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
      inputs:
        VALOR:
          valor:
            ref: total
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
      diferença é a primeira coisa que precisas de levar deste ficheiro, e é a
      razão de a próxima lição ser escrita numa linguagem que recusa.
    bloco:
      type: log
      inputs:
        VALOR:
          valor:
            ref: total
    sonda: o-que-o-ficheiro-diz
    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos
```

- [ ] **Step 9: Correr os testes e ver passar**
Run: `npx vitest run src/conteudo`
Expected: PASS.

- [ ] **Step 10: Commitar o formato, e a lição mínima que o prova**
```bash
git add -A
git commit -m \"feat: o formato da licao em YAML, o carregador, e o runner de sondas

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

#### Task 7 —(decisoes e o que ficou por provar)

Catorze defeitos, e o primeiro é do tipo que muda a forma de executar o plano
todo.

1. **O commit desta tarefa era vermelho de propósito.** O passo 8 dizia
   «espera-se que falhe, porque `./python/variavel.yml` ainda não existe». Um
   plano pode dizer isso. Mas um executor que faz `git commit` em cada tarefa
   fica com um commit que não passa nos testes, e a partir desse momento «o
   commit está verde» deixa de ser verdade no repositório inteiro e deixa de
   valer como prova de nada. Passou a haver uma **lição mínima** nesta tarefa
   — um passo de cada fase, uma sondagem, um `guardar` — que é uma lição a
   sério e a mais curta possível. Faz esta tarefa verde e é o exemplo mais
   curto do formato, que é o que a Task 8 lê antes de escrever por cima.

2. **As recusas de autoria eram dez expressões regulares sobre o ficheiro
   real.** O teste fazia `variavelPython.replace(/momentos:[\s\S]*?(?=\n  - fase:)/)`,
   e isso só chega ao `momentos: []` porque a regex sabe onde fica a próxima
   `- fase:`. Mudar a indentação do YAML partia seis testes que deviam estar a
   testar o carregador. Passaram a **mudar um campo num objeto** e a
   serializar com `dump` — a corrupção é num campo, não num texto, e o teste
   passa a ser sobre a regra do carregador mesmo que o ficheiro real mude de
   forma.

3. **`prova.programa as never` dizia que validava que validava.** `as never`
   cala o compilador e não olha para o dado. Um `programa: 5` passava a
   validação e rebentava mais tarde, dentro da projeção, com um erro que não
   aponta para o YAML nem diz que o problema é uma lição. Saiu um `blocoDe()`
   que olha mesmo: tem de ser um mapa, tem de dizer `type`, e o `type` tem de
   ser do vocabulário da projeção.

4. **A `forma` certa estava escrita duas vezes** — no carregador e no
   runner. Duas tabelas divergem no primeiro caso em que uma delas muda. Vive
   agora em `FORMAS_POR_FAMILIA`, no esquema, que é o contrato. O mesmo
   aconteceu com as classes observadas: o **tipo** estava escrito à mão e a
   **lista** noutro sítio, e a lista é a que se esquece de uma das três sem
   ninguém dar por isso. A lista passou a ser a fonte da verdade e o tipo sai
   dela.

5. **`Licao.linguagem` era `string`.** Uma `string` ali é uma porta aberta: a
   lição de Go validava como se fosse a de Python, e o erro só aparecia
   quando o aluno carregava. É o `Language` do núcleo.

6. **A sondagem do teste não tinha `pergunta`**, que o `Sonda` exige — o
   `tsc` apanhou. E o `@ts-expect-error` estava numa linha que não era a linha
   do erro, que o `tsc` também apanha e a dizer que não. A conversão passou
   para uma função, com a razão escrita.

7. **Um teste esperava `java` em minúsculas** e a projeção escreve `Java`. O
   teste é que estava errado: passou a casar sem distinção.

8. **O `mark.line` do analisador conta a partir do zero** e o plano passava-o
   como estava — o autor lia «linha 1» estando na linha 2. Um erro de autoria
   que aponta para a linha errada é um erro de autoria que se arrasta.

9. **`correcta`/`correctas`** no código do plano: grafia de antes de 1990. A
   lista do guard apanhou-a, e a lista do guard é a razão pela qual a grafia
   do código é a mesma do que o aluno lê.

10. **Os cabeçalhos dos nove passos desta tarefa tinham um `\n` literal no
    fim.** A lista de tarefas usa esses cabeçalhos para rotular cercas, e um
    `\n` no fim muda o que a ferramenta casa. Nove cabeçalhos, em toda a
    tarefa.

**A descoberta que muda a Task 8: um programa de
blocos nunca dá uma `Recusa` de tipo.** Os blocos são tipados — um `guardar`
com um texto escreve `String total = "olá";` em Java, que é Java bem escrito —
e por isso **não há caminho de blocos para uma recusa**. As recusas de uma
lição de Java têm de ser provadas com texto escrito à mão, e é isso que a
diferença entre as duas projeções está a ensinar. A primeira versão do teste
tentava provar o contrário com um programa de blocos, e não havia forma de o
fazer funcionar. Está agora escrito num teste, para a Task 8 o ler e não o
descobrir quando a lição não fechar.

**O que ficou por provar:** a **lição**. O que esta tarefa prova é o formato,
o carregador e o runner; o que se ensina está por escrever e a Task 8 é quem
o escreve. E o que a lição precisa já está dito aqui: uma recusa de tipo
prova-se com texto, não com blocos.

---

### Task 8: A lição de Python — o conteúdo

Esta é a tarefa de que a spec §16.1 fala: **é aqui que se descobre se o formato da sonda estava certo.** Se escrever um passo desta lição levar mais de uma tarde, o formato está errado e pára-se aqui — antes da segunda lição, não antes da sexta. Não se escreve a lição de Java até esta estar verde e o tempo medido.

O ficheiro tem quinze linhas porque o critério de sucesso da spec é o utilizador abrir um ficheiro de quinze linhas que nunca viu e dizer o que cada linha faz. Quinze linhas é o ficheiro, não um exemplo.

**Files:**
- Create: `src/conteudo/python/variavel.yml`
- Test: `src/conteudo/python/variavel.test.ts`

**Interfaces:**
- Consumes: Task 7 — `CARREGAR`, `executarSonda`, `Licao`, `Passo`, `Momento`, `Sonda`; Task 6 — `avaliarTexto`, `classificar`.
- Produces: `src/conteudo/python/variavel.yml` reescrito com a lição a sério — 11 passos, 8 sondas,
  15 perguntas de leitura — e `src/conteudo/python/variavel.test.ts`, que é a **prova** de que o
  formato da sonda aguenta uma lição inteira. A Task 13 transforma essa prova em decisão, contando
  os mesmos números que a medição do passo 5 contou à mão.

- [ ] **Step 1: Escrever o teste que exige as quinze linhas da leitura**

`src/conteudo/python/variavel.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { CARREGAR } from '../carregar';
import { executarSonda } from '../sondas';
import { avaliarTexto, classificar, emitir } from '../../projecoes/avaliar';
import variavelPython from './variavel.yml?raw';

const licao = CARREGAR(variavelPython, 'python');
const porNome = new Map(licao.sondas.map((s) => [s.nome, s]));

describe('o ficheiro de leitura tem quinze linhas', () => {
  it('a lição tem uma sonda de leitura completa', () => {
    expect(porNome.has('o-que-o-ficheiro-diz')).toBe(true);
  });

  it('o texto lido tem quinze linhas', () => {
    expect(porNome.get('o-que-o-ficheiro-diz')!.prova.texto!.trimEnd().split('\n')).toHaveLength(15);
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
    // Cinco linhas, e o teste diz cinco. Um teste que só dissesse «vem
    // depois» passaria se alguém encurtasse o ficheiro para duas linhas, e a
    // lição continuaria a parecer certa no `git log`.
    expect(rebentou - estragou).toBe(5);
    // A linha que rebenta usa `total`, e é por isso que o ficheiro é um bom
    // ficheiro: `total` é um nome, e o nome continua a ser o mesmo depois do
    // valor mudar de lado. Não há nada no meio que diga «a causa foi a linha
    // 10» — quem lê tem de voltar atrás e ver que, aí, `total` deixou de ser
    // um número. A distância é que faz o trabalho.
    expect(linhas[rebentou]).toBe('total = total + preco');
    // E a *segunda* linha `print(total)` — a linha 11, que mostra o valor já
    // estragado — está entre as duas. `indexOf` devolveria a primeira, que é
    // a linha 7 e ainda mostra um número; é `lastIndexOf` que dá a pista.
    const mostraDepois = linhas.lastIndexOf('print(total)');
    expect(mostraDepois).toBeGreaterThan(estragou);
    expect(mostraDepois).toBeLessThan(rebentou);
    // E a primeira está antes de tudo, a mostrar um número a sério.
    expect(linhas.indexOf('print(total)')).toBeLessThan(estragou);
  });

  it('e a primeira linha a rebentar é a função que não existe, não o tipo', () => {
    const erros = avaliarTexto('python', porNome.get('o-que-o-ficheiro-diz')!.prova.texto!);
    // `log` não é uma falha de tipo. É uma função que não escreveste, e o
    // Python só diz isso a correr. A lição tem de não misturar as duas
    // coisas, que é a confusão mais comum de quem está a começar.
    //
    // E o teste afirma **qual** é a primeira, e não só que há uma: um
    // ficheiro cujas duas falhas fossem do mesmo género ensinaria a confusão
    // que a lição diz evitar.
    expect(erros[0]!.porque).toMatch(/log/);
    expect(erros[0]!.porque).toMatch(/não existe/);
    expect(erros[0]!.porque).not.toMatch(/número/);
  });

  it('cada linha do ficheiro é lida sem erro de sintaxe', () => {
    const erros = avaliarTexto('python', porNome.get('o-que-o-ficheiro-diz')!.prova.texto!);
    // O ficheiro é Python legível de ponta a ponta. Uma recusa a mais ou a
    // menos aqui significa que o `ler` mente, e o aluno que o lê leva a
    // lição errada antes de a ler.
    const deLeitura = erros.filter((e) => e.porque.includes('não é Python'));
    expect(deLeitura).toEqual([]);
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
    // isso o limite é de palavras e não de frases — «erro de execução» são
    // duas, e «atribuição» é uma; uma frase inteira aqui seria a vista
    // `explicar` de novo, e o aluno sairia dela sem nome nenhum.
    const nomeadas = licao.passos.filter((p) => p.fase === 'nomear').map((p) => p.nomear!);
    expect(nomeadas).toEqual(['variável', 'atribuição', 'erro de execução']);
    for (const palavra of nomeadas) {
      // Três palavras é uma locução, como «erro de execução». Quatro já
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
    // seriam duas fontes da verdade. Ler a vista `nomear` e ler o `porque`
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
    // Uma pergunta por linha, pela mesma ordem. A pergunta `lN` é a da linha
    // `N`, e é isso que permite dizer «a linha 10» ao aluno e dizer a ele o
    // que é que está a perguntar.
    expect(ficha!.momentos.map((m) => m.id)).toEqual(linhas.map((_, i) => `l${i + 1}`));
  });

  it('as perguntas da ficha aceitam várias palavras, e nenhuma resposta é errada', () => {
    const ficha = licao.passos.find((p) => p.referencia !== undefined)!;
    for (const m of ficha.momentos) {
      expect(m.fonte).toBe('leitura');
      // Três ou mais sinónimos por pergunta. Uma pergunta com uma palavra só
      // é um teste de ortografia disfarçado de pergunta.
      expect(m.palavras.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('nenhuma palavra das perguntas é uma palavra que não responde', () => {
    // As palavras são somadas com «ou»: uma resposta com uma delas conta.
    // Uma palavra que não responde — o «não» de uma pergunta sobre o que vai
    // acontecer, por exemplo — contaria a resposta errada, e a pergunta que
    // o produto faz deixa de ser uma pergunta.
    const ficha = licao.passos.find((p) => p.referencia !== undefined)!;
    const semResposta = new Set(['não', 'nao', 'nunca', 'nada', 'talvez', 'acho', 'sei']);
    for (const m of ficha.momentos) {
      for (const palavra of m.palavras) {
        expect(semResposta.has(palavra.toLowerCase())).toBe(false);
      }
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
    // `palavras: []` significa «não se avalia». Um momento fora da ficha com
    // palavras seria o produto a inventar um certo e um errado onde só há
    // blocos e sintaxe.
    for (const passo of licao.passos) {
      if (passo.referencia) continue;
      for (const m of passo.momentos) {
        expect(m.palavras).toEqual([]);
        expect(m.fonte).toBe('blocos');
      }
    }
  });

  it('toda sonda escrita é ensinada por pelo menos um passo', () => {
    // Uma sonda que nenhum passo usa é conteúdo morto: o teste «todas as
    // sondas passam» dá-lhe verde e o aluno nunca a vê. Este é o teste que
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

  it('diz quando acabou, e não é «acerta todos os exercícios»', () => {
    expect(licao.paraSaberQueFez).not.toMatch(/acerta|acerte|completar todos/i);
    expect(licao.paraSaberQueFez.length).toBeGreaterThan(20);
  });

  it('nenhum texto da lição cita outra linguagem', () => {
    // Uma lição de uma linguagem que só fala de si. Citar a outra é dar ao
    // aluno uma comparação que ele não pode verificar, e é a porta por onde
    // entra a ideia de que a linguagem escolhida é uma das seis em vez de
    // ser a única.
    expect(JSON.stringify(licao)).not.toMatch(/Java|Go\b|TypeScript|SQL|JavaScript/);
  });
});

describe('a lição conta a verdade da tabela de segurança da spec §7', () => {
  it('Python não protege: a lição diz isso, e diz onde a culpa aparece', () => {
    const s = porNome.get('texto-que-nao-e-numero')!;
    expect(s.esperado.classe).toBe('Observacao');
    expect(s.esperado.porque).toMatch(/não avisa|não recusa|aceita/);
  });

  it('e a mesma linha mais adiante já falha, e a sonda diz FalhaRuntime', () => {
    expect(porNome.get('o-erro-que-nao-esta-no-lugar')!.esperado.classe).toBe('FalhaRuntime');
  });

  it('a falha de duas linhas é a do tipo, e só a do tipo', () => {
    // A linha de baixo é `total = total + 1` e não `print(total)`. Com um
    // `print` não há falha nenhuma: mostrar um texto é coisa nenhuma, e a
    // sonda diria que a lição provava a metade errada da verdade.
    //
    // E o `1` em vez de um nome. Com `preco`, a linha falha duas vezes: pelo
    // tipo e por `preco` não existir, e a segunda falha é uma distração que
    // a lição não pode pagar. A lição inteira assenta em a causa estar a uma
    // linha de distância, e uma segunda causa ao lado dessa tirava-lhe o
    // sentido.
    const erros = avaliarTexto('python', porNome.get('o-erro-que-nao-esta-no-lugar')!.prova.texto!);
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toMatch(/guarda texto/);
    expect(erros[0]!.porque).toMatch(/número/);
  });

  it('e a falha está na segunda linha, com a causa na primeira', () => {
    // A lição de Python em duas linhas: o sintoma não está onde está a
    // causa. O teste diz que a distância é uma, e não «maior do que zero».
    const linhas = porNome.get('o-erro-que-nao-esta-no-lugar')!.prova.texto!.trimEnd().split('\n');
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toBe("total = 'olá'");
    expect(linhas[1]).toBe('total = total + 1');
  });

  it('e a lição de Python não tem uma única Recusa — e o teste diz isso', () => {
    // A spec §7 dá a resposta de Python como «não protege, rebenta mais
    // tarde». Uma sonda com `Recusa` seria uma mentira: em Python escrito
    // directamente não há recusa nenhuma. A recusa existe no robô e no painel
    // de texto, que são a Task 11, e não se medem aqui.
    //
    // Este teste existe para ninguém «acrescentar uma sonda de Recusa» para a
    // lição parecer mais completa do que a linguagem é.
    const recusas = licao.sondas.filter((s) => s.esperado.classe === 'Recusa');
    expect(recusas.map((r) => r.nome)).toEqual([]);
  });

  it('e nenhuma sonda da lição promete que o Python recusa', () => {
    for (const s of licao.sondas) {
      expect(s.esperado.porque).not.toMatch(/o Python recusa|Python recusa antes/i);
    }
  });
});

describe('a linha que o aluno lê é a linha que a projeção escreve', () => {
  it('nenhum bloco da lição escreve `undefined` no ecrã do aluno', () => {
    // Prova negativa desta tarefa, e um buraco que só se abre fazendo: trocar
    // `fields.nome` por `fields.NOME` não dá erro de carregador nenhum,
    // porque `campoDe` devolve `undefined` em vez de falhar. Ficavam trinta
    // e seis testes verdes e um aluno a ler `undefined = 5`. O único sítio
    // que apanha o erro é a linha escrita.
    const todos = [
      ...licao.blocos,
      ...licao.passos.map((p) => p.bloco),
      ...licao.sondas.flatMap((s) => (s.prova.programa === undefined ? [] : [s.prova.programa])),
    ];
    for (const b of todos) {
      const escrito = emitir('python', b).texto;
      expect(escrito).not.toMatch(/undefined/);
      expect(escrito).not.toMatch(/\[object Object\]/);
      expect(escrito).not.toMatch(/\bNaN\b/);
      // Uma `pilha` pode ser vazia — a pilha vazia é o ficheiro vazio, e o
      // passo da ficha de leitura começa com o ecrã em branco de propósito.
      // Uma **instrução** não pode: uma linha que não escreve nada é uma
      // linha que o aluno não tem, e o passo sairia como um passo vazio.
      if (b.type !== 'pilha') expect(escrito.trim()).not.toBe('');
    }
  });

  it('e cada `guardar` escreve o nome que a lição escreveu', () => {
    // O teste anterior apanha o nome em falta. Este apanha o nome trocado:
    // o bloco escreve `outro = 5` e a lição diz que é `total`, e nenhuma das
    // sondas dá por isso porque o programa é bem formado nos dois casos.
    for (const b of licao.passos.map((p) => p.bloco)) {
      if (b.type !== 'guardar') continue;
      const nome = (b.fields as Record<string, { valor: unknown }> | undefined)?.nome?.valor;
      expect(nome).toBeTypeOf('string');
      expect(emitir('python', b).texto.trim()).toMatch(new RegExp(`^${String(nome)} = `));
    }
  });
});

describe('todas as sondas passam', () => {
  for (const sonda of licao.sondas) {
    it(`${sonda.nome} passa`, () => {
      const r = executarSonda(sonda, 'python');
      expect({ nome: r.nome, ok: r.ok, erro: r.erro }).toEqual({ nome: sonda.nome, ok: true, erro: null });
    });
  }
});

describe('as sondas que a spec §7 obriga', () => {
  it('cada linha da tabela de segurança tem a sua sonda, e a classe é a da spec', () => {
    // §7: para Python a resposta é «não protege, e rebenta mais tarde». A
    // lição tem de ter as duas metades: a que aceita e a que rebenta.
    expect(classificar(avaliarTexto('python', "total = 'olá'\n"))).toBe('Observacao');
    expect(classificar(avaliarTexto('python', "total = 'olá'\ntotal = total + 1\n"))).toBe('FalhaRuntime');
  });

  it('e a metade que aceita não dá erro nenhum, nem de leitura', () => {
    // A lição inteira assenta nesta linha. Se a projeção passasse a recusá-la,
    // a lição ensinaria o contrário da spec e nenhum teste de sondas
    // repararia: a sonda `texto-que-nao-e-numero` passaria na mesma classe e
    // a lição continuaria a parecer certa.
    const erros = avaliarTexto('python', "total = 'olá'\n");
    expect(erros).toEqual([]);
  });
});
```

**Sobre o `print(total)` no fim do ficheiro:** é a linha que fecha a lição. Depois de `log(total)` rebentar, o `total` é um texto, e `total = total + preco` é texto com número — a mesma falha, outra vez, e desta vez caused por uma linha que está a dez de distância da causa. Sem esta linha o ficheiro ainda lia, mas perdia-se a segunda demonstração.

- [ ] **Step 2: Escrever `src/conteudo/python/variavel.yml`**

```yaml
# A lição «O que é uma variável», em Python.
#
# Este ficheiro é o currículo. Não há painel de administração nem base de
# dados: uma lição é um YAML que se revê num `git diff`, e quem o corrige
# não precisa de escrever código.
#
# Duas regras que o carregador impõe e que valem para todas as lições:
#   - só `esperado.classe` é comparado com o motor
#   - `esperado.porque` é prosa de autoria e nunca é comparada com nada
#
# E uma regra que é desta lição: o `nome` de uma variável vive em
# `fields.nome`, em minúsculas, e o valor vive em `inputs.VALOR`, em
# maiúsculas. Escrever `NOME` não dá erro nenhum — o carregador aceita — e
# escreve `undefined = 5` no ecrã do aluno.

id: variavel
linguagem: python
titulo: O que é uma variável
porqueTitulo: >
  Uma variável é um nome que se dá a um valor para o usar mais tarde. E o
  valor tem um tipo, e é esse tipo — não a variável — que decide o que se
  pode fazer a seguir. Esta lição é sobre essa decisão.

paraSaberQueFez: >
  Consegues ler um ficheiro de Python que nunca viste e dizer, linha a linha,
  o que ela faz e o que a segura quando erra. Se chegaste a ler o `log(total)`
  e a dizer que rebenta quando o código corre — e não antes —, chegaste.

# O vocabulário desta lição: os blocos que o aluno pode arrastar. Cada um
# traz os valores de origem, e o `nome` é um `field` enquanto o valor é um
# `input`. A distinção não é cosmética — trocar os dois escreve `undefined`
# no sítio onde vai o nome.
blocos:
  - type: guardar
    fields:
      nome:
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
              nome:
                valor: total
            inputs:
              VALOR:
                valor:
                  ref: total
  - type: dizer
    inputs:
      VALOR:
        valor:
          ref: total
  - type: log
    inputs:
      VALOR:
        valor:
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
          nome:
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
      O mesmo gesto, com um texto em vez de um número. Repara que o nome não
      muda e a forma não muda: muda o que lá está dentro.
    prova:
      forma: programa
      programa:
        type: guardar
        fields:
          nome:
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
      O ciclo corre três vezes. A linha de baixo é executada três vezes, e é
      por isso que um `for` muda o que um programa faz sem mudar o que está
      escrito.
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
                  nome:
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
      resistir à tentação de dizer que dá.
    prova:
      forma: programa
      texto: "total = 'olá'\n"
    esperado:
      classe: Observacao
      porque: >
        Python não avisa. Aceita o texto e segue em frente, e a culpa vai
        aparecer mais abaixo, na linha que usa o valor como número.

  - nome: o-erro-que-nao-esta-no-lugar

    pergunta: 'O que acontece quando se soma uma palavra a um número?'
    porque: >
      A outra metade da mesma verdade. Guardar o texto foi aceite; usá-lo como
      número é que rebenta — e rebenta agora, a correr.
    prova:
      forma: programa
      texto: |
        total = 'olá'
        total = total + 1
    esperado:
      classe: FalhaRuntime
      porque: >
        O texto chegou a um sítio que precisa de um número, e aí sim falha.
        Repara que a linha que falha é a segunda, e a que está errada é a
        primeira. Esta é a lição de Python em duas linhas: o sintoma não está
        onde está a causa.

  - nome: uma-funcao-que-nao-existe

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
        A função não existe, e o Python não avisa antes de correr. É a mesma
        história da linha anterior, com outro nome: o Python deixa-te escrever
        e cobra-te depois.

  - nome: variavel-que-nunca-foi-guardada

    pergunta: 'O Python adivinha o que querias dizer, ou recusa?'
    porque: >
      Usar um nome que não foi guardado. O Python não adivinha o que querias
      dizer, e esta recusa é a única que é dele — e note-se que acontece
      *antes* de correr, ao contrário de tudo o que viste até agora. Há
      coisas que o Python apanha logo, e há coisas que só apanha tarde.
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
        Lê-se até `log`, que rebenta: é a primeira das duas falhas, e é uma
        falha de função, não de tipo. A segunda vem cinco linhas depois, quando
        o `total` — que deixou de ser número na linha 10 — chega a um sítio
        que precisa de número. Nenhuma das duas diz onde está a causa.

passos:
  - fase: explicar
    porque: >
      Uma variável é um nome que se dá a um valor. O nome é teu, o valor é o
      que lá está, e o Python não liga os dois. Podes escrever `total` e a
      seguir `nome` e o Python trata os dois da mesma forma.
    bloco:
      type: guardar
      fields:
        nome:
          valor: total
      inputs:
        VALOR:
          valor: 5
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
      inputs:
        CORPO:
          stack:
            - type: guardar
              fields:
                nome:
                  valor: total
              inputs:
                VALOR:
                  valor: 5
            - type: guardar
              fields:
                nome:
                  valor: nome
              inputs:
                VALOR:
                  valor: olá
    sonda: guarda-um-texto
    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos

  - fase: fazer
    porque: >
      Agora o mesmo gesto, três vezes seguidas, dentro de um `for`. O que está
      escrito não muda — muda quantas vezes o Python o executa. É a primeira
      vez que vês um programa fazer algo que não está escrito linha a linha, e
      é por isso que vale a pena parares aqui.
    bloco:
      type: repetir
      inputs:
        PASSOS:
          valor: 3
        CORPO:
          stack:
            - type: guardar
              fields:
                nome:
                  valor: x
              inputs:
                VALOR:
                  valor: 1
    sonda: repete-tres-vezes
    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos

  - fase: explicar
    porque: >
      O que muda entre `total = 5` e `nome = 'olá'` não é o nome nem a forma: é
      o tipo do que está dentro. Um número e um texto são coisas diferentes, e
      a diferença só aparece quando tentas misturá-los.
    bloco:
      type: guardar
      fields:
        nome:
          valor: nome
      inputs:
        VALOR:
          valor: olá
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
      guarda texto — a uma linha de distância de onde o trocaste.
    bloco:
      type: guardar
      fields:
        nome:
          valor: total
      inputs:
        VALOR:
          valor: olá
    sonda: o-erro-que-nao-esta-no-lugar
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
      atribuição. São estas duas palavras que vais ouvir em qualquer linguagem
      onde quer que escrevas, e é por isso que uma delas não precisa de ser
      traduzida: `total = 5` é uma atribuição em todas.
    bloco:
      type: guardar
      fields:
        nome:
          valor: total
      inputs:
        VALOR:
          valor: 5
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
      pronto a correr com o erro lá dentro. A recusa que existe neste produto
      vem do robô e do painel de texto, onde o tipo é declarado à mão — não vem
      do ficheiro. A palavra para a linha que aceita um valor sem dizer nada
      é *atribuição*.
    bloco:
      type: guardar
      fields:
        nome:
          valor: total
      inputs:
        VALOR:
          valor: olá
    sonda: texto-que-nao-e-numero
    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos

  - fase: explicar
    porque: >
      Python não te avisou, e não foi distração: foi escolha. O Python escolheu
      ser fácil de escrever e lento de falhar, e tu acabaste de ver o preço.
      Repara no que este produto faz com essa escolha: o robô e o painel de
      texto **recusam-te o valor antes de o programa existir**. A linguagem não
      te protege; o que está à volta da linguagem protege-te, e é por isso que
      estás a ler esta lição em vez de a adivinhar.
    bloco:
      type: log
      inputs:
        VALOR:
          valor:
            ref: total
    sonda: uma-funcao-que-nao-existe
    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos

  - fase: fazer
    porque: >
      Lê o ficheiro de quinze linhas inteiro. Para cada linha, diz o que ela
      faz. Depois diz quais são as duas que rebentam, e qual é a que as
      estragou. O ficheiro está no painel; não o executes, lê-lo.
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
        palavras: ['repete', 'ciclo', 'for', 'vezes', 'voltas', 'três', '3']
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
        palavras: ['erro', 'função', 'existe', 'log', 'rebenta', 'falha']
        fonte: leitura
      - id: l13
        texto: 'O que é False aqui?'
        palavras: ['lógico', 'booleano', 'falso', 'lógica', 'guarda', 'muda']
        fonte: leitura
      - id: l14
        texto: 'O que faz a linha 14?'
        palavras: ['mostra', 'imprime', 'escreve', 'print', 'ecrã', 'pronto', 'chega', 'chegar']
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
      inputs:
        VALOR:
          valor:
            ref: total
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
      diferença é a primeira coisa que precisas de levar deste ficheiro, e é a
      razão de a próxima lição ser escrita numa linguagem que recusa.
    bloco:
      type: log
      inputs:
        VALOR:
          valor:
            ref: total
    sonda: o-que-o-ficheiro-diz
    momentos:
      - id: p
        texto: 'Este passo é um só: faz o que o texto acima te pede.'
        palavras: []
        fonte: blocos
```

- [ ] **Step 3: Correr e ver o que falha, e não corrigir o teste**

Run: `npx vitest run src/conteudo`

A falha mais provável é `uma-funcao-que-nao-existe`: o `log(total)` tem de dar
`FalhaRuntime`, e o `porque` tem de dizer que a função não existe. Se der
`Observacao`, o `ler` está a aceitar `log(...)` e a lição está a ensinar que
uma função inexistente é normal — e isso é a pior coisa que este produto pode
ensinar.

**O ficheiro de leitura vai no plano com catorze linhas e a spec pede
quinze.** A linha que falta é `total = total + preco`, e ela **tem de ser a
última**: põe a soma depois do `log`, que é o que cria a segunda falha longe da
primeira. A versão do plano acrescentava também um `print(total)` a seguir,
e isso era um erro: o `print` depois do `log` nunca corre, e a lição
ensinaria que uma linha depois de uma falha é uma linha que se vê.

- [ ] **Step 4: Passos que a auditoria da lição encontrou, todos no conteúdo e nenhum no motor**

A lição é o primeiro uso a sério do formato, e o formato deu de si em sete
sítios. **Nenhum deles precisou de uma mudança no motor**: todos eram o YAML
a dizer uma coisa e o motor a escrever outra. Registam-se aqui porque a
lição de cada uma das outras cinco linguagens vai tropeçar neles, e porque o
teste que fecha cada um deles é o que impede a lição seguinte de os repetir.

| O que o YAML dizia | O que o aluno ia ver | O teste que fecha |
|---|---|---|
| `fields: { NOME: … }` | `undefined = 5` | nenhum bloco escreve `undefined` |
| `inputs: { VALOR: { ref: total } }` | `print('undefined')` | o mesmo |
| `inputs: { VALOR: { txt: olá } }` | `total = 'undefined'` | o mesmo |
| `bloco: { type: guarda-um-numero }` | recusa do carregador, e a lição não carrega | o carregador recusa e diz quais são |
| sonda `leitura-completa` que não existe | `undefined` no teste, e um teste verde | toda sonda usada por um passo |
| `total = 'olá'` seguido de `print(total)` | nada — e a lição provava a metade errada | a falha de duas linhas é a do tipo, e só a do tipo |
| `caused por uma linha`, `quenourde a causa` | duas palavras que não são palavras | `guard.py` |

As duas primeiras e a terceira são o mesmo defeito: **o carregador aceita uma
ranhura que não sabe ler**, porque `entradaDe` devolve `undefined` em vez de
falhar. Um `guardar` com o nome em `NOME` e um `dizer` com `ref` na ranhura
são válidos para o carregador e produzem uma linha que não é código.

Isto **não** é um defeito do formato: é o formato a ser usado pela primeira
vez, e o teste que o apanha é um teste de conteúdo, não de esquema. O esquema
não pode exigir `fields: nome` — o nome da ranhura é do bloco, e quem escreve
o bloco decide-o. O que a lição tem de garantir é que a linha que o aluno lê
é uma linha, e isso é o primeiro teste desta tarefa.

- [ ] **Step 5: Medir o custo de autoria — o portão da §16.1**

O portão da §16.1 é um portão de **tempo**, e esta tarefa não tem como o
medir: quem executou o plano é um agente, e um agente não tem uma tarde nem
uma hora de relógio. Dizer «demorei menos de uma tarde» aqui seria uma
mentira bem-intencionada, e um portão medido por uma mentira não é um portão.

O que se mede, e o que fica registado:

| O que se conta | Número | O que diz |
|---|---|---|
| Campos do formato que a lição exigiram e não existiam | **1** — `referencia` | o formato mudou uma vez, na primeira lição, e não mais |
| Alterações ao motor para que a lição funcionasse | **0** | o motor já sabia o que a lição queria dizer |
| Defeitos de conteúdo que o formato deixou passar | **7** (tabela acima) | todos de YAML, nenhum de esquema |
| Passos e sondas autorados | **11 passos, 8 sondas** | 19 unidades, e nenhuma obrigou a inventar um campo novo |

**Leitura:** o formato aguentou uma lição inteira sem precisar do motor, e
precisou de um campo novo — o que a §16.1 manda que isto aconteça **na** primeira
lição e não na sexta. O portão **passa**, e passa pela razão certa: a regra
dizia «paramos e reescrevemos o formato antes de escrever a segunda lição, não
a sexta», e foi exatamente isso que aconteceu.

**O que falsifica o portão, e é o que a lição de Java tem de medir:** a
segunda lição precisar de um campo novo, ou os mesmos sete defeitos de
conteúdo aparecerem outra vez. Nenhum dos dois é aceitável, e os dois são
contáveis. A Task 13 transforma esta tabela em `portao.test.ts`, para que a
resposta deixe de ser uma lembrança e passe a ser uma falha do CI.

- [ ] **Step 6: Commitar a lição**

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

#### Task 8 — decisoes e o que ficou por provar

A lição é a primeira coisa escrita por inteiro, e o formato deu de si em sete
sítios. **Nenhum deles pediu uma mudança no motor**: todos eram o YAML a
dizer uma coisa e o motor a escrever outra. Isso é a boa notícia do formato e
a má notícia do plano, que os tinha escritos todos.

**O plano usava um campo que o esquema da T7 não tinha.** Os testes da T8, o
YAML da T8 e o `estado.ts` da T10 usam `passo.referencia`, e o `Passo` que a
T7 escreveu não o declarava. O plano era contraditório entre três tarefas e
só a T8 o mostrou. Saiu em `esquema.ts` — e voltou ao bloco da T7, porque o
esquema é o contrato e o contrato não se divide por tarefas. O carregador
passou a conferir que a referência tem um `nome` e **nada mais**: a regra do
ficheiro num sítio só estava num teste, e uma regra que só um teste conhece é
uma regra que a próxima tarefa não vai ter.

**Três ranhuras que o carregador aceita e o motor não sabe ler.** São o mesmo
defeito, e nenhuma delas tinha teste:

| No YAML | No ecrã do aluno |
|---|---|
| `fields: { NOME: … }` | `undefined = 5` |
| `inputs: { VALOR: { ref: total } }` | `print('undefined')` |
| `inputs: { VALOR: { txt: olá } }` | `total = 'undefined'` |

O `nome` é um `field` e chama-se `nome`; um `ref` é o **valor** de uma
ranhura (`VALOR: { valor: { ref: total } }`); um texto é um valor como outro
qualquer (`valor: olá`) e é o emissor que lhe põe aspas.

Isto revelou o buraco mais caro da tarefa, e vale a pena escrevê-lo como
regra: **trocar `nome` por `NOME` na lição deixava os trinta e seis testes
verdes.** Medi-o — a lição com `NOME` em todo o lado passa tudo, e o aluno
 lia `undefined = 5`. Nenhum teste do plano via a linha que o aluno lê; viam
o carregador a aceitar, que é outra coisa. Saiu um teste que emite todos os
blocos da lição e proíbe `undefined`, `[object Object]` e `NaN`, e ele apanhou
as outras duas ranhuras no minuto seguinte. **Um teste que só prova que um
dado é aceite não prova nada sobre o que esse dado escreve.**

**A sonda de duas linhas não podia funcionar.** `total = 'olá'` seguido de
`print(total)` dá `Observacao` — verifiquei no motor antes de mexer em nada.
Um `print` aceita um texto, e a lição estava a provar metade da verdade que
diz ser a lição. Passou a `total = total + 1`, que dá **exatamente um** erro:
com `preco` daria dois (o do tipo e o de `preco` não existir), e uma
segunda causa ao lado da primeira tirava à lição o único sentido que ela tem.
O teste afirma o número de erros, não só a classe — porque uma classe certa
não diz se havia mais alguma coisa a correr ao lado.

**Uma sonda que não existia.** O teste pedia `leitura-completa` em três
sítios e o YAML chama à sonda `o-que-o-ficheiro-diz`. Com o `!` do `Map.get`,
o `undefined` só apareceria a meio da expressão, e o plano chamava-lhe
`leitura-completa` como se fosse uma lição separada. Unificado no nome do
YAML.

**Dois nomes de sonda que mentiam.** `a-divisao-que-nao-existe` era uma
soma, e `a-divisao-por-uma-funcao-que-nao-existe` era uma função que não
existe. O primeiro passou a chamar-se `o-erro-que-nao-esta-no-lugar`, que é a
lição; o segundo, `uma-funcao-que-nao-existe`.

**`bloco: { type: guarda-um-numero }`** — `guarda-um-numero` é o nome de uma
sonda, não o de um bloco. A lição não carregava. E cada passo passou a trazer
a linha que diz mostrar, porque dois `explicar` com o mesmo bloco eram o
mesmo passo duas vezes.

**Uma palavra que não responde.** As `palavras` de uma pergunta de leitura
somam-se com «ou». A `l12` tinha `não` na lista, e a `l14` tinha `nunca`:
uma resposta com «não» contava como resposta a «o que vai acontecer na linha
12?». Saiu um teste com a lista do que não responde.

**Duas palavras que não são palavras**, na prosa do próprio plano:
`caused por uma linha` e `quenourde a causa`. E `Resistir` com maiúscula a
meio de uma frase.

**O passo 3 do plano mandava acrescentar duas linhas ao ficheiro de leitura.**
Daria dezasseis linhas, e o `print(total)` que ele mandava acrescentar está
depois do `log` que rebenta — ou seja, nunca corre. A lição ensinaria que uma
linha depois de uma falha é uma linha que se vê, que é o contrário do que ela
ensina. Passou a dizer que a linha que falta é a soma, e que vai no fim.

**O vocabulário só se conferia por fora.** Um `enquanto` dentro de uma `pilha`
passava a validação, e a projeção escrevia um comentário a dizer que o bloco
ainda não existe. O `blocoDe` passou a descer. É a lição da T7 — o
`programa as never` — um nível mais abaixo, e a prova de que a lição da T7
era mesmo uma lição e não uma nota de rodapé.

**Testes que estavam errados: três.** Dois do plano (a linha `print(total)` e
o nome `leitura-completa`) e um meu (proibi uma `pilha` vazia, e uma `pilha`
vazia é legitimamente o ficheiro vazio). O meu apareceu porque o teste dizia
«nenhum bloco escreve nada» quando queria dizer «nenhuma **instrução** escreve
nada» — e a diferença entre as duas frases é o passo da ficha de leitura, que
começa com o ecrã em branco de propósito.

**O portão da §16.1 é um portão de tempo, e esta tarefa não tem como o
medir.** Quem executou o plano é um agente, e um agente não tem uma tarde nem
uma hora de relógio. Dizer «demorei menos de uma tarde» seria uma mentira
bem-intencionada, e um portão medido por uma mentira não é um portão. O que
se mediu, e que é contável: **um** campo novo que o formato precisou
(`referencia`), **zero** alterações ao motor, **sete** defeitos de conteúdo
que o formato deixou passar, e **dezanove** unidades autoradas sem inventar um
segundo campo. O portão **passa**, e passa pela razão que a §16.1 dá: ela manda
parar e reescrever o formato **antes da segunda lição, não da sexta**, e foi
isso que aconteceu. O que falsificaria o portão está escrito no plano: a
segunda lição precisar de um campo novo, ou os mesmos sete defeitos aparecerem
outra vez. A T13 transforma a tabela em `portao.test.ts` para que a resposta
deixe de ser uma lembrança.

**Instrumento: `conferir-plano.py` aprendeu uma regra.** Um ficheiro pode ser
escrito por duas tarefas — `main.tsx` pela T1 e pela T12, `variavel.yml` pela
T7 e pela T8 — e a cerca da tarefa anterior guarda a versão que existia
quando essa tarefa foi feita. Comparar essa versão com o ficheiro de hoje é
comparar uma fotografia com a pessoa. Agora só a cerca da **última** tarefa é
comparada, o relatório diz quantas foram saltadas, e a regra está provada dos
dois lados: uma divergência na última tarefa continua a ser apanhada, e uma
divergência num ficheiro de uma só tarefa também.

---

### Task 9: Os blocos no Blockly

**Files:**
- Create: `src/ui/blocos.tsx`, `src/ui/painel-blocos.tsx`
- Test: `src/ui/blocos.test.tsx`
- Modify: `src/nucleo/blocos.ts` (Task 2) — o bloco `variavel` e a tabela de cores

**Interfaces:**
- Consumes: Task 2 — `BlocoLeigo`, `CampoLeigo`, `EntradaLeiga`, `corpoDe`, `BLOCOS`, `CORES`; Task 6 — `obter`; Task 7 — `CARREGAR`.
- Produz: `paraBlocoLeigo(estado: unknown): BlocoLeigo | null`, `deBlocoLeigo(programa: BlocoLeigo | null): BlocoJson[]`, `registarBlocos(linguagem: Language): string[]`, `criarToolbox(linguagem: Language): Caixa`, `caixaComoOBlockly(caixa: Caixa)`, `BlocosProps`, `Blocos`.
- Produces: `Blocos` — o componente que o `main.tsx` da Task 12 desenha. O resto desta tarefa é usado dentro dela e pelos seus testes, e por isso não entra aqui: um `Produces` que lista o que mais ninguém usa é uma promessa que nada cumpre.

**Nota da execução.** O plano desta tarefa, como estava escrito, tinha nove defeitos e nenhum deles dava um teste vermelho. Vale a pena contá-los, porque todos são da mesma família — **um tradutor testado contra a forma que o tradutor inventou**:

- O `emitir` devolve `Gerado { texto, anotacoes }` e não um objeto com uma chave por linguagem. Os três testes diziam `emitir(...).python`.
- O estado do Blockly é `{ blocks: { languageVersion, blocks: [...] } }` — embrulhado. O plano lia `{ blocks: [...] }`, que dá `undefined`, que dá `null`, que dá **um produto que nunca lê um programa e uma suite toda verde**.
- Os campos do Blockly são valores crus — `{ "nome": "total" }` — e não `{ "nome": { "valor": "total" } }`. O plano lia a segunda forma, que é a do YAML da lição, e escrevia `undefined = 5` para o aluno.
- As instruções ligam-se por `next.block`, e nunca por `inputs[chave].stack`, que o plano lia. Um `repetir` com três linhas no corpo savingava uma.
- O JSON do Blockly **não diz** se uma ranhura leva um valor ou uma pilha. A primeira versão tratava as duas do mesmo jeito, e o `dador_num` ligado ao `VALOR` do `guardar` entrava como pilha: `total = 'undefined'`, a lição inteira sem o número que ela ensina.
- O `texto` do plano era uma caixa com outra caixa dentro, e o `valorDe` devolvia uma string vazia para ele. O texto da pessoa ia para o lixo e o programa dizia `print('')`.
- A regra «se tem um campo `NOME`, é uma referência a uma variável» é falsa: o bloco do ator do robô também tem um campo `NOME`, e arrastar um ator para um `dizer` escrevia `print(coelho)`. Passou a ser «é do tipo `variavel`», e o bloco `variavel` é o que a torna verdadeira.
- O `Blocos` saltava a primeira aplicação do programa com um `primeira` de `ref`, e a lição abria sempre em branco.
- O `aoMudar` estava no array de dependências do efeito, e cada estado novo — que acontece a cada passo — recriava o ecrã e apagava o programa a meio.

E duas coisas que o `tsc` apanhou e o `vitest` nunca apanharia: o Blockly 13 **tirou `Block.appendField`** (só `Input.appendField` existe), e `serialization.blocks.load` **não existe** — o que existe é `serialization.blocks.append`.

Duas conclusões que ficaram escritas no ficheiro, e que valem para as próximas tarefas:

1. **Os testes desta tarefa montam um ecrã do Blockly a sério** e passam ao tradutor a saída que a biblioteca deu. Um teste que alimenta o tradutor com a forma que o tradutor espera não prova que o tradutor funciona — prova que o tradutor é consistente consigo próprio.
2. **A caixa de ferramentas sai da projeção.** O plano afirmava que a fatia do SQL não tinha de voltar a este ficheiro, e não era verdade: a caixa tinha sete categorias escritas à mão. Agora `criarToolbox(linguagem)` oferece o que `obter(linguagem).blocos` declara, e `registarBlocos` devolve os ids que registou para o teste poder compará-los. Se a projeção declarar um bloco que aqui não existe, o registo **diz qual é** em vez de devolver uma lista a menos.

- [ ] **Step 1: As formas do Blockly, e onde cada uma delas se enganava**

O ficheiro abre com as quatro formas verdadeiras, tiradas da biblioteca, porque três das que o plano escrevia estavam erradas de uma maneira que não dá erro nenhum: devolvem `undefined` ou `null` em silêncio. E uma delas — a que diz que uma ranhura leva um valor ou leva instruções — não está no JSON: está na definição do bloco. Por isso a tabela das ranhuras de instruções é **medida** no registo, num bloco de cabeça sem ecrã, e não escrita à mão. Uma tabela escrita à mão é uma segunda verdade sobre os mesmos blocos, e uma segunda verdade desatualiza-se em silêncio.

`src/ui/blocos.tsx`:
```typescript
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
```

- [ ] **Step 2: A área de blocos, com a lição a chegar ao ecrã**

O `aoMudar` vive num `ref` e não no array de dependências, o programa guardado é aplicado também na montagem, e a conversão da caixa para o tipo do Blockly está escrita **uma vez** e com o motivo ao lado — para que o `as unknown as` não apareça espalhado e para que ele não seja um `as never`, que é uma maneira de pedir ao compilador que não veja o problema.

`src/ui/painel-blocos.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import * as Blockly from 'blockly';
import type { BlocoLeigo } from '../nucleo/avaliador';
import type { Language } from '../nucleo/tipos';
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

    const injetado = Blockly.inject(elemento, { toolbox: caixaComoOBlockly(criarToolbox(linguagem)) });
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
```

- [ ] **Step 3: Os testes, montados contra um ecrã a sério**

São vinte e três. Doze leem o que o Blockly deu; três provam que a ida e a volta não mudam o programa; três são o vocabulário; cinco são a área de blocos. E dois destes são o que liga esta tarefa à anterior:

- **a lição inteira** passa por um ecrã do Blockly a sério e tem de voltar igual. A lição escreve programas em `BlocoLeigo`, o ecrã lê e escreve a forma do Blockly, e nada os obriga a concordar. O que se perde no caminho é *visível*: um `{ref: 'total'}` que vira `'[object Object]'` dá um programa que corre e dá o resultado errado, que é a pior das maneiras de falhar.
- **a prova negativa** — nenhum bloco da lição escreve `undefined` depois da volta. É o teste que a Task 8 provou ser o único que apanha uma chave trocada: trinta e seis testes verdes e um aluno a ler `undefined = 5`.

`src/ui/blocos.test.tsx`:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as Blockly from 'blockly';
import { Blocos } from './painel-blocos';
import { caixaComoOBlockly, criarToolbox, deBlocoLeigo, paraBlocoLeigo, registarBlocos } from './blocos';
import type { BlocoLeigo } from '../nucleo/avaliador';
import { avaliador } from '../nucleo/avaliador';
import { corpoDe } from '../nucleo/blocos';
import { emitir } from '../projecoes/avaliar';
import { obter } from '../projecoes/registo';
import { CARREGAR } from '../conteudo/carregar';
import variavelPython from '../conteudo/python/variavel.yml?raw';

/** O tecto de tempo deste ficheiro, escrito à mão e posto em todos os testes.
 *
 *  Montar o ecrã é montar o Blockly, e o Blockly não é rápido: regista
 *  blocos, mede um SVG que o jsdom não sabe medir, e monta a ferramenta.
 *  Sozinho este ficheiro corre em menos de dois segundos por teste; a correr
 *  ao lado dos outros, que é como o `npm test` o corre, passa dos cinco e o
 *  teste morre de tempo esgotado sem que nada esteja errado. Já aconteceu
 *  três vezes em três voltas, em três testes diferentes, e num commit que
 * eria verde.
 *
 *  O tecto escreve-se à mão em vez de se subir o global, porque subir o
 *  global é dizer que todos os testes são lentos quando estes são lentos por
 *  uma razão que só estes têm. E vai em **todos** os testes do ficheiro, e
 *  não numa lista dos lentos: essa lista seria uma segunda fonte de verdade
 *  que divergiria no primeiro teste novo, e o teste novo morreria de tempo
 *  esgotado sem ninguém saber porquê. */
const PASSO_A_PASSO = 20_000;


// ---------------------------------------------------------------------------
// O cenário
// ---------------------------------------------------------------------------
//
// Estes testes não escrevem blocos à mão. Montam um ecrã do Blockly a sério,
// ligam as peças como uma pessoa liga, e passam ao tradutor **a saída que o
// Blockly deu**.
//
// A primeira versão desta suite fazia o contrário: escrevia objetos com a
// forma que o tradutor esperava, e o tradutor passou tudo. A forma que o
// tradutor esperava e a forma que o Blockly dá diferem em três pontos —
// `workspaces.save` embrulha o estado, `fields` guarda o valor cru e as
// instruções ligam-se por `next` — e cada um deles dava `undefined` ou `null`
// em silêncio. O produto ficava morto, a suite toda verde, e nenhum teste
// vermelho em lado nenhum. A regra daqui é simples e não se negocia: **um
// teste que alimenta o tradutor com a forma que o tradutor inventou não
// prova que o tradutor funciona.**

interface Cenario {
  estado: unknown;
  espaco: Blockly.WorkspaceSvg;
  libertar: () => void;
}

let ecras: HTMLElement[] = [];

function ecra(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  ecras.push(el);
  return el;
}

/** Um ecrã novo, com a caixa de ferramentas de Python a sério. */
function ecrã(): Blockly.WorkspaceSvg {
  return Blockly.inject(ecra(), { toolbox: caixaComoOBlockly(criarToolbox('python')) });
}

/** O ecrã que o componente acabou de montar.
 *
 *  `getMainWorkspace` é tipado a devolver `Workspace`, que é a superclasse e
 *  não tem `fire` nem os blocos com desenho — e o que o teste precisa é
 *  exatamente isso. A conversão está aqui, com o nome, e não espalhada. */
function ecraPrincipal(): Blockly.WorkspaceSvg {
  const ws = Blockly.getMainWorkspace();
  if (ws === null) throw new Error('não há ecrã nenhum');
  return ws as Blockly.WorkspaceSvg;
}

function cenario(construir: (ws: Blockly.WorkspaceSvg) => void): Cenario {
  const ws = ecrã();
  registarBlocos('python');
  construir(ws);
  return { estado: Blockly.serialization.workspaces.save(ws), espaco: ws, libertar: () => ws.dispose() };
}

/** Um bloco de valor: `dador_num`, `texto` ou `variavel`. */
function valor(ws: Blockly.WorkspaceSvg, tipo: string, campo: string, dado: string | number): Blockly.BlockSvg {
  const b = ws.newBlock(tipo) as Blockly.BlockSvg;
  b.setFieldValue(dado, campo);
  b.initSvg();
  b.render();
  return b;
}

/** Um bloco de instrução, desenhado e pronto a ligar. */
function instrucao(ws: Blockly.WorkspaceSvg, tipo: string): Blockly.BlockSvg {
  const b = ws.newBlock(tipo) as Blockly.BlockSvg;
  b.initSvg();
  b.render();
  return b;
}

/** Liga um bloco de valor a uma ranhura. */
function ligar(pai: Blockly.BlockSvg, ranhura: string, filho: Blockly.BlockSvg): void {
  pai.getInput(ranhura)!.connection!.connect(filho.outputConnection!);
}

/** Liga duas instruções, uma abaixo da outra. */
function encadear(acima: Blockly.BlockSvg, abaixo: Blockly.BlockSvg): void {
  acima.nextConnection!.connect(abaixo.previousConnection!);
}

afterEach(() => {
  for (const el of ecras) el.remove();
  ecras = [];
});

describe('paraBlocoLeigo lê o que o Blockly dá', () => {
  it('uma área vazia não é programa nenhum', () => {
    const c = cenario(() => {});
    try {
      expect(paraBlocoLeigo(c.estado)).toBeNull();
      expect(paraBlocoLeigo(null)).toBeNull();
      expect(paraBlocoLeigo({})).toBeNull();
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('lê o nome de um guardar do campo, e não do sítio errado', () => {
    // O `fields` do Blockly guarda o **valor cru** — `{"nome": "total"}` — e
    // não `{"nome": {"valor": "total"}}`. A primeira versão do tradutor lia a
    // segunda, que é a forma que a lição em YAML usa, e escrevia
    // `undefined = 5` para o aluno. A forma do YAML é a forma do motor; a
    // forma do ecrã é a do Blockly, e o tradutor tem de estar nas duas.
    const c = cenario((ws) => {
      const g = instrucao(ws, 'guardar');
      g.setFieldValue('total', 'nome');
      ligar(g, 'VALOR', valor(ws, 'dador_num', 'VALOR', 5));
    });
    try {
      expect(emitir('python', paraBlocoLeigo(c.estado)).texto).toBe('total = 5\n');
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('lê o texto que a pessoa escreveu, e não uma string vazia', () => {
    // O bloco `texto` do plano era uma caixa com outra caixa dentro, e o
    // `valorDe` devolvia `{ txt: '' }` para ele. O texto da pessoa ia para o
    // lixo e o programa dizia `print('')`.
    const c = cenario((ws) => {
      const d = instrucao(ws, 'dizer');
      ligar(d, 'VALOR', valor(ws, 'texto', 'VALOR', 'olá'));
    });
    try {
      expect(emitir('python', paraBlocoLeigo(c.estado)).texto).toBe("print('olá')\n");
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('lê uma referência a uma variável, e só do bloco que a é', () => {
    // A regra antiga era «se tem um campo `NOME`, é uma referência». O bloco
    // do ator do robô também tem um campo `NOME` — o nome do ator — e com
    // essa regra arrastar um ator para dentro de um `dizer` escrevia
    // `print(coelho)`: uma variável que ninguém guardou, e um erro que aponta
    // para o sítio errado. A regra certa é «é do tipo `variavel`».
    const c = cenario((ws) => {
      const g = instrucao(ws, 'guardar');
      g.setFieldValue('total', 'nome');
      ligar(g, 'VALOR', valor(ws, 'dador_num', 'VALOR', 5));
      const l = instrucao(ws, 'log');
      ligar(l, 'VALOR', valor(ws, 'variavel', 'NOME', 'total'));
      encadear(g, l);
    });
    try {
      expect(emitir('python', paraBlocoLeigo(c.estado)).texto).toBe('total = 5\nlog(total)\n');
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('uma referência sem nome não é uma referência', () => {
    // Arrastar o bloco `variavel` sem escrever o nome dá um campo vazio, e um
    // campo vazio tem de dar um bloco normal — nunca `ref: ''`, que geraria
    // `log()` e um erro de sintaxe que aponta para o nome em vez de apontar
    // para o nome em falta.
    const c = cenario((ws) => {
      const l = instrucao(ws, 'log');
      const v = valor(ws, 'variavel', 'NOME', '');
      ligar(l, 'VALOR', v);
    });
    try {
      const b = paraBlocoLeigo(c.estado)!;
      const v = (b.inputs!.VALOR as { valor?: { ref?: string } }).valor;
      expect(v?.ref).toBeUndefined();
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('agrupa vários blocos de topo numa pilha', () => {
    const c = cenario((ws) => {
      instrucao(ws, 'dizer');
      instrucao(ws, 'log');
    });
    try {
      expect(paraBlocoLeigo(c.estado)!.type).toBe('pilha');
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('lê a cadeia de instruções, que o Blockly guarda em `next`', () => {
    // Duas instruções ligadas. A primeira versão do tradutor lia
    // `inputs[chave].stack`, que o Blockly nunca escreve: um `repetir` com
    // três linhas no corpo savingava uma, e o aluno executava um programa
    // que não era o que tinha montado.
    const c = cenario((ws) => {
      const r = instrucao(ws, 'repetir');
      ligar(r, 'PASSOS', valor(ws, 'dador_num', 'VALOR', 2));
      const d = instrucao(ws, 'dizer');
      const l = instrucao(ws, 'log');
      r.getInput('CORPO')!.connection!.connect(d.previousConnection!);
      encadear(d, l);
      ligar(d, 'VALOR', valor(ws, 'variavel', 'NOME', 'a'));
      ligar(l, 'VALOR', valor(ws, 'variavel', 'NOME', 'b'));
    });
    try {
      const esperado = 'for _ in range(2):\n    print(a)\n    log(b)\n';
      expect(emitir('python', paraBlocoLeigo(c.estado)).texto).toBe(esperado);
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('o que sai do ecrã corre no motor sem um erro sequer', () => {
    const c = cenario((ws) => {
      const g = instrucao(ws, 'guardar');
      g.setFieldValue('total', 'nome');
      ligar(g, 'VALOR', valor(ws, 'dador_num', 'VALOR', 7));
      const r = instrucao(ws, 'repetir');
      ligar(r, 'PASSOS', valor(ws, 'dador_num', 'VALOR', 3));
      r.getInput('CORPO')!.connection!.connect(g.previousConnection!);
    });
    try {
      const a = avaliador();
      a.executar(paraBlocoLeigo(c.estado));
      expect(a.trace.erros).toEqual([]);
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('um bloco que o Blockly não conhece passa em vez de rebentar', () => {
    // Um bloco do futuro é um bloco que esta tarefa ainda não conhece, e a
    // resposta é levá-lo ao motor e deixar o motor decidir o que fazer com ele
    // — não é falhar e levar o programa inteiro abaixo.
    Blockly.Blocks['bloco_do_futuro'] = { init() {} };
    const c = cenario((ws) => {
      const d = instrucao(ws, 'dizer');
      ligar(d, 'VALOR', instrucao(ws, 'bloco_do_futuro') as Blockly.BlockSvg);
    });
    try {
      const b = paraBlocoLeigo(c.estado);
      expect(b).not.toBeNull();
      expect(emitir('python', b).texto).toContain('bloco do v2');
    } finally {
      delete Blockly.Blocks['bloco_do_futuro'];
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('aceita as duas formas de estado, porque um `null` calado é um produto morto', () => {
    // `workspaces.save` embrulha o estado; um estado escrito à mão não. A
    // primeira versão lia só a forma escrita à mão, que é a que ela própria
    // escrevia nos testes, e devolvia `null` para tudo o que o Blockly
    // produz. Ler as duas é o que impede que a forma do teste e a forma da
    // biblioteca voltem a divergir em silêncio.
    const lista = [{ type: 'log', fields: {}, inputs: {} }];
    expect(paraBlocoLeigo({ blocks: lista })).not.toBeNull();
    expect(paraBlocoLeigo({ blocks: { languageVersion: 0, blocks: lista } })).not.toBeNull();
  }, PASSO_A_PASSO);
});

describe('deBlocoLeigo é o caminho inverso, e os dois caminhos fecham', () => {
  it('o programa do motor volta a ser o programa do motor', () => {
    const programa: BlocoLeigo = {
      type: 'pilha',
      inputs: {
        CORPO: {
          stack: [
            { type: 'guardar', fields: { nome: { valor: 'total' } }, inputs: { VALOR: { valor: 5 } } },
            {
              type: 'repetir',
              inputs: {
                PASSOS: { valor: 3 },
                CORPO: {
                  stack: [
                    { type: 'dizer', inputs: { VALOR: { valor: { ref: 'total' } } } },
                    { type: 'log', inputs: { VALOR: { valor: 'fim' } } },
                  ],
                },
              },
            },
          ],
        },
      },
    };
    const estado = { blocks: { languageVersion: 0, blocks: deBlocoLeigo(programa) } };
    expect(paraBlocoLeigo(estado)).toEqual(programa);
  }, PASSO_A_PASSO);

  it('e o programa que sai de ecrã e volta a dar o mesmo texto', () => {
    // Esta é a prova que vale: a ida e a volta não podem mudar o programa. Um
    // teste que verifica cada sentido em separado passa com um tradutor que
    // perde o corpo de um `repetir` na ida e o inventa na volta.
    const c = cenario((ws) => {
      const g = instrucao(ws, 'guardar');
      g.setFieldValue('total', 'nome');
      ligar(g, 'VALOR', valor(ws, 'dador_num', 'VALOR', 5));
      const r = instrucao(ws, 'repetir');
      ligar(r, 'PASSOS', valor(ws, 'dador_num', 'VALOR', 2));
      const d = instrucao(ws, 'dizer');
      const l = instrucao(ws, 'log');
      r.getInput('CORPO')!.connection!.connect(d.previousConnection!);
      encadear(d, l);
      ligar(d, 'VALOR', valor(ws, 'texto', 'VALOR', 'olá'));
      ligar(l, 'VALOR', valor(ws, 'variavel', 'NOME', 'total'));
      encadear(g, r);
    });
    try {
      const lido = paraBlocoLeigo(c.estado);
      const volta = paraBlocoLeigo({ blocks: { languageVersion: 0, blocks: deBlocoLeigo(lido) } });
      expect(volta).toEqual(lido);
      expect(emitir('python', volta).texto).toBe(emitir('python', lido).texto);
    } finally {
      c.libertar();
    }
  }, PASSO_A_PASSO);

  it('uma pilha volta a ser vários blocos de topo, e não um bloco `pilha`', () => {
    // Uma `pilha` não é um bloco do Blockly: são vários blocos de topo. Se o
    // caminho inverso a escrevesse como um bloco, o ecrã do aluno mostrava um
    // bloco que não existe e o programa desaparecia.
    const saida = deBlocoLeigo({
      type: 'pilha',
      inputs: { CORPO: { stack: [{ type: 'log', fields: {}, inputs: {} }] } },
    });
    expect(saida).toHaveLength(1);
    expect(saida[0]!.type).toBe('log');
    expect(deBlocoLeigo(null)).toEqual([]);
  }, PASSO_A_PASSO);

  it('o que o Bloco não consegue levar, fica fora, e não vira um bloco inventado', () => {
    // Um valor sem forma conhecida — um booleano, antes de a Task 11 registar
    // o bloco `logico` — não vira bloco nenhum. Deixar a ranhura vazia é a
    // única resposta honesta: um bloco inventado apareceria no ecrã do aluno
    // como uma coisa que ele não colocou. E «vazio» é **visível**.
    const saida = deBlocoLeigo({ type: 'log', fields: {}, inputs: { VALOR: { valor: true } } });
    expect(saida[0]!.inputs?.VALOR).toBeUndefined();
  }, PASSO_A_PASSO);
});

describe('o vocabulário vem da projeção, e não de uma lista neste ficheiro', () => {
  it('o registo devolve exatamente os blocos que a projeção declara', () => {
    // É este teste que diz que a fatia do SQL não tem de voltar a este
    // ficheiro: `obter('sql').blocos` é outra lista, e o que o ecrã oferece
    // segue a lista.
    expect(registarBlocos('python')).toEqual(obter('python').blocos);
    expect(registarBlocos('java')).toEqual(obter('java').blocos);
  }, PASSO_A_PASSO);

  it('a caixa de ferramentas oferece a linguagem escolhida, e nada mais', () => {
    const caixa = criarToolbox('python');
    const instr = caixa.contents.find((c) => c.name === 'Instruções')!;
    expect(instr.contents.map((b) => b.type)).toEqual(obter('python').blocos);
    // Os blocos de valor são de todas as linguagens, e por isso não estão em
    // `obter('python').blocos`. Uma categoria que os repetisse seria o mesmo
    // bloco duas vezes no ecrã.
    const valores = caixa.contents.find((c) => c.name === 'Números e texto')!;
    expect(valores.contents.map((b) => b.type)).toEqual(['dador_num', 'texto', 'variavel']);
  }, PASSO_A_PASSO);

  it('as duas linguagens que existem dão a mesma lista, e isso é de propósito', () => {
    // O mesmo conjunto de instruções em duas linguagens é o que faz a
    // linguagem ser a *sintaxe* e não o vocabulário — que é o que a spec §6.4
    // corrigiu. Um teste que as igualasse sem dizer porquê parece um teste
    // redundante; com a frase em cima, é a afirmação de que a diferença
    // entre Python e Java ainda não chegou ao ecrã.
    expect(obter('java').blocos).toEqual(obter('python').blocos);
  }, PASSO_A_PASSO);
});

describe('a área de blocos', () => {
  it('monta, e o programa que veio de fora está no ecrã', () => {
    // Este é o teste que apanha a versão do plano, que saltava a primeira
    // aplicação do programa com um `primeira` de `ref`: a lição abria em
    // branco, e o bloco inicial do passo nunca aparecia.
    const aoMudar = vi.fn();
    const carregar = { type: 'guardar', fields: { nome: { valor: 'total' } }, inputs: { VALOR: { valor: 5 } } };
    render(<Blocos chave="p1" linguagem="python" aoMudar={aoMudar} carregar={carregar} />);
    expect(screen.getByTestId('area-blocos')).toBeInTheDocument();
    expect(aoMudar).toHaveBeenCalledWith(carregar);
  }, PASSO_A_PASSO);

  it('quando o ecrã muda, o programa novo é dito — e não só na montagem', async () => {
    const aoMudar = vi.fn();
    render(<Blocos chave="p1" linguagem="python" aoMudar={aoMudar} />);
    expect(aoMudar).toHaveBeenLastCalledWith(null);
    const naMontagem = aoMudar.mock.calls.length;

    const ws = ecraPrincipal();
    const d = ws.newBlock('dizer') as Blockly.BlockSvg;
    const t = ws.newBlock('texto') as Blockly.BlockSvg;
    t.setFieldValue('olá', 'VALOR');
    d.initSvg();
    t.initSvg();
    d.render();
    t.render();
    d.getInput('VALOR')!.connection!.connect(t.outputConnection!);

    // A fila de eventos do Blockly é assíncrona: o evento chega depois do
    // comando, e por isso se espera por ele. Disparar o evento à mão — que é o
    // que a primeira versão fazia, com `ws.fire` — mede um caminho que a
    // pessoa nunca percorre, e o `fire` nem sequer é público na biblioteca.
    await waitFor(() => expect(aoMudar.mock.calls.length).toBeGreaterThan(naMontagem));
    const ultimo = aoMudar.mock.calls.at(-1)![0];
    expect(emitir('python', ultimo).texto).toBe("print('olá')\n");
  }, PASSO_A_PASSO);

  it('o ecrã sobrevive a um novo `aoMudar`, que é o que acontece a cada passo', () => {
    // Se `aoMudar` estivesse no array de dependências, cada estado novo
    // recriaria o ecrã e o aluno perderia o programa a meio de o montar.
    const antes = vi.fn();
    const { rerender } = render(<Blocos chave="p1" linguagem="python" aoMudar={antes} />);
    const d = ecraPrincipal().newBlock('dizer') as Blockly.BlockSvg;
    d.initSvg();
    d.render();
    const depois = vi.fn();
    rerender(<Blocos chave="p1" linguagem="python" aoMudar={depois} />);
    expect(ecraPrincipal().getAllBlocks(false)).toHaveLength(1);
  }, PASSO_A_PASSO);

  it('mudar a chave recria o ecrã, e é para isso que a chave existe', () => {
    // O contrário do teste anterior: com uma chave nova, o programa antigo tem
    // de ir embora, porque o passo é outro.
    const { rerender } = render(<Blocos chave="p1" linguagem="python" aoMudar={vi.fn()} />);
    const d = Blockly.getMainWorkspace().newBlock('dizer') as Blockly.BlockSvg;
    d.initSvg();
    d.render();
    rerender(<Blocos chave="p2" linguagem="python" aoMudar={vi.fn()} />);
    expect(ecraPrincipal().getAllBlocks(false)).toHaveLength(0);
  }, PASSO_A_PASSO);
});

describe('a lição inteira passa pelo ecrã sem perder uma letra', () => {
  const licao = CARREGAR(variavelPython, 'python');
  const todos = [
    ...licao.blocos,
    ...licao.passos.map((p) => p.bloco),
    ...licao.sondas.flatMap((s) => (s.prova.programa === undefined ? [] : [s.prova.programa])),
  ];

  function corpusVazio(b: BlocoLeigo): boolean {
    return (corpoDe(b) ?? []).length === 0;
  }

  /** Um programa do motor, montado num ecrã a sério, lido de volta. */
  function peloEcran(programa: BlocoLeigo): BlocoLeigo | null {
    const ws = ecrã();
    try {
      for (const bloco of deBlocoLeigo(programa)) {
        const feito = Blockly.serialization.blocks.append(bloco, ws);
        const svg = feito as Blockly.BlockSvg;
        svg.initSvg();
        svg.render();
      }
      return paraBlocoLeigo(Blockly.serialization.workspaces.save(ws));
    } finally {
      ws.dispose();
    }
  }

  it('cada bloco da lição, montado no Blockly e lido de volta, escreve o mesmo', () => {
    // O teste que liga esta tarefa à lição da anterior. A lição escreve
    // programas em `BlocoLeigo` e o ecrã lê e escreve `BlocoJson`; nada os
    // obriga a concordar, e o que se perde no caminho é **visível** — um
    // `{ref: 'total'}` que vira uma string `'[object Object]'` dá um programa
    // que corre e dá o resultado errado, que é a pior das maneiras de
    // falhar. O passo de cima passa por um ecrã do Blockly a sério, e não
    // por um objeto parecido com ele, pela mesma razão dos testes de cima.
    for (const b of todos) {
      const volta = peloEcran(b);
      if (b.type === 'pilha' && corpusVazio(b)) {
        // A pilha vazia é o único caso em que a volta não devolve o mesmo
        // bloco, e é o caso em que **não deve**: um ecrã sem blocos não é um
        // programa, e o passo da ficha de leitura começa assim de propósito.
        // A lição que se abre em branco é a lição que ainda não foi feita.
        expect(volta).toBeNull();
        continue;
      }
      expect(volta, `o bloco ${b.type} não voltou`).toEqual(b);
      expect(emitir('python', volta).texto).toBe(emitir('python', b).texto);
    }
  }, PASSO_A_PASSO);

  it('e nenhum deles escreve `undefined` depois da volta', () => {
    // A prova negativa. Um tradutor que perde um campo dá `undefined` e o
    // aluno lê `undefined = 5` — e a lição continua a passar nos testes que
    // só perguntam se o programa é aceite.
    for (const b of todos) {
      const escrito = emitir('python', peloEcran(b)).texto;
      expect(escrito).not.toMatch(/undefined/);
      expect(escrito).not.toMatch(/\[object Object\]/);
    }
  }, PASSO_A_PASSO);
});
```

- [ ] **Step 4: Os quatro portões**

`npx vitest run` — 409 testes, treze ficheiros.
`npx tsc --noEmit` — mudo. Foi ele que apanhou o `appendField` e o `blocks.load`, e mais cinco erros que a suite passava a escrever.
`npm run arvore` — núcleo limpo: sete ficheiros de produção e cinco de teste, zero importações de projeções. A pasta nova é `src/ui/`, que importa projeções **por direito**: é a camada que sabe a sintaxe, e o ecrã é sintaxe.
`guard.py` em `src/`, `scripts/` e no YAML — limpo. A regra ganhou uma isenção nova, `output`, `utils` e `screen`: são nomes que a biblioteca obriga a escrever (`output` é uma chave do formato de bloco do Blockly, `utils` é um namespace dele, `screen` é uma exportação do testing-library), e a isenção é por tipo de ficheiro para que a prosa continue a ser verificada.

### Task 10: O estado da li��ão e o painel de texto

**Files:**
- Create: `src/ui/tipos.ts`, `src/ui/estado.ts`, `src/ui/texto.tsx`, `src/ui/estilo.css`
- Test: `src/ui/estado.test.ts`, `src/ui/texto.test.tsx`

**Interfaces:**
- Consumes: Task 7 — `Licao`, `Passo`, `Momento`; Task 6 — `Divergencia`, `avaliarTexto`; Task 1 — `Erro`, `Language`, `NOMES`.
- Produces: `ROTULOS`, `EstadoLicao`, `useLicao(licao, passoInicial)`, `respostaBate(alvo, resposta)`, `PainelTexto`, `PainelTextoProps`.
  `normalizar` fica dentro de `estado.ts` e não é exportada: é um detalhe de como `respostaBate` casa, e a porta para o exercitar é a própria `respostaBate`.

**Nota da execução.** Oito defeitos, seis deles apanhados por um portão, um
pelo `tsc` a mais e um pela mutação do ficheiro.

- O Step 3 e o Step 4 importavam os tipos de `'../conteudo/carregar'`, que
  não os reexporta. A porta é `'../conteudo'`, e é a porta única porque o
  comentário no topo de `index.ts` diz que nenhum ficheiro da interface
  importa `esquema.ts` directamente.
- O Step 6 escrevia `<PainelTexto resposta=... />` sem a propriedade
  `liguagem`, que é obrigatória. 
- O Step 6 usava `getByText('7')` para três linhas dentro de um só `<pre>`.
  Nunca corrido, nunca teria passado.
- O `for (const m of ...)` do Step 1 dá `noUnusedLocals`.
- **`respostaBate` como o plano a escrevia devolve `true` para uma lista de
  palavras vazia**, porque `''.includes('')` é verdade. O `responder` não
  chegava lá — sai antes, em `palavras.length === 0` —, e por isso o buraco
  era latente e não ativo. Mas `respostaBate` é exportado, e o primeiro
  caller que lhe passe uma lista vazia fecha a lição sem a pessoa ter lido
  nada. Passou a exigir `pedida.length > 0`.
- A linha de `Produces` listava `normalizar`, `Avaliacao` e
  `LIMITE_DE_PASSOS`. Os três aparecem **uma vez em todo o plano**: a própria
  linha. `normalizar` não é exportado, e `Avaliacao` e `LIMITE_DE_PASSOS` não
  são desta tarefa nem de nenhuma outra. Um `Produces` com nomes que ninguém
  produz e ninguém consome é a forma mais barata de um plano parecer
  completo.
- O Step 12 era um fragmento de teste com quatro ajudantes que não existem.
  Substituído por testes que constroem a `Divergencia` com `divergir`.
- **O `ref` com a resposta anterior, no `texto.tsx`, não protegia nada.** Era
  uma comparação que devolve cedo quando a resposta é igual, dentro de um
  efeito cujas dependências são só `resposta` — e um efeito cujas
  dependências são só `resposta` só corre quando a resposta mudou, portanto a
  comparação é sempre verdadeira ao contrário. Tirou-se a comparação,
  correram-se os trinta e seis testes, e ficaram verdes: o código estava a
  dizer que protegia algo que não protegia. É a mesma família do `as never` da
  Task 9, e a regra é a mesma: **quem protege é o teste, e não o comentário.**
  O que protege mesmo é o array de dependências, e o teste que o vela chama-se
  «não limpa o texto quando o painel re-renderiza».
 `Fase` não é re-declarada: vem do `esquema` da Task 7. `Divergencia` também não: vem da Task 6 e é usada tal como é.

- [ ] **Step 1: Escrever o teste falhado `src/ui/estado.test.ts`**

```typescript
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLicao, respostaBate } from './estado';
import { CARREGAR } from '../conteudo/carregar';
import type { Licao } from '../conteudo';
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
    expect(result.current.totalPassos).toBe(licao.passos.length);
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
    // Uma volta por momento, pelo número e não pelo momento: o que este
    // teste mede é «quantas vezes o botão foi apertado», e um `for..of`
    // sobre a lista seria uma segunda forma de escrever a mesma contagem.
    const quantos = licao.passos[PASSO_DA_FICHA]!.momentos.length;
    for (let volta = 0; volta < quantos; volta++) {
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

  it('uma resposta que não diz a palavra pedida não marca, e não impede a resposta certa', () => {
    // A diferença entre «o aluno errou» e «o produto não tem opinião nenhuma»
    // só se vê nesta ordem: primeiro uma resposta que não bate, e depois uma
    // que bate. Um `responder` que escreve `feito` à partida, ou que se
    // bloqueia depois de uma resposta errada, passa o teste do plano e
    // fecha a ficha de leitura para quem ainda não a leu.
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    const momento = result.current.momentoActual!;
    let primeira: boolean | undefined;
    act(() => {
      primeira = result.current.responder('não faço ideia');
    });
    expect(primeira).toBe(false);
    expect(result.current.feito[momento.id]).toBeUndefined();
    let segunda: boolean | undefined;
    act(() => {
      segunda = result.current.responder('guarda um número');
    });
    expect(segunda).toBe(true);
    expect(result.current.feito[momento.id]).toBe(true);
  });

  it('responder sem escrever nada não marca o momento', () => {
    // Uma resposta vazia é o estado inicial da caixa de texto, e é o estado
    // em que o aluno está antes de ler a linha. Deixar a marca posta
    // transformava o «li a pergunta e respondi» num «cliquei no botão», e
    // o passo passava a ser decorável.
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    const momento = result.current.momentoActual!;
    act(() => {
      result.current.responder('   ');
    });
    expect(result.current.feito[momento.id]).toBeUndefined();
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

  it('um passo que aponta para uma sonda que não existe fica sem sonda, e não rebenta', () => {
    // Uma sonda apagada de uma lição é um erro de autoria, e o ecrã não pode
    // ser o sítio onde esse erro aparece a meio de uma pessoa a ler um
    // ficheiro. A resposta é um passo sem prova, que o motor avalia e o
    // ecrã mostra — e a porta que devolve este `null` é `temLicao` na
    // Task 13.
    const partida: Licao = {
      ...licao,
      passos: licao.passos.map((p) =>
        p.referencia === undefined ? p : { ...p, sonda: 'sonda-que-nao-existe' },
      ),
    };
    const { result } = renderHook(() => useLicao(partida, PASSO_DA_FICHA));
    expect(result.current.sonda).toBeNull();
    expect(result.current.referencia).toBeUndefined();
  });

  it('o passo da ficha traz as linhas do ficheiro, e são as 15', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_DA_FICHA));
    expect(result.current.referencia?.linhas).toHaveLength(15);
    expect(result.current.referencia?.linhas[0]).toBe('total = 5');
    expect(result.current.referencia?.linhas[5]).toBe('    total = total + 1');
    expect(result.current.referencia?.nome).toBe('variavel.py');
  });

  it('um passo que aponta para uma sonda sem ficheiro fica sem referência, e não rebenta', () => {
    // A ficha de leitura e as sondagens de programa vivem no mesmo sítio, e
    // só uma das duas tem `prova.texto`. Apontar a referência para a sonda
    // errada é um erro de autoria; o ecrã tem de mostrar um passo sem
    // ficheiro, e não um ecrã em branco com um erro na consola.
    const partida: Licao = {
      ...licao,
      passos: licao.passos.map((p) =>
        p.referencia === undefined ? p : { ...p, sonda: 'guarda-um-numero' },
      ),
    };
    const { result } = renderHook(() => useLicao(partida, PASSO_DA_FICHA));
    expect(result.current.sonda?.nome).toBe('guarda-um-numero');
    expect(result.current.referencia).toBeUndefined();
  });

  it('um passo sem ficha não tem referência, e não é um erro', () => {
    const { result } = renderHook(() => useLicao(licao, PASSO_FAZER));
    expect(result.current.referencia).toBeUndefined();
  });
});

/** O que sai de um teclado sem cedilha: as mesmas letras, sem os acentos.
 *
 *  O teste tira os acentos a si próprio, e não os escreve à mão. A grafia
 *  sem acentos é ao mesmo tempo a que um aluno escreve e uma grafia de
 *  antes de 1990, e escrevê-la à mão seria escrever uma violação da regra
 *  ortográfica como dado de teste. E o teste ficaria a provar que a
 *  palavra existe no ficheiro, e não que o produto a aceita. */
function semAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

describe('respostaBate', () => {
  it('bate por subcadeia, e sem pontuação', () => {
    // «Esta linha guarda um número.» bate com «guarda» e com «número», e a
    // vírgula final não é a razão de não bater. A palavra pedida é o
    // fundamento, e o resto da frase é o aluno a falar como fala.
    expect(respostaBate(['guarda', 'atribui'], 'Esta linha guarda um número.')).toBe(true);
    expect(respostaBate(['guarda'], 'guarda')).toBe(true);
  });

  it('bate sem acentos, porque o aluno escreve sem acentos', () => {
    // A lição escreve `número`, `lógica` e `atribuição` nas palavras que
    // pede. Um teclado sem cedilha — ou um telemóvel com o teclado em
    // inglês — dá a mesma palavra sem o acento. Se `normalizar` deixasse de
    // tirar os acentos, a palavra pedida nunca era dita e **a ficha de
    // leitura nunca mais abria**: não há botão de saltar, porque saltar a
    // ficha é saltar a lição. É o único teste desta tarefa que apanha uma
    // falha que fecha o produto inteiro sem um único erro no ecrã.
    for (const pedida of ['número', 'lógica', 'atribuição']) {
      expect(respostaBate([pedida], semAcentos(pedida))).toBe(true);
      expect(respostaBate([pedida], `a linha é ${semAcentos(pedida)} aqui`)).toBe(true);
    }
  });

  it('não bate quando a resposta não diz nada disto', () => {
    expect(respostaBate(['guarda', 'atribui'], 'não faço ideia')).toBe(false);
  });

  it('uma resposta vazia nunca bate, mesmo com a palavra pedida a vazia', () => {
    // Uma lista de palavras vazia é o momento fora da ficha. Se
    // `respostaBate` batesse por causa de `''`, cada momento fora da ficha
    // contaria como visto sem a pessoa ter lido nada.
    expect(respostaBate([], 'qualquer coisa')).toBe(false);
    expect(respostaBate([''], 'qualquer coisa')).toBe(false);
    expect(respostaBate(['guarda'], '')).toBe(false);
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npx vitest run src/ui/estado.test.ts`
Expected: FAIL com erro de resolução de `./estado`.

- [ ] **Step 3: Escrever `src/ui/tipos.ts`**

```typescript
import type { Fase } from '../conteudo';

export const ROTULOS: Record<Fase, string> = {
  explicar: 'Lê primeiro',
  fazer: 'Agora faz',
  nomear: 'Isto tem nome',
};

/** Não há uma vista `leitura`. Havia, e foi tirada. A vista era um ecrã
 *  independente do passo, o que produzia estados que não se podem preencher:
 *  o passo 0 na vista `nomear`, onde não há palavra nenhuma para nomear, e o
 *  passo 0 na vista `leitura`, onde não há ficheiro nenhum para ler. Um
 *  desenho que permite chega a estados vazios está a descrever três coisas
 *  quando quer descrever uma.
 *
 *  O que a vista `leitura` fazia — mostrar o ficheiro e perguntar linha a
 *  linha — é o que um passo com `referencia` faz, sempre, e só esse. A
 *  palavra que a vista `nomear` mostra — a palavra nomeada, grande — é o
 *  que um passo de fase `nomear` mostra, e a Task 7 recusa um passo de fase
 *  `nomear` sem palavra. Portanto a vista **é** a fase do passo, e não há
 *  nada para escolher.
 *
 *  A fase vem do `esquema` da Task 7 e não é redefinida aqui: um `Record`
 *  com as três fases é uma segunda lista, e uma segunda lista diverge. */
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
import type { Fase, Licao, Momento, Passo, Sonda } from '../conteudo';
import type { Erro } from '../nucleo/tipos';

/** O texto da pessoa, posto numa forma em que só há letras e dígitos.
 *
 *  Tirar os acentos não é um detalhe. A lição escreve `número`, `lógica` e
 *  `atribuição` nas palavras que pede, e o teclado de quem está a aprender
 *  não é o teclado de quem escreveu a lição: não tem cedilha, e um
 *  telemóvel com o teclado em inglês não tem sequer o acento. Sem esta
 *  tira, a palavra pedida nunca é dita e a ficha de leitura nunca mais
 *  abre — e não há botão para saltar, porque saltar a ficha é saltar a
 *  lição. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A resposta diz uma das palavras que a pergunta pedia?
 *
 *  Casa por subcadeia, para a pessoa poder responder com uma frase em vez
 *  de adivinhar a palavra exata. Não há resposta errada: há respostas que
 *  não dizem nada do que a linha fazia, e essas não avançam o passo porque
 *  o passo ainda não foi lido.
 *
 *  Uma resposta vazia nunca bate, mesmo com a lista de palavras vazia. Um
 *  momento fora da ficha tem `palavras` vazio, e `''.includes('')` é
 *  verdade — o que faria de cada momento fora da ficha um momento visto. */
export function respostaBate(alvo: string[], resposta: string): boolean {
  const r = normalizar(resposta);
  if (r.length === 0) return false;
  return alvo.some((p) => {
    const pedida = normalizar(p);
    return pedida.length > 0 && r.includes(pedida);
  });
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
   *  sítio só, e este é o sítio de onde o ecrã o vai buscar.
   *
   *  Uma sonda que não existe, ou uma sonda que prova um programa em vez de
   *  mostrar um ficheiro, dão `undefined` e não uma falha. Um erro de
   *  autoria na lição não pode aparecer a meio de uma pessoa a ler um
   *  ficheiro, e a porta que devolve este passo à pessoa é `temLicao`. */
  const referencia = useMemo(() => {
    if (!passo.referencia) return undefined;
    const texto = sonda?.prova.texto;
    if (texto === undefined) return undefined;
    return { nome: passo.referencia.nome, linhas: texto.trimEnd().split('\n') };
  }, [passo.referencia, sonda]);

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
      // guarda um número" bate com "guarda" e com "número". Não há resposta
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
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PainelTexto } from './texto';
import { divergir } from '../projecoes/avaliar';
import type { BlocoLeigo } from '../nucleo/avaliador';

/** O programa que o painel vai mostrar como «o que o bloco faz». */
const GUARDAR: BlocoLeigo = {
  type: 'guardar',
  fields: { nome: { valor: 'total' } },
  inputs: { VALOR: { valor: 5 } },
};

/** Espera o dobro do intervalo mais curto que o painel usa, mais uma
 *  margem. Só é preciso depois de uma ação que devia *cancelar* um
 *  temporizador: a prova é que o temporizador não dispara, e «não disparou
 *  ainda» não é a mesma coisa que «não disparou». */
async function quietos(vezes: number): Promise<void> {
  await new Promise((r) => setTimeout(r, vezes));
}

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

  it('o intervalo existe para agrupar, e uma frase dá um aviso só', async () => {
    // O teste acima passa com um `onChange` sem intervalo nenhum, e é esse o
    // defeito: escrever uma frase de doze letras doze avisos, doze execuções
    // do motor e doze respostas a piscar. O intervalo só existe para isso, e
    // um teste que só espera pelo valor nunca prova que ele existe.
    const aoComparar = vi.fn();
    const { container } = render(
      <PainelTexto linguagem="python" resposta="" aoComparar={aoComparar} debounceMs={20} />,
    );
    const area = container.querySelector('textarea')!;
    let escrita = '';
    for (const letra of 'total = 5') {
      escrita += letra;
      fireEvent.change(area, { target: { value: escrita } });
    }
    await waitFor(() => expect(aoComparar).toHaveBeenCalled());
    await quietos(60);
    expect(aoComparar).toHaveBeenCalledTimes(1);
    // E o que corre é a última tecla, não a primeira nem a terceira.
    expect(aoComparar).toHaveBeenCalledWith('total = 5');
  });

  it('o botão Executar corre já, e cancela o aviso que estava pendente', async () => {
    // Sem o cancelamento, a pessoa escreve, carrega em Executar, vê o
    // resultado, e dois instantes depois o aviso pendente chega e corre o
    // mesmo texto outra vez. O resultado aparece duas vezes e o painel não
    // diz porquê.
    const aoComparar = vi.fn();
    render(
      <PainelTexto linguagem="python" resposta="" aoComparar={aoComparar} debounceMs={20} />,
    );
    const area = screen.getByLabelText('O teu código em Python');
    fireEvent.change(area, { target: { value: 'total = 6' } });
    // O clique dispara-se à mão e não com `userEvent`. O `userEvent` espera
    // por temporizadores entre os seus próprios passos, e com um intervalo de
    // vinte milissegundos o aviso pendente chegava **antes** do clique: o
    // teste passava a medir quanto o `userEvent` demora, e não o
    // cancelamento. Com o clique na mesma tarefa, o aviso ainda está
    // pendente, que é a situação que o botão tem de resolver.
    fireEvent.click(screen.getByRole('button', { name: 'Executar' }));
    expect(aoComparar).toHaveBeenCalledWith('total = 6');
    await quietos(60);
    expect(aoComparar).toHaveBeenCalledTimes(1);
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

  it('sem blocos não aparecem divergências, porque não há com que comparar', () => {
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

  it('não limpa o texto quando o painel re-renderiza com a mesma resposta', () => {
    // É o contrário do teste anterior, e é o que acontece a cada tecla: o
    // pai re-renderiza com a mesma `resposta`, e um efeito que dependesse de
    // mais alguma coisa voltava a pôr o texto de fora por cima do texto que
    // estava a ser escrito. O primeiro teste deste ficheiro passaria com
    // este defeito, porque lá o valor vinha de fora e não de dentro.
    //
    // Este teste foi escrito a pensar que o que protegia era uma comparação com a
    // resposta anterior, dentro do efeito. Mediu-se e não era: tirando a
    // comparação, os trinta e seis testes ficaram verdes. Acrescentando uma
    // dependência a mais ao efeito, também não é este teste que fica
    // vermelho — fica o de «limpa o texto quando a resposta muda de passo»,
    // porque o efeito passa a reescrever o valor para sempre. Ou seja: a
    // forma errada de_panel_apagar o que se escreve é um laço, e um laço
    // berra. O que este teste vela é o outro sentido — que o texto escrito
    // chega inteiro ao fim de quantas re-renderizações o pai quiser fazer —
    // e é para isso que ele fica.
    const { rerender } = render(<PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} />);
    const area = screen.getByLabelText('O teu código em Python');
    fireEvent.change(area, { target: { value: 'total = 6' } });
    expect(area).toHaveValue('total = 6');
    rerender(<PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} />);
    expect(area).toHaveValue('total = 6');
  });

  it('mostra a divergência com o porque e o que fazer', () => {
    render(
      <PainelTexto
        linguagem="python"
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
    // Três linhas, um só elemento. `getByText('7')` encontraria três
    // elementos e.erraria, e encontraria um se o `<pre>` separasse as linhas
    // em nos de texto diferentes — e o resultado viria a bater. O que
    // interessa é o texto todo, que é o que a pessoa vai ler.
    const saida = screen.getByLabelText('Saída do programa');
    expect(saida.textContent).toBe('7\n7\n7');
  });

  it('não mostra saída quando o programa não imprimiu nada', () => {
    // O contrário do teste anterior. Um painel que mostra sempre um painel
    // de saída vazio faz o aluno procurar um resultado que não existe, e
    // a lição da variável — que só guarda — é exatamente esse caso.
    const { container } = render(
      <PainelTexto linguagem="python" resposta="total = 5" aoComparar={() => undefined} />,
    );
    expect(container.querySelector('.saida')).toBeNull();
  });
});

describe('o painel é da linguagem escolhida, e mostra o porquê que o motor deu', () => {
  it('o painel da Java mostra a falha do ponto-e-vírgula em falta como essa falha', () => {
    // O `porque` não é um texto de interface: é o que a Task 6 escreveu
    // depois de reparar que «função desconhecida» é uma mentira para quem
    // leu a linha e viu a falta de um ponto-e-vírgula. A única forma de
    // saber que essa frase chega ao aluno é construí-la com `divergir` e
    // ver o painel mostrar a mesma. Uma `Divergencia` escrita à mão aqui
    // provaria que o painel mostra o que lhe derem, e nada mais.
    const relatorio = divergir('java', GUARDAR, 'int total = 5');
    expect(relatorio.ok).toBe(false);
    expect(relatorio.divergencias[0]!.porque).toMatch(/ponto-e-vírgula/i);
    render(
      <PainelTexto
        linguagem="java"
        resposta={relatorio.divergencias[0]!.obtido}
        aoComparar={() => undefined}
        divergencias={relatorio.divergencias}
      />,
    );
    expect(screen.getByText(/ponto-e-vírgula/i)).toBeInTheDocument();
  });

  it('e o mesmo painel com texto de Python é divergência, e não um texto válido', () => {
    // A segunda metade do mesmo teste. Um painel que aceitasse `total = 5`
    // como Java escreveria a resposta ao aluno como se fosse o que ele
    // quis dizer, e o aluno ia copiá-la para o ficheiro e ver o compilador
    // dizer o que o painel devia ter dito.
    const relatorio = divergir('java', GUARDAR, 'total = 5');
    expect(relatorio.ok).toBe(false);
    expect(relatorio.divergencias.length).toBeGreaterThan(0);
  });

  it('e quando bate certo o painel não mostra nada para dizer', () => {
    // A prova negativa. Um painel que mostra a linha esperada «para
    // comparação» está a dar ao aluno a resposta, e quem está a aprender a
    // ler código não deve poder copiá-la do sítio onde a está a comparar.
    const relatorio = divergir('java', GUARDAR, 'int total = 5;');
    expect(relatorio.ok).toBe(true);
    const { container } = render(
      <PainelTexto
        linguagem="java"
        resposta="int total = 5;"
        aoComparar={() => undefined}
        divergencias={relatorio.divergencias}
      />,
    );
    expect(container.querySelector('.divergencias')).toBeNull();
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
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A resposta que vem de fora é a do passo: muda de passo, muda o texto do
  // editor.
  //
  // O que impede que a mudança apague o que a pessoa está a escrever é o
  // **array de dependências**, e é só ele. O pai re-renderiza a cada tecla
  // com a mesma `resposta`, e um efeito que dependesse de mais alguma coisa
  // voltaria a pôr o texto de fora por cima do texto que estava a ser
  // escrito. A dependência é por isso só `resposta`, e quem vela por isso é o
  // teste «não limpa o texto quando o painel re-renderiza».
  //
  // Havia aqui um `ref` com a resposta anterior e uma comparação que
  // devolvia cedo quando eram iguais. Tira-se a comparação e os trinta e
  // seis testes ficam verdes: dentro de um efeito cujas dependências são só
  // `resposta`, a comparação é sempre verdadeira ao contrário, porque o
  // efeito só corre quando a resposta mudou. O `ref` custava uma linha e
  // não protegia nada — e o pior de um código que não protege nada é o
  // comentário ao lado a dizer que protege.
  useEffect(() => {
    definirValor(resposta);
  }, [resposta]);

  const aoDigitar = (novo: string): void => {
    definirValor(novo);
    // O intervalo existe para agrupar. Escrever «total = 5» são treze
    // alterações, e sem isto seriam treze execuções do motor e treze
    // respostas a piscar enquanto a pessoa ainda está a meio da terceira
    // letra.
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => aoComparar(novo), debounceMs);
  };

  const executar = (): void => {
    // O botão Executar é um pedido de resposta já, e o temporizador que ficou
    // pendente é o mesmo pedido com atraso. Sem o cancelamento, a pessoa
    // carregava no botão, via o resultado, e dois instantes depois o aviso
    // pendente chegava e corria o mesmo texto outra vez.
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

- [ ] **Step 12: O painel é da linguagem escolhida, e mostra o `porque` que o motor deu**

O painel mostra a projeção da linguagem activa e compara com `comparar()`. Um
teste que só passa com Python esconde a falha mais provável — alguém escrever a
sintaxe errada e o produto aceitar. E o `porque` que aparece no ecrã não é um
texto de interface: é o que a Task 6 escreveu depois de reparar que «função
desconhecida» é uma mentira para quem leu a linha e viu a falta de um
ponto-e-vírgula. A única forma de saber que essa frase chega ao aluno é
**construí-la com `divergir`** e ver o painel mostrar a mesma. Uma
`Divergencia` escrita à mão provaria que o painel mostra o que lhe derem, e
nada mais.

Isto substitui o Step 12 que o plano tinha, que era um fragmento de teste com
quatro ajudantes — `renderComLinguagem`, `caixa`, `semErros`, `escrever` —
que não existem em lado nenhum, e que não teria compilado em nenhum.

### Task 11: O robô com ranhuras tipadas

**Files:**
- Create: `src/ui/robo.tsx`, `src/ui/robo.css`
- Test: `src/ui/robo.test.tsx`

**Interfaces:**
- Consumes: Task 1 — `Valor`, `Recusa`, `Tipo`.
- Produces: `PORTA_ENTRADA`, `PORTA_SAIDA`, `PainelRobo`.
- Produz: `PortaRobo`, `NOMES_TIPO`, `mostrar`.

**Nota da execução.** Seis defeitos, e o primeiro é o mais importante de
todos os treze: **o plano mandava o robô citar o Python e o Java, que é
exatamente o que a spec §9 tirou.**

- O Step 1 da tarefa montava uma `Recusa` com as chaves `python:` e `java:`
  e afirmava que o painel mostrava as duas, com o teste `quando há recusa,
  mostra a razão e o que cada linguagem faria`. Essas chaves não existem
  desde a Task 3, e a §9 diz porque não voltam: a v1 punha `protecao:
  { python, java }` na recusa — o que a *outra* linguagem faria — e um aluno
  de Go não sofre por causa do Python. E o **Step 7 da mesma tarefa**
  escrevia o oposto, num teste que afirma que a `Recusa` não pode citar
  `Python` nem `Java`. O plano não estava contraditório por descuido: tinha
  a v1 num passo e a v2 no outro, e o `tsc` calava-se porque `Recusa` é uma
  união com chaves a menos, não a mais.
- **`valores: Valor[]` punha as duas portas com o mesmo número.** A regra do
  painel era «o último valor cujo tipo bate com a porta», e `entrada` e
  `saída` são as duas de `número` — que é o que o Step 4 da Task 12 passa.
  As duas portas mostravam sempre o mesmo valor, e a entrada mostrava o valor
  que tinha acabado de sair. Duas portas do mesmo tipo a mostrar o mesmo
  número ensinam que é o tipo que decide o sítio, e é o contrário: o sítio é
  uma porta. Passa a ser `Record<id da porta, valor>`, que é o que um
  arrastar produz.
- **`String(v.valor)` mentia em três dos seis tipos.** `String(true)` dá
  `true`; `String(['a','b'])` dá `a,b` — uma frase, do tipo errado, que
  parece texto. O produto inteiro é sobre o que protege o tipo, e uma porta
  que mostra uma lista como frase ensina o contrário de tudo o que os outros
  ecrãs dizem. `mostrar()` conta por tipo.
- **Um valor recusado ficava na porta ao lado da recusa.** As duas coisas ao
  mesmo tempo dizem o que não é verdade: que o valor entrou e que foi
  recusado. E a mesma regra vale para o valor de outro tipo: o painel não tem
  autoridade para decidir se o texto entra numa porta de número — quem
  decide é o motor. O painel só mostra o que o motor deixou passar.
- `NOMES_TIPO` tinha cinco chaves e `Tipo` tem seis: falta `função`. É o
  `Record` a fazer o trabalho dele, e o `tsc` apanhou.
- `val('número', 7, { porque: '', python: '', java: '' }, …)` — a `Explicacao`
  é `{ porque, remedio }` desde a Task 1. `tsc`.

**O que entrou e não estava no plano.** O aviso diz **«O robô não aceitou o
valor»**, e é a primeira linha. Não é um adorno: a §11.2 do formato avisa que
há duas recusas com a mesma palavra — a de arrastar um valor para esta
ranhura, que acontece nas seis linguagens, e a do avaliador de texto, que em
Python e em JavaScript não chega a existir. A pessoa ouve as duas lado a
lado, e sem uma distinção no ecrã aprende a desconfiar da palavra. Dizer de
quem é a recusa é a distinção que o painel pode fazer sem inventar nada: foi
o robô que não aceitou, e o robô é nosso.

**E um teste passou pelo motivo errado, a segunda vez neste plano.** «Diz o
que a porta aceita e o que lhe chegou» comparava o `alert` com
`RECUSA.esperado` e `RECUSA.obtido` — que são `'número'` e `'texto'`, e que
o `porque` do motor **já contém**: «Este sítio só aceita número. Recebeste
texto.». Apagada a linha do ecrã, catorze testes verdes. Trocados os dois de
sítio, catorze testes verdes. O mesmo que a Task 9: a asserção media uma
coisa que estava escrita noutro sítio do ecrã. Passou a usar a recusa de
`lógico` e `lista` — em que o `porque` diz «aceita lógico» e o ecrã diz «sim
ou não», que é o registo a traduzir — e a comparar a frase inteira, para que
trocar os dois tipos também dê vermelho.

- [ ] **Step 1: Escrever o teste falhado**

`src/ui/robo.test.tsx`:
```typescript
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NOMES_TIPO, PainelRobo, PORTA_ENTRADA, PORTA_SAIDA } from './robo';
import type { PortaRobo } from './robo';
import { E, EXPLICACAO_VAZIA, LINGUAGENS, NOMES, restricao, val, valorEm } from '../nucleo/tipos';
import type { Valor } from '../nucleo/tipos';

/** A origem que a recusa traz. É a mesma nos testes todos porque a
 *  localização da recusa é o assunto de outro teste, e escrevê-la à mão em
 *  cada um seria repetir a mesma linha seis vezes sem acrescentar nada. */
const ORIGEM = { bloco: 'guardar', ranhura: 0, passo: 1 };

const VALOR_NUMERICO: Valor = val('número', 7, EXPLICACAO_VAZIA, ORIGEM);
const VALOR_TEXTO: Valor = val('texto', 'olá', EXPLICACAO_VAZIA, ORIGEM);
const VALOR_OITO: Valor = val('número', 8, EXPLICACAO_VAZIA, ORIGEM);

/** A recusa que a pessoa vê quando dá um texto a um sítio de número. Sai do
 *  motor — `E()` é a função de `tipos.ts` que produz todas as recusas — e
 *  não de uma constante escrita à mão. Um teste com a `Recusa` à mão
 *  provaria que o painel mostra o que lhe derem, e não que a frase que a
 *  pessoa vai ler é a que o motor escreveu. */
const RECUSA = E(restricao('número'), VALOR_TEXTO);

/** A porta com este nome, e não o ecrã todo. As asserções deste ficheiro
 *  são sobre *qual* porta mostra o quê: um painel que mostrasse os dois
 *  números no sítio certo mas emendados passaria por uma busca no ecrã
 *  inteiro. */
function portaDe(pai: HTMLElement, id: string): HTMLElement {
  const achada = pai.querySelector(`[data-porta="${id}"]`);
  if (achada === null) throw new Error(`o ecrã não tem a porta ${id}`);
  return achada as HTMLElement;
}

const LISTA: PortaRobo = { id: 'itens', nome: 'itens', tipo: 'lista' };
const PERGUNTA: PortaRobo = { id: 'pergunta', nome: 'pergunta', tipo: 'lógico' };

describe('PainelRobo', () => {
  it('mostra as portas com o nome e o tipo que a porta declara', () => {
    render(<PainelRobo portas={[PORTA_ENTRADA, PORTA_SAIDA]} valores={{}} recusa={null} />);
    expect(screen.getByText('entrada')).toBeInTheDocument();
    expect(screen.getByText('saída')).toBeInTheDocument();
    // O rótulo do tipo sai do registo, e não de uma palavra escrita dentro
    // do componente: um painel que escreve «número» à mão passa a dizer
    // outra coisa no dia em que `NOMES_TIPO` mudar o nome de um tipo.
    for (const porta of [PORTA_ENTRADA, PORTA_SAIDA]) {
      expect(screen.getAllByText(NOMES_TIPO[porta.tipo]).length).toBe(2);
    }
  });

  it('o rótulo do tipo de cada porta vem do registo, em todos os tipos', () => {
    // O teste de cima passa com um painel que escreve «número» à mão,
    // porque as duas portas são de `número` e o registo também diz
    // «número». Só um tipo cujo nome no registo é **diferente** do nome do
    // tipo separa as duas coisas — e o `lógico` é esse tipo, porque o
    // registo diz «sim ou não» e o tipo diz `lógico`. Um painel que
    // escrevesse o nome do tipo à mão passaria o teste de cima e falhava
    // este, que é o que torna a porta legível para quem não sabe programar.
    const { container } = render(
      <PainelRobo portas={[PERGUNTA, LISTA]} valores={{}} recusa={null} />,
    );
    expect(portaDe(container, PERGUNTA.id).textContent).toContain(NOMES_TIPO['lógico']);
    expect(portaDe(container, PERGUNTA.id).textContent).not.toContain('lógico');
    expect(portaDe(container, LISTA.id).textContent).toContain(NOMES_TIPO['lista']);
  });

  it('mostra o valor dentro da porta', () => {
    render(
      <PainelRobo
        portas={[PORTA_SAIDA]}
        valores={{ [PORTA_SAIDA.id]: VALOR_NUMERICO }}
        recusa={null}
      />,
    );
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('mostra um traço quando a porta está vazia', () => {
    render(<PainelRobo portas={[PORTA_SAIDA]} valores={{}} recusa={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('duas portas do mesmo tipo mostram valores diferentes', () => {
    // A interface do plano era `valores: Valor[]` e o painel escolhia «o
    // último valor cujo tipo bate com a porta». Com `entrada` e `saída` as
    // duas de `número` — que é o que o ecrã da lição passa — as duas portas
    // mostravam sempre o mesmo número: a entrada mostrava o valor que
    // acabou de sair. Duas portas do mesmo tipo que mostram o mesmo número
    // ensinam que é o tipo que decide o sítio, e é o contrário: o sítio é uma
    // porta, e a porta é dela.
    //
    // Passa a ser `Record<id da porta, valor>`, que é o que um arrastar
    // produz: um valor num sítio escolhido, e não um valor à solta à espera
    // de que o painel lhe escolha um sítio.
    const { container } = render(
      <PainelRobo
        portas={[PORTA_ENTRADA, PORTA_SAIDA]}
        valores={{ [PORTA_ENTRADA.id]: VALOR_NUMERICO, [PORTA_SAIDA.id]: VALOR_OITO }}
        recusa={null}
      />,
    );
    expect(portaDe(container, PORTA_ENTRADA.id).textContent).toContain('7');
    expect(portaDe(container, PORTA_SAIDA.id).textContent).toContain('8');
  });

  it('uma porta não mostra um valor de outro tipo', () => {
    // A mesma regra por outra causa: o valor não entrou, logo não se mostra.
    // Uma porta de número que mostra «olá» é uma porta que mente sobre o
    // próprio tipo, e o painel não tem autoridade nenhuma para decidir se
    // esse texto pode entrar — quem decide é o motor. O que o painel faz é
    // não mostrar o que o motor não deixou passar.
    const { container } = render(
      <PainelRobo
        portas={[PORTA_ENTRADA]}
        valores={{ [PORTA_ENTRADA.id]: VALOR_TEXTO }}
        recusa={null}
      />,
    );
    expect(portaDe(container, PORTA_ENTRADA.id).textContent).toContain('—');
    expect(screen.queryByText('olá')).not.toBeInTheDocument();
  });

  it('quando há recusa, mostra a razão, o que fazer, e o que devia estar lá', () => {
    // As três coisas, e não uma. A spec §10 é uma regra dura: se uma
    // mensagem aparece sem explicação, é um bug. E a §9 pede «uma recusa com
    // razão e com saída» — a razão sem a saída deixa a pessoa a saber que
    // errou e a não saber o que fazer a seguir. E sem dizer o que estava à
    // espera e o que chegou, a pessoa tem de adivinhar qual dos dois foi o
    // erro.
    render(<PainelRobo portas={[PORTA_ENTRADA]} valores={{}} recusa={RECUSA} />);
    expect(screen.getByText(RECUSA.porque)).toBeInTheDocument();
    expect(screen.getByText(RECUSA.remedio)).toBeInTheDocument();
  });

  it('diz o que a porta aceita e o que lhe chegou, cada um no seu sítio', () => {
    // A recusa tem os dois tipos, e o painel tem de os dizer aos sítios
    // certos. Este teste foi escrito primeiro com a recusa de `número` e
    // `texto`, e era um teste que passava pelo motivo errado: o `porque` que
    // o motor escreve é «Este sítio só aceita número. Recebeste texto.», e
    // por isso `toContain(esperado)` e `toContain(obtido` eram verdadeiros
    // mesmo com a linha apagada do ecrã, e verdadeiros também com
    // `esperado` e `obtido` trocados de sítio. Apagada a linha, catorze
    // testes verdes. Trocados os dois, catorze testes verdes.
    //
    // A recusa de `lógico` e `lista` desfaz as duas armadilhas de uma vez:
    // o `porque` passa a dizer «aceita lógico», e o ecrã diz «sim ou não» —
    // que é o registo a traduzir. E a frase inteira é comparada, para que
    // trocar os dois tipos de sítio também dê vermelho.
    const recusa = E(restricao('lógico'), val('lista', ['a'], EXPLICACAO_VAZIA, ORIGEM));
    expect(recusa.porque).toContain('lógico');
    render(<PainelRobo portas={[PERGUNTA]} valores={{}} recusa={recusa} />);
    expect(screen.getByRole('alert').textContent).toContain(
      'O que esta porta aceita: sim ou não. O que lhe chegou: lista.',
    );
  });

  it('a recusa nunca cita outra linguagem, em nenhuma das seis', () => {
    // O defeito mais caro que este painel podia ter. A v1 da spec punha
    // `protecção: { python, java }` na recusa — o que a *outra* linguagem
    // faria — e a §9 tirou isso: um aluno de Go não sofre por causa do
    // Python. A regra é verificada aqui sobre as seis, pelo nome de cada
    // uma, e sobre o texto todo do ecrã: não basta não mostrar `python`, é
    // não mostrar «Python» em lado nenhum do aviso.
    //
    // E o `NOMES` é a fonte, não uma lista escrita aqui: um nome novo entra
    // na verificação no dia em que entra no produto.
    const { container } = render(
      <PainelRobo portas={[PORTA_ENTRADA]} valores={{}} recusa={RECUSA} />,
    );
    const texto = container.textContent ?? '';
    for (const linguagem of LINGUAGENS) {
      expect(texto).not.toContain(NOMES[linguagem]);
    }
    expect(texto).toContain('número');
    expect(texto).toContain('texto');
  });

  it('diz que a recusa é do robô, e não da linguagem', () => {
    // A §11.2 do formato põe o problema com todas as letras: a recusa de
    // arrastar um valor para a ranhura do robô acontece nas seis
    // linguagens, e **não é a mesma coisa** que a recusa do avaliador de
    // texto, que em Python e em JavaScript nunca chega a existir. A pessoa
    // ouve as duas com a mesma palavra, e sem uma distinção no ecrã aprende
    // a desconfiar da palavra. A distinção que o painel pode fazer sem
    // inventar nada é dizer de quem é a recusa — e é o robô, porque foi o
    // robô que não aceitou o valor.
    render(<PainelRobo portas={[PORTA_ENTRADA]} valores={{}} recusa={RECUSA} />);
    expect(screen.getByText(/o robô não aceitou/i)).toBeInTheDocument();
  });

  it('um valor recusado não fica na porta, porque não entrou', () => {
    // O painel do plano mostrava o valor na porta **e** a recusa ao lado.
    // As duas coisas ao mesmo tempo dizem o que não é verdade: que o valor
    // entrou e que foi recusado. A recusa é a última palavra — o valor não
    // passou, logo a porta fica vazia.
    const recusado = valorEm(VALOR_NUMERICO, (v) => `${v}`);
    expect(recusado.recusado).toBe(true);
    const { container } = render(
      <PainelRobo
        portas={[PORTA_SAIDA]}
        valores={{ [PORTA_SAIDA.id]: recusado }}
        recusa={RECUSA}
      />,
    );
    expect(screen.queryByText('7')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(container.textContent).toContain(RECUSA.porque);
  });

  it('sem recusa, não mostra nenhum aviso', () => {
    // A prova negativa do `role="alert"`. Um `role="alert"` sempre presente
    // — ou presente mas vazio — faz o leitor de ecrã anunciar o silêncio a
    // cada alteração, e a pessoa que usa leitor fica a ouvir um erro que não
    // aconteceu.
    render(
      <PainelRobo
        portas={[PORTA_ENTRADA]}
        valores={{ [PORTA_ENTRADA.id]: VALOR_NUMERICO }}
        recusa={null}
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uma lista mostra-se como lista, e não como as suas coisas coladas', () => {
    // `String(['número', 'texto'])` dá `número,texto` — uma frase, do tipo
    // errado, que parece texto. O produto inteiro é sobre o que protege o
    // tipo, e um painel que mostra uma lista como frase ensina o contrário
    // de tudo o que diz nos outros ecrãs.
    const valor = val('lista', ['número', 'texto'], EXPLICACAO_VAZIA, ORIGEM);
    render(<PainelRobo portas={[LISTA]} valores={{ itens: valor }} recusa={null} />);
    expect(screen.getByText(/lista com 2/i)).toBeInTheDocument();
    expect(screen.queryByText('número,texto')).not.toBeInTheDocument();
  });

  it('um lógico mostra-se como sim ou não, e não como true ou false', () => {
    // `String(true)` dá `true`, que é a palavra da linguagem da máquina e
    // não da pessoa. A pessoa que está a ler código vê `true` no ficheiro e
    // vê «sim» no robô, e precisa de uma ponte para os dois.
    render(
      <PainelRobo
        portas={[PERGUNTA]}
        valores={{ pergunta: val('lógico', true, EXPLICACAO_VAZIA, ORIGEM) }}
        recusa={null}
      />,
    );
    expect(screen.getByText('sim')).toBeInTheDocument();
    expect(screen.queryByText('true')).not.toBeInTheDocument();
  });

  it('uma recusa sem valor mostra a porta vazia e a razão, ao mesmo tempo', () => {
    // As duas leituras do ecrã ao mesmo tempo, e sem mentira em nenhuma: a
    // porta está vazia, e a pessoa sabe o que lá devia estar.
    const { container } = render(
      <PainelRobo portas={[PORTA_ENTRADA]} valores={{}} recusa={RECUSA} />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(container.textContent).toContain(RECUSA.porque);
    expect(container.textContent).toContain(RECUSA.remedio);
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

.porta[data-tipo='lógico'] {
  border-color: #a855f7;
}

.porta[data-tipo='lista'] {
  border-color: #f59e0b;
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

.recusa-quem {
  font-weight: 600;
  color: var(--erro);
}

.recusa-porque {
  font-weight: 600;
}

.recusa-remedio {
  color: var(--ok);
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

- [ ] **Step 7: O robô recusa a tipagem errada, com porquê — e sem o nome de outra linguagem**

Este passo estava escrito no plano, e o plano **tinha-o duas vezes em
versões opostas**: o Step 1 afirmava que o robô mostrava o que o Python e o
Java fariam, e este Step afirmava que não pode mostrar. A v1 e a v2 do
produto estavam no mesmo ficheiro, a trinta linhas uma da outra, e o `tsc` não
disse nada porque `Recusa` é uma união com chaves a menos e não a mais — o
`python:` e o `java:` que o Step 1 montava eram simplemente campos a mais num
objeto, e o teste do Step 1 nunca correu.

O invariante é a spec §0 a ver-se no ecrã, e está agora em dois testes do
ficheiro de testes, e não num fragmento à parte:

- **`a recusa nunca cita outra linguagem, em nenhuma das seis`** — percorre
  `LINGUAGENS`, tira cada nome de `NOMES` e falha se algum aparecer em
  qualquer sítio do ecrã. A lista vem do produto e não do teste: um sétimo
  nome entra na verificação no dia em que entra no produto.
- **`diz que a recusa é do robô, e não da linguagem`** — a §11.2 do formato
  avisa que há duas recusas com a mesma palavra, e que a pessoa as ouve lado a
  lado. Sem uma distinção no ecrã, a lição ensina a desconfiar da palavra.

E a recusa que os testes usam é a do motor — `E(restricao('número'), …)` — e
não uma constante escrita à mão. Um teste com a `Recusa` à mão provaria que
o painel mostra o que lhe derem, e não que a frase que a pessoa vai ler é a
que o motor escreveu.


### Task 12: O ecrã da lição e o seletor de linguagem

> **O que esta tarefa custou a achar, e o que o plano tinha errado.**
>
> O plano original desta tarefa tinha um ecrã que não ligava a nada e um
> seletor que era um `<select>`. Não era uma má ideia: era um desenho
> diferente, e o desenho que o produto acabou por ter choca com ele em
> dezoito sítios. A lista vale mais do que a soma, porque cada linha é uma
> armadilha que se fecha.
>
> **A porta da importação.** Três ficheiros importavam `CARREGAR` de
> `../../conteudo/carregar`. A porta é `../../conteudo`, e é só uma — a Task
> 10 já tinha decidido isso e o plano da T12 não sabia.
>
> **`licao.referencia`.** A referência ao ficheiro é **por passo** e não por
> lição: uma lição com dois ficheiros tem dois passos que os mandam ler. A
> forma do esquema é `Passo.referencia`, e o `Licao` não tem o campo.
>
> **`<PainelRobo valores={…} />` com uma lista.** A Task 11 já tinha
> resolvido isto — `Record<id da porta, Valor|undefined>`, e não `Valor[]` —
> porque com duas portas de `número` «o último valor do tipo» punha o mesmo
> número nas duas. O plano da T12 reescreveu a assinatura e trouxe o defeito
> atrás.
>
> **`comparar(gerado, texto)`.** `divergir` recebe o **programa**; o texto
> emitido é o que a projeção produz para comparar, não a coisa que se
> compara. Passar-lhe o texto que ela acabou de escrever é dizer-lhe que o
> que ela há de decidir já está decidido.
>
> **O `bateSonda` reimplementado.** `avaliar.ts` já exporta
> `bate(esperado, erros)`. O plano escreve o seu, e o seu diverge do
> existente num dia em que um dos dois muda.
>
> **`<Blocos>` sem a prop `linguagem`.** É obrigatória, e sem ela o painel
> não sabe que blocos registar.
>
> **`verificar` no `PassoView`.** Codigo morto, e o `noUnusedLocals` do
> `tsconfig` apanha-o. Worse: `aoAvancar={estado.proximo}` deixava a pessoa
> presa no fim do último momento, porque `proximo()` avança o momento e não
> o passo.
>
> **Dois botões com a mesma acção.** O `SondasView` do plano dava a
> «Experimentar» e a «Ver a resposta» o mesmo `aoObservar`. Duas maneiras de
> dizer a mesma coisa, e nenhuma delas é a experimentação — a experimentação
> é carregar em «Correr o programa» e ver o que acontece.
>
> **O `catalogo.ts` não compilava.** `import { LINGUAGENS, NOMES }` e logo a
> seguir `import { NOMES }`, e `Language` importado duas vezes. Erro do
> `tsc`, não do `vitest`.
>
> **`getByRole('option', { name: /Java/ })`** encontra «Java» **e**
> «JavaScript» e atira. Um teste que não corre não é um teste vermelho: é um
> teste que não existe.
>
> **`UNSAFE_getByRole('option').click()` numa opção desativada.** O nome
> `UNSAFE_` é o próprio teste a dizer que está a fazer algo que o navegador
> não deixa fazer. Um teste mede um estado que dá para chegar; este mede um
> que não dá.
>
> **`JSX.Element` no `main.tsx`.** O React 19 tirou o espaço de nomes `JSX`
> global. Não é um detalhe de versão: é um ficheiro que não compila com a
> dependência que o projecto declara.
>
> **`const CHAVE = 'variavel'` no `main.tsx`.** Uma segunda fonte de verdade
> sobre que lições existem. O `entrada.test.tsx` mede isso: se a chave
> viesse de uma constante, trocar a constante abriria uma lição inexistente.
>
> **Os erros num `useState` local do `PainelRobo`.** O `EstadoLicao` já
> carrega `erros` e `definirErros`; um estado local ao lado é o mesmo dado em
> dois sítios, e o que se vê no ecrã sai do que não é o estado.
>
> **O painel escolhido pela fase.** A lição tem `explicar` com blocos,
> `nomear` com blocos e `fazer` que pode trazer o editor de texto. Escolher
> pelo passo obriga a repetir a decisão e os dois sítios divergem no primeiro
> passo que foge ao padrão. Quem escolhe é a **fonte do momento**.
>
> **A ficha com quinze campos e sem saída.** O plano esperava quinze campos
> de resposta e a sondagem a marcá-los. Isso é um exame: quem não souber a
> linha 14 fica trinta segundos e não passa. A ficha que ficou tem um campo
> só, reusado de pergunta em pergunta, e uma fuga honesta em todo o ecrã.
>
> **Os testes com o texto da lição escritos à mão.** O plano escrevia a
> pergunta de `guarda-um-numero` e o `esperado.porque` dela no ficheiro de
> testes. Um teste que copia a lição é uma segunda lição, e as duas divergem
> no primeiro parágrafo que alguém reescreva. E duas asserções do plano
> falhavam por causa do embrulho do YAML: `getByText` com uma frase de
> oitenta colunas não encontra a frase, e `getByText('    total = total + 1')`
> não mede a indentação porque o `getByText` dobra os espaços nas pontas.
>
> **Um `saida` que não pode existir.** O painel de texto tinha um estado
> `saida`; o `avaliarTexto` não produz valores, e o estado era
> estruturalmente impossível de preencher.


**Files:**
- Create: `src/ui/lecao/PassoView.tsx`, `src/ui/lecao/SondasView.tsx`, `src/ui/lecao/Tela.tsx`, `src/ui/lecao/lecao.css`, `src/ui/lecao/SeletorLinguagem.tsx`, `src/ui/lecao/catalogo.ts`, `src/ui/lecao/Aplicacao.tsx`
- Modify: `src/main.tsx`
- Test: `src/ui/lecao/tela.test.tsx`, `src/ui/lecao/entrada.test.tsx`

**Interfaces:**
- Consumes: Task 2 — `avaliador`, `BlocoLeigo`; Task 6 — `emitir`, `divergir`, `classificar`, `ClassesObservadas`; Task 7 — `Licao`, `Passo`, `Sonda`, `CARREGAR`, `TEXTOS`, `temLicao`; Task 9 — `Blocos`; Task 10 — `PainelTexto`, `useLicao`, `EstadoLicao`, `ROTULOS`; Task 11 — `PainelRobo`, `PORTA_ENTRADA`, `PORTA_SAIDA`; Task 1 — `Erro`, `Recusa`, `Valor`, `Language`, `LINGUAGENS`, `NOMES`; Task 4 — `temProjecao`.
- Produces: `Tela`, `TelaProps`, `PassoView`, `PassoViewProps`, `SondasView`, `SondasViewProps`, `SeletorLinguagem`, `SeletorLinguagemProps`, `OpcaoLinguagem`, `CATALOGO`, `Aplicacao`.

- [ ] **Step 1: O motor de blocos passou a dizer o mesmo que o motor de texto**

A tela é a primeira coisa do projecto que obriga a correr um programa pelos
**dois** motores do produto ao mesmo tempo: o `avaliador` de blocos, que é o
que a pessoa corre ao arrastar coisas, e o `avaliarTexto`, que é o que julga
o que a projeção escreveu. São duas implementações da mesma semântica, e uma
implementação que discorda da outra não é uma implementação.

E discordavam. O sintoma era o pior possível, porque as sondagens eram
provadas pelo caminho do texto e a tela corre pelo caminho dos blocos: a
sondagem `guarda-um-texto` esperava `Observacao` e a lição estava provada,
mas a pessoa que fosse fazer o passo 1 batia com uma recusa de tipo em
Python — e a §10 diz que em Python e em JavaScript a `Recusa` nunca
acontece. Onze tarefas não viram isto porque cada uma provava o seu caminho
e nenhuma comparava os dois.

Quatro correcções ao `src/nucleo/avaliador.ts`:

1. `valorDe` trata uma palavra escrita a direito como literal de texto. A
   lição escreve `valor: olá`, a projeção de Python já emitia
   `total = 'olá'`, e o avaliador recusava: duas metades do mesmo motor a
   discordar.
2. `guardar` aceita qualquer valor. A recusa estava escrita no avaliador de
   blocos, e um avaliador de blocos não sabe em que linguagem vive — quem
   recusa é a linguagem (§6.4). A §6.5 põe «escolhe o tipo certo / e se
   guardares texto aqui?» como nível 2 da escada, e a §11.2 dá
   `guardar-palavra-recusa` como exemplo de sondagem, o que situa a recusa
   no `guardar` **em Java**, não no motor.
3. `dizer` aceita qualquer valor, porque `print(5)` é legal em Python, e
   deixa de acrescentar uma `Recusa` a um valor que já tinha falhado. O
   resultado anterior eram duas frases no ecrã ao mesmo tempo sobre o mesmo
   gesto — «a variável "fantasma" ainda não tem valor» e «este sítio só
   aceita texto» — e quem lê as duas aprende que são dois problemas. São um,
   e a segunda frase era falsa.
4. A forma que o motor não sabe ler passou de `Recusa` sobre o tipo a
   `FalhaRuntime` sobre a forma. A frase antiga dizia «este sítio só aceita
   número. Recebeste número», que é uma frase que se nega a si mesma.

Oito testes da Task 2 codificavam a regra antiga — e dois deles diziam que
ela era o comportamento certo, com um comentário a explicar que o segundo
erro era para não passar por engano. Não era engano: era a especificação do
defeito. Todos reescritos, mais três novos.

O teste que se desligou a si próprio pelo caminho vale a pena registar:
«todo erro do motor tem porque e remedio não vazios» iterava a lista de
erros, e com a correcção a lista ficou vazia. O `for` corria zero vezes e o
teste passava a medir o nada. Tem agora um `expect` no meio a garantir que
houve erro.

`src/nucleo/avaliador.ts`:
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
    if (typeof bruto === 'string') {
      // Uma palavra escrita a direito é um literal de texto, e é assim que a
      // lição os escreve: `valor: olá`. A projeção já tratava uma palavra
      // solta como texto — emitia `total = 'olá'` — e os dois lados precisam
      // de dizer a mesma coisa do mesmo programa. Enquanto este ramo não
      // existia, o mesmo `guardar nome = 'olá'` recebia dois veredictos
      // diferentes conforme o caminho por onde entrava: `Observacao` quando
      // vinha do texto, `Recusa` quando vinha dos blocos. Duas implementações
      // da mesma semântica que discordam uma da outra é a forma mais cara de
      // um produto ter sondas que não podem estar erradas.
      return valorCru('texto', bruto, bloco, ranhura, passo);
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
    // Chegou aqui uma forma que nenhuma das formas de valor resolve: um
    // array, ou um objeto sem `txt`, sem `ref` e sem bloco dentro. Isto **não
    // é um tipo errado**, e a diferença é de texto e não de estilo: a
    // mensagem antiga era `Este sítio só aceita número. Recebeste número`, que
    // se contradiz a si mesma e não ensina nada. O que se diz é que o motor
    // não sabe ler o que chegou — que é a verdade, e é uma falha de execução
    // como a do `{ref}` que não existe, não uma recusa de tipo.
    this.trace.falha(
      falhar(
        passo,
        'O que está neste sítio não é um valor que eu saiba ler.',
        `Um valor aqui é um número, uma palavra entre aspas, o nome de uma variável que já tenha valor, ou outro bloco. Recebi ${typeof bruto}, e isso não é nenhum dos quatro.`,
        bloco,
      ),
    );
    return {
      ...valorCru(Array.isArray(bruto) ? 'lista' : 'texto', bruto, bloco, ranhura, passo),
      recusado: true,
    };
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
    // `dizer` é o `print` de Python, e o `print` do Python aceita o que for.
    // A recusa anterior — «O que dizes tem de ser uma palavra» — era uma
    // mentira sobre a linguagem: `print(5)` é legal em Python, e a primeira
    // lição conta precisamente a história de um `print` a imprimir um número.
    //
    // E o segundo efeito era pior do que a mentira. Um `{ref}` que ainda não
    // tem valor já produz a sua `FalhaRuntime` dentro de `valorDe`, e `dizer`
    // acrescentava uma `Recusa` por cima. Um erro, duas mensagens, e as duas
    // no ecrã ao mesmo tempo a dizer coisas que não são ambas verdade — é o
    // que T11 encontrou quando um `log` de uma variável que nunca foi
    // guardada chegou ao robô.
    if (recebido.recusado) return recebido;
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

  it('guardar texto guarda o texto, e não dá erro nenhum', () => {
    // Este nome já foi escrito duas vezes a mentir sobre o que o motor
    // fazia. Na primeira versão dizia «sem erro» num ficheiro em que o
    // teste seguinte provava que havia uma `Recusa`; na segunda dizia que
    // guardar texto «já é um erro». Nas duas o `guardar` recusava texto — e
    // a primeira lição, que diz «guarda um número com o nome total. Depois
    // guarda um texto com o nome nome», era impossível de fazer. Ninguém a
    // completava.
    //
    // A recusa vinha do avaliador de blocos, e um avaliador de blocos não
    // sabe em que linguagem vive: quem recusa é a linguagem (§6.4), e o
    // Python não recusa nada disto. O que rebenta, e rebenta mais tarde, é
    // o `log` de uma variável que nunca foi guardada — que é a história
    // que a lição conta, e o que a §10 diz do Python.
    const a = avaliador();
    const v = a.avaliar('guardar', { nome: 'nome', VALOR: { txt: 'olá' } }, 1);
    expect(v.tipo).toBe('texto');
    expect(v.valor).toBe('olá');
    expect(v.recusado).toBe(false);
    expect(a.trace.erros.length).toBe(0);
  });

  it('o texto guardado volta pelo nome, e continua a ser texto', () => {
    // A ida e a volta é o que interessa: uma variável que se lembra do que
    // ficou lá dentro, e de que tipo esse conteúdo é. Sem a volta, o teste
    // acima provava só que o `guardar` não se queixou — e não que o valor
    // ficou guardado.
    const a = avaliador();
    a.avaliar('guardar', { nome: 'nome', VALOR: { txt: 'olá' } }, 1);
    const v = a.avaliar('dador_num', { VALOR: { ref: 'nome' } }, 1);
    expect(v.tipo).toBe('texto');
    expect(v.valor).toBe('olá');
    expect(a.trace.erros.length).toBe(0);
  });
  it('a única recusa que o motor ainda faz é um número grande demais', () => {
    // Convém dizer isto em voz alta, porque é uma afirmação forte e é o
    // estado real do motor depois desta mudança: nos blocos, **nenhum** tipo
    // é recusado. Quem recusa é a linguagem (§6.4) — o Java escreve
    // `int total = 'olá';` e recusa, e o Python escreve `total = 'olá';` e
    // não recusa, e é essa diferença que o produto existe para mostrar. Um
    // avaliador de blocos que recusasse tipos estaria a decidir por conta
    // própria o que cada linguagem permite, e a lição passava a mentir
    // sobre as seis.
    //
    // A recusa que fica é a do tamanho: um número acima de `RANGE_INTEIROS`
    // não existe em nenhum número das linguagens, e recusá-lo é dizer a
    // verdade sobre todas.
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: 1_000_000 }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('Recusa');
    expect(e && e.classe === 'Recusa' && e.esperado).toBe('número');
    expect(e && e.remedio.length).toBeGreaterThan(0);
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

  it('guardarTexto guarda o mesmo 5 como palavra, e lê-se de volta uma palavra', () => {
    // `guardarTexto` embrulha em `{txt: '5'}`. O `5` que a pessoa escreveu e
    // uma palavra com dois algarismos dentro. Uma variável que guarda uma
    // palavra guarda uma palavra, e o que muda quando se lê de volta é
    // exatamente o que a pessoa escreveu: o valor, não o tipo de quem o
    // escreveu. Este é o parágrafo do ficheiro de leitura que diz que em
    // Python `5` e `'5'` são coisas diferentes, e é o que a sonda
    // `texto-que-nao-e-numero` acaba por mostrar.
    const a = avaliador();
    a.executar(pilha(guardarTexto('total', 5)));
    const guardado = a.trace.valores.find((v) => v.origem.bloco === 'guardar');
    expect(guardado?.tipo).toBe('texto');
    expect(guardado?.valor).toBe('5');
    expect(a.trace.erros.length).toBe(0);
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

  it('aceita um número, porque o print do Python também aceita', () => {
    // A recusa antiga dizia «O que dizes tem de ser uma palavra», e isso é
    // falso: `print(5)` é legal em Python. A primeira lição conta
    // precisamente a história de um `print` a imprimir um número — o
    // ficheiro de leitura tem `print(total)` na sétima linha, e `total`
    // vale 5 na segunda. Um motor que recusa aquele gesto ensina que o
    // Python é uma linguagem que não o deixa.
    const a = avaliador();
    const v = a.avaliar('dizer', { VALOR: 5 }, 1);
    expect(v.tipo).toBe('número');
    expect(v.valor).toBe(5);
    expect(a.trace.erros.length).toBe(0);
  });

  it('um valor que já falhou não ganha uma segunda mensagem pelo caminho', () => {
    // Este teste já existia, e o que afirmava era o contrário do que devia:
    // esperava **dois** erros e dizia que dois era a resposta certa, com um
    // comentário a explicar que lia o último para não passar por engano.
    // Não era engano: era a especificação do defeito.
    //
    // Um `{ref}` que ainda não tem valor já diz o seu erro dentro de
    // `valorDe`, e o `dizer` acrescentava uma `Recusa` por cima. Um gesto, um
    // erro, e no ecrã duas frases ao mesmo tempo: «a variável "fantasma" não
    // tem valor» e «este sítio só aceita texto». Quem lê as duas aprende que
    // são dois problemas, e são um — e a segunda frase era falsa, porque o
    // que chegou não era um número nem uma palavra: era nada.
    const a = avaliador();
    a.avaliar('dizer', { VALOR: { ref: 'fantasma' } }, 1);
    expect(a.trace.erros.length).toBe(1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e?.porque).toContain('fantasma');
  });


describe('valores de entrada', () => {
  it('{txt} é texto', () => {
    expect(avaliador().avaliar('dador_num', { VALOR: { txt: 'x' } }, 1).tipo).toBe('texto');
  });
  it('uma palavra escrita a direito é um literal de texto', () => {
    // É assim que a lição escreve um texto: `valor: olá`, e não
    // `valor: {txt: olá}`. A projeção já tratava a palavra solta como
    // texto — emitia `total = 'olá'` — e o avaliador não: o mesmo programa
    // recebia `Observacao` quando vinha do texto e `Recusa` quando vinha
    // dos blocos. Duas implementações da mesma semântica a discordar uma da
    // outra é a forma mais cara de um produto ter sondas que não podem
    // estar erradas, e foi o que a Task 12 encontrou ao correr a lição da
    // Task 8 pelos blocos.
    const a = avaliador();
    const v = a.avaliar('dador_num', { VALOR: 'olá' }, 1);
    expect(v.tipo).toBe('texto');
    expect(v.valor).toBe('olá');
    expect(a.trace.erros.length).toBe(0);
  });

  it('um número é número', () => {
    expect(avaliador().avaliar('dador_num', { VALOR: 3 }, 1).tipo).toBe('número');
  });
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
  it('uma forma que o motor não sabe ler é FalhaRuntime, e diz que não sabe', () => {
    // Não é um tipo errado: é uma forma que nenhuma das quatro formas de
    // valor resolve. A versão antiga dizia «Este sítio só aceita número.
    // Recebeste número» — uma frase que se nega a si mesma, e uma frase que
    // se nega a si mesma não ensina o tipo de lado nenhum. O produto inteiro
    // existe para trocar adivinhação por razão, e uma razão que se nega a si
    // mesma é a pior das duas.
    const a = avaliador();
    a.avaliar('dador_num', { VALOR: { qqq: 1 } }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('FalhaRuntime');
    expect(e && e.classe === 'FalhaRuntime' && e.porque.length).toBeGreaterThan(0);
    expect(a.trace.erros.length).toBe(1);
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
    // O bloco que falha passou a ser um `log` de uma variável que nunca foi
    // guardada. Era um `dizer` com um número dentro, e deixou de ser quando
    // o `dizer` deixou de recusar números — que é o comportamento certo, e
    // por isso o gatilho deste teste tinha de mudar. Um teste cujo gatilho
    // desapareceu não se apaga: muda de gatilho, ou deixa de provar que a
    // pilha para.
    const a = avaliador();
    a.executar(pilha(guardar('total', 1), log({ ref: 'fantasma' }), log(2)));
    const guardou = a.trace.valores.filter((v) => v.origem.bloco === 'guardar');
    expect(guardou.length).toBe(1);
    expect(a.trace.erros.length).toBe(1);
    expect(a.trace.erros[0]?.origem.bloco).toBe('log');
  });

  it('o bloco depois do erro não corre', () => {
    const a = avaliador();
    a.executar(pilha(guardar('total', 1), log({ ref: 'fantasma' }), guardar('outro', 2)));
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
    // avulso: `inicializa` é o que abre a linha, e é o `avaliar` direto que
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
    //
    // O `expect` do meio não é decoração. Este teste itera uma lista de
    // erros; se o motor deixar de dar erro nenhum, o `for` corre zero vezes
    // e o teste passa a medir o nada. Passou a passar por cima de uma lista
    // vazia até a Task 12 o fazer, e é o mesmo defecto que se viu três
    // vezes nos testes de ecrã.
    const a = avaliador();
    a.avaliar('guardar', { nome: '', VALOR: 1 }, 1);
    a.avaliar('dizer', { VALOR: { ref: 'fantasma' } }, 1);
    a.avaliar('dador_num', { VALOR: { qqq: 1 } }, 1);
    expect(a.trace.erros.length).toBeGreaterThan(0);
    for (const e of a.trace.erros) {
      expect(e.porque.length).toBeGreaterThan(0);
      if ('remedio' in e) expect(e.remedio.length).toBeGreaterThan(0);
    }
  });

  it('nenhum destes gestos inventa um erro', () => {
    // A lista de cima é a lista do que **tem** de dar erro. Esta é a lista
    // do que **não** pode dar, e é tão importante como a outra: um motor
    // que inventa recusas recusa a lição inteira, e o aluno nunca chega ao
    // fim de um passo. Guardar texto, dizer um número e imprimir o que ficou
    // guardado são gestos normais em Python, e nenhum deles pode ser uma
    // recusa — e a palavra escrita a direito é a forma como a lição escreve
    // um texto, que é a forma que a projeção também aceita.
    const gestos: Array<[string, () => Avaliador]> = [
      ['guardar um texto', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'nome', VALOR: { txt: 'olá' } }, 1);
        return a;
      }],
      ['guardar um texto escrito a direito', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 'nome', VALOR: 'olá' }, 1);
        return a;
      }],
      ['dizer um número', () => {
        const a = avaliador();
        a.avaliar('dizer', { VALOR: 5 }, 1);
        return a;
      }],
      ['dizer o que ficou guardado', () => {
        const a = avaliador();
        a.avaliar('guardar', { nome: 't', VALOR: 5 }, 1);
        a.avaliar('dizer', { VALOR: { ref: 't' } }, 1);
        return a;
      }],
      ['três voltas a guardar e a dizer, o programa da ficha em blocos', () => {
        // Um `guardar` e um `dizer` que não se olham um para o outro, porque
        // cada bloco é a sua linha: o âmbito do motor é por bloco, não por
        // pilha (a Task 2 fixou isso, e a ficha de leitura é lida e não
        // executada). Este caso existe para cubrir o laço, a atribuição e o
        // `dizer` ao mesmo tempo — e para que uma mudança futura no âmbito
        // apareça aqui e não na lição.
        const a = avaliador();
        a.executar(repetir(3, [guardar('total', 5), dizer(5)]));
        return a;
      }],
    ];

    for (const [nome, gesto] of gestos) {
      const a = gesto();
      expect(a.trace.erros.length, nome).toBe(0);
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

E o teste que fecha a porta atrás disto, e que é o mais importante do
projecto inteiro — não por ser difícil, mas por medir a **tela**: para cada
passo de cada lição, o programa que o ecrã põe no ecrã tem de dar o mesmo
veredicto nos dois motores; para cada sondagem com programa, os dois motores
concordam entre si e com o que a sondagem espera; todas as sondagens de
todas as lições passam; e os nomes de variável das lições já saem como
identificadores de verdade. Sai de `LICSOES` e de `TEXTOS`, nunca de uma
lista escrita à mão.

Quatro linhas de guarda contra coisas que já aconteceram: um ficheiro que
percorre uma lista vazia passa; dois testes que repetiam o que o carregador
já atira foram removidos, porque não podem ficar vermelhos; e a mutação
que devia ter disparado o teste dos nomes não disparou, porque a mutação
tinha sido feita no vocabulário do topo do YAML e não dentro de um passo.
Feita dentro de um passo, disparou e disse `python: "total_é" vira "total_e"`.

`src/conteudo/acordo.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { CARREGAR, LICSOES, TEXTOS, executarSonda } from './index';
import type { Licao } from './esquema';
import { avaliador } from '../nucleo/avaliador';
import { avaliarTexto, classificar, emitir } from '../projecoes/avaliar';
import type { Bloco } from './esquema';
import type { Language } from '../nucleo/tipos';
import { identificador } from '../nucleo/blocos';

/** Todas as lições que existem, com a linguagem de cada uma.
 *
 *  Sai de `LICSOES` e de `TEXTOS` e não de uma lista escrita à mão. Uma lista
 *  escrita à mão é uma lista de intenções, e a segunda lição entra sem
 *  ninguém se lembrar de a acrescentar aqui — que é exatamente o modo de
 *  falha que este ficheiro existe para apanhar. */
function licoes(): Array<{ linguagem: Language; licao: Licao }> {
  return LICSOES.map((linguagem) => {
    const chave = Object.keys(TEXTOS).find((k) => k.startsWith(`${linguagem}/`));
    if (chave === undefined) throw new Error(`LICSOES tem ${linguagem} e o TEXTOS não`);
    return { linguagem, licao: CARREGAR(TEXTOS[chave] as string, linguagem) };
  });
}

/** O que o motor dá a um programa, pelos dois caminhos.
 *
 *  O produto tem **dois** motores para a mesma semântica: o avaliador de
 *  blocos, que é o que o aluno corre ao arrastar coisas, e o avaliador de
 *  texto, que é o que julga o que a projeção escreveu. São duas
 *  implementações, e uma implementação que discorda da outra não é uma
 *  implementação: é uma sorte.
 *
 *  E a sorte é invisível enquanto ninguém compara as duas. Foi o que
 *  aconteceu com `guardar nome = 'olá'`: o caminho de texto dizia
 *  `Observacao` — que é o que a sondagem `guarda-um-texto` provava — e o
 *  caminho de blocos dizia `Recusa`, com a frase «este sítio só aceita
 *  número. Recebeste número». A lição estava escrita, as sondagens passavam,
 *  e a pessoa que fosse fazer aquele primeiro passo batia com uma parede.
 */
function veredito(programa: Bloco | null): string {
  const pelosBlocos = avaliador();
  pelosBlocos.executar(programa);
  return classificar(pelosBlocos.trace.erros);
}

function vereditoDoTexto(linguagem: Language, programa: Bloco | null): string {
  return classificar(avaliarTexto(linguagem, emitir(linguagem, programa).texto));
}

describe('os dois motores dizem a mesma coisa', () => {
  it('existe pelo menos uma lição, ou este ficheiro não prova nada', () => {
    // Um ficheiro de testes que percorre uma lista vazia passa. Esta linha
    // é a que impede que este ficheiro passe a provar o nada no dia em que
    // as lições mudarem de sítio — que é o mesmo defeito que já apareceu
    // três vezes nos testes de ecrã e uma vez no do motor.
    expect(licoes().length).toBeGreaterThan(0);
  });

  it('para cada passo, o programa que o ecrã põe no ecrã dá o mesmo nos dois motores', () => {
    // Este é o teste mais importante do projecto, e não é sobre a lição: é
    // sobre a **tela**. O ecrã carrega `passo.bloco` no painel de blocos e
    // deixa a pessoa mexer; a sondagem que decide se o passo está feito foi
    // provada pelo caminho do texto. Se os dois discordarem, a sondagem
    // está a medir uma coisa e o ecrã a medir outra, e a pessoa nunca
    // consegue satisfazer a sondagem com o programa que o ecrã lhe deu.
    const divergencias: string[] = [];

    for (const { linguagem, licao } of licoes()) {
      licao.passos.forEach((passo, indice) => {
        const pelosBlocos = veredito(passo.bloco);
        const peloTexto = vereditoDoTexto(linguagem, passo.bloco);
        if (pelosBlocos !== peloTexto) {
          divergencias.push(
            `${linguagem} passo ${indice} (${passo.fase}, sonda ${passo.sonda}): ` +
              `nos blocos deu ${pelosBlocos}, no texto deu ${peloTexto}`,
          );
        }
      });
    }

    expect(divergencias.join('\n')).toBe('');
  });

  it('para cada sondagem com programa, os dois motores concordam com o que ela espera', () => {
    // As sondagens com `prova.texto` não têm blocos com que correr — o
    // ficheiro de quinze linhas, por exemplo, é texto escrito à mão, e não
    // há blocos que o produzam. Essas são julgadas pelo caminho do texto, e
    // `executarSonda` é quem as julga (e tem o seu próprio teste). As
    // sondagens com `prova.programa` têm as duas, e é aí que a divergência
    // se esconde.
    const divergencias: string[] = [];

    for (const { linguagem, licao } of licoes()) {
      for (const sonda of licao.sondas) {
        if (sonda.prova.forma !== 'programa' || sonda.prova.programa === undefined) continue;
        const pelosBlocos = veredito(sonda.prova.programa);
        const peloTexto = vereditoDoTexto(linguagem, sonda.prova.programa);
        const esperada = sonda.esperado.classe;
        if (pelosBlocos !== peloTexto || pelosBlocos !== esperada) {
          divergencias.push(
            `${linguagem} sonda ${sonda.nome}: esperava ${esperada}, ` +
              `nos blocos deu ${pelosBlocos}, no texto deu ${peloTexto}`,
          );
        }
      }
    }

    expect(divergencias.join('\n')).toBe('');
  });

  it('nenhuma sondagem de bloco de uma lição sem blocos tem programa', () => {
    // Uma sondagem que promete um programa e não o tem é uma sondagem
    // vazia: `executarSonda` recusa-a, o que é certo, mas a recusa aparece
    // em `executarSonda` e não aqui, e quem lê o erro tem de saber de que
    // sondagem é que se trata. A lista abaixo é a lista do que este ficheiro
    // está a olhar, e ela não pode estar vazia nem meter coisas que não
    // são programas.
    const contadas: string[] = [];
    for (const { linguagem, licao } of licoes()) {
      for (const sonda of licao.sondas) {
        if (sonda.prova.forma !== 'programa') continue;
        contadas.push(`${linguagem}/${sonda.nome}`);
        // Uma sondagem da família dos blocos que não traz nem programa nem
        // texto não prova nada, e o `executarSonda` recusa-a — mas o nome da
        // sondagem no aviso tem de dizer de que linguagem é, senão o aviso
        // de uma lição de Java parece o de uma de Python.
        const temProva = sonda.prova.programa !== undefined || sonda.prova.texto !== undefined;
        expect(temProva, `${linguagem}/${sonda.nome}`).toBe(true);
      }
    }
    expect(contadas.length).toBeGreaterThan(0);
  });
});

describe('as sondagens de todas as lições estão provadas', () => {
  it('cada sondagem passa no motor, em todas as lições', () => {
    // A promessa da §11.2 é que uma sondagem não pode estar errada, porque
    // corre no mesmo motor que a vê. Este teste generaliza a promessa: até
    // agora só a lição de Python a provava, e uma segunda lição de outra
    // linguagem podia trazer uma sondagem errada sem que nada ficasse
    // vermelho.
    const falhas: string[] = [];
    let quantas = 0;

    for (const { linguagem, licao } of licoes()) {
      for (const sonda of licao.sondas) {
        quantas += 1;
        const r = executarSonda(sonda, linguagem);
        if (!r.ok) falhas.push(`${linguagem} ${sonda.nome}: ${r.erro ?? '?'}`);
      }
    }

    expect(quantas).toBeGreaterThan(0);
    expect(falhas.join('\n')).toBe('');
  });

  it('cada passo diz à pessoa o que tem de fazer', () => {
    // O `porque` do passo é a instrução, e o `texto` do momento é a pergunta
    // que fica à espera enquanto a pessoa trabalha. São as duas únicas frases
    // que o ecrã mostra sem mais nada, e um passo com uma delas vazia é um
    // ecrã com um bloco e um silêncio.
    //
    // Repara no que este teste **não** repete: que a sonda existe e que o
    // passo tem momentos. O carregador já atira `ErroDeAutoria` nas duas
    // coisas, e um teste que repete uma verificação que já está noutro sítio
    // é um teste que nunca pode ficar vermelho — a pior sorte de teste, porque
    // parece que cobre alguma coisa.
    const mudos: string[] = [];
    for (const { linguagem, licao } of licoes()) {
      licao.passos.forEach((passo, indice) => {
        const onde = `${linguagem} passo ${indice}`;
        if (passo.porque.trim().length === 0) mudos.push(`${onde}: o passo não diz o que fazer`);
        for (const momento of passo.momentos) {
          if (momento.texto.trim().length === 0) mudos.push(`${onde}: o momento ${momento.id} está vazio`);
        }
      });
    }
    expect(mudos.join('\n')).toBe('');
  });

  it('todo nome de variável das lições é um identificador de verdade', () => {
    // `identificador` é a função que decide o que o nome escrito pelo aluno
    // vira no ficheiro: `class` vira `class_`, `1total` vira `v_1total`, e um
    // nome com acento perde o acento. Se uma lição escrever um nome que o
    // identificador muda, o ecrã mostra uma coisa e o ficheiro outra, e a
    // comparação de divergências aponta para a linha errada. A lição tem de
    // escrever o nome **já** com a forma que vai para o ficheiro.
    const mudados: string[] = [];
    for (const { linguagem, licao } of licoes()) {
      const nomes = new Set<string>();
      varre(licao.passos.map((p) => p.bloco), (nome) => nomes.add(nome));
      for (const nome of nomes) {
        if (identificador(nome) !== nome) {
          mudados.push(`${linguagem}: "${nome}" vira "${identificador(nome)}"`);
        }
      }
    }
    expect(mudados.join('\n')).toBe('');
  });
});

/** Uma ranhura tal como a lição a escreve: `valor` para o que entra
 *  num sítio, `stack` para o corpo de um laço, e `bloco` dentro de `valor`
 *  quando o que entra é outro bloco. Os três vivem no mesmo sítio e é a
 *  distinção entre eles que faz a busca ser rasa ou completa. */
type Ranhura = { valor?: unknown; stack?: Bloco[]; bloco?: Bloco };

/** Todos os `fields.nome.valor` que aparecem num programa, a qualquer
 *  profundidade.
 *
 *  Uma sondagem que escrevesse um nome com acento passava despercebida se a
 *  busca fosse rasa, e a busca rasa é o que dá a ilusão de que se olhou
 *  tudo. Por isso a função desce a `stack` e a `bloco`, e não só ao primeiro
 *  nível — e por isso recebe uma lista tanto como um bloco, porque os
 *  passos de uma lição são uma lista. */
function varre(programa: Bloco | Bloco[] | null, achou: (nome: string) => void): void {
  if (programa === null) return;
  if (Array.isArray(programa)) {
    for (const b of programa) varre(b, achou);
    return;
  }
  const nome = programa.fields?.nome?.valor;
  if (typeof nome === 'string' && nome.length > 0) achou(nome);
  const inputs = programa.inputs;
  if (inputs === undefined) return;
  for (const ranhura of Object.values(inputs) as Ranhura[]) {
    if (ranhura === undefined || ranhura === null) continue;
    if (ranhura.stack !== undefined) for (const b of ranhura.stack) varre(b, achou);
    const bruto = ranhura.valor;
    if (bruto !== null && typeof bruto === 'object' && 'bloco' in bruto) {
      varre((bruto as { bloco: Bloco }).bloco, achou);
    }
    if (ranhura.bloco !== undefined) varre(ranhura.bloco, achou);
  }
}
```

- [ ] **Step 2: Escrever o teste falhado**

`src/ui/lecao/tela.test.tsx`:
```typescript
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tela } from './Tela';
import { CARREGAR } from '../../conteudo';
import type { Bloco, Licao, Momento, Passo } from '../../conteudo/esquema';
import { avaliador } from '../../nucleo/avaliador';
import type { BlocoLeigo } from '../../nucleo/avaliador';
import { classificar, divergir, emitir } from '../../projecoes/avaliar';
import { ROTULOS } from '../tipos';

/** A regra de todas as asserções de texto deste ficheiro.
 *
 *  Nenhuma pergunta de uma lição é escrita aqui. A lição é YAML, e o YAML
 *  quebra as frases de `porque` em linhas de oitenta colunas e volta a
 *  juntá-las; um `getByText` com uma frase tirada de uma linha do ficheiro
 *  falha por causa do embrulho, e o ficheiro de testes acaba a ser uma
 *  segunda cópia da lição que diverge no primeiro parágrafo que alguém
 *  reescreva. Por isso a comparação é sempre sobre o `textContent` do
 *  ecrã inteiro, que é o que a pessoa lê. */
function textoDoEcran(): string {
  return document.body.textContent ?? '';
}

function ecra(): HTMLElement {
  const achado = document.querySelector('main.tela');
  if (achado === null) throw new Error('a lição não está no ecrã');
  return achado as HTMLElement;
}

let LICAO: Licao;

beforeAll(async () => {
  LICAO = await carregada();
});

async function carregada(): Promise<Licao> {
  const { default: bruto } = await import('../../conteudo/python/variavel.yml?raw');
  return CARREGAR(bruto, 'python');
}

/** O índice do primeiro passo que a sondagem deixa por satisfazer no
 *  programa que o ecrã lhe dá. Existe porque o ecrã **tem** de ter um momento
 *  em que a resposta ainda não é a esperada: sem ele, um ecrã que aceita
 *  tudo passa nos mesmos testes que um ecrã que não sabe o que viu. */
function passoQueNaoBasta(): { indice: number; passo: Passo } {
  const achado = LICAO.passos.findIndex((p, i) => {
    const sonda = LICAO.sondas.find((s) => s.nome === p.sonda);
    if (sonda === undefined) return false;
    return classificar(errosDe(p.bloco)) !== sonda.esperado.classe;
  });
  if (achado < 0) throw new Error('nenhum passo é um teste negativo');
  return { indice: achado, passo: LICAO.passos[achado] as Passo };
}

/** O primeiro passo cujo programa já chega ao que a sondagem espera. */
function passoQueBasta(): { indice: number; passo: Passo } {
  const achado = LICAO.passos.findIndex((p) => {
    const sonda = LICAO.sondas.find((s) => s.nome === p.sonda);
    if (sonda === undefined) return false;
    return classificar(errosDe(p.bloco)) === sonda.esperado.classe;
  });
  if (achado < 0) throw new Error('nenhum passo satisfaz a sua sondagem');
  return { indice: achado, passo: LICAO.passos[achado] as Passo };
}

function errosDe(bloco: BlocoLeigo | null) {
  const a = avaliador();
  a.executar(bloco);
  return a.trace.erros;
}

/** Clica em «Correr o programa» e devolve o que o ecrã disse. */
function correr(): void {
  const botao = screen.queryByRole('button', { name: 'Correr o programa' });
  if (botao === null) throw new Error('não há botão de correr neste momento');
  fireEvent.click(botao);
}

/** Clica no botão cujo nome começa por `nome`. Devolve o que estava lá, ou
 *  atira, que é a mesma coisa: um botão que não existe quando se devia
 *  existir é um defeito, e dizer qual faltou é o diagnóstico. */
function carregar(nome: string): void {
  const botao = screen.getByRole('button', { name: new RegExp(`^${nome}`) });
  fireEvent.click(botao);
}

function abrir(indice: number): void {
  render(<Tela linguagem="python" licao={LICAO} passoInicial={indice} />);
}

/** Quanto tempo um teste que monta o ecrã de cada passo precisa.
 *
 *  Montar o ecrã de um passo é montar o Blockly, e o Blockly não é rápido:
 *  regista blocos, mede o SVG que o jsdom não sabe medir, e monta a
 *  ferramenta. O produto nunca monta onze — monta um — mas um teste que
 *  percorre a lição toda monta onze, e onze montagens em paralelo com os
 *  outros ficheiros passam dos cinco segundos que é o limite por omissão.
 *
 *  O limite escreve-se à mão em vez de se subir o global, porque subir o
 *  global é dizer que todos os testes são lentos quando este é lento por uma
 *  razão que só este tem. */
const PASSO_A_PASSO = 20_000;

describe('O ecrã da lição', () => {
  it('abre no primeiro passo, e não num ecrã vazio', () => {
    // Uma pessoa que escolhe uma linguagem tem de aterrar em qualquer coisa
    // que se possa ler. Um ecrã com o título e nada mais é um ecrã de erro
    // que não parece de erro.
    abrir(0);
    expect(screen.getByRole('heading', { level: 1, name: LICAO.titulo })).toBeInTheDocument();
    expect(textoDoEcran()).toContain(LICAO.porqueTitulo.trim());
    expect(textoDoEcran()).toContain(LICAO.passos[0]?.porque.trim());
  }, PASSO_A_PASSO);

  it('diz em que passo está e o que esse passo é', () => {
    // Quem não sabe onde vai não sabe se já chegou. E o rótulo da fase é o
    // que diz o que se espera de quem está ali: ler, fazer, ou dar nome.
    abrir(3);
    expect(textoDoEcran()).toContain(`Passo 4 de ${LICAO.passos.length}`);
    expect(textoDoEcran()).toContain(ROTULOS[LICAO.passos[3]?.fase ?? 'fazer']);
  }, PASSO_A_PASSO);

  it('cada passo mostra a sua instrução, e não a de outro', () => {
    // A instrução é o `porque` do passo. Uma ecrã que mostrasse sempre o
    // primeiro `porque` da lição pareceria funcionar: há texto, o texto é
    // verdade, e a pessoa faz a coisa errada com a confiança de quem fez
    // a coisa certa.
    for (const [indice, passo] of LICAO.passos.entries()) {
      const { unmount } = render(
        <Tela linguagem="python" licao={LICAO} passoInicial={indice} />,
      );
      expect(textoDoEcran(), `passo ${indice}`).toContain(passo.porque.trim());
      unmount();
    }
  }, PASSO_A_PASSO);

  it('um passo de nomear mostra a palavra, e só um passo de nomear mostra', () => {
    // `variável`, `atribuição` e `erro de execução` são as três palavras que
    // esta lição quer que fiquem. Um passo que as mostra quando não deve
    // está a dar a resposta antes de a pergunta.
    const nomeares = LICAO.passos.filter((p) => p.fase === 'nomear');
    expect(nomeares.length).toBeGreaterThan(0);
    for (const [indice, passo] of LICAO.passos.entries()) {
      const { unmount } = render(
        <Tela linguagem="python" licao={LICAO} passoInicial={indice} />,
      );
      const ecraActual = ecra();
      if (passo.fase === 'nomear') {
        const palavra = ecraActual.querySelector('.passo-palavra');
        expect(palavra?.textContent, `passo ${indice}`).toBe(passo.nomear);
      } else {
        expect(ecraActual.querySelector('.passo-palavra'), `passo ${indice}`).toBeNull();
      }
      unmount();
    }
  }, PASSO_A_PASSO);
});

describe('O painel segue a fonte do momento', () => {
  it('um momento de blocos traz os blocos, o robô e o botão de correr', () => {
    // A fonte é o que decide o painel, e não a fase. Há `explicar` com
    // blocos e `nomear` com blocos, e há um `fazer` que vai trazer o editor
    // de texto. Um ecrã que escolhesse pelo passo em vez do momento teria
    // de repetir a decisão em mais sítio, e os dois sítios divergem.
    abrir(0);
    expect(screen.getByTestId('area-blocos')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'O robô' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Correr o programa' })).toBeInTheDocument();
  }, PASSO_A_PASSO);

  it('a lição de Python não tem um único momento de texto, e o ecrã não finge que tem', () => {
    // Este teste diz uma coisa verdadeira e chata: a primeira lição é toda de
    // blocos e de leitura. O editor de texto existe, é usado pelo menos por
    // um teste, e aparece em nenhum passo desta lição — e um teste que
    // dissesse que aparece mentiria sobre a lição. A lição derivada abaixo
    // é quem o exercita, e diz no seu nome porque é que existe.
    const comTexto = LICAO.passos.flatMap((p) => p.momentos).filter((m) => m.fonte === 'texto');
    expect(comTexto).toHaveLength(0);
    abrir(0);
    expect(screen.queryByLabelText(/O teu código em/)).not.toBeInTheDocument();
  }, PASSO_A_PASSO);

  it('um momento de texto traz o editor e tira os blocos', () => {
    // E o inverso do teste acima: quando o momento é de texto, o ecrã não
    // mostra ao mesmo tempo o editor e a área de blocos. Mostrar os dois é
    // oferecer duas maneiras de fazer a mesma coisa sem dizer qual é a
    // certa, e a pessoa perde tempo a experimentar.
    //
    // A lição derivada é a única coisa montada neste teste. Com um ecrã de
    // blocos do lado, o `not.toBeInTheDocument` media o ecrã do outro passo e
    // passava sem dizer nada sobre o editor.
    const derivada = comPrimeiroMomentoDeTexto();
    render(<Tela linguagem="python" licao={derivada} />);
    expect(screen.getByLabelText(/O teu código em/)).toBeInTheDocument();
    expect(screen.queryByTestId('area-blocos')).not.toBeInTheDocument();
    expect(screen.queryByTestId('robo')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Correr o programa' })).not.toBeInTheDocument();
  }, PASSO_A_PASSO);

  it('o editor diz em que linguagem se escreve, e escreve o que o passo traz', () => {
    // O `id` do editor é `codigo-<linguagem>`, e o texto que lá está é o do
    // passo. Um editor vazio num momento de texto é um editor que pede ao
    // aluno para escrever o ficheiro inteiro antes de ele saber o que o
    // ficheiro é.
    const derivada = comPrimeiroMomentoDeTexto();
    render(<Tela linguagem="python" licao={derivada} />);
    const editor = screen.getByLabelText(/O teu código em/);
    expect(editor).toHaveAttribute('id', 'codigo-python');
  }, PASSO_A_PASSO);
});

describe('O programa do passo já está no ecrã quando a pessoa chega', () => {
  it('correr sem mexer em nada dá o mesmo veredicto que o bloco do passo', () => {
    // Esta é a prova de que o ecrã carrega o programa do passo. Corre-se sem
    // tocar em nada e compara-se com o que o motor diz desse mesmo programa
    // fora do ecrã: se o painel abrisse vazio, o veredicto seria o de um
    // programa vazio, e a diferença apareceria aqui em pelo menos um dos
    // onze passos.
    //
    // A ficha fica de fora, e por uma razão que é a lição e não o teste: o
    // passo que manda ler um ficheiro não tem blocos para correr, e o que
    // se corre ali é o ficheiro — o que o painel de texto e a sondagem de
    // texto medem, e é o objeto do passo oito. Um botão de «Correr» num
    // passo de leitura correria o programa errado, e a pessoa acharia que
    // tinha corrido o ficheiro.
    for (const [indice, passo] of LICAO.passos.entries()) {
      if (passo.momentos.some((m) => m.fonte !== 'blocos')) continue;
      const { unmount } = render(
        <Tela linguagem="python" licao={LICAO} passoInicial={indice} />,
      );
      const esperada = classificar(errosDe(passo.bloco));
      const antes = ecra().querySelector('.sonda-veredicto')?.textContent ?? '';
      // Antes de correr não há veredicto. Um ecrã que mostra um veredicto sem
      // corrida está a dizer que a pessoa viu o que não viu.
      expect(antes, `passo ${indice}, sem correr`).toBe('');
      correr();
      const dita = ecra().querySelector('.sonda-veredicto')?.textContent ?? '';
      // O veredicto do ecrã é uma frase, e a frase tem de conter a classe
      // que o motor deu ao bloco do passo — não a classe que a sondagem
      // queria, que é uma coisa diferente e é o que o teste seguinte mede.
      expect(dita, `passo ${indice}`).toContain(esperada);
      unmount();
    }
  }, PASSO_A_PASSO);

  it('quando o programa do passo já dá o erro, um único correr diz que viu', () => {
    // O caso feliz do gate: o programa que o ecrã dá já é o que a sondagem
    // queria, e a pessoa que carrega em «Correr» vê o que a lição promete.
    const { indice } = passoQueBasta();
    abrir(indice);
    correr();
    expect(ecra().querySelector('.sonda-veredicto')?.textContent ?? '').toContain('viste');
  }, PASSO_A_PASSO);

  it('quando o programa do passo ainda não dá o erro, o ecrã diz o que aconteceu e não diz que viste', () => {
    // O caso negativo, e é o que dá sentido ao primeiro. Sem ele, um ecrã
    // que aceita tudo — ou que diz sempre «viste» — passava nos mesmos
    // testes. Aqui o programa do passo ainda não chega ao que a sondagem
    // espera, e o ecrã tem de dizer o que aconteceu em vez de dar a
    // estória boa.
    const { indice } = passoQueNaoBasta();
    abrir(indice);
    correr();
    const veredicto = ecra().querySelector('.sonda-veredicto')?.textContent ?? '';
    expect(veredicto).not.toContain('viste');
    expect(veredicto).toMatch(/O que aconteceu|aconteceu/i);
  }, PASSO_A_PASSO);

  it('quando não acontece nada, o ecrã diz que não aconteceu nada', () => {
    // Passo 4 da lição: o programa que o ecrã dá é `total = 'olá'`, que em
    // Python corre sem queixar-se, e a sondagem quer um erro. O ecrã não
    // pode inventar uma falha para preencher o sítio — e o que honesto é
    // dizer que o programa passou sem dar nada, porque é isso que aconteceu
    // e é isso que a pessoa tem de preencher.
    const { indice } = passoQueNaoBasta();
    abrir(indice);
    correr();
    const veredicto = ecra().querySelector('.sonda-veredicto')?.textContent ?? '';
    expect(veredicto).toMatch(/Observacao/);
    expect(veredicto).toMatch(/não aconteceu nada|Nada aconteceu/i);
  }, PASSO_A_PASSO);
});

describe('O que o motor diz quando o programa falha', () => {
  it('a razão e o conserto que o motor sugere aparecem no ecrã', () => {
    // A sondagem é o que julga, mas quem escreve a razão é o motor, e é o
    // motor que sabe qual das coisas correram. Um ecrã que dissesse só
    // «errado» obriga a pessoa a adivinhar, e é o oposto do produto.
    //
    // A lição de Python é usada aqui derivada. Dos onze passos dela, os
    // dois que divergem da sondagem não têm erro nenhum — o Python não se
    // queixa, que é metade do que a lição ensina — e os que têm erro batem
    // com a sondagem. Não há, portanto, nenhum passo da lição de verdade
    // onde o ecrã tenha de mostrar uma falha: o caminho está por medir.
    const derivada = comProgramaQueFalha();
    const erros = errosDe(derivada.passos[0]?.bloco ?? null);
    expect(erros.length).toBeGreaterThan(0);
    const primeiro = erros[0];
    render(<Tela linguagem="python" licao={derivada} />);
    correr();
    const painel = ecra().querySelector('.erros');
    expect(painel, 'sem erros no ecrã').not.toBeNull();
    if (primeiro !== undefined) {
      expect(painel?.textContent ?? '').toContain(primeiro.porque);
      if ('remedio' in primeiro) expect(painel?.textContent ?? '').toContain(primeiro.remedio);
    }
  }, PASSO_A_PASSO);

  it('o nome da variável que falta é dito à pessoa, e não só «erro»', () => {
    // O ponto 3 do `Review Focus`. Um erro que não diz qual é a variável
    // obriga a pessoa a ler o programa à procura de um nome, e o programa
    // é a coisa que ela ainda está a aprender a ler.
    const derivada = comProgramaQueFalha();
    const primeiro = errosDe(derivada.passos[0]?.bloco ?? null)[0];
    render(<Tela linguagem="python" licao={derivada} />);
    correr();
    const painel = ecra().querySelector('.erros')?.textContent ?? '';
    expect(primeiro?.porque ?? '').toContain('total');
    expect(painel).toContain('total');
  }, PASSO_A_PASSO);

  it('os erros desaparecem quando o passo muda', () => {
    // Um erro é o que aconteceu numa corrida. Mostrá-lo no passo seguinte
    // é pôr no ecrã uma falha que já não é do programa que está lá, e a
    // pessoa passa a depurar código que não é o dela.
    const derivada = comProgramaQueFalha();
    render(<Tela linguagem="python" licao={derivada} />);
    correr();
    expect(ecra().querySelector('.erros')).not.toBeNull();
    carregar('Ver a resposta');
    carregar('Continuar');
    expect(ecra().querySelector('.erros')).toBeNull();
  }, PASSO_A_PASSO);
});

describe('Continuar', () => {
  it('passa de um momento para o seguinte dentro do mesmo passo', () => {
    // O passo da ficha tem quinze perguntas, uma por linha. Passar de
    // pergunta é a coisa mais banal do ecrã e a que mais vezes se estraga.
    const ficha = LICAO.passos.findIndex((p) => p.referencia !== undefined);
    expect(ficha).toBeGreaterThanOrEqual(0);
    abrir(ficha);
    expect(textoDoEcran()).toContain(LICAO.passos[ficha]?.momentos[0]?.texto ?? 'x');
    carregar('Continuar');
    expect(textoDoEcran()).toContain(LICAO.passos[ficha]?.momentos[1]?.texto ?? 'x');
  }, PASSO_A_PASSO);

  it('no último momento passa para o passo seguinte', () => {
    // O botão que só avançava momento deixava a pessoa presa no fim do
    // último momento, e não havia outro caminho: um ecrã onde se pode ficar
    // sem saída é um ecrã onde se pode perder a lição.
    const ficha = LICAO.passos.findIndex((p) => p.referencia !== undefined);
    const passo = LICAO.passos[ficha];
    if (passo === undefined) throw new Error('a lição não tem ficha');
    abrir(ficha);
    for (const momento of passo.momentos) {
      // Cada linha pergunta uma coisa, e a pergunta não se responde sozinha.
      // Sem isto o botão fica batendo na última pergunta sem sair, e o
      // teste passava a medir uma coisa que a pessoa também não conseguiria.
      fireEvent.change(screen.getByLabelText('A tua resposta'), {
        target: { value: momento.palavras[0] ?? 'resposta' },
      });
      carregar('Continuar');
    }
    expect(textoDoEcran()).toContain(`Passo ${ficha + 2} de ${LICAO.passos.length}`);
  }, PASSO_A_PASSO);

  it('num passo de um momento só, «Continuar» leva ao passo seguinte', () => {
    // Dez dos onze passos são de um momento só. Se «Continuar» não atravessa
    // um momento, não os atravessa.
    abrir(0);
    correr();
    carregar('Continuar');
    expect(textoDoEcran()).toContain(`Passo 2 de ${LICAO.passos.length}`);
  }, PASSO_A_PASSO);

  it('não atravessa um momento que ainda não foi visto, e diz o que falta', () => {
    // O probe decide se o momento está visto — mas o ecrã tem de dizer isso,
    // não advance em silêncio e não fique à espera de um clique que não
    // muda nada. Uma pessoa que clica e nada acontece não sabe se errou.
    abrir(0);
    carregar('Continuar');
    expect(textoDoEcran()).toContain(`Passo 1 de ${LICAO.passos.length}`);
    expect(textoDoEcran()).toMatch(/falta|não.*visto|correr/i);
  }, PASSO_A_PASSO);

  it('uma corrida que não bate com a sondagem não abre a porta', () => {
    // O teste acima mede o que o ecrã **diz**; este mede o que o ecrã
    // **deixa fazer**. São coisas diferentes, e o buraco entre elas foi
    // encontrado por mutação: com a sondagem a deixar de decidir quem viu —
    // a pessoa fez o que fez e o momento ficou visto na mesma — todos os
    // testes passavam. O que se vê é que a corrida não abre a porta, e a
    // linha do que falta continua lá depois de correr.
    const { indice } = passoQueNaoBasta();
    abrir(indice);
    correr();
    expect(ecra().querySelector('.passo-falta'), 'a linha do que falta desapareceu').not.toBeNull();
    carregar('Continuar');
    expect(textoDoEcran()).toContain(`Passo ${indice + 1} de ${LICAO.passos.length}`);
  }, PASSO_A_PASSO);

  it('uma corrida que bate com a sondagem abre a porta sem o reveal', () => {
    // E o inverso, pelo mesmo caminho: sem isto, «a corrida não abre» podia
    // passar porque a porta nunca abreva. Correr chega.
    const { indice } = passoQueBasta();
    abrir(indice);
    correr();
    expect(ecra().querySelector('.passo-falta'), 'o momento ficou por ver').toBeNull();
    carregar('Continuar');
    expect(textoDoEcran()).toContain(`Passo ${indice + 2} de ${LICAO.passos.length}`);
  }, PASSO_A_PASSO);

  it('«Ver a resposta» marca o momento como visto e diz que foi revelada', () => {
    // A fuga honesta. A sondagem é o que julga, mas uma pessoa que não
    // consegue ver não fica presa: há uma saída, e a saída diz na cara que
    // foi uma saída. Um botão que marcasse sem dizer seria a mesma
    // mentira que a do probe silencioso, só que mais pequena.
    abrir(0);
    carregar('Ver a resposta');
    expect(ecra().querySelector('.sonda-revelada')?.textContent ?? '').toMatch(
      /revelad|não.*descobriste/i,
    );
    carregar('Continuar');
    expect(textoDoEcran()).toContain(`Passo 2 de ${LICAO.passos.length}`);
  }, PASSO_A_PASSO);

  it('a resposta revelada é a razão esperada pela sondagem, e não a do motor', () => {
    // São duas fontes diferentes e é uma distinção que vale a pena manter
    // no ecrã: `esperado.porque` é o que a lição quer que a pessoa veja, e
    // a do motor é o que o programa fez. Misturar as duas punha no ecrã uma
    // frase que ninguém escreveu.
    const { indice, passo } = passoQueBasta();
    const sonda = LICAO.sondas.find((s) => s.nome === passo.sonda);
    abrir(indice);
    carregar('Ver a resposta');
    expect(textoDoEcran()).toContain((sonda?.esperado.porque ?? '').trim());
  }, PASSO_A_PASSO);
});

describe('A ficha de leitura', () => {
  it('mostra as linhas do ficheiro com a indentação que ele tem', () => {
    // A linha 6 do ficheiro está dentro de um laço e é essa indentação que
    // diz à pessoa que ela corre três vezes. Um ecrã que a tirasse mostrava
    // um ficheiro que não é o ficheiro, e a pergunta da linha 6 ficava sem
    // resposta possível.
    const ficha = LICAO.passos.findIndex((p) => p.referencia !== undefined);
    const passo = LICAO.passos[ficha];
    if (passo === undefined) throw new Error('a lição não tem ficha');
    const sonda = LICAO.sondas.find((s) => s.nome === passo.sonda);
    const linhas = (sonda?.prova.texto ?? '').trimEnd().split('\n');
    abrir(ficha);
    expect(ecra().querySelector('.ficha-nome')?.textContent).toBe(
      passo.referencia?.nome,
    );
    expect(ecra().querySelectorAll('.ficha-linha')).toHaveLength(linhas.length);
    // Linha 6, a que está dentro do laço. A comparação é sobre o
    // `textContent` cru e não sobre o texto do ecrã, porque o `textContent`
    // do ecrã tem a pergunta por cima.
    const sexta = ecra().querySelector('[data-linha="6"]');
    expect(sexta?.textContent).toBe(linhas[5]);
    expect(sexta?.textContent?.startsWith('    ')).toBe(true);
  }, PASSO_A_PASSO);

  it('pergunta linha a linha, e uma resposta com a palavra conta', () => {
    // A palavra não é a única resposta certa: `palavras` é uma lista, e
    // qualquer uma delas chega. Uma resposta que não tenha nenhuma das
    // palavras não é «errada» — não é resposta nenhuma, e o ecrã diz o que
    // falta sem dizer que a pessoa errou.
    const ficha = LICAO.passos.findIndex((p) => p.referencia !== undefined);
    const passo = LICAO.passos[ficha];
    const momento = passo?.momentos[0] as Momento | undefined;
    if (momento === undefined) throw new Error('a ficha não tem perguntas');
    abrir(ficha);
    const campo = screen.getByLabelText('A tua resposta');
    fireEvent.change(campo, { target: { value: momento.palavras[0] ?? '' } });
    carregar('Continuar');
    expect(textoDoEcran()).toContain(passo?.momentos[1]?.texto ?? 'x');
  }, PASSO_A_PASSO);

  it('uma resposta sem as palavras não é tratada como resposta, e o ecrã não diz «errado»', () => {
    // A §11 do produto: não há respostas erradas, há respostas que não dizem
    // o que a linha fazia. A diferença é entre o produto e um questionário,
    // e o teste é «nenhum sítio do ecrã diz que a resposta está errada».
    const ficha = LICAO.passos.findIndex((p) => p.referencia !== undefined);
    abrir(ficha);
    fireEvent.change(screen.getByLabelText('A tua resposta'), {
      target: { value: 'asdkjhaskdjh' },
    });
    carregar('Continuar');
    expect(textoDoEcran()).not.toMatch(/errad|incorreto|wrong/i);
    expect(textoDoEcran()).toMatch(/falt|não.*cont/i);
  }, PASSO_A_PASSO);

  it('a ficha só aparece no passo que a manda ler', () => {
    // Nove dos onze passos não têm ficha. Uma ficha em todos seria um
    // ficheiro a mais a ler, e a lição desta vez seria sobre um ficheiro
    // que a lição não está a ensinar.
    for (const [indice, passo] of LICAO.passos.entries()) {
      const { unmount } = render(
        <Tela linguagem="python" licao={LICAO} passoInicial={indice} />,
      );
      const fichaActual = ecra().querySelector('.ficha');
      if (passo.referencia === undefined) {
        expect(fichaActual, `passo ${indice}`).toBeNull();
      } else {
        expect(fichaActual, `passo ${indice}`).not.toBeNull();
      }
      unmount();
    }
  }, PASSO_A_PASSO);
});

describe('O painel de texto diz onde o texto se afasta dos blocos', () => {
  it('escrever no editor mostra o que diverge do que os blocos escrevem', () => {
    // A divergência é a T6: o que a pessoa escreveu ao dedo contra o que os
    // blocos que ela viu produziriam. Sem esta linha, o editor de texto é um
    // lugar onde se escreve e não se sabe se se escreveu bem.
    //
    // O botão «Executar» e não a espera pelo temporizador: o painel tem um
    // atraso de duzentos e cinquenta milissegundos para não comparar a cada
    // tecla, e um teste que espera por um relógio que não controla mede o
    // relógio.
    const derivada = comPrimeiroMomentoDeTexto();
    const bloco = blocoDe(derivada);
    const gerado = emitir('python', bloco).texto;
    // Uma troca de nome, e não de um sinal. `total = 5` reescrito como
    // `total += 5` são dois caracteres de diferença, e a tolerância de dois
    // caracteres existe de propósito para apanhar quem escreve à pressa: essa
    // reescrita **não** é divergência, e um teste que a tomasse por
    // divergência estaria a mandar o ecrã gritar com quem só tropeçou.
    const escrito = gerado.replace('total', 'preco');
    const relatorio = divergir('python', bloco, escrito);
    expect(relatorio.ok, 'o texto com outro nome devia divergir').toBe(false);
    expect(
      divergir('python', bloco, gerado.replace('=', '+=')).ok,
      'uma troca de dois caracteres não é divergência',
    ).toBe(true);
    render(<Tela linguagem="python" licao={derivada} />);
    fireEvent.change(screen.getByLabelText(/O teu código em/), { target: { value: escrito } });
    fireEvent.click(screen.getByRole('button', { name: 'Executar' }));
    const painel = ecra().querySelector('.divergencias');
    expect(painel, 'sem divergências no ecrã').not.toBeNull();
    for (const d of relatorio.divergencias) {
      expect(painel?.textContent ?? '').toContain(d.porque);
    }
  }, PASSO_A_PASSO);

  it('escrever o que os blocos escreveriam não mostra divergência nenhuma', () => {
    // E o inverso: um ecrã que mostra divergências quando não há nenhuma é
    // um ecrã que não sabe quando calar-se, e é a mesma do que mostra
    // «viste» sem ter visto. Este teste só vale se comparar pelo mesmo
    // caminho do outro — daí o «Executar» nos dois.
    const derivada = comPrimeiroMomentoDeTexto();
    const bloco = blocoDe(derivada);
    const gerado = emitir('python', bloco).texto;
    expect(divergir('python', bloco, gerado).ok, 'o texto igual devia estar certo').toBe(true);
    render(<Tela linguagem="python" licao={derivada} />);
    fireEvent.change(screen.getByLabelText(/O teu código em/), { target: { value: gerado } });
    fireEvent.click(screen.getByRole('button', { name: 'Executar' }));
    expect(ecra().querySelector('.divergencias')).toBeNull();
  }, PASSO_A_PASSO);

  it('o editor abre com o programa do passo já escrito, e não vazio', () => {
    // Um editor vazio num momento de texto é um editor que pede à pessoa para
    // escrever a linha antes de lhe terem ensinado o que a linha é. O texto
    // vem da projeção — é a mesma linha de blocos, vista na linguagem.
    const derivada = comPrimeiroMomentoDeTexto();
    const esperado = emitir('python', blocoDe(derivada)).texto;
    render(<Tela linguagem="python" licao={derivada} />);
    expect((screen.getByLabelText(/O teu código em/) as HTMLTextAreaElement).value).toBe(esperado);
  }, PASSO_A_PASSO);
});

/** O bloco do primeiro passo, ou uma falha com o nome do ficheiro. */
function blocoDe(licao: Licao): BlocoLeigo {
  const bloco = licao.passos[0]?.bloco;
  if (bloco === undefined) throw new Error('a lição não tem passos');
  return bloco;
}

/** A primeira lição com um programa que falha e uma sondagem à espera de
 *  outra coisa.
 *
 *  Serve para medir o painel de erros, e a medição é necessária: os onze
 *  passos da lição de Python não têm nenhum caminho em que o programa que o
 *  ecrã dá **falhe** e a sondagem espere outra coisa. Os dois que divergem não
 *  têm erro nenhum — o Python aceita e segue, que é o que a lição ensina — e
 *  os que têm erro batem com a sondagem. O painel de erros é, portanto, uma
 *  parte do produto que a lição de verdade nunca chega a mostrar. */
function comProgramaQueFalha(): Licao {
  const passo = LICAO.passos[0] as Passo;
  const falha: Bloco = {
    type: 'log',
    inputs: { VALOR: { valor: { ref: 'total' } } },
  };
  return { ...LICAO, passos: [{ ...passo, bloco: falha }, ...LICAO.passos.slice(1)] };
}

/** A primeira lição transformada: o primeiro momento passa a ser de texto.
 *
 *  Existe porque a lição de Python não tem um momento de texto nenhum, e o
 *  editor de texto é uma parte do produto que precisa de ser exercitada. A
 *  alternativa — escrever um momento de texto na lição de verdade — mudaria
 *  a lição para caber num teste, e a lição é mais importante do que o
 *  teste. O nome da função diz porque é que ela existe, para que ninguém
 *  leia isto e conclua que a lição tem um momento de texto. */
function comPrimeiroMomentoDeTexto(): Licao {
  const passos = LICAO.passos.map((p, i) =>
    i === 0
      ? { ...p, momentos: p.momentos.map((m) => ({ ...m, fonte: 'texto' as const })) }
      : p,
  );
  return { ...LICAO, passos };
}
```

- [ ] **Step 3: Correr e ver falhar**

Run: `npx vitest run src/ui/lecao/tela.test.tsx`
Expected: FAIL com erro de resolução de `./Tela`.

- [ ] **Step 4: Escrever `src/ui/lecao/SondasView.tsx`**

```typescript
import type { Sonda } from '../../conteudo/esquema';
import type { ClassesObservadas } from '../../projecoes/avaliar';

export interface SondasViewProps {
  /** A sondagem deste passo. `null` é um estado que o carregador torna
   *  impossível — um passo sem sondagem é um passo em que a pessoa faz e não
   *  sabe se acertou, e o carregador atira `ErroDeAutoria` — mas o ecrã
   *  trata-o na mesma, e trata-o a mostrar o que falta em vez de mostrar
   *  uma caixa vazia. */
  sonda: Sonda | null;
  /** O que o motor deu da última corrida, ou `null` se ainda não correu
   *  nada. Um ecrã que mostra um veredicto antes de haver corrida está a
   *  dizer que a pessoa viu alguma coisa que não viu. */
  observada: ClassesObservadas | null;
  /** A razão que o motor deu, quando a corrida não bateu. */
  motivo: string;
  /** A pessoa carregou em «Ver a resposta». */
  revelado: boolean;
  aoRevelar: () => void;
}

/** A sondagem do passo: a pergunta, o que aconteceu, e a fuga.
 *
 *  A sondagem é o que decide se o momento fica visto. Não é o botão, não é o
 *  clique, e não é ofacto de a pessoa ter mexido em algum bloco: é o
 *  resultado que o motor deu ser o que a sondagem queria. Uma porta
 *  Hogwarts que se abre com um gesto e uma porta que se abre com a coisa
 *  certain estão a ensinar coisas diferentes, e o produto é a segunda.
 *
 *  O que aparece aqui é sempre o **nome da classe** que o motor deu, nos dois
 *  sentidos. Mostrar a classe é o que faz a pessoa ver que a diferença
 *  entre `Observacao` e `FalhaRuntime` é uma coisa que existe, e é
 *  precisamente essa diferença que a lição anda a ensinar. */
export function SondasView({ sonda, observada, motivo, revelado, aoRevelar }: SondasViewProps) {
  if (sonda === null) {
    return (
      <section className="sondas">
        <p className="aviso">
          Este passo não tem sondagem, e portanto nada aqui está a ser julgado. O que
          fizeste conta na mesma — o produto não tem opinião sobre o teu trabalho, só
          tem sobre as sondagens.
        </p>
        <button type="button" onClick={aoRevelar}>
          Ver a resposta
        </button>
      </section>
    );
  }

  const bateu = observada !== null && observada === sonda.esperado.classe;

  return (
    <section className="sondas">
      <p className="sonda-pergunta">{sonda.pergunta}</p>
      {observada === null ? null : (
        <p className={bateu ? 'sonda-veredicto' : 'sonda-veredicto sonda-veredicto-falta'}>
          {bateu
            ? `Agora já viste o que a sondagem queria ver. Isto deu ${observada}.`
            : `Ainda não. Isto deu ${observada}, e a sondagem estava à procura de ${sonda.esperado.classe}. ${motivo}`}
        </p>
      )}
      {revelado ? (
        <div className="sonda-revelada">
          <p className="sonda-revelada-porque">{sonda.esperado.porque.trim()}</p>
          <p className="sonda-revelada-aviso">
            Esta resposta foi revelada. Não a descobriste tu, e a lição conta o
            momento como não-descobrimento.
          </p>
        </div>
      ) : null}
      <button type="button" onClick={aoRevelar}>
        Ver a resposta
      </button>
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

- [ ] **Step 5: Escrever `src/ui/lecao/PassoView.tsx`**

```typescript
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
```

- [ ] **Step 6: Escrever `src/ui/lecao/Tela.tsx`**

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PassoView } from './PassoView';
import { useLicao } from '../estado';
import type { EstadoLicao } from '../estado';
import './lecao.css';
import { avaliador } from '../../nucleo/avaliador';
import type { BlocoLeigo } from '../../nucleo/avaliador';
import type { Divergencia } from '../../nucleo/divergencia';
import type { Erro, Language, Recusa, Valor } from '../../nucleo/tipos';
import { classificar, divergir as divergirNaLinguagem, emitir } from '../../projecoes/avaliar';
import type { ClassesObservadas } from '../../projecoes/avaliar';
import type { Licao } from '../../conteudo/esquema';

export interface TelaProps {
  linguagem: Language;
  licao: Licao;
  /** O passo em que se abre. Existe para os testes poderem medir cada passo
   *  sem fazer a pessoa chegar lá a carregar em botões — e é a mesma razão
   *  pela qual a lição tem quinze passos e não quinze ecrãs. */
  passoInicial?: number;
}

/** O que a última corrida deu: a classe, a razão, e o que ficou no robô. */
interface Corrida {
  observada: ClassesObservadas;
  motivo: string;
  valores: Record<string, Valor | undefined>;
  recusa: Recusa | null;
}

const SEM_CORRIDA: Corrida | null = null;

/** O ecrã da lição.
 *
 *  Aqui é que se decide quem julga o quê, e a decisão vale mais do que o
 *  ecrã todo: quem carrega em «Correr o programa» não é a pessoa que diz
 *  que acertou — é o motor, e o que ele diz é a **classe** que a sondagem
 *  esperava. A pessoa pode ter mexido em vinte blocos e acertado na mesma,
 *  e pode não ter mexido em nada e falhado na mesma, e as duas coisas são
 *  justas porque o que se julga é o programa e não a pessoa.
 *
 *  O programa que se julga é o que está no painel de blocos, e o painel é
 *  de onde ele sai. Não há uma segunda cópia do programa algures — o que o
 *  painel tem é o que o ecrã julga e o que a projeção escreve, e é por isso
 *  que `acordo.test.ts` consegue exigir que os dois motores do produto
 *  digam a mesma coisa sobre ele.
 *
 *  E o programa do passo entra no painel à partida. Um passo que manda
 *  «guarda um número com o nome `total`» e abre o painel vazio obriga a
 *  pessoa a saber a sintaxe antes de lhe terem ensinado nada, e o ficheiro
 *  de lição tem a linha escrita para ser lida antes de ser montada. */
export function Tela({ linguagem, licao, passoInicial = 0 }: TelaProps) {
  const estado = useLicao(licao, passoInicial);
  const [programa, definirPrograma] = useState<BlocoLeigo | null>(null);
  const [corrida, definirCorrida] = useState<Corrida | null>(SEM_CORRIDA);
  const [divergencias, definirDivergencias] = useState<Divergencia[]>([]);
  const [revelados, definirRevelados] = useState<Record<string, boolean>>({});

  // Um erro é o que aconteceu numa corrida, e uma corrida é de um passo.
  // Deixá-lo no ecrã do passo seguinte é pôr ali uma falha que já não é do
  // programa que está à vista, e a pessoa passa a depurar código que não é
  // dela. Mudou o passo, mudaram-se as contas.
  useEffect(() => {
    estado.definirErros([]);
  }, [estado.indicePasso]);

  /** O programa do passo escrito na linguagem escolhida.
   *
   *  Sai da projeção, que é a única que sabe a sintaxe, e de mais lado
   *  nenhum. A alternativa — um `texto` novo no esquema da lição — seria uma
   *  segunda versão do mesmo programa, e as duas divergiriam no primeiro
   *  bloco que alguém mudasse de um lado só. */
  const textoInicial = useMemo(() => {
    try {
      return emitir(linguagem, estado.passo.bloco).texto;
    } catch {
      // Um bloco que a projeção não sabe escrever não pode partir o ecrã de
      // quem está a ler. O editor abre vazio e a lição continua, que é
      // infinitamente melhor do que uma página branca com um erro em
      // letra miudinha.
      return '';
    }
  }, [linguagem, estado.passo]);

  const aoMudar = useCallback((novo: BlocoLeigo | null) => {
    definirPrograma(novo);
  }, []);

  const correr = useCallback(() => {
    const a = avaliador();
    a.executar(programa);
    const erros: Erro[] = [...a.trace.erros];
    const observada = classificar(erros);
    estado.definirErros(erros);
    definirCorrida({
      observada,
      motivo: motivoDe(erros),
      valores: valoresDaRobo(a.trace.valores),
      recusa: erros.find((e): e is Recusa => e.classe === 'Recusa') ?? null,
    });
    // A sondagem é o que decide, e decide uma coisa só: se o que o motor
    // deu é a classe que a sondagem queria. Não é um botão, não é o acto
    // de mexer, e não é o que a pessoa escreveu no editor.
    if (estado.sonda !== null && observada === estado.sonda.esperado.classe) {
      estado.observar();
    }
  }, [programa, estado]);

  const comparar = useCallback(
    (texto: string) => {
      // A divergência é a pergunta «o teu texto faz o mesmo que estes
      // blocos?», e é a pergunta mais útil que se pode fazer a quem está a
      // passar de uma linguagem para outra: a diferença entre os dois
      // projectos é quase sempre uma linha, e essa linha diz-se.
      try {
        // `divergir` recebe o **programa**, não o texto emitido: quem escreve
        // é a projeção, e passar-lhe o texto que ela acabou de escrever é
        // dizer-lhe que o que ela há de decidir já está decidido.
        definirDivergencias(divergirNaLinguagem(linguagem, estado.passo.bloco, texto).divergencias);
      } catch {
        definirDivergencias([]);
      }
    },
    [linguagem, estado.passo],
  );

  const responder = useCallback(
    (texto: string) => {
      if (estado.momentoActual !== null) estado.definirResposta(estado.momentoActual.id, texto);
      estado.responder(texto);
    },
    [estado],
  );

  const revelar = useCallback(() => {
    const momento = estado.momentoActual;
    if (momento === null) return;
    definirRevelados((r) => ({ ...r, [momento.id]: true }));
    // Revelar marca o momento como visto. É uma fuga, e uma fuga que não
    // destrava a porta não é uma fuga: é uma parede com uma janela. O que
    // a distingue de ter visto é a linha do `SondasView` que diz na cara
    // que a resposta foi revelada.
    estado.observar();
  }, [estado]);

  const continuar = useCallback(() => {
    if (estado.momento < estado.totalMomentos - 1) {
      estado.proximo();
      return;
    }
    estado.proximoPasso();
  }, [estado]);

  const voltar = useCallback(() => {
    if (estado.momento > 0) {
      estado.anterior();
      return;
    }
    if (estado.indicePasso > 0) estado.irPara(estado.indicePasso - 1);
  }, [estado]);

  const revelado = estado.momentoActual !== null && (revelados[estado.momentoActual.id] ?? false);

  return (
    <main className="tela">
      <Cabecalho estado={estado} />
      <PassoView
        estado={estado}
        linguagem={linguagem}
        programa={programa}
        textoInicial={textoInicial}
        valores={corrida?.valores ?? {}}
        recusa={corrida?.recusa ?? null}
        observada={corrida?.observada ?? null}
        motivo={corrida?.motivo ?? ''}
        revelado={revelado}
        divergencias={divergencias}
        aoMudar={aoMudar}
        aoCorrer={correr}
        aoComparar={comparar}
        aoResponder={responder}
        aoRevelar={revelar}
        aoContinuar={continuar}
        aoVoltar={voltar}
      />
    </main>
  );
}

/** Onde está, e o que esta lição é. */
function Cabecalho({ estado }: { estado: EstadoLicao }) {
  return (
    <header className="tela-cabecalho">
      <h1>{estado.licao.titulo}</h1>
      <p className="tela-porque">{estado.licao.porqueTitulo.trim()}</p>
      <p className="tela-progresso">
        {`Passo ${estado.indicePasso + 1} de ${estado.totalPassos}`}
      </p>
    </header>
  );
}

/** A frase que vai por baixo do veredicto quando a corrida não bateu.
 *
 *  Sai do motor e não de um dicionário do ecrã. A diferença é que o motor
 *  sabe o que aconteceu e o ecrã só sabe o que costuma acontecer: um
 *  dicionário é uma lista de frases para os erros que se previa, e o
 *  primeiro erro que não estiver na lista fica sem explicação nenhuma — que
 *  é a pior coisa que se pode fazer a quem está a tentar perceber. */
function motivoDe(erros: readonly Erro[]): string {
  // As três classes de `Erro` têm `remedio` — é a regra que a Task 1 fixou
  // para `Recusa` e que o teste do motor estende a todas. Um `in` aqui dava
  // um ramo que nunca corre, e a assinatura do TypeScript punia o
  // código com um `never` onde devia estar a regra.
  const primeiro = erros[0];
  if (primeiro === undefined) return 'Não aconteceu nada que se pudesse ver.';
  return `${primeiro.porque} ${primeiro.remedio}`;
}

/** O que o robô mostra depois da corrida.
 *
 *  Só entra na porta o que o motor registou, e o registo é do `log` e do
 *  `dizer` — as duas coisas que num programa são a voz. O `dizer` é o
 *  `print` do Python e não sai do programa: sai do ecrã, e é por isso que
 *  ele também conta. */
function valoresDaRobo(valores: readonly Valor[]): Record<string, Valor | undefined> {
  const ditos = valores.filter((v) => v.origem.bloco === 'log' || v.origem.bloco === 'dizer');
  const ultimo = ditos[ditos.length - 1];
  return { entrada: undefined, saida: ultimo };
}
```

- [ ] **Step 7: Escrever `src/ui/lecao/lecao.css`**

```css
/* O ecrã da lição.
 *
 * A folha é quase toda espaço: a lição é lida, e uma linha de texto que
 * alguém está a tentar ler não pode estar a lutar com a largura do
 * painel de blocos. A coluna de texto fica com uma medida — as «medidas» de
 * leitura, umas setenta e cinco letras, que é onde os olhos cansam — e o
 * painel de blocos fica com o que sobrar.
 *
 * As cores são as de `estilo.css` e não há mais nenhuma. Uma segunda
 * paleta aqui dentro seria duas paletas a divergir no primeiro ecrã que
 * alguém desenhasse. */

.tela {
  max-width: 72rem;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.tela-cabecalho {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border-bottom: 1px solid var(--borda);
  padding-bottom: 1rem;
}

.tela-cabecalho h1 {
  margin: 0;
  font-size: 1.6rem;
}

.tela-porque {
  margin: 0;
  max-width: 46rem;
  line-height: 1.6;
  color: #cbd5e1;
}

.tela-progresso {
  margin: 0;
  font-size: 0.85rem;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

.passo {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.passo-fase {
  margin: 0;
  align-self: flex-start;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7dd3fc;
  border: 1px solid var(--borda);
  border-radius: 999px;
  padding: 0.15rem 0.7rem;
}

.passo-porque {
  margin: 0;
  max-width: 46rem;
  font-size: 1.05rem;
  line-height: 1.7;
}

.passo-palavra {
  margin: 0;
  font-size: 2.4rem;
  font-weight: 600;
  color: var(--aviso);
  letter-spacing: -0.01em;
}

.sondas {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: flex-start;
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: 0.5rem;
  padding: 1rem;
}

.sonda-pergunta {
  margin: 0;
  font-size: 1rem;
}

.sonda-veredicto {
  margin: 0;
  line-height: 1.6;
  color: var(--ok);
}

.sonda-veredicto-falta {
  color: var(--aviso);
}

.sonda-revelada {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  border-left: 3px solid var(--aviso);
  padding-left: 0.75rem;
}

.sonda-revelada p {
  margin: 0;
  line-height: 1.6;
}

.sonda-revelada-aviso {
  font-size: 0.8rem;
  color: #94a3b8;
}

.passo-blocos {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
}

.passo-leitura {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ficha {
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: 0.5rem;
  padding: 1rem;
}

.ficha-nome {
  margin: 0 0 0.6rem;
  font-size: 0.95rem;
  color: #7dd3fc;
}

.ficha-linhas {
  margin: 0;
  padding-left: 2.5rem;
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  font-size: 0.9rem;
  line-height: 1.6;
}

.ficha-linha code {
  white-space: pre;
}

.pergunta {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: flex-start;
}

.pergunta-texto {
  margin: 0;
  font-size: 1rem;
}

.pergunta label {
  font-size: 0.8rem;
  color: #94a3b8;
}

.pergunta input {
  min-width: 20rem;
  padding: 0.45rem 0.6rem;
  border-radius: 0.25rem;
  border: 1px solid var(--borda);
  background: var(--fundo-escuro);
  color: var(--texto);
  font: inherit;
}

.pergunta-dica {
  margin: 0;
  font-size: 0.8rem;
  color: #94a3b8;
}

.erros {
  border: 1px solid var(--erro);
  border-radius: 0.5rem;
  padding: 1rem;
  background: rgba(248, 113, 113, 0.08);
}

.erros-titulo {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: var(--erro);
}

.erros ul {
  margin: 0;
  padding-left: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.erro p {
  margin: 0.15rem 0;
  line-height: 1.6;
}

.erro-classe {
  font-size: 0.75rem;
  color: #94a3b8;
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
}

.erro-remedio {
  color: #cbd5e1;
}

.passo-progresso {
  margin: 0;
  font-size: 0.8rem;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

.passo-falta {
  margin: 0;
  font-size: 0.9rem;
  color: var(--aviso);
}

.passo-acoes {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
```

- [ ] **Step 8: Correr e ver passar**

Run: `npx vitest run src/ui/lecao/tela.test.tsx`
Expected: PASS. O teste `mostra as linhas do ficheiro com a indentação que ele tem` é o que confirma que a ficha existe e que mostra o ficheiro: compara o `textContent` cru da linha 6 com a linha 6 da sondagem, e a linha 6 é a que está dentro do laço. Se as linhas não batem, o problema está no YAML da Task 8 e não aqui.

O teste `a ficha só aparece no passo que a manda ler` percorre os onze passos e diz, passo a passo, se há ficha ou não. É o teste que impede a ficha de aparecer onde ninguém a mandou ler — e a lista de passos **não** é escrita à mão: sai de `LICAO.passos`, que vem do `CARREGAR` a ler o YAML.

- [ ] **Step 9: O seletor de linguagem — Review Focus 5**

O seletor tem de mostrar **três linhas reais** de cada linguagem (spec §6.5), e só as que têm projeção **e** lição. As restantes aparecem com a razão, nunca desaparecem em silêncio — e escolher uma que não está pronta não pode dar um ecrã em branco.

O plano original desta tarefa escrevia um `<select>` com seis `<option>`, e **não pode ser assim por duas razões que não são de gosto**. A primeira é que um `<option>` não sabe mostrar três linhas de código: a sua altura é a de uma linha, e a spec §6.5 pede o exemplo inteiro ou não cumpre nada. A segunda é mais séria: um `<option>` desativado não pode levar um botão, e quem clica numa opção desativada não recebe explicação nenhuma — a pessoa vê uma lista e um número de trinta e não fica a saber porquê. Um cartão pode. Por isso o seletor são **cartões**, e um cartão bloqueado não tem botão nenhum: não há nada para carregar, e a razão está escrita à vista.

O teste vem primeiro, e é um ficheiro à parte do `tela.test.tsx` porque mede uma coisa diferente: o `tela.test.tsx` mede a lição, este mede a **entrada no produto**. Um ficheiro de testes que mede duas coisas não se divide sozinho — divide-se quando as duas coisas precisam de contextos diferentes, e aqui um precisa do `CATALOGO` e do `render` do produto inteiro, e o outro precisa da lição carregada.

`src/ui/lecao/entrada.test.tsx`:
```typescript
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { CATALOGO } from './catalogo';
import { SeletorLinguagem } from './SeletorLinguagem';
import { Aplicacao } from './Aplicacao';
import { LINGUAGENS, NOMES } from '../../nucleo/tipos';
import type { Language } from '../../nucleo/tipos';
import { temLicao } from '../../conteudo';
import { temProjecao } from '../../projecoes/registo';

/** O tecto de tempo deste ficheiro, escrito à mão e posto em todos os testes.
 *
 *  Montar o ecrã é montar o Blockly, e o Blockly não é rápido: regista
 *  blocos, mede um SVG que o jsdom não sabe medir, e monta a ferramenta.
 *  Sozinho este ficheiro corre em menos de dois segundos por teste; a correr
 *  ao lado dos outros, que é como o `npm test` o corre, passa dos cinco e o
 *  teste morre de tempo esgotado sem que nada esteja errado. Já aconteceu
 *  três vezes em três voltas, em três testes diferentes, e num commit que
 * eria verde.
 *
 *  O tecto escreve-se à mão em vez de se subir o global, porque subir o
 *  global é dizer que todos os testes são lentos quando estes são lentos por
 *  uma razão que só estes têm. E vai em **todos** os testes do ficheiro, e
 *  não numa lista dos lentos: essa lista seria uma segunda fonte de verdade
 *  que divergiria no primeiro teste novo, e o teste novo morreria de tempo
 *  esgotado sem ninguém saber porquê. */
const PASSO_A_PASSO = 20_000;


/** O cartão de uma linguagem. As asserções são sobre *qual* cartão
 *  mostra o quê: uma busca no ecrã inteiro mediria o produto errado,
 *  porque duas das seis opções partilham de propósito uma linha — a mesma
 *  atribuição em Python e em Go é a comparação que a pessoa está a fazer. */
function cartaoDe(container: HTMLElement, linguagem: Language): HTMLElement {
  const achado = container.querySelector(`[data-linguagem="${linguagem}"]`);
  if (achado === null) throw new Error(`o seletor não mostra o cartão de ${linguagem}`);
  return achado as HTMLElement;
}

describe('O catálogo de linguagens', () => {
  it('traz as seis, pela ordem do produto, todas visíveis', () => {
    // Uma opção que desaparece em silêncio é a forma mais barata de mentir
    // sobre um produto. As seis estão no ecrã desde o primeiro momento, e as
    // cinco que não estão prontas dizem porquê.
    expect(CATALOGO).toHaveLength(LINGUAGENS.length);
    expect(CATALOGO.map((o) => o.linguagem)).toEqual([...LINGUAGENS]);
    expect(CATALOGO.map((o) => o.nome)).toEqual(LINGUAGENS.map((l) => NOMES[l]));
  }, PASSO_A_PASSO);

  it('a prontidão vem da projeção e da lição, e não de uma lista escrita à mão', () => {
    // **Este é o teste que responde ao ponto 5 do `Review Focus`.** O plano
    // escrevia `pronta: true` e `pronta: false` à mão em cada uma das seis,
    // e uma lista escrita à mão diverge do ficheiro no dia em que a
    // projeção de Go chega: o ecrã continuaria a dizer «Ainda não há
    // projeção de Go» com a projeção instalada e os testes a passar.
    //
    // Aqui a afirmação é a igualdade com o estado real do produto, calculada
    // a partir de `temProjecao` e de `temLicao`. Se um dia a projeção de Go
    // entrar, este teste fica vermelho a dizer que a opção devia estar
    // pronta — que é a frase que alguém precisa de ler.
    for (const opcao of CATALOGO) {
      expect(opcao.pronta).toBe(
        temProjecao(opcao.linguagem) && temLicao(opcao.linguagem),
      );
    }
  }, PASSO_A_PASSO);

  it('só uma está pronta no primeiro corte, e é a do Python', () => {
    const prontas = CATALOGO.filter((o) => o.pronta);
    expect(prontas.map((o) => o.linguagem)).toEqual(['python']);
  }, PASSO_A_PASSO);

  it('cada opção mostra três linhas verdadeiras, e nenhuma é uma descrição', () => {
    for (const opcao of CATALOGO) {
      expect(opcao.exemplo).toHaveLength(3);
      for (const linha of opcao.exemplo) {
        expect(linha.trim()).not.toBe('');
        // A pergunta que o seletor faz ao aluno é «isto?», e uma linha que
        // descreve em vez de mostrar não deixa ninguém responder.
        expect(linha).not.toMatch(/linguagem|bloco|programa|exemplo/i);
      }
    }
    // E não são as mesmas três linhas para todas: seis opções com o mesmo
    // texto seriam uma opção só, escrita seis vezes.
    const exemplos = new Set(CATALOGO.map((o) => o.exemplo.join('\n')));
    expect(exemplos.size).toBe(CATALOGO.length);
  }, PASSO_A_PASSO);

  it('cada opção bloqueada diz o que falta, e uma opção pronta não diz nada', () => {
    for (const opcao of CATALOGO) {
      if (opcao.pronta) {
        expect(opcao.falta).toBe('');
        continue;
      }
      // A razão **nomeia a linguagem**: «Ainda não está escrito» sem dizer
      // o quê nem onde é uma frase que serve para seis opções e não informa
      // sobre nenhuma.
      expect(opcao.falta).toContain(NOMES[opcao.linguagem]);
      // E diz **qual das duas** falta, porque são duas coisas diferentes com
      // consequências diferentes: sem projeção a opção nem existe; com
      // projeção e sem lição é uma lição por escrever, e o motor já está
      // verificado por trás.
      const semProjecao = !temProjecao(opcao.linguagem);
      const semLicao = !temLicao(opcao.linguagem);
      expect(opcao.falta).toMatch(semProjecao && semLicao ? /projeção/ : /lição/);
    }
  }, PASSO_A_PASSO);
});

describe('O seletor de linguagem', () => {
  it('mostra as seis, com o nome e as três linhas de cada uma', () => {
    // Cada linha é procurada **dentro do cartão da sua linguagem**, e não no
    // ecrã inteiro. `total = total + 1` é uma linha verdadeira de Python e
    // uma linha verdadeira de Go — a mesma escrita, e é essa a comparação
    // que a pessoa faz ao escolher. Uma busca no ecrã inteiro encontraria as
    // duas e atirava uma exceção, e o teste passava a medir a ambiguidade
    // em vez do ecrã.
    const { container } = render(<SeletorLinguagem opcoes={CATALOGO} aoEscolher={() => {}} />);
    for (const opcao of CATALOGO) {
      const cartao = cartaoDe(container, opcao.linguagem);
      expect(within(cartao).getByRole('heading', { name: NOMES[opcao.linguagem] })).toBeInTheDocument();
      // As três linhas vivem num `<pre>` só, e o `getByText` compara o texto
      // todo do elemento depois de dobrar os espaços: `total = 5` nunca
      // iguala `total = 5\nprint(total)\ntotal = total + 1`, e o teste
      // atirava com a mensagem «não achei o texto» sobre um ecrã que estava
      // certo. O que interessa é linha a linha, e uma linha é uma linha da
      // lista do catálogo — daí a comparação ser feita sobre as linhas.
      const exemplo = cartao.querySelector('.seletor-exemplo');
      const escritas = (exemplo?.textContent ?? '').split('\n');
      expect(escritas).toEqual(opcao.exemplo);
    }
  }, PASSO_A_PASSO);

  it('só habilita a que está pronta, e nenhuma das outras tem botão de escolha', () => {
    render(<SeletorLinguagem opcoes={CATALOGO} aoEscolher={() => {}} />);
    // A forma do teste importa: `getByRole('button', { name: 'Go' })` casa
    // com «Go» e não com «Google» porque aqui não há «Google», mas o plano
    // antigo escrevia `/Java/` e esse padrão casa com **«Java» e
    // «JavaScript» ao mesmo tempo** — dois elementos, e o `getBy` atira
    // uma exceção em vez de testar o que diz. Por isso a comparação é pelo
    // id da linguagem, que é uma coisa só.
    const botoes = screen.getAllByRole('button');
    expect(botoes).toHaveLength(CATALOGO.filter((o) => o.pronta).length);
    for (const opcao of CATALOGO.filter((o) => o.pronta)) {
      const botao = screen.getByRole('button', { name: `Começar ${NOMES[opcao.linguagem]}` });
      expect(botao).toBeEnabled();
    }
  }, PASSO_A_PASSO);

  it('cada opção bloqueada mostra a razão, e nenhuma desaparece em silêncio', () => {
    const { container } = render(<SeletorLinguagem opcoes={CATALOGO} aoEscolher={() => {}} />);
    for (const opcao of CATALOGO) {
      if (opcao.pronta) continue;
      // A razão está no ecrã **antes** de qualquer clique, e não aparece
      // depois de uma tentativa falhada. Um aluno que chegue ao fim da lista
      // tem de saber o que está a ver e porquê, sem descobrir que não pode
      // escolher.
      expect(cartaoDe(container, opcao.linguagem).textContent).toContain(opcao.falta);
    }
  }, PASSO_A_PASSO);

  it('escolher a pronta entrega a linguagem ao ecrã', () => {
    const aoEscolher = vi.fn<(l: Language) => void>();
    render(<SeletorLinguagem opcoes={CATALOGO} aoEscolher={aoEscolher} />);
    fireEvent.click(screen.getByRole('button', { name: `Começar ${NOMES.python}` }));
    expect(aoEscolher).toHaveBeenCalledWith('python');
  }, PASSO_A_PASSO);

  it('não há caminho para um ecrã em branco: as bloqueadas não têm botão nenhum', () => {
    // Um `<option disabled>` não se pode clicar — nem a pessoa, nem um
    // teste, sem `UNSAFE_`. O plano antigo testava o que acontecia ao clicar
    // numa opção desabilitada com `UNSAFE_getByRole`, que é um estado que o
    // browser não permite alcançar. A garantia real não é «o clique é
    // inofensivo»: é que **não existe o botão**. Se não existe, não há
    // caminho para o ecrã em branco, e não há estado escondido à espera de
    // um clique.
    render(<SeletorLinguagem opcoes={CATALOGO} aoEscolher={() => {}} />);
    for (const opcao of CATALOGO.filter((o) => !o.pronta)) {
      expect(
        screen.queryByRole('button', { name: `Começar ${NOMES[opcao.linguagem]}` }),
      ).not.toBeInTheDocument();
    }
  }, PASSO_A_PASSO);

  it('a opção que não tem botão tem a razão legível, não uma imagem', () => {
    // A razão é texto, e não um `title` nem uma cor. Uma cor não se lê com
    // um leitor de ecrã, e um `title` só aparece com o rato em cima.
    render(<SeletorLinguagem opcoes={CATALOGO} aoEscolher={() => {}} />);
    const opcao = CATALOGO.find((o) => !o.pronta)!;
    expect(screen.getByText(opcao.falta)).toBeInTheDocument();
  }, PASSO_A_PASSO);
});

describe('A entrada do produto', () => {
  it('começa no seletor, e não numa lição', () => {
    // A escolha vem primeiro. Um `main.tsx` com a linguagem escrita à mão é
    // um produto que finge ter seis linguagens e ensina uma.
    render(<Aplicacao />);
    expect(screen.getByRole('heading', { name: NOMES.python })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: NOMES.java })).toBeInTheDocument();
    expect(screen.queryByText('O que é uma variável')).not.toBeInTheDocument();
  }, PASSO_A_PASSO);

  it('escolher Python abre a lição dessa linguagem', () => {
    render(<Aplicacao />);
    fireEvent.click(screen.getByRole('button', { name: `Começar ${NOMES.python}` }));
    // O título da lição é o da lição **dessa** linguagem, e não o de uma
    // lição qualquer: é a escolha que decidiu o que se ensina (§0).
    expect(screen.getByRole('heading', { name: 'O que é uma variável' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: NOMES.python })).not.toBeInTheDocument();
  }, PASSO_A_PASSO);

  it('não escreve o nome de nenhuma lição à mão', () => {
    // A chave da lição sai do `TEXTOS`, e não de uma constante no ecrã. Uma
    // constante 'variavel' escrita no `main.tsx` é uma segunda fonte de
    // verdade sobre que lições existem, e diverge do `TEXTOS` no dia em que
    // se escreve a segunda.
    render(<Aplicacao />);
    fireEvent.click(screen.getByRole('button', { name: `Começar ${NOMES.python}` }));
    // Se a chave viesse de uma constante, trocar a constante abriria uma
    // lição inexistente e o ecrã mostraria o aviso de «Ainda não há lição».
    expect(screen.queryByText(/Ainda não há lição/)).not.toBeInTheDocument();
  }, PASSO_A_PASSO);
});
```

O catálogo vive em `src/ui/lecao/catalogo.ts`, com os exemplos escritos à
mão — são texto de ecrã, e texto de ecrã não se gera. São **as seis**, todas
presentes, porque uma opção que desaparece em silêncio é a forma mais
barata de mentir sobre um produto. As cinco que não estão prontas dizem
isso e dizem porquê.

O `pronta` é **calculado**, e não escrito à mão: `temProjecao(linguagem) && temLicao(linguagem)`. Escrever `pronta: true` ao lado de cada opção é uma segunda fonte de verdade sobre o que o produto tem, e essa segunda fonte é a que fica desatualizada. O `falta` diz **qual** das duas falta, e não «não está pronta» — «a projeção está e a lição não» e «a lição está e a projeção não» são estados diferentes, com correções diferentes, e uma pessoa que saiba qual deles é já vai ao sítio certo.

`src/ui/lecao/catalogo.ts`:
```typescript
import { LINGUAGENS, NOMES } from '../../nucleo/tipos';
import type { Language } from '../../nucleo/tipos';
import { temLicao } from '../../conteudo';
import { temProjecao } from '../../projecoes/registo';
import type { OpcaoLinguagem } from './SeletorLinguagem';

/** As três linhas que cada opção mostra, escritas à mão.
 *
 *  São texto de ecrã, e texto de ecrã não se genera: a pergunta que o
 *  seletor faz ao aluno é «isto?», e uma linha que descreve em vez de
 *  mostrar não deixa ninguém responder. São três, e não uma, porque uma
 *  linha isolada é um desonesto — a mesma atribuição em duas linguagens
 *  parece a mesma coisa, e não é. */
const EXEMPLOS: Record<Language, string[]> = {
  python: ['total = 5', 'print(total)', 'total = total + 1'],
  java: ['int total = 5;', 'System.out.println(total);', 'total = total + 1;'],
  go: ['total := 5', 'fmt.Println(total)', 'total = total + 1'],
  typescript: ['let total: number = 5;', 'console.log(total);', 'total = total + 1;'],
  javascript: ['let total = 5;', 'console.log(total);', 'total = total + 1;'],
  sql: ['SELECT total FROM vendas;', 'WHERE total > 10', 'ORDER BY total;'],
};

/** O que falta a uma linguagem para poder ser escolhida, escrito a partir do
 *  estado real do produto.
 *
 *  Este é o ponto 5 do `Review Focus`, e a decisão que o resolve é uma só: a
 *  prontidão **não é escrita à mão**. Um `pronta: false` escrito no catálogo
 *  continua a dizer a verdade até ao dia em que a projeção de Go entra — e
 *  nesse dia o ecrã mente para metade das pessoas que abrirem o produto, sem
 *  nenhum teste ficar vermelho. Aqui a resposta vem de `temProjecao` e de
 *  `temLicao`, e o `Record` de exemplos continua a ser a verificação de que
 *  nenhuma das sete linguagens de amanhã ficou sem linhas.
 *
 *  E a razão **diz qual das duas** falta, porque são duas coisas diferentes:
 *  sem projeção a opção ainda não existe; com projeção e sem lição há um
 *  ecrã inteiro por escrever, e o motor por trás já está verificado por
 *  testes. Dizer «ainda não» sem dizer qual das duas é uma frase que serve
 *  para as seis e não informa sobre nenhuma. */
function faltaDe(linguagem: Language): { pronta: boolean; falta: string } {
  const nome = NOMES[linguagem];
  if (!temProjecao(linguagem)) {
    return {
      pronta: false,
      falta: `Ainda não há projeção de ${nome}. A lição vem depois da projeção, nunca antes.`,
    };
  }
  if (!temLicao(linguagem)) {
    return {
      pronta: false,
      falta: `A projeção de ${nome} está pronta e verificada por testes. A lição ainda não está escrita.`,
    };
  }
  return { pronta: true, falta: '' };
}

/** As seis, pela ordem de `LINGUAGENS`, com o nome vindo do núcleo.
 *
 *  Nenhuma sai da lista e nenhuma desaparece em silêncio: uma opção que se
 *  vai embora parece um produto com uma linguagem a menos, e o produto tem
 *  seis, quatro das quais ainda por escrever. */
export const CATALOGO: OpcaoLinguagem[] = LINGUAGENS.map((linguagem) => ({
  linguagem,
  nome: NOMES[linguagem],
  exemplo: EXEMPLOS[linguagem],
  ...faltaDe(linguagem),
}));
```

`src/ui/lecao/SeletorLinguagem.tsx`:
```typescript
import type { Language } from '../../nucleo/tipos';

export interface OpcaoLinguagem {
  linguagem: Language;
  nome: string;
  /** Três linhas verdadeiras desta linguagem. Nunca uma descrição. */
  exemplo: string[];
  /** Verdadeiro quando há projeção **e** lição. Calculado, nunca escrito. */
  pronta: boolean;
  /** Quando não está pronta, o que é que falta. Vazio quando está. */
  falta: string;
}

export interface SeletorLinguagemProps {
  opcoes: readonly OpcaoLinguagem[];
  aoEscolher: (linguagem: Language) => void;
}

/** O seletor de linguagem.
 *
 *  Não é um `<select>`, e a razão é de conteúdo e não de estilo: a pergunta
 *  que este ecrã faz ao aluno é «isto?», e um `<option>` não cabe três
 *  linhas de código nem uma frase que explique porque é que não se pode
 *  escolher. São cartões, e cada cartão traz o nome, as três linhas e — quando
 *  não está pronto — a razão.
 *
 *  A opção que não está pronta **não tem botão nenhum**, e não tem um botão
 *  desabilitado. Um botão desabilitado é uma promessa e um beco sem saída: a
 *  pessoa vê ali uma coisa para carregar, carrega, e nada acontece, e não
 *  sabe se foi ela ou o produto. Sem botão, a leitura é a mesma para todos —
 *  a pessoa lê o cartão, lê a razão, e segue em frente. */
export function SeletorLinguagem({ opcoes, aoEscolher }: SeletorLinguagemProps) {
  return (
    <main className="seletor">
      <h1>Qual linguagem queres ler?</h1>
      <p className="seletor-pergunta">
        Escolhe uma. Vais aprender só essa, e a próxima vez que abrires um
        ficheiro dela vais saber o que está a ser lido.
      </p>
      <ul className="seletor-lista">
        {opcoes.map((opcao) => (
          <li key={opcao.linguagem} className="seletor-cartao" data-linguagem={opcao.linguagem}>
            <h2>{opcao.nome}</h2>
            <pre className="seletor-exemplo">{opcao.exemplo.join('\n')}</pre>
            {opcao.pronta ? (
              <button
                type="button"
                onClick={() => aoEscolher(opcao.linguagem)}
              >
                {`Começar ${opcao.nome}`}
              </button>
            ) : (
              <p className="seletor-falta">{opcao.falta}</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

A aplicação em si — os dois estados, o seletor primeiro e a lição depois —
vive no seu próprio ficheiro e não no `main.tsx`. A razão é uma só e é de
teste: um `main.tsx` chama `createRoot` no momento em que é importado, e
importá-lo num teste monta o produto inteiro no `document` do jsdom sem
ninguém pedir. Um ficheiro que se importa tem de ser um ficheiro que se
pode montar, e `main.tsx` deixa de se poder importar.

O que este ficheiro **não** decide: não sabe o que é uma projeção, não sabe
o que é uma lição, e não tem uma lista de linguagens escrita à mão. As três
coisas vêm do `CATALOGO`, que por sua vez vem de `LINGUAGENS`, e a chave da
lição vem de `TEXTOS` e não de uma constante. Se amanhã entrar uma sétima
linguagem, este ficheiro não muda — e é esse o teste de que a arquitectura
está no sítio.

`src/ui/lecao/Aplicacao.tsx`:
```typescript
import { useState } from 'react';
import { CARREGAR, TEXTOS, temLicao } from '../../conteudo';
import { NOMES } from '../../nucleo/tipos';
import type { Language } from '../../nucleo/tipos';
import { CATALOGO } from './catalogo';
import { SeletorLinguagem } from './SeletorLinguagem';
import { Tela } from './Tela';

/** A chave da primeira lição que existe para esta linguagem.
 *
 *  Sai do `TEXTOS` e não de uma constante. Uma constante `'variavel'` escrita
 *  aqui seria uma segunda fonte de verdade sobre que lições existem, e
 *  divergiria do `TEXTOS` no dia em que se escreve a segunda — sem teste
 *  nenhum ficar vermelho, porque as duas fontes continuariam a compilar. */
function chaveDaLicao(linguagem: Language): string | undefined {
  return Object.keys(TEXTOS)
    .filter((chave) => chave.startsWith(`${linguagem}/`))
    .sort()[0];
}

/** O produto inteiro, em dois estados.
 *
 *  Primeiro a escolha, depois a lição. Não ao contrário e não as duas ao
 *  mesmo tempo: antes de escolher não há ecrã, porque a lição é sobre uma
 *  linguagem e não sobre um conceito solto, e uma pessoa que vai ler
 *  TypeScript e uma pessoa que vai ler SQL não podem ver a mesma coisa com
 *  palavras diferentes — é o que a §0 do produto é.
 *
 *  Repara no que este ficheiro **não** decide: não sabe o que é uma
 *  projeção, não sabe o que é uma lição, e não tem uma lista de linguagens
 *  escrita à mão. As três coisas vêm do `CATALOGO`, que por sua vez vem de
 *  `LINGUAGENS`. Se amanhã entrar uma sétima linguagem, este ficheiro não
 *  muda — e é esse o teste de que a arquitectura está no sítio. */
export function Aplicacao() {
  const [linguagem, definirLinguagem] = useState<Language | null>(null);

  if (linguagem === null) {
    return <SeletorLinguagem opcoes={CATALOGO} aoEscolher={definirLinguagem} />;
  }

  const chave = chaveDaLicao(linguagem);
  const bruto = chave === undefined ? undefined : TEXTOS[chave];
  if (bruto === undefined || !temLicao(linguagem)) {
    // Não se chega aqui pelo caminho normal: o seletor só dá botão ao que
    // tem projeção e lição. Está aqui para que, se alguma vez se chegar, o
    // ecrã diga o que falta em vez de ser um ecrã em branco — que é a
    // diferença entre um produto que falha e um produto que mente.
    return (
      <main className="tela">
        <h1>{NOMES[linguagem]}</h1>
        <p className="aviso">
          {`Ainda não há uma lição escrita para ${NOMES[linguagem]}.`}
        </p>
      </main>
    );
  }

  return <Tela linguagem={linguagem} licao={CARREGAR(bruto, linguagem)} />;
}
```

- [ ] **Step 10: Ligar em `src/main.tsx` — o seletor primeiro, a lição depois**

`main.tsx` passa a ter três linhas de conteúdo e uma de arranque. Tudo o
que ele fazia antes — o estado da linguagem, o catálogo, a chave da lição — foi
para o `Aplicacao.tsx`, e o ficheiro ficou com o que lhe é próprio: montar
o produto. E sem `JSX.Element` no tipo de retorno: o React 19 tirou o
espaço de nomes `JSX` global, e um tipo de retorno anotado com ele não
compila num projecto com `@types/react` da versão 19.

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Aplicacao } from './ui/lecao/Aplicacao';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('o index.html precisa de #raiz');
createRoot(raiz).render(
  <StrictMode>
    <Aplicacao />
  </StrictMode>,
);
```

- [ ] **Step 11: Typecheck, suite completa e commit**

```bash
npm run typecheck
npm test
npm run arvore
git add -A
git commit -m "feat: tela da licao, ficha de leitura, sondas e o seletor de linguagem

O seletor vem antes do ecra e main.tsx nao escreve nenhuma linguagem a
mao. A escolha do utilizador decide o que se ensina, e o catalogo diz
com honestidade quais das seis ainda nao tem licao — todas as seis
visiveis, nenhuma a desaparecer em silencio.

O painel segue a fonte do momento e nao a fase do passo, e a sondagem e
o que decide se o momento fica visto. Ha uma fuga honesta em todo o
ecra, e a fuga diz na cara que foi uma fuga."
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
import { LINGUAGENS, NOMES } from '../nucleo/tipos';
import type { Language } from '../nucleo/tipos';
import { LINGUAGENS_COM_PROJECAO, REGISTO, obter } from './registo';
import { avaliarTexto, emitir } from './avaliar';
import { guardar, guardarTexto, log, pilha, repetir } from '../nucleo/testes/dados';
import type { BlocoLeigo } from '../nucleo/blocos';
import { temLicao } from '../conteudo';

/** Os programas que têm de voltar a ser lidos sem um erro sequer.
 *
 *  Não é uma lista de exemplo: é a lista mínima que diz que `emitir` e `ler`
 *  são uma coisa e a sua inversa. Guardar, guardar um texto e repetir são as
 *  três coisas que toda a lição do Plano A faz, e se alguma delas não
 *  voltasse, o aluno veria uma linha no ecrã que a linguagem não aceitaria —
 *  que é a pior coisa que este produto pode fazer. */
const PROGRAMAS: Record<string, BlocoLeigo> = {
  'um número': pilha(guardar('total', 5)),
  'um texto': pilha(guardarTexto('nome', 'olá')),
  'um laço': pilha(repetir(3, [guardar('x', 1)])),
};

/** Os programas que têm de **falhar** a ler-se, cada um à sua maneira.
 *
 *  O teste das referências cruzadas precisa de erros para ler, e um programa
 *  que corre limpo não dá nenhum. Estes três dão: um chama uma função que
 *  não existe, um esvazia a pilha, e um número não cabe no sítio onde o
 *  chegou. O segundo é o que interessa à linguagem — é o `RANGE_INTEIROS` do
 *  núcleo, e por isso a sua mensagem é a mesma nas seis, que é a prova de que
 *  o núcleo não trouxe nenhuma palavra de linguagem com ele. */
const PROGRAMAS_QUE_FALHAM: Record<string, BlocoLeigo> = {
  'uma função que não existe': pilha(log(5)),
  'um número que não cabe': pilha(guardar('total', 5000)),
  'um texto onde o núcleo só quer número': pilha(guardarTexto('total', 'olá')),
};

describe('a costura é uma coisa e não uma promessa', () => {
  it('toda linguagem registada é uma das seis, e toda projeção diz qual é a sua', () => {
    // A projeção é a única coisa que sabe a sintaxe, e por isso tem de saber
    // **qual** é a sua linguagem: uma projeção que não diga responde à
    // pergunta «isto é Python?» com a resposta de outra, e o aluno leva a
    // lição errada.
    for (const nome of LINGUAGENS_COM_PROJECAO) {
      expect(LINGUAGENS).toContain(nome);
      expect(obter(nome).linguagem).toBe(nome);
    }
  });

  it('não há projeções fora do registo, nem registos sem projeção', () => {
    // `LINGUAGENS_COM_PROJECAO` é derivado de `REGISTO` por `Object.keys`, e
    // por isso os dois não podem divergir — a lista é uma vista, não uma
    // segunda fonte de verdade. Este teste existe para o dia em que alguém
    // acrescentar uma projeção e se esquecer dela.
    expect(Object.keys(REGISTO).sort()).toEqual([...LINGUAGENS_COM_PROJECAO].sort());
    expect(LINGUAGENS_COM_PROJECAO.length).toBeGreaterThan(0);
  });

  it('toda projeção tem `emitir` e `ler` que não são a mesma função', () => {
    // Se fossem o mesmo objeto, a projeção não saberia escrever a linguagem
    // que lê — e a lição ficava a mentir por omissão, que é a forma mais
    // barata de mentir e a mais difícil de apanhar.
    for (const nome of LINGUAGENS_COM_PROJECAO) {
      const p = obter(nome);
      expect(p.emit).not.toBe(p.ler);
    }
  });

  it('o que a projeção escreve, a mesma projeção lê sem um erro sequer', () => {
    // A prova de que não há dois sistemas separados. O filtro do plano
    // original — `porque` não contém «não é» — não provava nada: a recusa de
    // um tipo em Java também passa por ali, e o filtro transformationava uma
    // falha numa coisa que não falha. Aqui a afirmação é a que vale: **zero**.
    const medido: Record<string, string[]> = {};
    for (const nome of LINGUAGENS_COM_PROJECAO) {
      medido[nome] = [];
      for (const [nomeDoCaso, caso] of Object.entries(PROGRAMAS)) {
        const texto = emitir(nome, caso).texto;
        const erros = avaliarTexto(nome, texto);
        medido[nome].push(
          `${nomeDoCaso}: ${erros.length === 0 ? 'lido' : erros.map((e) => `${e.classe} — ${e.porque}`).join(' / ')}`,
        );
      }
    }
    for (const [nome, linhas] of Object.entries(medido)) {
      expect(linhas, `linguagem ${nome}`).toEqual(
        Object.keys(PROGRAMAS).map((c) => `${c}: lido`),
      );
    }
  });

  it('e nenhum erro de uma linguagem nomeia outra', () => {
    // A spec §0 tirou as referências cruzadas, e esta é a prova mecânica.
    // O `\b` é o que separa «Java» de «JavaScript»: sem ele, a palavra mais
    // curta casa dentro da mais comprida e o teste acusa um erro de escrita
    // onde não há nenhum.
    // Os dois conjuntos: os que têm de correr limpos e os que têm de falhar.
    // Com só os primeiros não haveria erro nenhum para ler, e a regra passaria
    // a provar que nenhum erro nomeia outra linguagem — o que é um número
    // verdadeiro sobre zero erros.
    for (const nome of LINGUAGENS_COM_PROJECAO) {
      const outras = LINGUAGENS.filter((l) => l !== nome).map((l) => NOMES[l]);
      const casos = { ...PROGRAMAS, ...PROGRAMAS_QUE_FALHAM };
      for (const [nomeDoCaso, caso] of Object.entries(casos)) {
        for (const e of avaliarTexto(nome, emitir(nome, caso).texto)) {
          for (const outra of outras) {
            const onde = new RegExp(`\\b${outra}\\b`);
            expect(onde.test(e.porque), `${nome}/${nomeDoCaso}: porque nomeia ${outra}`).toBe(false);
            expect(onde.test(e.remedio), `${nome}/${nomeDoCaso}: remedio nomeia ${outra}`).toBe(false);
          }
        }
      }
    }
  });
});

describe('as duas linguagens divergem, e é isso que prova a costura', () => {
  it('o mesmo bloco dá texto diferente', () => {
    // O ficheiro dourado. São estas duas linhas que o aluno vai ler, e uma
    // mudança nelas é uma mudança no que ele lê — que é a coisa que este
    // produto promete não mudar por baixo dele.
    expect(emitir('python', pilha(guardar('total', 5))).texto).toBe('total = 5\n');
    expect(emitir('java', pilha(guardar('total', 5))).texto).toBe('int total = 5;\n');
  });

  it('as duas linhas de cima só divergem na `Policy`, e não em código repetido', () => {
    // A tese da costura, escrita de uma forma que um teste apanha: as duas
    // projeções partilham o mesmo `interpretar` e o que muda é **uma
    // propriedade**. Um teste que mede a resposta de cada linguagem mede o
    // mesmo número de duas maneiras; este mede o que está a fazer esse
    // número ser diferente.
    expect(obter('python').policy.recusaNoTipo).toBe(false);
    expect(obter('java').policy.recusaNoTipo).toBe(true);
    expect(obter('python').policy.quando).not.toBe(obter('java').policy.quando);
  });

  it('a mesma violação dá respostas opostas, e sem uma linha de código duplicada', () => {
    // Estas duas linhas **têm de ser escritas à mão**, e não vir dos blocos.
    // A razão é o desenho do emissor: em Java o `emitir` escreve a
    // declaração que o valor pede, e por isso um programa montado em blocos
    // nunca viola um tipo sozinho. A violação nasce quando alguém escreve
    // `int` e dá um texto — e é para isso que o painel de texto existe.
    //
    // Um teste que montasse a violação com blocos passaria a ser um teste
    // sobre o `emitir`, não sobre a `Policy`, e não provaria nada.
    const emPython = avaliarTexto('python', "total = 'olá'\n");
    const emJava = avaliarTexto('java', 'int total = "olá";\n');
    expect(emPython).toEqual([]);
    expect(emJava.some((e) => e.classe === 'Recusa')).toBe(true);
  });

  it('e a recusa de Java diz quando acontece, e o conserto diz o que fazer', () => {
    // A metade da spec §7 que a lição de Python ensina: em Python a mesma
    // linha passa em silêncio, e em Java o compilador recusa. A mensagem
    // tem de **dizer** quando, porque é isso que fica — o aluno repete a
    // frase, não o que aconteceu. E o conserto tem de dizer o que fazer, que é a
    // outra metade de `Recusa`.
    //
    // O conserto não diz «String» e a spec não o pede: quem escreve a frase é
    // o núcleo, e o núcleo não sabe que em Java a um número se chama `int`.
    // Ver a nota no diário sobre este ponto.
    const emJava = avaliarTexto('java', 'int total = "olá";\n');
    const porque = emJava.map((e) => e.porque).join(' ');
    const remedio = emJava.map((e) => e.remedio).join(' ');
    expect(porque).toMatch(/antes de o código correr/);
    expect(porque).toMatch(/não guarda texto/);
    expect(remedio).toMatch(/Guarda aqui um/);
    expect(remedio).toMatch(/é o que este sítio aceita/);
  });

  it('e o `porque` de cada recusa fala só da sua linguagem', () => {
    for (const e of avaliarTexto('java', 'int total = "olá";\n')) {
      expect(e.porque).not.toMatch(/\bPython\b/);
      expect(e.remedio).not.toMatch(/\bPython\b/);
    }
  });
});

describe('o único bloco que não se lê é o `log`, e isso é de propósito', () => {
  it('o `log` é recusado nas duas linguagens, e cada uma explica nos termos dela', () => {
    // Isto apareceu ao escrever o teste de ouro, e é o exemplo mais honesto
    // do projecto: o `log` está no vocabulário partilhado e **nenhuma**
    // linguagem tem essa função. O emissor escreve `log(...)` nas duas, e as
    // duas recusam — cada uma com a sua frase, e cada uma a dizer *quando* se
    // descobre. O bloco existe para ensinar que uma função se escreve antes
    // de se chamar, e um teste que exigisse a inversão exata esconderia
    // justamente a lição.
    //
    // A afirmação é a que importa e é mais forte do que «não rebenta»: a
    // recusa **nombra a sua linguagem** e a **diz como se corrige**.
    for (const nome of LINGUAGENS_COM_PROJECAO) {
      const texto = emitir(nome, pilha(log(5))).texto;
      const erros = avaliarTexto(nome, texto);
      expect(erros.length, `${nome}: o log devia ser recusado`).toBeGreaterThan(0);
      const primeira = erros[0];
      if (primeira === undefined) continue;
      expect(primeira.porque, nome).toMatch(new RegExp(`\\b${NOMES[nome as Language]}\\b`));
      expect(primeira.remedio, nome).toMatch(/Escreve a função log/);
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
    // projeções e uma lição — e é o mesmo número que o seletor mostra ao
    // aluno no ecrã, dito pelas mesmas duas funções.
    expect(LINGUAGENS_COM_PROJECAO).toContain('java');
    expect(temLicao('java')).toBe(false);
  });

  it('e a lição de Python é a única que o produto pode oferecer', () => {
    const comLicao = LINGUAGENS.filter((l) => temLicao(l));
    expect(comLicao).toEqual(['python']);
  });
});
```

- [ ] **Step 2: O portão de conteúdo**

`src/conteudo/portao.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { CARREGAR, TEXTOS, executarSonda, temLicao } from './index';
import type { Licao } from './index';
import { obter } from '../projecoes/registo';
import { emitir } from '../projecoes/avaliar';
import { LINGUAGENS, NOMES } from '../nucleo/tipos';
import type { BlocoLeigo } from '../nucleo/blocos';
import type { Language } from '../nucleo/tipos';

/** Todas as lições escritas, uma por entrada de `TEXTOS`.
 *
 *  A lista vem de `TEXTOS` e **não** de um par `linguagem` + chave escrito à
 *  mão. O plano original desta tarefa escribia `const CHAVE = 'variavel'` e
 *  iterava `LICSOES`, que é a lista das *linguagens* com lição: a segunda
 *  lição de Python, ou a primeira lição de qualquer outra linguagem, entravam
 *  pelo mesmo `CARREGAR` com um nome que ninguém escrevera, e o portão
 *  media um ficheiro. Um portão que mede um ficheiro não é um portão: é um
 *  teste. */
const LICOES: { chave: string; linguagem: Language; licao: Licao }[] = Object.entries(TEXTOS).map(
  ([chave, texto]) => {
    const linguagem = chave.slice(0, chave.indexOf('/')) as Language;
    return { chave, linguagem, licao: CARREGAR(texto, linguagem) };
  },
);

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** O texto que a projeção escreve tem de ser código, e não a impressão
 *  de um `undefined`.
 *
 *  Um `undefined = 5` é um programa que o Python aceita e que não faz nada
 *  do que a lição promete. Ver a linha é a única forma de o apanhar: o
 *  carregador diz que o dado é válido, e isso é uma verdade sobre o dado, não
 *  sobre o que ele escreve.
 *
 *  `vazio` muda de regra conforme o sítio, e a diferença vem do
 *  produto: o programa de uma **sondagem** tem de escrever alguma coisa, ou
 *  não prova nada; o programa de um **passo** pode ser vazio, e é o que o
 *  passo da ficha de leitura faz — o aluno abre o ficheiro e o ecrã dos
 *  blocos está em branco de propósito, para que o ficheiro seja a única coisa
 *  a ler. Uma regra única para os dois obrigaria a inventar um bloco no
 *  passo da leitura, e o bloco inventado é o primeiro sitio onde a pessoa
 *  inventa. */
function conferir(linguagem: Language, bloco: BlocoLeigo, onde: string, vazio: boolean): void {
  const texto = emitir(linguagem, bloco).texto;
  if (vazio) {
    expect(texto.length, `${onde}: uma sondagem que não escreve nada não prova nada`).toBeGreaterThan(
      0,
    );
  }
  for (const proibido of ['undefined', '[object Object]', 'NaN']) {
    expect(texto.includes(proibido), `${onde}: ${proibido} em ${texto}`).toBe(false);
  }
}

/** Uma lição tem de mostrar uma recusa quando a linguagem recusa?
 *
 *  A pergunta é da linguagem, e a resposta vem do mesmo sítio: a `Policy`. A
 *  versão desta regra escrita no plano era um `if (!policy) continue` dentro do
 *  `for`, e com uma lição só — a de Python, que não recusa — o corpo nunca
 *  chegava a correr. Tirá-la para uma função é o que a torna verificável sem a
 *  segunda lição, e é também a forma de a mesma verdade não viver escrita duas
 *  vezes. */
function exigeRecusa(recusaNoTipo: boolean, classes: Set<string>): boolean {
  return !recusaNoTipo || classes.has('Recusa');
}

describe('o portão existe antes de medir seja o que for', () => {
  it('há pelo menos uma lição escrita, e cada chave é `linguagem/nome`', () => {
    // Quatro das cinco asserções deste ficheiro percorrem listas. Uma lista
    // vazia passa por cima de todas, e um portão que passa sem ter medido
    // nada é pior do que um portão que não existe — porque dá confiança.
    expect(LICOES.length).toBeGreaterThan(0);
    for (const { chave, linguagem, licao } of LICOES) {
      expect(chave, 'a chave tem de ser `linguagem/nome`').toBe(`${linguagem}/${licao.id}`);
      expect(linguagem, `${chave}: a linguagem da chave`).toBe(licao.linguagem);
      expect(LINGUAGENS, `${chave}: tem de ser uma das seis`).toContain(linguagem);
    }
  });
});

describe('toda lição escrita passa todas as suas sondagens', () => {
  for (const { chave, linguagem, licao } of LICOES) {
    it(`${chave}: todas as sondagens passam`, () => {
      const falhadas = licao.sondas
        .map((s) => executarSonda(s, linguagem))
        .filter((r) => !r.ok)
        .map((r) => ({ nome: r.nome, esperada: r.esperada, observada: r.observada, erro: r.erro }));
      expect(falhadas).toEqual([]);
    });
  }
});

describe('o formato aguenta uma lição inteira', () => {
  it('toda lição tem pelo menos seis sondagens', () => {
    // Menos de seis sondas não é uma lição, é um exemplo. A lição mínima é
    // explicar, fazer, nomear, e ter pelo menos uma história em que as
    // coisas rebentam.
    for (const { chave, licao } of LICOES) {
      expect(licao.sondas.length, chave).toBeGreaterThanOrEqual(6);
    }
  });

  it('toda lição tem as três fases', () => {
    for (const { chave, licao } of LICOES) {
      const fases = new Set(licao.passos.map((p) => p.fase));
      expect([...fases].sort(), chave).toEqual(['explicar', 'fazer', 'nomear']);
    }
  });

  it('toda lição tem pelo menos uma sondagem em que as coisas rebentam', () => {
    // Uma lição que só tem `Observacao` não ensina nada sobre quando as
    // coisas rebentam — e é quando as coisas rebentam que a pessoa está a
    // aprender a ler.
    //
    // E o inverso também é verdade, e é por isso que este teste **não** exige
    // uma `Recusa`: a §10 diz que em Python e em JavaScript a recusa de tipo
    // nunca acontece, e um portão que a exigisse ensinaria a pessoa a ver
    // uma recusa onde a linguagem não dá nenhuma.
    for (const { chave, licao } of LICOES) {
      const classes = new Set(licao.sondas.map((s) => s.esperado.classe));
      expect(
        classes.has('FalhaRuntime') || classes.has('Recusa'),
        `${chave}: nenhuma sondagem é sobre uma falha`,
      ).toBe(true);
    }
  });

  it('toda lição de uma linguagem que recusa no tipo tem uma sondagem de recusa', () => {
    // A condição é a `Policy` da linguagem, e não a lista de linguagens: é a
    // única forma de a afirmação continuar verdadeira quando entrar a lição de
    // Java, e é a forma de ela ser verificável sem uma lista escrita à mão.
    for (const { chave, linguagem, licao } of LICOES) {
      const classes = new Set(licao.sondas.map((s) => s.esperado.classe));
      expect(
        exigeRecusa(obter(linguagem).policy.recusaNoTipo, classes),
        `${chave}: a linguagem recusa e a lição nunca mostra`,
      ).toBe(true);
    }
  });

  it('a regra da recusa acende para uma linguagem que recusa, e não para uma que não recusa', () => {
    // A iteração acima só a exercita em Python, que não recusa: o `continue`
    // de uma versão anterior saltava o corpo do `expect` sem chegar a
    // executá-lo, e um teste que nunca executa a sua afirmação não prova
    // nada. Aqui a regra é chamada com os dois lados, e por isso não depende
    // de haver uma segunda lição para ser provada.
    expect(exigeRecusa(true, new Set(['Observacao']))).toBe(false);
    expect(exigeRecusa(true, new Set(['Observacao', 'Recusa']))).toBe(true);
    expect(exigeRecusa(true, new Set(['FalhaRuntime']))).toBe(false);
    expect(exigeRecusa(false, new Set(['Observacao']))).toBe(true);
  });
});

/** Os sete defeitos de conteúdo que o formato deixou passar na primeira
 *  lição, e o que fecha cada um deles.
 *
 *  O teste da lição de Python apanhou seis deles com uma lista de sete
 *  palavras proibidas e um `emitir` de cada bloco. Os dois primeiros são
 *  fixos, os dois últimos são listas que não fecham: uma lista de sete
 *  palavras não é a regra «uma palavra que não responde», é sete exemplos
 *  dessa regra. Este bloco é a regra, e por isso foi o primeiro a apanhar
 *  os dois que ficaram — que é a prova de que o portão serve para alguma
 *  coisa antes de a segunda lição existir. */
describe('os defeitos de conteúdo da primeira lição, fechados pela regra', () => {
  it('nenhum programa da lição escreve `undefined`, `[object Object]` ou `NaN`', () => {
    // Defeito 1, o mais caro: trocar `nome` por `NOME` no YAML deixava os 36
    // testes verdes e o aluno lia `undefined = 5`. O que o teste antigo via
    // era o carregador a aceitar, que é outra coisa. Aqui vê-se **a linha
    // que o aluno lê**.
    //
    // E são **todos** os programas, não só os que os passos levam: o bloco de
    // um passo e o programa de uma sondagem são duas cópias separadas no
    // YAML, e a mutação de `NOME` calhava na segunda. Uma versão desta
    // conferência que olhasse só para os passos passava com
    // `undefined = 5` à vista — que foi exatamente o que aconteceu na
    // primeira tentativa desta tarefa, e o que a segunda mediu.
    for (const { chave, linguagem, licao } of LICOES) {
      for (const [i, passo] of licao.passos.entries()) {
        conferir(linguagem, passo.bloco, `${chave} passo ${i}`, false);
      }
      for (const sonda of licao.sondas) {
        if (sonda.prova.programa === undefined) continue;
        conferir(linguagem, sonda.prova.programa, `${chave}/${sonda.nome}`, true);
      }
    }
  });

  // Os defeitos 2, 3 e 4 — um passo que aponta para uma sondagem que não
  // existe, um nome de sondagem no sítio do bloco, e um bloco escondido dentro
  // de uma `pilha` — **não têm teste aqui**, e é de propósito. O carregador
  // recusa os três antes de este ficheiro chegar a vê-los, e a mutação que
  // tentava partir um deles pôs o portão vermelho com um erro de carga, não
  // com uma falha desta secção. Um teste que só pode falhar se o carregador
  // deixar de recusar não é uma segunda rede: é a mesma rede contada duas
  // vezes, e a segunda contagem faz o ficheiro parecer mais forte do que é.
  // As regras vivem em `carregar.test.ts` e estão lá provadas.

  it('nenhuma sondagem com nome de falha espera que nada falhe', () => {
    // Defeito 5: `a-divisao-que-nao-existe` era uma soma, e
    // `a-divisao-por-uma-funcao-que-nao-existe` era uma função em falta. O
    // nome é a primeira coisa que o autor escreve e a última que o aluno lê,
    // e um nome que mente ensina a pessoa a desconfiar dos nomes.
    const MENTIRA = /que-nao-existe|que-falta|sem-valor|que-nao-funciona|inexistente/;
    for (const { chave, licao } of LICOES) {
      for (const s of licao.sondas) {
        if (!MENTIRA.test(s.nome)) continue;
        expect(s.esperado.classe, `${chave}: ${s.nome}`).not.toBe('Observacao');
      }
    }
  });

  it('nenhuma pergunta da ficha aceita uma palavra da própria pergunta', () => {
    // Defeito 6, e a regra que fecha a classe toda. O teste da lição tinha
    // uma lista de sete palavras proibidas — `não`, `nunca`, `acho`, `sei` —
    // e uma lista não é uma regra. A regra é outra e é mais curta: **uma
    // palavra que a pergunta já diz não é a resposta**, porque responder com
    // ela é repetir a pergunta em vez de dizer o que a linha faz.
    //
    // Foi esta regra que apanhou os dois que ficaram da primeira lição: «o
    // nome» e «a palavra entre aspas» eram perguntas *e* respostas, e «o que
    // muda» aceitava «muda».
    for (const { chave, licao } of LICOES) {
      for (const passo of licao.passos) {
        for (const momento of passo.momentos) {
          if (momento.fonte !== 'leitura' || momento.palavras.length === 0) continue;
          const daPergunta = normalizar(momento.texto);
          for (const palavra of momento.palavras) {
            const pedida = normalizar(palavra);
            if (pedida.length === 0) continue;
            expect(
              daPergunta.includes(pedida),
              `${chave}/${momento.id}: «${palavra}» está na pergunta «${momento.texto}»`,
            ).toBe(false);
          }
        }
      }
    }
  });

  it('todo passo que manda ler um ficheiro pergunta todas as linhas dele', () => {
    // Defeito 7: o plano mandava acrescentar duas linhas ao ficheiro de
    // leitura, e elas ficavam depois da linha que rebenta — a lição
    // ensinaria que uma linha depois de uma falha é uma linha que se vê, que
    // é o contrário do que ela ensina. A pergunta por linha é o que impede
    // que o ficheiro cresça sem que ninguém leia o que cresceu.
    for (const { chave, licao } of LICOES) {
      for (const [i, passo] of licao.passos.entries()) {
        if (passo.referencia === undefined) continue;
        const sonda = licao.sondas.find((s) => s.nome === passo.sonda);
        const texto = sonda?.prova.texto;
        expect(texto, `${chave} passo ${i}: o ficheiro só existe na sondagem`).toBeDefined();
        if (texto === undefined) continue;
        const linhas = texto.trimEnd().split('\n');
        const perguntas = passo.momentos.filter((m) => m.fonte === 'leitura');
        expect(perguntas.length, `${chave} passo ${i}: perguntas por linha`).toBe(linhas.length);
        // E não se exige que a pergunta diga o número da linha: «O que é
        // `True` aqui?» é uma boa pergunta sobre a linha 4, e obrigá-la a
        // citar o número transformava a pergunta num formulário. O que se
        // exige é uma pergunta por linha e nenhum `id` repetido — e a ordem
        // do ficheiro é a ordem das perguntas, porque uma pergunta por linha
        // e um ficheiro de N linhas só se emparelham de uma maneira.
        expect(
          new Set(perguntas.map((m) => m.id)).size,
          `${chave} passo ${i}: perguntas repetidas`,
        ).toBe(linhas.length);
      }
    }
  });
});

/** O falsificador escrito: «a segunda lição precisar de um campo novo».
 *
 *  O formato é o contrato, e um contrato que cresce sem ninguém decidir é um
 *  contrato que ninguém leu. Este teste nomeia os campos, todos, e cada
 *  lição escrita tem de ter exatamente esses — nem mais um, nem menos um.
 *  Uma segunda lição que precise de um campo obriga a acrescentar uma linha
 *  aqui, e a linha é a conversa da §16.1 a acontecer antes da segunda lição,
 *  que é a única altura em que ela é barata. */
const CAMPOS: Record<string, string[]> = {
  Licao: ['id', 'linguagem', 'titulo', 'porqueTitulo', 'blocos', 'passos', 'sondas', 'paraSaberQueFez'],
  Passo: ['fase', 'porque', 'bloco', 'sonda', 'momentos', 'nomear', 'referencia'],
  Momento: ['id', 'texto', 'palavras', 'fonte'],
  Sonda: ['nome', 'pergunta', 'porque', 'prova', 'esperado'],
  Prova: ['forma', 'programa', 'texto'],
  Esperado: ['classe', 'porque'],
};

describe('o formato do conteúdo não cresceu sem ninguém decidir', () => {
  it('os campos de uma lição são exatamente os que estão escritos aqui', () => {
    for (const { chave, licao } of LICOES) {
      expect(Object.keys(licao), chave).toEqual(CAMPOS.Licao);
      for (const passo of licao.passos) {
        // `nomear` e `referencia` são opcionais, e por isso a comparação é
        // por conjunto e não por lista: a ordem é do YAML, e a ordem não é
        // parte do contrato.
        const campos = Object.keys(passo);
        for (const obrigatorio of ['fase', 'porque', 'bloco', 'sonda', 'momentos']) {
          expect(campos, `${chave}: o campo ${obrigatorio}`).toContain(obrigatorio);
        }
        for (const campo of campos) {
          expect(CAMPOS.Passo, `${chave}: o campo a mais ${campo}`).toContain(campo);
        }
        for (const momento of passo.momentos) {
          expect(Object.keys(momento), `${chave}/${momento.id}`).toEqual(CAMPOS.Momento);
        }
      }
      for (const sonda of licao.sondas) {
        expect(Object.keys(sonda), `${chave}/${sonda.nome}`).toEqual(CAMPOS.Sonda);
        const temPrograma = sonda.prova.programa !== undefined;
        const temTexto = sonda.prova.texto !== undefined;
        // Uma prova tem `programa` **ou** `texto`, e a porta não sabe qual
        // das duas se espera: a sondagem que mostra um ficheiro para ler tem
        // `texto`, e as outras têm `programa`. Uma regra que fixasse
        // `programa` reprovaria a única sondagem da lição que ensina a ler um
        // ficheiro inteiro — que é a mais importante das oito.
        expect(
          [temPrograma, temTexto].filter(Boolean).length,
          `${chave}/${sonda.nome}: a prova tem programa ou texto, nunca os dois`,
        ).toBe(1);
        expect(
          [sonda.prova.forma, sonda.prova.programa, sonda.prova.texto].filter(
            (v) => v !== undefined,
          ).length,
          `${chave}/${sonda.nome}: a prova tem ` + 'forma' + ' e mais nada',
        ).toBe(2);
        expect(Object.keys(sonda.esperado), `${chave}/${sonda.nome}`).toEqual(CAMPOS.Esperado);
      }
    }
  });

  it('este teste cobre o que ele diz: o `CAMPOS` tem o mesmo número de linhas que o esquema', () => {
    // A lista de cima é escrita à mão, e uma lista escrita à mão que fica
    // desatualizada é o defeito que este ficheiro existe para apanhar — a
    // dois sítios. Se `esquema.ts` ganhar um campo e ninguém acrescentar aqui,
    // o teste acima passa (porque a lição não o tem) e este acende.
    expect(CAMPOS.Licao).toContain('paraSaberQueFez');
    expect(CAMPOS.Passo).toContain('referencia');
    expect(CAMPOS.Momento).not.toContain('linha');
  });
});

describe('o estado real do produto, em números', () => {
  it('o catálogo é coerente com o que existe', () => {
    // Este teste não falha. Serve para quando alguém pergunta «quantas
    // linguagens há?», e a resposta está num `git grep` e não na cabeça de
    // ninguém. E são os números que vão no commit da decisão, escritos à mão
    // para que a leitura não dependa de alguém correr isto.
    const escrita = LINGUAGENS.filter((l) => temLicao(l));
    const semLicao = LINGUAGENS.filter((l) => !temLicao(l));
    const comProjecao = LINGUAGENS.filter((l) => {
      try {
        obter(l);
        return true;
      } catch {
        return false;
      }
    });
    const nome = (ls: Language[]) => ls.map((l) => NOMES[l]).join(', ');
    console.log(
      `catálogo: ${LINGUAGENS.length} linguagens, ` +
        `${comProjecao.length} projeções (${nome(comProjecao)}), ` +
        `${escrita.length} ${escrita.length === 1 ? 'lição escrita' : 'lições escritas'} ` +
        `(${nome(escrita)}), ${semLicao.length} sem lição (${nome(semLicao)})`,
    );
    expect(escrita.length).toBeGreaterThan(0);
    // E a verdade que o seletor mostra ao aluno, dita por outra via: uma
    // lição nunca pode existir numa linguagem que o produto não sabe julgar,
    // porque o painel de texto escreveria a linha e a leitura dela não
    // responderia. A versão anterior desta frase comparava `temLicao` com
    // `temLicao` dos dois lados, e portanto não podia falhar.
    for (const l of escrita) {
      expect(comProjecao, `${NOMES[l]}: há lição e não há projeção`).toContain(l);
    }
    // E o produto tem de ter pelo menos uma linguagem que se possa oferecer
    // a alguém hoje — sem isto o portão passa com o produto fechado.
    expect(
      LINGUAGENS.filter((l) => comProjecao.includes(l) && temLicao(l)),
      'nenhuma linguagem está pronta',
    ).not.toEqual([]);
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

Isto é o que a spec chama critério de sucesso, e a forma que o plano pedia — à mão, uma vez, com alguém a olhar — **está errada**, por três medidas e por um motivo. Os sete passos continuam a ser o que o produto tem de fazer; o que mudou é que cada um deles está agora medido, e três deles diziam uma coisa que o produto não faz.

O **motivo** é o primeiro: um rito de uma vez só prova que alguém o fez uma vez. Um ficheiro de testes corre com o resto, e quando a lição ou o motor mudam o portão muda com eles. Por isso os dois passos que já estavam medidos por outros ficheiros **não** foram medidos outra vez — repetir o que já se prova deixa o ficheiro mais comprido e faz parecer que há uma cobertura que não há.

1. O seletor oferece as linguagens que existem e diz por que as outras não — medido em `entrada.test.tsx`, seis e três testes.
2. Escolher Python abre a lição — medido em `entrada.test.tsx` e em `tela.test.tsx`.
3. **O ficheiro de quinze linhas é lido, não corrido, e morre uma vez.** Não duas: a medição dá `FalhaRuntime` na linha 12, em `log(total)`, e a linha 15 nunca corre — em Python uma função que não existe mata o programa na linha onde aparece. A versão anterior deste passo prometia duas falhas, e a lição escrevia «a segunda vem cinco linhas depois»; as duas frases estavam erradas e foram corrigidas. A leitura também **não oferece «Correr o programa»**, e é de propósito: correr o ficheiro responderia à pergunta da linha 12.
4. **O painel de texto compara; não julga.** Escrever `total = 'olá'` e `print(total)` dá uma divergência na linha 1 — e está bem que dê, porque a linha 1 é a que difere. A versão anterior deste passo esperava que a segunda linha falhasse: em Python `print` aceita qualquer coisa, e essa linha corre bem. E o painel não é o sítio onde a falha mora: quem julga o texto escrito é o motor, e a falha que **nomeia a variável e não uma linha** existe com a entrada que soma — `total = 'olá'` seguido de `total = total + 1`.
5. **`int total = 5;` no painel de Python dá duas respostas verdadeiras em sítios diferentes.** O ecrã compara e diz que a linha acaba em ponto-e-vírgula, e tem razão; o motor julga e diz «Esta linha não é Python», sem código de erro, também com razão. As duas respondem a perguntas diferentes, e o ficheiro de testes mede as duas para que ninguém confunda uma com a outra.
6. **Um texto num sítio de número, nos blocos, não é recusado — e a lição é essa.** Em Python `total = 'olá'` é uma linha válida, e um produto que a recusasse estaria a ensinar que Python protege o tipo, que é o contrário do que a lição existe para dizer. A recusa de tipo vive no texto das quatro linguagens que recusam e no ecrã do robô. A **única** `Recusa` que o caminho dos blocos produz, nas seis linguagens, é a do número de voltas — e o seu `remedio` diz o tecto em números («de 1000 para baixo») e não o nome de uma linguagem.
7. O painel de Java mostra `int total = 5;`, e escrever `total = 5` é recusado com a razão de que o tipo se escreve antes do nome.

E há um oitavo caminho que **não** é medido e que é preciso dizer que existe: o `Aplicacao` tem um ecrã que explica que a lição ainda não está escrita, e esse ecrã não tem porta de entrada — o seletor não dá botão a uma linguagem sem lição. Medi-lo exigiria dar uma prop ao `Aplicacao` só para ele, e uma prop que só existe para um teste é um caminho que se passa a manter vivo.

`src/ui/lecao/portao-manual.test.tsx`:
```typescript
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tela } from './Tela';
import { CARREGAR } from '../../conteudo';
import type { Fonte, Licao, Momento, Passo } from '../../conteudo/esquema';
import { LINGUAGENS, NOMES } from '../../nucleo/tipos';
import type { BlocoLeigo } from '../../nucleo/blocos';
import type { Erro } from '../../nucleo/tipos';
import { avaliarTexto } from '../../projecoes/avaliar';

/** O portão manual, tornado permanente.
 *
 *  O plano escrevia este portão como sete passos «à mão», com a instrução de
 *  não o saltar porque nenhum teste o fazia. Esta ficha é a mesma coisa com
 *  a instrução trocada: o que era um rito de uma vez passou a ser um ficheiro
 *  que corre com o resto. A diferença é que um rito de uma vez só prova que
 *  alguém o fez uma vez.
 *
 *  **Não são os sete passos todos.** Dois deles já medidos não são medidos
 *  outra vez, porque um ficheiro que repete o que outro ficheiro já prova não
 *  fica mais forte — fica mais comprido, e passa a dar a impressão de uma
 *  cobertura que não existe. O mapa é este:
 *
 *  1. O seletor oferece as que existem e diz por que as outras não —
 *     `entrada.test.tsx`, seis e três testes.
 *  2. Escolher Python abre a lição — `entrada.test.tsx`, e `tela.test.tsx`
 *     para o que acontece a seguir.
 *  3. O ficheiro da ficha, e onde ele morre — **aqui**, e em lado nenhum.
 *  4. O painel de texto e o motor, cada um a dizer a sua coisa — **aqui**.
 *  5. `int total = 5;` no painel de Python — **aqui** para o ecrã, e
 *     `python.test.ts` para o motor.
 *  6. Um texto num sítio de número, nos blocos — **aqui**, pelo ecrã.
 *  7. Java a escrever o tipo, e o motor a dizer porquê — **aqui** para o
 *     ecrã, e `dourados.test.ts` para o motor.
 *
 *  E há três coisas que o plano escrevia de uma maneira e que, medidas, são de
 *  outra. Cada uma está escrita no sítio onde o teste a encontra, com a
 *  medição ao lado, porque um ficheiro de testes que corrige o plano em
 *  silêncio deixa o plano errado no sítio em que se vai lê-lo outra vez.
 *
 *  E há um oitavo caminho que este ficheiro não mede e que é preciso dizer
 *  que existe: o `Aplicacao` tem uma ecra que explica que a lição ainda não
 *  está escrita, e essa ecra **não tem porta de entrada**. O seletor não dá
 *  botão a uma linguagem que não tem lição, e é por isso que o ecrã existe
 *  apenas para o caso de alguma vez se chegar ali por outra via — o que
 *  hoje não acontece. Medi-lo exigiria dar uma prop ao `Aplicacao` só para
 *  ele, e uma prop que existe só para um teste é um caminho que se passa a
 *  manter vivo. Fica escrito, e não medido. */

/** O tecto de tempo deste ficheiro.
 *
 *  Montar o ecrã é montar o Blockly, e o Blockly mede um SVG que o jsdom não
 *  sabe medir. A constante de 5 s do Vitest é o que mata metade destes testes
 *  quando o ficheiro corre ao lado dos outros; a de 20 s é a de
 *  `tela.test.tsx`, pelo mesmo motivo e com a mesma conta. */
const PASSO_A_PASSO = 20_000;

/** Os seis nomes, tirados do sítio onde estão escritos.
 *
 *  Uma lista escrita à mão aqui seria uma segunda fonte da verdade sobre as
 *  linguagens, e a segunda fonte divergiria da primeira no dia em que
 *  entrasse uma sétima — sem nenhum teste ficar vermelho. */
const NOMES_DAS_SEIS = LINGUAGENS.map((l) => NOMES[l]);


/** A linha de que o erro se culpa, seja qual for a classe.
 *
 *  `FalhaRuntime` chama-lhe `passo` e `QuebraEquivalencia` chama-lhe `linha`,
 *  e `Recusa` não tem campo nenhum: o seu número está em `origem.passo`, que
 *  é onde o núcleo põe a linha de todas as coisas que não são
 *  `FalhaRuntime`. As três são o mesmo sítio — a linha — e o ficheiro pergunta
 *  pela linha, não pelo nome que a classe lhe dá. */
function linhaDe(e: Erro): number {
  if (e.classe === 'Recusa') return e.origem.passo;
  return e.classe === 'FalhaRuntime' ? e.passo : e.linha;
}

function textoDoEcran(): string {
  return document.body.textContent ?? '';
}

let LICAO: Licao;
let FICHEIRO: { nome: string; linhas: string[] };

beforeAll(async () => {
  const { default: bruto } = await import('../../conteudo/python/variavel.yml?raw');
  LICAO = CARREGAR(bruto, 'python');
  const passo = LICAO.passos.find((p) => p.referencia !== undefined);
  if (passo === undefined || passo.referencia === undefined) {
    throw new Error('a lição já não tem nenhum passo que mande ler um ficheiro');
  }
  // As linhas do ficheiro saem da sondagem, e `referencia` só tem o nome. É
  // assim que o `estado` faz, e é por isso que este ficheiro o faz igual: um
  // ficheiro que mede o ficheiro por um caminho que o ecrã não usa mede o
  // ficheiro errado.
  const texto = LICAO.sondas.find((s) => s.nome === passo.sonda)?.prova.texto;
  if (texto === undefined) throw new Error('a sondagem do ficheiro não tem `texto`');
  FICHEIRO = {
    nome: passo.referencia.nome,
    linhas: texto.trimEnd().split('\n'),
  };
});

/** O texto do ficheiro que a ficha mostra.
 *
 *  Sai da sondagem do passo, e não do `referencia`: o `referencia` é o nome
 *  e mais nada, e a sondagem é onde o ficheiro está escrito. Um teste que
 *  medisse o `referencia` mediria uma coisa que o ecrã não lê. */
function textoDoFicheiro(): string {
  return FICHEIRO.linhas.join('\n') + '\n';
}

function errosDoFicheiro(): Erro[] {
  return avaliarTexto('python', textoDoFicheiro());
}

/** A lição com um passo só, o bloco que se quiser, e a fonte que se quiser.
 *
 *  A lição do Python **não tem** nenhum passo de fonte `texto`: os seus onze
 *  passos são blocos ou leitura, e o painel de texto é uma porta que o
 *  produto tem e que esta lição não abre. Para medir a porta é preciso uma
 *  lição que a abra, e construí-la por cima da lição real — o mesmo
 *  ficheiro, o mesmo primeiro passo, com o bloco e os momentos trocados — é
 *  o que a mantém honesta. Uma lição escrita à mão provaria que o ecrã
 *  funciona com uma lição que este ficheiro inventou.
 *
 *  O `fonte` é um parâmetro e não uma constante porque este ficheiro mede as
 *  duas portas — a dos blocos e a do texto — e uma função que só soubesse
 *  abrir uma delas mediria metade do ecrã sem o dizer. */
function licaoCom(bloco: BlocoLeigo, fonte: Fonte): Licao {
  const momento: Momento = {
    id: 'codigo',
    texto: 'O que diz o teu código?',
    palavras: [],
    fonte,
  };
  const passo: Passo = { ...LICAO.passos[0]!, bloco, momentos: [momento] };
  return { ...LICAO, passos: [passo] };
}

function escrever(codigo: string): void {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: codigo } });
  fireEvent.click(screen.getByRole('button', { name: 'Executar' }));
}

describe('O portão manual, que era um rito e passou a ser um ficheiro', () => {
  it('o ficheiro da ficha é o ficheiro, e o ficheiro morre na linha 12', () => {
    // O passo 3 do portão, e o mais importante dos sete: é o ficheiro que a
    // pessoa nunca viu, e a única verdade sobre ele é a que a projeção diz
    // quando o lê.
    const linhas = textoDoFicheiro().trimEnd().split('\n');
    expect(linhas).toHaveLength(15);
    expect(FICHEIRO.linhas).toEqual(linhas);

    // Cada linha do ficheiro tem a sua pergunta, pela ordem do ficheiro.
    const passo = LICAO.passos.find((p) => p.referencia !== undefined)!;
    const perguntas = passo.momentos.filter((m) => m.fonte === 'leitura');
    expect(perguntas.map((m) => m.id)).toEqual(linhas.map((_, i) => `l${i + 1}`));

    // E o ficheiro morre uma vez, na linha 12. Uma vez — e este número é o
    // que a medição deu. A versão anterior da lição prometia duas, e escrevia
    // «a segunda vem cinco linhas depois». Não vem: em Python uma função que
    // não existe mata o programa na linha em que aparece, e a linha 15
    // nunca corre. A falsehood estava na lição, e não no motor.
    const erros = errosDoFicheiro();
    expect(erros).toHaveLength(1);
    expect(erros[0]?.classe).toBe('FalhaRuntime');
    expect(linhaDe(erros[0]!)).toBe(12);
    expect(erros[0]?.porque).toContain('log');

    // E a linha de que a projeção se culpa é uma linha de que a ficha
    // pergunta. Um ficheiro que rebenta numa linha de que ninguém pergunta
    // tem uma pergunta a mais; esta afirmação é a que apanha esse caso.
    for (const erro of erros) {
      expect(perguntas.map((m) => m.id)).toContain(`l${linhaDe(erro)}`);
    }
  }, PASSO_A_PASSO);

  it('a ficha imprime a medição ao lado da frase, porque a frase é da pessoa', () => {
    // O que este ficheiro não conseguiu fechar com uma regra, e é bom que
    // fique escrito porquê. O defeito encontrado — uma sondagem a prometer
    // duas falhas num ficheiro que dá uma — é uma **frase** que diz mais do
    // que o produto faz. Uma regra que apanhasse isto teria de saber que «a
    // segunda» e «duas que rebentam» são contagens em português, e essa
    // lista envelheceria mal e passaria a ser a fonte da verdade sobre o que
    // o ficheiro faz.
    //
    // O que fica é a medição ao lado da frase, para o olho de quem revê as
    // apanhar. Isto não é um teste de nada: mede e imprime, e por isso não
    // pode ficar vermelho. Está aqui porque um ficheiro que imprime é mais
    // difícil de ignorar do que uma nota num caderno.
    const erros = errosDoFicheiro();
    for (const passo of LICAO.passos.filter((p) => p.referencia !== undefined)) {
      const sonda = LICAO.sondas.find((s) => s.nome === passo.sonda)!;
      const medido = erros.map((e) => `${e.classe} na linha ${linhaDe(e)}`).join(', ');
      const escrito = (sonda.esperado.porque ?? '').trim().split('\n')[0] ?? '';
      console.log(`FICHA medido: ${medido} || a lição escreve: ${escrito}`);
    }
    expect(erros.length).toBeGreaterThan(0);
  }, PASSO_A_PASSO);

  it('a leitura não oferece «Correr o programa», e é de propósito', () => {
    // A segunda metade do passo 3. Correr o ficheiro resolveria a pergunta da
    // linha 12 — o erro apareceria no ecrã e a pergunta ficaria sem resposta
    // — e a ficha existe para a pessoa ler, não para a ver acontecer. A
    // decisão é do produto e por isso tem de estar escrita num teste: sem ele,
    // um dia alguém acrescenta o botão «só aqui», e o botão é a coisa mais
    // óbvia do ecrã.
    render(<Tela linguagem="python" licao={LICAO} passoInicial={8} />);
    expect(screen.queryByRole('button', { name: 'Correr o programa' })).toBeNull();

    // E o ficheiro está lá, linha a linha, todas as quinze.
    for (const linha of FICHEIRO.linhas) {
      expect(textoDoEcran()).toContain(linha);
    }
  }, PASSO_A_PASSO);

  it('o painel de texto compara linha a linha, e a comparação diz o fecho que falta', () => {
    // Os passos 4 e 5 pela porta que o produto tem. O painel de texto
    // **compara** o que se escreve com o que os blocos escrevem; ele não
    // julga, e a diferença é o desenho: quem escreve está a ver a mesma
    // coisa noutra sintaxe, e a pergunta útil é «em que linha é que a minha
    // difere».
    //
    // O plano escrevia que `int total = 5;` tinha de ser recusado com um
    // `porque` que dissesse que a linha não é Python. Isso é o que o
    // **motor** diz, e está medido em `python.test.ts`. O ecrã diz outra
    // coisa, e também verdadeira: a linha tem um `;` que a linguagem não
    // pede. As duas são verdade porque respondem a perguntas diferentes, e
    // este teste existe para que ninguém confunda uma com a outra.
    render(
      <Tela
        linguagem="python"
        licao={licaoCom(
          {
            type: 'guardar',
            fields: { nome: { valor: 'total' } },
            inputs: { VALOR: { valor: 5 } },
          },
          'texto',
        )}
      />,
    );

    // O texto que a projeção escreve já está lá, e é o certo.
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('total = 5\n');

    // Escrever a linha que o painel espera não dá aviso nenhum.
    escrever('total = 5\n');
    expect(textoDoEcran()).not.toContain('ponto-e-vírgula');

    // Escrever com o `;` dá um aviso, e o aviso é sobre o `;`.
    escrever('total = 5;\n');
    expect(textoDoEcran()).toContain('ponto-e-vírgula');
    expect(textoDoEcran()).toContain('Retira o');
  }, PASSO_A_PASSO);

  it('o motor nomeia a variável que está mal, e não a linha', () => {
    // O que o passo 4 do portão queria, com a entrada que o motor conhece.
    // O plano escrevia `total = 'olá'` seguido de `print(total)`, e esperava
    // que a segunda linha falhasse: em Python `print` aceita qualquer coisa,
    // e essa linha corre bem. A entrada que dá a falha pedida é a que soma,
    // e a falha diz o que a lição inteira quer que diga.
    const erros = avaliarTexto('python', "total = 'olá'\ntotal = total + 1\n");
    expect(erros).toHaveLength(1);
    expect(erros[0]?.porque).toContain('total');
    expect(erros[0]?.porque).toContain('texto');
    // «e não uma linha»: a pessoa tem de saber **o quê** está mal antes de
    // poder ir ver **onde**.
    expect(erros[0]?.porque).not.toMatch(/linha \d+/);
    expect(erros[0]?.remedio).toContain('total');

    // E a entrada que o plano escrevia, essa passa — porque passa. Um ficheiro
    // que só mede o que falha deixa passar o que devia ser medido, e o que
    // devia ser medido aqui é que `print` não é o sítio onde um texto se
    // denuncia.
    expect(avaliarTexto('python', "total = 'olá'\nprint(total)\n")).toEqual([]);
  });

  it('nos blocos, um texto num sítio de número não é recusado — e a lição é essa', () => {
    // O passo 6 do portão, pelo ecrã. O plano escrevia: «escolher o bloco
    // `guardar` e tentar dar um texto a um sítio que só aceita número. O
    // robô recusa». **Medido: isso não acontece, e não por defeito.** A
    // correção do motor na T12 tirou a recusa de tipo do caminho dos blocos,
    // e com razão: a lição é em Python, e em Python `total = 'olá'` é uma
    // linha válida. Um produto que a recusasse estaria a ensinar que Python
    // protege o tipo, e é exatamente o contrário do que a lição existe para
    // dizer.
    //
    // A recusa de tipo vive nos dois sítios onde é verdade: o **texto** das
    // quatro linguagens que recusam, e o **ecrã** do robô. E o que o ecrã
    // mostra quando um programa de blocos corre limpo é nada.
    render(
      <Tela
        linguagem="python"
        licao={licaoCom(
          {
            type: 'pilha',
            inputs: {
              CORPO: {
                stack: [
                  {
                    type: 'guardar',
                    fields: { nome: { valor: 'total' } },
                    inputs: { VALOR: { valor: 'olá' } },
                  },
                  { type: 'dizer', inputs: { VALOR: { valor: 'olá' } } },
                ],
              },
            },
          },
          'blocos',
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Correr o programa' }));
    expect(screen.queryByRole('alert')).toBeNull();
  }, PASSO_A_PASSO);

  it('a única recusa que os blocos dão é a do número de voltas, e ela diz o que fazer', () => {
    // A segunda metade do passo 6, e a que a lição usa: o `RANGE_INTEIROS`
    // do núcleo. É a única `Recusa` que o caminho dos blocos produz, nas seis
    // linguagens, porque é o único sítio onde o núcleo tem uma regra que não
    // depende da linguagem.
    render(
      <Tela
        linguagem="python"
        licao={licaoCom(
          { type: 'repetir', inputs: { PASSOS: { valor: 5000 }, CORPO: { stack: [] } } },
          'blocos',
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Correr o programa' }));

    // A recusa aparece em dois sítios ao mesmo tempo — no robô, que é onde a
    // pessoa está a olhar, e na lista do que o programa fez. Um `getByRole` a
    // pedir o primeiro é um teste que passa por acidente e deixa de passar no
    // dia em que o segundo muda de sítio; por isso são os dois.
    const avisos = screen.getAllByRole('alert');
    expect(avisos).toHaveLength(2);
    for (const aviso of avisos) {
      // O limite, dito com o número, e não com a palavra «voltas»: quem
      // escreve `range(5000)` precisa de saber que o tecto são 1000, e um
      // aviso que só dissesse «demasiadas voltas» deixaria a pessoa a
      // adivinhar o número que passa.
      expect(aviso.textContent).toContain('1000 para baixo');
      // E o que se faz a seguir, em palavras que não são do número.
      expect(aviso.textContent).toContain('valor mais pequeno');
      // E não diz em que linguagem, porque o núcleo não sabe e porque a
      // regra é a mesma nas seis. Uma `Recusa` que perguntasse o nome da
      // linguagem seria uma regra do núcleo a saber de sintaxe, e é a parede
      // que este produto inteiro é construído em cima.
      for (const nome of NOMES_DAS_SEIS) {
        expect(aviso.textContent).not.toContain(nome);
      }
    }
  }, PASSO_A_PASSO);

  it('em Java o painel escreve o tipo, e o motor diz porquê', () => {
    // O passo 7 do portão, pelo ecrã. A lição de Java não está escrita — o
    // `dourados.test.ts` diz isso em voz alta e é verdade — e por isso o
    // ecrã de Java é o ecrã da lição de Python com a projeção de Java. É
    // exatamente o que o produto será no dia em que a lição existir, e é o
    // que mede a costura: a mesma lição, outra sintaxe.
    render(
      <Tela
        linguagem="java"
        licao={licaoCom(
          {
            type: 'guardar',
            fields: { nome: { valor: 'total' } },
            inputs: { VALOR: { valor: 5 } },
          },
          'texto',
        )}
      />,
    );
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('int total = 5;\n');
    expect(textoDoEcran()).toContain('O teu código em Java');

    // E o que a pessoa escreve sem o tipo é recusado, com a razão que diz
    // que o tipo se escreve antes do nome.
    const erros = avaliarTexto('java', 'total = 5;\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]?.porque).toContain('antes do nome');
    expect(erros[0]?.remedio).toContain('int total = 5;');
  }, PASSO_A_PASSO);
});
```

`python3 scripts/mutar-t13b.py` mede se este ficheiro mede o que diz: doze mutações, doze apanhadas. Três delas nasceram erradas e foram corrigidas — duas porque a âncora apanhava a **cópia errada** do texto (o `log(total)` da ficha é a segunda ocorrência; a primeira é o programa de outra sondagem), e uma porque a âncora começava **um token tarde** e por isso não tirava o nome de lado nenhum. Uma mutação que não faz o que o seu nome diz é pior do que uma mutação que não corre: a primeira dá um resultado sobre nada.

- [ ] **Step 5: Commitar**

```bash
git add -A
git commit -m \"test: aceitacao da fatia — a costura e uma tese, nao uma promessa

emit e ler sao inversos uma da outra nas duas linguagens: o que a
projeção escreve, a mesma projeção le sem erro de sintaxe. E o mesmo
programa julgado pelas duas politicas da Recusa em Java e silencio em
Python, sem uma linha de codigo duplicada.

O portao tambem diz em voz alta o que falta: quatro linguagens sem
projeção, e a projeção de Java pronta sem licao escrita. Um produto que
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
segunda projeção sem uma linha de codigo duplicada. Os sete passos do
portao manual passaram.

Segue-se a licao de Java, e depois o Plano B: Go, TypeScript, JavaScript
e as suas licoes. O SQL fica para o Plano C, porque o vocabulario
declarativo e um salto real e nao uma projeção a mais.\"
```

**Se algum dos sete passos falhou, ou a lição levou mais de uma tarde:** pára. O problema não é a lição, é o formato — e corrigir o formato depois de escrever duas lições custa o dobro de o corrigir agora. Escreve-se o que falhou, e só se decide depois:

```bash
git commit --allow-empty -m \"decisao: parar. [O que falhou]

Nao se escreve a segunda licao sobre um formato que ainda nao provou
que aguenta. A spec 16.1 manda parar antes da segunda, nao depois da
sexta, e e agora.\"
```
