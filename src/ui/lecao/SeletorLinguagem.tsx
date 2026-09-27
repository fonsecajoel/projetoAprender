import type { Language } from '../../nucleo/tipos';

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
  return (
    <main className="seletor">
      <h1>Qual linguagem queres ler?</h1>
      <p className="seletor-pergunta">
        Escolhe uma. Vais aprender só essa, e a próxima vez que abrires um
        ficheiro dela vais saber o que está a ser lido.
      </p>
      <ul className="seletor-lista">
        {opcoes.map((opcao) => (
          <li key={opcao.linguagem} className="seletor-cartao" data-linguagem={opcao.linguagem}>
            <h2>{opcao.nome}</h2>
            <pre className="seletor-exemplo">{opcao.exemplo.join('\n')}</pre>
            {opcao.pronta ? (
              <button
                type="button"
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
