// Gráficos para los reportes Word: se dibujan en un <canvas> y se insertan como imagen PNG.

export interface ChartSpec {
  title: string;
  labels: string[];
  bars: number[]; // consumo
  line: number[]; // monto S/
  unit: string; // kW-h o m³
  highlight: number[]; // índices resaltados
  avg?: number; // línea de promedio (consumo)
  color: string; // color principal
}

const fmt = (v: number) => {
  if (v >= 100000) return Math.round(v / 1000).toLocaleString('en-US') + 'k';
  if (v >= 10000) return (v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'k';
  return Math.round(v).toLocaleString('en-US');
};

export const drawChart = async (spec: ChartSpec): Promise<{ data: Uint8Array; width: number; height: number }> => {
  const W = 1400;
  const H = 500;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.font = 'bold 26px Arial';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(spec.title, 30, 40);

  const L = 110;
  const R = W - 110;
  const T = 95;
  const B = H - 70;
  const n = spec.labels.length;
  const slot = (R - L) / Math.max(n, 1);
  const maxB = Math.max(...spec.bars, spec.avg || 0, 1) * 1.18;
  const maxL = Math.max(...spec.line, 1) * 1.18;

  // ejes y rejilla
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.font = '18px Arial';
  for (let i = 0; i <= 4; i++) {
    const y = B - ((B - T) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(R, y);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.fillText(fmt((maxB * i) / 4), L - 10, y + 6);
    ctx.fillStyle = '#1d4ed8';
    ctx.textAlign = 'left';
    ctx.fillText(fmt((maxL * i) / 4), R + 10, y + 6);
  }
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'left';
  ctx.fillText(spec.unit, 20, T - 18);
  ctx.fillStyle = '#1d4ed8';
  ctx.textAlign = 'right';
  ctx.fillText('S/', W - 20, T - 18);

  // barras de consumo
  const bw = Math.min(70, slot * 0.6);
  spec.bars.forEach((v, i) => {
    const x = L + slot * i + slot / 2;
    const h = ((B - T) * v) / maxB;
    const hi = spec.highlight.includes(i);
    ctx.fillStyle = hi ? spec.color : '#cbd5e1';
    ctx.fillRect(x - bw / 2, B - h, bw, h);
    ctx.fillStyle = hi ? '#0f172a' : '#475569';
    ctx.font = (hi ? 'bold ' : '') + '18px Arial';
    ctx.textAlign = 'center';
    if (v > 0) ctx.fillText(fmt(v), x, B - h - 8);
    ctx.font = (hi ? 'bold ' : '') + '20px Arial';
    ctx.fillStyle = hi ? '#0f172a' : '#475569';
    ctx.fillText(spec.labels[i], x, B + 30);
  });

  // línea de promedio
  if (spec.avg && spec.avg > 0) {
    const y = B - ((B - T) * spec.avg) / maxB;
    ctx.strokeStyle = '#b45309';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(R, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Promedio: ${fmt(spec.avg)} ${spec.unit}`, L + 8, y - 8);
  }

  // línea de monto S/
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  let started = false;
  spec.line.forEach((v, i) => {
    const x = L + slot * i + slot / 2;
    const y = B - ((B - T) * v) / maxL;
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else ctx.lineTo(x, y);
  });
  ctx.stroke();
  spec.line.forEach((v, i) => {
    const x = L + slot * i + slot / 2;
    const y = B - ((B - T) * v) / maxL;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  // leyenda
  ctx.font = '18px Arial';
  ctx.textAlign = 'left';
  ctx.fillStyle = spec.color;
  ctx.fillRect(W - 560, 22, 22, 16);
  ctx.fillStyle = '#334155';
  ctx.fillText(`Consumo (${spec.unit})`, W - 530, 37);
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W - 330, 30);
  ctx.lineTo(W - 300, 30);
  ctx.stroke();
  ctx.fillStyle = '#334155';
  ctx.fillText('Monto facturado (S/)', W - 290, 37);

  const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b as Blob), 'image/png'));
  const data = new Uint8Array(await blob.arrayBuffer());
  return { data, width: W, height: H };
};
