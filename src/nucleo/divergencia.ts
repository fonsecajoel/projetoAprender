/** Quantos caracteres podem estar errados numa linha sem que a linha conte
 *  como errada.
 *
 *  Calibrada para quem escreve à pressa e troca duas letras, não para quem
 *  reescreve a linha. Três parece o número óbvio e é o número errado: aceita
 *  uma linha que a pessoa meio que sabe reescrever, e recusa o erro que ela
 *  mais comete — uma letra trocada com a vizinha. */
export const TOLERANCIA_EDICAO = 2;

export interface Divergencia {
  /** A linha do **texto da pessoa**, que é a que o painel mostra ao lado. */
  linha: number;
  esperado: string;
  obtido: string;
  porque: string;
  remedio: string;
}

export interface Relatorio {
  ok: boolean;
  divergencias: Divergencia[];
}

/** O texto lido, linha a linha, sem o que a pessoa não quis dizer.
 *
 *  Espaços nas **duas** pontas: quem copia de um painel vê `  a = 1  ` e
 *  escreve-a assim, e a linha é a mesma. Espaços no meio ficam, porque no meio
 *  são o texto — e é a diferença entre o que a pessoa quis dizer e o que a
 *  pessoa escreveu que esta comparação anda a medir. */
export function dividirEmLinhas(texto: string): string[] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** Nomes dos fechos que a linha tem de ter, porque a linguagem lida-os.
 *
 *  Vem da leitura de cada linguagem e não deste ficheiro: em Java a linha
 *  acaba em `;`, em Python não acaba em nada, e em SQL acaba em `;`. Este
 *  ficheiro **não conhece sintaxe** — só sabe que há fechos que não são uma
 *  gralha de escrita, e lê a lista de cima. */
const FECHOS: Record<string, string> = {
  ';': 'ponto-e-vírgula',
  ':': 'dois pontos',
};

/** Distância de edição de Damerau-Levenshtein: como Levenshtein, mas uma
 *  transposição de caracteres adjacentes custa 1 e não 2 — que é o erro que
 *  a tolerância tem de apanhar.
 *
 *  E a transposição é lida da linha de **há duas**, e não da anterior. Ler da
 *  anterior é o erro que esta função teve na primeira versão: `cosntante`
 *  custava 2 em vez de 1, o que não se via porque a tolerância é 2 — e um
 *  teste que passa por uma margem dobrada não está a fixar o que diz que fixa.
 *  Por isso a função guarda duas linhas, e não uma. */
export function distância(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // `haDois` é a linha de há duas iterações e `haUm` a de há uma. No começo
  // `haUm` é a linha zero, que é `0, 1, 2, …, n` — e se `a` for vazia é
  // precisamente a resposta.
  let haDois = Array.from({ length: n + 1 }, (_, j) => j);
  let haUm = haDois;
  for (let i = 1; i <= m; i += 1) {
    const actual = [i];
    for (let j = 1; j <= n; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let melhor = Math.min(
        (haUm[j] ?? Infinity) + 1,
        (actual[j - 1] ?? Infinity) + 1,
        (haUm[j - 1] ?? Infinity) + custo,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        melhor = Math.min(melhor, (haDois[j - 2] ?? Infinity) + 1);
      }
      actual.push(melhor);
    }
    haDois = haUm;
    haUm = actual;
  }
  return haUm[n] ?? Math.max(m, n);
}

interface Desvio {
  porque: string;
  remedio: string;
}

/** O que a **forma** da linha diz, antes de contar caracteres.
 *
 *  Um `;` em falta é uma divergência por si, mesmo estando a distância dentro
 *  da tolerância: é um caractere de diferença, e a tolerância de 2 comia-o.
 *  Perder isso é perder o exemplo mais curto que a lição de Java tem — a
 *  linha que é quase a mesma e mesmo assim está errada.
 *
 *  E o simétrico também conta, porque o mesmo buraco noutro sentido dá a mesma
 *  nota: em Python, um `;` a mais não é uma gralha de escrita, é um sinal que
 *  a linguagem não usa. */
function desvioDeForma(esperado: string, obtido: string): Desvio | null {
  for (const [fecho, nome] of Object.entries(FECHOS)) {
    if (esperado.endsWith(fecho) && !obtido.endsWith(fecho)) {
      return {
        porque: `Esta linha tinha de acabar em ${nome}, e a tua acaba sem.`,
        remedio: `Acrescenta o "${fecho}" no fim da linha.`,
      };
    }
  }
  for (const [fecho, nome] of Object.entries(FECHOS)) {
    if (obtido.endsWith(fecho) && !esperado.endsWith(fecho)) {
      return {
        porque: `A tua linha acaba em ${nome}, e esta não pede esse fecho.`,
        remedio: `Retira o "${fecho}" do fim da linha.`,
      };
    }
  }
  return null;
}

/** O que falta da linha, para o `porque` dizer a coisa certa em vez de "a
 *  linha está errada". */
function desvio(esperado: string, obtido: string): Desvio {
  const forma = desvioDeForma(esperado, obtido);
  if (forma !== null) return forma;
  if (esperado === '') {
    return { porque: 'Sobrou uma linha a mais.', remedio: 'Apaga essa linha.' };
  }
  if (obtido === '') {
    return { porque: 'Esta linha falta.', remedio: 'Escreve a linha que está em cima.' };
  }
  if (esperado.replace(/\s+/g, '') === obtido.replace(/\s+/g, '')) {
    return {
      porque: 'O espaçamento está diferente, e o programa é o mesmo.',
      remedio: 'Iguala o espaçamento.',
    };
  }
  return {
    porque: `Esta linha está escrita de outra maneira. Aqui era: ${esperado}`,
    remedio: `Copia a linha tal como está: ${esperado}`,
  };
}

/** O texto gerado e o texto escrito, linha a linha.
 *
 *  Recebe **texto**, e não o `Gerado` da projeção. A primeira versão recebia o
 *  `Gerado`, que é um tipo de `projecoes/`, e o verificador de árvore
 *  ter-lhe-ia barrado a tarefa: a dependência ia do núcleo para a camada que o
 *  núcleo não pode conhecer. Só que nunca houve problema — o que se compara é
 *  o texto, e as anotações nunca entraram na comparação. A assinatura
 *  estava a pedir mais do que a função usava. */
export function comparar(esperado: string, obtido: string): Relatorio {
  const esperadas = dividirEmLinhas(esperado);
  const obtidas = dividirEmLinhas(obtido);
  const divergencias: Divergencia[] = [];

  const maximo = Math.max(esperadas.length, obtidas.length);
  for (let i = 0; i < maximo; i += 1) {
    const linhaEsperada = esperadas[i] ?? '';
    const linhaObtida = obtidas[i] ?? '';
    if (linhaEsperada === linhaObtida) continue;
    // A forma primeiro, e a distância depois. Ao contrário, um `;` em falta
    // — uma diferença de um caractere — passava por dentro da tolerância e a
    // lição de Java perdia o exemplo mais curto que tem.
    if (desvioDeForma(linhaEsperada, linhaObtida) === null) {
      if (distância(linhaEsperada, linhaObtida) <= TOLERANCIA_EDICAO) continue;
    }
    divergencias.push({
      linha: i + 1,
      esperado: linhaEsperada,
      obtido: linhaObtida,
      ...desvio(linhaEsperada, linhaObtida),
    });
  }

  return { ok: divergencias.length === 0, divergencias };
}
