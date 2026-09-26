# Ponte — aprender a ler uma linguagem, em seis linguagens

*Nome provisório. Especificação de design v2, 2026-09-26. Substitui `2026-09-26-ponte-blocos-para-leitura-design.md`.*

---

## 0. O que mudou em relação à v1, e porque

A v1 partia de uma ideia elegante: **os blocos são a linguagem invariante, o texto é uma projeção**. Acrescentar uma linguagem era aditivo.

Isso era verdade para linguagens da mesma família, e **falso para SQL**. SQL não tem variáveis, não tem ciclos, não tem `print`. Forçar `guardar`/`repetir`/`dizer` em SQL produziria SQL mentira.

Pior: a v1 punha o utilizador diante de *"qual linguagem queres aprender?"* e depois mostrava-lhe sempre a mesma lição, com uma sintaxe diferente. Escolher não mudava o que se aprendia.

A v2 corrige as duas coisas:

| | v1 | v2 |
|---|---|---|
| O que é partilhado | os blocos | a **semântica**, o **método** e o **formato** |
| O que difere | a sintaxe | os **blocos**, o **emit**, o **parse**, a **sequência de conceitos**, a **história de segurança** |
| Escolher linguagem | mudava a sintaxe | muda **o que aprendes** |
| Quantas | uma (Python) | **seis**, todas no primeiro corte |

**O que se perde, dito com clareza:** a afirmação "um núcleo, N linguagens" enfraquece. O que entregamos são **seis produtos paralelos** que partilham a semântica, o método e o formato — não um produto projetado seis vezes. É menos elegante e é mais honesto. A versão bonita da tese era falsa.

E há um segundo custo, corrigido na §6.4: **seis linguagens são seis front-ends de leitura**, porque uma linguagem é a sua sintaxe. Isso não se elimina com desenho.

---

## 1. A tese

> **A IA não tornou o conhecimento de programação desnecessário — tornou-o obrigatório.
> Porque já não escreves o código, escreves código que não escreveste, e alguém tem de o ler.**

A habilidade a treinar não é *escrever programas*. É **ler programas** e saber o que se está a ler.

## 2. Critério de sucesso

> **O utilizador escolhe uma linguagem, abre um ficheiro dessa linguagem que nunca viu, e consegue segui-lo linha a linha — não executá-lo, não escrevê-lo: segui-lo — e dizer em voz alta o que cada linha faz e o que a protege, ou porque é que não a protege.**

Um critério por linguagem. Para Python e JavaScript a resposta é *"não protege, e rebenta mais tarde"*; para Java, Go e TypeScript é *"protege aqui, antes de correr"*; para SQL é *"protege no dado, para sempre"*. As seis respostas são completas e nenhuma precisa das outras.

Se isto não se cumprir, o número de blocos, lições e linguagens é irrelevante.

## 3. Para quem

Toda a gente que já faz programas e não os percebe: crianças a partir dos ~10 anos, autodidatas adultos, e pessoas que constroem coisas com ferramentas visuais sem saber os fundamentos.

O estado mental de partida é comum a todos — *fazer sem perceber*. O que varia é a profundidade que cada um aguenta. Daí a **escada de profundidade**: o mesmo conceito é encontrado em três níveis, e cada utilizador sobe até onde quer.

| Nível | O que faz | O que o portão pergunta |
|---|---|---|
| 1 | Arrasta o bloco, vê o efeito | "O que mudou?" |
| 2 | Escolhe o tipo certo | "E se guardares texto aqui?" |
| 3 | Escreve a linha real | "Porque é que esta linguagem te obriga a escrever isto?" |

Ninguém é rebaixado e ninguém fica aborrecido: a subida é opt-in.

*Nota para não confundir com a secção 11:* a escada de profundidade é o eixo **utilizador** (até onde cada pessoa sobe dentro do mesmo conceito). Os três tempos de um passo são o eixo **pedagógico** (a sequência que o passo sempre percorre). São eixos diferentes e não se substituem.

