# Ponte — blocos para aprender a ler código

*Nome provisório. Especificação de design, 2026-09-26.*

---

## 1. A tese

> **A IA não tornou o conhecimento de programação desnecessário — tornou-o obrigatório.
> Porque já não escreves o código, escreves código que não escreveste, e alguém tem de o ler.**

A consequência prática é que a habilidade a treinar não é *escrever programas*. É **ler programas** e saber o que se está a ler. Isto é mais honesto do que "aprender a programar", e é mais difícil de cumprir.

## 2. Critério de sucesso

Um único critério, que governa todas as decisões:

> **No fim, o utilizador abre um ficheiro de uma linguagem que nunca viu (Java, C++, JavaScript) e consegue segui-lo linha a linha — não executá-lo, não escrevê-lo: segui-lo — e dizer em voz alta porque é que uma das linhas seria recusada.**

Este critério é verificável por qualquer pessoa. Se não se cumprir, o número de blocos, lições e projeções de linguagem é irrelevante.

**Nota de âmbito:** o critério final fala em Java/C++/JavaScript, mas o teste de aceitação do primeiro corte (secção 13.1) é feito em **Python**, porque Python é a única projecção construída nessa fase. O critério descreve o destino; o corte mede um passo em direcção a ele.

## 3. Para quem

Toda a gente que já faz programas e não os percebe: crianças a partir dos ~10 anos, autodidatas adultos, e pessoas que constroem coisas com ferramentas visuais sem saber os fundamentos.

O estado mental de partida é comum a todos — *fazer sem perceber*. O que varia é a profundidade que cada um aguenta. Daí a **escada de profundidade**: o mesmo conceito é encontrado em três níveis, e cada utilizador sobe até onde quer.

| Nível | O que faz | O que o portão pergunta |
|---|---|---|
| 1 | Arrasta o bloco, vê o efeito | "O que mudou?" |
| 2 | Escolhe o tipo certo | "E se guardares texto aqui?" |
| 3 | Escreve a linha real | "Porque é que esta linguagem te obriga a declarar isto?" |

Ninguém é rebaixado e ninguém fica aborrecido: a subida é opt-in.

*Nota para não confundir com a secção 11:* a escada de profundidade é o eixo **utilizador** (até onde cada pessoa sobe dentro do mesmo conceito). Os três tempos de um passo (explicar / fazer / nomear) são o eixo **pedagógico** (a sequência que o passo sempre percorre). São eixos diferentes e não se substituem: o nível 1 da escada ainda passa por todos os três tempos.

## 4. Objectivos e anti-objectivos

**É:**
- Uma camada de explicação que acompanha a construção, não um tutorial à parte.
- Um percurso de conceitos **invariantes** entre linguagens, com **projeções** por linguagem.
- Um produto onde **todo o erro é instrucional**. Não existe erro genérico.
- Um destino em código de texto lido, com os blocos a desvanecer-se ao longo do percurso.

**Não é (decidido, para evitar discussão futura):**
- Não é uma alternativa à IA. É o que faz falta *quando* se usa IA.
- Não é bidireccional no v1: blocos → texto, nunca texto → blocos.
- Não é um editor de blocos genérico. É uma aula com um editor de blocos.
- Não tem CMS, painel de administração, contas, progresso sincronizado, niangéns.
- Não tem IA dentro do produto no v1.

## 5. Pilares

| Pilar | O que é | Estado |
|---|---|---|
| **LER** | Blocos + porque + projecções de linguagem | **v1 — é o que esta spec especifica** |
| **USAR** | A IA presente como aluno: escreve, tu auditas | v2+ |
| **VERIFICAR** | Apanhar o erro que a IA comet | v2+ |

Começa-se pelo LER porque sem conseguir ler, os outros dois não têm em que assentar. Dizer "verifica isto" a quem não consegue ler é frustração.

### 5.1 O momento que o produto existe para tornar possível (v2)

> O utilizador pede a um modelo uma solução. O modelo escreve o programa. O utilizador desmonta-o em blocos e, enquanto o faz, o sistema vai perguntando as perguntas que o modelo não fez. Encontra o bug. O bug era dele, não do modelo — porque ele sabia o que procurava.

Isto é o diferenciador. Sem ele, o produto é redundante com o Scratch.

---

## 6. Conceitos invariantes, projeções de linguagem

O que se ensina é a parte que é **igual** em todas as linguagens:

```
variáveis · tipos · condições · loops · funções · escopo · erros · módulos
```

A sintaxe é completamente diferente entre linguagens. A estrutura é quase idêntica. Daí a regra central:

