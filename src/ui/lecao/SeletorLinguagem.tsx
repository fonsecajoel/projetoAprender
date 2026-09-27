import type { Language } from '../../nucleo/tipos';
import './seletor.css';

export interface OpcaoLinguagem {
  linguagem: Language;
  nome: string;
  /** Três linhas verdadeiras desta linguagem. Nunca uma descrição. */
  exemplo: string[];
  /** Verdadeiro quando há projeção **e** lição. Calculado, nunca escrito. */
  pronta: boolean;
  /** Quando não está pronta, o que é que falta. Vazio quando está. */
  falta: string;
}

export interface SeletorLinguagemProps {
  opcoes: readonly OpcaoLinguagem[];
  aoEscolher: (linguagem: Language) => void;
}

/** O seletor de linguagem.
 *
 *  Não é um `<select>`, e a razão é de conteúdo e não de estilo: a pergunta
 *  que este ecrã faz ao aluno é «isto?», e um `<option>` não cabe três
 *  linhas de código nem uma frase que explique porque é que não se pode
 *  escolher. São cartões, e cada cartão traz o nome, as três linhas e — quando
 *  não está pronto — a razão.
 *
 *  A opção que não está pronta **não tem botão nenhum**, e não tem um botão
 *  desabilitado. Um botão desabilitado é uma promessa e um beco sem saída: a
 *  pessoa vê ali uma coisa para carregar, carrega, e nada acontece, e não
 *  sabe se foi ela ou o produto. Sem botão, a leitura é a mesma para todos —
 *  a pessoa lê o cartão, lê a razão, e segue em frente. */
export function SeletorLinguagem({ opcoes, aoEscolher }: SeletorLinguagemProps) {
  const prontas = opcoes.filter((o) => o.pronta).length;

  return (
    <main className="seletor">
      <header className="seletor-hero">
        <p className="seletor-marca">Ponte</p>
        <h1>Aprende código lendo o que importa</h1>
        <p className="seletor-pergunta">
          Escolhe uma linguagem. Cada cartão mostra três linhas reais — responde
          «isto?» — e a lição ensina só essa, passo a passo, como num curso
          interativo.
        </p>
        <p className="seletor-contagem">
          {prontas === 0
            ? 'Ainda não há lições prontas.'
            : `${prontas} ${prontas === 1 ? 'curso disponível' : 'cursos disponíveis'} · ${opcoes.length} linguagens no mapa`}
        </p>
      </header>
      <ul className="seletor-lista">
        {opcoes.map((opcao, i) => (
          <li
            key={opcao.linguagem}
            className={`seletor-cartao${opcao.pronta ? ' seletor-cartao-pronto' : ' seletor-cartao-bloqueado'}${opcao.pronta && i === opcoes.findIndex((o) => o.pronta) ? ' seletor-cartao-destaque' : ''}`}
            data-linguagem={opcao.linguagem}
          >
            <div className="seletor-cartao-cabeca">
              <h2>{opcao.nome}</h2>
              {opcao.pronta ? <span className="seletor-etiqueta">Pronto</span> : null}
            </div>
            <pre className="seletor-exemplo" aria-label={`Exemplo em ${opcao.nome}`}>
              {opcao.exemplo.join('\n')}
            </pre>
            {opcao.pronta ? (
              <button
                type="button"
                className="btn btn-primario seletor-cta"
                onClick={() => aoEscolher(opcao.linguagem)}
              >
                {`Começar ${opcao.nome}`}
              </button>
            ) : (
              <p className="seletor-falta">{opcao.falta}</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