## 4. Objetivos e anti-objetivos

**É:**
- Uma camada de explicação que acompanha a construção, não um tutorial à parte.
- **Seis percursos de leitura, um por linguagem**, com o mesmo motor e o mesmo método.
- Um produto onde **todo o erro é instrucional**. Não existe erro genérico.
- Um destino em código de texto lido, com os blocos a desvanecer-se ao longo do percurso.

**Não é (decidido, para não voltar a discutir):**
- Não é uma alternativa à IA. É o que faz falta *quando* se usa IA.
- Não compara linguagens. Escolhes uma e conheces essa. Ver §0.
- Não é bidirecional: blocos → texto, nunca texto → blocos.
- Não é um editor de blocos genérico. É uma aula com um editor de blocos.
- Não tem CMS, painel de administração, contas, progresso sincronizado, multiplayer.
- Não tem IA dentro do produto no v1.

## 5. Pilares

| Pilar | O que é | Estado |
|---|---|---|
| **LER** | Blocos + porque + seis linguagens | **v1 — é o que esta spec especifica** |
| **USAR** | A IA presente como aluno: escreve, tu auditas | v2+ |
| **VERIFICAR** | Apanhar o erro que a IA comete | v2+ |

Começa-se pelo LER porque sem conseguir ler, os outros dois não têm em que assentar.

### 5.1 O momento que o produto existe para tornar possível (v2)

> O utilizador pede a um modelo uma solução. O modelo escreve o programa. O utilizador desmonta-o em blocos e, enquanto o faz, o sistema vai perguntando as perguntas que o modelo não fez. Encontra o bug. O bug era dele, não do modelo — porque ele sabia o que procurava.

Isto é o diferenciador, e é o que justifica o produto existir. Sem ele, no dia em que chegar, o produto é redundante com o Scratch. Não é o que se constrói primeiro: construir primeiro o que se consegue medir (§13.1), e só depois dar-lhe o momento.

---

## 6. As seis linguagens, e o que é realmente partilhado

### 6.1 As duas famílias

| Família | Linguagens | Vocabulário de blocos |
|---|---|---|
| **Imperativa** | Python, Java, Go, TypeScript, JavaScript | `guardar` · `repetir` · `dizer` · `log` |
| **Declarativa** | SQL | `criar_coluna` · `consultar` · `filtrar` · `agrupar` |

As cinco imperativas partilham vocabulário porque partilham estrutura: variáveis, ciclos, impressão. SQL não partilha, e **não é forçada a partilhar**.

### 6.2 O que é partilhado — e é mais pequeno do que se pensava

```
PARTILHADO
  SEMÂNTICA  Valor · Erro (3 classes) · RestriçãoDeTipo · a semântica
             de uma violação de tipo · Trace        nunca vê texto
  MÉTODO     EXPLICAR → FAZER → NOMEAR · sonda = teste · "feito quando viu"
  FORMATO    lição em YAML no Git · registo de projeções · sondas

POR LINGUAGEM
  blocos · emit() · ler() · política · sequência de conceitos
  história de segurança
```

A semântica, o método e o formato é tudo o que se partilha. Os blocos não são invariantes — são **partilhados por família**. E o `ler()` não é partilhado: é onde cada linha é reconhecida, e reconhecer uma linha é o que uma linguagem é. Ver §6.4.

### 6.3 A interface de projeção

```ts
type Language = 'python' | 'java' | 'go' | 'typescript' | 'javascript' | 'sql';

interface Projection {
  language: Language;
  family: 'imperative' | 'declarative';
  blocks: BlockDef[];
  emit(programa: BlocoLeigo): { text: string; annotations: Anotacao[] };
  evaluate(text: string): Erro[];
}
```

Acrescentar uma sétima linguagem é um ficheiro e uma suite de testes dourados. É por isso que esta interface existe e por isso é um deliverable do primeiro corte, não uma promessa.

### 6.4 O que é partilhado na semântica — e o que não pode ser

