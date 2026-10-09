import React from 'react';
import { formatNumber } from '../recordUtils';

// ============================================================
// Gráficos simples en SVG (columnas y líneas)
// Se dibujan sin librerías externas y se ven igual al imprimir.
// ============================================================

interface ChartProps {
  labels: string[];
  values: number[];          // consumo por mes (kW-h / m³)
  color: string;             // color principal (hex)
  unit: string;              // 'kW-h', 'm³'
  highlightIndex?: number | null;
  height?: number;           // alto del lienzo en unidades SVG
  emptyMessage?: string;
  amounts?: number[];        // monto facturado S/ por mes (opcional)
  present?: boolean[];       // meses con recibo registrado (aunque el consumo sea 0)
  valueFormat?: (v: number) => string; // formato de las etiquetas de cada mes
}

const W = 640;          // ancho del lienzo SVG
const PAD_L = 52;       // espacio para la escala izquierda
const PAD_R = 14;
const PAD_B = 26;       // espacio para los meses
const SOLES_COLOR = '#047857';

// Redondea el máximo de la escala a un número "bonito"
const niceMax = (max: number): number => {
  if (max <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
};

// Formato corto para etiquetas de consumo (1.25k, 15k…)
export const shortNumber = (v: number): string => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(v >= 10000000 ? 0 : 1)}M`;
  if (v >= 1000) return `${parseFloat((v / 1000).toFixed(v >= 10000 ? 1 : 2))}k`;
  return formatNumber(Math.round(v * 10) / 10);
};

// Formato corto para soles sobre las columnas (el monto exacto va en el recuadro inferior)
export const shortSoles = (v: number): string => {
  // Exacto con 2 decimales hasta 9,999.99; desde 10,000 sin decimales (para que quepa)
  if (v >= 10000) return Math.round(v).toLocaleString('en-US');
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const sum = (arr: number[] = []) => arr.reduce((a, b) => a + (Number(b) || 0), 0);

const EmptyState: React.FC<{ message: string; height: number }> = ({ message, height }) => (
  <div
    className="flex items-center justify-center text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg px-4"
    style={{ minHeight: Math.round(height * 0.55) }}
  >
    {message}
  </div>
);

const Grid: React.FC<{ max: number; h: number; unit: string; padT: number; allZero?: boolean }> = ({ max, h, unit, padT, allZero }) => {
  const plotH = h - padT - PAD_B;
  const steps = allZero ? 0 : 4;
  return (
    <g>
      {allZero && (
        <text x={(PAD_L + W - PAD_R) / 2} y={padT + plotH / 2} textAnchor="middle" fontSize={10} fill="#94a3b8">
          {`Consumo 0 ${unit} en los meses con recibo`}
        </text>
      )}
      {Array.from({ length: steps + 1 }, (_, i) => {
        const v = steps === 0 ? 0 : (max / steps) * i;
        const y = padT + plotH - (v / max) * plotH;
        return (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize={10} fill="#64748b">
              {shortNumber(v)}
            </text>
          </g>
        );
      })}
      <text x={4} y={14} fontSize={10} fill="#64748b" fontWeight={600}>{unit}</text>
    </g>
  );
};

// Columnas de consumo + monto en soles (S/) escrito sobre cada columna
export const ColumnChart: React.FC<ChartProps> = ({
  labels, values, color, unit, highlightIndex = null, height = 200, emptyMessage = 'Sin datos registrados', amounts, valueFormat = shortNumber
}) => {
  const hasAmounts = !!amounts && sum(amounts) > 0;
  if (sum(values) <= 0 && !hasAmounts) return <EmptyState message={emptyMessage} height={height} />;

  const h = height;
  const padT = hasAmounts ? 40 : 22;
  const plotH = h - padT - PAD_B;
  const max = niceMax(Math.max(...values, 0));
  const slot = (W - PAD_L - PAD_R) / values.length;
  const barW = Math.min(30, slot * 0.6);
  const base = padT + plotH;

  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full h-auto" role="img" aria-label={`Gráfico de columnas en ${unit} con montos en soles`}>
      <Grid max={max} h={h} unit={unit} padT={padT} allZero={sum(values) <= 0} />
      {hasAmounts && (
        <g>
          <rect x={W - PAD_R - 196} y={4} width={10} height={10} rx={2} fill={color} />
          <text x={W - PAD_R - 182} y={13} fontSize={10} fill="#475569">Consumo ({unit})</text>
          <text x={W - PAD_R - 92} y={13} fontSize={10} fontWeight={700} fill={SOLES_COLOR}>S/</text>
          <text x={W - PAD_R - 78} y={13} fontSize={10} fill="#475569">Monto facturado</text>
        </g>
      )}
      {values.map((raw, i) => {
        const v = Number(raw) || 0;
        const amt = Number(amounts?.[i]) || 0;
        const bh = v > 0 ? Math.max((v / max) * plotH, 2) : 0;
        const cx = PAD_L + slot * i + slot / 2;
        const x = cx - barW / 2;
        const y = base - bh;
        const isHi = highlightIndex === i;
        const dim = highlightIndex !== null && !isHi;
        const consLabelY = y - 4;
        const solesLabelY = v > 0 ? y - 17 : base - 5;
        return (
          <g key={i}>
            {v > 0 && (
              <>
                <rect x={x} y={y} width={barW} height={bh} rx={3} fill={color} opacity={dim ? 0.35 : 1}>
                  <title>{`${labels[i]}: ${formatNumber(v)} ${unit}${amt > 0 ? ` – S/ ${amt.toFixed(2)}` : ''}`}</title>
                </rect>
                <text x={cx} y={consLabelY} textAnchor="middle" fontSize={9} fill={isHi ? '#0f172a' : '#475569'} fontWeight={isHi ? 700 : 400}>
                  {valueFormat(v)}
                </text>
              </>
            )}
            {amt > 0 && (() => {
              const txt = shortSoles(amt);
              const pw = Math.min(slot - 2, txt.length * 4.9 + 6);
              return (
                <g>
                  <title>{`${labels[i]}: S/ ${amt.toFixed(2)}`}</title>
                  <rect x={cx - pw / 2} y={solesLabelY - 9} width={pw} height={12} rx={6} fill="#ecfdf5" stroke={isHi ? SOLES_COLOR : '#a7f3d0'} strokeWidth={isHi ? 1.2 : 0.8} />
                  <text x={cx} y={solesLabelY} textAnchor="middle" fontSize={8.5} fill={SOLES_COLOR} fontWeight={isHi ? 800 : 600}>
                    {txt}
                  </text>
                </g>
              );
            })()}
            <text x={cx} y={h - 8} textAnchor="middle" fontSize={10} fill={isHi ? '#0f172a' : '#64748b'} fontWeight={isHi ? 700 : 500}>
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// Línea de consumo: une todos los meses CON recibo registrado (incluye consumo 0).
// Los meses sin recibo no se dibujan, para no mostrar caídas falsas.
export const LineChart: React.FC<ChartProps> = ({
  labels, values, color, unit, highlightIndex = null, height = 200, emptyMessage = 'Sin datos registrados', present, valueFormat = shortNumber, amounts
}) => {
  const isPresent = values.map((v, i) => (present ? !!present[i] : false) || (Number(v) || 0) > 0 || (Number(amounts?.[i]) || 0) > 0);
  const hasAmounts = !!amounts && sum(amounts) > 0;
  if (!isPresent.some(Boolean)) return <EmptyState message={emptyMessage} height={height} />;

  const h = height;
  const padT = hasAmounts ? 40 : 22;
  const plotH = h - padT - PAD_B;
  const max = niceMax(Math.max(...values.map(v => Number(v) || 0), 0));
  const slot = (W - PAD_L - PAD_R) / values.length;
  const base = padT + plotH;
  const pts = values.map((v, i) => ({
    x: PAD_L + slot * i + slot / 2,
    y: base - ((Number(v) || 0) / max) * plotH,
    v: Number(v) || 0,
    on: isPresent[i]
  }));

  const segments: typeof pts[] = [];
  let current: typeof pts = [];
  pts.forEach(p => {
    if (p.on) current.push(p);
    else if (current.length) { segments.push(current); current = []; }
  });
  if (current.length) segments.push(current);
  const toPath = (seg: { x: number; y: number }[]) => seg.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full h-auto" role="img" aria-label={`Gráfico de líneas en ${unit}`}>
      <Grid max={max} h={h} unit={unit} padT={padT} allZero={values.every(v => (Number(v) || 0) <= 0)} />
      {hasAmounts && (
        <g>
          <line x1={W - PAD_R - 200} x2={W - PAD_R - 186} y1={9} y2={9} stroke={color} strokeWidth={2.5} />
          <text x={W - PAD_R - 182} y={13} fontSize={10} fill="#475569">Consumo ({unit})</text>
          <text x={W - PAD_R - 92} y={13} fontSize={10} fontWeight={700} fill={SOLES_COLOR}>S/</text>
          <text x={W - PAD_R - 78} y={13} fontSize={10} fill="#475569">Monto facturado</text>
        </g>
      )}
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
            {p.on && (
              <circle cx={p.x} cy={p.y} r={isHi ? 5.5 : 3.5} fill={isHi ? color : '#ffffff'} stroke={color} strokeWidth={2}>
                <title>{`${labels[i]}: ${formatNumber(p.v)} ${unit}`}</title>
              </circle>
            )}
            {p.on && (
              <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize={9} fill={isHi ? '#0f172a' : '#475569'} fontWeight={isHi ? 700 : 400}>
                {valueFormat(p.v)}
              </text>
            )}
            {p.on && (Number(amounts?.[i]) || 0) > 0 && (() => {
              const amt = Number(amounts?.[i]) || 0;
              const txt = shortSoles(amt);
              const pw = Math.min(slot - 2, txt.length * 4.9 + 6);
              const ly = p.y - 21;
              return (
                <g>
                  <title>{`${labels[i]}: S/ ${amt.toFixed(2)}`}</title>
                  <rect x={p.x - pw / 2} y={ly - 9} width={pw} height={12} rx={6} fill="#ecfdf5" stroke={isHi ? SOLES_COLOR : '#a7f3d0'} strokeWidth={isHi ? 1.2 : 0.8} />
                  <text x={p.x} y={ly} textAnchor="middle" fontSize={8.5} fill={SOLES_COLOR} fontWeight={isHi ? 800 : 600}>{txt}</text>
                </g>
              );
            })()}
            <text x={p.x} y={h - 8} textAnchor="middle" fontSize={10} fill={isHi ? '#0f172a' : '#64748b'} fontWeight={isHi ? 700 : 500}>
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
