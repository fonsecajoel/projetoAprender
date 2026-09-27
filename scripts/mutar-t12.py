#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mede se os testes da T12 redeem o que dizem.

Um teste que passa não prova nada até se ver ficar vermelho. Cada mutação
 abaixo é uma mudança mínima que estraga uma coisa que um teste afirma, e
o que se procura é o ficheiro a ficar vermelho — e a mensagem a dizer o
sítío certo, que é a parte que um `false` não diz.
"""
import io
import os
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = 'src/ui/lecao/Tela.tsx'
PV = 'src/ui/lecao/PassoView.tsx'
SV = 'src/ui/lecao/SondasView.tsx'
TESTE = 'src/ui/lecao/tela.test.tsx'

# (nome, ficheiro, [(velho, novo)], ficheiro de teste)
MUTACOES = [
    ('o painel nao carrega o programa do passo',
     PV,
     [('carregar={passo.bloco}', 'carregar={null}')],
     TESTE),

    ('a sondagem deixa de decidir quem viu',
     TL,
     [("if (estado.sonda !== null && observada === estado.sonda.esperado.classe) {\n      estado.observar();\n    }",
       "if (estado.sonda !== null) {\n      estado.observar();\n    }")],
     TESTE),

    ('os erros ficam no passo seguinte',
     TL,
     [("  useEffect(() => {\n    estado.definirErros([]);\n  }, [estado.indicePasso]);",
       "  useEffect(() => {\n    /* nada: os erros pertencem ao programa, nao ao passo */\n  }, [estado.indicePasso]);")],
     TESTE),

    ('revelar deixa de marcar o momento como visto',
     TL,
     [("    estado.observar();\n  }, [estado]);", "    // nada\n  }, [estado]);")],
     TESTE),

    ('a fuga honesta deixa de dizer que foi uma fuga',
     SV,
     [('            Esta resposta foi revelada. Não a descobriste tu, e a lição conta o\n            momento como não-descobrimento.\n', '            \n')],
     TESTE),

    ('o painel vem da fase e nao da fonte',
     PV,
     [("  const fonte = momentoActual?.fonte ?? 'blocos';",
       "  const fonte = passo.fase === 'fazer' ? 'blocos' : (momentoActual?.fonte ?? 'blocos');")],
     TESTE),

    ('a ficha perde a indentacao do ficheiro',
     PV,
     [('            <code>{linha}</code>', '            <code>{linha.trim()}</code>')],
     TESTE),

    ('o veredicto deixa de dizer a classe que o motor deu',
     SV,
     [('? `Agora já viste o que a sondagem queria ver. Isto deu ${observada}.`',
       '? `Agora já viste o que a sondagem queria ver.`')],
     TESTE),

    ('o veredicto mente e diz que viu',
     SV,
     [("? `Agora já viste o que a sondagem queria ver. Isto deu ${observada}.`\n            : `Ainda não. Isto deu ${observada}, e a sondagem estava à procura de ${sonda.esperado.classe}. ${motivo}`}",
       "? `Agora já viste o que a sondagem queria ver. Isto deu ${observada}.`\n            : `Agora já viste o que a sondagem queria ver. Isto deu ${sonda.esperado.classe}.`}")],
     TESTE),

    ('Continuar para no fim do ultimo momento',
     TL,
     [("  const continuar = useCallback(() => {\n    if (estado.momento < estado.totalMomentos - 1) {\n      estado.proximo();\n      return;\n    }\n    estado.proximoPasso();\n  }, [estado]);",
       "  const continuar = useCallback(() => {\n    estado.proximo();\n  }, [estado]);")],
     TESTE),

    ('as divergencias aparecem sempre',
     TL,
     [("definirDivergencias(divergirNaLinguagem(linguagem, estado.passo.bloco, texto).divergencias);",
       "definirDivergencias([{ linha: 1, esperado: '', obtido: '', porque: 'diverge', remedio: '' }]);")],
     TESTE),

    ('a palavra nomeada aparece em todos os passos',
     PV,
     [("{passo.nomear === undefined ? null : <p className=\"passo-palavra\">{passo.nomear}</p>}",
       "<p className=\"passo-palavra\">{passo.nomear ?? 'palavra'}</p>")],
     TESTE),

    ('a ficha aparece em todos os passos',
     PV,
     [("      {fonte === 'leitura' ? (\n        <div className=\"passo-leitura\">\n          {referencia === undefined ? null : <Ficha referencia={referencia} />}",
       "      <Ficha referencia={referencia ?? { nome: 'x.txt', linhas: ['a = 1'] }} />\n      {fonte === 'leitura' ? (\n        <div className=\"passo-leitura\">")],
     TESTE),

    ('o editor abre vazio',
     PV,
     [("          resposta={textoInicial}", "          resposta=\"\"")],
     TESTE),

    ('o ecra mostra a razao de outro passo',
     PV,
     [('<p className="passo-porque">{passo.porque.trim()}</p>',
       '<p className="passo-porque">{\'uma frase que nenhum passo desta licao tem\'}</p>')],
     TESTE),
]

def correr(teste):
    p = subprocess.run(
        ['npx', 'vitest', 'run', teste],
        cwd=RAIZ, capture_output=True, text=True,
    )
    saida = re_limpa(p.stdout + p.stderr)
    return p.returncode, saida


def re_limpa(t):
    import re
    return re.sub(r'\x1b\[[0-9;]*m', '', t)


def guarda(f):
    with io.open(os.path.join(RAIZ, f), encoding='utf-8') as fh:
        return fh.read()


def escreve(f, s):
    with io.open(os.path.join(RAIZ, f), 'w', encoding='utf-8') as fh:
        fh.write(s)


def main():
    so = '--so' in sys.argv
    codigo, saida = correr(TESTE)
    if codigo != 0:
        print('A BASE JA ESTA VERMELHA. Nao mede nada.')
        print(saida[-3000:])
        return 1
    print(f'base: verde ({TESTE})')
    falhas = []
    for nome, ficheiro, trocas, teste in MUTACOES:
        if so and so not in nome:
            continue
        original = guarda(ficheiro)
        s = original
        aplicadas = 0
        for velho, novo in trocas:
            if velho in s:
                s = s.replace(velho, novo, 1)
                aplicadas += 1
            else:
                # a mutação é escrita como estava com o código real
                velho2 = velho
                novo2 = novo
                if velho2 in s:
                    s = s.replace(velho2, novo2, 1)
                    aplicadas += 1
        if aplicadas != len(trocas):
            escreve(ficheiro, original)
            print(f'  ?? {nome}: a troca nao encontrou o texto ({aplicadas}/{len(trocas)})')
            falhas.append(nome)
            continue
        escreve(ficheiro, s)
        codigo, saida = correr(teste)
        escreve(ficheiro, original)
        if codigo == 0:
            print(f'  -- {nome}: VERDE. O teste nao mede esta coisa.')
            falhas.append(nome)
        else:
            linhas = [l for l in saida.split('\n') if 'AssertionError' in l or 'TestingLibrary' in l or 'Error:' in l]
            primeiro = linhas[0].strip()[:150] if linhas else '(sem mensagem)'
            print(f'  ++ {nome}: vermelho — {primeiro}')
    print()
    if falhas:
        print(f'FALHOU: {len(falhas)} de {len(MUTACOES)}')
        return 1
    print(f'TODAS AS {len(MUTACOES)} MUTACOES FICARAM VERMELHAS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