Isto é a parte que a v2 escreveu mal, e vale a pena ser exato.

Uma linguagem **é** a sua sintaxe. Não há como evitar: para ler `for _ in range(3):` é preciso saber `for _ in range`, e para ler `for i := 0; i < 3; i++` é preciso saber `:=` e `i++`. **São seis maneiras de ler uma linha** — logo são seis front-ends, e isso não é uma opção de desenho, é o que a palavra *linguagem* significa.

O que **é** partilhado, e é substancial:

```
SEMÂNTICA (partilhada, uma vez)
  o que é um número, um texto, um lógico
  o que acontece quando um texto chega a uma ranhura de número
  as três classes de Erro e o texto que cada uma tem de trazer
  o motor de blocos, que produz o Trace

PARSE / EMIT (por linguagem, obrigatoriamente)
  como se lê   uma linha desta linguagem   → eventos tipados
  como se escreve um programa desta linguagem a partir de blocos
```

Isto é o invariante verdadeiro, e é mais preciso do que o da v1 (*"os blocos são a linguagem invariante"*) e mais honesto do que o da primeira v2 (*"a diferença entre as seis não são seis motores de texto"* — **isso é falso**).

A `Policy` continua a ser o que faz a lição variar, mas é a **segunda** diferença, não a única:

```ts
interface Policy {
  recusaNoTipo: boolean;   // java/go/typescript: sim. python/javascript: nunca. sql: sim.
  quando: 'corrida' | 'antes de correr' | 'quando o dado entra';
}
```

`recusaNoTipo` + `quando` decidem **quando** a mesma violação de tipo é reportada. O parse decide **o que** a linha diz. São eixos diferentes: pode haver uma linguagem que recusa ao parse-time e outra que recusa ao run-time com a mesma superfície de sintaxe — e a lição é precisamente essa diferença.

**Custo que esta correcção assume, dito com clareza:** seis front-ends, um por linguagem. Cada um é pequeno — no primeiro conceito, uma declaração de variável, um `print`, um `for`, uma soma — mas são seis, e não se eliminam. Somam-se às seis lições, e por isso o custo de conteúdo da §15 é um piso, não uma estimativa.

### 6.5 A entrada é concreta

*"Que linguagem queres aprender?"* é uma péssima primeira pergunta: uma criança de 10 anos não tem resposta, e um adulto de 40 recebe uma abstração antes de ver nada concreto.

Cada opção do seletor mostra **três linhas reais** daquela linguagem, a fazer uma coisa real. A pessoa responde *"isto?"* em vez de construir uma teoria sobre linguagens de programação. Escolhe por que se importa; a partir daí, é só aquela.

---

## 7. A história de segurança de cada linguagem

A pergunta mais importante em programação não é *como se escreve isto*. É **o que te impede de errar.** É a questão do sistema de tipos, traduzida para quem não sabe o que isso é.

Na v1 isto era uma comparação Python/Java. Na v2 é uma pergunta feita **a cada linguagem, nos termos dela**. Ninguém precisa de ter um ponto de referência — a pergunta não é "isto é mais protegido do que aquilo", é "isto está protegido, e porquê".

| Linguagem | Quem te impede | Quando | O que te custa |
|---|---|---|---|
| **JavaScript** | ninguém | rebenta quando usas o valor | nada — e é a armadilha |
| **Python** | ninguém | rebenta mais tarde, noutra linha | nada — e a linha do sintoma não é a linha da causa |
| **Go** | o compilador | antes de correr, com o tipo inferido do primeiro uso | pouco — não escribes o tipo, mas ele prende |
| **TypeScript** | o compilador | antes de correr | a anotação, se a escreveres |
| **Java** | o compilador | antes de correr | verbosidade: `int total = 0;` |
| **SQL** | **o próprio dado** | quando o dado entra, e para sempre | nada — e é a única proteção que não se desliga nunca |

Cada linha é uma resposta completa. Um aluno de Java não precisa de saber o que é Python para aprender que `int` é armadura. Um aluno de SQL não precisa de saber nada de mais para aprender que a limit está *escrita no dado*.

