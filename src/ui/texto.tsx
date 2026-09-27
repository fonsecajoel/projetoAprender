import { useEffect, useRef, useState } from 'react';
import type { Divergencia } from '../nucleo/divergencia';
import { NOMES } from '../nucleo/tipos';
import type { Language } from '../nucleo/tipos';
import './estilo.css';

export interface PainelTextoProps {
  /** A linguagem escolhida no seletor. O painel não a adivinha: é a que o
   *  utilizador escolheu, e o rótulo e o `id` do editor saem daqui. */
  linguagem: Language;
  resposta: string;
  aoComparar: (texto: string) => void;
  divergencias?: Divergencia[];
  semBlocos?: boolean;
  saida?: string[];
  debounceMs?: number;
}

export function PainelTexto({
  linguagem,
  resposta,
  aoComparar,
  divergencias = [],
  semBlocos = false,
  saida = [],
  debounceMs = 250,
}: PainelTextoProps) {
  const id = `codigo-${linguagem}`;
  const [valor, definirValor] = useState(resposta);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A resposta que vem de fora é a do passo: muda de passo, muda o texto do
  // editor.
  //
  // O que impede que a mudança apague o que a pessoa está a escrever é o
  // **array de dependências**, e é só ele. O pai re-renderiza a cada tecla
  // com a mesma `resposta`, e um efeito que dependesse de mais alguma coisa
  // voltaria a pôr o texto de fora por cima do texto que estava a ser
  // escrito. A dependência é por isso só `resposta`, e quem vela por isso é o
  // teste «não limpa o texto quando o painel re-renderiza».
  //
  // Havia aqui um `ref` com a resposta anterior e uma comparação que
  // devolvia cedo quando eram iguais. Tira-se a comparação e os trinta e
  // seis testes ficam verdes: dentro de um efeito cujas dependências são só
  // `resposta`, a comparação é sempre verdadeira ao contrário, porque o
  // efeito só corre quando a resposta mudou. O `ref` custava uma linha e
  // não protegia nada — e o pior de um código que não protege nada é o
  // comentário ao lado a dizer que protege.
  useEffect(() => {
    definirValor(resposta);
  }, [resposta]);

  const aoDigitar = (novo: string): void => {
    definirValor(novo);
    // O intervalo existe para agrupar. Escrever «total = 5» são treze
    // alterações, e sem isto seriam treze execuções do motor e treze
    // respostas a piscar enquanto a pessoa ainda está a meio da terceira
    // letra.
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => aoComparar(novo), debounceMs);
  };

  const executar = (): void => {
    // O botão Executar é um pedido de resposta já, e o temporizador que ficou
    // pendente é o mesmo pedido com atraso. Sem o cancelamento, a pessoa
    // carregava no botão, via o resultado, e dois instantes depois o aviso
    // pendente chegava e corria o mesmo texto outra vez.
    if (temporizador.current) clearTimeout(temporizador.current);
    aoComparar(valor);
  };

  return (
    <section aria-label="Painel de texto" className="painel-texto">
      <label htmlFor={id}>O teu código em {NOMES[linguagem]}</label>
      <textarea
        id={id}
        className="editor-texto"
        rows={10}
        spellCheck={false}
        value={valor}
        onChange={(e) => aoDigitar(e.target.value)}
      />
      <div className="painel-texto-acoes">
        <button type="button" className="btn btn-primario" onClick={executar}>
          Executar
        </button>
        {semBlocos ? (
          <p className="aviso">Sem blocos ao lado, isto só corre o teu texto: ainda não há nada com que comparar.</p>
        ) : null}
      </div>
      {saida.length > 0 ? (
        <pre className="saida" aria-label="Saída do programa">
          {saida.join('\n')}
        </pre>
      ) : null}
      {divergencias.length > 0 ? (
        <ul className="divergencias">
          {divergencias.map((d) => (
            <li key={`${d.linha}-${d.obtido}`}>
              <strong>Linha {d.linha}</strong>
              <p>{d.porque}</p>
              <p>O que o bloco faz: {d.esperado}</p>
              <p>O que o teu texto faz: {d.obtido}</p>
              <p>{d.remedio}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