> **Os blocos são a linguagem invariante. O texto é uma projeção.**

Consequências:
- O percurso, a ordem e as sondas são **idênticos** para toda a gente.
- O que muda com a escolha de linguagem é (a) o painel de texto, (b) as anotações de protecção.
- A escolha de linguagem é a **projecção alvo** e a resposta à pergunta final do percurso ("no que queres acabar a escrever?"). Não é a definição do que se aprende.
- A interface de projecção é um plug-in: `Projection { language, emit(programa): Texto, annotations(): Anotação[] }`. Acrescentar Java ou JavaScript é **aditivo** e não toca no motor.

### 6.1 A pergunta da entrada não pode ser abstrata

"Que linguagem queres aprender?" é uma péssima primeira pergunta: uma criança de 10 anos não tem resposta, e um adulto de 40 recebe uma abstracção antes de ver nada concreto.

A entrada é concreta, com código real à vista: **"Queres acabar a escrever isto?"** — e mostra-se uma fatia real de Python, de Java e de outra. A pessoa responde *"isto?"* em vez de construir uma teoria sobre linguagens de programação.

A escolha define a projecção. A entrada define a primeira lição.

## 7. A "pergunta mais protegida"

A pregunta mais importante que existe em programação é **que código está mais protegido?** — a questão do sistema de tipos, traduzida para quem não sabe o que isso é.

- Numa ranhura de número, porque é que não posso meter texto?
- Em Python nada me impede. Corre. E rebenta três linhas depois, em runtime, num erro que não tem nada a ver com a linha que escrevi.
- Em Java o compilador impede-me **antes de correr**.
- Portanto: o mesmo programa está mais protegido em Java. Acabaste de aprender o que é um sistema de tipos sem nunca ter ouvido a palavra.

Isto é o produto: **dar a armadura a quem anda nu há a vida toda.** Se a IA escreve `int total = 0;` e não conta que o `int` ali é uma armadura, este produto conta.

---

## 8. Arquitectura

```
   blocos ──▶ ① MOTOR INSTRUMENTADO ──▶ Trace de Valores
                 (núcleo puro)                 │
                        │                      ├──▶ ③ ROBÔ TIPADO
                        │                      │      (recusa + explica)
                        ▼                      │
                 ② GERADOR DE PROJECÇÃO ──────┴──▶ ④ PAINEL DE TEXTO
                    (programa → Python)                (escrever + comparar)
                        ▲                                  │
                        └────────── ⑤ MOTOR DE SONDAS ◀────┘
                                     (perguntas executáveis)
```

Cada unidade tem uma responsabilidade e não conhece as internals das outras.

### ① Motor instrumentado — o núcleo
Função pura: `programa → Trace`. Não sabe nada de ecrã, de blocos, de robôs nem de texto. Cada valor que produz declara o seu tipo, a sua origem (que bloco, que ranhura, quando) e o que aconteceria noutra linguagem. Tudo o resto é uma vista deste Trace.

### ② Gerador de projecção
`programa → Texto`. A saída principal **não é o código — são as anotações**. Cada linha gerada vem acompanhada de "isto aqui é a protecção que esta linguagem te obriga a vestir" e do que a outra faria. O código é o subproduto; a preparação é o produto.

### ③ Robô tipado
Não faz parte da linguagem. É um **consumidor** com ranhuras tipadas. Existe para tornar os tipos visíveis e para poder dizer não. Um utilizador de 10 anos vê o robô mexer; um adulto vê-o recusar o texto no sítio errado. A mesma cena serve os dois.

