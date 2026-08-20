import React, { useState } from 'react';
import { UtilityType } from '../types';
import { ENERGY_MONTHLY_TREND, WATER_MONTHLY_TREND, ENERGY_TOP_PROPERTIES, WATER_TOP_PROPERTIES } from '../data/mockData';
import { MoreVertical, Maximize2, Download, Info } from 'lucide-react';

interface ChartsSectionProps {
  utilityType: UtilityType;
  onShowToast: (title: string, message: string, type: 'info' | 'success') => void;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ utilityType, onShowToast }) => {
  const isEnergy = utilityType === 'energy';
  const monthlyData = isEnergy ? ENERGY_MONTHLY_TREND : WATER_MONTHLY_TREND;
  const topProperties = isEnergy ? ENERGY_TOP_PROPERTIES : WATER_TOP_PROPERTIES;

  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; month: string; amount: number; metric?: number } | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  // SVG Chart coordinate calculations
  const maxVal = isEnergy ? 120000 : 5000;
  const chartHeight = 220;
  const chartWidth = 520;
  const paddingLeft = 50;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 35;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const points = monthlyData.map((d, index) => {
    const x = paddingLeft + (index / (monthlyData.length - 1)) * innerWidth;
    const y = paddingTop + innerHeight - (d.amount / maxVal) * innerHeight;
    return { x, y, ...d };
  });

  // Generate smooth cubic bezier SVG path
  const makeSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const linePath = makeSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`;

  const yTicks = isEnergy 
    ? [0, 20000, 40000, 60000, 80000, 100000, 120000]
    : [0, 1000, 2000, 3000, 4000, 5000];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Line Chart: Evolución Mensual de Gasto */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-xs p-5 flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="font-semibold text-[#191c1e] text-base">
              {isEnergy ? 'Evolución de Gasto Mensual' : 'Evolución Mensual de Gasto (S/.)'}
            </h3>
            <p className="text-xs text-[#434655]">
              {isEnergy ? 'Historial consolidado en Soles (S/.) y demanda eléctrica' : 'Consumo facturado mensual en Soles (S/.)'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onShowToast('Exportación de Gráficos', 'Generando imagen vectorial SVG de la gráfica mensual.', 'info')}
              className="p-1.5 text-[#737686] hover:text-[#191c1e] hover:bg-[#eceef0] rounded-md transition-colors"
              title="Descargar gráfico"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onShowToast('Información de Métricas', 'Datos calculados a partir de los recibos emitidos por las concesionarias de energía y agua.', 'info')}
              className="p-1.5 text-[#737686] hover:text-[#191c1e] hover:bg-[#eceef0] rounded-md transition-colors"
              title="Opciones de gráfico"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SVG Graphic Area */}
        <div className="relative h-64 w-full flex items-center justify-center">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-full overflow-visible select-none"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isEnergy ? '#004ac6' : '#00687a'} stopOpacity="0.18" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal dashed lines & Y labels */}
            {yTicks.map((val) => {
              const y = paddingTop + innerHeight - (val / maxVal) * innerHeight;
              return (
                <g key={val}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                    strokeDasharray={val === 0 ? 'none' : '4 4'}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-[#737686] font-mono-data"
                  >
                    {val.toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Gradient Area under curve */}
            <path d={areaPath} fill="url(#chartGradient)" />

            {/* Line Path */}
            <path
              d={linePath}
              fill="none"
              stroke={isEnergy ? '#004ac6' : '#00687a'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* X-axis labels & Interactivity Points */}
            {points.map((p, idx) => (
              <g key={p.month}>
                <text
                  x={p.x}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  className="text-[11px] fill-[#434655] font-medium"
                >
                  {p.month}
                </text>

                {/* Point background circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="#ffffff"
                  stroke={isEnergy ? '#004ac6' : '#00687a'}
                  strokeWidth="2.5"
                  className="cursor-pointer transition-all hover:r-7"
                  onMouseEnter={() => setHoveredPoint({ index: idx, month: p.month, amount: p.amount, metric: isEnergy ? (p as any).kwh : (p as any).m3 })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            ))}

            {/* Hover Indicator Vertical Line & Tooltip in SVG */}
            {hoveredPoint && points[hoveredPoint.index] && (
              <g>
                <line
                  x1={points[hoveredPoint.index].x}
                  y1={paddingTop}
                  x2={points[hoveredPoint.index].x}
                  y2={chartHeight - paddingBottom}
                  stroke="#004ac6"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
              </g>
            )}
          </svg>

          {/* Floating Tooltip Box */}
          {hoveredPoint && (
            <div 
              className="absolute top-2 right-4 bg-[#191c1e] text-white text-xs px-3 py-2 rounded-lg shadow-lg z-20 pointer-events-none animate-in fade-in duration-150"
            >
              <div className="font-semibold text-[#acedff] flex items-center justify-between gap-3">
                <span>Mes: {hoveredPoint.month}</span>
                <span className="text-[10px] text-gray-300 font-mono-data">2023</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5 font-mono-data font-bold text-sm">
                <span>S/ {hoveredPoint.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {hoveredPoint.metric && (
                <div className="text-[11px] text-gray-300">
                  {isEnergy ? `${hoveredPoint.metric.toLocaleString()} kWh` : `${hoveredPoint.metric.toLocaleString()} m³`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Summary note */}
        <div className="mt-2 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-xs text-[#737686]">
          <span className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isEnergy ? 'bg-[#004ac6]' : 'bg-[#00687a]'}`}></span>
            Gasto Mensual Facturado (S/.)
          </span>
          <span className="font-medium text-[#191c1e]">
            Promedio: {isEnergy ? 'S/ 103,805.83' : 'S/ 3,769.17'}
          </span>
        </div>
      </div>

      {/* Bar Chart: Top 5 Predios por Consumo Anual */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-xs p-5 flex flex-col justify-between">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="font-semibold text-[#191c1e] text-base">
              {isEnergy ? 'Top 5 Predios por Consumo Anual' : 'Top Consumo por Predio'}
            </h3>
            <p className="text-xs text-[#434655]">
              Distribución de mayor gasto consolidado del período
            </p>
          </div>
          <button 
            onClick={() => onShowToast('Detalle de Predios', 'Visualizando las 5 ubicaciones con mayor demanda.', 'info')}
            className="p-1.5 text-[#737686] hover:text-[#191c1e] hover:bg-[#eceef0] rounded-md transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Bar rows */}
        <div className="space-y-4 my-auto py-2">
          {topProperties.map((prop, idx) => {
            const isHovered = selectedProperty === prop.name;
            return (
              <div 
                key={prop.name}
                className="group cursor-pointer"
                onMouseEnter={() => setSelectedProperty(prop.name)}
                onMouseLeave={() => setSelectedProperty(null)}
              >
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#f2f4f6] text-[#434655] font-semibold text-[11px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className={`font-medium ${isHovered ? 'text-[#004ac6] font-semibold' : 'text-[#191c1e]'}`}>
                      {prop.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data font-semibold text-[#004ac6]">
                      S/ {prop.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#737686] font-mono-data">
                      ({prop.percentage}%)
                    </span>
                  </div>
                </div>

                <div className="h-4 w-full bg-[#f2f4f6] rounded-md overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded transition-all duration-500 ${
                      isEnergy 
                        ? 'bg-[#57dffe] hover:bg-[#004ac6]' 
                        : 'bg-[#004ac6] hover:bg-[#003ea8]'
                    }`}
                    style={{ width: `${prop.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bar chart footnote */}
        <div className="mt-2 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-xs text-[#737686]">
          <span>Concentran el 82% del gasto total anual</span>
          <span className="font-medium text-[#004ac6] cursor-pointer hover:underline" onClick={() => onShowToast('Filtro Aplicado', 'Filtro por Top 5 predios listo.', 'info')}>
            Ver desglose completo &rarr;
          </span>
        </div>
      </div>
    </div>
  );
};
