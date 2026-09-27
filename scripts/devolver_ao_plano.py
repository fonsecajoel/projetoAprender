#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Devolve um ficheiro ao plano, dentro da tarefa que o criou.

O plano foi escrito **antes** do código, e por isso o que está dentro dos
blocos de cerca dele é o que se *pensava* escrever. Depois de escrever, os dois
já não são o mesmo ficheiro, e o plano passa a ser um documento que descreve um
código que não existe.

Este script volta a pôr o código verdadeiro dentro do bloco certo. A âncora é
uma linha que é só o caminho do ficheiro entre plicas seguido de um bloco de
cerca, e a âncora tem de ser essa e não outra: o caminho de um ficheiro aparece
muitas vezes no plano em prosa, e uma substituição às cegas estraga a prosa.

O que se troca são **linhas**, e a troca é `linhas[:abertura] + corpo +
linhas[fecho:]` — a abertura e o fecho ficam, o meio é que muda. A primeira
versão deste script cortava o texto todo por comprimentos de cadeias de
caracteres e somava o fecho duas vezes, e o resultado foram 27 mil linhas
duplicadas no plano. Um instrumento de texto que opera em bytes em vez de em
linhas é um instrumento que um dia estraga o documento, e o documento é a única
memória do projecto.

Cada ficheiro vai com a **tarefa que o criou**, que não é a tarefa que o tocou
por último. Um ficheiro que a tarefa 3 criou e a tarefa 12 mudou volta para a
tarefa 3, porque é lá que a próxima pessoa vai procurar o que ele é.

    python3 scripts/devolver_ao_plano.py --ficheiro src/ui/Tela.tsx --tarefa 12
"""
import argparse
import io
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLANOS = 'docs/superpowers/plans/2026-09-26-plano-a-motor-costuras-primeira-licao.md'
ANCORA = '`%s`:'


def le(ficheiro):
    with io.open(ficheiro, encoding='utf-8') as fh:
        return fh.read()


def escrever(ficheiro, texto):
    with io.open(ficheiro, 'w', encoding='utf-8') as fh:
        fh.write(texto)


def limites_da_tarefa(plano, numero):
    """`(início, fim)` da secção de uma tarefa, para mexer só lá dentro."""
    ts = [(m.start(), int(m.group(1))) for m in re.finditer(r'^### Task (\d+): ', plano, re.M)]
    for i, (inicio, num) in enumerate(ts):
        if num == numero:
            fim = ts[i + 1][0] if i + 1 < len(ts) else len(plano)
            return inicio, fim
    return None


def cerco(linhas, caminho):
    """`(abertura, fecho)` do bloco que pertence a este ficheiro, em índices
    de linha, ou `None`. `ABERTO` quando a âncora aparece duas vezes."""
    achados = []
    for i, linha in enumerate(linhas):
        if linha.strip() != ANCORA % caminho:
            continue
        j = i + 1
        while j < len(linhas) and linhas[j].strip() == '':
            j += 1
        if j >= len(linhas) or not linhas[j].startswith('```'):
            continue
        for k in range(j + 1, len(linhas)):
            if linhas[k].startswith('```'):
                achados.append((j, k))
                break
    if len(achados) == 1:
        return achados[0]
    if len(achados) > 1:
        return 'AMBIGUO'
    return None


def devolve(plano, caminho, numero):
    limites = limites_da_tarefa(plano, numero)
    if limites is None:
        return 'A TAREFA %d NAO ESTA NO PLANO' % numero
    real = os.path.join(RAIZ, caminho)
    if not os.path.isfile(real):
        return 'O FICHEIRO %s NAO EXISTE' % caminho

    inicio, fim = limites
    linhas = plano[inicio:fim].split('\n')
    achado = cerco(linhas, caminho)
    if achado is None:
        return 'O FICHEIRO %s NAO TEM ANCORA NA TAREFA %d' % (caminho, numero)
    if achado == 'AMBIGUO':
        return 'A ANCORA DE %s APARECE MAIS QUE UMA VEZ NA TAREFA %d' % (caminho, numero)

    abertura, fecho = achado
    corpo = le(real).rstrip('\n').split('\n')
    novas = linhas[: abertura + 1] + corpo + linhas[fecho:]
    return plano[:inicio] + '\n'.join(novas) + plano[fim:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ficheiro', action='append', default=[])
    ap.add_argument('--tarefa', action='append', type=int, default=[])
    ap.add_argument('--plano', default=os.path.join(RAIZ, PLANOS))
    args = ap.parse_args()

    pares = list(zip(args.ficheiro, args.tarefa))
    if not pares:
        print('nada a devolver: falta --ficheiro com --tarefa')
        return 2
    if len(pares) != len(args.ficheiro) or len(pares) != len(args.tarefa):
        print('cada --ficheiro precisa do seu --tarefa')
        return 2

    plano = le(args.plano)
    problemas = 0
    for caminho, numero in pares:
        resultado = devolve(plano, caminho, numero)
        if resultado.startswith(('A TAREFA', 'O FICHEIRO', 'A ANCORA')):
            print('FALHOU  %s' % resultado)
            problemas += 1
        else:
            plano = resultado
            print('ok  %s -> tarefa %d' % (caminho, numero))

    if problemas:
        print('NADA FOI GRAVADO (%d problemas)' % problemas)
        return 1
    escrever(args.plano, plano)
    return 0


if __name__ == '__main__':
    sys.exit(main())
