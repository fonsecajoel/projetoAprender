/// <reference types="vite/client" />

declare module '*.yml?raw' {
  const conteudo: string;
  export default conteudo;
}
