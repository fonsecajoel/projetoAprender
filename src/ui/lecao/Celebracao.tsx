import { useEffect, useState, type CSSProperties } from 'react';

/** Partículas leves quando um momento fica completo — feedback que um curso
 *  premium dá sem precisar de bibliotecas. */
export function Celebracao({ activa }: { activa: boolean }) {
  const [onda, definirOnda] = useState(0);

  useEffect(() => {
    if (!activa) return;
    definirOnda((n) => n + 1);
  }, [activa]);

  if (!activa) return null;

  const particulas = Array.from({ length: 14 }, (_, i) => i);

  return (
    <div className="celebracao" key={onda} aria-hidden="true">
      {particulas.map((i) => (
        <span className="celebracao-particula" style={{ '--i': i } as CSSProperties} />
      ))}
    </div>
  );
}
