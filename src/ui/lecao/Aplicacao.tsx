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

  return (
    <Tela
      linguagem={linguagem}
      licao={CARREGAR(bruto, linguagem)}
      aoTrocarLinguagem={() => definirLinguagem(null)}
    />
  );
}
