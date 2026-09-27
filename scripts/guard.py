#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""O guarda de escrita.

Quatro regras, e as quatro existem porque nenhuma delas é apanhada pelo `tsc`
nem pelo `vitest`: o que elas vigiam é texto, e o texto é a única coisa deste
produto que não compila.

  1. **Nada de caracteres de outra escrita.** Chinês, japonês, coreano, cirílico
     e grego, em qualquer ficheiro e dentro de código. Não há nenhum motivo
     para um destes aparecer num ficheiro de TypeScript, e cada vez que
     apareceu foi um engano ao escrever depressa.
  2. **Grafia de antes de 1990.** O produto é para quem tem menos de trinta
     anos, e «facto» é a palavra do avô.
  3. **Palavras sem o acento que lhes pertence.** A prosa deste repositório
     é acentuada, e uma palavra que perdeu o acento é a palavra de outra
     pessoa que passou por aqui. `projecao` é `projeção`; `projecão` é
     `projeção` duas vezes.
  4. **Inglês na prosa.** As palavras de um ecrã são da pessoa que o lê, e um
     ecrã em inglês é um produto para outra pessoa.

  As três últimas valem na **prosa**, e a prosa é uma coisa concreta: os
  ficheiros de Markdown e de YAML por inteiro, e nos ficheiros de código
  apenas as linhas de comentário. Abrange o código e o guarda grita em cada
  linha de TypeScript — `const`, `return`, `string` — e um guarda que grita
  onde não há nada é um guarda a que se deixa de dar ouvido. O mesmo vale
  para a regra dois: `facto` dentro de `const facto = 1` é um nome, e não uma
  grafia antiga.
  5. **A prosa que está dentro de um literal.** A pessoa lê o que está nas
     cadeias de caracteres, e as mensagens de erro deste produto são todas
     cadeias de caracteres. As quatro regras acima só viam comentários e
     Markdown, que é onde a documentação vive — e a documentação é o que a
     pessoa que escreve o produto lê, não o que a pessoa que usa o produto lê.

  A quinta regra é a que tem uma medição por trás, e a medição é que a fez
  passar. Em `src/` há 880 cadeias de caracteres com quatro ou mais palavras, e
  a regra apontava para **três** — e as três eram falsos positivos meus: duas
  vezes `directamente`, que nunca foi grafia de antes de 1990 (o que mudou foi
  `directo` para `direto`, e o advérbio nunca teve o `c` para tirar), e uma
  amostra de SQL. Zero em trezentos e setenta e nove é o que faz uma regra
  valer a pena: uma regra que grita trezentas vezes onde não há nada é uma
  regra a que se deixa de dar ouvido, e a quinta regra quase não existia.

  Duas excepções estreitas, e estreitas mesmo. Um selector de elemento em
  CSS (`input {`) é o nome que o CSS impõe, não uma escolha. E este ficheiro
  é a lista: uma lista de palavras proibidas tem de as ter escritas, por isso
  as três regras de listas saltam-no — menos a primeira, que não é uma lista
  e por isso pode vigilar-se a si mesma, que é onde os enganos acontecem.

    python3 guard.py                  # o repositório de baixo
    python3 guard.py ficheiro [...]   # só estes
