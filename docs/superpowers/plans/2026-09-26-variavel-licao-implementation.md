# Lição "O que é uma variável" — Implementation Plan

> # SUPERADO — não executar este ficheiro
>
> Substituído por **`2026-09-26-plano-a-motor-costuras-primeira-licao.md`**, que
> escreve contra a spec v2 (`…-ponte-seis-linguagens-design.md`, §6.4 corrigida)
> e não contra a v1. Fica aqui por histórico, e por causa das partes que ainda
> servem — mas **executar este plano produz código que não compila contra a
> spec actual.** Concretamente, o que está errado:
>
> | Aqui | No plano que o substitui |
> |---|---|
> | `src/motor/` | `src/nucleo/` — o que lá dentro está já não é "o motor" |
> | `Explicacao.python` / `Explicacao.java` | `Explicacao = { porque, remedio }` (§0 da spec v2) |
> | uma só projeção, e `emitir()` a gerar | `Projection` com `emit` **e** `ler` no mesmo objeto, uma por linguagem (§6.4) |
> | `Policy` dentro de `projecoes/tipos.ts` | `Policy` em `nucleo/semantica.ts`: decide *quando*, e não *o quê* |
> | `LicaoPronto` / `PassoPronto` / `MomentoPronto` | `Licao` / `Passo` / `Momento` — os sufixos `Pronto` nunca existiram |
> | `Passo` com `objetivo` + `explicar`/`fazer`/`nomear` + `sondas` por passo | `Passo` com `fase` + `porque` + `nomear?` + `momentos` + `referencia?`, e as sondas **na lição** |
> | `Vista = 'explicar' \| 'fazer' \| 'nomear' \| 'leitura'` | Não existe `Vista`. A vista **é** a fase do passo; o quarto valor era um estado que não se pode preencher |
> | um `Sonda` sem pergunta ao aluno | `Sonda.pergunta` — é a primeira coisa que o aluno lê |
> | `npm run sondas` | Não existe. As sondas são `npm test` (a Task 13) |
>
> O que deste ficheiro **se mantém**: o formato de `BlocoLeigo`, o `Trace` de
> `Valor` tipados, `guardar`/`repetir`/`dizer`/`log`/`pilha` como conjunto de
> blocos, a ideia de a sonda ser um programa de referência cuja classe esperada
> se compara com a do programa do aluno, e a lição de 15 linhas em si. Quase
> tudo isso foi reescrito, mas a forma é a mesma.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a fatia vertical do produto: motor instrumentado, sondas executáveis, projecção Python, painel de texto com verificação de equivalência, robô tipado, e a lição "O que é uma variável" — aceite pelo teste de leitura de um ficheiro desconhecido de 15 linhas.

**Architecture:** O motor é uma função pura que avalia uma árvore de blocos e produz um `Trace` de `Valor` tipados. Blocos, YAML e o editor Blockly falam **o mesmo formato** (`BlocoLeigo`), o que elimina qualquer camada de tradução. Cada momento da lição aponta para uma **sonda**: um programa de referência com uma observação esperada. O utilizador corre o programa dele; o sistema compara a classe da observação com a da sonda. É isto que traduz a regra da spec "um passo está feito quando o utilizador viu, não quando acertou" para código.

**Tech Stack:** TypeScript `strict`, Vite + React 18, `blockly` (versão exacta fixada no commit da Task 1; API `Blockly.serialization.blocks.save/load`), `vitest` + `@testing-library/react` + `jsdom`, `js-yaml`, `tsx`. Node ≥ 20, npm ≥ 10. Zero dependências de runtime para além destas.

**Spec:** `docs/superpowers/specs/2026-09-26-ponte-blocos-para-leitura-design.md`

## Global Constraints

- **Nenhuma mensagem de erro é renderizada sem razão.** As três classes (`Recusa`, `FalhaRuntime`, `QuebraEquivalencia`) têm `porque` não-vazio, garantido por construção e testado.
- **O programa em blocos é a única fonte de verdade.** O texto deriva sempre dele. Não existe caminho texto → blocos.
- **O motor não conhece o DOM, o React nem o Blockly.** Vive em `src/motor/`. Corre em Node puro.
- **A explicação nunca interrompe.** Sem modais, sem `alert`, sem popups. O botão "Ver a resposta" está sempre visível e nunca bloqueia.
- **Só existem três classes de erro.** Uma quarta é bug, não funcionalidade.
- **`BlocoLeigo` é o único formato de programa.** YAML, motor, gerador e `resolverLeigo` usam-no sem Tradução intermédia.
- **Valores de entrada são explícitos:** `número` → número; `boolean` → lógico; `{txt: 'olá'}` → texto; `{ref: 'total'}` → a variável `total`; `{bloco: BlocoLeigo}` → avaliar esse bloco. Qualquer outra coisa é recusada.
- **Nomes de conceito são slugs ASCII** em minúsculas com hífen. O texto humano vive no YAML, nunca no `type` do bloco.
- **`number` é o único tipo numérico.** `undefined`, `null`, `NaN`, `Infinity` e números acima de `RANGE_INTEIROS = 1000` não são `número`.
- **Tolerância de edição: 2 Caracteres.** Omissões, duplicações e transposições de caracteres adjacentes passam. A mesma tolerância vale para todas as projeções. Não se aplica à exportação `.py`, que é byte-a-byte igual ao painel.
- **Nenhum teste depende de relógio, rede ou `setTimeout`.** O debounce do painel de texto é testado com `debounceMs` explícito e `waitFor`.
- **Escopo de variáveis é por linha.** Uma variável guardada na linha N não existe na linha N+1. É o suficiente para a lição 1 e é o que a lição 2 vai alargar.
- **Strings de utilizador em português europeu**, com `\n` explícitos nos testes de texto.

## Review Focus

Cinco classes de input ou modo de falha que a spec implica, que nenhum teste de fluxo feliz exercita, e que uma pessoa a usar o produto razoavelmente esperasse que funcionassem:

1. **Nome de variável duplicado na mesma linha.** Duas linhas `guardar total` — espera-se substituição com aviso, nunca uma variável fantasma.
2. **Divergência de texto com transposição de caracteres** (`meda` vs `media`). Escrevendo à pressa, espera-se que o editor apanhe isto, não que o reporte como função desconhecida.
3. **`repetir` com um número de iterações fora dos limites.** Espera-se `FalhaRuntime`, que o ciclo não chegue a entrar, e que a UI fique utilizável.
4. **Painel de texto sem blocos ligados.** Quem use só o painel durante a aula espera que funcione sozinho. O botão fica desactivado e diz porquê.
5. **Um valor recusado que chega a `dizer` sem `texto()`.** Um `número` num `text` que entra no `dizer` sem conversão explícita é uma referência silenciosa. Espera-se `Recusa`, mesmo sem robô no ecrã.

---

## File Structure

```
package.json · tsconfig.json · tsconfig.node.json · vite.config.ts · index.html
src/
  vite-env.d.ts
  main.tsx                          Monta a Tela com a lição em memória.
  testes/preparacao.ts              Polyfills de jsdom para o Blockly.
  motor/
    tipos.ts                        Tipo, Valor, RestricaoDeTipo, as três classes de Erro.
    trace.ts                        Trace e TraceBuilder.
    blocos.ts                       Identificadores, cores, identificador() Python, tipos por bloco.
    avaliador.ts                    Regra + Avaliador. O único lugar onde a semântica vive.
    gerador.ts                      BlocoLeigo → Python + Anotacao por linha.
    divergencia.ts                  Comparador bloco ↔ texto.
    texto.ts                        Avaliador de Python estático.
    testes/
      dados.ts                      Construtores de BlocoLeigo para os testes.
  conteudo/
    variavel.yml                    A lição, os passos, as sondas, a referência.
    carregar.ts                     IR, validação, CARREGAR.
    sondas.ts                       executarSonda().
  ui/
    tipos.ts                        Vista.
    estado.ts                       useLesson.
    blocos.tsx                      Registo dos blocos Blockly + paraBlocoLeigo().
    painel-blocos.tsx               Casca do Blockly.
    texto.tsx                       Painel de texto com debounce e divergências.
    robo.tsx                        Robô com portas tipadas.
    estilo.css · robo.css
    lecao/
      PassoView.tsx                 Momento actual, botão Continuar, botão Ver a resposta.
      SondasView.tsx                Experiências e revelações.
      Tela.tsx                      Junta tudo.
      lecao.css
  lecoes/variavel.test.ts           Portão de aceitação da fatia.
scripts/verificar-sondas.ts
```

Três decisões que o mapa fixa e que as tarefas mantêm:

- **`src/ui/blocos.tsx` é o ficheiro com mais risco de crescer.** Se passar de 400 linhas, extrair a toolbox para `src/ui/toolbox.ts`.
- **A persistência dos programas é a serialização do Blockly.** Sem base de dados, sem contas, sem histórico.
- **A GUI (estado, painéis, ecrã) entra na Task 11 como uma unidade**, porque um revisor só pode aprovar ou rejeitar "a lição aparece e funciona" como um todo.

---

### Task 1: Projecto, tipos e invariantes

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/vite-env.d.ts`, `src/testes/preparacao.ts`, `src/motor/tipos.ts`, `src/motor/trace.ts`, `src/main.tsx`
- Test: `src/motor/trace.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `Tipo`, `Explicacao`, `Proteccao`, `Origem`, `Valor`, `RestricaoDeTipo`, `Recusa`, `FalhaRuntime`, `QuebraEquivalencia`, `Erro`, `restricao(tipo, nome?)`, `val(tipo, valor, explicacao, origem, recusado?)`, `valorEm(v, transformar)`, `E(raio, v)`, `RANGE_INTEIROS`, `Evento`, `Trace`, `TraceBuilder`, `construir()`.

- [ ] **Step 1: Inicializar o projecto e instalar dependências**

```bash
cd "/home/joel/Área de Trabalho/Ideia"
npm init -y
npm i react react-dom blockly js-yaml
npm i -D typescript vite @vitejs/plugin-react vitest jsdom tsx \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  @types/react @types/react-dom @types/js-yaml @types/node
node -p "'blockly=' + require('./node_modules/blockly/package.json').version"
```

Guarde o número impresso — vai para o `package.json` no Step 3.

- [ ] **Step 2: Configurar TypeScript, Vite e Vitest**

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
import { defineConfig } from 'vite';
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

if (typeof SVGElement !== 'undefined' && !SVGElement.prototype.getBBox) {
  SVGElement.prototype.getBBox = function getBBox() {
    return { x: 0, y: 0, width: 100, height: 20 } as DOMRect;
  };
}
```

- [ ] **Step 3: Escrever `package.json`**

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
    "sondas": "tsx scripts/verificar-sondas.ts"
  }
}
```

- [ ] **Step 4: Escrever o teste falhado**

`src/motor/trace.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { construir, registar } from './trace';
import { E, restricao, val } from './tipos';
import type { Recusa, Valor } from './tipos';

const O = { bloco: 'guardar', ranhura: 0, passo: 1 };

function numero(n: number): Valor {
  return val('número', n, { porque: '', python: '', java: '' }, O);
}
function palavra(s: string): Valor {
  return val('texto', s, { porque: '', python: '', java: '' }, O);
}
function logico(b: boolean): Valor {
  return val('lógico', b, { porque: '', python: '', java: '' }, O);
}

const recusaNumeroTexto: Recusa = E(restricao('número'), palavra('olá'));

describe('regra dura: nenhuma recusa existe sem porque', () => {
  it('toda recusa tem porque não vazio', () => {
    expect(recusaNumeroTexto.porque.length).toBeGreaterThan(0);
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

describe('registar', () => {
  it('produz um evento de valor com o passo certo', () => {
    const e = registar(3, numero(1));
    expect(e).toEqual({ tipo: 'valor', passo: 3, valor: numero(1) });
  });
});

describe('cabeEm', () => {
  const casos: Array<[string, Valor, boolean]> = [
    ['número em número', numero(3), true],
    ['texto em número', palavra('olá'), false],
    ['número em texto', numero(3), false],
    ['lógico em número', logico(true), false],
    ['lógico em texto', logico(false), false],
    ['actor em número', val('actor', 'coelho', { porque: '', python: '', java: '' }, O), false],
    ['lista em número', val('lista', [1], { porque: '', python: '', java: '' }, O), false],
    ['undefined em número', val('número', undefined, { porque: '', python: '', java: '' }, O), false],
    ['null em número', val('número', null, { porque: '', python: '', java: '' }, O), false],
    ['NaN em número', val('número', NaN, { porque: '', python: '', java: '' }, O), false],
    ['Infinity em número', val('número', Infinity, { porque: '', python: '', java: '' }, O), false],
    ['acima de RANGE_INTEIROS em número', numero(1e9), false],
    ['recusado em número', { ...numero(1), recusado: true }, false],
    ['recusado do mesmo tipo em número', { ...numero(1), recusado: true }, false],
  ];
  for (const [nome, v, esperado] of casos) {
    it(`${nome} é ${esperado}`, () => {
      expect(restricao('número').cabeEm(v)).toBe(esperado);
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
});
```

- [ ] **Step 5: Correr o teste e ver falhar**

Run: `npx vitest run src/motor/trace.test.ts`
Expected: FAIL com erro de resolução de `./tipos`.

- [ ] **Step 6: Escrever `src/motor/tipos.ts`**

```typescript
export const RANGE_INTEIROS = 1000;

export type Tipo = 'número' | 'texto' | 'lógico' | 'lista' | 'actor';

export interface Explicacao {
  /** Texto para quem não sabeprogramming, em português europeu. */
  porque: string;
  /** O que a Python faz com isto neste sítio. */
  python: string;
  /** O que a Java faria com isto neste sítio. */
  java: string;
}

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
  /** Verdadeiro quando este valor já foi recusado. Nenhum socket o aceita
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
  python: string;
  java: string;
  origem: Origem;
}

export interface FalhaRuntime {
  classe: 'FalhaRuntime';
  porque: string;
  passo: number;
  python: string;
  java: string;
  origem: Origem;
}

export interface QuebraEquivalencia {
  classe: 'QuebraEquivalencia';
  porque: string;
  linha: number;
  esperado: string;
  obtido: string;
  python: string;
  java: string;
  origem: Origem;
}

export type Erro = Recusa | FalhaRuntime | QuebraEquivalencia;

export function restricao(tipo: Tipo, nome = tipo): RestricaoDeTipo {
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
    python: v.explicacao.python,
    java: v.explicacao.java,
    origem: v.origem,
  };
}
```

- [ ] **Step 7: Escrever `src/motor/trace.ts`**

```typescript
import type { Erro, Origem, QuebraEquivalencia, Recusa, Valor, FalhaRuntime } from './tipos';

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

  registar(passo: number, valor: Valor): void {
    this.valores.push(valor);
    this.eventos.push(registar(passo, valor));
  }

  recusa(r: Recusa): void {
    this.erros.push(r);
    this.eventos.push({ tipo: 'erro', passo: r.origem.passo, erro: r });
  }

  falha(f: FalhaRuntime): void {
    this.erros.push(f);
    this.eventos.push({ tipo: 'erro', passo: f.passo, erro: f });
  }

  divergencia(q: QuebraEquivalencia): void {
    this.erros.push(q);
    this.eventos.push({ tipo: 'erro', passo: q.linha, erro: q });
  }

  fim(): Trace {
    this.eventos.push({ tipo: 'fim', passos: this.passos });
    return { eventos: this.eventos, valores: this.valores, erros: this.erros, passos: this.passos };
  }
}

export function construir(): TraceBuilder {
  return new TraceBuilder();
}

export type { Origem };
```

- [ ] **Step 8: Correr o teste e confirmar que passa**

Run: `npx vitest run src/motor/trace.test.ts`
Expected: PASS.

- [ ] **Step 9: Escrever `index.html` e `src/main.tsx`**

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
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta #raiz no index.html');

