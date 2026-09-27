import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Aplicacao } from './ui/lecao/Aplicacao';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('o index.html precisa de #raiz');
createRoot(raiz).render(
  <StrictMode>
    <Aplicacao />
  </StrictMode>,
);