Isto é o produto: **dar a armadura a quem anda nu há a vida toda.** Se a IA escreve `int total = 0;` sem explicar que o `int` ali é uma armadura, este produto explica-o — a quem escolheu Java.

---

## 8. Arquitetura

```
   blocos ──▶ ① MOTOR INSTRUMENTADO ──▶ Trace de Valores
                 (núcleo puro, agnóstico)        │
                        │                        ├──▶ ③ ROBÔ TIPADO
                        ▼                        │      (recusa + explica)
               ② REGISTO DE PROJEÇÕES           │
                 python  java  go  ts  js  sql  ─┴──▶ ④ PAINEL DE TEXTO
                    │                                (escrever + comparar)
                    ▼                                      │
               ⑤ MOTOR DE SONDAS ◀──────────────────────────┘
                 (perguntas executáveis)
```

Cada unidade tem uma responsabilidade e não conhece os detalhes internos das outras.

### ① Motor instrumentado — o núcleo
Função pura: `programa → Trace`. Não sabe nada de ecrã, de blocos, de robôs, de texto **nem de linguagem**. Cada valor que produz declara o seu tipo, a sua origem (que bloco, que ranhura, quando). Tudo o resto é uma vista deste Trace.

### ② Registo de projeções
Seis implementações de `Projection`. `emit` é o único lugar do sistema que conhece sintaxe. Um teste obriga as cinco linguagens imperativas a declararem o mesmo conjunto de blocos, para que o vocabulário não se disperse.

### ③ Robô tipado
Não faz parte da linguagem. É um **consumidor** com ranhuras tipadas. Existe para tornar os tipos visíveis e para poder dizer não. Um utilizador de 10 anos vê o robô mexer; um adulto vê-o recusar o texto no sítio errado. A mesma cena serve os dois.

### ④ Painel de texto
O utilizador escreve código na linguagem que escolheu. Um verificador de equivalência compara o texto com os blocos e aponta a divergência, linha a linha.

### ⑤ Motor de sondas
Corre uma sonda no mesmo motor instrumentado. Uma sonda é um fragmento de programa + uma pergunta + a observação esperada. **Como corre no mesmo motor, não pode estar errada.**

---

## 9. O modelo de dados central

O Trace é uma lista de `Valor`, e cada `Valor` é a unidade pedagógica do produto:

```
Valor {
  tipo      : número | texto | lógico | lista | função | actor
  valor
  origem    : { bloco, ranhura, instante }
  remédio   : o que fazer em vez disto, nos termos desta linguagem
}
```

E as ranhuras do robô são `RestriçãoDeTipo`. Arrastar um `Valor` de tipo errado para uma ranhura não produz um erro genérico: produz uma **recusa com razão e com saída**.

A v1 punha aqui `proteção: { python, java }` — o que a outra linguagem faria. **Isto foi removido**: §0. Um aluno de Go não sofre por causa do Python. O mesmo modelo serve a execução, as sondas, a projeção de texto e a verificação de equivalência.

### 9.1 Anotação por linha

```
Anotacao {
  linha     : número
  tipo      : Tipo
  porque    : porque é que esta linha existe, nos termos desta linguagem
}
```

Sem comparações entre linguagens. A história de segurança vive no **conteúdo da lição**, por linguagem, não na anotação técnica.

---

## 10. Erros: o produto é o erro

Três classes, e **nenhuma terceira via**:

| Classe | Quando | O que tem de trazer |
|---|---|---|
| `Recusa` | Tipo errado numa ranhura | esperado, recebido, **porque**, e **o que fazer em vez disso** |
| `FalhaRuntime` | O programa fez algo errado | o trace exato que levou lá, e a linha onde morreu |
| `QuebraEquivalência` | O texto do utilizador divergiu dos blocos | a linha, e o que a linha faz de diferente |

> **Regra dura: se uma mensagem aparece sem explicação, é um bug.**

