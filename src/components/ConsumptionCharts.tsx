import React from 'react';
import { formatNumber } from '../recordUtils';

// ============================================================
// Gráficos simples en SVG (columnas y líneas)
// Se dibujan sin librerías externas y se ven igual al imprimir.
// ============================================================

interface ChartProps {
  labels: string[];
  values: number[];
  color: string;        // color principal (hex)
  unit: string;         // 'kW-h', 'm³' o 'S/'
  highlightIndex?: number | null;
  height?: number;      // alto del lienzo en unidades SVG
  emptyMessage?: string;
}

const W = 640;          // ancho del lienzo SVG
const PAD_L = 52;       // espacio para la escala izquierda
const PAD_R = 14;
const PAD_T = 22;       // espacio para el valor sobre cada punto
const PAD_B = 26;       // espacio para los meses

// Redondea el máximo de la escala a un número "bonito"
const niceMax = (max: number): number => {
  if (max <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
};

// Formato corto para etiquetas (1.2k, 15k…)
const shortNumber = (v: number): string => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(v >= 10000000 ? 0 : 1)}M`;
  if (v >= 1000) return `${parseFloat((v / 1000).toFixed(v >= 10000 ? 1 : 2))}k`;
  return formatNumber(Math.round(v * 10) / 10);
};

const EmptyState: React.FC<{ message: string; height: number }> = ({ message, height }) => (
  <div
    className="flex items-center justify-center text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg px-4"
    style={{ minHeight: Math.round(height * 0.55) }}
  >
    {message}
  </div>
);

const Grid: React.FC<{ max: number; h: number; unit: string }> = ({ max, h, unit }) => {
  const plotH = h - PAD_T - PAD_B;
  const steps = 4;
  return (
    <g>
      {Array.from({ length: steps + 1 }, (_, i) => {
        const v = (max / steps) * i;
        const y = PAD_T + plotH - (v / max) * plotH;
        return (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize={10} fill="#64748b">
              {shortNumber(v)}
            </text>
          </g>
        );
      })}
      <text x={4} y={PAD_T - 8} fontSize={10} fill="#64748b" fontWeight={600}>{unit}</text>
    </g>
  );
};

export const ColumnChart: React.FC<ChartProps> = ({
  labels, values, color, unit, highlightIndex = null, height = 200, emptyMessage = 'Sin datos registrados'
}) => {
  const total = values.reduce((a, b) => a + (b || 0), 0);
  if (total <= 0) return <EmptyState message={emptyMessage} height={height} />;

  const h = height;
  const plotH = h - PAD_T - PAD_B;
  const max = niceMax(Math.max(...values));
  const slot = (W - PAD_L - PAD_R) / values.length;
  const barW = Math.min(30, slot * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full h-auto" role="img" aria-label={`Gráfico de columnas en ${unit}`}>
      <Grid max={max} h={h} unit={unit} />
      {values.map((v, i) => {
        const bh = v > 0 ? Math.max((v / max) * plotH, 2) : 0;
        const x = PAD_L + slot * i + (slot - barW) / 2;
        const y = PAD_T + plotH - bh;
        const isHi = highlightIndex === i;
        const dim = highlightIndex !== null && !isHi;
        return (
          <g key={i}>
            {v > 0 && (
              <>
                <rect x={x} y={y} width={barW} height={bh} rx={3} fill={color} opacity={dim ? 0.35 : 1}>
                  <title>{`${labels[i]}: ${formatNumber(v)} ${unit}`}</title>
                </rect>
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill={isHi ? '#0f172a' : '#475569'} fontWeight={isHi ? 700 : 400}>
                  {shortNumber(v)}
                </text>
              </>
            )}
            <text x={PAD_L + slot * i + slot / 2} y={h - 8} textAnchor="middle" fontSize={10} fill={isHi ? '#0f172a' : '#64748b'} fontWeight={isHi ? 700 : 500}>
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const LineChart: React.FC<ChartProps> = ({
  labels, values, color, unit, highlightIndex = null, height = 200, emptyMessage = 'Sin datos registrados'
}) => {
  const total = values.reduce((a, b) => a + (b || 0), 0);
  if (total <= 0) return <EmptyState message={emptyMessage} height={height} />;

  const h = height;
  const plotH = h - PAD_T - PAD_B;
  const max = niceMax(Math.max(...values));
  const slot = (W - PAD_L - PAD_R) / values.length;
  const pts = values.map((v, i) => ({
    x: PAD_L + slot * i + slot / 2,
    y: PAD_T + plotH - ((v || 0) / max) * plotH,
    v: v || 0
  }));
  // Solo se unen meses CON datos: un mes sin lecturas no se dibuja como caída a 0
  const segments: { x: number; y: number; v: number }[][] = [];
  let current: { x: number; y: number; v: number }[] = [];
  pts.forEach(p => {
    if (p.v > 0) current.push(p);
    else if (current.length) { segments.push(current); current = []; }
  });
  if (current.length) segments.push(current);
  const base = PAD_T + plotH;
  const toPath = (seg: { x: number; y: number }[]) => seg.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full h-auto" role="img" aria-label={`Gráfico de líneas en ${unit}`}>
      <Grid max={max} h={h} unit={unit} />
      {segments.map((seg, k) => (
        <g key={k}>
          {seg.length > 1 && (
            <path d={`${toPath(seg)} L${seg[seg.length - 1].x.toFixed(1)},${base} L${seg[0].x.toFixed(1)},${base} Z`} fill={color} opacity={0.08} />
          )}
          <path d={toPath(seg)} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        </g>
      ))}
      {pts.map((p, i) => {
        const isHi = highlightIndex === i;
        return (
          <g key={i}>
            {p.v > 0 && (
              <circle cx={p.x} cy={p.y} r={isHi ? 5.5 : 3.5} fill={isHi ? color : '#ffffff'} stroke={color} strokeWidth={2}>
                <title>{`${labels[i]}: ${formatNumber(p.v)} ${unit}`}</title>
              </circle>
            )}
            {p.v > 0 && (
              <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize={9} fill={isHi ? '#0f172a' : '#475569'} fontWeight={isHi ? 700 : 400}>
                {shortNumber(p.v)}
              </text>
            )}
            <text x={p.x} y={h - 8} textAnchor="middle" fontSize={10} fill={isHi ? '#0f172a' : '#64748b'} fontWeight={isHi ? 700 : 500}>
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
