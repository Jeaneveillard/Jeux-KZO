import { useRef, useState } from 'preact/hooks';
import { pointToCell, type BoardGeometry, type Cell } from './geometry';

export interface BoardPiece {
  readonly square: string;
  readonly image: string;
  readonly label: string;
}

export interface BoardArrow {
  readonly from: string;
  readonly to: string;
}

export interface BoardProps {
  readonly geometry: BoardGeometry;
  readonly pieces: readonly BoardPiece[];
  readonly selected?: string | null;
  readonly targets?: readonly string[];
  readonly highlights?: readonly string[];
  readonly check?: string | null;
  readonly stars?: readonly string[];
  readonly arrows?: readonly BoardArrow[];
  readonly animate?: BoardArrow | null;
  readonly onSquareTap?: (square: string) => void;
  readonly onDrop?: (from: string, to: string) => void;
  readonly canDrag?: (square: string) => boolean;
}

interface DragState {
  readonly from: string;
  readonly startX: number;
  readonly startY: number;
  readonly x: number;
  readonly y: number;
  readonly moved: boolean;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

const CELL = 100;
const DRAG_THRESHOLD_PX = 6;
const ARROW_HEAD = 34;

function allCells(size: number): Cell[] {
  return Array.from({ length: size * size }, (_, index) => ({ row: Math.floor(index / size), col: index % size }));
}

function arrowShape(from: Point, to: Point) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const baseX = to.x - ux * ARROW_HEAD;
  const baseY = to.y - uy * ARROW_HEAD;
  const half = ARROW_HEAD * 0.6;
  const points = `${to.x},${to.y} ${baseX - uy * half},${baseY + ux * half} ${baseX + uy * half},${baseY - ux * half}`;
  return { x1: from.x, y1: from.y, x2: baseX, y2: baseY, points };
}

export function Board(props: BoardProps) {
  const { geometry, pieces } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const extent = geometry.size * CELL;
  const occupied = new Set(pieces.map((piece) => piece.square));

  const origin = (square: string): Point => {
    const cell = geometry.cellOf(square);
    return { x: cell.col * CELL, y: cell.row * CELL };
  };
  const center = (square: string): Point => {
    const o = origin(square);
    return { x: o.x + CELL / 2, y: o.y + CELL / 2 };
  };

  const squareFromEvent = (event: PointerEvent): string | null => {
    const svg = svgRef.current;
    const cell = svg ? pointToCell(event.clientX, event.clientY, svg.getBoundingClientRect(), geometry.size) : null;
    if (cell) return geometry.squareAt(cell);
    const target = event.target instanceof Element ? event.target.closest('[data-square]') : null;
    return target?.getAttribute('data-square') ?? null;
  };

  const onPointerDown = (event: PointerEvent) => {
    const square = squareFromEvent(event);
    if (!square || !props.canDrag?.(square)) return;
    // Capture du pointeur : le glisser continue même si le doigt sort du plateau.
    if (typeof event.pointerId === 'number') svgRef.current?.setPointerCapture?.(event.pointerId);
    setDrag({ from: square, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false });
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    setDrag({ ...drag, x: event.clientX, y: event.clientY, moved: drag.moved || distance > DRAG_THRESHOLD_PX });
  };

  const onPointerUp = (event: PointerEvent) => {
    const square = squareFromEvent(event);
    const current = drag;
    setDrag(null);
    if (current?.moved) {
      if (square && square !== current.from) props.onDrop?.(current.from, square);
      return;
    }
    if (square) props.onSquareTap?.(square);
  };

  const dragPoint = ((): Point | null => {
    const svg = svgRef.current;
    if (!drag?.moved || !svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return null;
    return {
      x: ((drag.x - rect.left) / rect.width) * extent - CELL / 2,
      y: ((drag.y - rect.top) / rect.height) * extent - CELL / 2,
    };
  })();

  return (
    <svg
      ref={svgRef}
      class="board"
      viewBox={`0 0 ${extent} ${extent}`}
      role="img"
      aria-label="Plateau de jeu"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      <defs>
        <radialGradient id="check-gradient">
          <stop offset="0%" class="check-stop-0" />
          <stop offset="100%" class="check-stop-1" />
        </radialGradient>
      </defs>
      {allCells(geometry.size).map((cell) => (
        <rect
          key={`${cell.row}-${cell.col}`}
          x={cell.col * CELL}
          y={cell.row * CELL}
          width={CELL}
          height={CELL}
          class={geometry.isDark(cell) ? 'sq-dark' : 'sq-light'}
          data-square={geometry.squareAt(cell) ?? undefined}
        />
      ))}
      <g class="overlay">
        {geometry.edgeLabels &&
          Array.from({ length: geometry.size }, (_, index) => (
            <g key={`label-${index}`}>
              <text
                x={index * CELL + CELL - 16}
                y={extent - 6}
                class={`coord ${geometry.isDark({ row: geometry.size - 1, col: index }) ? 'coord-on-dark' : 'coord-on-light'}`}
              >
                {geometry.edgeLabels?.bottom(index)}
              </text>
              <text
                x={4}
                y={index * CELL + 20}
                class={`coord ${geometry.isDark({ row: index, col: 0 }) ? 'coord-on-dark' : 'coord-on-light'}`}
              >
                {geometry.edgeLabels?.left(index)}
              </text>
            </g>
          ))}
        {(props.highlights ?? []).map((square) => (
          <rect key={`hl-${square}`} {...origin(square)} width={CELL} height={CELL} class="hl-last" />
        ))}
        {props.selected && <rect {...origin(props.selected)} width={CELL} height={CELL} class="hl-selected" />}
        {props.check && <rect {...origin(props.check)} width={CELL} height={CELL} class="check" fill="url(#check-gradient)" />}
        {(props.stars ?? []).map((square) => {
          const c = center(square);
          return (
            <text key={`star-${square}`} x={c.x} y={c.y} class="star">
              ★
            </text>
          );
        })}
      </g>
      {pieces.map((piece) => {
        const o = origin(piece.square);
        const animation = props.animate && props.animate.to === piece.square ? props.animate : null;
        const dragged = drag?.moved === true && drag.from === piece.square;
        const from = animation ? origin(animation.from) : null;
        return (
          <image
            key={animation ? `${piece.square}-from-${animation.from}` : piece.square}
            href={piece.image}
            x={o.x}
            y={o.y}
            width={CELL}
            height={CELL}
            class={from ? 'piece-move' : undefined}
            style={from ? `--dx:${from.x - o.x}px;--dy:${from.y - o.y}px` : undefined}
            opacity={dragged ? 0.35 : 1}
            aria-label={piece.label}
            data-piece={piece.square}
          />
        );
      })}
      <g class="overlay">
        {(props.targets ?? []).map((square) => {
          const c = center(square);
          return occupied.has(square) ? (
            <circle key={`t-${square}`} cx={c.x} cy={c.y} r={46} class="target-ring" />
          ) : (
            <circle key={`t-${square}`} cx={c.x} cy={c.y} r={15} class="target-dot" />
          );
        })}
        {(props.arrows ?? []).map((arrow) => {
          const shape = arrowShape(center(arrow.from), center(arrow.to));
          return (
            <g key={`arrow-${arrow.from}-${arrow.to}`}>
              <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} class="arrow" />
              <polygon points={shape.points} class="arrow-head" />
            </g>
          );
        })}
        {dragPoint && drag && (
          <image
            href={pieces.find((piece) => piece.square === drag.from)?.image}
            x={dragPoint.x}
            y={dragPoint.y}
            width={CELL}
            height={CELL}
          />
        )}
      </g>
    </svg>
  );
}