Não existe "erro de sintaxe" em lado nenhum do produto. Não existe modais. Não existe pontuação vermelha sem texto ao lado.

**As três classes não significam o mesmo nas seis linguagens.** Para Python e JavaScript, `Recusa` nunca vem do avaliador de texto — só `FalhaRuntime`, sempre mais tarde. Para Java, Go e TypeScript, `Recusa` vem **antes** de correr. Para SQL, vem do dado, e é permanente. A classe é a mesma; o *quando* é o que a lição ensina.

---

## 11. O modelo de lição: três tempos

A unidade não é a lição. É o **passo**, e um passo tem um objetivo, não uma resposta.

```
EXPLICAR ────▶  FAZER ────▶  NOMEAR
(questão)      (blocos)     (a palavra + a linha real)
```

**1. EXPLICAR** — texto em linguagem de sempre, **zero jargão**, e não dá a resposta: põe a pergunta.
*"Guardar um número e guardar uma palavra — esta linguagem vai deixar-te?"*

**2. FAZER** — blocos, e o sistema obriga a passar pela experiência. A sonda executável entra aqui: é **a máquina que produz o fato que o texto deixou em suspenso**.

**3. NOMEAR** — a palavra aparece. *Isto chama-se **tipo**.* *Isto chama-se **escopo**.* E a linha real da tua linguagem aparece ao lado dos blocos.

Sem o tempo 3 há experiências mas não há palavras — e **palavras são a única coisa que permite ler código que nunca se viu**.

### 11.1 Um passo está feito quando o utilizador *viu*, não quando acertou

> Não há "errado". Há "ainda não viste".

O sistema não valida a resposta — valida se a **observação** aconteceu. Se o utilizador constrói tudo sem nunca tentar meter texto na ranhura, o passo não está feito, e o sistema não diz com um tique: diz *"tenta meter 'olá' aqui"*.

Isto resolve um problema real: em qualquer tutorial aprende-se a satisfazer o tutorial, não a compreender.

Consequência de rigor:
- Os tempos **explicar** e **fazer** não têm resposta errada.
- O único tempo com resposta certa é **nomear**, e é uma pergunta de **vocabulário**, não de lógica.

### 11.2 O formato da sonda

```
sonda {
  id           guardar-palavra-recusa
  pergunta     "porque é que esta linguagem recusa 'olá' aqui?"
  experiencia  o utilizador arrasta 'olá' para a ranhura número
  prova        { forma: programa, programa: <BlocoLeigo> }
  esperado     { classe: Recusa, porque: "..." }   // porque = prosa AUTORAL
}
```

`prova.forma` tem dois valores, porque um bloco imperativo não é um bloco declarativo: `programa` para as cinco linguagens imperativas, **`consulta`** para o SQL. Uma sonda de SQL prova-se com uma consulta. Forçá-la a ser um programa seria a mesma mentira da §6.1, outra vez, mas agora escondida dentro do formato em vez de estar à vista no vocabulário.

O `esperado.classe` é a única coisa comparada com o motor. O `esperado.porque` é texto escrito à mão e **nunca** é comparado com o que o motor diz — é essa separação que torna a sonda um teste robusto em vez de um teste frágil de texto. Se divergir a classe, o build quebra.

Ou seja: **o currículo é verificado pelos seus próprios testes, para sempre.**

> **Distinção que este formato não pode deixar implícita:** a `Recusa` de arrastar um valor para a ranhura do robô acontece **nas seis linguagens**, sem exceção. Não é a mesma coisa que a `Recusa` do avaliador de texto, que em Python e JavaScript nunca chega a existir (§10). A primeira é uma ferramenta de ensino, nossa. A segunda é o comportamento real da linguagem. É a mesma palavra a dizer duas coisas diferentes, e o aluno ouve-as lado a lado — logo o `porque` tem de as distinguir, ou a lição ensina a pessoa a desconfiar da palavra `Recusa`.

### 11.3 Onde o texto vive