### ④ Painel de texto
O utilizador escreve código. Um verificador de equivalência compara o texto com os blocos e aponta a divergência, linha a linha.

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
  protecção : { python: "...", java: "..." }   // o que acontece em cada uma
}
```

E as ranhuras do robô são `RestriçãoDeTipo`. Arrastar um `Valor` de tipo errado para uma ranhura não produz um erro genérico: produz uma **recusa com razão**.

O mesmo modelo serve a execução, as sondas, a projecção de texto e a verificação de equivalência. É o único lugar onde a semântica do produto vive.

---

## 10. Erros: o produto é o erro

Três classes, e **nenhuma terceira via**:

| Classe | Quando | O que tem de trazer |
|---|---|---|
| `Recusa` | Tipo errado numa ranhura | esperado, recebido, **porque**, e o que Python e Java fariam |
| `FalhaRuntime` | O programa fez algo errado | O trace exacto que levou lá, e a linha onde morreu |
| `QuebraEquivalência` | O texto do utilizador divergiu dos blocos | A linha, e o que a linha faz de diferente |

> **Regra dura: se uma mensagem aparece sem explicação, é um bug.**

Não existe "erro de sintaxe" em lado nenhum do produto. Não existe modais. Não existe pontuação vermelha sem texto ao lado.

---

## 11. O modelo de lição: três tempos

A unidade não é a lição. É o **passo**, e um passo tem um objectivo, não uma resposta.

```
EXPLICAR ────▶  FAZER ────▶  NOMEAR
(questão)      (blocos)     (a palavra + a linha real)
```

**1. EXPLICAR** — texto em linguagem de sempre, **zero jargão**, e não dá a resposta: põe a pergunta.
*"Guardar um número e guardar uma palavra — será que o robô se importa?"*

**2. FAZER** — blocos, e o sistema obriga a passar pela experiência. A sonda executável entra aqui, não como substituto do texto, mas como **a máquina que produz o facto que o texto deixou em suspenso**.

**3. NOMEAR** — a palavra aparece. *Isto chama-se **tipo**.* *Isto chama-se **escopo**.* E a linha real de Python aparece ao lado dos blocos, com a anotação do que o Python obriga a escrever.

Sem o tempo 3 há experiências mas não há palavras — e **palavras são a única coisa que permite ler código que nunca se viu**. É isso que transfere para outra linguagem. Quem passou o tempo 2 sabe que existe uma coisa que impede o robô. Quem passou o tempo 3 sabe o *nome* dessa coisa, e por isso consegue ler `String s = null;` e pensar *"isto não é um número, isto é uma referência, e está vazia"*.

### 11.1 Um passo está feito quando o utilizador *viu*, não quando acertou

> Não há "errado". Há "ainda não viste".

O sistema não valida a resposta — valida se a **observação** aconteceu. Se o utilizador constrói tudo sem nunca tentar meter texto na ranhura, o passo não está feito, e o sistema não diz com um tique: diz *"tenta meter 'olá' aqui"*.

Isto resolve um problema real: em qualquer tutorial aprende-se a satisfazer o tutorial, não a compreender. Aqui não há resposta a satisfazer.

Consequência de rigor, para não transformar o produto num exame:
- Os tempos **explicar** e **fazer** não têm resposta errada.
- O único tempo com resposta certa é **nomear**, e é uma pergunta de **vocabulário**, não de lógica.

Portanto o produto nunca põe "errado" a ninguém sobre a *compreensão* — só sobre a *palavra*.

### 11.2 O formato da sonda

```
sonda {
  pergunta     "porque é que o robô recusa 'olá' nesta ranhura?"
  experiencia  o utilizador arrasta 'olá' para a ranhura número
  esperado     Recusa { esperado: número, recebido: texto, porque: ... }
  anotação     "Python deixa isto passar e rebenta mais tarde. Java não deixa."
}
```

**Uma sonda é um teste.** Corre no mesmo motor e a observação é comparada com a esperada; se divergir, o build quebra. Ou seja: **o currículo é verificado pelos seus próprios testes, para sempre.** Se a semântica de um bloco mudar, o build diz *"a sonda 14 já não produz o que prometia"*.

É isto que torna o approach híbrido (explicações como experiências) superior a explicações escritas por IA: uma sonda é executável, portanto **não pode mentir**. Uma IA pode escrever mil vezes que uma variável é uma caixa, e nenhuma delas parte. Aqui o conteúdo não mente, porque o conteúdo **é** a execução.

### 11.3 Onde o texto vive

Uma lição é um **ficheiro de dados versionado, revisto no Git**. Sem CMS, sem base de dados, sem painel de administração. O conteúdo é código.

Duas camadas de texto por lição:
- o **português que o utilizador lê** (tempos explicar e nomear)
- as **anotações técnicas por linguagem** (protecção, sintaxe real)

Uma sonda de tipo tem três linhas de texto, não um parágrafo. É por isso que a variante "sonda" é mais barata de autoria do que a variante "explicação em prosa".

---

## 12. A inversão blocos/texto

O objectivo é ler texto, logo os blocos **desvanecem-se**:

| Momento do percurso | Blocos | Texto |
|---|---|---|
| Início | ~80% | ~20% |
| Meio | ~50% | ~50% |
| Fim | ~20% | ~80% |

Os blocos são rodas de apoio, não o mobiliário da sala. Se o percurso não termina a tirar os blocos de cena, o produto falhou.

---

## 13. Âmbito do primeiro corte

**Uma lição. Um conceito. Uma linguagem. Sem IA.**

- Lição: **"O que é uma variável"**
- Conceito: variável + tipo
- Linguagem: **Python** (primeira projecção; a interface já é plug-in)
- Blocos + sondas + painel de texto

Se isto não resultar com uma variável, não vai resultar com cinquenta. Por isso é o corte certo.

### 13.1 Teste de aceitação da fatia

> **O utilizador abre um ficheiro Python de 15 linhas que nunca viu, e consegue dizer o que cada linha faz e porque é que uma delas o faria rebentar.**

Se conseguir, o produto funciona. Se não, não interessa quantos blocos existem.

### 13.2 Ordem de construção (por risco, não por dependência)

1. **Modelo de `Valor` e motor instrumentado.** A parte difícil e a que está em risco. Testável sem ecrã.
2. **Formato de sonda + motor de sondas.** A primeira coisa a construir, porque sem ele não há lição possível. É infraestrutura de conteúdo dispeçada antes de ter conteúdo — é o custo escondido e é o preço da honestidade.
3. **Robô tipado.** Barato, e é o que dá retorno imediato.
4. **Gerador de projecção Python + anotações.**
5. **Painel de texto + verificação de equivalência.**
6. **A lição.**

A IA (pilar USAR) e a auditoria (pilar VERIFICAR) ficam de fora, sobre base já provada.

---

## 14. Testes

- O motor é uma função pura `programa → Trace`. Testável sem UI.
- **Cada sonda é um teste que corre em CI.** O currículo tem uma suite.
- O gerador tem testes dourados: programa em blocos → texto Python exacto, revisto como os testes de especificação de uma linguagem.
- Invariante do robô: *nenhuma recusa é renderizada sem razão*. Testado por inspecção de todas as mensagens de erro possíveis.
- O verificador de equivalência tem testes para cada classe de divergência.

---

## 15. Decisões tomadas e os seus custos

| Decisão | Custo aceito | Porque |
|---|---|---|
| Sondas em vez de prosa | O formato de autoria tem de existir antes do conteúdo | Uma sonda não pode estar errada; um parágrafo pode |
| Um passo sem resposta errada | Não há gamificação de "acertos" | Senão ensina-se a satisfazer o tutorial |
| Projecção de texto derivada, nunca fonte | Não se pode escrever Python e ver blocos | Bidireccional é a armadilha clássica; morre aqui |
| Só uma linguagem no v1 | O percurso não prova ainda a invariância | A interface é plug-in; probar a invariância com um conceito só é barato e é a v2 |
| Conteúdo em ficheiros no Git | Autoria em texto, não visual | Revisão, diff e blame de graça; e sem painel de admin para construir |
| Sem IA no v1 | O momento mais bonito do produto não existe ainda | A parte em risco é a explicação, não a IA |

---

## 16. Riscos

1. **O formato de sonda é mais difícil de inventar do que parece.** Se for demasiado difícil de autorar, a produtividade cai e o conteúdo apodrece. *Mitigação: a primeira fatia tem um conceito só; se autorar um passo de tipo não levar menos de uma tarde, o formato está errado e tem de ser reescrito antes de haver mais.*
2. **A layer de explicação é subjectiva e pode soar a sermão.** *Mitigação: o texto põe perguntas, não dá respostas. Se uma criança de 10 anos achar aborrecida a primeira lição, o problema é o tom, não o conteúdo.*
3. **Um conceito só não prova a invariância entre linguagens.** Verdade, e aceite-se. Provar a invariância é explicitamente trabalho da v2.
4. **O texto em blocos pode ser lido como "brincadeira".** *Mitigação: a aceitação da fatia é um ficheiro de texto desconhecido, não um jogo. Mostrar a diferença ao utilizador é parte do produto.*

---

## 17. Fora de âmbito (registado para não voltar a discussar)

Contas e perfis · CMS · sincronização de progresso · multiplayer · Java/C++/JS no v1 · texto→blocos · IA no produto · deployment e distribuição · monetização · o mecanismo de "o utilizador pede à IA e ela escreve" (v2, mas não agora).

---

## 18. Em aberto

- **Nome.** "Ponte" é provisório.
- **Como é que a pessoa sai daqui com o resultado?** Ficheiro .py exportável, ou basta o ficheiro Python visível no painel? A segunda opção é mais barata e provavelmente chega para o v1.
- **Som, cor, mascote.** Nenhum foi decidido. Provavelmente irrelevante para a v1 e relevante para o discurso público.
- **Português apenas?** O percurso é escrito em português, mas as anotações técnicas são linguagem universal. Um projector trivial resolve isto para sempre.
