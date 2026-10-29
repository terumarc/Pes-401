/**
 * Escudo de la Cani League en pixel art, a juego con los trofeos de la app:
 * tres estrellas, el monograma CL y la punta en oro. Se escala sin suavizar.
 */
export function CaniLeagueCrest({ className, title = "Cani League" }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 25 31"
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      shapeRendering="crispEdges"
      className={className}
    >
      <path fill="#1a1206" d="M3 0h19v1h-19zM1 1h3v1h-3zM21 1h3v1h-3zM0 2h2v1h-2zM23 2h2v1h-2zM0 3h1v1h-1zM24 3h1v1h-1zM0 4h1v1h-1zM24 4h1v1h-1zM0 5h1v1h-1zM24 5h1v1h-1zM0 6h1v1h-1zM24 6h1v1h-1zM0 7h1v1h-1zM24 7h1v1h-1zM0 8h1v1h-1zM24 8h1v1h-1zM0 9h1v1h-1zM24 9h1v1h-1zM0 10h1v1h-1zM24 10h1v1h-1zM0 11h1v1h-1zM24 11h1v1h-1zM0 12h1v1h-1zM24 12h1v1h-1zM0 13h1v1h-1zM24 13h1v1h-1zM0 14h1v1h-1zM24 14h1v1h-1zM0 15h1v1h-1zM24 15h1v1h-1zM0 16h1v1h-1zM24 16h1v1h-1zM0 17h1v1h-1zM24 17h1v1h-1zM0 18h1v1h-1zM24 18h1v1h-1zM0 19h1v1h-1zM24 19h1v1h-1zM0 20h1v1h-1zM24 20h1v1h-1zM0 21h2v1h-2zM23 21h2v1h-2zM1 22h2v1h-2zM22 22h2v1h-2zM2 23h2v1h-2zM21 23h2v1h-2zM3 24h3v1h-3zM19 24h3v1h-3zM5 25h2v1h-2zM18 25h2v1h-2zM6 26h2v1h-2zM17 26h2v1h-2zM7 27h3v1h-3zM15 27h3v1h-3zM9 28h3v1h-3zM13 28h3v1h-3zM11 29h3v1h-3zM12 30h1v1h-1z" />
      <path fill="#c58f2c" d="M5 2h15v1h-15zM3 3h3v1h-3zM19 3h3v1h-3zM2 4h2v1h-2zM21 4h2v1h-2zM2 5h1v1h-1zM22 5h1v1h-1zM2 6h1v1h-1zM22 6h1v1h-1zM2 7h1v1h-1zM22 7h1v1h-1zM2 8h1v1h-1zM22 8h1v1h-1zM2 9h1v1h-1zM22 9h1v1h-1zM2 10h1v1h-1zM22 10h1v1h-1zM2 11h1v1h-1zM22 11h1v1h-1zM2 12h1v1h-1zM22 12h1v1h-1zM2 13h1v1h-1zM22 13h1v1h-1zM2 14h1v1h-1zM22 14h1v1h-1zM2 15h1v1h-1zM22 15h1v1h-1zM2 16h1v1h-1zM22 16h1v1h-1zM2 17h1v1h-1zM22 17h1v1h-1zM2 18h1v1h-1zM22 18h1v1h-1zM2 19h2v1h-2zM21 19h2v1h-2zM3 20h2v1h-2zM20 20h2v1h-2zM4 21h2v1h-2zM19 21h2v1h-2zM5 22h3v1h-3zM17 22h3v1h-3zM7 23h2v1h-2zM16 23h2v1h-2zM8 24h2v1h-2zM15 24h2v1h-2zM9 25h3v1h-3zM13 25h3v1h-3zM11 26h3v1h-3z" />
      <path fill="#f5be46" d="M4 1h17v1h-17zM2 2h3v1h-3zM20 2h3v1h-3zM1 3h2v1h-2zM22 3h2v1h-2zM1 4h1v1h-1zM23 4h1v1h-1zM1 5h1v1h-1zM23 5h1v1h-1zM1 6h1v1h-1zM23 6h1v1h-1zM1 7h1v1h-1zM23 7h1v1h-1zM1 8h1v1h-1zM23 8h1v1h-1zM1 9h1v1h-1zM23 9h1v1h-1zM1 10h1v1h-1zM23 10h1v1h-1zM1 11h1v1h-1zM23 11h1v1h-1zM1 12h1v1h-1zM23 12h1v1h-1zM1 13h1v1h-1zM23 13h1v1h-1zM1 14h1v1h-1zM23 14h1v1h-1zM1 15h1v1h-1zM23 15h1v1h-1zM1 16h1v1h-1zM23 16h1v1h-1zM1 17h1v1h-1zM23 17h1v1h-1zM1 18h1v1h-1zM23 18h1v1h-1zM1 19h1v1h-1zM23 19h1v1h-1zM1 20h2v1h-2zM22 20h2v1h-2zM2 21h2v1h-2zM21 21h2v1h-2zM3 22h2v1h-2zM20 22h2v1h-2zM4 23h3v1h-3zM18 23h3v1h-3zM6 24h2v1h-2zM17 24h2v1h-2zM7 25h2v1h-2zM16 25h2v1h-2zM8 26h3v1h-3zM14 26h3v1h-3zM10 27h5v1h-5zM12 28h1v1h-1z" />
      <path fill="#1a1a1c" d="M4 4h1v1h-1zM3 5h2v1h-2zM3 6h3v1h-3zM3 7h3v1h-3zM3 8h4v1h-4zM3 9h2v1h-2zM3 10h1v1h-1zM3 11h1v1h-1zM3 12h1v1h-1zM7 12h2v1h-2zM3 13h1v1h-1zM7 13h3v1h-3zM3 14h1v1h-1zM7 14h3v1h-3zM3 15h1v1h-1zM7 15h4v1h-4zM3 16h1v1h-1zM7 16h4v1h-4zM3 17h1v1h-1zM11 17h1v1h-1zM3 18h2v1h-2zM4 19h2v1h-2zM12 19h1v1h-1zM5 20h9v1h-9zM6 21h8v1h-8zM8 22h4v1h-4zM13 22h2v1h-2zM9 23h2v1h-2zM14 23h1v1h-1zM10 24h2v1h-2zM13 24h2v1h-2zM12 25h1v1h-1z" />
      <path fill="#232325" d="M6 3h13v1h-13zM5 4h3v1h-3zM9 4h3v1h-3zM13 4h3v1h-3zM17 4h4v1h-4zM5 5h2v1h-2zM10 5h1v1h-1zM14 5h1v1h-1zM18 5h4v1h-4zM6 6h2v1h-2zM9 6h3v1h-3zM13 6h3v1h-3zM17 6h5v1h-5zM6 7h16v1h-16zM7 8h15v1h-15zM11 9h3v1h-3zM16 9h6v1h-6zM12 10h2v1h-2zM17 10h5v1h-5zM12 11h2v1h-2zM17 11h5v1h-5zM9 12h5v1h-5zM17 12h5v1h-5zM10 13h4v1h-4zM17 13h5v1h-5zM10 14h4v1h-4zM17 14h5v1h-5zM11 15h3v1h-3zM17 15h5v1h-5zM11 16h3v1h-3zM17 16h5v1h-5zM12 17h2v1h-2zM21 17h1v1h-1zM12 18h2v1h-2zM13 19h2v1h-2zM14 20h6v1h-6zM14 21h5v1h-5zM15 22h2v1h-2zM15 23h1v1h-1z" />
      <path fill="#0b0b0c" d="M11 10h1v1h-1zM16 10h1v1h-1zM6 11h6v1h-6zM16 11h1v1h-1zM6 12h1v1h-1zM16 12h1v1h-1zM6 13h1v1h-1zM16 13h1v1h-1zM6 14h1v1h-1zM16 14h1v1h-1zM6 15h1v1h-1zM16 15h1v1h-1zM6 16h1v1h-1zM16 16h1v1h-1zM11 18h1v1h-1zM21 18h1v1h-1zM6 19h6v1h-6zM15 19h6v1h-6z" />
      <path fill="#fbf7ee" d="M5 9h6v1h-6zM14 9h2v1h-2zM4 10h7v1h-7zM14 10h2v1h-2zM4 11h2v1h-2zM14 11h2v1h-2zM4 12h2v1h-2zM14 12h2v1h-2zM4 13h2v1h-2zM14 13h2v1h-2zM4 14h2v1h-2zM14 14h2v1h-2zM4 15h2v1h-2zM14 15h2v1h-2zM4 16h2v1h-2zM14 16h2v1h-2zM4 17h7v1h-7zM14 17h7v1h-7zM5 18h6v1h-6zM14 18h7v1h-7z" />
      <path fill="#f5be46" d="M8 4h1v1h-1zM12 4h1v1h-1zM16 4h1v1h-1zM7 5h3v1h-3zM11 5h3v1h-3zM15 5h3v1h-3zM8 6h1v1h-1zM12 6h1v1h-1zM16 6h1v1h-1zM12 22h1v1h-1zM11 23h3v1h-3zM12 24h1v1h-1z" />
    </svg>
  );
}