"""
import io
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
O_GUARDA = os.path.abspath(__file__)
EXTENSOES = {'.ts', '.tsx', '.py', '.yml', '.yaml', '.css', '.md', '.html'}

# 1. Nenhuma lista: é a única regra que este ficheiro não se poupa.
OUTRA_ESCRITA = re.compile(
    r'[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff'
    r'\uac00-\ud7af\u0400-\u04ff\u0370-\u03ff]'
)

# 2. De antes de 1990. A lista é curta porque cada palavra entrou depois de
#    aparecer num ficheiro: uma lista de quarenta palavras que ninguém reviu
#    é uma lista em que ninguém confia.
ANTES_1990 = [
    'aspecto', 'contacto', 'correctamente', 'correcto',
    'directo', 'efectivo', 'exactamente', 'exacta', 'exacto', 'excepto',
    'facto', 'objectiva', 'objecto', 'respectivo', 'selectivo',
]

# 3. Palavras que aqui são `projeção`, `função` e `lição`. A segunda e a
#    terceira entram por serem o mesmo estrago noutros pares de caracteres.
SEM_ACENTO_OU_CORROMPIDO = ['projecao', 'projecão', 'funçao', 'liçao']

# 4. Palavras de inglês que apareceram em prosa por engano. As de
#    programação ficaram de fora de propósito: `return` e `state` aparecem em
#    nomes que são da linguagem, e a lista tem de ser das que não podem.
INGLES = [
    'the', 'and', 'with', 'from', 'this', 'that', 'have', 'your', 'you',
    'user', 'users', 'click', 'handler', 'listener', 'render', 'props',
    'callback', 'payload', 'provider', 'consumer', 'component', 'testID',
    'debugger', 'console', 'warning', 'should', 'must', 'will', 'would',
    'when', 'then', 'than', 'about', 'there', 'these', 'those', 'which',
]
NOMES_IMPOSTOS = {'input', 'output', 'utils', 'screen', 'container'}

# O que conta como prosa, por extensão.
PROSA_INTEIRA = {'.md', '.yml', '.yaml'}
COMENTARIO = re.compile(r'^\s*(//|/\*|\*|#|--)')
SELECTOR_CSS = re.compile(r'^\s*[a-z][a-z0-9]*\s*[,{]')
NEGRITO_CODIGO = re.compile(r'```.*?```|`[^`]*`', re.S)
BLOCO_CDIGO_MD = re.compile(r'(?:^ {4,}.*$\n?)+', re.M)
TEXTO_HTML = re.compile(r'>([^<>]+)<')

# O diário da SDD é a única coisa deste repositório escrita **sem acentos**,
# e é uma escolha e não um esquecimento: é o registo do que se foi fazendo
# enquanto se fazia, e acentá-lo a meio seria mexer no passado. A regra dos
# acentos não se aplica lá — as outras três continuam a aplicar-se, e sem esta
# excepção o `projecao` sem acento das linhas do diário seria um guarda a
# gritar onde não há nada.
DIARIO = os.path.join('.superpowers', 'sdd')

# Regra 5: a prosa dentro de um literal. O que separa uma **frase** de um
# identificador, de um caminho e de uma amostra de código são dois sinais que
# andam juntos — pelo menos quatro palavras, e nenhum destes símbolos:
#
#   `=`      uma atribuição, uma comparação, o nome de um campo de um literal
#   `;`      o fim de uma linha de código, e a amostra de SQL mais óbvia
#   `(` `)`  uma chamada, e portanto código
#   `{{`     um pedaço de Blockly, e portanto um identificador com pontos
#
# O `SELECT total FROM vendas;` é o caso que motivou o `;`: é uma frase de
# cinco palavras em inglês, e o `;` é a única coisa que diz que é código. Um
# guarda que visse a frase sem ver o `;` gritava por causa de uma amostra de
# SQL que alguém quis mostrar à pessoa.
LITERAL = re.compile(r"'([^'\\\n]{12,})'|`([^`\\]{12,})`")
NAO_E_FRASE = re.compile(r'[;=(){}]|\{\{|\}\}|=>|::|^\s*[.#]')


def sem_codigo(texto):
    """O mesmo texto sem os blocos e as palavras entre plicas invertidas."""
    return NEGRITO_CODIGO.sub(' ', texto)


def sem_codigo_md(texto):
    """O Markdown tem dois tipos de bloco de código: o de cerca e o
    indentado. Os planos antigos são escritos com o segundo, e sem esta
    regra cada `import` de um plano conta como uma palavra de inglês na
    prosa — que é uma regra a gritar trezentas vezes onde não há nada."""
    return sem_codigo(BLOCO_CDIGO_MD.sub('\n', texto))


def prosa(caminho, linha):
    """A linha é prosa?"""
    ext = os.path.splitext(caminho)[1]
    if ext in PROSA_INTEIRA:
        return True
    if ext == '.html':
        return TEXTO_HTML.search(linha) is not None
    return COMENTARIO.match(linha) is not None


def semComentarios(texto):
    """O mesmo texto sem os comentários de linha e de bloco.

  A regra 5 lê os literais, e um literal escrito dentro de um comentário não é
  prosa que a pessoa lê: é prosa sobre a prosa. Sem esta limpeza, o ficheiro
  que explica a tentação de importar uma projeção seria vigiado por cada
  menção que faz — e o que se quer é o contrário. O `(^|[^:])` existe para
  não partir o `https://` das URL.
  """
    return re.sub(r'/\*[\s\S]*?\*/', '', re.sub(r'(^|[^:])//.*$', r'\1', texto, flags=re.M))


def regra_das_palavras(limpa, caminho, regista, n, linha):
    """As três regras de palavras, sobre um texto que já se sabe ser prosa.

  O `limpa` já não tem código, e o `baixo` é a forma dobrada para o casamento
  não depender das maiusculas. A mesma função serve a prosa e os literais,
  porque é a **mesma** regra: uma frase é uma frase, e escrevê-la dentro de
  um literal não a torna menos uma frase.
  """
    baixo = limpa.lower()

    for palavra in ANTES_1990:
        if re.search(r'\b' + re.escape(palavra) + r'\b', baixo):
            regista(n, 'grafia de antes de 1990 %r' % palavra, linha)

    if DIARIO not in caminho:
        for palavra in SEM_ACENTO_OU_CORROMPIDO:
            if re.search(r'\b' + re.escape(palavra), baixo):
                regista(n, 'palavra sem o acento que lhe pertence %r' % palavra, linha)

    for palavra in INGLES:
        # Um nome imposto continua a ser nome quando está a ser usado como
        # nome: `.input` e `o input` não são a mesma coisa, e só o segundo é
        # uma palavra inglesa dentro de uma frase.
        if palavra in NOMES_IMPOSTOS:
            continue
        if re.search(r'\b' + re.escape(palavra) + r'\b', limpa):
            regista(n, 'palavra de ingles %r' % palavra, linha)


def verifica(caminho, falhas):
    with io.open(caminho, encoding='utf-8') as fh:
        bruto = fh.read()
    sou_o_guarda = os.path.abspath(caminho) == O_GUARDA
    linhas = list(enumerate(bruto.split('\n'), 1))

    def regista(n, regra, linha):
        falhas.append((caminho, n, regra, linha.strip()[:120]))

    # 1. Outra escrita, em todo o ficheiro.
    for n, linha in linhas:
        achado = OUTRA_ESCRITA.search(linha)
        if achado is not None:
            regista(n, 'caractere de outra escrita %r' % achado.group(0), linha)

    if sou_o_guarda:
        return

    # 2, 3 e 4, na prosa.
    lista = linhas
    if caminho.endswith('.md'):
        # O bloco de código indentado desaparece, e com ele a contagem das
        # linhas deixa de bater à conta — e uma linha de código que o guarda
        # já não vê é uma linha que não está no ficheiro. A conta é feita
        # sobre o texto de antes, com o bloco posto a zero.
        bruto_limpo = sem_codigo_md(bruto)
        lista = list(enumerate(bruto_limpo.split('\n'), 1))

    for n, linha in lista:
        if not prosa(caminho, linha):
            continue
        limpa = sem_codigo(linha)
        if caminho.endswith('.css') and SELECTOR_CSS.match(limpa):
            limpa = ''
        regra_das_palavras(limpa, caminho, regista, n, linha)

    # 5. A prosa dentro de um literal. Só em ficheiros de código, porque um
    #    ficheiro de YAML e um de Markdown já são prosa de ponta a ponta e não
    #    têm literais: lá a regra 5 é a regra 2, e tê-la duas vezes seria
    #    contar a mesma frase duas vezes.
    if os.path.splitext(caminho)[1] in ('.ts', '.tsx'):
        sem_comentarios = semComentarios(bruto)
        for achado in LITERAL.finditer(sem_comentarios):
            texto = (achado.group(1) or achado.group(2)).strip()
            if len(texto.split()) < 4 or NAO_E_FRASE.search(texto):
                continue
            n = sem_comentarios.count('\n', 0, achado.start()) + 1
            regra_das_palavras(texto, caminho, regista, n, texto)


def recolhe(alvo):
    if os.path.isfile(alvo):
        return [alvo]
    achados = []
    for raiz, pastas, ficheiros in os.walk(alvo):
        pastas[:] = [p for p in pastas if p not in {'node_modules', '.git', 'dist', '.worktrees'}]
        for f in ficheiros:
            if os.path.splitext(f)[1] in EXTENSOES:
                achados.append(os.path.join(raiz, f))
    return sorted(achados)


def main():
    alvos = sys.argv[1:] or [RAIZ]
    ficheiros = []
    for alvo in alvos:
        ficheiros.extend(recolhe(alvo))
    falhas = []
    for f in sorted(set(ficheiros)):
        verifica(f, falhas)
    for caminho, n, regra, linha in falhas:
        print('%s:%d: %s :: %s' % (caminho, n, regra, linha))
    if falhas:
        print('GUARD: FALHOU (%d)' % len(falhas))
        return 1
    print('GUARD: limpo')
    return 0


if __name__ == '__main__':
    sys.exit(main())
