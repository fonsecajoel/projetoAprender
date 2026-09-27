#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Confere se o plano e o código dizem a mesma coisa.

`devolver_ao_plano.py` diz «ok» mesmo quando não gravou nada — já aconteceu, e
a razão é que um `ok` de quem devolve ficheiros a dizer que gravou é um
`ok` em que não se pode confiar. Este script é a confirmação: procura cada
âncora de ficheiro no plano, lê o bloco de cerca que lhe segue e compara com o
ficheiro de verdade.

A comparação é o conteúdo **sem a linha em branco do fim** e sem
normalizar espaços, porque uma diferença de um espaço dentro de um bloco de
código é uma diferença e não ummal. O que se perde é a linha em branco final
e nada mais.

    python3 scripts/conferir-plano.py
    python3 scripts/conferir-plano.py --plano outro.md
"""
import argparse
import io
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLANOS = 'docs/superpowers/plans/2026-09-26-plano-a-motor-costuras-primeira-licao.md'
ANCORA = re.compile(r'^`([^`]+)`:$', re.M)


def le(ficheiro):
    with io.open(ficheiro, encoding='utf-8') as fh:
        return fh.read()


def tarefas(plano):
    achados = []
    for m in re.finditer(r'^### Task (\d+): (.*)$', plano, re.M):
        achados.append((m.start(), int(m.group(1))))
    achados.append((len(plano), 10 ** 6))
    return achados


def tarefa_de(pos, ts):
    for i, (inicio, num) in enumerate(ts):
        if inicio <= pos < ts[i + 1][0]:
            return num
    return 0


def corpo_do_cerco(linhas, j):
    """O conteúdo do bloco que abre na linha `j`, e a linha de fecho."""
    if j >= len(linhas) or not linhas[j].startswith('```'):
        return None, None
    for k in range(j + 1, len(linhas)):
        if linhas[k].startswith('```'):
            return linhas[j + 1 : k], linhas[k]
    return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--plano', default=os.path.join(RAIZ, PLANOS))
    args = ap.parse_args()

    plano = le(args.plano)
    linhas = plano.split('\n')
    ts = tarefas(plano)

    conferidas = 0
    divergentes = []
    for m in ANCORA.finditer(plano):
        caminho = m.group(1)
        if os.path.splitext(caminho)[1] == '' or not caminho.startswith(('src/', 'scripts/')):
            continue
        j = plano.count('\n', 0, m.end()) + 1
        while j < len(linhas) and linhas[j].strip() == '':
            j += 1
        no_plano, _ = corpo_do_cerco(linhas, j)
        if no_plano is None:
            continue
        caminho_real = os.path.join(RAIZ, caminho)
        if not os.path.isfile(caminho_real):
            divergentes.append((tarefa_de(m.start(), ts), caminho, 'o ficheiro nao existe'))
            continue
        no_disco = le(caminho_real).rstrip('\n').split('\n')
        while no_plano and no_plano[-1].strip() == '':
            no_plano = no_plano[:-1]
        if no_plano != no_disco:
            primeiro = proxima_diferenca(no_plano, no_disco)
            divergentes.append(
                (tarefa_de(m.start(), ts), caminho, 'primeira diferença na linha %d' % (primeiro + 1))
            )
        conferidas += 1

    print('CONFERIDAS: %d' % conferidas)
    if divergentes:
        print('DIVERGENTES: %d' % len(divergentes))
        for tarefa, caminho, porque in divergentes:
            print('  tarefa %-3s %-50s %s' % (tarefa, caminho, porque))
        return 1
    print('DIVERGENTES: nenhum')
    return 0


def proxima_diferenca(a, b):
    for i in range(max(len(a), len(b))):
        if i >= len(a) or i >= len(b) or a[i] != b[i]:
            return i
    return 0


if __name__ == '__main__':
    sys.exit(main())
