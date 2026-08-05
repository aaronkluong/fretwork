// String indices: 0 = string_1 (high e), 5 = string_6 (low E)
// Display order top-to-bottom: string_1 (e) → string_6 (E)
const STRING_LABELS = ["e", "B", "G", "D", "A", "E"];

interface FretboardDiagramProps {
  positions: { [key: string]: number | null };
  pinnedPositions?: { [key: string]: boolean };
  onNoteClick?: (stringKey: string, fretVal: number | null) => void;
}

export function FretboardDiagram({ positions, pinnedPositions, onNoteClick }: FretboardDiagramProps) {
  // Collect all fretted (non-open, non-muted) notes to determine window
  const frettedValues: number[] = [];
  for (let s = 1; s <= 6; s++) {
    const v = positions[`string_${s}`];
    if (v !== null && v !== undefined && v > 0) frettedValues.push(v);
  }

  // Determine dynamic fret window to display (always show at least 4 frets)
  let windowStart = 1;
  let fretsShown = 4;
  if (frettedValues.length > 0) {
    const minFret = Math.min(...frettedValues);
    const maxFret = Math.max(...frettedValues);
    windowStart = Math.max(1, minFret);
    fretsShown = Math.max(4, maxFret - windowStart + 1);
  }
  const windowEnd = windowStart + fretsShown - 1;

  const CELL_W = 32;
  const CELL_H = 22;
  const LEFT_PAD = 36; // room for string labels + open string circles
  const TOP_PAD = 20;  // room for fret numbers
  const NUT_W = 3.5;

  const svgW = LEFT_PAD + NUT_W + fretsShown * CELL_W + 4;
  const svgH = TOP_PAD + 6 * CELL_H + 4;

  // Draw fret numbers above each fret column (centered between fret lines)
  const fretNumbers = Array.from({ length: fretsShown }, (_, i) => windowStart + i);

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width={svgW}
      height={svgH}
      className="select-none max-w-full h-auto"
    >
      {/* Fret number labels */}
      {fretNumbers.map((fret, i) => (
        <text
          key={fret}
          x={LEFT_PAD + NUT_W + i * CELL_W + CELL_W / 2}
          y={TOP_PAD - 5}
          textAnchor="middle"
          fontSize={10}
          className="fill-current opacity-70 font-bold"
          fontFamily="monospace"
        >
          {fret}
        </text>
      ))}

      {/* Nut (thick left border, only when window starts at fret 1) */}
      {windowStart === 1 && (
        <rect
          x={LEFT_PAD}
          y={TOP_PAD}
          width={NUT_W}
          height={6 * CELL_H}
          className="fill-current opacity-70"
          rx={1}
        />
      )}

      {/* Vertical fret lines */}
      {Array.from({ length: fretsShown + 1 }, (_, i) => (
        <line
          key={i}
          x1={LEFT_PAD + NUT_W + i * CELL_W}
          y1={TOP_PAD}
          x2={LEFT_PAD + NUT_W + i * CELL_W}
          y2={TOP_PAD + 6 * CELL_H}
          strokeWidth={i === 0 && windowStart > 1 ? 1.5 : 0.75}
          className="stroke-current opacity-25"
        />
      ))}

      {/* Horizontal string lines + labels */}
      {STRING_LABELS.map((label, si) => {
        const y = TOP_PAD + si * CELL_H + CELL_H / 2;
        const stringKey = `string_${si + 1}`;
        const fretVal = positions[stringKey];
        const isPinned = pinnedPositions?.[stringKey] ?? false;
        const isMuted = fretVal === null || fretVal === undefined;
        const isOpen = fretVal === 0;

        return (
          <g key={si} className="group/string">
            {/* String label */}
            <text
              x={12}
              y={y + 3.5}
              textAnchor="end"
              fontSize={11.5}
              fontWeight="black"
              fontFamily="monospace"
              className={`fill-current cursor-pointer hover:fill-primary hover:scale-110 transition-all ${
                isPinned ? "fill-amber-500 opacity-100" : "opacity-80"
              }`}
              onClick={() => onNoteClick?.(stringKey, fretVal)}
            >
              {label}
            </text>

            {/* String line */}
            <line
              x1={isOpen ? 16 : LEFT_PAD + NUT_W}
              y1={y}
              x2={LEFT_PAD + NUT_W + fretsShown * CELL_W}
              y2={y}
              strokeWidth={0.85 + (5 - si) * 0.22}
              className={`stroke-current cursor-pointer transition-all ${
                isPinned
                  ? "stroke-amber-500 opacity-80"
                  : isMuted
                  ? "opacity-20 hover:opacity-60 hover:stroke-primary"
                  : "opacity-40 hover:opacity-75"
              }`}
              onClick={() => onNoteClick?.(stringKey, fretVal)}
            />

            {/* Pinned deleted note indicator (amber X) */}
            {isMuted && isPinned && (
              <text
                x={24}
                y={y + 4}
                textAnchor="middle"
                fontSize={12}
                fontWeight="bold"
                className="fill-amber-500 cursor-pointer font-bold select-none"
                onClick={() => onNoteClick?.(stringKey, null)}
              >
                ✕
              </text>
            )}

            {/* Open string circle */}
            {isOpen && (
              <circle
                cx={24}
                cy={y}
                r={5}
                className={`cursor-pointer hover:scale-110 transition-all ${
                  isPinned
                    ? "fill-amber-400 stroke-amber-600 stroke-[2]"
                    : "fill-white dark:fill-black/60 stroke-current stroke-[1.5] opacity-90 hover:stroke-primary"
                }`}
                onClick={() => onNoteClick?.(stringKey, 0)}
              />
            )}

            {/* Fretted dot group */}
            {!isMuted && !isOpen && fretVal !== null && fretVal >= windowStart && fretVal <= windowEnd && (
              <g 
                className="cursor-pointer hover:scale-110 origin-center transition-all"
                onClick={() => onNoteClick?.(stringKey, fretVal)}
                style={{ transformOrigin: `${LEFT_PAD + NUT_W + (fretVal - windowStart) * CELL_W + CELL_W / 2}px ${y}px` }}
              >
                <circle
                  cx={LEFT_PAD + NUT_W + (fretVal - windowStart) * CELL_W + CELL_W / 2}
                  cy={y}
                  r={9}
                  className={isPinned ? "fill-amber-400" : "fill-primary dark:fill-teal-400"}
                />
                <text
                  x={LEFT_PAD + NUT_W + (fretVal - windowStart) * CELL_W + CELL_W / 2}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight="bold"
                  fill={isPinned ? "#000000" : "white"}
                  className={isPinned ? "fill-black font-extrabold" : "dark:fill-black font-medium"}
                  fontFamily="sans-serif"
                >
                  {fretVal}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