Uma lição é um **ficheiro de dados versionado, revisto no Git**. Sem CMS, sem base de dados, sem painel de administração. O conteúdo é código.

```
src/conteudo/
  python/variavel.yml
  java/variavel.yml
  go/variavel.yml
  typescript/variavel.yml
  javascript/variavel.yml
  sql/coluna.yml          ← o primeiro conceito do SQL não é "variável"
```

Um diretório por linguagem. `CARREGAR(texto, linguagem: Language)` devolve a lição de uma só linguagem.

---

## 12. A inversão blocos/texto

O objetivo é ler texto, logo os blocos **desvanecem-se**:

| Momento do percurso | Blocos | Texto |
|---|---|---|
| Início | ~80% | ~20% |
| Meio | ~50% | ~50% |
| Fim | ~20% | ~80% |

Se o percurso não termina a tirar os blocos de cena, o produto falhou.

---

## 13. Âmbito do primeiro corte

**Seis linguagens. Um conceito cada uma. Sem IA.**

| Família | Linguagens | Primeiro conceito |
|---|---|---|
| Imperativa | Python, Java, Go, TypeScript, JavaScript | **variável** (+ tipo) |
| Declarativa | SQL | **coluna** (+ tipo) |

SQL não é forçado a ensinar "variável": ensina **coluna** — um nome que guarda valores, com um tipo declarado que é respeitado para sempre. É a mesma ideia vista do outro lado, e é a lição mais forte de todas.

### 13.1 Teste de aceitação da fatia, por linguagem

> **O utilizador escolhe uma linguagem, abre um ficheiro de 15 linhas dessa linguagem que nunca viu, e diz o que cada linha faz e o que a protege — ou porque é que não a protege.**

Um teste por linguagem, no mesmo formato. Todos têm de passar.

### 13.2 Ordem de construção (por risco, não por dependência)

1. **`Valor` + motor instrumentado.** A parte difícil e em risco. Testável sem ecrã e sem linguagem.
2. **Formato de sonda + motor de sondas.** Porque sem ele não há lição possível. É infraestrutura dispeçada antes de ter conteúdo — é o custo escondido e é o preço da honestidade.
3. **Interface `Projection` + registo.**
4. **Projeção Python** — a primeira, completa.
5. **Projeção Java** — a que **prova a costura**. Uma projeção só não prova nada: constrói-se qualquer coisa monolinguagem e chama-se-lhe invariância. A segunda é que torna a afirmação testável.
6. **Robô tipado.** Barato, e dá retorno imediato.
7. **Painel de texto + verificação de equivalência.**
8. **As seis lições** — o conteúdo.
9. **Ecrã + seletor de linguagem.**

A IA (pilar USAR) e a auditoria (pilar VERIFICAR) ficam de fora, sobre base já provada.

---

## 14. Testes

- O motor é uma função pura `programa → Trace`. Testável sem UI e sem linguagem.
- **Cada sonda é um teste que corre em CI.** O currículo tem uma suite, e são seis currículos.
- **Testes dourados por projeção:** programa em blocos → texto exato de cada uma das seis linguagens, revistos como testes de especificação de uma linguagem.
- As cinco linguagens imperativas têm de declarar o **mesmo conjunto de blocos** — teste que impede o vocabulário de se dispersar.
- Invariante do robô: *nenhuma recusa é renderizada sem razão*. Testado por inspecção de todas as mensagens possíveis.
- O verificador de equivalência tem testes para cada classe de divergência, **e a tolerância de edição não se aplica ao ficheiro exportado**.

---

## 15. Decisões tomadas e os seus custos

