#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mede se os testes da aceitação redeem o que dizem.

Um teste que passa não prova nada até se ver ficar vermelho. Cada mutação
abaixo é uma mudança mínima que estraga uma coisa que um teste afirma, e o
que se procura é o ficheiro a ficar vermelho — e a mensagem a dizer o sítio
certo, que é a parte que um `false` não diz.

A T13 é a tarefa que decide se o Plano A existe, e é por isso que a lista
das mutações é quase uma lista das afirmações dos dois ficheiros. Uma
afirmação que não tem mutação é uma afirmação que ninguém mediu.

    python3 scripts/mutar-t13.py            # todas
    python3 scripts/mutar-t13.py --so nome  # só as que têm `nome` no nome
"""
import io
import os
import re
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = 'src/projecoes/python.ts'
SEM = 'src/nucleo/semantica.ts'
REG = 'src/projecoes/registo.ts'
CAR = 'src/conteudo/carregar.ts'
ESQ = 'src/conteudo/esquema.ts'
YML = 'src/conteudo/python/variavel.yml'
DG = 'src/projecoes/dourados.test.ts'
CART = 'src/conteudo/carregar.test.ts'
VAR = 'src/conteudo/python/variavel.test.ts'
PT = 'src/conteudo/portao.test.ts'

# (nome, [(ficheiro, velho, novo), ...], [ficheiros de teste])
MUTACOES = [
    # -------------------------------------------------------------------
    # `dourados.test.ts` — a costura é uma coisa e não uma promessa
    # -------------------------------------------------------------------
    ('a projeção de Python escreve uma linha que o próprio Python recusa',
     [(PY,
       "e.linha(`${nome} = ${literal(entradaDe(b, 'VALOR'))}`, `Guarda ${nome} para o usar mais tarde.`);",
       "e.linha(`${nome} = ${literal(entradaDe(b, 'VALOR'))};`, `Guarda ${nome} para o usar mais tarde.`);")],
     [DG]),

    ('o ficheiro dourado muda um espaço e o teste não vê',
     [(PY,
       "e.linha(`${nome} = ${literal(entradaDe(b, 'VALOR'))}`, `Guarda ${nome} para o usar mais tarde.`);",
       "e.linha(`${nome} =  ${literal(entradaDe(b, 'VALOR'))}`, `Guarda ${nome} para o usar mais tarde.`);")],
     [DG]),

    ('Java deixa de recusar o tipo',
     [(SEM, "  java: { recusaNoTipo: true, quando: 'antes de correr' },",
       "  java: { recusaNoTipo: false, quando: 'ao usar' },")],
     [DG]),

    ('a recusa de Java deixa de dizer quando acontece',
     [(SEM,
       "  'antes de correr': 'A recusa vem antes de o código correr: nem chega a começar.',",
       "  'antes de correr': 'A recusa vem.',")],
     [DG]),

    ('o log deixa de ser recusado em Python',
     [(PY,
       "      if (t.startsWith('log(')) {\n        erros.push(...lerLog(passo).erros);\n        continue;\n      }",
       "      if (t.startsWith('log(')) {\n        continue;\n      }")],
     [DG]),

    ('a mensagem de Python passa a nomear Java',
     [(PY,
       "'Em Python não existe nada que se chame log. A função não existe, e isso só se descobre quando o código corre.'",
       "'Em Java não existe nada que se chame log. A função não existe, e isso só se descobre quando o código corre.'")],
     [DG]),

    ('o registo ganha uma projeção que não existe',
     [(REG,
       "export const REGISTO: Partial<Record<Language, Projection>> = {\n  python,\n  java,\n};",
       "export const REGISTO: Partial<Record<Language, Projection>> = {\n  python,\n  java,\n  go: { ...java, linguagem: 'go' },\n};")],
     [DG]),

    ('Java finge que ler e escrever são a mesma função',
     [(REG,
       "export const REGISTO: Partial<Record<Language, Projection>> = {\n  python,\n  java,\n};",
       "export const REGISTO: Partial<Record<Language, Projection>> = {\n  python,\n  java: { ...java, ler: java.emit },\n};")],
     [DG]),

    ('a lição de Java passa a existir sem existir',
     [(CAR, "  return Object.keys(TEXTOS).some((chave) => chave.startsWith(`${linguagem}/`));",
       "  return LINGUAGENS.includes(linguagem);")],
     [DG]),

    # -------------------------------------------------------------------
    # `portao.test.ts` — os defeitos de conteúdo, pela regra
    # -------------------------------------------------------------------
    ('a ranhura do nome vai para o sítio errado',
     [(YML, '          nome:\n            valor: total', '          NOME:\n            valor: total')],
     [PT]),

    ('uma sondagem passa a chamar-se uma coisa que não falha',
     [(YML, '  - nome: repete-tres-vezes', '  - nome: repete-tres-vezes-sem-valor'),
      (YML, '    sonda: repete-tres-vezes', '    sonda: repete-tres-vezes-sem-valor')],
     [PT]),

    ('uma palavra da pergunta volta a ser resposta',
     [(YML, "        palavras: ['texto', 'palavra', 'string', 'total', 'deixa', 'troca', 'sobrescreve']",
       "        palavras: ['texto', 'palavra', 'string', 'total', 'deixa', 'muda', 'troca', 'sobrescreve']")],
     [PT]),

    ('o ficheiro cresce sem ninguém perguntar',
     [(YML, '        total = total + preco\n', '        total = total + preco\n        total = 1\n')],
     [PT]),

    ('o formato ganha um campo sem ninguém decidir',
     [(ESQ, '  palavras: string[];\n  fonte: Fonte;', '  palavras: string[];\n  linha?: number;\n  fonte: Fonte;'),
      (CAR, "    palavras,\n    fonte: fonte as 'leitura',\n  };\n}",
       "    palavras,\n    linha: 1,\n    fonte: fonte as 'leitura',\n  };\n}")],
     [PT]),

    ('a lista de campos do portão está desatualizada',
     [(PT, "  Momento: ['id', 'texto', 'palavras', 'fonte'],",
       "  Momento: ['id', 'texto', 'palavras', 'fonte', 'linha'],")],
     [PT]),

    ('o portão mede menos sondagens do que a lição tem',
     [(PT, 'expect(licao.sondas.length, chave).toBeGreaterThanOrEqual(6);',
       'expect(licao.sondas.length, chave).toBeGreaterThanOrEqual(9);')],
     [PT]),

    # Uma fase, e não um passo: a lição tem três passos `nomear`, e trocar só
    # um deles não tiraria a fase da lição. A primeira versão desta mutação
    # trocava um e o portão ficou verde — o que é a resposta certa, e é por
    # isso que a mutação é a segunda.
    ('a fase nomear desaparece da lição',
     [(YML, '  - fase: nomear\n    nomear: variável', '  - fase: fazer'),
      (YML, '  - fase: nomear\n    nomear: atribuição', '  - fase: fazer'),
      (YML, '  - fase: nomear\n    nomear: erro de execução', '  - fase: fazer')],
     [PT]),

    ('nenhuma sondagem é sobre uma falha',
     [(YML, '    classe: FalhaRuntime', '    classe: Observacao')],
     [PT]),

    ('a regra da recusa deixa de pedir recusa',
     [(PT, "  return !recusaNoTipo || classes.has('Recusa');", "  return true;")],
     [PT]),

    ('o catálogo diz que há mais linguagens com lição do que há',
     [(PT, '    const escrita = LINGUAGENS.filter((l) => temLicao(l));',
       '    const escrita = LINGUAGENS;')],
     [PT]),

    ('o teste das sondagens passa sem medir',
     [(YML, '    esperado:\n      classe: Observacao\n      porque: >\n        Guarda um número e não dá erro nenhum.',
       '    esperado:\n      classe: FalhaRuntime\n      porque: >\n        Guarda um número e não dá erro nenhum.')],
     [PT]),

    # -------------------------------------------------------------------
    # As três regras que saíram do portão porque o carregador recusa antes
    #
    # A terceira — «cada passo aponta para uma sondagem que existe» — não tem
    # mutação aqui, e é de propósito: a prova dela é sintética, feita com uma
    # lição mínima escrita no próprio teste, e por isso nenhuma mudança no
    # YAML a alcança. Tentar medi-la a partir do ficheiro real seria medir o
    # ficheiro real, que é outra coisa.
    # -------------------------------------------------------------------
    ('a parede do vocabulário é o carregador, e ele ainda mede',
     [(YML, '        type: guardar\n        fields:', '        type: enquanto\n        fields:')],
     [CART]),

    ('a parede das palavras nomeadas é a lição, e ela ainda mede',
     [(YML, '    nomear: variável', '    nomear: xisto')],
     [VAR]),
]



def re_limpa(t):
    return re.sub(r'\x1b\[[0-9;]*m', '', t)


def correr(testes):
    p = subprocess.run(
        ['npx', 'vitest', 'run'] + testes,
        cwd=RAIZ, capture_output=True, text=True,
    )
    return p.returncode, re_limpa(p.stdout + p.stderr)


def guarda(f):
    with io.open(os.path.join(RAIZ, f), encoding='utf-8') as fh:
        return fh.read()


def escreve(f, s):
    with io.open(os.path.join(RAIZ, f), 'w', encoding='utf-8') as fh:
        fh.write(s)


def diagnostico(saida):
    linhas = [
        l.strip() for l in saida.split('\n')
        if 'AssertionError' in l or 'TestingLibrary' in l or 'Error:' in l
        or 'FAIL ' in l
    ]
    return linhas[0][:160] if linhas else '(sem mensagem)'


def main():
    so = None
    if '--so' in sys.argv:
        so = sys.argv[sys.argv.index('--so') + 1]
    todos = [m for m in MUTACOES if so is None or so in m[0]]
    codigo, saida = correr([DG, PT])
    if codigo != 0:
        print('A BASE JA ESTA VERMELHA. Nao mede nada.')
        print(saida[-3000:])
        return 1
    print(f'base: verde ({DG} e {PT})')
    falhas = []
    for nome, trocas, testes in todos:
        # Aplica troca a troca, escrevendo o ficheiro de cada vez: assim duas
        # trocas no mesmo ficheiro veem a segunda a primeira, e o `original`
        # de cada ficheiro basta para desfazer tudo.
        originais = {f: guarda(f) for f, _, _ in trocas}
        aplicadas = 0
        for ficheiro, velho, novo in trocas:
            actual = guarda(ficheiro)
            if velho in actual:
                escreve(ficheiro, actual.replace(velho, novo, 1))
                aplicadas += 1
        if aplicadas != len(trocas):
            for f, t in originais.items():
                escreve(f, t)
            print(f'  ?? {nome}: a troca nao encontrou o texto ({aplicadas}/{len(trocas)})')
            falhas.append(nome)
            continue
        codigo, saida = correr(testes)
        for f, t in originais.items():
            escreve(f, t)
        if codigo == 0:
            print(f'  -- {nome}: VERDE. O teste nao mede esta coisa.')
            falhas.append(nome)
        else:
            print(f'  ++ {nome}: vermelho — {diagnostico(saida)}')
    print()
    if falhas:
        print(f'FALHOU: {len(falhas)} de {len(todos)}')
        return 1
    print(f'TODAS AS {len(todos)} MUTACOES FICARAM VERMELHAS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
