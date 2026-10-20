import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType
} from 'docx';
import { UtilityType } from './types';
import { MONTH_KEYS, MONTH_LABELS } from './recordUtils';
import {
  Candidate,
  MES_NOMBRE,
  MES_TITULO,
  ReportPeriod,
  ServiceSection,
  fmtNum,
  fmtPct,
  fmtSol,
  periodLabel,
  serviceOf,
  serviceTitle,
  unitOf
} from './reports';
import { drawChart } from './reportCharts';

// ============================================================
// Documentos Word de los reportes (formato del memorando Petroperú, Arial 10)
// ============================================================

const F = 'Arial';
const SZ = 20; // 10 pt
const W = 9352; // ancho útil (A4 con márgenes de la plantilla)

export interface HeaderData {
  docType: 'MEMORANDO' | 'INFORME';
  numero: string; // ej. FDM-XXXX-2026
  para: string; // A:
  de: string; // De:
  fecha: string; // Talara, 20 de Octubre de 2026
  asunto: string;
  firmaNombre: string;
  firmaCargo: string;
  firmaUnidad: string;
  iniciales: string;
}

// ---------- piezas comunes ----------
type R = { b?: boolean; i?: boolean; size?: number; color?: string; hl?: boolean };
const r = (t: string, o: R = {}) =>
  new TextRun({ text: t, font: F, size: o.size || SZ, bold: o.b, italics: o.i, color: o.color, highlight: o.hl ? 'yellow' : undefined });
const runs = (t: string, o: R = {}) =>
  t
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map(p => (p.startsWith('**') ? r(p.slice(2, -2), { ...o, b: true }) : r(p, o)));
const P = (t: string, after = 160) =>
  new Paragraph({ children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { after, line: 259 } });
const NOTE = (t: string) =>
  new Paragraph({ children: runs(t, { size: 16, i: true }), alignment: AlignmentType.JUSTIFIED, spacing: { before: 60, after: 160 } });
const H = (t: string) => new Paragraph({ children: [r(t, { b: true })], spacing: { before: 120, after: 100 }, keepNext: true });
const H2 = (t: string) => new Paragraph({ children: [r(t, { b: true, color: '0F766E' })], spacing: { before: 100, after: 80 }, keepNext: true });
const BL = (t: string) =>
  new Paragraph({ numbering: { reference: 'b', level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: 80, line: 259 }, children: runs(t) });
const E = (a = 0) => new Paragraph({ children: [], spacing: { after: a } });

const thin = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const gb = { style: BorderStyle.SINGLE, size: 4, color: '94A3B8' };
const gbs = { top: gb, bottom: gb, left: gb, right: gb };

const T = (rows: string[][], widths: number[], hdr = '1F3A8A', bold: number[] = []) =>
  new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(
      (row, i) =>
        new TableRow({
          cantSplit: true,
          tableHeader: i === 0,
          children: row.map(
            (c, j) =>
              new TableCell({
                width: { size: widths[j], type: WidthType.DXA },
                borders: gbs,
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 40, bottom: 40, left: 70, right: 70 },
                shading:
                  i === 0
                    ? { fill: hdr, type: ShadingType.CLEAR, color: 'auto' }
                    : bold.includes(i)
                      ? { fill: 'E2E8F0', type: ShadingType.CLEAR, color: 'auto' }
                      : undefined,
                children: [
                  new Paragraph({
                    alignment: j === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                    spacing: { after: 0 },
                    children: runs(String(c), { size: 17, color: i === 0 ? 'FFFFFF' : undefined, b: i === 0 || bold.includes(i) ? true : undefined })
                  })
                ]
              })
          )
        })
    )
  });

const split = (total: number, parts: number[]) => {
  const s = parts.reduce((a, b) => a + b, 0);
  const out = parts.map(p => Math.floor((p / s) * total));
  out[0] += total - out.reduce((a, b) => a + b, 0);
  return out;
};

