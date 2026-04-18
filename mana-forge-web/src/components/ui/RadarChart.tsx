interface RadarAxis {
  key: string;
  label: string;
  value: number; // 1-10 (current, orange)
  projectedValue?: number; // 1-10 (after changes, green)
  keyCards?: string[];
}

interface RadarChartProps {
  axes: RadarAxis[];
  size?: number;
}

type TextAnchor = 'start' | 'middle' | 'end';
type DominantBaseline = 'auto' | 'middle' | 'hanging';

const NUM_RINGS = 5;

const RadarChart: React.FC<RadarChartProps> = ({ axes, size = 260 }) => {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 36;
  const n = axes.length;
  const hasProjected = axes.some((a) => a.projectedValue !== undefined);

  const angle = (i: number) => (2 * Math.PI * i) / n - Math.PI / 2;

  const point = (i: number, radius: number) => ({
    x: cx + radius * Math.cos(angle(i)),
    y: cy + radius * Math.sin(angle(i)),
  });

  // Concentric grid polygons
  const rings = Array.from({ length: NUM_RINGS }, (_, k) => {
    const r = (R * (k + 1)) / NUM_RINGS;
    const pts = Array.from({ length: n }, (__, i) => point(i, r));
    return pts.map((p) => `${p.x},${p.y}`).join(' ');
  });

  // Axes lines
  const axisLines = Array.from({ length: n }, (_, i) => {
    const tip = point(i, R);
    return { x1: cx, y1: cy, x2: tip.x, y2: tip.y };
  });

  // Current data polygon (orange)
  const dataPoints = axes.map((axis, i) => point(i, (axis.value / 10) * R));
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Projected data polygon (green)
  const projPoints = axes.map((axis, i) =>
    point(i, ((axis.projectedValue ?? axis.value) / 10) * R)
  );
  const projPolygon = projPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Label positions — push slightly past the tip
  const labels = axes.map((axis, i) => {
    const labelR = R + 20;
    const a = angle(i);
    const x = cx + labelR * Math.cos(a);
    const y = cy + labelR * Math.sin(a);
    const textAnchor: TextAnchor =
      Math.abs(Math.cos(a)) < 0.15 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
    const dominantBaseline: DominantBaseline =
      Math.abs(Math.sin(a)) < 0.15 ? 'middle' : Math.sin(a) > 0 ? 'hanging' : 'auto';
    return { x, y, label: axis.label, value: axis.value, projectedValue: axis.projectedValue, textAnchor, dominantBaseline };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="overflow-visible mx-auto"
      aria-label="Deck radar chart"
    >
      {/* Ring lines */}
      {rings.map((pts, k) => (
        <polygon
          key={k}
          points={pts}
          fill="none"
          stroke="#3f3f46"
          strokeWidth={k === NUM_RINGS - 1 ? 1.5 : 0.75}
        />
      ))}

      {/* Axis spokes */}
      {axisLines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#3f3f46" strokeWidth={0.75} />
      ))}

      {/* Projected polygon (green, behind current) */}
      {hasProjected && (
        <>
          <polygon
            points={projPolygon}
            fill="rgba(34,197,94,0.12)"
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            strokeLinejoin="round"
          />
          {projPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#22c55e" />
          ))}
        </>
      )}

      {/* Current polygon (orange) */}
      <polygon
        points={dataPolygon}
        fill="rgba(234,88,12,0.18)"
        stroke="#ea580c"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#ea580c" />
      ))}

      {/* Labels */}
      {labels.map((l, i) => (
        <g key={i}>
          <text
            x={l.x}
            y={l.y}
            textAnchor={l.textAnchor}
            dominantBaseline={l.dominantBaseline}
            fontSize={10}
            fontWeight="600"
            fill="#a1a1aa"
            className="uppercase tracking-wide"
          >
            {l.label}
          </text>
          <text
            x={l.x}
            y={l.y}
            dy={l.dominantBaseline === 'hanging' ? 13 : l.dominantBaseline === 'auto' ? -13 : 0}
            textAnchor={l.textAnchor}
            dominantBaseline={l.dominantBaseline === 'middle' ? 'middle' : 'auto'}
            fontSize={11}
            fontWeight="700"
            fill={l.projectedValue !== undefined && l.projectedValue !== l.value ? '#ea580c' : '#ea580c'}
          >
            {l.value}{l.projectedValue !== undefined && l.projectedValue !== l.value ? ` → ${l.projectedValue}` : ''}
          </text>
        </g>
      ))}
    </svg>
  );
};

export default RadarChart;