createRoot(raiz).render(
  <StrictMode>
    <h1>Ponte</h1>
  </StrictMode>,
);
```

- [ ] **Step 10: Typecheck e suite completa**

Run: `npm run typecheck && npm test`
Expected: sem erros de tipos; a suite passa.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: motor instrumentado — tipos, trace e invariantes de tipo"
```

---

### Task 2: Avaliador de blocos

**Files:**
- Create: `src/motor/blocos.ts`, `src/motor/avaliador.ts`
- Test: `src/motor/avaliador.test.ts`

**Interfaces:**
- Consumes: Task 1 — `Tipo`, `Valor`, `Origem`, `Erro`, `E`, `restricao`, `RANGE_INTEIROS`, `TraceBuilder`, `construir`.
- Produces: `BlocoLeigo`, `CampoLeigo`, `EntradaLeiga`, `Regra`, `regraDeLinhas()`, `Entradas`, `Avaliador`, `avaliador(regra?)`, `MAX_ITERACOES`, `identificador(nome)`, `TIPO_DE_BLOCO`, `CORES`, `pilhaDe(raiz)`.

- [ ] **Step 1: Escrever o teste falhado**

`src/motor/avaliador.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { avaliador, MAX_ITERACOES, pilhaDe } from './avaliador';
import { identificador } from './blocos';
import type { BlocoLeigo } from './avaliador';

const O = { bloco: 'guardar', ranhura: 0, passo: 1 };

function guardar(nome: string, valor: unknown): BlocoLeigo {
  return { type: 'guardar', fields: { nome: { valor: nome } }, inputs: { VALOR: { valor } } };
}
function repetir(vezes: unknown, corpo: BlocoLeigo[]): BlocoLeigo {
  return { type: 'repetir', fields: {}, inputs: { PASSOS: { valor: vezes }, CORPO: { stack: corpo } } };
}
function dizer(valor: unknown): BlocoLeigo {
  return { type: 'dizer', fields: {}, inputs: { VALOR: { valor } } };
}
function log(valor: unknown): BlocoLeigo {
  return { type: 'log', fields: {}, inputs: { VALOR: { valor } } };
}
function pilha(...blocos: BlocoLeigo[]): BlocoLeigo {
  return { type: 'pilha', inputs: { CORPO: { stack: blocos } } };
}

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

  it('guarda um literal de texto sem erro, mas esse valor não é um número', () => {
    const a = avaliador();
    const v = a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
    expect(v.tipo).toBe('texto');
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
    const a = avaliador();
    a.avaliar('guardar', { nome: 'total', VALOR: { txt: 'olá' } }, 1);
    a.avaliar('dizer', { VALOR: { ref: 'total' } }, 1);
    const e = a.trace.erros[0];
    expect(e?.classe).toBe('Recusa');
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
    a.avaliar('dador_num', { VALOR: {qqq: 1} }, 1);
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
    a.executar(pilha(guardar('total', 1), log({ ref: 'total' }), dizer(5), log({ ref: 'total' })));
    const guardou = a.trace.valores.filter((v) => v.origem.bloco === 'guardar');
    expect(guardou.length).toBe(1);
    expect(a.trace.erros.length).toBe(1);
    expect(a.trace.erros[0]?.origem.bloco).toBe('dizer');
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
    const primeiro = avaliador();
    const segundo = avaliador(primeiro.regra);
    primeiro.avaliar('guardar', { nome: 'total', VALOR: 5 }, 1);
    const v = segundo.avaliar('dador_num', { VALOR: { ref: 'total' } }, 1);
    expect(v.valor).toBe(5);
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npx vitest run src/motor/avaliador.test.ts`
Expected: FAIL com erro de resolução de `./avaliador`.

- [ ] **Step 3: Escrever `src/motor/blocos.ts`**

```typescript
import type { Tipo } from './tipos';

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

- [ ] **Step 4: Escrever `src/motor/avaliador.ts`**

```typescript
import { construir } from './trace';
import type { TraceBuilder } from './trace';
import { E, RANGE_INTEIROS, restricao } from './tipos';
import type { Erro, FalhaRuntime, Origem, Tipo, Valor } from './tipos';
import { identificador, TIPO_DE_BLOCO } from './blocos';

export interface CampoLeigo {
  valor: unknown;
}

export interface EntradaLeiga {
  valor?: unknown;
  stack?: BlocoLeigo[];
}

export interface BlocoLeigo {
  type: string;
  fields?: Record<string, CampoLeigo>;
  inputs?: Record<string, EntradaLeiga>;
}

export const MAX_ITERACOES = 10_000;

/** Contrato para persistir valores entre avaliações. O `passo` é explícito
 *  porque o mesmo objecto é partilhado por vários avaliadores. */
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
      const linha = linhas.get(passo);
      if (linha) linha.set(nome, v);
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

const PY_FALHA =
  'Python descobre isto aqui, mas só quando o programa chega a esta linha. A linha que escreveu o valor mau pode estar muito acima.';
const JAVA_FALHA =
  'Java nunca chega aqui: o compilador recusa o programa antes de o arranque.';
const PY_RECUSA =
  'Python guarda o valor sem dizer nada. O problema só aparece mais tarde, noutra linha.';
const JAVA_RECUSA =
  'Java não te deixa guardar um texto numa variável que declaraste como número.';

function origemDe(bloco: string, ranhura: number, passo: number): Origem {
  return { bloco, ranhura, passo };
}

function valorDe(tipo: Tipo, valor: unknown, bloco: string, ranhura: number, passo: number): Valor {
  return {
    tipo,
    valor,
    explicacao: { porque: '', python: '', java: '' },
    origem: origemDe(bloco, ranhura, passo),
    recusado: false,
  };
}

