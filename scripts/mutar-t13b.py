#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""As mutações do portão manual.

Um ficheiro de testes que nunca foi mutado é um ficheiro de testes que ninguém
sabe o que mede. Cada mutação abaixo muda uma coisa no produto — ou na
lição — e tem de pôr o portão a vermelho. Se ficar verde, a afirmação que a
mutação ataca não está a ser medida por este ficheiro e sim por outro.

Uma mutação que não compila não é um diagnóstico: é um erro de escrita. Por
isso cada uma delas é uma troca que compila, e o script diz qual é o ficheiro
e o número para o erro se ler ao lado.

    python3 scripts/mutar-t13b.py
"""
import io
import os
import re
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESTE = 'src/ui/lecao/portao-manual.test.tsx'
LICAO = 'src/conteudo/python/variavel.yml'

# (nome, ficheiro, o que se procura, o que se põe no lugar)
MUTACOES = [
    (
        'a ficha passa a ter dezassete linhas',
        LICAO,
        "      texto: |\n        total = 5\n        preco = 3\n",
        "      texto: |\n        total = 5\n        preco = 3\n        nome = 'olá'\n",
    ),
    (
        'o ficheiro deixa de morrer na linha 12',
        LICAO,
        "        print(preco)\n        total = 'olá'\n        print(total)\n        log(total)\n",
        "        print(preco)\n        total = 'olá'\n        print(total)\n        print(total)\n",
    ),
    (
        'a ficha passa a oferecer «Correr o programa»',
        'src/ui/lecao/PassoView.tsx',
        "      {fonte === 'blocos' ? (",
        "      {fonte === 'leitura' ? (\n        <button type=\"button\" onClick={aoCorrer}>\n          Correr o programa\n        </button>\n      ) : null}\n\n      {fonte === 'blocos' ? (",
    ),
    (
        'o painel de texto deixa de dizer que a linha acaba em ponto-e-vírgula',
        'src/nucleo/divergencia.ts',
        "    if (desvioDeForma(linhaEsperada, linhaObtida) === null) {",
        "    if (true) {",
    ),
    (
        'a comparação passa a aceitar qualquer linha',
        'src/nucleo/divergencia.ts',
        "    if (linhaEsperada === linhaObtida) continue;",
        "    if (true) continue;",
    ),
    # A âncora tem de apanhar `${ev.nome}` e não só a frase depois dele. A
    # primeira versão começava em `guarda ${guardado.tipo}` e o nome ficava
    # intacto do lado esquerdo: a mutação corria, o teste ficava verde, e o
    # script dizia que o teste não provava nada — quando o que não provava
    # nada era a mutação.
    (
        'o motor deixa de nomear a variável que está mal',
        'src/nucleo/semantica.ts',
        '${ev.nome} guarda ${guardado.tipo}, e este sítio precisa de ${ev.tipoValor}',
        'um sítio guarda texto, e este sítio precisa de número',
    ),
    (
        'o motor deixa de nomear a variável também no remedio',
        'src/nucleo/semantica.ts',
        'Guarda ${ev.nome} como ${ev.tipoValor}.',
        'Guarda o valor como ${ev.tipoValor}.',
    ),
    (
        'o motor passa a recuar para a linha em vez do nome',
        'src/nucleo/semantica.ts',
        '${ev.nome} guarda ${guardado.tipo}',
        'a linha ${ev.passo} guarda ${guardado.tipo}',
    ),
    (
        'o painel de Java deixa de escrever o tipo',
        'src/projecoes/java.ts',
        "Number.isInteger(entrada) ? 'int' : 'double'",
        "Number.isInteger(entrada) ? '' : 'double'",
    ),
    (
        'a recusa dos blocos deixa de dizer o tecto',
        'src/nucleo/avaliador.ts',
        'números de ${RANGE_INTEIROS} para baixo',
        'números de ${RANGE_INTEIROS}',
    ),
    (
        'a recusa dos blocos passa a dizer o nome de uma linguagem',
        'src/nucleo/avaliador.ts',
        'deixa de usar números tão grandes',
        'deixa de usar números tão grandes em Python',
    ),
    (
        'a ficha deixa de fazer uma pergunta por linha',
        LICAO,
        "      - id: l13\n",
        "      - id: lX\n",
    ),
]


def le(ficheiro):
    with io.open(os.path.join(RAIZ, ficheiro), encoding='utf-8') as fh:
        return fh.read()


def escreve(ficheiro, texto):
    with io.open(os.path.join(RAIZ, ficheiro), 'w', encoding='utf-8') as fh:
        fh.write(texto)


def corre(teste):
    return subprocess.run(
        ['npx', 'vitest', 'run', teste],
        cwd=RAIZ,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
    ).stdout


ANSI = re.compile(r'\x1b\[[0-9;]*m')


def corrido(saida):
    """A saída sem as cores.

    O Vitest escreve os números com um `\x1b[` entre a palavra e o número, e
    uma expressão regular escrita para a saída limpa não apanha nada na saída
    que sai. Uma mutação que passa sem correr parece uma mutação que
    sobreviveu, e as duas coisas são coisas muito diferentes.
    """
    return ANSI.sub('', saida)


def vermelho(saida):
    limpo = corrido(saida)
    return re.search(r'Tests\s+.*\bfailed\b', limpo) is not None


def main():
    guardar = {f: le(f) for f in {m[1] for m in MUTACOES}}
    survived = []
    try:
        for nome, ficheiro, velho, novo in MUTACOES:
            texto = le(ficheiro)
            if velho not in texto:
                print('NAO ENCONTRADO  %s (procurava em %s)' % (nome, ficheiro))
                survived.append(nome)
                continue
            escreve(ficheiro, texto.replace(velho, novo, 1))
            saida = corre(TESTE)
            if vermelho(saida):
                print('APANHADA   %s' % nome)
            else:
                print('SOBREVIVEU  %s' % nome)
                survived.append(nome)
            escreve(ficheiro, guardar[ficheiro])
    finally:
        for ficheiro, texto in guardar.items():
            escreve(ficheiro, texto)

    print('')
    if survived:
        print('MUTACOES QUE SOBREVIVERAM (%d):' % len(survived))
        for nome in survived:
            print('  %s' % nome)
        return 1
    print('TODAS AS %d MUTACOES FICARAM VERMELHAS' % len(MUTACOES))
    return 0


if __name__ == '__main__':
    sys.exit(main())