| Decisão | Custo aceito | Porque |
|---|---|---|
| **Seis linguagens no primeiro corte** | **Seis lições para autorar, mais seis front-ends de leitura.** Se um passo de sonda levar menos de uma tarde, uma lição é ~1 dia e seis são ~1 semana de escrita | O utilizador escolhe uma vez e fica com ela; entregar uma só seria entregar um produto diferente do que se promete |
| **Seis front-ends, um por linguagem** | Não eliminável com desenho: uma linguagem é a sua sintaxe (§6.4) | Fingir que `Policy` chega seria escrever a spec do que não se constrói. A semântica é que se partilha, e é muito |
| **O utilizador fica só com uma linguagem** | Perde-se a comparação lado a lado | Uma criança de 10 anos não aguenta seis ecrãs. A comparação foi movida para dentro da lição, nos termos de cada linguagem (§7) |
| **Sem cross-references entre linguagens** | A tese fica menos elegante: seis produtos paralelos, não um produto projetado | A versão elegante era falsa. SQL não partilha blocos, e forçá-lo mentia |
| Sondas em vez de prosa | O formato de autoria tem de existir antes do conteúdo | Uma sonda não pode estar errada; um parágrafo pode |
| Um passo sem resposta errada | Não há gamificação de "acertos" | Senão ensina-se a satisfazer o tutorial |
| Texto derivado dos blocos, nunca fonte | Não se pode escrever Python e ver blocos | Bidirecional é a armadilha clássica |
| Conteúdo em ficheiros no Git | Autoria em texto, não visual | Revisão, diff e blame de graça; e sem painel de admin para construir |
| Sem IA no v1 | O momento mais bonito do produto não existe ainda | A parte em risco é a explicação, não a IA |

---

## 16. Riscos

1. **O custo de autoria multiplica-se por seis.** O formato de sonda é mais difícil de inventar do que parece, e agora há seis currículos para alimentar. *Mitigação: autorar a lição de Python primeiro e só depois adaptar as outras, para que a adaptação seja consciente e não um segundo génio. E se autorar um passo não levar menos de uma tarde, o formato está errado — paramos e reescrevemos o formato antes de escrever a segunda lição, não a sexta.*
2. **As seis lições divergem em tom e dificuldade.** Um percurso pode ficar mais duro que outro sem ninguém dar por isso. *Mitigação: a lista de conceitos de cada linguagem é explícita no seu YAML, e um teste afirma que todas cobrem os mesmos conceitos base.*
3. **SQL pode soar parafusado.** Uma linguagem declarativa num produto de blocos imperativos é um salto. *Mitigação: SQL não é forçado a ensinar "variável" — ensina "coluna", que é o seu analogue honesto, e tem o seu próprio vocabulário de blocos em vez de um castanho.*
4. **A camada de explicação é subjetiva e pode soar a sermão.** *Mitigação: o texto põe perguntas, não dá respostas. Se uma criança de 10 anos achar aborrecida a primeira lição, o problema é o tom.*
5. **O texto em blocos pode ser lido como "brincadeira".** *Mitigação: a aceitação da fatia é um ficheiro de texto desconhecido, não um jogo.*

---

## 17. Fora de âmbito (registado para não voltar a discutir)

Linguagens para além das seis · texto→blocos · IA no produto · contas e perfis · CMS · sincronização de progresso · multiplayer · deployment e distribuição · monetização.

## 18. Em aberto

- **Nome.** "Ponte" é provisório.
- **Como é que a pessoa sai daqui com o resultado?** Ficheiro exportável (`.py`, `.java`, `.sql`) ou basta o texto visível no painel? A segunda opção é mais barata e provavelmente chega para o v1. Agora é uma pergunta por linguagem.
- **Som, cor, mascote.** Nenhum foi decidido. Provavelmente irrelevante para a v1.
- **Português apenas?** O percurso é escrito em português, mas as anotações técnicas são linguagem universal. Um projector trivial resolve isto para sempre.
- **Go e TypeScript ficam em que sequência?** TypeScript é o passo natural depois de JavaScript. Go é a mais próxima de Java na disciplina e a mais distante na sintaxe. A ordem dentro de cada percurso — que conceitos vêm a seguir ao primeiro — ainda não foi escrita, e é o maior bloco de trabalho de conteúdo que resta depois das seis lições iniciais.