function falhar(passo: number, porque: string, bloco: string): FalhaRuntime {
  return {
    classe: 'FalhaRuntime',
    porque,
    passo,
    python: PY_FALHA,
    java: JAVA_FALHA,
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
            tipo,
          ),
        );
        return { ...valorDe('número', undefined, tipo, 0, passo), recusado: true };
    }
  }

  /** Resolve um valor de entrada: literal, referência, ou bloco aninhado. */
  private valorDe(bruto: unknown, passo: number, bloco: string, ranhura: number): Valor {
    const origem = origemDe(bloco, ranhura, passo);
    if (bruto === null || bruto === undefined) {
      this.trace.falha(falhar(passo, 'Falta o valor deste sítio.', bloco));
      return { ...valorDe('número', undefined, bloco, ranhura, passo), recusado: true };
    }
    if (typeof bruto === 'number') {
      if (Number.isFinite(bruto) && Math.abs(bruto) <= RANGE_INTEIROS) {
        return valorDe('número', bruto, bloco, ranhura, passo);
      }
      const v: Valor = { ...valorDe('número', bruto, bloco, ranhura, passo), recusado: true };
      this.trace.recusa({ ...E(restricao('número', 'o número'), v), origem });
      return v;
    }
    if (typeof bruto === 'boolean') {
      return valorDe('lógico', bruto, bloco, ranhura, passo);
    }
    if (typeof bruto === 'object') {
      const o = bruto as { txt?: unknown; ref?: unknown; bloco?: BlocoLeigo };
      if (typeof o.txt === 'string') return valorDe('texto', o.txt, bloco, ranhura, passo);
      if (typeof o.ref === 'string') {
        const chave = identificador(o.ref);
        const v = this.regra.obtém(chave, passo);
        if (v) return { ...v, origem };
        this.trace.falha(falhar(passo, `A variável "${o.ref}" ainda não tem valor nesta linha.`, bloco));
        return { ...valorDe('número', undefined, bloco, ranhura, passo), recusado: true };
      }
      if (o.bloco) return this.avaliar(o.bloco.type, entradasDe(o.bloco), passo);
    }
    const v: Valor = { ...valorDe('número', bruto, bloco, ranhura, passo), recusado: true };
    this.trace.recusa({ ...E(restricao('número', 'o valor'), v), origem });
    return v;
  }

  private guardar(e: Entradas, passo: number): Valor {
    const bruto = String(e.nome ?? '').trim();
    if (bruto.length === 0) {
      this.trace.falha(
        falhar(passo, 'A tua variável não tem nome. O nome é o que te permite voltar a ela depois.', 'guardar'),
      );
      return { ...valorDe('número', undefined, 'guardar', 0, passo), recusado: true };
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
        python: PY_RECUSA,
        java: JAVA_RECUSA,
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

  private repetir(e: Entradas, passo: number): Valor {
    const bruto = this.valorDe(e.PASSOS, passo, 'repetir', 0);
    const vezes = bruto.valor;
    if (
      bruto.recusado ||
      bruto.tipo !== 'número' ||
      typeof vezes !== 'number' ||
      !Number.isInteger(vezes) ||
      vezes < 0 ||
      vezes > MAX_ITERACOES
    ) {
      this.trace.falha(
        falhar(
          passo,
          `O número de repetições tem de ser um número inteiro de 0 a ${MAX_ITERACOES}.`,
          'repetir',
        ),
      );
      return { ...valorDe('lógico', undefined, 'repetir', 0, passo), recusado: true };
    }
    const corpo = e.CORPO ?? [];
    for (let i = 0; i < vezes; i += 1) {
      for (const filho of corpo) {
        const passoInterno = passo + 1;
        this.regra.inicializa(passoInterno);
        this.trace.passo(passoInterno, filho.type);
        this.avaliar(filho.type, entradasDe(filho), passoInterno);
        if (this.trace.erros.length > 0) {
          return valorDe('lógico', true, 'repetir', 0, passo);
        }
      }
    }
    return valorDe('lógico', true, 'repetir', 0, passo);
  }

  private dizer(e: Entradas, passo: number): Valor {
    const recebido = this.valorDe(e.VALOR, passo, 'dizer', 0);
    if (recebido.recusado || recebido.tipo !== 'texto') {
      this.trace.recusa({
        ...E(restricao('texto', 'o que dizes'), recebido),
        origem: origemDe('dizer', 0, passo),
        python: PY_RECUSA,
        java: 'Java não te deixa passar um número a um método que só recebe texto. O compilador apanha-o.',
      });
      return { ...valorDe('número', undefined, 'dizer', 0, passo), recusado: true };
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
    const v = valorDe('actor', ator, 'pressionar', 0, passo);
    return {
      ...v,
      explicacao: { porque: `O ${ator} vai ${nome}.`, python: '', java: '' },
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

- [ ] **Step 5: Correr e ver passar**

Run: `npx vitest run src/motor/avaliador.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: avaliador de blocos — guardar, repetir, dizer, log, pressionar"
```

---

### Task 3: Gerador de Python

**Files:**
- Create: `src/motor/gerador.ts`, `src/motor/testes/dados.ts`
- Test: `src/motor/gerador.test.ts`

**Interfaces:**
- Consumes: Task 2 — `BlocoLeigo`, `pilhaDe`; Task 2 — `identificador`; Task 1 — `Tipo`.
- Produces: `Anotacao`, `Gerado`, `gerarPython(raiz)`, `expressao(bruto)`, `identificador` (re-exportado).

- [ ] **Step 1: Escrever o teste falhado**

`src/motor/gerador.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { gerarPython } from './gerador';
import { guardar, guardarTexto, repetir, dizer, log, pilha } from './testes/dados';

describe('gerarPython', () => {
  it('guardar número produz uma atribuição simples', () => {
    expect(gerarPython(guardar('total', 5)).python).toBe('total = 5\n');
  });

  it('o texto() do robô não aparece no Python: dar 5 é dar 5', () => {
    expect(gerarPython(guardarTexto('total', 5)).python).toBe('total = 5\n');
  });

  it('guardar texto dentro de texto() não duplica a conversão', () => {
    expect(gerarPython(guardarTexto('total', 'olá')).python).toBe("total = 'olá'\n");
  });

  it('dizer produz print', () => {
    expect(gerarPython(dizer({ txt: 'olá' })).python).toBe("print('olá')\n");
  });

  it('dizer de um número escreve o número como está, sem str', () => {
    expect(gerarPython(dizer(5)).python).toBe('print(5)\n');
  });

  it('log de uma referência produz o nome da variável', () => {
    expect(gerarPython(log({ ref: 'total' })).python).toBe('log(total)\n');
  });

  it('repetir produz for com range e indentação de 4 espaços', () => {
    expect(gerarPython(repetir(3, [guardar('x', 1)])).python).toBe('for _ in range(3):\n    x = 1\n');
  });

  it('repetir aninhado aumenta a indentação', () => {
    expect(gerarPython(repetir(2, [repetir(2, [guardar('x', 1)])])).python).toBe(
      'for _ in range(2):\n    for _ in range(2):\n        x = 1\n',
    );
  });

  it('repetir sem corpo produz só a linha do for', () => {
    expect(gerarPython(repetir(3, [])).python).toBe('for _ in range(3):\n');
  });

  it('uma pilha gera todas as linhas por ordem', () => {
    expect(gerarPython(pilha(guardar('total', 5), log({ ref: 'total' }))).python).toBe(
      'total = 5\nlog(total)\n',
    );
  });

  it('normaliza um nome com acentos para identificador Python', () => {
    expect(gerarPython(guardar('música', 1)).python).toBe('musica = 1\n');
  });

  it('fuga aspas simples no texto', () => {
    expect(gerarPython(dizer({ txt: 'olá' })).python).toBe("print('olá')\n");
  });

  it('escapa a aspa simples com barra', () => {
    expect(gerarPython(dizer({ txt: "it's" })).python).toBe("print('it\\'s')\n");
  });

  it('programa vazio gera string vazia e zero anotações', () => {
    const g = gerarPython(null);
    expect(g.python).toBe('');
    expect(g.anotacoes.length).toBe(0);
  });

  it('toda linha gerada tem anotação com porque, python e java não vazios', () => {
    const g = gerarPython(pilha(repetir(2, [guardar('x', 1), log({ ref: 'x' })]), dizer({ txt: 'olá' })));
    const linhas = g.python.trimEnd().split('\n');
    expect(linhas.length).toBe(4);
    expect(g.anotacoes.length).toBe(4);
    for (let i = 0; i < g.anotacoes.length; i += 1) {
      const a = g.anotacoes[i]!;
      expect(a.linha).toBe(i + 1);
      expect(a.porque.length).toBeGreaterThan(0);
      expect(a.python.length).toBeGreaterThan(0);
      expect(a.java.length).toBeGreaterThan(0);
    }
  });

  it('um bloco desconhecido gera um comentário, nunca uma linha de código inválida', () => {
    const g = gerarPython({ type: 'condicao', inputs: { VALOR: { valor: 1 } } });
    expect(g.python).toBe('# bloco do v2: condicao\n');
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npx vitest run src/motor/gerador.test.ts`
Expected: FAIL com erro de resolução de `./gerador`.

- [ ] **Step 3: Escrever `src/motor/testes/dados.ts`**

```typescript
import type { BlocoLeigo } from '../avaliador';

export function guardar(nome: string, valor: unknown): BlocoLeigo {
  return {
    type: 'guardar',
    fields: { nome: { valor: nome } },
    inputs: { VALOR: { valor } },
  };
}

/** O mesmo bloco, mas com o valor a passar por um `texto()`. */
export function guardarTexto(nome: string, valor: unknown): BlocoLeigo {
  return {
    type: 'guardar',
    fields: { nome: { valor: nome } },
    inputs: { VALOR: { bloco: { type: 'texto', inputs: { VALOR: { valor } } } } },
  };
}

export function repetir(vezes: unknown, corpo: BlocoLeigo[]): BlocoLeigo {
  return {
    type: 'repetir',
    fields: {},
    inputs: { PASSOS: { valor: vezes }, CORPO: { stack: corpo } },
  };
}

export function dizer(valor: unknown): BlocoLeigo {
  return { type: 'dizer', fields: {}, inputs: { VALOR: { valor } } };
}

export function log(valor: unknown): BlocoLeigo {
  return { type: 'log', fields: {}, inputs: { VALOR: { valor } } };
}

export function pressionar(nome: string, ator = 'coelho'): BlocoLeigo {
  return {
    type: 'pressionar',
    fields: { NOME: { valor: nome }, ATOR: { valor: ator } },
    inputs: {},
  };
}

export function pilha(...blocos: BlocoLeigo[]): BlocoLeigo {
  return { type: 'pilha', inputs: { CORPO: { stack: blocos } } };
}
```

- [ ] **Step 4: Escrever `src/motor/gerador.ts`**

```typescript
import { identificador } from './blocos';
import { pilhaDe } from './avaliador';
import type { BlocoLeigo } from './avaliador';
import type { Tipo } from './tipos';

export interface Anotacao {
  linha: number;
  tipo: Tipo;
  porque: string;
  python: string;
  java: string;
}

export interface Gerado {
  python: string;
  anotacoes: Anotacao[];
}

type Modelo = Omit<Anotacao, 'linha'>;

const GUARDAR: Modelo = {
  tipo: 'número',
  porque:
    'A linha põe um valor dentro de uma caixa com nome. Em Python não escreves o tipo; em Java terias de escrever `int total = 5;` e o Java não te deixaria meter texto ali.',
  python: 'Python: `total = 5` chega. Não diz o tipo de nada.',
  java: 'Java: `int total = 5;` — o `int` é a armadura. Recusa o texto.',
};

const REPETIR: Modelo = {
  tipo: 'número',
  porque:
    'Um `for` com `range` repete um número fixo de vezes. Em Java dirias `for (int i = 0; i < 3; i++)` — e o `int i` é a armadura que o Java te obriga a vestir.',
  python: 'Python: `for _ in range(3):` — o `_` é um nome de descarte.',
  java: 'Java: `for (int i = 0; i < 3; i++)` — o `i` existe e é declarado.',
};

const DIZER: Modelo = {
  tipo: 'texto',
  porque:
    '`print` escreve no ecrã. Em Java escreverias `System.out.println(...)`, que também mostra o `System.out` — essa diferença de uma linha diz-te o que cada linguagem considera óbvio.',
  python: 'Python: `print(...)` já imprime. Nada mais.',
  java: 'Java: `System.out.println(...)` — tens de dizer de onde escreves.',
};

const LOG: Modelo = {
  tipo: 'número',
  porque:
    'Uma chamada a uma função que ainda não escreveste. Python falha quando chega aqui; Java falha antes de compilar. A diferença entre "quando falha" é a armadura.',
  python: 'Python: falha quando a execução chega a esta linha.',
  java: 'Java: falha na compilação, muito antes de executar.',
};

const DESCONHECIDO: Modelo = {
  tipo: 'número',
  porque: 'Este bloco ainda não tem tradução para Python. Só a lição 1 usa `guardar` e `repetir`.',
  python: 'Python: sem tradução, sem código.',
  java: 'Java: sem tradução, sem código.',
};

function aspas(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** Converte um literal, uma referência ou um bloco aninhado em expressão Python. */
export function expressao(bruto: unknown): string {
  if (typeof bruto === 'number') return String(bruto);
  if (typeof bruto === 'boolean') return bruto ? 'True' : 'False';
  if (typeof bruto === 'object' && bruto !== null) {
    const o = bruto as { txt?: unknown; ref?: unknown; bloco?: BlocoLeigo };
    if (typeof o.txt === 'string') return aspas(o.txt);
    if (typeof o.ref === 'string') return identificador(o.ref);
    if (o.bloco) return expressaoDeBloco(o.bloco);
  }
  return '0';
}

function expressaoDeBloco(b: BlocoLeigo): string {
  const v = b.inputs?.VALOR?.valor ?? b.fields?.VALOR?.valor;
  if (v !== undefined) return expressao(v);
  return b.type === 'texto' ? "''" : '0';
}

class Emissor {
  private readonly linhas: string[] = [];
  private readonly anotacoes: Anotacao[] = [];

  escrever(texto: string, modelo: Modelo): void {
    this.linhas.push(texto);
    this.anotacoes.push({ ...modelo, linha: this.linhas.length });
  }

  resultado(): Gerado {
    if (this.linhas.length === 0) return { python: '', anotacoes: [] };
    return { python: `${this.linhas.join('\n')}\n`, anotacoes: this.anotacoes };
  }
}

function recuo(nivel: number): string {
  return '    '.repeat(nivel);
}

/** `dizer` e `log` geram ambos `print(...)`. A diferença entre os dois blocos
 *  não é visível em Python — é a diferença entre as ranhuras do robô. E é
 *  exactamente isso que a lição quer mostrar: o Python não te obriga a
 *  distinguir os dois casos, o Java obriga. */
function emitir(e: Emissor, b: BlocoLeigo, nivel: number): void {
  const aqui = recuo(nivel);
  const campo = (n: string): unknown => b.fields?.[n]?.valor;
  const entrada = (n: string): unknown => b.inputs?.[n]?.valor;
  const corpo = (): BlocoLeigo[] => b.inputs?.CORPO?.stack ?? [];

  switch (b.type) {
    case 'guardar': {
      const nome = identificador(String(campo('nome') ?? '').trim());
      e.escrever(`${aqui}${nome} = ${expressao(entrada('VALOR'))}`, GUARDAR);
      return;
    }
    case 'repetir': {
      e.escrever(`${aqui}for _ in range(${expressao(entrada('PASSOS'))}):`, REPETIR);
      for (const filho of corpo()) emitir(e, filho, nivel + 1);
      return;
    }
    case 'dizer': {
      e.escrever(`${aqui}print(${expressao(entrada('VALOR'))})`, DIZER);
      return;
    }
    case 'log': {
      e.escrever(`${aqui}log(${expressao(entrada('VALOR'))})`, LOG);
      return;
    }
    case 'pilha': {
      for (const filho of corpo()) emitir(e, filho, nivel);
      return;
    }
    default: {
      e.escrever(`${aqui}# bloco do v2: ${b.type}`, DESCONHECIDO);
    }
  }
}

export function gerarPython(raiz: BlocoLeigo | null): Gerado {
  const e = new Emissor();
  for (const bloco of pilhaDe(raiz)) emitir(e, bloco, 0);
  return e.resultado();
}
```

- [ ] **Step 5: Correr e ver passar**

Run: `npx vitest run src/motor/gerador.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck e commit**

```bash
npm run typecheck
git add -A
git commit -m "feat: gerador de Python com anotacoes de proteccao por linha"
```

---

### Task 4: Divergência bloco ↔ texto

**Files:**
- Create: `src/motor/divergencia.ts`
- Test: `src/motor/divergencia.test.ts`

**Interfaces:**
- Consumes: Task 3 — `Gerado`, `Anotacao`; Task 4 produz `Divergencia`, `Relatorio`, `dividirEmLinhas`, `distancia`, `comparar`, `TOLERANCIA_EDICAO`.

- [ ] **Step 1: Escrever o teste falhado**

`src/motor/divergencia.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { comparar, dividirEmLinhas, TOLERANCIA_EDICAO } from './divergencia';
import { gerarPython } from './gerador';
import { guardar, log, repetir, pilha } from './testes/dados';

describe('dividirEmLinhas', () => {
  it('ignora linhas em branco e espaços nas pontas', () => {
    expect(dividirEmLinhas('  a = 1  \n\n\n  b = 2\n')).toEqual(['a = 1', 'b = 2']);
  });
  it('devolve lista vazia para string vazia', () => {
    expect(dividirEmLinhas('')).toEqual([]);
  });
});

describe('tolerância de edição', () => {
  it('é 2', () => {
    expect(TOLERANCIA_EDICAO).toBe(2);
  });
  it('aceita texto idêntico', () => {
    const g = gerarPython(repetir(2, [guardar('x', 1)]));
    expect(comparar(g, 'for _ in range(2):\n    x = 1\n').ok).toBe(true);
  });
  it('aceita falta da linha em branco final', () => {
    expect(comparar(gerarPython(guardar('total', 5)), 'total = 5').ok).toBe(true);
  });
  it('aceita uma transposição de caracteres adjacentes', () => {
    const g = gerarPython({ type: 'log', inputs: { VALOR: { ref: 'constante' } } });
    expect(comparar(g, 'log(cosntante)\n').ok).toBe(true);
  });
  it('aceita uma omissão de carácter', () => {
    expect(comparar(gerarPython(guardar('total', 5)), 'tota = 5\n').ok).toBe(true);
  });
  it('aceita uma duplicação de carácter', () => {
    expect(comparar(gerarPython(guardar('total', 5)), 'totall = 5\n').ok).toBe(true);
  });
  it('rejeita três caracteres errados', () => {
    expect(comparar(gerarPython(guardar('total', 5)), 'txxttxl = 5\n').ok).toBe(false);
  });
  it('não se aplica à exportação: cada linha gerada é exacta', () => {
    expect(gerarPython(guardar('total', 5)).python).toBe('total = 5\n');
  });
});

describe('comparar', () => {
  it('rejeita um valor diferente e nomeia a linha', () => {
    const g = gerarPython(guardar('total', 5));
    const r = comparar(g, 'total = 6\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias).toHaveLength(1);
    expect(r.divergencias[0]!.linha).toBe(1);
    expect(r.divergencias[0]!.esperado).toBe('total = 5');
    expect(r.divergencias[0]!.obtido).toBe('total = 6');
  });

  it('rejeita uma linha a mais e diz o que esperava a seguir', () => {
    const r = comparar(gerarPython(guardar('total', 5)), 'total = 5\ntotal = 6\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias[0]!.porque).toContain('total = 5');
  });

  it('rejeita uma linha a menos', () => {
    const r = comparar(gerarPython(repetir(2, [guardar('x', 1)])), 'for _ in range(2):\n');
    expect(r.ok).toBe(false);
    expect(r.divergencias.length).toBeGreaterThan(0);
  });

  it('não reporta a mesma linha duas vezes quando faltam duas linhas', () => {
    const g = gerarPython(pilha(guardar('total', 5), log({ ref: 'total' })));
    const r = comparar(g, 'total = 5\n');
    expect(r.divergencias).toHaveLength(1);
  });

  it('toda divergência tem porque, python e java não vazios', () => {
    const r = comparar(gerarPython(guardar('total', 5)), 'total = "cinco"\n');
    for (const d of r.divergencias) {
      expect(d.porque.length).toBeGreaterThan(0);
      expect(d.python.length).toBeGreaterThan(0);
      expect(d.java.length).toBeGreaterThan(0);
    }
  });

  it('aceita programa vazio contra texto vazio', () => {
    expect(comparar({ python: '', anotacoes: [] }, '').ok).toBe(true);
  });

  it('rejeita texto vazio contra um programa com uma linha', () => {
    const r = comparar(gerarPython(guardar('total', 5)), '');
    expect(r.ok).toBe(false);
    expect(r.divergencias).toHaveLength(1);
  });

  it('usa a anotação da linha quando existe', () => {
    const g = gerarPython(repetir(2, [guardar('x', 1)]));
    const r = comparar(g, 'for i in range(2):\n    x = 1\n');
    expect(r.divergencias[0]!.java).toContain('Java');
  });

  it('usa o texto genérico quando a linha não tem anotação', () => {
    const r = comparar({ python: 'a = 1\nb = 2\n', anotacoes: [] }, 'a = 1\nb = 3\n');
    expect(r.divergencias[0]!.python).toContain('Python');
    expect(r.divergencias[0]!.java).toContain('Java');
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npx vitest run src/motor/divergencia.test.ts`
Expected: FAIL com erro de resolução de `./divergencia`.

- [ ] **Step 3: Escrever `src/motor/divergencia.ts`**

```typescript
import type { Gerado } from './gerador';

export const TOLERANCIA_EDICAO = 2;

export interface Divergencia {
  linha: number;
  esperado: string;
  obtido: string;
  porque: string;
  python: string;
  java: string;
}

export interface Relatorio {
  ok: boolean;
  divergencias: Divergencia[];
}

const PY_GENERICO =
  'Python deixa esta linha passar. Se o valor estiver errado, o erro aparece mais abaixo, noutra linha.';
const JAVA_GENERICO =
  'Java não deixa esta linha compilar. O erro apareceria aqui, antes de o programa arrancar.';

export function dividirEmLinhas(python: string): string[] {
  return python
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** Distância de Levenshtein, com Zweiterkarte optimizada para linhas curtas. */
export function distancia(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let anterior = Array.from({ length: n + 1 }, (_, j) => j);
  let actual = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i += 1) {
    actual[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      actual[j] = Math.min(anterior[j]! + 1, actual[j - 1]! + 1, anterior[j - 1]! + custo);
    }
    const troca = anterior;
    anterior = actual;
    actual = troca;
  }
  return anterior[n]!;
}

function anotacaoDe(gerado: Gerado, linha: number): { python: string; java: string } {
  const a = gerado.anotacoes.find((x) => x.linha === linha);
  if (!a) return { python: PY_GENERICO, java: JAVA_GENERICO };
  return { python: a.python, java: a.java };
}

export function comparar(
  gerado: Gerado,
  pythonDoUtilizador: string,
  toleranciaEdicao: number = TOLERANCIA_EDICAO,
): Relatorio {
  const esperadas = dividirEmLinhas(gerado.python);
  const obtidas = dividirEmLinhas(pythonDoUtilizador);
  const perto = (i: number): boolean =>
    distancia(esperadas[i] ?? ' ', obtidas[i] ?? ' ') <= toleranciaEdicao;

  const mesmoTamanho = esperadas.length === obtidas.length && esperadas.every((_, i) => perto(i));
  if (mesmoTamanho) return { ok: true, divergencias: [] };

  let inicio = 0;
  while (inicio < esperadas.length && inicio < obtidas.length && perto(inicio)) inicio += 1;

  const divergencias: Divergencia[] = [];
  const total = Math.max(esperadas.length, obtidas.length);
  for (let k = inicio; k < total; k += 1) {
    const esperado = esperadas[k] ?? null;
    const obtido = obtidas[k] ?? null;
    const { python, java } = anotacaoDe(gerado, k + 1);
    if (esperado === null && obtido === null) continue;
    if (esperado === null) {
      divergencias.push({
        linha: k + 1,
        esperado: '(fim do teu programa)',
        obtido: obtido!,
        porque: `Esta linha não existe no teu programa em blocos. Ou puseste uma linha a mais, ou a linha que esperávamos aqui já não está.`,
        python,
        java,
      });
      continue;
    }
    if (obtido === null) {
      divergencias.push({
        linha: k + 1,
        esperado,
        obtido: '(fim do teu texto)',
        porque: `Falta esta linha no teu texto. É o que o teu programa faz aqui.`,
        python,
        java,
      });
      continue;
    }
    divergencias.push({
      linha: k + 1,
      esperado,
      obtido,
      porque: `Estas duas linhas fazem coisas diferentes. A do bloco diz "${esperado}"; a tua diz "${obtido}".`,
      python,
      java,
    });
  }
  return { ok: divergencias.length === 0, divergencias };
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npx vitest run src/motor/divergencia.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck e commit**

```bash
npm run typecheck
git add -A
git commit -m "feat: divergencia bloco-texto com tolerancia de edicao de 2"
```

---

### Task 5: Avaliador de texto Python

**Files:**
- Create: `src/motor/texto.ts`
- Test: `src/motor/texto.test.ts`

**Interfaces:**
- Consumes: Task 1 — `Erro`, `Origem`, `Tipo`; Task 2 — `MAX_ITERACOES`; Task 2 — `identificador`.
- Produces: `avaliarTexto(python: string): Erro[]`, `classificar(erros: Erro[]): ClasseObservada`, `ClasseObservada`, `bate(esperado, erros)`.

- [ ] **Step 1: Escrever o teste falhado**

`src/motor/texto.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { avaliarTexto, bate, classificar } from './texto';

describe('classificar', () => {
  it('sem erros é Observacao', () => {
    expect(classificar([])).toBe('Observacao');
  });
  it('com Recusa é Recusa', () => {
    const erros = avaliarTexto('total = "olá"\n');
    expect(erros.length).toBe(1);
    expect(classificar(erros)).toBe('Recusa');
  });
  it('com FalhaRuntime é RuntimeFault', () => {
    const erros = avaliarTexto('total = "olá"\ntotal = total + 1\n');
    expect(classificar(erros)).toBe('RuntimeFault');
  });
});

describe('bate', () => {
  it('aceita quando a classe observada é a esperada', () => {
    expect(bate('Observacao', avaliarTexto('total = 5\n'))).toBe(true);
  });
  it('recusa quando não é', () => {
    expect(bate('Recusa', avaliarTexto('total = 5\n'))).toBe(false);
  });
});

describe('avaliarTexto', () => {
  it('aceita uma atribuição simples', () => {
    expect(avaliarTexto('total = 5\n')).toEqual([]);
  });

  it('total = "olá" passa sem erro — é este o ponto da lição', () => {
    expect(avaliarTexto('total = "olá"\n')).toEqual([]);
  });

  it('total = total + 1 depois de um texto é RuntimeFault, e a porque é longa', () => {
    const erros = avaliarTexto('total = "olá"\ntotal = total + 1\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('FalhaRuntime');
    expect(erros[0]!.porque.length).toBeGreaterThan(40);
    expect(erros[0]!.porque).toContain('texto');
    expect(erros[0]!.passo).toBe(2);
  });

  it('juntar texto a um número também falha', () => {
    const erros = avaliarTexto("total = 5\nprint(total + 'olá')\n");
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('texto');
  });

  it('somar dois números funciona', () => {
    expect(avaliarTexto('total = 5\ntotal = total + 1\n')).toEqual([]);
  });

  it('dividir por um número funciona', () => {
    expect(avaliarTexto('total = 8\nmedia = total / 4\n')).toEqual([]);
  });

  it('dividir por zero é RuntimeFault com porque', () => {
    const erros = avaliarTexto('total = 8\nmedia = total / 0\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('zero');
  });

  it('um for conta as iterações', () => {
    const erros = avaliarTexto('for _ in range(3):\n    total = total + 1\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('total');
  });

  it('um for com valor inicial corre sem erro', () => {
    expect(avaliarTexto('total = 0\nfor _ in range(4):\n    total = total + 1\n')).toEqual([]);
  });

  it('um for com número de iterações fora dos limites é RuntimeFault e não entra no ciclo', () => {
    const erros = avaliarTexto('for _ in range(10001):\n    total = 1\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('10000');
  });

  it('print com vários argumentos avalia todos', () => {
    expect(avaliarTexto("estado = 'ok'\nprint('estado:', estado)\n")).toEqual([]);
  });

  it('print de um número é aceite', () => {
    expect(avaliarTexto('total = 5\nprint(total)\n')).toEqual([]);
  });

  it('uma função desconhecida é RuntimeFault com porque', () => {
    const erros = avaliarTexto('xyz(5)\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('xyz');
  });

  it('uma variável que não existe é RuntimeFault com porque', () => {
    const erros = avaliarTexto('print(fantasma)\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('fantasma');
  });

  it('uma instrução não ensinada é RuntimeFault e salta o corpo', () => {
    const erros = avaliarTexto('if total > 3:\n    total = 9\n');
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('if');
  });

  it('comentários são ignorados', () => {
    expect(avaliarTexto('# uma nota\ntotal = 5 # outra nota\n')).toEqual([]);
  });

  it('para no primeiro erro', () => {
    const erros = avaliarTexto("total = 'a'\ntotal = total + 1\ntotal = 5\n");
    expect(erros).toHaveLength(1);
    expect(erros[0]!.passo).toBe(2);
  });

  it('toda falha tem porque, python e java não vazios', () => {
    const erros = avaliarTexto("total = 'a'\ntotal = total + 1\nxyz(1)\n");
    for (const e of erros) {
      expect(e.porque.length).toBeGreaterThan(0);
      expect(e.python.length).toBeGreaterThan(0);
      expect(e.java.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npx vitest run src/motor/texto.test.ts`
Expected: FAIL com erro de resolução de `./texto`.

- [ ] **Step 3: Escrever `src/motor/texto.ts`**

```typescript
import { identificador } from './blocos';
import { MAX_ITERACOES } from './avaliador';
import type { Erro, Origem, Tipo } from './tipos';

export type ClasseObservada = 'Observacao' | 'Recusa' | 'RuntimeFault';

export function classificar(erros: Erro[]): ClasseObservada {
  const primeiro = erros[0];
  if (!primeiro) return 'Observacao';
  if (primeiro.classe === 'Recusa') return 'Recusa';
  if (primeiro.classe === 'FalhaRuntime') return 'RuntimeFault';
  return 'RuntimeFault';
}

export function bate(esperado: ClasseObservada, erros: Erro[]): boolean {
  return classificar(erros) === esperado;
}

const PY_FALHA =
  'Python descobre isto aqui, mas só quando o programa chega a esta linha. A linha que escreveu o valor mau pode estar muito acima.';
const JAVA_FALHA =
  'Java nunca chega aqui: o compilador recusa o programa antes de o arranque.';

interface Leitura {
  tipo: Tipo;
  valor: unknown;
}

function aspasDuplas(t: string): boolean {
  return /^(['"]).*\1$/s.test(t);
}

function semAspas(t: string): string {
  return t.slice(1, -1);
}

/** Tira o comentário do fim da linha, sem partir um `#` dentro de aspas. */
function semComentario(t: string): string {
  let aspas = '';
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i]!;
    if (aspas) {
      if (c === aspas) aspas = '';
    } else if (c === '"' || c === "'") {
      aspas = c;
    } else if (c === '#') {
      return t.slice(0, i).trimEnd();
    }
  }
  return t;
}

/** Avaliador estático de um subconjunto de Python. Sem execução, sem
 *  dependências: a gramática está escrita abaixo e nada mais é aceite. */
export function avaliarTexto(python: string): Erro[] {
  const erros: Erro[] = [];
  const variaveis = new Map<string, Leitura>();
  const linhas = python.split('\n');
  let passo = 0;

  const origem = (): Origem => ({ bloco: 'texto', ranhura: 0, passo });

  function falhar(porque: string): void {
    erros.push({ classe: 'FalhaRuntime', porque, passo, python: PY_FALHA, java: JAVA_FALHA, origem: origem() });
  }

  function procurar(nome: string): Leitura | null {
    return variaveis.get(identificador(nome)) ?? null;
  }

  function expressao(bruta: string): Leitura | null {
    const t = bruta.trim();
    if (t.length === 0) return null;
    if (/^-?\d+(\.\d+)?$/.test(t)) return { tipo: 'número', valor: Number(t) };
    if (aspasDuplas(t)) return { tipo: 'texto', valor: semAspas(t) };

    const operacao = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*([-+*/])\s*(.+)$/.exec(t);
    if (operacao) {
      const nome = operacao[1]!;
      const simbolo = operacao[2]!;
      const esquerda = procurar(nome);
      if (!esquerda) {
        falhar(`A variável "${nome}" ainda não tem valor.`);
        return null;
      }
      if (esquerda.tipo !== 'número') {
        falhar(
          `Não podes usar "${t}": dentro de "${nome}" está um ${esquerda.tipo}, não um número. ` +
            'Python deixa-te escrever esta linha e só falha aqui — muito longe da linha onde o texto foi posto.',
        );
        return null;
      }
      const direita = expressao(operacao[3]!);
      if (!direita) return null;
      if (direita.tipo !== 'número') {
        falhar(`O lado direito de "${t}" é um ${direita.tipo}, e não se junta um ${direita.tipo} a um número.`);
        return null;
      }
      const a = esquerda.valor as number;
      const b = direita.valor as number;
      if (simbolo === '/') {
        if (b === 0) {
          falhar('Não podes dividir por zero.');
          return null;
        }
        return { tipo: 'número', valor: a / b };
      }
      if (simbolo === '+') return { tipo: 'número', valor: a + b };
      if (simbolo === '-') return { tipo: 'número', valor: a - b };
      return { tipo: 'número', valor: a * b };
    }

    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t)) {
      const v = procurar(t);
      if (!v) {
        falhar(`A variável "${t}" ainda não tem valor.`);
        return null;
      }
      return v;
    }

    const chamada = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/.exec(t);
    if (chamada) {
      falhar(
        `A função "${chamada[1]}" ainda não existe. Só escreveste instruções, e nenhuma delas é uma função.`,
      );
      return null;
    }

    falhar(`Não entendo "${t}".`);
    return null;
  }

  function partes(argumentos: string): string[] {
    return argumentos
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  function linha(bruta: string): void {
    const t = semComentario(bruta.trim());
    if (t.length === 0) return;

    // Nunca recusa. Python não declara tipos: `total = 'olá'` é aceite e
    // rebenta só quando se usa `total` como número. Se este avaliador
    // recusasse aqui, estaríamos a ensinar Java e a mentir sobre o Python.
    const atribuicao = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/.exec(t);
    if (atribuicao) {
      const valor = expressao(atribuicao[2]!);
      if (!valor) return;
      variaveis.set(identificador(atribuicao[1]!), valor);
      return;
    }

    const impressao = /^print\((.*)\)$/s.exec(t);
    if (impressao) {
      for (const parte of partes(impressao[1]!)) {
        if (!expressao(parte)) return;
      }
      return;
    }

    falhar(
      `Não entendo esta linha: "${t}". A lição 1 só usa atribuições, \`for _ in range(N):\` e \`print(...)\`.`,
    );
  }

  function recuo(bruta: string): number {
    return Math.floor((bruta.length - bruta.trimStart().length) / 4);
  }

  let i = 0;
  while (i < linhas.length) {
    const bruta = linhas[i]!;
    const t = semComentario(bruta.trim());
    passo = i + 1;
    if (t.length === 0 || t.startsWith('#')) {
      i += 1;
      continue;
    }

    const cabeca = /^for\s+_\s+in\s+range\((-?\d+)\):$/.exec(t);
    if (cabeca) {
      const vezes = Number(cabeca[1]);
      if (vezes < 0 || vezes > MAX_ITERACOES) {
        falhar(`Não repito ${cabeca[1]} vezes. O limite são ${MAX_ITERACOES} iterações.`);
        return erros;
      }
      const base = recuo(bruta);
      const corpo: number[] = [];
      let j = i + 1;
      while (j < linhas.length && (linhas[j]!.trim().length === 0 || recuo(linhas[j]!) > base)) {
        if (linhas[j]!.trim().length > 0) corpo.push(j);
        j += 1;
      }
      for (let volta = 0; volta < vezes; volta += 1) {
        for (const indice of corpo) {
          passo = indice + 1;
          linha(linhas[indice]!);
          if (erros.length > 0) return erros;
        }
      }
      passo = i + 1;
      i = j;
      continue;
    }

    if (/^(if|while|def|for)\b/.test(t) && t.endsWith(':')) {
      falhar(
        `Ainda não aprendeste "${t.split(/\s+/)[0]}". Esta lição só usa atribuições, \`for _ in range(N):\` e \`print(...)\`.`,
      );
      return erros;
    }

    linha(bruta);
    if (erros.length > 0) return erros;
    i += 1;
  }
  return erros;
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npx vitest run src/motor/texto.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck e commit**

```bash
npm run typecheck
git add -A
git commit -m "feat: avaliador estatico de Python para verificacao de equivalencia"
```

---

### Task 6: Formato de lição em YAML

**Files:**
- Create: `src/conteudo/variavel.yml`, `src/conteudo/carregar.ts`
- Test: `src/conteudo/carregar.test.ts`

**Interfaces:**
- Consumes: Task 2 — `BlocoLeigo`.
- Produces: `Fonte = 'blocos' | 'texto' | 'leitura'`, `ProvaIR`, `ProvaPronto`, `EsperadoIR`, `SondaIR`, `SondaPronto`, `MomentoIR`, `PassoIR`, `PassoPronto`, `ReferenciaIR`, `LicaoIR`, `LicaoPronto`, `CARREGAR(texto)`, `validar(licao)`.

- [ ] **Step 1: Escrever `src/conteudo/variavel.yml`**

```yaml
id: variavel
titulo: O que é uma variável
conceito: variavel
referencia:
  nome: programa_de_outra_pessoa.py
  linhas:
    - "# uma pessoa que experimentou isto e se esqueceu de mudar uma coisa"
    - "estado = 'ok'"
    - "total = 0"
    - "for _ in range(4):"
    - "    total = total + 1"
    - "print('a contar até', total)"
    - "media = total / 4"
    - "print('média', media)"
    - "print('acabou em', estado)"
    - "print(estado + '!')"
    - "print('fim')"
    - "# o programa acaba aqui"
    - "# mas a linha 10 nunca faz o que se espera"
    - "# porque o valor de 'estado' nunca foi mudado"
    - "# e o Python só se lembra disto na linha 10"
passos:
  - id: guardar-e-repetir
    objetivo: Fazer o robô dizer três vezes o número que escolheres.
    explicar: |
      Imagina uma caixa com uma etiqueta. Escreves uma coisa lá dentro e
      depois podes ir buscá-la pelo nome da etiqueta. Essa caixa é uma
      variável: um sítio com nome onde se guarda um valor.

      Agora uma pergunta. E se escreveres palavras dentro da caixa em vez
      de um número? O robô vai notar?
    fazer: |
      Arrasta "guardar" para a área de trabalho. Escreve um número dentro e
      põe um nome na caixa. Depois liga um "repetir 3x" a um "dizer" e confirma
      que o "dizer" recebe a tua caixa.
    nomear: |
      Acabaste de usar uma variável. Chama-se assim: um sítio com nome que
      guarda um valor. Em Python escreveste uma linha com a esquerda a dar o
      nome e a direita a dar o valor. Vês a mesma coisa escrita ao lado.

      E notaste? O Python não te pediu o tipo. Em Java terias de escrever
      `int total = 5;` e o Java não te deixaria meter texto ali. Esse `int` é
      a armadura.
    momentos:
      - id: p1
        fonte: blocos
        texto: Arrasta o bloco "guardar" e escreve dentro dele o número 7.
        sonda: guardar-numero
      - id: p2
        fonte: blocos
        texto: Arrasta "repetir 3x" e põe lá dentro um "dizer" que recebe a tua caixa.
        sonda: repetir-tres
      - id: p3
        fonte: blocos
        texto: Corre o programa. Agora guarda a palavra "olá" em vez do número.
        sonda: guardar-palavra-recusa
      - id: p4
        fonte: blocos
        texto: Guarda outra vez na mesma caixa, com outro número.
        sonda: nome-duplicado
      - id: p5
        fonte: blocos
        texto: Guarda um número gigante: 1000000.
        sonda: numero-gigante-recusa
    sondas:
      - id: guardar-numero
        experiencia: Põe um número dentro da tua caixa e corre.
        pergunta: O que é que a tua primeira linha faz?
        prova:
          forma: programa
          programa:
            type: guardar
            fields: { nome: total }
            inputs: { VALOR: { valor: 7 } }
        esperado:
          classe: Observacao
          porque: |
            A primeira linha põe o 7 dentro de uma caixa chamada total. Não
            aparece nada no ecrã, e é isso que está certo: guardar um valor
            não é mostrar um valor.
      - id: repetir-tres
        experiencia: Repete três vezes e diz o que está na tua caixa.
        pergunta: O que é que vês no robô?
        prova:
          forma: programa
          programa:
            type: pilha
            inputs:
              CORPO:
                stack:
                  - type: guardar
                    fields: { nome: total }
                    inputs: { VALOR: { valor: 7 } }
                  - type: repetir
                    fields: {}
                    inputs:
                      PASSOS: { valor: 3 }
                      CORPO:
                        block: pilha
                        stack:
                          - type: dizer
                            fields: {}
                            inputs: { VALOR: { bloco: { type: texto, inputs: { VALOR: { ref: total } } } } }
        esperado:
          classe: Observacao
          porque: |
            Vês o mesmo número três vezes. Repete não muda nada: faz a mesma
            coisa o mesmo número de vezes. Repete é para quando o número de
            vezes depende de alguma coisa — e isso é a lição 3.
      - id: guardar-palavra-recusa
        experiencia: Tenta guardar a palavra "olá" na tua caixa.
        pergunta: O que é que o robô faz?
        prova:
          forma: programa
          programa:
            type: guardar
            fields: { nome: total }
            inputs: { VALOR: { bloco: { type: texto, inputs: { VALOR: { valor: olá } } } } }
        esperado:
          classe: Recusa
          porque: |
            O robô recusa, e diz porquê: aqui só se guardam números. Isto é
            uma regra do SITE, não uma regra do mundo: a tua caixa foi criada
            para números.
      - id: nome-duplicado
        experiencia: Guarda duas vezes na mesma caixa, com números diferentes.
        pergunta: O que é que acontece à primeira linha?
        prova:
          forma: programa
          programa:
            type: pilha
            inputs:
              CORPO:
                stack:
                  - type: guardar
                    fields: { nome: total }
                    inputs: { VALOR: { valor: 1 } }
                  - type: guardar
                    fields: { nome: total }
                    inputs: { VALOR: { valor: 2 } }
        esperado:
          classe: Observacao
          porque: |
            A segunda linha substitui a primeira. Uma caixa tem um valor de
            cada vez, não uma fila de valores. Guardar de novo não guarda o
            antigo num sítio — esquece-o.
      - id: numero-gigante-recusa
        experiencia: Guarda 1000000 na tua caixa.
        pergunta: Porque é que o robô recusa?
        prova:
          forma: programa
          programa:
            type: guardar
            fields: { nome: total }
            inputs: { valor: 1000000 }
        esperado:
          classe: Recusa
          porque: |
            Porque o robô só aceita números de -1000 a 1000. Não é que 1000000
            seja um número mau: é que está fora do alcance desta caixa. Da
            próxima vez que vires um limite, pergunta sempre o que está a
            proteger.
  - id: texto-do-utilizador
    objetivo: Ver que o Python não te avisa, e o que é que isso significa.
    explicar: |
      Python não sabe o tipo das coisas. Escreves total = "olá" e ele aceita
      sem dizer uma palavra. Java não: se declaraste que total é um número, o
      Java recusa-te o texto antes de o programa sequer arrancar.

      A pergunta é: qual dos dois te protege melhor? E contra o quê?
    fazer: |
      No painel de texto, escreve total = "olá" e carrega em Executar. Não
      acontece nada — é suposto não acontecer nada. Depois escreve
      total = total + 1 e carrega outra vez.
    nomear: |
      Isto tem um nome: verificação de tipos, ou tipos estáticos. O Python não
      os tem, e por isso te deixa escrever coisas que rebentam a meio do
      programa. O Java tem-nos, e por isso te impede de as escreveres.

      Nenhum dos dois está errado. O Python dá-te mais liberdade e cobra-te
      mais tarde. O Java dá-te menos liberdade e cobra-te já.
    momentos:
      - id: t1
        fonte: texto
        texto: Escreve total = "olá" e carrega em Executar.
        sonda: python-aceita-texto
      - id: t2
        fonte: texto
        texto: Agora escreve total = total + 1 e carrega outra vez.
        sonda: python-rebenta
      - id: t3
        fonte: texto
        texto: Repara em que linha o programa morreu. Não é a linha que escreve.
        sonda: python-rebenta
    sondas:
      - id: python-aceita-texto
        experiencia: Escreve total = "olá" e executa.
        pergunta: O que é que o Python faz?
        prova:
          forma: texto
          texto: |-
            total = "olá"
        esperado:
          classe: Observacao
          porque: |
            Nada. O Python aceita e guarda. Não há erro nenhum, e é aqui que
            a maioria das pessoas percebe pela primeira vez que "funcionar"
            não é a mesma coisa que "estar certo".
      - id: python-rebenta
        experiencia: Junta 1 ao que está em total.
        pergunta: Onde é que morre?
        prova:
          forma: texto
          texto: |-
            total = "olá"
            total = total + 1
        esperado:
          classe: RuntimeFault
          porque: |
            Morre na segunda linha, quando tenta somar. E o valor mau foi
            posto na primeira. Repara no que o Python te obriga a fazer: ir
            caçar a causa muito acima do sítio do sintoma. O Java dava-te o
            erro na linha onde escreveste.
  - id: ler-o-ficheiro
    objetivo: Ler um programa que nunca viste e dizer o que cada linha faz.
    explicar: |
      Chegou a hora de largar os blocos. Em baixo tens um programa escrito
      por outra pessoa. Não tem blocos, nem caixas, nem robôs. Só texto.

      E a tarefa é a mesma de sempre: dizer o que cada linha faz, e porque é
      que uma delas rebenta.
    fazer: |
      Lê o programa linha a linha. Escreve o que cada linha faz. Uma das
      linhas vai rebentar: descobre qual, e depois descobre onde foi posto o
      valor que a fez rebentar.
    nomear: |
      Isto é ler código. Viste que o programa é o mesmo que o teu: uma
      variável que guarda um número, uma repetição, e umas contas. Só que
      agora está escrito de outra maneira.

      Quando leres Java vais ver a mesma coisa com mais regras à volta — e
      essas regras são a armadura. A partir de agora, quando leres uma
      declareção que não conheces, não te assustes: pergunta o que ela está a
      proteger.
    momentos:
      - id: l1
        fonte: leitura
        texto: Lê a linha 2. O que é que esta linha faz? Escreve em português.
        palavras: [guarda, guardar, atribui, atribuir, escreve, poe, põe, estado, ok]
        sonda: l1
      - id: l2
        fonte: leitura
        texto: Lê a linha 3. E a linha 4?
        palavras: [zero, 0, quatro, 4, conta, contar, repete, repetir, estado, total]
        sonda: l2
      - id: l3
        fonte: leitura
        texto: Lê a linha 5. O que muda a cada volta do for?
        palavras: [total, soma, mais, aumenta, incrementa, 1, um]
        sonda: l3
      - id: l4
        fonte: leitura
        texto: Lê a linha 7. Para que serve este cálculo?
        palavras: [media, média, divide, dividir, por, quatro, 4]
        sonda: l4
      - id: l5
        fonte: leitura
        texto: Lê a linha 10. O que é que esta linha tenta fazer?
        palavras: [junta, juntar, soma, somar, concatena, texto, mais, estado]
        sonda: l5
      - id: l6
        fonte: leitura
        texto: Em que linha é que o programa morre?
        palavras: ["10", dez, décima]
        sonda: l6
      - id: l7
        fonte: leitura
        texto: E em que linha foi posto o valor que causa essa falha? (a causa está algures acima)
        palavras: ["2", dois, segunda]
        sonda: l7
    sondas:
      - id: l1
        experiencia: Lê a linha 2.
        pergunta: O que faz a linha 2?
        prova: { forma: texto, texto: "estado = 'ok'" }
        esperado:
          classe: Observacao
          porque: "Põe a palavra 'ok' dentro de uma caixa chamada estado."
      - id: l2
        experiencia: Lê as linhas 3 e 4.
        pergunta: O que fazem as linhas 3 e 4?
        prova: { forma: texto, texto: "total = 0\nfor _ in range(4):" }
        esperado:
          classe: Observacao
          porque: "A linha 3 põe 0 na caixa total. A linha 4 repete o que está dentro dela quatro vezes."
      - id: l3
        experiencia: Lê a linha 5.
        pergunta: O que muda a cada volta?
        prova: { forma: texto, texto: "total = 0\nfor _ in range(4):\n    total = total + 1" }
        esperado:
          classe: Observacao
          porque: "Cada volta soma 1 a total. Depois de quatro voltas, total vale 4."
      - id: l4
        experiencia: Lê a linha 7.
        pergunta: Para que serve?
        prova: { forma: texto, texto: "total = 4\nmedia = total / 4" }
        esperado:
          classe: Observacao
          porque: "Divide o total por 4 para saber a média. O Python deixa-te escrever esta divisão; o Java não, se median fosse declarado como número inteiro."
      - id: l5
        experiencia: Lê a linha 10.
        pergunta: O que tenta fazer?
        prova: { forma: texto, texto: "estado = 'ok'\nprint(estado + '!')" }
        esperado:
          classe: RuntimeFault
          porque: "Tenta juntar o '!' ao que está em estado. Mas em estado está um texto, e não se pode juntar um texto a um número."
      - id: l6
        experiencia: Corre o ficheiro e vê onde para.
        pergunta: Onde morre?
        prova:
          forma: texto
          texto: |-
            estado = 'ok'
            total = 0
            for _ in range(4):
                total = total + 1
            print('a contar até', total)
            media = total / 4
            print('média', media)
            print('acabou em', estado)
            print(estado + '!')
            print('fim')
        esperado:
          classe: RuntimeFault
          porque: "Morre na linha 10. A linha 11 nunca corre."
      - id: l7
        experiencia: Volta atrás e procura o valor.
        pergunta: Onde foi posto?
        prova: { forma: texto, texto: "estado = 'ok'" }
        esperado:
          classe: Observacao
          porque: "Na linha 2. O valor mau foi posto oito linhas antes de o programa morrer — e é sempre assim que funciona."
```

Antes de gravar, confirma a referência: tem 15 linhas e não usa `if`, para que o avaliador de texto (que não ensina `if`) a execute inteira. Confirma também que `print(estado + '!')` está na linha 10.

- [ ] **Step 2: Escrever o teste falhado**

`src/conteudo/carregar.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { CARREGAR, validar } from './carregar';
import variavelYaml from './variavel.yml?raw';

const licao = CARREGAR(variavelYaml);

describe('a lição variavel carrega sem erros', () => {
  it('não tem erros de validação', () => {
    expect(validar(licao)).toEqual([]);
  });

  it('tem três passos', () => {
    expect(licao.passos).toHaveLength(3);
  });

  it('cada passo tem os três tempos preenchidos', () => {
    for (const p of licao.passos) {
      expect(p.explicar.trim().length).toBeGreaterThan(0);
      expect(p.fazer.trim().length).toBeGreaterThan(0);
      expect(p.nomear.trim().length).toBeGreaterThan(0);
    }
  });

  it('cada passo tem pelo menos três momentos', () => {
    for (const p of licao.passos) {
      expect(p.momentos.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('cada momento aponta para uma sonda que existe no mesmo passo', () => {
    for (const p of licao.passos) {
      const ids = p.sondas.map((s) => s.id);
      for (const m of p.momentos) {
        expect(ids).toContain(m.sonda);
      }
    }
  });

  it('toda sonda tem pergunta e experiência preenchidas', () => {
    for (const p of licao.passos) {
      for (const s of p.sondas) {
        expect(s.pergunta.trim().length).toBeGreaterThan(0);
        expect(s.experiencia.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('toda sonda tem porque não vazio', () => {
    for (const p of licao.passos) {
      for (const s of p.sondas) {
        expect(s.esperado.porque.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it('toda prova de programa tem programa; toda prova de texto tem texto', () => {
    for (const p of licao.passos) {
      for (const s of p.sondas) {
        if (s.prova.forma === 'programa') expect(s.prova.programa).toBeTruthy();
        else expect(s.prova.texto.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('os momentos de leitura têm palavras para aceitar a resposta', () => {
    const passo = licao.passos[2]!;
    for (const m of passo.momentos) {
      expect(m.fonte).toBe('leitura');
      expect(m.palavras.length).toBeGreaterThan(0);
    }
  });

  it('o ficheiro de referência tem exactamente 15 linhas', () => {
    expect(licao.referencia).toBeDefined();
    expect(licao.referencia!.linhas).toHaveLength(15);
  });

  it('a referência morre na linha 10 e o valor mau está na linha 2', () => {
    const l = licao.referencia!.linhas;
    expect(l[1]).toContain("estado = 'ok'");
    expect(l[9]).toContain("estado + '!'");
  });

  it('a referência não usa nenhuma instrução que o avaliador de texto não conheça', () => {
    const proibidas = ['if ', 'while ', 'def ', 'import '];
    for (const linha of licao.referencia!.linhas) {
      for (const p of proibidas) {
        expect(linha.trimStart().startsWith(p)).toBe(false);
      }
    }
  });
});

describe('validar', () => {
  it('rejeita uma lição sem passos', () => {
    expect(validar({ id: 'x', titulo: 'x', conceito: 'x', passos: [] }).length).toBeGreaterThan(0);
  });

  it('rejeita um passo sem os três tempos', () => {
    const erros = validar({
      id: 'x',
      titulo: 'x',
      conceito: 'x',
      passos: [
        { id: 'p', objetivo: 'o', explicar: '  ', fazer: '', nomear: '', momentos: [], sondas: [] },
      ],
    });
    expect(erros.join(' ')).toContain('explicar');
  });

  it('rejeita um momento que aponta para uma sonda inexistente', () => {
    const erros = validar({
      id: 'x',
      titulo: 'x',
      conceito: 'x',
      passos: [
        {
          id: 'p',
          objetivo: 'o',
          explicar: 'a',
          fazer: 'b',
          nomear: 'c',
          momentos: [{ id: 'm1', fonte: 'blocos', texto: 'x', sonda: 'inexistente', palavras: [] }],
          sondas: [
            {
              id: 's1',
              experiencia: 'x',
              pergunta: 'y',
              prova: { forma: 'texto', programa: null, texto: 'a = 1' },
              esperado: { classe: 'Observacao', porque: 'porque' },
            },
          ],
        },
      ],
    });
    expect(erros.join(' ')).toContain('inexistente');
  });
});
```

- [ ] **Step 3: Correr e ver falhar**

Run: `npx vitest run src/conteudo/carregar.test.ts`
Expected: FAIL com erro de resolução de `./carregar`.

- [ ] **Step 4: Escrever `src/conteudo/carregar.ts`**

```typescript
import { load } from 'js-yaml';
import type { BlocoLeigo } from '../motor/avaliador';
import type { ClasseObservada } from '../motor/texto';

export type Fonte = 'blocos' | 'texto' | 'leitura';

export interface ProvaIR {
  forma: 'programa' | 'texto';
  programa?: BlocoLeigo;
  texto?: string;
}

export interface EsperadoIR {
  classe: ClasseObservada;
  porque: string;
}

export interface MomentoIR {
  id: string;
  fonte: Fonte;
  texto: string;
  sonda: string;
  palavras: string[];
}

export interface SondaIR {
  id: string;
  experiencia: string;
  pergunta: string;
  prova: ProvaIR;
  esperado: EsperadoIR;
}

export interface PassoIR {
  id: string;
  objetivo: string;
  explicar: string;
  fazer: string;
  nomear: string;
  momentos: MomentoIR[];
  sondas: SondaIR[];
}

export interface ReferenciaIR {
  nome: string;
  linhas: string[];
}

export interface LicaoIR {
  id: string;
  titulo: string;
  conceito: string;
  referencia?: ReferenciaIR;
  passos: PassoIR[];
}

export type ProvaPronto = { forma: 'programa'; programa: BlocoLeigo; texto: '' } | {
  forma: 'texto';
  programa: null;
  texto: string;
};

export type MomentoPronto = MomentoIR;
export type SondaPronto = SondaIR & { prova: ProvaPronto };
export type PassoPronto = Omit<PassoIR, 'sondas'> & { sondas: SondaPronto[] };

export interface LicaoPronto {
  id: string;
  titulo: string;
  conceito: string;
  referencia?: ReferenciaIR;
  passos: PassoPronto[];
}

export function validar(licao: LicaoPronto): string[] {
  const erros: string[] = [];
  if (licao.passos.length === 0) erros.push('A lição não tem passos.');
  for (const passo of licao.passos) {
    for (const campo of ['explicar', 'fazer', 'nomear'] as const) {
      if (passo[campo].trim().length === 0) erros.push(`Passo ${passo.id}: "${campo}" está vazio.`);
    }
    const ids = passo.sondas.map((s) => s.id);
    for (const m of passo.momentos) {
      if (!ids.includes(m.sonda)) {
        erros.push(`Passo ${passo.id}, momento ${m.id}: aponta para a sonda "${m.sonda}", que não existe.`);
      }
      if (m.texto.trim().length === 0) erros.push(`Passo ${passo.id}, momento ${m.id}: texto vazio.`);
      if (m.fonte === 'leitura' && m.palavras.length === 0) {
        erros.push(`Passo ${passo.id}, momento ${m.id}: momento de leitura sem palavras.`);
      }
    }
    for (const s of passo.sondas) {
      if (s.pergunta.trim().length === 0) erros.push(`Sonda ${s.id}: pergunta vazia.`);
      if (s.experiencia.trim().length === 0) erros.push(`Sonda ${s.id}: experiência vazia.`);
      if (s.esperado.porque.trim().length === 0) erros.push(`Sonda ${s.id}: esperado.porque vazio.`);
      if (s.prova.forma === 'programa' && !s.prova.programa) {
        erros.push(`Sonda ${s.id}: falta o programa.`);
      }
      if (s.prova.forma === 'texto' && (s.prova.texto ?? '').trim().length === 0) {
        erros.push(`Sonda ${s.id}: falta o texto.`);
      }
    }
  }
  return erros;
}

function provaDe(p: ProvaIR): ProvaPronto {
  if (p.forma === 'programa') {
    if (!p.programa) throw new Error('Prova de programa sem programa. A validação devia ter apanhado isto.');
    return { forma: 'programa', programa: p.programa, texto: '' };
  }
  return { forma: 'texto', programa: null, texto: p.texto ?? '' };
}

function momentoDe(m: MomentoIR): MomentoPronto {
  return { id: m.id, fonte: m.fonte, texto: m.texto, sonda: m.sonda, palavras: m.palavras ?? [] };
}

export const CARREGAR = (texto: string): LicaoPronto => {
  const cru = load(texto) as LicaoIR;
  const licao: LicaoPronto = {
    id: cru.id,
    titulo: cru.titulo,
    conceito: cru.conceito,
    passos: (cru.passos ?? []).map((p) => ({
      id: p.id,
      objetivo: p.objetivo,
      explicar: p.explicar,
      fazer: p.fazer,
      nomear: p.nomear,
      momentos: (p.momentos ?? []).map(momentoDe),
      sondas: (p.sondas ?? []).map((s) => ({
        id: s.id,
        experiencia: s.experiencia,
        pergunta: s.pergunta,
        prova: provaDe(s.prova),
        esperado: s.esperado,
      })),
    })),
  };
  if (cru.referencia) licao.referencia = cru.referencia;
  return licao;
};
```

- [ ] **Step 5: Correr e ver passar**

Run: `npx vitest run src/conteudo/carregar.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck e commit**

```bash
npm run typecheck
git add -A
git commit -m "feat: formato de licao em YAML com carga e validacao"
```

---

### Task 7: Sondas como testes do currículo

**Files:**
- Create: `src/conteudo/sondas.ts`, `src/conteudo/sondas.test.ts`, `scripts/verificar-sondas.ts`
- Test: `src/conteudo/sondas.test.ts`

**Interfaces:**
- Consumes: Task 6 — `SondaPronto`, `LicaoPronto`; Task 2 — `avaliador`; Task 5 — `avaliarTexto`, `bate`, `classificar`, `ClasseObservada`.
- Produces: `executarSonda(sonda: SondaPronto): { classe: ClasseObservada; erros: Erro[]; porque: string }`.

- [ ] **Step 1: Escrever o teste falhado**

`src/conteudo/sondas.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { CARREGAR } from './carregar';
import { executarSonda } from './sondas';
import variavelYaml from './variavel.yml?raw';

const licao = CARREGAR(variavelYaml);
const todas = licao.passos.flatMap((p) => p.sondas);

describe('toda sonda do currículo produz a classe que promete', () => {
  for (const s of todas) {
    it(`${s.id} bate certo`, () => {
      const r = executarSonda(s);
      expect(r.classe).toBe(s.esperado.classe);
    });
  }
});

describe('a verificação é sobre a classe, não sobre o texto', () => {
  it('o porque de uma sonda é autoral e não vem do motor', () => {
    const r = executarSonda(todas[0]!);
    expect(r.porque).not.toBe(todas[0]!.esperado.porque);
  });

  it('a referência de leitura morre na linha 10', () => {
    const l = licao.referencia!.linhas;
    const texto = l.join('\n') + '\n';
    const r = executarSonda({
      id: 'ref',
      experiencia: 'x',
      pergunta: 'x',
      prova: { forma: 'texto', programa: null, texto },
      esperado: { classe: 'RuntimeFault', porque: 'x' },
    });
    expect(r.classe).toBe('RuntimeFault');
    expect(r.erros[0]!.passo).toBe(10);
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npx vitest run src/conteudo/sondas.test.ts`
Expected: FAIL com erro de resolução de `./sondas`.

- [ ] **Step 3: Escrever `src/conteudo/sondas.ts`**

```typescript
import { avaliador } from '../motor/avaliador';
import { avaliarTexto, classificar } from '../motor/texto';
import type { ClasseObservada } from '../motor/texto';
import type { Erro } from '../motor/tipos';
import type { SondaPronto } from './carregar';

export interface ResultadoSonda {
  classe: ClasseObservada;
  erros: Erro[];
  porque: string;
}

/** Corre a prova de uma sonda e devolve a classe de observação. Uma sonda é
 *  um teste: se a semântica do motor mudar, esta função devolve outra
 *  classe e o build quebra. O `porque` é texto autoral e nunca é comparado. */
export function executarSonda(sonda: SondaPronto): ResultadoSonda {
  if (sonda.prova.forma === 'texto') {
    const erros = avaliarTexto(sonda.prova.texto);
    return {
      classe: classificar(erros),
      erros,
      porque: sonda.esperado.porque,
    };
  }
  const a = avaliador();
  a.executar(sonda.prova.programa);
  return {
    classe: classificar(a.trace.erros),
    erros: a.trace.erros,
    porque: sonda.esperado.porque,
  };
}
```

- [ ] **Step 4: Correr e ver passar**

Run: `npx vitest run src/conteudo/sondas.test.ts`
Expected: PASS. Se alguma sonda falhar, a **lição está errada, não o motor**: corrige o `esperado.classe` no YAML para a classe que a semântica real produz, e reescreve o `porque` para ser verdadeiro. A sonda nunca é ajustada para tapar o motor.

- [ ] **Step 5: Escrever `scripts/verificar-sondas.ts`**

```typescript
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARREGAR, validar } from '../src/conteudo/carregar';
import { executarSonda } from '../src/conteudo/sondas';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..');
const caminho = join(raiz, 'src', 'conteudo', 'variavel.yml');
const licao = CARREGAR(readFileSync(caminho, 'utf8'));

const problemas = validar(licao);
for (const p of problemas) console.error(`VALIDAÇÃO ${p}`);

let falhou = problemas.length > 0;
for (const passo of licao.passos) {
  for (const sonda of passo.sondas) {
    const r = executarSonda(sonda);
    if (r.classe === sonda.esperado.classe) {
      console.log(`ok   ${passo.id}/${sonda.id} (${r.classe})`);
    } else {
      falhou = true;
      console.error(`FALHA ${passo.id}/${sonda.id}: esperava ${sonda.esperado.classe}, obtive ${r.classe}`);
      for (const e of r.erros) console.error(`       ${e.porque}`);
    }
  }
}

if (falhou) {
  console.error('\nO currículo não corresponde ao motor. Corrige o YAML, nunca o motor.');
  process.exit(1);
}
console.log('\nTodas as sondas coincidem com o motor.');
```

- [ ] **Step 6: Correr o script**

Run: `npm run sondas`
Expected: uma linha `ok` por sonda, e a linha "Todas as sondas coincidem com o motor."

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: sondas executam no motor e o curriculo falha o build quando mentem"
```

---

### Task 8: Suporte Blockly

**Files:**
- Create: `src/ui/blocos.tsx`, `src/ui/painel-blocos.tsx`
- Test: `src/ui/blocos.test.ts`

**Interfaces:**
- Consumes: Task 2 — `BlocoLeigo`, `CampoLeigo`, `EntradaLeiga`; Task 2 — `CORES`, `BLOCOS`; Task 2 — `TIPO_DE_BLOCO`; Task 2 — `identificador`.
- Produz: `registo` (nome interno de registo dos blocos), `paraBlocoLeigo(estado: unknown): BlocoLeigo | null`, `criarToolbox(): Blockly.ToolboxDefinition`, `BlocosProps`, `PainelBlocos`.

- [ ] **Step 1: Escrever o teste falhado**

`src/ui/blocos.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { paraBlocoLeigo } from './blocos';
import { gerarPython } from '../motor/gerador';
import { avaliador } from '../motor/avaliador';

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
    expect(gerarPython(b!).python).toBe('total = 5\n');
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
    expect(gerarPython(b!).python).toBe('total = 5\nlog(total)\n');
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
    expect(gerarPython(b!).python).toBe('for _ in range(2):\n    log(1)\n');
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
import type { BlocoLeigo, CampoLeigo, EntradaLeiga } from '../motor/avaliador';
import { BLOCOS, CORES } from '../motor/blocos';

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
import type { BlocoLeigo } from '../motor/avaliador';
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

### Task 9: Estado da lição e painel de texto

**Files:**
- Create: `src/ui/tipos.ts`, `src/ui/estado.ts`, `src/ui/texto.tsx`, `src/ui/estilo.css`
- Test: `src/ui/estado.test.ts`, `src/ui/texto.test.tsx`

**Interfaces:**
- Consumes: Task 6 — `LicaoPronto`, `PassoPronto`, `MomentoPronto`; Task 4 — `Divergencia`; Task 5 — `avaliarTexto`; Task 1 — `Erro`.
- Produz: `Vista = 'explicar' | 'fazer' | 'nomear' | 'leitura'`, `VISTAS`, `VistaEstado`, `useLesson(licao, passoInicial, vistaInicial)`, `PainelTexto`.

- [ ] **Step 1: Escrever o teste falhado `src/ui/estado.test.ts`**

```typescript
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLesson } from './estado';
import { CARREGAR } from '../conteudo/carregar';
import variavelYaml from '../conteudo/variavel.yml?raw';

const licao = CARREGAR(variavelYaml);

describe('useLesson', () => {
  it('começa no primeiro passo, na vista explicar, no momento 0', () => {
    const { result } = renderHook(() => useLesson(licao));
    expect(result.current.indicePasso).toBe(0);
    expect(result.current.vista).toBe('explicar');
    expect(result.current.momento).toBe(0);
  });

  it('a vista inicial pode ser saltada', () => {
    const { result } = renderHook(() => useLesson(licao, 1, 'fazer'));
    expect(result.current.indicePasso).toBe(1);
    expect(result.current.vista).toBe('fazer');
  });

  it('avançar percorre as três vistas e chega a leitura', () => {
    const { result } = renderHook(() => useLesson(licao));
    act(() => result.current.proximo());
    expect(result.current.vista).toBe('fazer');
    act(() => result.current.proximo());
    expect(result.current.vista).toBe('nomear');
    act(() => result.current.proximo());
    expect(result.current.vista).toBe('leitura');
  });

  it('na vista de leitura não passa de leitura', () => {
    const { result } = renderHook(() => useLesson(licao, 2, 'leitura'));
    act(() => result.current.proximo());
    expect(result.current.vista).toBe('leitura');
  });

  it('voltar recua a vista quando o momento é o primeiro', () => {
    const { result } = renderHook(() => useLesson(licao, 0, 'fazer'));
    act(() => result.current.anterior());
    expect(result.current.vista).toBe('explicar');
  });

  it('só marca um momento de leitura quando a resposta bate com uma das palavras', () => {
    const { result } = renderHook(() => useLesson(licao, 2, 'leitura'));
    const momento = result.current.momentoActual!;
    act(() => result.current.responder('nada disto'));
    expect(result.current.feito[momento.id]).toBeFalsy();
    act(() => result.current.responder(momento.palavras[0]!));
    expect(result.current.feito[momento.id]).toBe(true);
  });

  it('a comparação ignora acentos, maiúsculas e pontuação', () => {
    const { result } = renderHook(() => useLesson(licao, 2, 'leitura'));
    const momento = result.current.momentoActual!;
    act(() => result.current.responder(`${momento.palavras[0]!.toUpperCase()}...`));
    expect(result.current.feito[momento.id]).toBe(true);
  });

  it('marcar observado conta como ter visto, mesmo sem escrever nada', () => {
    const { result } = renderHook(() => useLesson(licao, 0, 'fazer'));
    const momento = result.current.momentoActual!;
    act(() => result.current.observar());
    expect(result.current.feito[momento.id]).toBe(true);
  });

  it('não deixa avançar de passo com momentos por fazer', () => {
    const { result } = renderHook(() => useLesson(licao, 0));
    act(() => result.current.proximoPasso());
    expect(result.current.indicePasso).toBe(0);
  });

  it('depois de ver todos os momentos, avançar de passo funciona', () => {
    const { result } = renderHook(() => useLesson(licao, 0, 'fazer'));
    for (let i = 0; i < result.current.passo.momentos.length; i += 1) {
      act(() => result.current.observar());
      act(() => result.current.proximo());
    }
    act(() => result.current.proximoPasso());
    expect(result.current.indicePasso).toBe(1);
  });

  it('irPara muda de passo e reinicia o momento', () => {
    const { result } = renderHook(() => useLesson(licao));
    act(() => result.current.irPara(2, 'leitura'));
    expect(result.current.indicePasso).toBe(2);
    expect(result.current.vista).toBe('leitura');
    expect(result.current.momento).toBe(0);
  });

  it('expor a sonda do momento actual', () => {
    const { result } = renderHook(() => useLesson(licao, 0, 'fazer'));
    expect(result.current.sonda.id).toBe('guardar-numero');
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npx vitest run src/ui/estado.test.ts`
Expected: FAIL com erro de resolução de `./estado`.

- [ ] **Step 3: Escrever `src/ui/tipos.ts`**

```typescript
export type Vista = 'explicar' | 'fazer' | 'nomear' | 'leitura';

export const VISTAS: Vista[] = ['explicar', 'fazer', 'nomear', 'leitura'];

export const ROTULOS: Record<Vista, string> = {
  explicar: 'Lê primeiro',
  fazer: 'Agora faz',
  nomear: 'Isto tem nome',
  leitura: 'Lê o código',
};
```

- [ ] **Step 4: Escrever `src/ui/estado.ts`**

```typescript
import { useCallback, useMemo, useState } from 'react';
import type { LicaoPronto, MomentoPronto, PassoPronto, SondaPronto } from '../conteudo/carregar';
import type { Erro } from '../motor/tipos';
import { VISTAS, type Vista } from './tipos';

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

export interface VistaEstado {
  licao: LicaoPronto;
  indicePasso: number;
  passo: PassoPronto;
  vista: Vista;
  momento: number;
  momentoActual: MomentoPronto | null;
  sonda: SondaPronto | null;
  feito: Record<string, boolean>;
  erros: Erro[];
  respostas: Record<string, string>;
  proximo: () => void;
  anterior: () => void;
  responder: (texto: string) => boolean;
  observar: () => void;
  proximoPasso: () => void;
  irPara: (passo: number, vista: Vista) => void;
  definirErros: (erros: Erro[]) => void;
  definirResposta: (momentoId: string, texto: string) => void;
}

export function useLesson(licao: LicaoPronto, passoInicial = 0, vistaInicial: Vista = 'explicar'): VistaEstado {
  const [indicePasso, definirIndice] = useState(passoInicial);
  const [vista, definirVista] = useState<Vista>(vistaInicial);
  const [momento, definirMomento] = useState(0);
  const [feito, definirFeito] = useState<Record<string, boolean>>({});
  const [erros, definirErros] = useState<Erro[]>([]);
  const [respostas, definirRespostas] = useState<Record<string, string>>({});

  const passo = licao.passos[indicePasso] ?? licao.passos[0]!;
  const momentoActual = passo.momentos[momento] ?? null;
  const sonda = momentoActual
    ? (passo.sondas.find((s) => s.id === momentoActual.sonda) ?? null)
    : null;
  const total = passo.momentos.length;
  const tudoFeito = passo.momentos.every((m) => feito[m.id]);

  const proximo = useCallback(() => {
    if (momento < total - 1) {
      definirMomento(momento + 1);
      return;
    }
    if (vista === 'leitura') return;
    definirVista(VISTAS[VISTAS.indexOf(vista) + 1] ?? 'leitura');
  }, [momento, total, vista]);

  const anterior = useCallback(() => {
    if (momento > 0) {
      definirMomento(momento - 1);
      return;
    }
    const i = VISTAS.indexOf(vista);
    if (i > 0) definirVista(VISTAS[i - 1]!);
  }, [momento, vista]);

  const responder = useCallback(
    (texto: string): boolean => {
      const atual = passo.momentos[momento];
      if (!atual || atual.fonte !== 'leitura') return false;
      const ok = respostaBate(atual.palavras, texto);
      if (ok) definirFeito((f) => ({ ...f, [atual.id]: true }));
      return ok;
    },
    [momento, passo],
  );

  const observar = useCallback(() => {
    if (!momentoActual) return;
    definirFeito((f) => ({ ...f, [momentoActual.id]: true }));
  }, [momentoActual]);

  const proximoPasso = useCallback(() => {
    if (!tudoFeito) return;
    if (indicePasso < licao.passos.length - 1) {
      definirIndice(indicePasso + 1);
      definirMomento(0);
      definirVista('explicar');
    }
  }, [tudoFeito, indicePasso, licao.passos.length]);

  const irPara = useCallback(
    (passo: number, vista: Vista) => {
      if (passo < 0 || passo >= licao.passos.length) return;
      definirIndice(passo);
      definirVista(vista);
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
      passo,
      vista,
      momento,
      momentoActual,
      sonda,
      feito,
      erros,
      respostas,
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
      licao, indicePasso, passo, vista, momento, momentoActual, sonda, feito, erros,
      respostas, proximo, anterior, responder, observar, proximoPasso, irPara, definirResposta,
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
      <PainelTexto resposta="total = 5" aoComparar={(t) => { recebido = t; }} debounceMs={20} />,
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
      <PainelTexto resposta="total = 5" aoComparar={(t) => { recebido = t; }} semBlocos />,
    );
    const botao = screen.getByRole('button', { name: 'Executar' });
    expect(botao).toBeEnabled();
    expect(screen.getByText(/sem blocos ao lado/i)).toBeInTheDocument();
    await userEvent.click(botao);
    expect(recebido).toBe('total = 5');
  });

  it('sem blocos não aparecem divergências, porque não há com o que comparar', () => {
    const { container } = render(
      <PainelTexto resposta="total = 5" aoComparar={() => undefined} semBlocos />,
    );
    expect(container.querySelector('.divergencias')).toBeNull();
  });

  it('limpa o texto quando a resposta muda de passo', () => {
    const { rerender } = render(<PainelTexto resposta="total = 5" aoComparar={() => undefined} />);
    rerender(<PainelTexto resposta="outro = 1" aoComparar={() => undefined} />);
    expect(screen.getByLabelText('O teu código em Python')).toHaveValue('outro = 1');
  });

  it('mostra as divergências com porque, python e java', () => {
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
            python: 'Python deixa passar.',
            java: 'Java não deixa.',
          },
        ]}
      />,
    );
    expect(screen.getByText('Linha 1')).toBeInTheDocument();
    expect(screen.getByText(/fazem coisas diferentes/i)).toBeInTheDocument();
    expect(screen.getByText(/Python deixa passar/i)).toBeInTheDocument();
    expect(screen.getByText(/Java não deixa/i)).toBeInTheDocument();
  });

  it('mostra a saída do programa quando existe', () => {
    render(<PainelTexto resposta="total = 5" aoComparar={() => undefined} saida={['7', '7', '7']} />);
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
import type { Divergencia } from '../motor/divergencia';
import './estilo.css';

export interface PainelTextoProps {
  resposta: string;
  aoComparar: (texto: string) => void;
  divergencias?: Divergencia[];
  semBlocos?: boolean;
  saida?: string[];
  debounceMs?: number;
}

export function PainelTexto({
  resposta,
  aoComparar,
  divergencias = [],
  semBlocos = false,
  saida = [],
  debounceMs = 250,
}: PainelTextoProps) {
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
      <label htmlFor="codigo-python">O teu código em Python</label>
      <textarea
        id="codigo-python"
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
              <p>{d.python}</p>
              <p>{d.java}</p>
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

### Task 10: Robô tipado

**Files:**
- Create: `src/ui/robo.tsx`, `src/ui/robo.css`
- Test: `src/ui/robo.test.tsx`

**Interfaces:**
- Consumes: Task 1 — `Valor`, `Recusa`, `Tipo`.
- Produz: `NOMES_TIPO`, `PortaRobo`, `PORTA_ENTRADA`, `PORTA_SAIDA`, `PainelRobo`.

- [ ] **Step 1: Escrever o teste falhado**

`src/ui/robo.test.tsx`:
```typescript
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PainelRobo, PORTA_ENTRADA, PORTA_SAIDA } from './robo';
import { val } from '../motor/tipos';
import type { Recusa } from '../motor/tipos';

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
import type { Recusa, Tipo, Valor } from '../motor/tipos';
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

### Task 11: Ecrã da lição

**Files:**
- Create: `src/ui/lecao/PassoView.tsx`, `src/ui/lecao/SondasView.tsx`, `src/ui/lecao/Tela.tsx`, `src/ui/lecao/lecao.css`
- Modify: `src/main.tsx`
- Test: `src/ui/lecao/tela.test.tsx`

**Interfaces:**
- Consumes: Task 2 — `avaliador`, `Regra`, `BlocoLeigo`; Task 3 — `gerarPython`; Task 4 — `comparar`, `Divergencia`; Task 5 — `avaliarTexto`, `classificar`; Task 6 — `LicaoPronto`, `PassoPronto`, `SondaPronto`; Task 7 — `executarSonda`; Task 8 — `Blocos`; Task 9 — `PainelTexto`, `useLesson`, `VistaEstado`; Task 10 — `PainelRobo`, `PORTA_ENTRADA`, `PORTA_SAIDA`; Task 1 — `Erro`, `Recusa`, `Valor`.
- Produz: `Tela`, `TelaProps`, `PassoView`, `SondasView`.

- [ ] **Step 1: Escrever o teste falhado**

`src/ui/lecao/tela.test.tsx`:
```typescript
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tela } from './Tela';
import { CARREGAR } from '../../conteudo/carregar';
import variavelYaml from '../../conteudo/variavel.yml?raw';

const licao = CARREGAR(variavelYaml);

describe('Tela da lição', () => {
  it('mostra o título e o objectivo do passo', () => {
    render(<Tela licao={licao} />);
    expect(screen.getByRole('heading', { name: 'O que é uma variável' })).toBeInTheDocument();
    expect(screen.getByText(/Fazer o robô dizer três vezes/i)).toBeInTheDocument();
  });

  it('a vista explicar mostra o texto e não mostra blocos nem painel', () => {
    render(<Tela licao={licao} pularPara="explicar" />);
    expect(screen.getByText(/Imagina uma caixa com uma etiqueta/i)).toBeInTheDocument();
    expect(screen.queryByTestId('area-blocos')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('O teu código em Python')).not.toBeInTheDocument();
  });

  it('a vista fazer mostra blocos e robô, e não mostra painel de texto', () => {
    render(<Tela licao={licao} pularPara="fazer" />);
    expect(screen.getByTestId('area-blocos')).toBeInTheDocument();
    expect(screen.getByLabelText('O robô')).toBeInTheDocument();
    expect(screen.queryByLabelText('O teu código em Python')).not.toBeInTheDocument();
  });

  it('a vista fazer mostra o momento actual e a pergunta da sonda', () => {
    render(<Tela licao={licao} pularPara="fazer" />);
    expect(screen.getByText(/Arrasta o bloco "guardar"/i)).toBeInTheDocument();
    expect(screen.getByText(/O que é que a tua primeira linha faz\?/i)).toBeInTheDocument();
  });

  it('Continuar está desactivado enquanto o momento não for visto', () => {
    render(<Tela licao={licao} pularPara="fazer" />);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('Ver a resposta mostra a revelação da sonda e nunca bloqueia', async () => {
    render(<Tela licao={licao} pularPara="fazer" />);
    const botao = screen.getByRole('button', { name: 'Ver a resposta' });
    await userEvent.click(botao);
    expect(screen.getByText(/guardar um valor não é mostrar um valor/i)).toBeInTheDocument();
  });

  it('Experimentar mostra a observação da sonda e activa Continuar', async () => {
    render(<Tela licao={licao} pularPara="fazer" />);
    await userEvent.click(screen.getByRole('button', { name: 'Experimentar' }));
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });

  it('a vista nomear mostra a palavra do conceito e a linha de Python', () => {
    render(<Tela licao={licao} pularPara="nomear" />);
    expect(screen.getByText(/Chama-se assim: um sítio com nome que guarda um valor/i)).toBeInTheDocument();
  });

  it('a vista leitura mostra a ficha com 15 linhas numeradas', () => {
    render(<Tela licao={licao} passoInicial={2} pularPara="leitura" />);
    expect(screen.getByText('programa_de_outra_pessoa.py')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText(/estado \+ '!'/)).toBeInTheDocument();
  });

  it('a ficha tem uma pergunta por linha e aceita a resposta certa', async () => {
    render(<Tela licao={licao} passoInicial={2} pularPara="leitura" />);
    const campos = screen.getAllByLabelText(/a tua resposta/i);
    expect(campos).toHaveLength(7);
    await userEvent.type(campos[0]!, 'guarda a palavra ok');
    await userEvent.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText(/bem-vindo/i)).toBeInTheDocument();
  });

  it('a ficha recusa uma resposta que não bate com nenhuma palavra', async () => {
    render(<Tela licao={licao} passoInicial={2} pularPara="leitura" />);
    const campos = screen.getAllByLabelText(/a tua resposta/i);
    await userEvent.type(campos[0]!, 'banana');
    await userEvent.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(screen.getByText(/Ainda não/i)).toBeInTheDocument();
  });

  it('o painel de texto aparece nos passos que precisam dele, no momento certo', () => {
    render(<Tela licao={licao} passoInicial={1} pularPara="fazer" />);
    expect(screen.queryByLabelText('O teu código em Python')).toBeInTheDocument();
  });

  it('sem blocos ligados, Executar corre o teu texto e não finge uma comparação', async () => {
    const { container } = render(<Tela licao={licao} passoInicial={1} pularPara="fazer" />);
    const editor = screen.getByLabelText('O teu código em Python');
    await userEvent.clear(editor);
    await userEvent.type(editor, 'total = "olá"');
    expect(screen.getByRole('button', { name: 'Executar' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Executar' }));
    expect(container.querySelector('.divergencias')).toBeNull();
  });

  it('a vista leitura não mostra blocos nem robô', () => {
    render(<Tela licao={licao} passoInicial={2} pularPara="leitura" />);
    expect(screen.queryByTestId('area-blocos')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('O robô')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr e ver falhar**

Run: `npx vitest run src/ui/lecao/tela.test.tsx`
Expected: FAIL com erro de resolução de `./Tela`.

- [ ] **Step 3: Escrever `src/ui/lecao/SondasView.tsx`**

```typescript
import type { SondaPronto } from '../../conteudo/carregar';
import { executarSonda } from '../../conteudo/sondas';
import type { Erro } from '../../motor/tipos';

export interface SondasViewProps {
  sonda: SondaPronto | null;
  erros: Erro[];
  observado: boolean;
  aoObservar: () => void;
}

export function SondasView({ sonda, erros, observado, aoObservar }: SondasViewProps) {
  if (!sonda) return null;
  const referencia = executarSonda(sonda);
  return (
    <section aria-label="Experiência" className="sonda">
      <p className="sonda-experiencia">{sonda.experiencia}</p>
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
      {referencia.classe !== sonda.esperado.classe ? (
        <p className="sonda-aviso">
          O currículo está desactualizado: a experiência dá {referencia.classe} e o texto promete{' '}
          {sonda.esperado.classe}. Corre `npm run sondas`.
        </p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Escrever `src/ui/lecao/PassoView.tsx`**

```typescript
import { useState } from 'react';
import type { MomentoPronto, PassoPronto, SondaPronto } from '../../conteudo/carregar';
import type { Erro } from '../../motor/tipos';
import { ROTULOS, type Vista } from '../tipos';
import { SondasView } from './SondasView';

export interface PassoViewProps {
  passo: PassoPronto;
  vista: Vista;
  indicePasso: number;
  totalPassos: number;
  momento: number;
  momentoActual: MomentoPronto | null;
  sonda: SondaPronto | null;
  feito: Record<string, boolean>;
  respostas: Record<string, string>;
  erros: Erro[];
  aoResponder: (texto: string) => boolean;
  aoDefinirResposta: (momentoId: string, texto: string) => void;
  aoObservar: () => void;
  aoAvancar: () => void;
  aoAnterior: () => void;
  aoPasso: (passo: number, vista: Vista) => void;
  referencia?: { nome: string; linhas: string[] };
  children?: React.ReactNode;
}

export function PassoView(props: PassoViewProps) {
  const { passo, vista, indicePasso, totalPassos, momento, momentoActual } = props;
  const [erro, definirErro] = useState<string | null>(null);
  const total = passo.momentos.length;
  const momentoFeito = momentoActual ? !!props.feito[momentoActual.id] : false;
  const tudoFeito = passo.momentos.every((m) => props.feito[m.id]);

  const verificar = (): void => {
    const ok = props.aoResponder(props.respostas[momentoActual?.id ?? ''] ?? '');
    definirErro(ok ? null : 'Ainda não. Lê a pergunta outra vez e tenta com outras palavras.');
    if (ok) props.aoAvancar();
  };

  return (
    <section className="passo" aria-label="Passo">
      <header className="passo-cabecalho">
        <p className="passo-rotulo">
          {ROTULOS[vista]} · passo {indicePasso + 1} de {totalPassos}
        </p>
        <h2 className="passo-objetivo">{passo.objetivo}</h2>
        <p className="passo-texto">
          {vista === 'explicar' ? passo.explicar : vista === 'fazer' ? passo.fazer : passo.nomear}
        </p>
      </header>

      {referencia && vista === 'leitura' ? (
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

      {vista === 'leitura' ? (
        <ol className="ficha-perguntas">
          {passo.momentos.map((m, i) => (
            <li key={m.id}>
              <p className="ficha-pergunta">{m.texto}</p>
              <label htmlFor={`resposta-${m.id}`}>A tua resposta</label>
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

      {vista !== 'leitura' && momentoActual ? (
        <SondasView sonda={props.sonda} erros={props.erros} observado={!!props.feito[momentoActual.id]} aoObservar={props.aoObservar} />
      ) : null}

      <nav className="passo-navegacao">
        {momento > 0 || vista !== 'explicar' ? (
          <button type="button" onClick={props.aoAnterior}>
            Voltar
          </button>
        ) : null}
        {vista === 'leitura' ? (
          <>
            {indicePasso > 0 ? (
              <button type="button" onClick={() => props.aoPasso(indicePasso - 1, 'nomear')}>
                Voltar ao passo anterior
              </button>
            ) : null}
            <button type="button" onClick={props.aoAvancar} disabled={!tudoFeito}>
              Terminar
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={props.aoAvancar} disabled={!momentoFeito}>
              Continuar
            </button>
            {vista === 'nomear' && indicePasso < totalPassos - 1 ? (
              <button
                type="button"
                onClick={() => props.aoPasso(indicePasso + 1, 'explicar')}
                disabled={!tudoFeito}
              >
                Passo seguinte
              </button>
            ) : null}
          </>
        )}
      </nav>
    </section>
  );
}
```

- [ ] **Step 5: Escrever `src/ui/lecao/Tela.tsx`**

```typescript
import { useMemo, useState } from 'react';
import type { LicaoPronto } from '../../conteudo/carregar';
import { avaliador } from '../../motor/avaliador';
import type { BlocoLeigo } from '../../motor/avaliador';
import { comparar } from '../../motor/divergencia';
import type { Divergencia } from '../../motor/divergencia';
import { gerarPython } from '../../motor/gerador';
import { avaliarTexto, classificar } from '../../motor/texto';
import type { Erro, Recusa, Valor } from '../../motor/tipos';
import { Blocos } from '../painel-blocos';
import { PainelRobo, PORTA_ENTRADA, PORTA_SAIDA } from '../robo';
import { PainelTexto } from '../texto';
import { useLesson } from '../estado';
import type { Vista } from '../tipos';
import { PassoView } from './PassoView';
import './lecao.css';

export interface TelaProps {
  licao: LicaoPronto;
  passoInicial?: number;
  pularPara?: Vista;
}

export function Tela({ licao, passoInicial = 0, pularPara = 'explicar' }: TelaProps) {
  const estado = useLesson(licao, passoInicial, pularPara);
  const [programa, definirPrograma] = useState<BlocoLeigo | null>(null);
  const [erros, definirErros] = useState<Erro[]>([]);
  const [valores, definirValores] = useState<Valor[]>([]);
  const [divergencias, definirDivergencias] = useState<Divergencia[]>([]);
  const [saida, definirSaida] = useState<string[]>([]);
  const [texto, definirTexto] = useState('');

  const momento = estado.momentoActual;
  const fonte = momento?.fonte ?? 'blocos';
  const gerado = useMemo(() => gerarPython(programa), [programa]);

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
    const lista = avaliarTexto(valor);
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
        vista={estado.vista}
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
                chave={`${estado.indicePasso}-${estado.vista}-${estado.momento}`}
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
              resposta={gerado.python}
              aoComparar={correrTexto}
              divergencias={divergencias}
              semBlocos={!programa}
              saida={saida}
            />
          ) : null}
          {estado.vista === 'nomear' ? (
            <section aria-label="O teu código em Python" className="painel-texto">
              <label htmlFor="codigo-gerado">O teu código em Python</label>
              <pre id="codigo-gerado" className="saida">
                {gerado.python || '(ainda não há blocos)'}
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
Expected: PASS. O teste `a ficha tem uma pergunta por linha` espera **7** campos (o terceiro passo tem 7 momentos) — confirma que o YAML tem `l1` a `l7`.

- [ ] **Step 8: Ligar em `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CARREGAR } from './conteudo/carregar';
import variavelYaml from './conteudo/variavel.yml?raw';
import { Tela } from './ui/lecao/Tela';
import './ui/estilo.css';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta #raiz no index.html');

createRoot(raiz).render(
  <StrictMode>
    <Tela licao={CARREGAR(variavelYaml)} />
  </StrictMode>,
);
```

- [ ] **Step 9: Typecheck, suite completa e commit**

```bash
npm run typecheck
npm test
git add -A
git commit -m "feat: tela da licao com as tres vistas, sondas e ficha de leitura"
```

---

### Task 12: Aceitação da fatia

**Files:**
- Create: `src/lecoes/variavel.test.ts`

**Interfaces:**
- Consumes: Task 6 — `CARREGAR`; Task 4 — `comparar`, `TOLERANCIA_EDICAO`; Task 5 — `avaliarTexto`; Task 3 — `gerarPython`; Task 2 — `avaliador`.
- Produces: nada. É o portão.

**Notes:** este teste é a tradução executável do critério de aceitação da spec (§13.1). Não testa a UI: testa que a cadeia inteira — referência desconhecida, programa do utilizador, equivalência, e a falha na linha errada do sítio errado — se sustenta.

- [ ] **Step 1: Escrever o teste**

`src/lecoes/variavel.test.ts`:
```typescript
import { describe, expect, it } from 'vitest';
import { CARREGAR } from '../conteudo/carregar';
import { gerarPython } from '../motor/gerador';
import { comparar, TOLERANCIA_EDICAO } from '../motor/divergencia';
import { avaliarTexto, classificar } from '../motor/texto';
import { avaliador } from '../motor/avaliador';
import variavelYaml from '../conteudo/variavel.yml?raw';

const licao = CARREGAR(variavelYaml);
const ref = licao.referencia!;
const codigo = ref.linhas.join('\n') + '\n';

describe('aceitação da fatia: ler um ficheiro desconhecido', () => {
  it('a referência tem 15 linhas', () => {
    expect(ref.linhas).toHaveLength(15);
  });

  it('o ficheiro corre até à linha que morre, e só até ela', () => {
    const erros = avaliarTexto(codigo);
    expect(erros).toHaveLength(1);
    expect(erros[0]!.classe).toBe('FalhaRuntime');
  });

  it('a linha que morre é a 10, que é a print que junta o "!"', () => {
    const erros = avaliarTexto(codigo);
    expect(erros[0]!.passo).toBe(10);
    expect(ref.linhas[9]).toContain("estado + '!'");
  });

  it('o valor problemático foi posto na linha 2, oito linhas antes', () => {
    expect(ref.linhas[1]).toBe("estado = 'ok'");
  });

  it('a falha explica que o problema é um texto onde se esperava um número', () => {
    const porque = avaliarTexto(codigo)[0]!.porque;
    expect(porque).toContain('texto');
    expect(porque).toContain('estado');
    expect(porque.length).toBeGreaterThan(60);
  });

  it('a falha diz que o Python descobre isto tarde e o Java não', () => {
    const e = avaliarTexto(codigo)[0]!;
    expect(e.python).toContain('Python');
    expect(e.java).toContain('Java');
  });

  it('as linhas antes da morte produzem os valores que esperamos', () => {
    const antes = ref.linhas.slice(0, 9).join('\n') + '\n';
    expect(avaliarTexto(antes)).toEqual([]);
  });

  it('o programa do primeiro passo passa na verificação de equivalência', () => {
    const g = gerarPython({
      type: 'pilha',
      inputs: {
        CORPO: {
          stack: [
            { type: 'guardar', fields: { nome: { valor: 'total' } }, inputs: { VALOR: { valor: 7 } } },
            {
              type: 'repetir',
              fields: {},
              inputs: {
                PASSOS: { valor: 3 },
                CORPO: {
                  stack: [
                    {
                      type: 'dizer',
                      fields: {},
                      inputs: { VALOR: { bloco: { type: 'texto', inputs: { VALOR: { ref: 'total' } } } } },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    });
    const rel = comparar(g, 'total = 7\nfor _ in range(3):\n    print(total)\n');
    expect(rel.ok).toBe(true);
  });

  it('a tolerância de edição é 2 e aceita a transposition media/meda', () => {
    expect(TOLERANCIA_EDICAO).toBe(2);
    expect(comparar({ python: 'media = total / 4\n', anotacoes: [] }, 'meda = total / 4\n').ok).toBe(true);
  });

  it('a tolerância de edição não aceita três caracteres errados', () => {
    expect(comparar({ python: 'media = total / 4\n', anotacoes: [] }, 'medya = totsl / 4\n').ok).toBe(false);
  });

  it('o programa que o utilizador constrói em blocos é executável e sem erros', () => {
    const a = avaliador();
    a.executar({
      type: 'pilha',
      inputs: {
        CORPO: {
          stack: [
            { type: 'guardar', fields: { nome: { valor: 'total' } }, inputs: { VALOR: { valor: 7 } } },
            { type: 'log', fields: {}, inputs: { VALOR: { ref: 'total' } } },
          ],
        },
      },
    });
    expect(a.trace.erros).toEqual([]);
  });

  it('o mesmo programa dá a mesma observação em blocos e em Python', () => {
    const programa = {
      type: 'pilha',
      inputs: {
        CORPO: {
          stack: [
            { type: 'guardar', fields: { nome: { valor: 'total' } }, inputs: { VALOR: { valor: 7 } } },
            {
              type: 'dizer',
              fields: {},
              inputs: { VALOR: { bloco: { type: 'texto', inputs: { VALOR: { ref: 'total' } } } } },
            },
          ],
        },
      },
    };
    const a = avaliador();
    a.executar(programa);
    expect(a.trace.erros).toEqual([]);
    // A projecção tem de ser Python que o nosso próprio avaliador percebe,
    // senão a equivalência blocos ↔ texto é uma mentira.
    expect(gerarPython(programa).python).toBe('total = 7\nprint(total)\n');
    expect(classificar(avaliarTexto('total = 7\nprint(total)\n'))).toBe('Observacao');
  });

  it('um bloco que chama uma função por escrever morre em Python, e diz porquê', () => {
    const a = avaliador();
    a.executar({
      type: 'pilha',
      inputs: {
        CORPO: {
          stack: [
            { type: 'guardar', fields: { nome: { valor: 'total' } }, inputs: { VALOR: { valor: 7 } } },
            { type: 'log', fields: {}, inputs: { VALOR: { ref: 'total' } } },
          ],
        },
      },
    });
    expect(a.trace.erros).toEqual([]);
    const python = gerarPython({
      type: 'pilha',
      inputs: {
        CORPO: {
          stack: [
            { type: 'guardar', fields: { nome: { valor: 'total' } }, inputs: { VALOR: { valor: 7 } } },
            { type: 'log', fields: {}, inputs: { VALOR: { ref: 'total' } } },
          ],
        },
      },
    }).python;
    const erros = avaliarTexto(python);
    expect(erros).toHaveLength(1);
    expect(erros[0]!.porque).toContain('log');
    expect(erros[0]!.java).toContain('Java');
  });
});
```

- [ ] **Step 2: Correr**

Run: `npx vitest run src/lecoes/variavel.test.ts`
Expected: PASS. Se `a linha que morre é a 10` falhar, a **referência no YAML** está mal numerada — corrige o YAML, nunca o avaliador.

- [ ] **Step 3: Correr tudo**

Run: `npm run typecheck && npm test && npm run sondas`
Expected: sem erros de tipos; todas as sondas `ok`; suite completa a passar.

- [ ] **Step 4: Correr a aplicação e confirmar à mão**

```bash
npm run dev
```

Percorre a lição inteira e confirma, uma a uma, estas nove coisas:

1. A vista explicar mostra a pergunta e não mostra blocos.
2. A vista fazer mostra blocos, robô com duas portas, e a experiência da sonda.
3. "Experimentar" mostra a revelação e activa "Continuar".
4. Um `guardar` com 7 gera `total = 7` e `Correr o programa` não dá erro.
5. Um `guardar` com `olá` dá `Recusa` no robô, com a razão e as duas frases Python/Java.
6. No passo 2, `total = "olá"` não dá erro nenhum e `total = total + 1` dá `FalhaRuntime` a dizer que o valor mau foi posto na primeira linha.
7. A vista nomear mostra a linha de Python com as anotações.
8. O passo 3 mostra as 15 linhas numeradas, aceita "guarda a palavra ok" na primeira pergunta e recusa "banana".
9. "Voltar ao passo anterior" traz o utilizador de volta ao passo 2.

Se alguma destas não for possível fazer à mão, o plano tem uma lacuna. Volta aqui antes de fechar a fatia.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: aceitacao da fatia — ler um ficheiro desconhecido de 15 linhas"
```

---

## Self-Review

**1. Cobertura da spec.** §7 e §9 (o "mais protegido", erros com razão) → Tasks 1, 2, 3, 4, 5, 10. §8 (cinco unidades) → Tasks 2, 3, 8, 9, 7. §11 (três tempos) → Tasks 6, 9, 11. §11.1 (feito quando viu, não quando acertou) → Task 6 (momento aponta para sonda), Task 9 (`observar` nunca é bloqueado por texto), Task 11 (`Experimentar` e `Ver a resposta` são o mesmo botão que nunca bloqueia). §11.2 (sondas são testes) → Tasks 6, 7. §11.3 (conteúdo em YAML no Git) → Task 6. §12 (inversão blocos/texto) → Task 11 (`explicar` sem blocos, `fazer` blocos sem texto, `nomear` blocos + texto lado a lado, `leitura` só texto). §13 (âmbito) → Task 12. **Não implementado, por decisão:** §3 escada de profundidade — o v1 implementa só o nível 1–2 e a nota de §11 sobre os eixos fica registada na spec. A projecção Java não existe no v1, e o texto de anotação descreve-a como comparação em prosa, que é o que a spec permite enquanto não há gerador.

**2. Placeholders.** Nenhum. Onde a spec ou o código exigiria um segredo, o plano escreve o segredo. Cada ficheiro é escrito uma vez, completo: as notas de correcção que existiam nas Tasks 3, 5, 9 e 11 foram eliminadas, e o ficheiro não contém bytes nulos nem caracteres estranhos.

**3. Consistência de tipos.** `BlocoLeigo` é definido na Task 2 e importado por 3, 4, 5, 6, 7, 8, 11, 12. `Erro` (Task 1) é usado em 2, 5, 7, 9, 10, 11. `Divergencia` (Task 4) em 9, 11. `ClasseObservada` (Task 5) em 6, 7, 11. `LicaoPronto` (Task 6) em 9, 11, 12. `MomentoPronto` e `SondaPronto` (Task 6) em 9, 11. `Vista` e `VISTAS` (Task 9) em 11. `useLesson` (Task 9) em 11. `Blocos` (Task 8, em `painel-blocos.tsx`) em 11. `PainelTexto` (Task 9) e `PainelRobo` (Task 10) em 11. Ordem de criação respeitada: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12.

**4. Review Focus.** (1) nome duplicado → Task 2, "nome de variável duplicado substitui e explica". (2) transposição → Task 4, "aceita uma transposição de caracteres adjacentes", e Task 12, "a tolerância de edição é 2 e aceita a transposition media/meda". (3) iterações fora dos limites → Task 2, "um número de repetições acima do limite…" e "não entra no ciclo…", e Task 5, "um for com número de iterações fora dos limites…". (4) painel sem blocos → Task 9, "sem blocos ligados o botão Executar corre o texto, mas avisa que não pode comparar" e "sem blocos não aparecem divergências, porque não há com que comparar", e Task 11, "sem blocos ligados, Executar corre o teu texto e não finge uma comparação". (5) valor recusado a chegar a `dizer` → Task 2, "recusa um valor que já tinha sido recusado a chegar a dizer".

**5. Dívidas registadas, não escondidas.** `if` não é avaliavel pelo avaliador de texto do v1, e a referência de leitura foi escrita sem `if` por isso — com um teste em `carregar.test.ts` que garante que a referência não usa `if`, `while`, `def` nem `import` como instruções. O gerador escreve um comentário para blocos desconhecidos em vez de falhar, para que o editor Blockly possa ter blocos que a lição 1 ainda não ensina. O painel de texto no passo 2 fica sem blocos (`semBlocos` verdadeiro) porque aquele passo é sobre texto: o botão corre o teu texto e avisa que ainda não há nada com que comparar, em vez de ficar desligado — desligar-o mataria a lição. O avaliador de texto **nunca** recusa: `total = "olá"` passa, e a falha só aparece na linha em que usas `total` como número. Se recusasse, estaríamos a ensinar Java e a mentir sobre o Python — que é exactamente o erro que esta lição existe para desfazer. Por isso a projecção também não pode usar truques: `dizer` escreve `print(total)` e não `print(str(total))`, porque o `str()` não existe para o nosso próprio avaliador e a equivalência blocos ↔ texto deixava de ser verdade. `log` é a excepção deliberada: escreve `log(...)`, uma função que o utilizador ainda não escreveu, para mostrar que o Python falha quando chega lá e o Java falha antes de compilar.
