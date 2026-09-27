import * as Blockly from 'blockly';

/** Tema escuro alinhado ao resto do produto — o Blockly de origem parece um
 *  ecrã de outra app no meio da lição. */
export const TEMA_PONTE = Blockly.Theme.defineTheme('ponte', {
  name: 'ponte',
  base: Blockly.Themes.Zelos,
  componentStyles: {
    workspaceBackgroundColour: '#0a0f1f',
    toolboxBackgroundColour: '#121a30',
    toolboxForegroundColour: '#e8edf7',
    flyoutBackgroundColour: '#141b33',
    flyoutForegroundColour: '#e8edf7',
    flyoutOpacity: 0.97,
    scrollbarColour: 'rgba(148, 163, 184, 0.45)',
    insertionMarkerColour: '#3dd68c',
    insertionMarkerOpacity: 0.55,
  },
});

export const OPCOES_PONTE: Blockly.BlocklyOptions = {
  theme: TEMA_PONTE,
  renderer: 'zelos',
  grid: {
    spacing: 24,
    length: 3,
    colour: 'rgba(61, 214, 140, 0.08)',
    snap: true,
  },
  zoom: {
    controls: true,
    wheel: true,
    startScale: 1,
    maxScale: 1.4,
    minScale: 0.75,
  },
  move: {
    scrollbars: true,
    drag: true,
    wheel: true,
  },
};