const headerBlock = (h: HeaderData) => {
  const head = new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: W }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } },
    spacing: { after: 0 },
    children: [r(h.docType, { size: 18 }), r('\tN° ', { size: 18 }), r(h.numero || 'FDM-XXXX-2026', { size: 18, b: true, hl: /X/.test(h.numero || 'X') })]
  });
  const cell = (lines: [string, R][], w: number, b: any) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders: b,
      margins: { top: 60, bottom: 100, left: 80, right: 80 },
      children: lines.map(([t, o]) => new Paragraph({ spacing: { after: 0 }, children: [r(t, { size: 18, ...o })] }))
    });
  const half = W / 2;
  const box = new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [half, half],
    rows: [
      new TableRow({
        children: [
          cell([['A:', { b: true }], ['', {}], [h.para, {}]], half, { top: none, left: none, bottom: thin, right: thin }),
          cell([['', {}], ['Lugar y fecha:', { b: true }], [h.fecha, {}]], half, { top: none, left: thin, bottom: thin, right: none })
        ]
      }),
      new TableRow({
        children: [
          cell([['', {}], ['De:', { b: true }], [h.de, {}]], half, { top: thin, left: none, bottom: thin, right: thin }),
          cell([['Asunto:', { b: true }], [h.asunto, {}]], half, { top: thin, left: thin, bottom: thin, right: none })
        ]
      })
    ]
  });
  return [head, E(0), box, E(120)];
};

const closing = (h: HeaderData, adjuntos: string[]) => {
  const c: (Paragraph | Table)[] = [];
  c.push(new Paragraph({ keepNext: true, spacing: { after: 160 }, children: [r('Atentamente,')] }));
  c.push(new Paragraph({ keepNext: true, spacing: { after: 600 }, children: [] }));
  [h.firmaNombre, h.firmaCargo, h.firmaUnidad].filter(Boolean).forEach((t, i, arr) =>
    c.push(new Paragraph({ keepNext: i < arr.length - 1, spacing: { after: 0 }, children: [r(t)] }))
  );
  c.push(E(300));
  if (h.iniciales) c.push(new Paragraph({ spacing: { after: 240 }, children: [r(h.iniciales)] }));
  if (adjuntos.length) {
    c.push(new Paragraph({ spacing: { after: 0 }, children: [r('Adjunto:')] }));
    adjuntos.forEach(t => c.push(new Paragraph({ spacing: { after: 0 }, children: [r(t)] })));
  }
  return c;
};

const buildDoc = async (children: (Paragraph | Table)[], title: string): Promise<Blob> => {
  const doc = new Document({
    creator: 'InfraDash',
    title,
    styles: { default: { document: { run: { font: F, size: SZ } } } },
    numbering: {
      config: [
        {
          reference: 'b',
          levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 426, hanging: 284 } } } }]
        }
      ]
    },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1236, right: 1135, bottom: 1440, left: 1419, header: 720, footer: 720 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } },
                tabStops: [{ type: TabStopType.LEFT, position: 3600 }],
                children: [r('PETROPERU 11051 - Rev. Jun. 2013', { size: 14 }), r('\tSALUD, SEGURIDAD Y AMBIENTE RESPONSABILIDAD DE TODOS"', { size: 14 })]
              })
            ]
          })
        },
        children
      }
    ]
  });
  return Packer.toBlob(doc);
};

const chartPara = async (spec: Parameters<typeof drawChart>[0], caption: string, width = 620) => {
  const img = await drawChart(spec);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      keepNext: true,
      children: [
        new ImageRun({
          type: 'png',
          data: img.data,
          transformation: { width, height: Math.round((width * img.height) / img.width) },
          altText: { title: caption, description: caption, name: 'grafico' }
        })
      ]
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [r(caption, { size: 16, i: true })] })
  ];
};

