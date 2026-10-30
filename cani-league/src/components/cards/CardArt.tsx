/**
 * Dibujos pixelados de las cartas (12×12), en la línea de los trofeos del PES 6.
 * Cada letra es un color de la paleta; el punto es transparente.
 */

const PALETTE: Record<string, string> = {
  k: "#1B1A17",
  w: "#FFFFFF",
  p: "#F2A7B5",
  r: "#C8312B",
  y: "#E8B730",
  s: "#9A958A",
  b: "#7A4A25",
  g: "#2F7A55",
  o: "#E8741C",
};

const ART: Record<string, { label: string; rows: string[] }> = {
  cake: {
    label: "Tarta con manchas rojas",
    rows: [
      ".....yy.....", ".....kk.....", "...kkkkkk...", "...kwwwwk...", "...kpprpk...", ".kkkkkkkkkk.",
      ".kwwwrwwwwk.", ".kpwpwpwpwk.", ".kpppppprpk.", "kkkkkkkkkkkk", "ksssrssssssk", "kkkkkkkkkkkk",
    ],
  },
  briefcase: {
    label: "Maletín",
    rows: [
      "............", "............", "....kkkk....", "....k..k....", ".kkkkkkkkkk.", ".kbbbbbbbbk.",
      ".kbbbbbbbbk.", ".kkkkyykkkk.", ".kbbbyybbbk.", ".kbbbbbbbbk.", ".kkkkkkkkkk.", "..gg....gg..",
    ],
  },
  crown: {
    label: "Corona",
    rows: [
      "............", "............", ".k...kk...k.", ".ky..yy..yk.", ".kyy.yy.yyk.", ".kyyyyyyyyk.",
      ".kyryyyyryk.", ".kyyyyyyyyk.", ".kkkkkkkkkk.", ".kyyyyyyyyk.", ".kkkkkkkkkk.", "............",
    ],
  },
  coffin: {
    label: "Ataúd",
    rows: [
      "....kkkk....", "...kbbbbk...", "..kbbbbbbk..", "..kbbyybbk..", "..kbyyyybk..", "..kbbyybbk..",
      "..kbbyybbk..", "..kbbbbbbk..", "...kbbbbk...", "...kbbbbk...", "....kbbk....", ".....kk.....",
    ],
  },
  bomb: {
    label: "Bomba",
    rows: [
      ".......yy...", "......y..y..", ".....kk.....", "....kkkk....", "..kkkkkkkk..", ".kkkwkkkkkk.",
      ".kkwkkkkkkk.", ".kkkkkkkkkk.", ".kkkkkkkkkk.", "..kkkkkkkk..", "...kkkkkk...", "............",
    ],
  },
  money: {
    label: "Saco de dinero",
    rows: [
      "....kkkk....", ".....kk.....", "....kyyk....", "...kyyyyk...", "..kyyyyyyk..", ".kyyykkyyyk.",
      ".kyykyyyyyk.", ".kyyykkyyyk.", ".kyyyyykyyk.", ".kyyykkyyyk.", "..kyyyyyyk..", "...kkkkkk...",
    ],
  },
  fire: {
    label: "Llamas",
    rows: [
      ".....r......", "....rr......", "....rro.....", "...rroo..r..", "..rrooo.rr..", "..rroyoorr..",
      ".rrooyyoorr.", ".rroyyyyorr.", ".rroyyyyoor.", "..rroyyoor..", "...rroorr...", "....rrrr....",
    ],
  },
  gavel: {
    label: "Mazo de juez",
    rows: [
      "............", "...kkkk.....", "..kbbbbk....", "..kbbbbk....", "..kkkkkk....", "....kk......",
      ".....kk.....", "......kk....", ".......kk...", "........kk..", ".kkkkkk..k..", ".kssssk.....",
    ],
  },
  bus: {
    label: "Autobús",
    rows: [
      "............", "............", ".kkkkkkkkkk.", ".kwwkwwkwwk.", ".kwwkwwkwwk.", ".kkkkkkkkkk.",
      ".koooooooook", ".koooooooook", ".kkkkkkkkkkk", "...kk...kk..", "...kk...kk..", "............",
    ],
  },
  bird: {
    label: "Pájaro",
    rows: [
      "............", "....kkk.....", "...kwwwk....", "...kwkwk....", "..kywwwk....", "...kwwwwk...",
      "...kwwwwwk..", "..kwwwwwwk..", "..kwwwwwk...", "...kkwkk....", "....y.y.....", "............",
    ],
  },
  stadium: {
    label: "Estadio",
    rows: [
      "............", "............", "..k......k..", ".kkk....kkk.", ".kkk....kkk.", "kkkkkkkkkkkk",
      "kwwwwwwwwwwk", "kggggggggggk", "kgggwggwgggk", "kggggggggggk", "kkkkkkkkkkkk", "............",
    ],
  },
  phone: {
    label: "Televisor",
    rows: [
      "..k.....k...", "...k...k....", "....k.k.....", ".kkkkkkkkkk.", ".kssssssskk.", ".kswwwwwskk.",
      ".kswwwwwsrk.", ".kswwwwwskk.", ".ksssssssyk.", ".kkkkkkkkkk.", "..k......k..", "............",
    ],
  },
};

export function CardArt({ icon, size = 96, className }: { icon: string; size?: number; className?: string }) {
  const art = ART[icon] ?? ART.money;
  const cells: { x: number; y: number; c: string }[] = [];
  art.rows.forEach((row, y) => {
    for (let x = 0; x < 12; x++) {
      const c = PALETTE[row[x] ?? "."];
      if (c) cells.push({ x, y, c });
    }
  });
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      role="img"
      aria-label={art.label}
      shapeRendering="crispEdges"
      className={className}
    >
      {cells.map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width={1} height={1} fill={p.c} />
      ))}
    </svg>
  );
}
