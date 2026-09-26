import '@testing-library/jest-dom/vitest';

class ObservadorFalso {
  observar(): void {}
  desconectar(): void {}
  desenhar(): void {}
  unobserve(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ObservadorFalso;
}

// O Blockly chama `getBBox` para medir o texto de um bloco. O jsdom não o
// implementa — e a lib `DOM` do TypeScript também não o põe em
// `SVGElement`, põe-no em `SVGGraphicsElement`. Por isso o guarda tem de
// procurar o protótipo em runtime e o tipo tem de ser declarado à mão:
// nenhuma das duas coisas se resolve sozinha.
type Medivel = { getBBox?: () => DOMRect };

const prototipoSVG = (typeof SVGGraphicsElement !== 'undefined'
  ? SVGGraphicsElement.prototype
  : SVGElement.prototype) as unknown as Medivel;

if (typeof SVGElement !== 'undefined' && !prototipoSVG.getBBox) {
  prototipoSVG.getBBox = function getBBox() {
    return { x: 0, y: 0, width: 100, height: 20 } as DOMRect;
  };
}