const predioName = (c: Candidate) => c.stats.record.propertyName || c.stats.record.address || `Suministro ${c.stats.record.supplyNumber}`;
const listaPredios = (cs: Candidate[]) => {
  const n = cs.map(c => `**${predioName(c)}** (suministro ${c.stats.record.supplyNumber})`);
  return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`;
};
const pctTxt = (from: number, to: number) => (from > 0 ? `${to >= from ? '+' : '–'} ${fmtPct(Math.abs(((to - from) / from) * 100))}` : '—');
const signed = (v: number, f: (x: number) => string) => (v >= 0 ? '+ ' : '– ') + f(Math.abs(v));

// ============================================================
// MEMORANDO de reconocimiento (ahorro) o de advertencia (exceso)
// ============================================================
export const buildMemo = async (kind: 'ahorro' | 'exceso', cands: Candidate[], utility: UtilityType, h: HeaderData): Promise<Blob> => {
  const unit = unitOf(utility);
  const serv = serviceOf(utility);
  const m = cands[0].stats.month;
  const mIdx = MONTH_KEYS.indexOf(m);
  const year = cands[0].stats.record.year || new Date().getFullYear();
  const mes = MES_NOMBRE[m];
  const plural = cands.length > 1;
  const isWater = utility === 'water';
  const c: (Paragraph | Table)[] = [...headerBlock(h)];

  // Totales
  const totCur = cands.reduce((a, x) => a + x.stats.amount, 0);
  const totAvg = cands.reduce((a, x) => a + x.stats.avgAmount, 0);
  const totPrev = cands.reduce((a, x) => a + x.stats.prevAmount, 0);
  const totCurC = cands.reduce((a, x) => a + x.stats.consumption, 0);
  const totAvgC = cands.reduce((a, x) => a + x.stats.avgConsumption, 0);
  const totPrevC = cands.reduce((a, x) => a + x.stats.prevConsumption, 0);
  const diffAvg = Math.abs(totAvg - totCur);
  const diffAvgC = Math.abs(totAvgC - totCurC);
  const diffPrev = totPrev - totCur; // positivo = bajó
  const diffPrevC = totPrevC - totCurC;
  const restantes = 11 - mIdx;

  if (kind === 'ahorro') {
    c.push(
      P(
        `Por medio del presente, la ${h.de} desea expresar su **sincero reconocimiento y felicitación a su Jefatura y a todo su personal** de ${listaPredios(cands)}. Gracias a su compromiso diario con el cuidado ${isWater ? 'del agua' : 'de la energía eléctrica'}, en ${mes} de ${year} ${plural ? 'estos predios lograron' : 'este predio logró'} un ahorro importante que beneficia directamente a **PETRÓLEOS DEL PERÚ – PETROPERÚ S.A.**`
      )
    );
    c.push(
      P(
        `Este logro lo detectamos en **InfraDash**, la herramienta con la que la Coordinación de Mantenimiento No Industrial sigue mes a mes el consumo y el gasto de agua y energía de los predios de la Empresa. Al revisar los recibos de ${mes}, los números hablaron por sí solos: **el consumo bajó claramente frente a lo habitual**. A continuación, compartimos los resultados, que son de ustedes.`
      )
    );
  } else {
    c.push(
      P(
        `Por medio del presente, la ${h.de} se dirige a su Jefatura, con ánimo de colaboración, para compartir que en ${mes} de ${year} ${plural ? 'los predios' : 'el predio'} ${listaPredios(cands)} ${plural ? 'registraron' : 'registró'} un **consumo de ${serv} mayor al habitual**, lo que representa un mayor gasto para **PETRÓLEOS DEL PERÚ – PETROPERÚ S.A.**`
      )
    );
    c.push(
      P(
        `Este aumento lo detectamos en **InfraDash**, la herramienta con la que la Coordinación de Mantenimiento No Industrial sigue mes a mes el consumo y el gasto de agua y energía de los predios de la Empresa. Les compartimos los resultados para que, **juntos**, podamos identificar la causa y volver a los niveles normales de consumo.`
      )
    );
  }

  // 1. Recibos del mes
  c.push(H(`1. ${plural ? 'Los recibos' : 'El recibo'} de ${mes} de ${year}`));
  const rows1: string[][] = [['Suministro', 'Predio / sede', 'N° de recibo', 'Lecturas (ant. → act.)', `Consumo (${unit})`, 'Monto facturado']];
  cands.forEach(x =>
    rows1.push([
      x.stats.record.supplyNumber,
      predioName(x),
      x.stats.receipt || 'S/N',
      x.stats.currReading > 0 ? `${fmtNum(x.stats.prevReading)} → ${fmtNum(x.stats.currReading)}` : '—',
      `**${fmtNum(x.stats.consumption)}**`,
      `**${fmtSol(x.stats.amount)}**`
    ])
  );
  c.push(T(rows1, split(W, [1300, 2700, 1500, 1700, 1100, 1300])));
  c.push(E(120));

  // 2. Cómo ha ido el año
  c.push(H(`2. Cómo ha ido el consumo durante el año`));
  for (const x of cands) {
    if (plural) c.push(H2(`Suministro ${x.stats.record.supplyNumber} – ${predioName(x)}`));
    const rows2: string[][] = [['Mes ' + year, `Consumo (${unit})`, 'Monto (S/)']];
    x.stats.series.forEach(s => {
      const hi = s.month === m;
      const t = (v: string) => (hi ? `**${v}**` : v);
      rows2.push([t(MES_TITULO[s.month]), t(s.hasReceipt ? fmtNum(s.consumption) : '—'), t(s.hasReceipt ? fmtSol(s.amount) : '—')]);
    });
    rows2.push([`Promedio de meses anteriores (${x.stats.monthsInAvg})`, fmtNum(x.stats.avgConsumption, 1), fmtSol(x.stats.avgAmount)]);
    c.push(T(rows2, split(W, [4352, 2500, 2500]), '1F3A8A', [rows2.length - 1]));
    c.push(
      ...(await chartPara(
        {
          title: `${predioName(x).slice(0, 60)} – Suministro ${x.stats.record.supplyNumber}`,
          labels: x.stats.series.map(s => MONTH_LABELS[s.month]),
          bars: x.stats.series.map(s => s.consumption),
          line: x.stats.series.map(s => s.amount),
          unit,
          highlight: [mIdx],
          avg: x.stats.avgConsumption,
          color: kind === 'ahorro' ? '#0f766e' : '#b91c1c'
        },
        `Consumo mensual (${unit}) y monto facturado (S/) – enero a ${mes} de ${year}`
      ))
    );
  }
  c.push(NOTE('El promedio considera los meses anteriores con consumo; los meses que solo pagaron cargo fijo no se cuentan, para no bajar el promedio artificialmente.'));

  // 3. Ahorro / aumento
  c.push(H(kind === 'ahorro' ? `3. El ahorro logrado en ${mes}` : `3. El aumento detectado en ${mes}`));
  const rows3: string[][] = [['Suministro', `Frente al mes anterior`, `Frente al promedio del año`]];
  cands.forEach(x => {
    const s = x.stats;
    const vsPrev = s.prevMonth
      ? `${signed(s.consumption - s.prevConsumption, v => fmtNum(v))} ${unit} · ${signed(s.amount - s.prevAmount, fmtSol)} (${pctTxt(s.prevAmount, s.amount)})`
      : '—';
    const vsAvg = `${signed(s.consumption - s.avgConsumption, v => fmtNum(v, 1))} ${unit} · ${signed(s.amount - s.avgAmount, fmtSol)} (${pctTxt(s.avgAmount, s.amount)})`;
    rows3.push([`${s.record.supplyNumber} – ${predioName(x)}`, vsPrev, vsAvg]);
  });
  if (plural) {
    rows3.push([
      '**Total**',
      `**${signed(totCurC - totPrevC, v => fmtNum(v))} ${unit} · ${signed(totCur - totPrev, fmtSol)}**`,
      `**${signed(totCurC - totAvgC, v => fmtNum(v, 1))} ${unit} · ${signed(totCur - totAvg, fmtSol)}**`
    ]);
  }
  c.push(T(rows3, split(W, [3352, 3000, 3000]), kind === 'ahorro' ? '0F766E' : 'B91C1C', plural ? [rows3.length - 1] : []));
  c.push(NOTE('Signo "–": menos consumo o gasto que la referencia. Signo "+": más consumo o gasto que la referencia.'));

  // 4. Significado para la Empresa
  const vol = isWater ? `${fmtNum(diffAvgC, 1)} m³ (unos ${fmtNum(diffAvgC * 1000)} litros)` : `${fmtNum(diffAvgC, 1)} kW-h`;
  if (kind === 'ahorro') {
    c.push(H('4. Lo que este ahorro significa para la Empresa'));
    let txt = `Comparado con el promedio de los meses anteriores, en ${mes} ${plural ? 'estos predios dejaron' : 'este predio dejó'} de consumir **${vol}** y la Empresa pagó **${fmtSol(diffAvg)} menos**.`;
    if (diffPrev > 0) txt += ` Frente a ${MES_NOMBRE[cands[0].stats.prevMonth || m]}, el ahorro fue de **${fmtSol(diffPrev)}**${diffPrevC > 0 ? ` y **${fmtNum(diffPrevC)} ${unit}**` : ''}.`;
    txt += ' Si entre todos mantenemos este buen hábito, el beneficio podría ser:';
    c.push(P(txt, 80));
  } else {
    c.push(H('4. Lo que este aumento significa para la Empresa'));
    c.push(
      P(
        `Comparado con el promedio de los meses anteriores, en ${mes} se consumieron **${vol} más** y la Empresa pagó **${fmtSol(diffAvg)} más**. Si este nivel de consumo continuara, el mayor gasto podría ser:`,
        80
      )
    );
  }
  const rows4: string[][] = [['Horizonte (referencial)', `${kind === 'ahorro' ? 'Ahorro' : 'Mayor consumo'} en ${unit}`, `${kind === 'ahorro' ? 'Ahorro' : 'Mayor gasto'} en soles`]];
  if (restantes > 0)
    rows4.push([`Resto del año (${restantes} ${restantes === 1 ? 'mes' : 'meses'})`, `≈ ${fmtNum(diffAvgC * restantes)} ${unit}`, `≈ ${fmtSol(diffAvg * restantes)}`]);
  rows4.push(['Doce meses', `≈ ${fmtNum(diffAvgC * 12)} ${unit}`, `**≈ ${fmtSol(diffAvg * 12)}**`]);
  c.push(T(rows4, split(W, [3752, 2800, 2800])));
  c.push(NOTE(`Cifras referenciales: suponen que se mantiene el consumo de ${mes}; las confirmaremos con los próximos recibos.`));

  // 5. Cierre humano
  if (kind === 'ahorro') {
    c.push(H('5. Nuestro reconocimiento'));
    c.push(
      P(
        `Detrás de estas cifras hay personas: ${isWater ? 'cada llave bien cerrada, cada fuga reportada a tiempo' : 'cada luz apagada al salir, cada equipo desconectado fuera de horario'} y cada gesto de cuidado ${isWater ? 'del agua' : 'de la energía'} suman. Este resultado demuestra que el compromiso de su Jefatura y de su personal con la Política de Calidad, Salud, Seguridad y Ambiente no se queda en el papel, sino que se convierte en un beneficio real para la Empresa y en un recurso que se conserva para nuestra comunidad de Talara.`
      )
    );
    c.push(P(`Les pedimos hacer llegar este reconocimiento a cada uno de los trabajadores ${plural ? 'de estos predios' : 'de este predio'}: **este logro es de ellos**. Los invitamos a seguir adelante con este buen ejemplo:`, 80));
    [
      'Mantener los buenos hábitos que hicieron posible este ahorro y compartirlos con otras áreas, para que el ejemplo se multiplique.',
      isWater
        ? 'Avisarnos de inmediato cualquier fuga, caño que gotea o consumo extraño: nuestro equipo acudirá a atenderlo.'
        : 'Avisarnos de inmediato cualquier falla eléctrica, equipo que no se apaga o consumo extraño: nuestro equipo acudirá a atenderlo.',
      'Nosotros seguiremos de cerca cada recibo en InfraDash y les contaremos cómo avanza el ahorro en los próximos meses.'
    ].forEach(t => c.push(BL(t)));
    c.push(P(`Felicitaciones nuevamente y muchas gracias por cuidar ${isWater ? 'el agua' : 'la energía'} y los recursos de nuestra Empresa.`, 120));
  } else {
    c.push(H('5. Les pedimos su apoyo'));
    c.push(
      P(
        `Sabemos que un aumento puede tener muchas causas: más personal, trabajos en el predio, ${isWater ? 'una fuga que no se ve, un inodoro o tanque que se queda abierto' : 'equipos nuevos, aire acondicionado o luces encendidas fuera de horario'}, o incluso una falla del medidor. Por eso, con el ánimo de cuidar juntos los recursos de la Empresa, les pedimos:`,
        80
      )
    );
    (isWater
      ? [
          'Revisar caños, inodoros, tanques, mangueras y riego: una fuga pequeña puede consumir varios metros cúbicos al mes.',
          'Recordar al personal el uso responsable del agua y cerrar bien las llaves.',
          'Avisarnos de inmediato cualquier fuga o consumo extraño: nuestro equipo acudirá a revisar las instalaciones y el medidor.',
          'Si el aumento tiene una causa conocida (trabajos, más personal, nuevas actividades), agradeceremos que nos la comuniquen.'
        ]
      : [
          'Apagar luces, aire acondicionado y equipos al terminar la jornada y en ambientes desocupados.',
          'Revisar equipos que quedan encendidos todo el día (bombas, calentadores, equipos de cómputo) y desconectar los que no se usan.',
          'Avisarnos de inmediato cualquier falla eléctrica o consumo extraño: nuestro equipo acudirá a revisar las instalaciones y el medidor.',
          'Si el aumento tiene una causa conocida (trabajos, equipos nuevos, más personal), agradeceremos que nos la comuniquen.'
        ]
    ).forEach(t => c.push(BL(t)));
    c.push(P('Nosotros seguiremos de cerca el próximo recibo en InfraDash y les informaremos cómo evoluciona el consumo. Agradecemos de antemano su apoyo para cuidar los recursos de nuestra Empresa.', 120));
  }
  c.push(...closing(h, cands.map(x => `Recibo detallado InfraDash – Suministro ${x.stats.record.supplyNumber}, ${predioName(x)} (${mes} ${year}).`)));
  return buildDoc(c, h.asunto);
};

// ============================================================
// INFORME general (mensual / semestral / anual): Energía primero, Agua después
// ============================================================
export const buildInforme = async (p: ReportPeriod, year: number, sections: ServiceSection[], h: HeaderData): Promise<Blob> => {
  const c: (Paragraph | Table)[] = [...headerBlock(h)];
  const per = periodLabel(p, year);
  const tipo = p.type === 'mensual' ? 'mensual' : p.type === 'semestral' ? 'semestral' : 'anual';
  const prevName = p.type === 'mensual' ? 'mes anterior' : 'semestre anterior';
  c.push(
    P(
      `Por medio del presente, se remite el **informe ${tipo}** del consumo y gasto de **energía eléctrica** y **agua potable** de los predios externos de PETRÓLEOS DEL PERÚ – PETROPERÚ S.A. correspondiente a **${per}**, elaborado con la información registrada en **InfraDash** a partir de los recibos de cada suministro.`
    )
  );

  // Resumen general
  c.push(H('Resumen general'));
  const rows0: string[][] = [['Servicio', 'Gasto del período', 'Consumo del período', 'Suministros facturados', p.type === 'anual' ? 'Variación' : `Frente al ${prevName}`]];
  let tot = 0;
  sections.forEach(s => {
    tot += s.totalAmount;
    rows0.push([
      serviceTitle(s.utilityType),
      `**${fmtSol(s.totalAmount)}**`,
      `${fmtNum(s.totalConsumption, 1)} ${unitOf(s.utilityType)}`,
      `${s.suppliesBilled} de ${s.suppliesTotal}`,
      s.prevTotalAmount && s.prevTotalAmount > 0 ? `${signed(s.totalAmount - s.prevTotalAmount, fmtSol)} (${pctTxt(s.prevTotalAmount, s.totalAmount)})` : '—'
    ]);
  });
  rows0.push(['**Total**', `**${fmtSol(tot)}**`, '', '', '']);
  c.push(T(rows0, split(W, [2000, 1900, 2000, 1500, 1952]), '1F3A8A', [rows0.length - 1]));
  c.push(E(120));

  let n = 0;
  for (const s of sections) {
    n++;
    const unit = unitOf(s.utilityType);
    const lastMonth = s.months[s.months.length - 1];
    c.push(H(`${n}. ${serviceTitle(s.utilityType).toUpperCase()}`));

    // n.1 Resumen
    c.push(H2(`${n}.1 Resumen del período`));
    const kp: string[][] = [['Indicador', 'Valor']];
    kp.push(['Gasto del período', `**${fmtSol(s.totalAmount)}**`]);
    kp.push([`Consumo del período (${unit})`, fmtNum(s.totalConsumption, 1)]);
    kp.push(['Promedio mensual de gasto', fmtSol(s.totalAmount / Math.max(1, s.monthly.filter(x => x.receipts > 0).length))]);
    kp.push(['Suministros facturados', `${s.suppliesBilled} de ${s.suppliesTotal}`]);
    if (s.prevTotalAmount !== null && s.prevTotalAmount > 0)
      kp.push([`Frente al ${prevName}`, `${signed(s.totalAmount - s.prevTotalAmount, fmtSol)} (${pctTxt(s.prevTotalAmount, s.totalAmount)}) · ${signed(s.totalConsumption - (s.prevTotalConsumption || 0), v => fmtNum(v, 1))} ${unit}`]);
    c.push(T(kp, split(W, [4676, 4676])));
    c.push(E(100));

    // n.2 Evolución mensual
    c.push(H2(`${n}.2 Evolución mensual ${year}`));
    const ev: string[][] = [['Mes', `Consumo (${unit})`, 'Gasto (S/)']];
    s.yearMonthly.forEach(y => {
      const inP = s.months.includes(y.month);
      const t = (v: string) => (inP ? `**${v}**` : v);
      ev.push([t(MES_TITULO[y.month]), t(y.consumption > 0 ? fmtNum(y.consumption, 1) : '—'), t(y.amount > 0 ? fmtSol(y.amount) : '—')]);
    });
    c.push(T(ev, split(W, [3352, 3000, 3000])));
    c.push(
      ...(await chartPara(
        {
          title: `${serviceTitle(s.utilityType)} – consumo y gasto mensual ${year}`,
          labels: s.yearMonthly.map(y => MONTH_LABELS[y.month]),
          bars: s.yearMonthly.map(y => y.consumption),
          line: s.yearMonthly.map(y => y.amount),
          unit,
          highlight: s.yearMonthly.map((y, i) => (s.months.includes(y.month) ? i : -1)).filter(i => i >= 0),
          color: s.utilityType === 'energy' ? '#1d4ed8' : '#0e7490'
        },
        `Consumo (${unit}) y gasto (S/) por mes; resaltado: ${per}`
      ))
    );

    // n.3 Gasto por suministro
    c.push(H2(`${n}.3 Gasto por suministro (mayor a menor)`));
    const top = s.rows.slice(0, 15);
    const gs: string[][] = [['N°', 'Suministro', 'Predio / sede', `Consumo (${unit})`, 'Gasto (S/)', '% del total']];
    top.forEach((row, i) =>
      gs.push([
        String(i + 1),
        row.record.supplyNumber,
        row.record.propertyName || row.record.address || '—',
        fmtNum(row.consumption, 1),
        fmtSol(row.amount),
        s.totalAmount > 0 ? fmtPct((row.amount / s.totalAmount) * 100) : '—'
      ])
    );
    c.push(T(gs, split(W, [500, 1300, 3452, 1400, 1500, 1200])));
    if (s.rows.length > top.length) c.push(NOTE(`Se muestran los ${top.length} suministros de mayor gasto de ${s.rows.length} facturados en el período.`));
    c.push(E(100));

    // n.4 Ahorros y excesos
    c.push(H2(`${n}.4 Ahorros y excesos significativos (${MES_NOMBRE[lastMonth]})`));
    if (s.candidates.length === 0) {
      c.push(P(`En ${MES_NOMBRE[lastMonth]} no se encontraron suministros con ahorro o exceso significativo frente a su promedio.`));
    } else {
      const ae: string[][] = [['Suministro', 'Predio / sede', 'Resultado', `Frente al promedio`]];
      s.candidates.forEach(x =>
        ae.push([
          x.stats.record.supplyNumber,
          x.stats.record.propertyName || '—',
          x.kind === 'ahorro' ? '**Ahorro**' : '**Exceso**',
          `${signed(x.stats.amount - x.stats.avgAmount, fmtSol)} (${pctTxt(x.stats.avgAmount, x.stats.amount)})`
        ])
      );
      c.push(T(ae, split(W, [1400, 3752, 1300, 2900]), '0F766E'));
      c.push(NOTE('Para estos suministros se puede emitir el memorando de reconocimiento (ahorro) o de advertencia (exceso) desde el botón "Reportes" de InfraDash.'));
    }

    // n.5 Observaciones
    c.push(H2(`${n}.5 Observaciones`));
    const obs: string[] = [];
    if (s.missing.length) obs.push(`${s.missing.length} suministro(s) sin recibo registrado en ${MES_NOMBRE[lastMonth]}: ${s.missing.map(r => r.supplyNumber).join(', ')}. Verificar si el recibo aún no llega.`);
    if (s.pendingReview) obs.push(`${s.pendingReview} aviso(s) pendiente(s) en "Revisar llenado". Se recomienda revisarlos con los recibos físicos.`);
    else obs.push('"Revisar llenado": sin avisos pendientes.');
    obs.forEach(t => c.push(BL(t)));
    c.push(E(100));
  }

  // Conclusiones
  c.push(H(`${n + 1}. Conclusiones`));
  const concl: string[] = [`El gasto total en energía eléctrica y agua potable de los predios externos en ${per} fue de **${fmtSol(tot)}**.`];
  sections.forEach(s => {
    const ah = s.candidates.filter(x => x.kind === 'ahorro').length;
    const ex = s.candidates.filter(x => x.kind === 'exceso').length;
    let t = `${serviceTitle(s.utilityType)}: ${fmtSol(s.totalAmount)} y ${fmtNum(s.totalConsumption, 1)} ${unitOf(s.utilityType)}`;
    if (s.prevTotalAmount && s.prevTotalAmount > 0) t += `, ${s.totalAmount <= s.prevTotalAmount ? 'menor' : 'mayor'} que el ${prevName} (${pctTxt(s.prevTotalAmount, s.totalAmount)})`;
    t += `. ${ah} suministro(s) con ahorro y ${ex} con exceso significativo.`;
    concl.push(t);
  });
  concl.push('La Coordinación de Mantenimiento No Industrial continuará el seguimiento mensual de cada recibo en InfraDash.');
  concl.forEach(t => c.push(BL(t)));
  c.push(E(120));
  c.push(...closing(h, []));
  return buildDoc(c, h.asunto);
};

export const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
};
